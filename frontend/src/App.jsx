import { useCallback, useEffect, useState } from 'react';
import { api, definirUsuario } from './api.js';
import SaldoCards from './components/SaldoCards.jsx';
import TransacaoForm from './components/TransacaoForm.jsx';
import TransacaoLista from './components/TransacaoLista.jsx';
import AuditoriaDialog from './components/AuditoriaDialog.jsx';

const INTERVALO_ATUALIZACAO_MS = 10_000;

export default function App() {
  const [usuario, setUsuario] = useState(() => localStorage.getItem('usuario') || 'admin');
  const [saldo, setSaldo] = useState(null);
  const [transacoes, setTransacoes] = useState([]);
  const [filtros, setFiltros] = useState({ tipo: '', excluidas: 'nao', busca: '' });
  const [emEdicao, setEmEdicao] = useState(null);
  const [auditoriaDe, setAuditoriaDe] = useState(null);
  const [erro, setErro] = useState('');

  definirUsuario(usuario);

  /** Recarrega saldo e lista: chamada após cada operação e a cada 10 s ("tempo real"). */
  const atualizar = useCallback(async () => {
    try {
      const [s, l] = await Promise.all([api.saldo(), api.listar(filtros)]);
      setSaldo(s);
      setTransacoes(l.itens);
      setErro('');
    } catch (e) {
      setErro(`Não foi possível carregar os dados: ${e.message}`);
    }
  }, [filtros]);

  useEffect(() => {
    atualizar();
    const timer = setInterval(atualizar, INTERVALO_ATUALIZACAO_MS);
    return () => clearInterval(timer);
  }, [atualizar]);

  const executar = async (acao) => {
    try {
      await acao();
      setErro('');
      await atualizar();
      return true;
    } catch (e) {
      setErro(e.message);
      return false;
    }
  };

  const salvar = (dados) =>
    executar(async () => {
      if (emEdicao) await api.editar(emEdicao.id, dados);
      else await api.criar(dados);
      setEmEdicao(null);
    });

  const excluir = (t) => {
    if (window.confirm(`Excluir "${t.descricao}"? O registro será mantido para auditoria.`)) {
      executar(() => api.excluir(t.id));
    }
  };

  const mudarUsuario = (nome) => {
    setUsuario(nome);
    localStorage.setItem('usuario', nome);
  };

  return (
    <div className="app">
      <header className="topo">
        <div>
          <h1>SafeCash</h1>
          <p>Tesouraria integrada · fluxo de caixa com trilha de auditoria</p>
        </div>
        <label className="usuario">
          Operador
          <input value={usuario} onChange={(e) => mudarUsuario(e.target.value)} maxLength={60} />
        </label>
      </header>

      {erro && (
        <div className="alerta" role="alert">
          {erro}
        </div>
      )}

      <SaldoCards saldo={saldo} />

      <main className="colunas">
        <TransacaoForm
          key={emEdicao?.id ?? 'novo'}
          inicial={emEdicao}
          onSalvar={salvar}
          onCancelar={() => setEmEdicao(null)}
        />
        <TransacaoLista
          itens={transacoes}
          filtros={filtros}
          onFiltros={setFiltros}
          onEditar={setEmEdicao}
          onExcluir={excluir}
          onRestaurar={(t) => executar(() => api.restaurar(t.id))}
          onHistorico={setAuditoriaDe}
        />
      </main>

      {auditoriaDe && (
        <AuditoriaDialog transacao={auditoriaDe} onFechar={() => setAuditoriaDe(null)} />
      )}
    </div>
  );
}
