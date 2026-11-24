const express = require('express');
const cors = require('cors');
const { ZodError } = require('zod');
const { criarRepositorio, ErroNegocio } = require('./repository');
const {
  transacaoSchema,
  usuarioSchema,
  idSchema,
  filtrosListagemSchema,
} = require('./schemas');

/** Executa o schema e devolve dados limpos, ou lança ZodError (tratado em um só lugar). */
const validar = (schema, dados) => schema.parse(dados);

function criarApp(db) {
  const repo = criarRepositorio(db);
  const app = express();

  app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
  app.use(express.json({ limit: '10kb' }));

  /** Identifica o autor da operação (trilha de auditoria). */
  const exigirUsuario = (req, _res, next) => {
    req.usuario = validar(usuarioSchema, req.header('X-Usuario'));
    next();
  };

  const rota = (fn) => (req, res, next) => {
    try {
      fn(req, res);
    } catch (e) {
      next(e);
    }
  };

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  app.get(
    '/api/saldo',
    rota((_req, res) => res.json(repo.saldo()))
  );

  app.get(
    '/api/transacoes',
    rota((req, res) => res.json(repo.listar(validar(filtrosListagemSchema, req.query))))
  );

  app.get(
    '/api/transacoes/:id',
    rota((req, res) => res.json(repo.obter(validar(idSchema, req.params.id))))
  );

  app.get(
    '/api/transacoes/:id/auditoria',
    rota((req, res) => res.json(repo.auditoria(validar(idSchema, req.params.id))))
  );

  app.post(
    '/api/transacoes',
    exigirUsuario,
    rota((req, res) => {
      const dados = validar(transacaoSchema, req.body);
      res.status(201).json(repo.criar(dados, req.usuario));
    })
  );

  app.put(
    '/api/transacoes/:id',
    exigirUsuario,
    rota((req, res) => {
      const id = validar(idSchema, req.params.id);
      const dados = validar(transacaoSchema, req.body);
      res.json(repo.editar(id, dados, req.usuario));
    })
  );

  // Soft delete: devolve o registro marcado como excluído
  app.delete(
    '/api/transacoes/:id',
    exigirUsuario,
    rota((req, res) => res.json(repo.excluir(validar(idSchema, req.params.id), req.usuario)))
  );

  app.post(
    '/api/transacoes/:id/restaurar',
    exigirUsuario,
    rota((req, res) => res.json(repo.restaurar(validar(idSchema, req.params.id), req.usuario)))
  );

  app.use((_req, res) =>
    res.status(404).json({ erro: 'Rota não encontrada.', codigo: 'ROTA_INEXISTENTE' })
  );

  // eslint-disable-next-line no-unused-vars
  app.use((erro, _req, res, _next) => {
    if (erro instanceof ZodError) {
      return res.status(400).json({
        erro: 'Dados inválidos.',
        codigo: 'VALIDACAO',
        detalhes: erro.issues.map((i) => ({ campo: i.path.join('.') || 'corpo', mensagem: i.message })),
      });
    }
    if (erro instanceof ErroNegocio) {
      return res.status(erro.status).json({ erro: erro.message, codigo: erro.codigo });
    }
    if (erro.type === 'entity.parse.failed') {
      return res.status(400).json({ erro: 'JSON malformado.', codigo: 'JSON_INVALIDO' });
    }
    console.error(erro);
    return res.status(500).json({ erro: 'Erro interno do servidor.', codigo: 'ERRO_INTERNO' });
  });

  return app;
}

module.exports = { criarApp };
