const express = require('express');
const healthController = require('./controllers/healthController');

function createApp() {
  const app = express();

  app.use(express.json());
  app.use(healthController);

  return app;
}

module.exports = createApp;
