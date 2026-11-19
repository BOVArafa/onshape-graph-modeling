const assert = require('node:assert/strict');
const { When, Then } = require('@cucumber/cucumber');

When('abro o caminho {string}', async function (path) {
  this.response = await fetch(`${this.baseUrl}${path}`);
  this.responseText = await this.response.text();
});

Then('a resposta é um documento HTML', function () {
  assert.ok(this.response.headers.get('content-type').includes('text/html'));
  assert.ok(this.responseText.toLowerCase().startsWith('<!doctype html>'));
});

Then('a página contém o elemento com id {string}', function (elementId) {
  assert.ok(
    this.responseText.includes(`id="${elementId}"`),
    `elemento com id ${elementId} não encontrado na página`,
  );
});
