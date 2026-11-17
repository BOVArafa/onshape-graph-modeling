const neo4j = require('neo4j-driver');

function createNeo4jDriver({
  uri = process.env.NEO4J_URI,
  user = process.env.NEO4J_USER,
  password = process.env.NEO4J_PASSWORD,
} = {}) {
  return neo4j.driver(uri, neo4j.auth.basic(user, password), { disableLosslessIntegers: true });
}

async function withSession(driver, work) {
  const session = driver.session();
  try {
    return await work(session);
  } finally {
    await session.close();
  }
}

module.exports = { createNeo4jDriver, withSession };
