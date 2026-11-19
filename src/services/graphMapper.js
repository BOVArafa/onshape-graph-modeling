const PART_PROPERTY_NAMES = ['material', 'partNumber', 'description', 'state'];
const INSTANCE_SUFFIX = / <\d+>$/;

function buildCompositePartId(instance) {
  return `${instance.elementId}/${instance.partId}`;
}

function stripInstanceSuffix(instanceName) {
  return instanceName.replace(INSTANCE_SUFFIX, '');
}

function toNodeRef(node, keyProperties) {
  const key = {};
  for (const property of keyProperties) {
    key[property] = node.properties[property];
  }
  return { label: node.label, key };
}

const NODE_KEY_PROPERTIES = {
  Document: ['documentId'],
  Assembly: ['elementId'],
  Part: ['partId'],
  Property: ['partId', 'name'],
};

class AssemblyGraphMapper {
  #documentNode;
  #linkedDocumentsById;
  #assembliesByElementId;
  #partsById;
  #propertyNodes;
  #relationships;
  #relationshipKeys;
  #subAssembliesByElementId;
  #instancesById;
  #partsCatalog;

  map({ document, assemblyDefinition, parts = [] }) {
    this.#resetTraversalState(assemblyDefinition, parts);

    this.#documentNode = {
      label: 'Document',
      properties: { documentId: document.id, name: document.name },
    };
    const rootAssembly = assemblyDefinition.rootAssembly;
    const rootAssemblyNode = this.#addAssemblyNode(rootAssembly.elementId, document.name);
    this.#addRelationship('CONTAINS', this.#documentNode, rootAssemblyNode);

    this.#traverseAssembly(rootAssembly);
    this.#mapMates([rootAssembly, ...this.#subAssembliesByElementId.values()]);

    return {
      nodes: [
        this.#documentNode,
        ...this.#linkedDocumentsById.values(),
        ...this.#assembliesByElementId.values(),
        ...this.#partsById.values(),
        ...this.#propertyNodes,
      ],
      relationships: this.#relationships,
    };
  }

  #resetTraversalState(assemblyDefinition, parts) {
    const subAssemblies = assemblyDefinition.subAssemblies ?? [];
    const allAssemblies = [assemblyDefinition.rootAssembly, ...subAssemblies];

    this.#subAssembliesByElementId = new Map(
      subAssemblies.map((subAssembly) => [subAssembly.elementId, subAssembly]),
    );
    this.#instancesById = new Map(
      allAssemblies.flatMap((assembly) => assembly.instances).map((instance) => [instance.id, instance]),
    );
    this.#partsCatalog = new Map(parts.map((part) => [buildCompositePartId(part), part]));
    this.#linkedDocumentsById = new Map();
    this.#assembliesByElementId = new Map();
    this.#partsById = new Map();
    this.#propertyNodes = [];
    this.#relationships = [];
    this.#relationshipKeys = new Set();
  }

  #traverseAssembly(assemblyDefinition) {
    const assemblyNode = this.#assembliesByElementId.get(assemblyDefinition.elementId);

    for (const instance of assemblyDefinition.instances) {
      if (instance.suppressed) {
        continue;
      }
      this.#registerExternalDocument(instance);
      if (instance.type === 'Part') {
        const partNode = this.#addPartNode(instance);
        this.#addRelationship('CONTAINS', assemblyNode, partNode);
      }
      if (instance.type === 'Assembly') {
        const alreadyTraversed = this.#assembliesByElementId.has(instance.elementId);
        const subAssemblyNode = this.#addAssemblyNode(
          instance.elementId,
          stripInstanceSuffix(instance.name),
        );
        this.#addRelationship('CONTAINS', assemblyNode, subAssemblyNode);

        const definition = this.#subAssembliesByElementId.get(instance.elementId);
        if (definition && !alreadyTraversed) {
          this.#traverseAssembly(definition);
        }
      }
    }
  }

  #registerExternalDocument(instance) {
    const externalDocumentId = instance.documentId;
    if (!externalDocumentId || externalDocumentId === this.#documentNode.properties.documentId) {
      return;
    }
    if (this.#linkedDocumentsById.has(externalDocumentId)) {
      return;
    }
    const externalDocumentNode = {
      label: 'Document',
      properties: { documentId: externalDocumentId },
    };
    this.#linkedDocumentsById.set(externalDocumentId, externalDocumentNode);
    this.#addRelationship('LINKS_TO', this.#documentNode, externalDocumentNode);
  }

  #addAssemblyNode(elementId, name) {
    if (!this.#assembliesByElementId.has(elementId)) {
      this.#assembliesByElementId.set(elementId, {
        label: 'Assembly',
        properties: { elementId, name },
      });
    }
    return this.#assembliesByElementId.get(elementId);
  }

  #addPartNode(instance) {
    const partId = buildCompositePartId(instance);
    if (this.#partsById.has(partId)) {
      return this.#partsById.get(partId);
    }

    const catalogEntry = this.#partsCatalog.get(partId);
    const partNode = {
      label: 'Part',
      properties: {
        partId,
        elementId: instance.elementId,
        sourcePartId: instance.partId,
        name: catalogEntry?.name ?? stripInstanceSuffix(instance.name),
      },
    };
    this.#partsById.set(partId, partNode);

    if (catalogEntry) {
      this.#addPartProperties(partNode, catalogEntry);
    }
    return partNode;
  }

  #addPartProperties(partNode, catalogEntry) {
    for (const name of PART_PROPERTY_NAMES) {
      const value = name === 'material' ? catalogEntry.material?.displayName : catalogEntry[name];
      if (!value) {
        continue;
      }
      const propertyNode = {
        label: 'Property',
        properties: { partId: partNode.properties.partId, name, value },
      };
      this.#propertyNodes.push(propertyNode);
      this.#addRelationship('HAS_PROPERTY', partNode, propertyNode);
    }
  }

  #mapMates(assemblies) {
    for (const assembly of assemblies) {
      for (const feature of assembly.features ?? []) {
        if (feature.featureType !== 'mate' || feature.suppressed) {
          continue;
        }
        const matedParts = (feature.featureData.matedEntities ?? [])
          .map((entity) => this.#resolveMatedPart(entity))
          .filter((part) => part !== undefined);

        for (let first = 0; first < matedParts.length; first += 1) {
          for (let second = first + 1; second < matedParts.length; second += 1) {
            if (matedParts[first] !== matedParts[second]) {
              this.#addRelationship('MATES_WITH', matedParts[first], matedParts[second]);
            }
          }
        }
      }
    }
  }

  #resolveMatedPart(matedEntity) {
    const occurrencePath = matedEntity.matedOccurrence ?? [];
    const instanceId = occurrencePath[occurrencePath.length - 1];
    const instance = this.#instancesById.get(instanceId);
    if (!instance || instance.type !== 'Part') {
      return undefined;
    }
    return this.#partsById.get(buildCompositePartId(instance));
  }

  #addRelationship(type, fromNode, toNode) {
    const from = toNodeRef(fromNode, NODE_KEY_PROPERTIES[fromNode.label]);
    const to = toNodeRef(toNode, NODE_KEY_PROPERTIES[toNode.label]);
    const relationshipKey = `${type}|${JSON.stringify(from)}|${JSON.stringify(to)}`;
    if (this.#relationshipKeys.has(relationshipKey)) {
      return;
    }
    this.#relationshipKeys.add(relationshipKey);
    this.#relationships.push({ type, from, to });
  }
}

module.exports = { AssemblyGraphMapper };
