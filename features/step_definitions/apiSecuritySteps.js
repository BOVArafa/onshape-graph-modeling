const assert = require('node:assert/strict');
const { once } = require('node:events');
const { Given, When, Then } = require('@cucumber/cucumber');
const createApp = require('../../src/app');
const { createGraphRepository } = require('../../src/data/graphRepository');
const { withSession } = require('../../src/data/neo4jDriver');
const { createFixtureOnshapeClient } = require('../support/fixtureOnshapeClient');

const DOCUMENT_ID = '492ae2574a348180fabf6fff';
const API_KEY_HEADER = 'x-api-key';
const VALID_API_KEY = 'chave-de-teste-da-sec-011';
const SMALL_RATE_LIMIT = 3;

async function startSecureApi(world, appOptions = {}) {
  world.repository = createGraphRepository(world.driver);
  world.server = createApp({
    onshapeClient: createFixtureOnshapeClient(),
    graphRepository: world.repository,
    apiKey: VALID_API_KEY,
    ...appOptions,
  }).listen(0);
  await once(world.server, 'listening');
  world.baseUrl = `http://localhost:${world.server.address().port}`;
}

async function callRoute(world, method, path, headers = {}) {
  world.response = await fetch(`${world.baseUrl}${path}`, { method, headers });
  world.responseBody = world.response.status === 204 ? null : await world.response.json();
}

Given('a API protegida por API Key', async function () {
  await startSecureApi(this);
});

Given('a API com limite de {int} requisições por IP', async function (limit) {
  assert.equal(limit, SMALL_RATE_LIMIT);
  await startSecureApi(this, { rateLimit: { windowMs: 60000, limit } });
});

Given('o documento sincronizado com a API Key válida', async function () {
  await callRoute(this, 'POST', `/map/${DOCUMENT_ID}`, { [API_KEY_HEADER]: VALID_API_KEY });
  assert.equal(this.response.status, 200);
});

When('faço POST \\/map sem o header de API Key', async function () {
  await callRoute(this, 'POST', `/map/${DOCUMENT_ID}`);
});

When('faço POST \\/map com uma API Key inválida', async function () {
  await callRoute(this, 'POST', `/map/${DOCUMENT_ID}`, { [API_KEY_HEADER]: 'chave-errada' });
});

When('faço POST \\/map com a API Key válida', async function () {
  await callRoute(this, 'POST', `/map/${DOCUMENT_ID}`, { [API_KEY_HEADER]: VALID_API_KEY });
});

When('faço DELETE \\/map sem o header de API Key', async function () {
  await callRoute(this, 'DELETE', `/map/${DOCUMENT_ID}`);
});

When('faço GET \\/map sem credencial', async function () {
  await callRoute(this, 'GET', `/map/${DOCUMENT_ID}`);
});

When('excedo o limite de requisições', async function () {
  for (let attempt = 0; attempt < SMALL_RATE_LIMIT + 1; attempt += 1) {
    await callRoute(this, 'GET', '/health');
  }
});

When('faço GET \\/health', async function () {
  await callRoute(this, 'GET', '/health');
});

Then('o grafo permanece inalterado', async function () {
  const totalNodes = await withSession(this.driver, async (session) => {
    const result = await session.run('MATCH (node) RETURN count(node) AS total');
    return result.records[0].get('total');
  });
  assert.equal(totalNodes, 0);
});

Then('a resposta contém o header {string} com valor {string}', function (headerName, expectedValue) {
  assert.equal(this.response.headers.get(headerName), expectedValue);
});
