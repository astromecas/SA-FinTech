/** Camada de acesso à API. Todo erro vira uma Error com mensagem legível. */
let usuarioAtual = 'admin';
export const definirUsuario = (nome) => {
  usuarioAtual = nome;
};

async function requisitar(caminho, { metodo = 'GET', corpo } = {}) {
  const resposta = await fetch(`/api${caminho}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', 'X-Usuario': usuarioAtual },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    const detalhes = dados.detalhes?.map((d) => d.mensagem).join(' · ');
    throw new Error(detalhes || dados.erro || `Falha na requisição (${resposta.status})`);
  }
  return dados;
}

export const api = {
  saldo: () => requisitar('/saldo'),
  listar: ({ tipo, excluidas, busca }) => {
    const p = new URLSearchParams({ excluidas });
    if (tipo) p.set('tipo', tipo);
    if (busca) p.set('busca', busca);
    return requisitar(`/transacoes?${p}`);
  },
  criar: (corpo) => requisitar('/transacoes', { metodo: 'POST', corpo }),
  editar: (id, corpo) => requisitar(`/transacoes/${id}`, { metodo: 'PUT', corpo }),
  excluir: (id) => requisitar(`/transacoes/${id}`, { metodo: 'DELETE' }),
  restaurar: (id) => requisitar(`/transacoes/${id}/restaurar`, { metodo: 'POST' }),
  auditoria: (id) => requisitar(`/transacoes/${id}/auditoria`),
};
