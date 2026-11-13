const { buildAuthHeaders } = require('./onshapeAuth');

const DEFAULT_BASE_URL = 'https://cad.onshape.com';

function createOnshapeClient({
  baseUrl = DEFAULT_BASE_URL,
  accessKey = process.env.ONSHAPE_ACCESS_KEY,
  secretKey = process.env.ONSHAPE_SECRET_KEY,
  fetchImplementation = fetch,
} = {}) {
  async function getJson(path) {
    const url = `${baseUrl}${path}`;
    const headers = buildAuthHeaders({ method: 'GET', url, accessKey, secretKey });
    const response = await fetchImplementation(url, { headers });

    if (!response.ok) {
      throw new Error(`Onshape API respondeu ${response.status} em GET ${new URL(url).pathname}`);
    }
    return response.json();
  }

  return {
    getDocument(documentId) {
      return getJson(`/api/documents/${documentId}`);
    },
    getAssemblyDefinition({ documentId, workspaceId, elementId }) {
      return getJson(
        `/api/assemblies/d/${documentId}/w/${workspaceId}/e/${elementId}?includeMateFeatures=true`,
      );
    },
    getParts({ documentId, workspaceId }) {
      return getJson(`/api/parts/d/${documentId}/w/${workspaceId}`);
    },
  };
}

module.exports = { createOnshapeClient };
