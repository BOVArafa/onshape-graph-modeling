const express = require('express');
const healthController = require('./controllers/healthController');
const { createMapController } = require('./controllers/mapController');
const { createDocumentMappingService } = require('./services/documentMappingService');
const { errorHandler } = require('./middleware/errorHandler');

function createApp({ onshapeClient, graphRepository } = {}) {
  const app = express();

  app.use(express.json());
  app.use(healthController);

  if (onshapeClient && graphRepository) {
    const documentMappingService = createDocumentMappingService({ onshapeClient, graphRepository });
    app.use(createMapController(documentMappingService));
  }

  app.use(errorHandler);

  return app;
}

module.exports = createApp;
