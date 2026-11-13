const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Given, When, Then } = require('@cucumber/cucumber');
const { createOnshapeClient } = require('../../src/services/onshapeClient');

const FIXTURES_DIR = path.join(__dirname, '..', '..', 'fixtures', 'onshape');
const FAKE_IDS = { documentId: 'document-id', workspaceId: 'workspace-id', elementId: 'element-id' };
const FAKE_KEYS = { accessKey: 'access-key-de-teste', secretKey: 'secret-key-de-teste' };

Given('que a API do Onshape responderá com a fixture {string}', function (fixtureName) {
  const body = fs.readFileSync(path.join(FIXTURES_DIR, fixtureName), 'utf8');
  this.client = createOnshapeClient({
    ...FAKE_KEYS,
    fetchImplementation: async () => new Response(body, { status: 200 }),
  });
});

Given('que a API do Onshape responderá com o status {int}', function (status) {
  this.client = createOnshapeClient({
    ...FAKE_KEYS,
    fetchImplementation: async () => new Response('', { status }),
  });
});

When('solicito a definição do assembly', async function () {
  try {
    this.assemblyDefinition = await this.client.getAssemblyDefinition(FAKE_IDS);
  } catch (error) {
    this.error = error;
  }
});

When('solicito os dados do documento', async function () {
  this.document = await this.client.getDocument(FAKE_IDS.documentId);
});

When('solicito as peças do documento', async function () {
  this.parts = await this.client.getParts(FAKE_IDS);
});

Then('a definição contém {int} subassemblies e {int} peças', function (subAssemblyCount, partCount) {
  assert.equal(this.assemblyDefinition.subAssemblies.length, subAssemblyCount);
  assert.equal(this.assemblyDefinition.parts.length, partCount);
});

Then('a definição contém pelo menos um mate', function () {
  const mates = this.assemblyDefinition.rootAssembly.features.filter(
    (feature) => feature.featureType === 'mate',
  );
  assert.ok(mates.length > 0);
});

Then('existe uma peça utilizada em mais de um conjunto', function () {
  const containersByPartId = new Map();
  const register = (containerId, instances) => {
    for (const instance of instances) {
      if (instance.type !== 'Part') {
        continue;
      }
      if (!containersByPartId.has(instance.partId)) {
        containersByPartId.set(instance.partId, new Set());
      }
      containersByPartId.get(instance.partId).add(containerId);
    }
  };

  register('root', this.assemblyDefinition.rootAssembly.instances);
  for (const subAssembly of this.assemblyDefinition.subAssemblies) {
    register(subAssembly.elementId, subAssembly.instances);
  }

  const reusedParts = [...containersByPartId.values()].filter((containers) => containers.size > 1);
  assert.ok(reusedParts.length > 0);
});

Then('o documento se chama {string}', function (expectedName) {
  assert.equal(this.document.name, expectedName);
});

Then('recebo uma lista de peças onde cada uma possui identificador e nome', function () {
  assert.ok(this.parts.length > 0);
  for (const part of this.parts) {
    assert.ok(part.partId);
    assert.ok(part.name);
  }
});

Then('o cliente lança um erro que contém {string}', function (expectedFragment) {
  assert.ok(this.error);
  assert.ok(this.error.message.includes(expectedFragment));
});

Then('a mensagem de erro não contém credenciais', function () {
  assert.ok(!this.error.message.includes(FAKE_KEYS.accessKey));
  assert.ok(!this.error.message.includes(FAKE_KEYS.secretKey));
});
