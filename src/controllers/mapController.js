const express = require('express');

const DOCUMENT_ID_PATTERN = /^[0-9a-f]{24}$/;

function createMapController(documentMappingService) {
  const router = express.Router();

  router.param('documentId', (request, response, next, documentId) => {
    if (!DOCUMENT_ID_PATTERN.test(documentId)) {
      return response
        .status(400)
        .json({ error: 'documentId deve ter 24 caracteres hexadecimais minúsculos' });
    }
    return next();
  });

  router.post('/map/:documentId', async (request, response) => {
    const summary = await documentMappingService.syncDocument(request.params.documentId);
    response.status(200).json(summary);
  });

  router.get('/map/:documentId', async (request, response) => {
    const graph = await documentMappingService.getDocumentGraph(request.params.documentId);
    if (graph.nodes.length === 0) {
      return response.status(404).json({ error: 'documento não mapeado' });
    }
    return response.status(200).json(graph);
  });

  router.delete('/map/:documentId', async (request, response) => {
    await documentMappingService.deleteDocumentGraph(request.params.documentId);
    response.status(204).end();
  });

  return router;
}

module.exports = { createMapController };
