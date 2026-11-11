const assert = require('node:assert/strict');
const { once } = require('node:events');
const { Given, When, Then } = require('@cucumber/cucumber');
const createApp = require('../../src/app');

Given('que o servidor foi iniciado', async function () {
  this.server = createApp().listen(0);
  await once(this.server, 'listening');
  this.baseUrl = `http://localhost:${this.server.address().port}`;
});

When('eu faço uma requisição GET para {string}', async function (path) {
  this.response = await fetch(`${this.baseUrl}${path}`);
  this.responseBody = await this.response.json();
});

Then('recebo o status {int}', function (expectedStatus) {
  assert.equal(this.response.status, expectedStatus);
});

Then('o corpo da resposta contém o status {string}', function (expectedValue) {
  assert.equal(this.responseBody.status, expectedValue);
});
