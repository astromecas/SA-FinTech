const { paraCentavos } = require('./schemas');
const { emTransacao } = require('./db');

class ErroNegocio extends Error {
  constructor(status, mensagem, codigo) {
    super(mensagem);
    this.status = status;
    this.codigo = codigo;
  }
}

/** Formato público da transação (valor em reais + centavos). */
const paraApi = (l) =>
  l && {
    id: l.id,
    descricao: l.descricao,
    valor: l.valor_centavos / 100,
    valor_centavos: l.valor_centavos,
    tipo: l.tipo,
    categoria: l.categoria,
    data_transacao: l.data_transacao,
    criado_por: l.criado_por,
    criado_em: l.criado_em,
    atualizado_por: l.atualizado_por,
    atualizado_em: l.atualizado_em,
    excluido: l.excluido === 1,
    excluido_por: l.excluido_por,
    excluido_em: l.excluido_em,
  };

const agora = () => new Date().toISOString();

function criarRepositorio(db) {
  const buscarPorId = db.prepare('SELECT * FROM transacoes WHERE id = ?');

  const registrarAuditoria = db.prepare(`
    INSERT INTO auditoria (transacao_id, acao, usuario, dados_anteriores, dados_novos, data_hora)
    VALUES (@transacao_id, @acao, @usuario, @dados_anteriores, @dados_novos, @data_hora)
  `);

  const auditar = (transacaoId, acao, usuario, antes, depois) =>
    registrarAuditoria.run({
      transacao_id: transacaoId,
      acao,
      usuario,
      dados_anteriores: antes ? JSON.stringify(paraApi(antes)) : null,
      dados_novos: depois ? JSON.stringify(paraApi(depois)) : null,
      data_hora: agora(),
    });

  /** Traduz violação do índice anti-duplicidade em erro 409 amigável. */
  const tratarUnicidade = (erro) => {
    if (erro && /UNIQUE constraint failed/i.test(erro.message)) {
      throw new ErroNegocio(
        409,
        'Lançamento duplicado: já existe uma transação ativa com mesma descrição, valor, tipo e data.',
        'DUPLICIDADE'
      );
    }
    throw erro;
  };

  const obterOuFalhar = (id) => {
    const linha = buscarPorId.get(id);
    if (!linha) throw new ErroNegocio(404, `Transação ${id} não encontrada.`, 'NAO_ENCONTRADA');
    return linha;
  };

  return {
    listar({ tipo, excluidas, busca, limite, pagina }) {
      const condicoes = [];
      const params = {};
      if (excluidas === 'nao') condicoes.push('excluido = 0');
      if (excluidas === 'sim') condicoes.push('excluido = 1');
      if (tipo) {
        condicoes.push('tipo = @tipo');
        params.tipo = tipo;
      }
      if (busca) {
        condicoes.push("(descricao LIKE @busca ESCAPE '\\' OR categoria LIKE @busca ESCAPE '\\')");
        params.busca = `%${busca.replace(/[\\%_]/g, '\\$&')}%`;
      }
      const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
      const total = db.prepare(`SELECT COUNT(*) AS n FROM transacoes ${where}`).get(params).n;
      const itens = db
        .prepare(
          `SELECT * FROM transacoes ${where}
           ORDER BY data_transacao DESC, id DESC LIMIT @limite OFFSET @offset`
        )
        .all({ ...params, limite, offset: (pagina - 1) * limite });
      return { total, pagina, limite, itens: itens.map(paraApi) };
    },

    obter(id) {
      return paraApi(obterOuFalhar(id));
    },

    criar(dados, usuario) {
      const executar = () => emTransacao(db, () => {
        const info = db
          .prepare(
            `INSERT INTO transacoes
               (descricao, valor_centavos, tipo, categoria, data_transacao, criado_por, criado_em)
             VALUES (@descricao, @valor_centavos, @tipo, @categoria, @data_transacao, @usuario, @agora)`
          )
          .run({
            descricao: dados.descricao,
            valor_centavos: paraCentavos(dados.valor),
            tipo: dados.tipo,
            categoria: dados.categoria,
            data_transacao: dados.data_transacao,
            usuario,
            agora: agora(),
          });
        const criada = buscarPorId.get(Number(info.lastInsertRowid));
        auditar(criada.id, 'CRIAR', usuario, null, criada);
        return criada;
      });
      try {
        return paraApi(executar());
      } catch (e) {
        return tratarUnicidade(e);
      }
    },

    editar(id, dados, usuario) {
      const executar = () => emTransacao(db, () => {
        const antes = obterOuFalhar(id);
        if (antes.excluido) {
          throw new ErroNegocio(
            409,
            'Transação excluída não pode ser editada. Restaure-a primeiro.',
            'REGISTRO_EXCLUIDO'
          );
        }
        db.prepare(
          `UPDATE transacoes SET
             descricao = @descricao, valor_centavos = @valor_centavos, tipo = @tipo,
             categoria = @categoria, data_transacao = @data_transacao,
             atualizado_por = @usuario, atualizado_em = @agora
           WHERE id = @id`
        ).run({
          id,
          descricao: dados.descricao,
          valor_centavos: paraCentavos(dados.valor),
          tipo: dados.tipo,
          categoria: dados.categoria,
          data_transacao: dados.data_transacao,
          usuario,
          agora: agora(),
        });
        const depois = buscarPorId.get(id);
        auditar(id, 'EDITAR', usuario, antes, depois);
        return depois;
      });
      try {
        return paraApi(executar());
      } catch (e) {
        return tratarUnicidade(e);
      }
    },

    /** SOFT DELETE: apenas marca como excluído; o registro permanece para auditoria. */
    excluir(id, usuario) {
      return paraApi(
        emTransacao(db, () => {
          const antes = obterOuFalhar(id);
          if (antes.excluido) {
            throw new ErroNegocio(409, 'Transação já está excluída.', 'JA_EXCLUIDA');
          }
          db.prepare(
            'UPDATE transacoes SET excluido = 1, excluido_por = ?, excluido_em = ? WHERE id = ?'
          ).run(usuario, agora(), id);
          const depois = buscarPorId.get(id);
          auditar(id, 'EXCLUIR', usuario, antes, depois);
          return depois;
        })
      );
    },

    restaurar(id, usuario) {
      const executar = () => emTransacao(db, () => {
        const antes = obterOuFalhar(id);
        if (!antes.excluido) {
          throw new ErroNegocio(409, 'Transação não está excluída.', 'NAO_EXCLUIDA');
        }
        db.prepare(
          `UPDATE transacoes SET excluido = 0, excluido_por = NULL, excluido_em = NULL,
             atualizado_por = ?, atualizado_em = ? WHERE id = ?`
        ).run(usuario, agora(), id);
        const depois = buscarPorId.get(id);
        auditar(id, 'RESTAURAR', usuario, antes, depois);
        return depois;
      });
      try {
        return paraApi(executar());
      } catch (e) {
        return tratarUnicidade(e);
      }
    },

    auditoria(id) {
      obterOuFalhar(id);
      return db
        .prepare('SELECT * FROM auditoria WHERE transacao_id = ? ORDER BY id ASC')
        .all(id)
        .map((a) => ({
          ...a,
          dados_anteriores: a.dados_anteriores ? JSON.parse(a.dados_anteriores) : null,
          dados_novos: a.dados_novos ? JSON.parse(a.dados_novos) : null,
        }));
    },

    /** Saldo calculado em centavos (inteiros) apenas sobre registros ativos. */
    saldo() {
      const r = db
        .prepare(
          `SELECT
             COALESCE(SUM(CASE WHEN tipo = 'ENTRADA' THEN valor_centavos END), 0) AS entradas,
             COALESCE(SUM(CASE WHEN tipo = 'SAIDA'   THEN valor_centavos END), 0) AS saidas,
             COUNT(*) AS quantidade
           FROM transacoes WHERE excluido = 0`
        )
        .get();
      return {
        entradas: r.entradas / 100,
        saidas: r.saidas / 100,
        saldo: (r.entradas - r.saidas) / 100,
        saldo_centavos: r.entradas - r.saidas,
        quantidade_transacoes: r.quantidade,
        calculado_em: agora(),
      };
    },
  };
}

module.exports = { criarRepositorio, ErroNegocio };
