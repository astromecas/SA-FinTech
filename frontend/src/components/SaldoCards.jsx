import { formatarMoeda } from '../format.js';

export default function SaldoCards({ saldo }) {
  if (!saldo) return <p className="carregando">Carregando saldo…</p>;
  const negativo = saldo.saldo < 0;
  return (
    <section className="saldo" aria-label="Resumo financeiro">
      <div className={`saldo-total ${negativo ? 'negativo' : ''}`}>
        <span>Saldo atual</span>
        <strong data-testid="saldo-total">{formatarMoeda(saldo.saldo)}</strong>
        <small>{saldo.quantidade_transacoes} lançamentos ativos</small>
      </div>
      <div className="saldo-parcial entrada">
        <span>Entradas</span>
        <strong>{formatarMoeda(saldo.entradas)}</strong>
      </div>
      <div className="saldo-parcial saida">
        <span>Saídas</span>
        <strong>{formatarMoeda(saldo.saidas)}</strong>
      </div>
    </section>
  );
}
