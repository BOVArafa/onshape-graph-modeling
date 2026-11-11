const { After } = require('@cucumber/cucumber');

After(function () {
  if (this.server) {
    this.server.close();
  }
});
