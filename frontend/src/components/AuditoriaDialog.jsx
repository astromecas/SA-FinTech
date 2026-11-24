import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { formatarDataHora } from '../format.js';

const ROTULOS = { CRIAR: 'Criado', EDITAR: 'Editado', EXCLUIR: 'Excluído', RESTAURAR: 'Restaurado' };

export default function AuditoriaDialog({ transacao, onFechar }) {
  const [trilha, setTrilha] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.auditoria(transacao.id).then(setTrilha).catch((e) => setErro(e.message));
  }, [transacao.id]);

  return (
    <div className="fundo-modal" onClick={onFechar}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>Histórico · {transacao.descricao}</h2>
        {erro && <p className="alerta">{erro}</p>}
        {!trilha && !erro && <p>Carregando…</p>}
        <ol>
          {trilha?.map((a) => (
            <li key={a.id}>
              <strong>{ROTULOS[a.acao]}</strong> por {a.usuario}
              <small>{formatarDataHora(a.data_hora)}</small>
            </li>
          ))}
        </ol>
        <button onClick={onFechar}>Fechar</button>
      </div>
    </div>
  );
}
