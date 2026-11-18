const express = require('express');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const healthController = require('./controllers/healthController');
const { createMapController } = require('./controllers/mapController');
const { createDocumentMappingService } = require('./services/documentMappingService');
const { createApiKeyAuth } = require('./middleware/apiKeyAuth');
const { errorHandler } = require('./middleware/errorHandler');

const DEFAULT_RATE_LIMIT = { windowMs: 15 * 60 * 1000, limit: 100 };

function createApp({
  onshapeClient,
  graphRepository,
  apiKey,
  rateLimit: rateLimitOptions = DEFAULT_RATE_LIMIT,
} = {}) {
  const app = express();

  app.use(helmet());
  app.use(
    rateLimit({
      windowMs: rateLimitOptions.windowMs,
      limit: rateLimitOptions.limit,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'limite de requisições excedido' },
    }),
  );
  app.use(express.json());
  app.use(healthController);

  if (apiKey) {
    const requireApiKey = createApiKeyAuth(apiKey);
    app.post('/map/:documentId', requireApiKey);
    app.delete('/map/:documentId', requireApiKey);
  }

  if (onshapeClient && graphRepository) {
    const documentMappingService = createDocumentMappingService({ onshapeClient, graphRepository });
    app.use(createMapController(documentMappingService));
  }

  app.use(errorHandler);

  return app;
}

module.exports = createApp;
