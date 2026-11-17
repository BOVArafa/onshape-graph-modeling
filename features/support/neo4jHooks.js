const fs = require('node:fs');
const path = require('node:path');
const { Before, After, AfterAll } = require('@cucumber/cucumber');
const { Neo4jContainer } = require('@testcontainers/neo4j');
const { createNeo4jDriver, withSession } = require('../../src/data/neo4jDriver');

const NEO4J_IMAGE = 'neo4j:5.26';
const CONTAINER_START_TIMEOUT_MS = 180000;
const CONTAINER_STOP_TIMEOUT_MS = 30000;
const CONSTRAINTS_SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'cypher', 'constraints.cypher');

let container;

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

Before({ tags: '@neo4j', timeout: CONTAINER_START_TIMEOUT_MS }, async function () {
  if (!container) {
    container = await new Neo4jContainer(NEO4J_IMAGE).start();
  }
  this.driver = createNeo4jDriver({
    uri: container.getBoltUri(),
    user: container.getUsername(),
    password: container.getPassword(),
  });
  await applyConstraints(this.driver);
});

After({ tags: '@neo4j' }, async function () {
  if (!this.driver) {
    return;
  }
  await withSession(this.driver, (session) => session.run('MATCH (node) DETACH DELETE node'));
  await this.driver.close();
});

AfterAll({ timeout: CONTAINER_STOP_TIMEOUT_MS }, async function () {
  if (container) {
    await container.stop();
  }
});
