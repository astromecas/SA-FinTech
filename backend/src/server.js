const { abrirBanco } = require('./db');
const { criarApp } = require('./app');

const PORT = Number(process.env.PORT) || 3001;
const db = abrirBanco();
const app = criarApp(db);

app.listen(PORT, () => {
  console.log(`SafeCash API rodando em http://localhost:${PORT}`);
});
