const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { abrirBanco } = require('../src/db');
const { criarApp } = require('../src/app');

let servidor, base, db;
const USUARIO = { 'X-Usuario': 'willer', 'Content-Type': 'application/json' };

const chamar = (caminho, { metodo = 'GET', corpo, headers = USUARIO } = {}) =>
  fetch(`${base}${caminho}`, {
    method: metodo,
    headers,
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });

const aluguel = {
  descricao: 'Pagamento de Aluguel',
  valor: 2000,
  tipo: 'SAIDA',
  categoria: 'Despesas fixas',
  data_transacao: '2026-03-05',
};

before(async () => {
  db = abrirBanco(':memory:');
  servidor = criarApp(db).listen(0);
  await new Promise((r) => servidor.once('listening', r));
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(() => servidor.close());

test('cria transação e atualiza o saldo', async () => {
  await chamar('/api/transacoes', {
    metodo: 'POST',
    corpo: { ...aluguel, descricao: 'Venda de serviço', valor: 5000.5, tipo: 'ENTRADA' },
  });
  const r = await chamar('/api/transacoes', { metodo: 'POST', corpo: aluguel });
  assert.equal(r.status, 201);
  const criada = await r.json();
  assert.equal(criada.valor_centavos, 200000);
  assert.equal(criada.criado_por, 'willer');

  const saldo = await (await chamar('/api/saldo')).json();
  assert.equal(saldo.entradas, 5000.5);
  assert.equal(saldo.saidas, 2000);
  assert.equal(saldo.saldo, 3000.5);
});

test('precisão monetária: 0,10 + 0,20 = 0,30 exato', async () => {
  const antes = await (await chamar('/api/saldo')).json();
  for (const [d, v] of [['Centavos A', 0.1], ['Centavos B', 0.2]]) {
    await chamar('/api/transacoes', {
      metodo: 'POST',
      corpo: { ...aluguel, descricao: d, valor: v, tipo: 'ENTRADA' },
    });
  }
  const depois = await (await chamar('/api/saldo')).json();
  assert.equal(depois.saldo_centavos - antes.saldo_centavos, 30);
});

test('rejeita valor negativo, zero, texto e mais de 2 casas decimais', async () => {
  for (const valor of [-10, 0, '100', 10.123]) {
    const r = await chamar('/api/transacoes', {
      metodo: 'POST',
      corpo: { ...aluguel, descricao: `Teste ${valor}`, valor },
    });
    assert.equal(r.status, 400, `valor ${valor} deveria ser rejeitado`);
    assert.equal((await r.json()).codigo, 'VALIDACAO');
  }
});

test('rejeita tipo inválido, data inexistente e campos extras', async () => {
  const casos = [
    { ...aluguel, descricao: 'Tipo ruim', tipo: 'TRANSFERENCIA' },
    { ...aluguel, descricao: 'Data ruim', data_transacao: '2026-02-30' },
    { ...aluguel, descricao: 'Campo extra', excluido: true },
  ];
  for (const corpo of casos) {
    const r = await chamar('/api/transacoes', { metodo: 'POST', corpo });
    assert.equal(r.status, 400);
  }
});

test('exige o cabeçalho X-Usuario nas operações de escrita', async () => {
  const r = await chamar('/api/transacoes', {
    metodo: 'POST',
    corpo: aluguel,
    headers: { 'Content-Type': 'application/json' },
  });
  assert.equal(r.status, 400);
});

test('bloqueia lançamento duplicado (409)', async () => {
  const r = await chamar('/api/transacoes', { metodo: 'POST', corpo: aluguel });
  assert.equal(r.status, 409);
  assert.equal((await r.json()).codigo, 'DUPLICIDADE');
});

test('edita transação e registra quem alterou', async () => {
  const { itens } = await (await chamar('/api/transacoes?busca=Aluguel')).json();
  const id = itens[0].id;
  const r = await chamar(`/api/transacoes/${id}`, {
    metodo: 'PUT',
    headers: { ...USUARIO, 'X-Usuario': 'maria' },
    corpo: { ...aluguel, valor: 2100 },
  });
  assert.equal(r.status, 200);
  const editada = await r.json();
  assert.equal(editada.valor, 2100);
  assert.equal(editada.atualizado_por, 'maria');
  assert.ok(editada.atualizado_em);
});

test('SOFT DELETE: mantém o registro, tira do saldo e audita', async () => {
  const { itens } = await (await chamar('/api/transacoes?busca=Aluguel')).json();
  const id = itens[0].id;
  const saldoAntes = await (await chamar('/api/saldo')).json();

  const r = await chamar(`/api/transacoes/${id}`, { metodo: 'DELETE' });
  assert.equal(r.status, 200);
  const excluida = await r.json();
  assert.equal(excluida.excluido, true);
  assert.equal(excluida.excluido_por, 'willer');

  const saldoDepois = await (await chamar('/api/saldo')).json();
  assert.equal(saldoDepois.saldo, saldoAntes.saldo + 2100);

  // some da listagem padrão, mas continua no banco
  const ativas = await (await chamar('/api/transacoes')).json();
  assert.ok(!ativas.itens.some((t) => t.id === id));
  const todas = await (await chamar('/api/transacoes?excluidas=todas')).json();
  assert.ok(todas.itens.some((t) => t.id === id));

  assert.equal((await chamar(`/api/transacoes/${id}`, { metodo: 'DELETE' })).status, 409);
  assert.equal(
    (await chamar(`/api/transacoes/${id}`, { metodo: 'PUT', corpo: aluguel })).status,
    409
  );

  const trilha = await (await chamar(`/api/transacoes/${id}/auditoria`)).json();
  assert.deepEqual(trilha.map((a) => a.acao), ['CRIAR', 'EDITAR', 'EXCLUIR']);
});

test('restaura transação excluída', async () => {
  const { itens } = await (await chamar('/api/transacoes?excluidas=sim')).json();
  const r = await chamar(`/api/transacoes/${itens[0].id}/restaurar`, { metodo: 'POST' });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).excluido, false);
});

test('banco impede DELETE físico e alteração da auditoria (defesa em profundidade)', () => {
  assert.throws(() => db.prepare('DELETE FROM transacoes').run(), /Exclusao fisica proibida/);
  assert.throws(() => db.prepare('DELETE FROM auditoria').run(), /imutavel/);
  assert.throws(() => db.prepare("UPDATE auditoria SET usuario = 'x'").run(), /imutavel/);
  assert.throws(
    () =>
      db
        .prepare(
          "INSERT INTO transacoes (descricao, valor_centavos, tipo, data_transacao, criado_por, criado_em) VALUES ('abc', -5, 'SAIDA', '2026-01-01', 'x', 'y')"
        )
        .run(),
    /CHECK/
  );
});

test('404 para id inexistente e 400 para id inválido', async () => {
  assert.equal((await chamar('/api/transacoes/99999')).status, 404);
  assert.equal((await chamar('/api/transacoes/abc')).status, 400);
});
