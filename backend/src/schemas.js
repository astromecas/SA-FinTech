const { z } = require('zod');

/** Converte reais (ex.: 2000.5) para centavos inteiros (200050). */
const paraCentavos = (reais) => Math.round(reais * 100);

/** Valida data real no formato AAAA-MM-DD (rejeita 2026-02-30, por exemplo). */
const dataValida = (texto) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const d = new Date(`${texto}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === texto;
};

/**
 * Schema de uma transação.
 * `valor` é o VALOR ABSOLUTO: sempre positivo; o sinal vem do campo `tipo`.
 * `.strict()` rejeita campos desconhecidos (evita mass assignment).
 */
const transacaoSchema = z
  .object({
    descricao: z
      .string({ required_error: 'descricao é obrigatória' })
      .trim()
      .min(3, 'descricao deve ter ao menos 3 caracteres')
      .max(120, 'descricao deve ter no máximo 120 caracteres'),
    valor: z
      .number({
        required_error: 'valor é obrigatório',
        invalid_type_error: 'valor deve ser numérico (ex.: 2000.50)',
      })
      .finite('valor deve ser um número finito')
      .positive('valor deve ser maior que zero (valor absoluto, sem sinal negativo)')
      .max(1_000_000_000, 'valor acima do limite permitido')
      .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, {
        message: 'valor deve ter no máximo 2 casas decimais',
      }),
    tipo: z.enum(['ENTRADA', 'SAIDA'], {
      errorMap: () => ({ message: "tipo deve ser 'ENTRADA' ou 'SAIDA'" }),
    }),
    categoria: z
      .string()
      .trim()
      .min(2, 'categoria deve ter ao menos 2 caracteres')
      .max(40, 'categoria deve ter no máximo 40 caracteres')
      .default('Geral'),
    data_transacao: z
      .string({ required_error: 'data_transacao é obrigatória' })
      .refine(dataValida, 'data_transacao deve ser uma data válida no formato AAAA-MM-DD'),
  })
  .strict();

const usuarioSchema = z
  .string({ required_error: 'Cabeçalho X-Usuario é obrigatório' })
  .trim()
  .min(2, 'X-Usuario deve ter ao menos 2 caracteres')
  .max(60, 'X-Usuario deve ter no máximo 60 caracteres');

const idSchema = z.coerce
  .number({ invalid_type_error: 'id inválido' })
  .int('id inválido')
  .positive('id inválido');

const filtrosListagemSchema = z.object({
  tipo: z.enum(['ENTRADA', 'SAIDA']).optional(),
  // 'nao' (padrão) = só ativas | 'sim' = só excluídas | 'todas'
  excluidas: z.enum(['nao', 'sim', 'todas']).default('nao'),
  busca: z.string().trim().max(60).optional(),
  limite: z.coerce.number().int().min(1).max(500).default(100),
  pagina: z.coerce.number().int().min(1).default(1),
});

module.exports = {
  transacaoSchema,
  usuarioSchema,
  idSchema,
  filtrosListagemSchema,
  paraCentavos,
};
