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
}
