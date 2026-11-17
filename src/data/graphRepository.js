const { withSession } = require('./neo4jDriver');

const NODE_KEYS = {
  Document: ['documentId'],
  Assembly: ['elementId'],
  Part: ['partId'],
  Property: ['partId', 'name'],
};

const RELATIONSHIP_TYPES = ['CONTAINS', 'HAS_PROPERTY', 'LINKS_TO', 'MATES_WITH'];

const DOCUMENT_SUBGRAPH_NODES_QUERY = `
  MATCH (:Document {documentId: $documentId})-[:CONTAINS|HAS_PROPERTY*0..]->(node)
  RETURN DISTINCT labels(node)[0] AS label, properties(node) AS properties
`;

const DOCUMENT_SUBGRAPH_RELATIONSHIPS_QUERY = `
  MATCH (document:Document {documentId: $documentId})-[:CONTAINS|HAS_PROPERTY*0..]->(from)
  MATCH (document)-[:CONTAINS|HAS_PROPERTY*0..]->(to)
  MATCH (from)-[relationship]->(to)
  RETURN DISTINCT type(relationship) AS type,
    labels(from)[0] AS fromLabel, properties(from) AS fromProperties,
    labels(to)[0] AS toLabel, properties(to) AS toProperties
`;

const DELETE_DOCUMENT_SUBGRAPH_QUERY = `
  MATCH (:Document {documentId: $documentId})-[:CONTAINS|HAS_PROPERTY*0..]->(node)
  DETACH DELETE node
`;

function requireKnownLabel(label) {
  if (!NODE_KEYS[label]) {
    throw new Error(`Label de nó fora do modelo de grafo: ${label}`);
  }
}

function requireKnownRelationshipType(type) {
  if (!RELATIONSHIP_TYPES.includes(type)) {
    throw new Error(`Tipo de relacionamento fora do modelo de grafo: ${type}`);
  }
}

function buildKeyPattern(label, parameterName) {
  return NODE_KEYS[label]
    .map((property) => `${property}: $${parameterName}.${property}`)
    .join(', ');
}

function buildMergeNodeQuery(label) {
  requireKnownLabel(label);
  return `MERGE (node:${label} {${buildKeyPattern(label, 'key')}}) SET node += $properties`;
}

function buildMergeRelationshipQuery({ type, from, to }) {
  requireKnownRelationshipType(type);
  requireKnownLabel(from.label);
  requireKnownLabel(to.label);
  return [
    `MATCH (from:${from.label} {${buildKeyPattern(from.label, 'fromKey')}})`,
    `MATCH (to:${to.label} {${buildKeyPattern(to.label, 'toKey')}})`,
    `MERGE (from)-[:${type}]->(to)`,
  ].join('\n');
}

function pickNodeKey(label, properties) {
  const key = {};
  for (const property of NODE_KEYS[label]) {
    key[property] = properties[property];
  }
  return key;
}

function toNode(record) {
  return { label: record.get('label'), properties: record.get('properties') };
}

function toRelationship(record) {
  const fromLabel = record.get('fromLabel');
  const toLabel = record.get('toLabel');
  return {
    type: record.get('type'),
    from: { label: fromLabel, key: pickNodeKey(fromLabel, record.get('fromProperties')) },
    to: { label: toLabel, key: pickNodeKey(toLabel, record.get('toProperties')) },
  };
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

  function getDocumentGraph(documentId) {
    return withSession(driver, (session) =>
      session.executeRead(async (transaction) => {
        const nodesResult = await transaction.run(DOCUMENT_SUBGRAPH_NODES_QUERY, { documentId });
        const relationshipsResult = await transaction.run(DOCUMENT_SUBGRAPH_RELATIONSHIPS_QUERY, {
          documentId,
        });
        return {
          nodes: nodesResult.records.map(toNode),
          relationships: relationshipsResult.records.map(toRelationship),
        };
      }),
    );
  }

  function deleteDocumentGraph(documentId) {
    return withSession(driver, (session) =>
      session.executeWrite((transaction) =>
        transaction.run(DELETE_DOCUMENT_SUBGRAPH_QUERY, { documentId }),
      ),
    );
  }

  return { upsertDocumentGraph, getDocumentGraph, deleteDocumentGraph };
}

module.exports = { createGraphRepository };
