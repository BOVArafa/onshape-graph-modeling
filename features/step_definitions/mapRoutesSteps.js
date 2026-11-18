const assert = require('node:assert/strict');
const { once } = require('node:events');
const { Given, When, Then } = require('@cucumber/cucumber');
const createApp = require('../../src/app');
const { createGraphRepository } = require('../../src/data/graphRepository');
const { createFixtureOnshapeClient } = require('../support/fixtureOnshapeClient');

const DOCUMENT_ID = '492ae2574a348180fabf6fff';
const REUSED_PART_ID = '2ac005525946c0adbca3a949/JHD';
const REUSING_SUBASSEMBLY_IDS = ['101925f063c88fe6f8c87677', 'a53ea73d88d5a7c5209d32b5'];
const MATED_SCREW_ID = '944b4c976c9eca33422e66e6/JHD';
const MATED_MOUNT_ID = 'd54cee4a0a37a8711cf5d3d7/RjGD';
const INTERNAL_FAILURE_HINT = 'Onshape';

async function startApi(world, onshapeClient) {
  world.repository = createGraphRepository(world.driver);
  world.server = createApp({ onshapeClient, graphRepository: world.repository }).listen(0);
  await once(world.server, 'listening');
  world.baseUrl = `http://localhost:${world.server.address().port}`;
}

async function callMapRoute(world, method, documentId) {
  world.response = await fetch(`${world.baseUrl}/map/${documentId}`, { method });
  world.responseBody = world.response.status === 204 ? null : await world.response.json();
}

Given('a API conectada ao Onshape de fixtures e ao banco efêmero', async function () {
  await startApi(this, createFixtureOnshapeClient());
});

Given('a API cuja coleta no Onshape falha', async function () {
  await startApi(this, {
    getDocument() {
      return Promise.reject(new Error('Onshape API respondeu 503 em GET /api/documents'));
    },
  });
});

Given('o documento do Dumper Trailer já sincronizado pela API', async function () {
  await callMapRoute(this, 'POST', DOCUMENT_ID);
  assert.equal(this.response.status, 200);
  this.firstSyncGraph = await this.repository.getDocumentGraph(DOCUMENT_ID);
});

When('executo POST \\/map para o documento do Dumper Trailer', async function () {
  await callMapRoute(this, 'POST', DOCUMENT_ID);
});

When('executo GET \\/map para o documento do Dumper Trailer', async function () {
  await callMapRoute(this, 'GET', DOCUMENT_ID);
});

When('executo DELETE \\/map para o documento do Dumper Trailer', async function () {
  await callMapRoute(this, 'DELETE', DOCUMENT_ID);
});

When('executo {word} \\/map com o identificador inválido {string}', async function (method, invalidId) {
  await callMapRoute(this, method, invalidId);
});

Then('o grafo persistido contém exatamente um nó para a peça reutilizada', async function () {
  this.persistedGraph = await this.repository.getDocumentGraph(DOCUMENT_ID);
  const reusedPartNodes = this.persistedGraph.nodes.filter(
    (node) => node.label === 'Part' && node.properties.partId === REUSED_PART_ID,
  );
  assert.equal(reusedPartNodes.length, 1);
});

Then('esse nó possui um CONTAINS de entrada de cada subassembly que a reutiliza', function () {
  const parentAssemblyIds = this.persistedGraph.relationships
    .filter((rel) => rel.type === 'CONTAINS' && rel.to.key.partId === REUSED_PART_ID)
    .map((rel) => rel.from.key.elementId);

  for (const subassemblyId of REUSING_SUBASSEMBLY_IDS) {
    assert.ok(
      parentAssemblyIds.includes(subassemblyId),
      `faltou CONTAINS a partir da subassembly ${subassemblyId}`,
    );
  }
});

Then('a contagem de nós e relacionamentos do documento permanece inalterada', async function () {
  const currentGraph = await this.repository.getDocumentGraph(DOCUMENT_ID);
  assert.equal(currentGraph.nodes.length, this.firstSyncGraph.nodes.length);
  assert.equal(currentGraph.relationships.length, this.firstSyncGraph.relationships.length);
});

Then('o mate entre o parafuso e o suporte do calço vira um relacionamento MATES_WITH', async function () {
  const graph = await this.repository.getDocumentGraph(DOCUMENT_ID);
  const connectsPair = (rel) =>
    (rel.from.key.partId === MATED_SCREW_ID && rel.to.key.partId === MATED_MOUNT_ID) ||
    (rel.from.key.partId === MATED_MOUNT_ID && rel.to.key.partId === MATED_SCREW_ID);

  assert.ok(
    graph.relationships.some((rel) => rel.type === 'MATES_WITH' && connectsPair(rel)),
    'nenhum MATES_WITH entre o parafuso e o suporte do calço',
  );
});

Then('o corpo da resposta contém os nós e relacionamentos do documento', function () {
  assert.equal(this.responseBody.nodes.length, this.firstSyncGraph.nodes.length);
  assert.equal(this.responseBody.relationships.length, this.firstSyncGraph.relationships.length);
});

Then('o corpo da resposta contém uma mensagem de erro', function () {
  assert.ok(typeof this.responseBody.error === 'string' && this.responseBody.error.length > 0);
});

Then('o corpo da resposta contém uma mensagem de erro sem detalhes internos', function () {
  assert.ok(typeof this.responseBody.error === 'string' && this.responseBody.error.length > 0);
  assert.ok(
    !this.responseBody.error.includes(INTERNAL_FAILURE_HINT),
    'a resposta vazou detalhes do erro interno',
  );
});
