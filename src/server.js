require('dotenv').config();

const createApp = require('./app');
const { createOnshapeClient } = require('./services/onshapeClient');
const { createNeo4jDriver } = require('./data/neo4jDriver');
const { createGraphRepository } = require('./data/graphRepository');

const DEFAULT_PORT = 3000;
const port = process.env.PORT || DEFAULT_PORT;

const driver = createNeo4jDriver();
const app = createApp({
  onshapeClient: createOnshapeClient(),
  graphRepository: createGraphRepository(driver),
});

app.listen(port, () => {
  console.log(`Servidor disponível em http://localhost:${port}`);
});
