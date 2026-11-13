const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Given, Then } = require('@cucumber/cucumber');

const CONSTRAINTS_SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'cypher', 'constraints.cypher');

Given('o script Cypher de constraints do projeto', function () {
  const script = fs.readFileSync(CONSTRAINTS_SCRIPT, 'utf8');
  this.statements = script
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
});

Then('existe uma constraint de unicidade para o nó {string} na chave {string}', function (label, key) {
  const statement = this.statements.find((candidate) => candidate.includes(`:${label})`));
  assert.ok(statement, `nenhuma constraint declarada para o nó ${label}`);
  assert.ok(statement.includes('IS UNIQUE'), `a constraint de ${label} não é de unicidade`);

  const keyProperties = key.split(',').map((property) => property.trim());
  for (const property of keyProperties) {
    const referencesProperty = new RegExp(`\\.${property}\\b`);
    assert.ok(referencesProperty.test(statement), `a constraint de ${label} não cobre a chave ${property}`);
  }
});

Then('toda constraint é declarada com {string}', function (requiredClause) {
  assert.ok(this.statements.length > 0);
  for (const statement of this.statements) {
    assert.ok(statement.includes(requiredClause), `constraint sem ${requiredClause}: ${statement}`);
  }
});
