# SafeCash · Sistema de Tesouraria Integrada

Core Engine de gestão financeira para pequenas empresas, desenvolvido para a Situação de
Aprendizagem **"Sistema de Tesouraria Integrada – FinTech Flow"** (Desenvolvimento de Sistemas).

Um **CRUD inteligente** de entradas e saídas em que cada operação passa por validação de esquema,
é auditada e **nunca apaga dados fisicamente** (*soft delete*), com saldo atualizado automaticamente.

| Camada | Tecnologia |
|---|---|
| Backend | Node.js + Express, validação com **Zod** |
| Banco | SQLite (relacional) embutido no Node (`node:sqlite`), sem compilação nativa |
| Frontend | React 18 + Vite (layout responsivo web/mobile) |
| Testes | `node:test` (11 testes de integração da API) |

---

## Funcionalidades

- Listar, criar, editar e excluir (**soft delete**) transações; restaurar excluídas.
- **Dashboard** com saldo, total de entradas e saídas, atualizado após cada operação e a cada 10 s.
- **Regra de Ouro (H1):** exclusão física é impossível — bloqueada na API *e* por *trigger* no banco.
- **Validação rigorosa:** valor absoluto sempre positivo, máximo de 2 casas decimais, tipo restrito,
  data real, campos desconhecidos rejeitados.
- **Anti-duplicidade:** mesma descrição + valor + tipo + data entre registros ativos retorna `409`.
- **Rastreabilidade:** quem criou, quando alterou, quem excluiu; trilha de auditoria imutável
  (guarda o estado anterior e o novo de cada operação) consultável pelo botão **Histórico**.
- **Precisão bancária:** valores armazenados em **centavos inteiros** (sem erro de ponto flutuante).

---

## Como executar

**Pré-requisito:** Node.js **22.13 ou superior** (o banco usa o módulo `node:sqlite`, embutido no Node).
Verifique com `node -v`. O Node pode exibir um aviso *ExperimentalWarning: SQLite*: é esperado e inofensivo.

```bash
# 1. instalar dependências (backend e frontend)
npm run instalar

# 2. terminal 1 - API em http://localhost:3001
npm run dev:api

# 3. terminal 2 - interface em http://localhost:5173
npm run dev:web
```

Abra **http://localhost:5173**. O banco é criado automaticamente em `backend/data/safecash.db`.

Variáveis opcionais: copie `backend/.env.example` para `backend/.env` (`PORT`, `DB_PATH`, `CORS_ORIGIN`).

### Testes

```bash
npm test
```

---

## Documentação da API

Base: `http://localhost:3001/api` · Formato: JSON.

**Autor da operação:** rotas de escrita exigem o cabeçalho `X-Usuario: <nome>` (2 a 60 caracteres),
usado na trilha de auditoria. *(Autenticação com JWT é uma evolução natural — ver "Próximos passos".)*

### Objeto Transação

```json
{
  "id": 1,
  "descricao": "Pagamento de Aluguel",
  "valor": 2000,
  "valor_centavos": 200000,
  "tipo": "SAIDA",
  "categoria": "Despesas fixas",
  "data_transacao": "2026-03-05",
  "criado_por": "willer",
  "criado_em": "2026-03-05T14:00:00.000Z",
  "atualizado_por": null,
  "atualizado_em": null,
  "excluido": false,
  "excluido_por": null,
  "excluido_em": null
}
```

### Rotas

| Método | Rota | Descrição | Sucesso |
|---|---|---|---|
| `GET` | `/saldo` | Entradas, saídas e saldo (somente registros ativos) | `200` |
| `GET` | `/transacoes` | Lista com filtros e paginação | `200` |
| `GET` | `/transacoes/:id` | Detalha uma transação | `200` |
| `POST` | `/transacoes` | Cria transação | `201` |
| `PUT` | `/transacoes/:id` | Edita (corpo completo) | `200` |
| `DELETE` | `/transacoes/:id` | **Soft delete** (marca `excluido = true`) | `200` |
| `POST` | `/transacoes/:id/restaurar` | Restaura uma transação excluída | `200` |
| `GET` | `/transacoes/:id/auditoria` | Trilha de auditoria da transação | `200` |
| `GET` | `/health` | Verificação de disponibilidade | `200` |

