const NODE_KEY_PROPERTIES = {
  Document: ['documentId'],
  Assembly: ['elementId'],
  Part: ['partId'],
  Property: ['partId', 'name'],
};

const NODE_GROUPS = {
  Document: { color: '#f2a93b', shape: 'star', size: 30 },
  Assembly: { color: '#4f8fde', shape: 'box' },
  Part: { color: '#4fab62', shape: 'dot', size: 14 },
  Property: { color: '#a877c9', shape: 'diamond', size: 10 },
};

const NETWORK_OPTIONS = {
  groups: NODE_GROUPS,
  edges: {
    arrows: 'to',
    font: { size: 9, align: 'middle', color: '#57606a' },
    color: { color: '#9aa6b2', highlight: '#22303c' },
  },
  physics: {
    stabilization: { iterations: 200 },
    barnesHut: { springLength: 120 },
  },
  interaction: { hover: true },
};

const statusMessage = document.getElementById('status-message');
const graphContainer = document.getElementById('graph-container');

let network = null;
let visNodes = null;
let graphNodesById = new Map();
let neighborsByNodeId = new Map();

function nodeIdOf(label, keySource) {
  const keyValues = NODE_KEY_PROPERTIES[label].map((property) => keySource[property]);
  return [label, ...keyValues].join('|');
}

function displayNameOf(node) {
  if (node.label === 'Property') {
    return `${node.properties.name}: ${node.properties.value}`;
  }
  return (
    node.properties.name ??
    node.properties.partId ??
    node.properties.elementId ??
    node.properties.documentId
  );
}

function buildTooltip(node) {
  const tooltip = document.createElement('div');
  const title = document.createElement('strong');
  title.textContent = node.label;
  tooltip.appendChild(title);
  for (const [property, value] of Object.entries(node.properties)) {
    const line = document.createElement('div');
    line.textContent = `${property}: ${value}`;
    tooltip.appendChild(line);
  }
  return tooltip;
}

function setStatus(message) {
  statusMessage.textContent = message;
}

function registerNeighbor(nodeId, neighborId, relationshipType) {
  if (!neighborsByNodeId.has(nodeId)) {
    neighborsByNodeId.set(nodeId, []);
  }
  neighborsByNodeId.get(nodeId).push({ neighborId, relationshipType });
}

function renderGraph(graph) {
  graphNodesById = new Map();
  neighborsByNodeId = new Map();

  const nodes = graph.nodes.map((node) => {
    const id = nodeIdOf(node.label, node.properties);
    graphNodesById.set(id, node);
    return {
      id,
      label: displayNameOf(node),
      group: node.label,
      title: buildTooltip(node),
    };
  });

  const edges = graph.relationships.map((relationship, index) => {
    const from = nodeIdOf(relationship.from.label, relationship.from.key);
    const to = nodeIdOf(relationship.to.label, relationship.to.key);
    registerNeighbor(from, to, relationship.type);
    registerNeighbor(to, from, relationship.type);
    return { id: index, from, to, label: relationship.type };
  });

  visNodes = new vis.DataSet(nodes);
  network = new vis.Network(
    graphContainer,
    { nodes: visNodes, edges: new vis.DataSet(edges) },
    NETWORK_OPTIONS,
  );
  network.on('click', showNodeDetails);
  clearDetails();
}

async function loadGraph(event) {
  event.preventDefault();
  const documentId = document.getElementById('document-id-input').value.trim();
  setStatus('carregando…');

  const response = await fetch(`/map/${documentId}`);
  if (!response.ok) {
    const body = await response.json();
    setStatus(body.error);
    return;
  }

  const graph = await response.json();
  renderGraph(graph);
  setStatus(`${graph.nodes.length} nós e ${graph.relationships.length} relacionamentos`);
}

function searchNodes(event) {
  event.preventDefault();
  if (!network) {
    return;
  }
  const query = document.getElementById('search-input').value.trim().toLowerCase();
  if (query === '') {
    return;
  }

  const matchingIds = [];
  for (const [id, node] of graphNodesById) {
    const name = String(displayNameOf(node)).toLowerCase();
    if (name.includes(query) || id.toLowerCase().includes(query)) {
      matchingIds.push(id);
    }
  }

  if (matchingIds.length === 0) {
    setStatus(`nenhum nó encontrado para "${query}"`);
    return;
  }

  network.selectNodes(matchingIds);
  network.focus(matchingIds[0], { scale: 1.2, animation: true });
  setStatus(`${matchingIds.length} nó(s) encontrado(s)`);
  renderDetails(matchingIds[0]);
}

function applyTypeFilters() {
  if (!visNodes) {
    return;
  }
  const checkboxes = document.querySelectorAll('#node-type-filters input[type="checkbox"]');
  const visibility = {};
  for (const checkbox of checkboxes) {
    visibility[checkbox.value] = checkbox.checked;
  }
  visNodes.update(
    visNodes.map((node) => ({ id: node.id, hidden: !visibility[node.group] })),
  );
}

function clearDetails() {
  document.getElementById('details-placeholder').hidden = false;
  document.getElementById('details-properties').replaceChildren();
  document.getElementById('details-neighbors').replaceChildren();
}

function renderDetails(nodeId) {
  const node = graphNodesById.get(nodeId);
  document.getElementById('details-placeholder').hidden = true;

  const propertiesList = document.getElementById('details-properties');
  propertiesList.replaceChildren();
  const labelTerm = document.createElement('dt');
  labelTerm.textContent = 'label';
  const labelValue = document.createElement('dd');
  labelValue.textContent = node.label;
  propertiesList.append(labelTerm, labelValue);
  for (const [property, value] of Object.entries(node.properties)) {
    const term = document.createElement('dt');
    term.textContent = property;
    const definition = document.createElement('dd');
    definition.textContent = value;
    propertiesList.append(term, definition);
  }

  const neighborsList = document.getElementById('details-neighbors');
  neighborsList.replaceChildren();
  for (const { neighborId, relationshipType } of neighborsByNodeId.get(nodeId) ?? []) {
    const neighbor = graphNodesById.get(neighborId);
    const item = document.createElement('li');
    item.textContent = `${relationshipType} → ${neighbor.label} ${displayNameOf(neighbor)}`;
    neighborsList.appendChild(item);
  }
}

function showNodeDetails(clickEvent) {
  if (clickEvent.nodes.length === 0) {
    clearDetails();
    return;
  }
  renderDetails(clickEvent.nodes[0]);
}

document.getElementById('load-form').addEventListener('submit', loadGraph);
document.getElementById('search-form').addEventListener('submit', searchNodes);
document.getElementById('node-type-filters').addEventListener('change', applyTypeFilters);
