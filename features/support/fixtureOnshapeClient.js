const fs = require('node:fs');
const path = require('node:path');

const FIXTURES_DIR = path.join(__dirname, '..', '..', 'fixtures', 'onshape');

function loadFixture(fileName) {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, fileName), 'utf8'));
}

function createFixtureOnshapeClient() {
  return {
    getDocument() {
      return Promise.resolve(loadFixture('document-dumper-trailer.json'));
    },
    getAssemblyDefinition() {
      return Promise.resolve(loadFixture('assembly-trailer-full.json'));
    },
    getParts() {
      return Promise.resolve(loadFixture('parts-dumper-trailer.json'));
    },
  };
}

module.exports = { createFixtureOnshapeClient };
