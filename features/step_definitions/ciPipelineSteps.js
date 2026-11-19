const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Given, Then } = require('@cucumber/cucumber');

const CI_WORKFLOW = path.join(__dirname, '..', '..', '.github', 'workflows', 'ci.yml');

Given('o workflow de CI do projeto', function () {
  this.workflow = fs.readFileSync(CI_WORKFLOW, 'utf8');
});

Then('ele é disparado no evento {string}', function (eventName) {
  assert.match(this.workflow, new RegExp(`^on:\\s*\\n\\s+${eventName}:`, 'm'));
});

Then('ele executa o passo {string}', function (command) {
  assert.ok(this.workflow.includes(`run: ${command}`), `passo "${command}" ausente do workflow`);
});

Then('ele gera o relatório HTML sem reexecutar a suíte', function () {
  assert.ok(this.workflow.includes('run: node scripts/generateTestReport.js'));
  const cucumberRuns = this.workflow.match(/test:coverage|npm test|cucumber-js/g) ?? [];
  assert.equal(cucumberRuns.length, 1, 'a suíte deve executar exatamente uma vez no workflow');
});

Then(
  'ele publica os diretórios {string} e {string} como artefatos mesmo em caso de falha',
  function (firstDirectory, secondDirectory) {
    assert.ok(this.workflow.includes('actions/upload-artifact'));
    assert.ok(this.workflow.includes('if: always()'));
    assert.ok(this.workflow.includes(`${firstDirectory}/`));
    assert.ok(this.workflow.includes(`${secondDirectory}/`));
  },
);
