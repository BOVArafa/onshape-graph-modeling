const assert = require('node:assert/strict');
const { Given, When, Then } = require('@cucumber/cucumber');
const { buildAuthHeaders } = require('../../src/services/onshapeAuth');

Given('que possuo uma access key {string} e uma secret key {string}', function (accessKey, secretKey) {
  this.credentials = { accessKey, secretKey };
});

Given('que o nonce é {string} e a data é {string}', function (nonce, date) {
  this.nonce = nonce;
  this.date = date;
});

When('gero a assinatura para uma requisição GET ao endpoint {string}', function (url) {
  this.headers = buildAuthHeaders({
    method: 'GET',
    url,
    nonce: this.nonce,
    date: this.date,
    accessKey: this.credentials.accessKey,
    secretKey: this.credentials.secretKey,
  });
});

Then('o header Authorization começa com {string}', function (expectedPrefix) {
  assert.ok(this.headers.Authorization.startsWith(expectedPrefix));
});

Then('a assinatura corresponde ao vetor conhecido {string}', function (expectedSignature) {
  const signature = this.headers.Authorization.split(':').pop();
  assert.equal(signature, expectedSignature);
});