**Filtros de `GET /transacoes`:** `tipo` (`ENTRADA`/`SAIDA`), `excluidas` (`nao` padrão · `sim` · `todas`),
`busca` (descrição/categoria), `limite` (1–500, padrão 100), `pagina`.

### Corpo de `POST` / `PUT`

| Campo | Regra |
|---|---|
| `descricao` | texto, 3 a 120 caracteres |
| `valor` | número **> 0**, até 2 casas decimais, máx. 1.000.000.000 |
| `tipo` | `"ENTRADA"` ou `"SAIDA"` |
| `categoria` | texto, 2 a 40 caracteres (padrão `"Geral"`) |
| `data_transacao` | data válida `AAAA-MM-DD` |

### Exemplo

```bash
curl -X POST http://localhost:3001/api/transacoes \
  -H "Content-Type: application/json" -H "X-Usuario: willer" \
  -d '{"descricao":"Pagamento de Aluguel","valor":2000.00,"tipo":"SAIDA","categoria":"Despesas fixas","data_transacao":"2026-03-05"}'
```

### Erros

Sempre no formato `{ "erro": "...", "codigo": "..." }`:

| Status | Código | Quando |
|---|---|---|
| `400` | `VALIDACAO` | Dados inválidos (inclui `detalhes: [{campo, mensagem}]`) |
| `400` | `JSON_INVALIDO` | JSON malformado |
| `404` | `NAO_ENCONTRADA` | Transação inexistente |
| `409` | `DUPLICIDADE` | Lançamento duplicado |
| `409` | `REGISTRO_EXCLUIDO` · `JA_EXCLUIDA` · `NAO_EXCLUIDA` | Operação incompatível com o estado do registro |

---

## Arquitetura

```
safecash-tesouraria/
├── backend/
│   ├── src/
│   │   ├── server.js       # inicialização
│   │   ├── app.js          # rotas HTTP, middlewares, tratamento de erros
│   │   ├── schemas.js      # validação (Zod) e conversão para centavos
│   │   ├── repository.js   # regras de negócio + acesso a dados + auditoria
│   │   └── db.js           # DDL, constraints, índices e triggers
│   └── tests/api.test.js
├── frontend/src/
│   ├── App.jsx             # estado, polling e orquestração
│   ├── api.js · format.js
│   └── components/         # SaldoCards, TransacaoForm, TransacaoLista, AuditoriaDialog
└── docs/
    ├── MODELAGEM_BANCO.md
    ├── JUSTIFICATIVA_STACK.md
    └── CRONOGRAMA_SPRINTS.md
```

Camadas de proteção de cada escrita: **(1)** schema Zod → **(2)** regras de negócio no repositório
(estado do registro, duplicidade) → **(3)** constraints/triggers do banco. Escritas e auditoria
ocorrem na **mesma transação SQL** (ou grava tudo, ou não grava nada).

---

## Mapa de evidências da S.A.

| Evidência | Onde está |
|---|---|
| API REST (listar, criar, editar, soft delete) | `backend/src/app.js` |
| Interface React com saldo em tempo real | `frontend/src/` |
| Regra de Ouro / rastreabilidade (H1) | `repository.js` (`excluir`) + trigger em `db.js` |
| Validação de esquemas | `backend/src/schemas.js` |
| README e documentação das rotas (H6, H10) | este arquivo |
| Banco relacional com autoria e datas | `docs/MODELAGEM_BANCO.md` |
| Cronograma de sprints (H8) | `docs/CRONOGRAMA_SPRINTS.md` |
| Justificativa de stack (H2, H3, H4) | `docs/JUSTIFICATIVA_STACK.md` |
| Clean Code e boas práticas (C10) | nomes descritivos, funções curtas, separação de camadas, testes |

## Próximos passos

Autenticação JWT com perfis; migração para PostgreSQL; conciliação bancária e importação de OFX/CSV;
relatórios por período e categoria; CI com testes no GitHub Actions.
