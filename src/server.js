require('dotenv').config();

const createApp = require('./app');
const { createOnshapeClient } = require('./services/onshapeClient');
const { createNeo4jDriver } = require('./data/neo4jDriver');
const { createGraphRepository } = require('./data/graphRepository');

const DEFAULT_PORT = 3000;
const port = process.env.PORT || DEFAULT_PORT;
const apiKey = process.env.API_KEY;

if (!apiKey) {
  console.error('API_KEY não definida — configure no arquivo .env (ver README, seção Credenciais)');
  process.exit(1);
}

const driver = createNeo4jDriver();
const app = createApp({
  onshapeClient: createOnshapeClient(),
  graphRepository: createGraphRepository(driver),
  apiKey,
});

app.listen(port, () => {
  console.log(`Servidor disponível em http://localhost:${port}`);
});
