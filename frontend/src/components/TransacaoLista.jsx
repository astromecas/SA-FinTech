import { formatarData, formatarMoeda } from '../format.js';

export default function TransacaoLista({
  itens,
  filtros,
  onFiltros,
  onEditar,
  onExcluir,
  onRestaurar,
  onHistorico,
}) {
  const mudar = (campo) => (e) => onFiltros({ ...filtros, [campo]: e.target.value });

  return (
    <section className="painel lista">
      <div className="lista-topo">
        <h2>Lançamentos</h2>
        <div className="filtros">
          <input
            type="search"
            placeholder="Buscar…"
            value={filtros.busca}
            onChange={mudar('busca')}
            aria-label="Buscar"
          />
          <select value={filtros.tipo} onChange={mudar('tipo')} aria-label="Filtrar por tipo">
            <option value="">Todos</option>
            <option value="ENTRADA">Entradas</option>
            <option value="SAIDA">Saídas</option>
          </select>
          <select value={filtros.excluidas} onChange={mudar('excluidas')} aria-label="Excluídas">
            <option value="nao">Somente ativas</option>
            <option value="todas">Ativas + excluídas</option>
            <option value="sim">Somente excluídas</option>
          </select>
        </div>
      </div>

      {itens.length === 0 ? (
        <p className="vazio">Nenhum lançamento encontrado.</p>
      ) : (
        <ul>
          {itens.map((t) => (
            <li key={t.id} className={t.excluido ? 'excluida' : ''}>
              <div className="info">
                <strong>{t.descricao}</strong>
                <small>
                  {formatarData(t.data_transacao)} · {t.categoria} · por {t.criado_por}
                  {t.atualizado_por && ` · alterado por ${t.atualizado_por}`}
                  {t.excluido && ` · excluído por ${t.excluido_por}`}
                </small>
              </div>
              <span className={`valor ${t.tipo.toLowerCase()}`}>
                {t.tipo === 'SAIDA' ? '−' : '+'} {formatarMoeda(t.valor)}
              </span>
              <div className="botoes">
                <button onClick={() => onHistorico(t)}>Histórico</button>
                {t.excluido ? (
                  <button onClick={() => onRestaurar(t)}>Restaurar</button>
                ) : (
                  <>
                    <button onClick={() => onEditar(t)}>Editar</button>
                    <button className="perigo" onClick={() => onExcluir(t)}>
                      Excluir
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
