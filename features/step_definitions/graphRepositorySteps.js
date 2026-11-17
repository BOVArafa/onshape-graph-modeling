const assert = require('node:assert/strict');
const { Given, When, Then } = require('@cucumber/cucumber');
const { createGraphRepository } = require('../../src/data/graphRepository');
const { withSession } = require('../../src/data/neo4jDriver');

const DOCUMENT_ID = 'doc-dumper-trailer';
const ORIGINAL_PART_NAME = 'Chassi';
const UPDATED_PART_NAME = 'Chassi reforçado';

function buildDocumentGraph(chassisName = ORIGINAL_PART_NAME) {
  const documentRef = { label: 'Document', key: { documentId: DOCUMENT_ID } };
  const assemblyRef = { label: 'Assembly', key: { elementId: 'asm-principal' } };
  const chassisRef = { label: 'Part', key: { partId: 'part-chassi' } };
  const wheelRef = { label: 'Part', key: { partId: 'part-roda' } };
  const materialRef = { label: 'Property', key: { partId: 'part-chassi', name: 'material' } };

  return {
    nodes: [
      { label: 'Document', properties: { documentId: DOCUMENT_ID, name: 'Dumper Trailer' } },
      { label: 'Assembly', properties: { elementId: 'asm-principal', name: 'Montagem principal' } },
      { label: 'Part', properties: { partId: 'part-chassi', name: chassisName } },
      { label: 'Part', properties: { partId: 'part-roda', name: 'Roda' } },
      { label: 'Property', properties: { partId: 'part-chassi', name: 'material', value: 'Aço' } },
    ],
    relationships: [
      { type: 'CONTAINS', from: documentRef, to: assemblyRef },
      { type: 'CONTAINS', from: assemblyRef, to: chassisRef },
      { type: 'CONTAINS', from: assemblyRef, to: wheelRef },
      { type: 'HAS_PROPERTY', from: chassisRef, to: materialRef },
      { type: 'MATES_WITH', from: chassisRef, to: wheelRef },
    ],
  };
}

Given('um grafo de documento já persistido', async function () {
  const graph = buildDocumentGraph();
  this.repository = createGraphRepository(this.driver);
  await this.repository.upsertDocumentGraph(graph);
  this.firstSync = await this.repository.getDocumentGraph(DOCUMENT_ID);
  assert.equal(this.firstSync.nodes.length, graph.nodes.length);
  assert.equal(this.firstSync.relationships.length, graph.relationships.length);
});

When('executo a sincronização do mesmo documento novamente', async function () {
  await this.repository.upsertDocumentGraph(buildDocumentGraph(UPDATED_PART_NAME));
  this.secondSync = await this.repository.getDocumentGraph(DOCUMENT_ID);
});

When('removo o grafo do documento', async function () {
  await this.repository.deleteDocumentGraph(DOCUMENT_ID);
});

Then('nenhum nó ou relacionamento é duplicado', function () {
  assert.equal(this.secondSync.nodes.length, this.firstSync.nodes.length);
  assert.equal(this.secondSync.relationships.length, this.firstSync.relationships.length);
});

Then('as propriedades alteradas são atualizadas', function () {
  const chassis = this.secondSync.nodes.find(
    (node) => node.label === 'Part' && node.properties.partId === 'part-chassi',
  );
  assert.equal(chassis.properties.name, UPDATED_PART_NAME);
});

Then('o banco não possui mais nós nem relacionamentos do documento', async function () {
  const graph = await this.repository.getDocumentGraph(DOCUMENT_ID);
  assert.equal(graph.nodes.length, 0);
  assert.equal(graph.relationships.length, 0);

  const remainingNodes = await withSession(this.driver, async (session) => {
    const result = await session.run('MATCH (node) RETURN count(node) AS total');
    return result.records[0].get('total');
  });
  assert.equal(remainingNodes, 0);
});
