# Justificativa de Stack: JavaScript Fullstack para a SafeCash

**Stack escolhida:** Node.js + Express (API) · React (interface) · SQLite (persistência) · Zod (validação).

## 1. Requisitos da SafeCash que guiaram a escolha

| Requisito do cenário | Como a stack atende |
|---|---|
| Plataforma **multiplataforma** (web e mobile) | React gera uma SPA responsiva, executada em qualquer navegador desktop ou celular, sem instalação. Os mesmos conceitos permitem evoluir para app nativo com React Native. |
| Pequenas empresas, **time enxuto** e entrega rápida | Uma única linguagem no front e no back reduz a curva de aprendizado e a troca de contexto. |
| **Integridade** e validação rigorosa dos dados | Zod valida o esquema na borda da API; constraints e triggers do banco garantem a regra mesmo se a API for contornada. |
| **Escalabilidade** | O modelo assíncrono e orientado a eventos do Node.js lida bem com muitas requisições de I/O (típicas de um CRUD financeiro). A API é *stateless*: pode ser replicada horizontalmente. |
| **Tempo real** no saldo | Atualização do dashboard após cada operação e por *polling*; evolução simples para WebSockets/SSE no mesmo ecossistema. |
| **Integração** com outros sistemas (bancos, ERPs) | API REST com JSON é o padrão de mercado para integrações; o npm oferece bibliotecas para OFX, CSV, PIX e gateways. |

## 2. Por que cada peça

- **Node.js + Express:** leve, maduro e com enorme ecossistema. Código de rotas curto e legível, ideal para demonstrar Clean Code e separação de camadas.
- **React:** componentização (formulário, lista, cards de saldo) favorece reaproveitamento e testes; o estado reativo faz o saldo refletir imediatamente cada operação.
- **Zod:** schemas declarativos e legíveis; mensagens de erro claras ao usuário e uma única fonte de verdade para as regras de entrada.
- **SQLite → PostgreSQL:** SQLite é relacional, transacional (ACID) e não exige servidor, o que simplifica a instalação em sala; o driver é o `node:sqlite`, embutido no Node, sem dependências nativas. A camada `repository.js` isola o SQL, então migrar para PostgreSQL em produção afeta poucos arquivos.
- **Vite:** inicialização e *build* rápidos, com proxy que elimina CORS em desenvolvimento.

## 3. Alternativas consideradas

| Alternativa | Vantagens | Por que não foi a primeira escolha |
|---|---|---|
| Java/Spring Boot | Robusto, tipagem forte, muito usado em bancos | Maior volume de configuração e *boilerplate*; prototipação mais lenta; exigiria duas linguagens com um front web. |
| PHP/Laravel | Produtividade alta, ótimo ORM | Mantém duas linguagens (PHP + JS no front); o requisito de multiplataforma pede front moderno de qualquer forma. |
| Python/Django | Admin pronto, boa legibilidade | Mesmo ponto das duas linguagens; para I/O concorrente, Node tende a ser mais simples de escalar nesse perfil. |
| .NET | Excelente desempenho e ferramentas | Curva de adoção e infraestrutura mais pesadas para startup e contexto de sala. |

## 4. Riscos e mitigação

| Risco | Mitigação adotada |
|---|---|
| JavaScript é dinamicamente tipado | Validação de entrada com Zod, testes de integração e ESLint/TypeScript como evolução. |
| Precisão de ponto flutuante em dinheiro | Valores em **centavos inteiros** no banco e nos cálculos de saldo. |
| Dependências npm | Poucas dependências diretas, versões travadas em `package-lock.json`. |
| Single-thread do Node | Operações são de I/O; para carga pesada, usar *cluster*/múltiplas instâncias atrás de um balanceador. |

## 5. Conclusão

Para uma startup que precisa **entregar rápido, com equipe pequena, em múltiplas plataformas e com
alta confiabilidade dos dados**, o ecossistema JavaScript fullstack oferece o melhor equilíbrio entre
produtividade, escalabilidade e facilidade de integração. As garantias financeiras críticas
(integridade, rastreabilidade, ausência de duplicidade) não dependem da linguagem: foram
implementadas em camadas, inclusive no banco de dados.
