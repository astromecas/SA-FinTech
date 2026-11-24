import { useState } from 'react';
import { hojeISO } from '../format.js';

const CATEGORIAS = ['Geral', 'Receitas', 'Despesas fixas', 'Fornecedores', 'Impostos', 'Folha'];

export default function TransacaoForm({ inicial, onSalvar, onCancelar }) {
  const [campos, setCampos] = useState({
    descricao: inicial?.descricao ?? '',
    valor: inicial ? String(inicial.valor) : '',
    tipo: inicial?.tipo ?? 'SAIDA',
    categoria: inicial?.categoria ?? 'Geral',
    data_transacao: inicial?.data_transacao ?? hojeISO(),
  });
  const [enviando, setEnviando] = useState(false);

  const mudar = (campo) => (e) => setCampos({ ...campos, [campo]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    const ok = await onSalvar({
      ...campos,
      // aceita vírgula decimal (2000,50). A validação rigorosa é feita pela API.
      valor: Number(String(campos.valor).replace(',', '.')),
    });
    setEnviando(false);
    if (ok && !inicial) setCampos({ ...campos, descricao: '', valor: '' });
  };

  return (
    <form className="painel formulario" onSubmit={enviar}>
      <h2>{inicial ? `Editar lançamento #${inicial.id}` : 'Novo lançamento'}</h2>

      <div className="tipo-toggle" role="radiogroup" aria-label="Tipo">
        {['ENTRADA', 'SAIDA'].map((t) => (
          <label key={t} className={`${t.toLowerCase()} ${campos.tipo === t ? 'ativo' : ''}`}>
            <input
              type="radio"
              name="tipo"
              value={t}
              checked={campos.tipo === t}
              onChange={mudar('tipo')}
            />
            {t === 'ENTRADA' ? 'Entrada' : 'Saída'}
          </label>
        ))}
      </div>

      <label>
        Descrição
        <input
          value={campos.descricao}
          onChange={mudar('descricao')}
          placeholder="Ex.: Pagamento de Aluguel"
          required
          minLength={3}
          maxLength={120}
        />
      </label>

      <div className="duas-colunas">
        <label>
          Valor (R$)
          <input
            value={campos.valor}
            onChange={mudar('valor')}
            inputMode="decimal"
            placeholder="2000,00"
            required
          />
        </label>
        <label>
          Data
          <input type="date" value={campos.data_transacao} onChange={mudar('data_transacao')} required />
        </label>
      </div>

      <label>
        Categoria
        <select value={campos.categoria} onChange={mudar('categoria')}>
          {CATEGORIAS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>

      <div className="acoes">
        <button type="submit" className="primario" disabled={enviando}>
          {enviando ? 'Salvando…' : inicial ? 'Salvar alterações' : 'Registrar'}
        </button>
        {inicial && (
          <button type="button" onClick={onCancelar}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
