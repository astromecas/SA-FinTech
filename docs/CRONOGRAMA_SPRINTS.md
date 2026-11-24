# Cronograma de Sprints

> **Modelo para o grupo adaptar:** substitua as datas e os responsáveis pelos reais da equipe
> e mantenha o quadro (GitHub Projects ou Trello) atualizado. Prints do quadro ao final de cada
> sprint comprovam a gestão do tempo (H8).

Metodologia: Scrum simplificado · 4 sprints de 1 semana · *daily* de 10 min · *review/retro* no fim de cada sprint.
Papéis sugeridos: **Product Owner** (prioriza), **Scrum Master** (facilita), **Devs** (backend, frontend, qualidade e docs).

## Quadro (colunas)

`Backlog` → `A fazer (sprint)` → `Em andamento` → `Em revisão (PR)` → `Concluído`

**Definição de pronto (DoD):** código revisado por outro integrante via Pull Request · testes passando ·
sem erros no console · README atualizado quando houver mudança de rota ou setup.

## Sprint 1 · Fundação e backend

**Meta:** API listando e criando transações com validação.

| # | Tarefa | Responsável | Est. | Status |
|---|---|---|---|---|
| 1 | Criar repositório Git, branches (`main`, `develop`) e convenção de commits | _a definir_ | 1h | ☐ |
| 2 | Levantar requisitos e histórias de usuário a partir da S.A. | _a definir_ | 2h | ☐ |
| 3 | Modelar o banco (DER) e criar o DDL | _a definir_ | 3h | ☐ |
| 4 | Estrutura do projeto Node/Express e rota `/health` | _a definir_ | 2h | ☐ |
| 5 | Rotas `GET` e `POST /transacoes` com schemas Zod | _a definir_ | 4h | ☐ |
| 6 | Quadro de tarefas criado e primeira *retro* | _a definir_ | 1h | ☐ |

## Sprint 2 · CRUD completo e regras de negócio

**Meta:** backend completo, com soft delete, auditoria e saldo.

| # | Tarefa | Responsável | Est. | Status |
|---|---|---|---|---|
| 7 | Rota `PUT /transacoes/:id` | _a definir_ | 2h | ☐ |
| 8 | **Soft delete** (`DELETE`) + restauração | _a definir_ | 3h | ☐ |
| 9 | Trilha de auditoria (quem criou/alterou/excluiu) | _a definir_ | 4h | ☐ |
| 10 | Rota `/saldo` em centavos inteiros | _a definir_ | 2h | ☐ |
| 11 | Bloqueio de duplicidade e triggers de integridade | _a definir_ | 3h | ☐ |
| 12 | Testes de integração da API | _a definir_ | 4h | ☐ |

## Sprint 3 · Interface React

**Meta:** interface administrativa consumindo a API, com saldo atualizado automaticamente.

| # | Tarefa | Responsável | Est. | Status |
|---|---|---|---|---|
| 13 | Projeto React/Vite, proxy e camada `api.js` | _a definir_ | 2h | ☐ |
| 14 | Cards de saldo (total, entradas, saídas) | _a definir_ | 3h | ☐ |
| 15 | Formulário de lançamento (criar/editar) com feedback de erros | _a definir_ | 4h | ☐ |
| 16 | Lista com filtros, exclusão, restauração e histórico | _a definir_ | 4h | ☐ |
| 17 | Layout responsivo (teste em celular) | _a definir_ | 3h | ☐ |
| 18 | Atualização automática do saldo (após ações + polling) | _a definir_ | 2h | ☐ |

## Sprint 4 · Qualidade, documentação e entrega

**Meta:** projeto apresentável no portfólio.

| # | Tarefa | Responsável | Est. | Status |
|---|---|---|---|---|
| 19 | Revisão de Clean Code (nomes, funções curtas, remoção de código morto) | _a definir_ | 3h | ☐ |
| 20 | README profissional + documentação das rotas | _a definir_ | 3h | ☐ |
| 21 | Relatório de justificativa de stack | _a definir_ | 2h | ☐ |
| 22 | Simulação e resolução de *merge conflicts* (registrar no README/prints) | _a definir_ | 2h | ☐ |
| 23 | Teste ponta a ponta: cadastrar "Aluguel – R$ 2.000,00" e conferir saldo | _a definir_ | 1h | ☐ |
| 24 | Ensaio e apresentação final | todos | 2h | ☐ |

## Cerimônias

| Cerimônia | Quando | Objetivo |
|---|---|---|
| Planning | início de cada sprint | Escolher tarefas e responsáveis |
| Daily | diária (10 min) | O que fiz, o que farei, impedimentos |
| Review | fim da sprint | Demonstrar o incremento funcionando |
| Retrospectiva | após a review | O que manter, melhorar e parar |

## Fluxo de Git (evidência de colaboração, C10)

1. Cada tarefa vira uma branch: `feature/soft-delete`, `fix/validacao-valor`.
2. Commits pequenos no padrão: `feat: ...`, `fix: ...`, `docs: ...`, `test: ...`.
3. Pull Request para `develop` com revisão de outro integrante.
4. Conflitos de merge são resolvidos em equipe e registrados.
5. Ao final de cada sprint, `develop` → `main` com *tag* (`v0.1`, `v0.2`...).
