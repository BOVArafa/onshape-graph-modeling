const assert = require('node:assert/strict');
const { Given, When, Then } = require('@cucumber/cucumber');
const { runSeed } = require('../../scripts/seed');
const { createGraphRepository } = require('../../src/data/graphRepository');

const DEMO_DOCUMENT_ID = '492ae2574a348180fabf6fff';

Given('um banco de demonstração vazio', function () {
  this.repository = createGraphRepository(this.driver);
});

Given('o seed de demonstração já executado', async function () {
  await runSeed(this.driver);
});

When('executo o seed de demonstração', async function () {
  this.seededGraph = await runSeed(this.driver);
});

Then('o grafo do Dumper Trailer fica disponível para consulta', async function () {
  const graph = await this.repository.getDocumentGraph(DEMO_DOCUMENT_ID);
  assert.equal(graph.nodes.length, this.seededGraph.nodes.length);
  assert.equal(graph.relationships.length, this.seededGraph.relationships.length);

  const documentNode = graph.nodes.find((node) => node.label === 'Document');
  assert.equal(documentNode.properties.name, 'Dumper Trailer');
});
