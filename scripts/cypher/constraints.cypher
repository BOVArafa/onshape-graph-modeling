CREATE CONSTRAINT document_documentId_unique IF NOT EXISTS
FOR (d:Document) REQUIRE d.documentId IS UNIQUE;

CREATE CONSTRAINT assembly_elementId_unique IF NOT EXISTS
FOR (a:Assembly) REQUIRE a.elementId IS UNIQUE;

CREATE CONSTRAINT part_partId_unique IF NOT EXISTS
FOR (p:Part) REQUIRE p.partId IS UNIQUE;

CREATE CONSTRAINT property_partId_name_unique IF NOT EXISTS
FOR (p:Property) REQUIRE (p.partId, p.name) IS UNIQUE;
