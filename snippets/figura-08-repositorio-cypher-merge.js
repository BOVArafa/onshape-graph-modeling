const NODE_KEYS = {
  Document: ['documentId'],
  Assembly: ['elementId'],
  Part: ['partId'],
  Property: ['partId', 'name'],
};

function buildKeyPattern(label, parameterName) {
  return NODE_KEYS[label]
    .map((property) => `${property}: $${parameterName}.${property}`)
    .join(', ');
}

function buildMergeNodeQuery(label) {
  requireKnownLabel(label);
  return `MERGE (node:${label} {${buildKeyPattern(label, 'key')}}) SET node += $properties`;
}

function createGraphRepository(driver) {
  function upsertDocumentGraph(graph) {
    return withSession(driver, (session) =>
      session.executeWrite(async (transaction) => {
        for (const node of graph.nodes) {
          await transaction.run(buildMergeNodeQuery(node.label), {
            key: pickNodeKey(node.label, node.properties),
            properties: node.properties,
          });
        }
        for (const relationship of graph.relationships) {
          await transaction.run(buildMergeRelationshipQuery(relationship), {
            fromKey: relationship.from.key,
            toKey: relationship.to.key,
          });
        }
      }),
    );
  }

  return { upsertDocumentGraph, getDocumentGraph, deleteDocumentGraph };
}
