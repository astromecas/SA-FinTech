const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite'); // SQLite embutido no Node (>= 22.13), sem compilação nativa

/**
 * Abre (e prepara) o banco SQLite.
 * Regras de integridade ficam no próprio banco (defesa em profundidade):
 *  - valor sempre positivo e armazenado em CENTAVOS (inteiro, sem erro de ponto flutuante);
 *  - DELETE físico é bloqueado por trigger (Regra de Ouro / H1);
 *  - trilha de auditoria é append-only (não aceita UPDATE nem DELETE);
 *  - índice único parcial impede lançamentos duplicados entre registros ativos.
 */
function abrirBanco(caminho = process.env.DB_PATH || './data/safecash.db') {
  if (caminho !== ':memory:') {
    fs.mkdirSync(path.dirname(path.resolve(caminho)), { recursive: true });
  }
  const db = new DatabaseSync(caminho);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  db.exec(`
    CREATE TABLE IF NOT EXISTS transacoes (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      descricao       TEXT    NOT NULL CHECK (length(trim(descricao)) >= 3),
      valor_centavos  INTEGER NOT NULL CHECK (valor_centavos > 0),
      tipo            TEXT    NOT NULL CHECK (tipo IN ('ENTRADA', 'SAIDA')),
      categoria       TEXT    NOT NULL DEFAULT 'Geral',
      data_transacao  TEXT    NOT NULL,              -- AAAA-MM-DD
      criado_por      TEXT    NOT NULL,
      criado_em       TEXT    NOT NULL,              -- ISO 8601 (UTC)
      atualizado_por  TEXT,
      atualizado_em   TEXT,
      excluido        INTEGER NOT NULL DEFAULT 0 CHECK (excluido IN (0, 1)),
      excluido_por    TEXT,
      excluido_em     TEXT
    );

    CREATE TABLE IF NOT EXISTS auditoria (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      transacao_id      INTEGER NOT NULL REFERENCES transacoes (id),
      acao              TEXT    NOT NULL CHECK (acao IN ('CRIAR', 'EDITAR', 'EXCLUIR', 'RESTAURAR')),
      usuario           TEXT    NOT NULL,
      dados_anteriores  TEXT,                        -- JSON
      dados_novos       TEXT,                        -- JSON
      data_hora         TEXT    NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_transacoes_data ON transacoes (data_transacao DESC, id DESC);
    CREATE INDEX IF NOT EXISTS idx_auditoria_transacao ON auditoria (transacao_id);

    -- Anti-duplicidade: mesma descrição + valor + tipo + data entre registros ativos
    CREATE UNIQUE INDEX IF NOT EXISTS ux_transacoes_duplicidade
      ON transacoes (lower(trim(descricao)), valor_centavos, tipo, data_transacao)
      WHERE excluido = 0;

    -- Regra de Ouro: proibido exclusão física
    CREATE TRIGGER IF NOT EXISTS trg_transacoes_bloqueia_delete
    BEFORE DELETE ON transacoes
    BEGIN
      SELECT RAISE(ABORT, 'Exclusao fisica proibida: use soft delete (excluido = 1).');
    END;

    -- Auditoria imutável (append-only)
    CREATE TRIGGER IF NOT EXISTS trg_auditoria_bloqueia_update
    BEFORE UPDATE ON auditoria
    BEGIN
      SELECT RAISE(ABORT, 'Trilha de auditoria e imutavel.');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_auditoria_bloqueia_delete
    BEFORE DELETE ON auditoria
    BEGIN
      SELECT RAISE(ABORT, 'Trilha de auditoria e imutavel.');
    END;
  `);

  return db;
}

/**
 * Envolve uma função em transação SQL: confirma (COMMIT) se terminar bem
 * e desfaz tudo (ROLLBACK) se lançar erro. Garante que registro + auditoria
 * sejam gravados juntos ou não sejam gravados.
 */
function emTransacao(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const resultado = fn();
    db.exec('COMMIT');
    return resultado;
  } catch (erro) {
    db.exec('ROLLBACK');
    throw erro;
  }
}

module.exports = { abrirBanco, emTransacao };
