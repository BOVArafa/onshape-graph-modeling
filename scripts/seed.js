const fs = require('node:fs');
const path = require('node:path');
const { AssemblyGraphMapper } = require('../src/services/graphMapper');
const { createNeo4jDriver, withSession } = require('../src/data/neo4jDriver');
const { createGraphRepository } = require('../src/data/graphRepository');

const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures', 'onshape');
const CONSTRAINTS_SCRIPT = path.join(__dirname, 'cypher', 'constraints.cypher');
const DEMO_DOCUMENT_ID = '492ae2574a348180fabf6fff';

function loadFixture(fileName) {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, fileName), 'utf8'));
}

function buildDemoGraph() {
  return new AssemblyGraphMapper().map({
    document: loadFixture('document-dumper-trailer.json'),
    assemblyDefinition: loadFixture('assembly-trailer-full.json'),
    parts: loadFixture('parts-dumper-trailer.json'),
  });
}

async function applyConstraints(driver) {
  const statements = fs
    .readFileSync(CONSTRAINTS_SCRIPT, 'utf8')
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);

  await withSession(driver, async (session) => {
    for (const statement of statements) {
      await session.run(statement);
    }
  });
}

async function runSeed(driver) {
  await applyConstraints(driver);
  const graph = buildDemoGraph();
  await createGraphRepository(driver).upsertDocumentGraph(graph);
  return graph;
}

module.exports = { runSeed };

if (require.main === module) {
  require('dotenv').config();
  const port = process.env.PORT || 3000;
  const driver = createNeo4jDriver();

  runSeed(driver)
    .then((graph) => {
      console.log(
        `Modelo "Dumper Trailer" carregado: ${graph.nodes.length} nós e ${graph.relationships.length} relacionamentos.`,
      );
      console.log(`Visualize em http://localhost:${port} (documentId ${DEMO_DOCUMENT_ID}).`);
    })
    .catch((error) => {
      console.error(`Falha no seed: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(() => driver.close());
}
