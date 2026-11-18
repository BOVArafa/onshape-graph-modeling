const { AssemblyGraphMapper } = require('./graphMapper');

function createDocumentMappingService({ onshapeClient, graphRepository }) {
  async function syncDocument(documentId) {
    const document = await onshapeClient.getDocument(documentId);
    const workspaceId = document.defaultWorkspace.id;
    const elementId = document.defaultElementId;

    const [assemblyDefinition, parts] = await Promise.all([
      onshapeClient.getAssemblyDefinition({ documentId, workspaceId, elementId }),
      onshapeClient.getParts({ documentId, workspaceId }),
    ]);

    const graph = new AssemblyGraphMapper().map({ document, assemblyDefinition, parts });
    await graphRepository.upsertDocumentGraph(graph);

    return {
      documentId,
      name: document.name,
      nodes: graph.nodes.length,
      relationships: graph.relationships.length,
    };
  }

  function getDocumentGraph(documentId) {
    return graphRepository.getDocumentGraph(documentId);
  }

  function deleteDocumentGraph(documentId) {
    return graphRepository.deleteDocumentGraph(documentId);
  }

  return { syncDocument, getDocumentGraph, deleteDocumentGraph };
}

module.exports = { createDocumentMappingService };
