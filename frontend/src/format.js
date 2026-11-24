const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const formatarMoeda = (valor) => moeda.format(valor);

/** '2026-03-05' -> '05/03/2026' (sem passar por Date, evitando erro de fuso). */
export const formatarData = (iso) => iso.split('-').reverse().join('/');

export const formatarDataHora = (iso) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export const hojeISO = () => {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
};
