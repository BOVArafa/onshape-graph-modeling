const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Given, When, Then } = require('@cucumber/cucumber');
const { AssemblyGraphMapper } = require('../../src/services/graphMapper');

const FIXTURES_DIR = path.join(__dirname, '..', '..', 'fixtures', 'onshape');

const DOCUMENT_ID = '492ae2574a348180fabf6fff';
const ROOT_ASSEMBLY_ELEMENT_ID = 'f4b4556f2bfab459c2c18ca2';
const REUSED_PART_ID = '2ac005525946c0adbca3a949/JHD';
const REUSING_SUBASSEMBLY_IDS = ['101925f063c88fe6f8c87677', 'a53ea73d88d5a7c5209d32b5'];
const MATED_WASHER_ID = 'aa19e4f7aa24b3613aa68155/JHD';
const MATED_ENCLOSURE_ID = '1a43b0c1c93e355c01a752e9/ReHD';
const COLLIDING_PART_IDS = ['b58416ed2a068e86796ea6d7/JHD', 'd2b2aadf45f6c5a78a3165b2/JHD'];
const SHARED_SOURCE_PART_ID = 'JHD';

function loadFixture(fileName) {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, fileName), 'utf8'));
}

function buildMapperInput(assemblyFileName, { includeParts = false } = {}) {
  return {
    document: loadFixture('document-dumper-trailer.json'),
    assemblyDefinition: loadFixture(assemblyFileName),
    parts: includeParts ? loadFixture('parts-dumper-trailer.json') : [],
  };
}

function findPartNodes(graph, partId) {
  return graph.nodes.filter(
    (node) => node.label === 'Part' && node.properties.partId === partId,
  );
}

Given('um assembly com uma peça reutilizada em duas subassemblies', function () {
  this.mapperInput = buildMapperInput('assembly-trailer-full.json');
});

Given('um assembly com uma restrição de montagem entre duas peças', function () {
  this.mapperInput = buildMapperInput('assembly-hydraulics-small.json');
});

Given('um assembly com duas peças distintas que compartilham o mesmo partId', function () {
  this.mapperInput = buildMapperInput('assembly-trailer-full.json');
});

Given('um assembly acompanhado da lista de peças do documento', function () {
  this.mapperInput = buildMapperInput('assembly-trailer-full.json', { includeParts: true });
});

When('executo o mapeamento', function () {
  this.graph = new AssemblyGraphMapper().map(this.mapperInput);
});

Then('a peça aparece como um único nó no resultado', function () {
  assert.equal(findPartNodes(this.graph, REUSED_PART_ID).length, 1);
});

Then('possui um relacionamento CONTAINS a partir de cada subassembly', function () {
  const parentAssemblyIds = this.graph.relationships
    .filter((rel) => rel.type === 'CONTAINS' && rel.to.key.partId === REUSED_PART_ID)
    .map((rel) => rel.from.key.elementId);

  for (const subassemblyId of REUSING_SUBASSEMBLY_IDS) {
    assert.ok(
      parentAssemblyIds.includes(subassemblyId),
      `faltou CONTAINS a partir da subassembly ${subassemblyId}`,
    );
  }
});

Then('existe um relacionamento MATES_WITH entre os nós correspondentes', function () {
  const connectsMatedPair = (rel) =>
    (rel.from.key.partId === MATED_WASHER_ID && rel.to.key.partId === MATED_ENCLOSURE_ID) ||
    (rel.from.key.partId === MATED_ENCLOSURE_ID && rel.to.key.partId === MATED_WASHER_ID);

  assert.ok(
    this.graph.relationships.some((rel) => rel.type === 'MATES_WITH' && connectsMatedPair(rel)),
    'nenhum MATES_WITH entre a arruela e o gabinete',
  );
});

Then('cada peça vira um nó com identificador próprio', function () {
  for (const partId of COLLIDING_PART_IDS) {
    const nodes = findPartNodes(this.graph, partId);
    assert.equal(nodes.length, 1, `esperava exatamente um nó para ${partId}`);
    assert.equal(nodes[0].properties.sourcePartId, SHARED_SOURCE_PART_ID);
  }
});

Then(
  'a peça {string} possui a propriedade {string} com valor {string}',
  function (partName, propertyName, expectedValue) {
    const part = this.graph.nodes.find(
      (node) => node.label === 'Part' && node.properties.name === partName,
    );
    assert.ok(part, `peça ${partName} não encontrada no grafo`);

    const property = this.graph.nodes.find(
      (node) =>
        node.label === 'Property' &&
        node.properties.partId === part.properties.partId &&
        node.properties.name === propertyName,
    );
    assert.ok(property, `propriedade ${propertyName} não encontrada para ${partName}`);
    assert.equal(property.properties.value, expectedValue);

    const linked = this.graph.relationships.some(
      (rel) =>
        rel.type === 'HAS_PROPERTY' &&
        rel.from.key.partId === part.properties.partId &&
        rel.to.key.partId === property.properties.partId &&
        rel.to.key.name === propertyName,
    );
    assert.ok(linked, `faltou HAS_PROPERTY entre ${partName} e ${propertyName}`);
  },
);

Then('o nó do documento contém a montagem raiz por CONTAINS', function () {
  const documentNode = this.graph.nodes.find((node) => node.label === 'Document');
  assert.equal(documentNode.properties.documentId, DOCUMENT_ID);
  assert.equal(documentNode.properties.name, 'Dumper Trailer');

  const containsRootAssembly = this.graph.relationships.some(
    (rel) =>
      rel.type === 'CONTAINS' &&
      rel.from.label === 'Document' &&
      rel.from.key.documentId === DOCUMENT_ID &&
      rel.to.label === 'Assembly' &&
      rel.to.key.elementId === ROOT_ASSEMBLY_ELEMENT_ID,
  );
  assert.ok(containsRootAssembly, 'faltou CONTAINS do documento para a montagem raiz');
});
