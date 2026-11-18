const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Given, When, Then } = require('@cucumber/cucumber');
const { AssemblyGraphMapper } = require('../../src/services/graphMapper');
const { createGraphRepository } = require('../../src/data/graphRepository');
const { withSession } = require('../../src/data/neo4jDriver');

const FIXTURES_DIR = path.join(__dirname, '..', '..', 'fixtures', 'onshape');
const DOCUMENT_ID = '492ae2574a348180fabf6fff';

function loadFixture(fileName) {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, fileName), 'utf8'));
}

function countByKey(items, keyOf) {
  const counts = {};
  for (const item of items) {
    const key = keyOf(item);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function countNodesInDatabase(driver) {
  return withSession(driver, async (session) => {
    const result = await session.run('MATCH (node) RETURN count(node) AS total');
    return result.records[0].get('total');
  });
}

Given('o grafo mapeado do modelo real do Dumper Trailer', function () {
  this.mappedGraph = new AssemblyGraphMapper().map({
    document: loadFixture('document-dumper-trailer.json'),
    assemblyDefinition: loadFixture('assembly-trailer-full.json'),
    parts: loadFixture('parts-dumper-trailer.json'),
  });
  this.repository = createGraphRepository(this.driver);
});

Given('o grafo já sincronizado com o banco', async function () {
  await this.repository.upsertDocumentGraph(this.mappedGraph);
});

When('sincronizo o grafo com o banco', async function () {
  await this.repository.upsertDocumentGraph(this.mappedGraph);
});

When('sincronizo o grafo com o banco novamente', async function () {
  await this.repository.upsertDocumentGraph(this.mappedGraph);
});

When('removo o subgrafo do documento do banco', async function () {
  await this.repository.deleteDocumentGraph(DOCUMENT_ID);
});

Then('a consulta devolve os mesmos nós e relacionamentos do grafo mapeado', async function () {
  this.fetchedGraph = await this.repository.getDocumentGraph(DOCUMENT_ID);
  assert.deepEqual(
    countByKey(this.fetchedGraph.nodes, (node) => node.label),
    countByKey(this.mappedGraph.nodes, (node) => node.label),
  );
  assert.deepEqual(
    countByKey(this.fetchedGraph.relationships, (relationship) => relationship.type),
    countByKey(this.mappedGraph.relationships, (relationship) => relationship.type),
  );
});

Then(
  'o material {string} da peça {string} sobrevive à ida e volta ao banco',
  function (expectedMaterial, partName) {
    const part = this.fetchedGraph.nodes.find(
      (node) => node.label === 'Part' && node.properties.name === partName,
    );
    assert.ok(part, `peça ${partName} não encontrada no banco`);

    const material = this.fetchedGraph.nodes.find(
      (node) =>
        node.label === 'Property' &&
        node.properties.partId === part.properties.partId &&
        node.properties.name === 'material',
    );
    assert.ok(material, `propriedade material não encontrada para ${partName}`);
    assert.equal(material.properties.value, expectedMaterial);
  },
);

Then('o banco contém exatamente os nós do grafo mapeado', async function () {
  assert.equal(await countNodesInDatabase(this.driver), this.mappedGraph.nodes.length);
});

Then('o banco fica sem nenhum nó do documento', async function () {
  const graph = await this.repository.getDocumentGraph(DOCUMENT_ID);
  assert.equal(graph.nodes.length, 0);
  assert.equal(graph.relationships.length, 0);
  assert.equal(await countNodesInDatabase(this.driver), 0);
});
