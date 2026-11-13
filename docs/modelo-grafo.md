# Modelo de grafo

A estrutura de um modelo 3D do Onshape é persistida no Neo4j como um **DAG** (grafo acíclico
dirigido), não como uma árvore: peças reutilizadas em múltiplas subassemblies viram um único
nó deduplicado, e as restrições de montagem (*mates*) criam arestas transversais entre peças.

## Nós e chaves de deduplicação

Cada tipo de nó possui uma chave natural vinda da API do Onshape. A sincronização
(`MERGE`, a partir da DB-007) usa essas chaves para que reexecuções nunca dupliquem nós.

| Label      | Descrição                                        | Chave de deduplicação |
| ---------- | ------------------------------------------------ | --------------------- |
| `Document` | Projeto/modelo 3D no Onshape                     | `documentId`          |
| `Assembly` | Estrutura que organiza os componentes            | `elementId`           |
| `Part`     | Componente individual da montagem                | `partId`              |
| `Property` | Metadado técnico/engenharia associado a uma peça | `(partId, name)`      |

A chave de `Property` é composta: o mesmo nome de propriedade (ex.: `partNumber`) existe
para várias peças, e cada peça tem várias propriedades — só o par identifica o nó.

## Relacionamentos

| Tipo           | Origem → Destino                  | Semântica                                         |
| -------------- | --------------------------------- | ------------------------------------------------- |
| `CONTAINS`     | Document/Assembly → Assembly/Part | Hierarquia de contenção                           |
| `HAS_PROPERTY` | Part → Property                   | Metadados da peça                                 |
| `LINKS_TO`     | Document → Document               | Referências entre documentos                      |
| `MATES_WITH`   | Part → Part                       | Restrição de montagem (aresta transversal do DAG) |

## Constraints de unicidade

O script [`scripts/cypher/constraints.cypher`](../scripts/cypher/constraints.cypher) cria uma
constraint de unicidade por chave de deduplicação. No Neo4j 5, cada constraint de unicidade
cria automaticamente o índice correspondente — não há scripts de índice separados.

Todas as declarações usam `IF NOT EXISTS`, portanto o script é idempotente (pode ser
reexecutado sem erro), mesma propriedade que a sincronização via `MERGE` terá.

Execução em uma instância limpa (serviço `neo4j` do `docker-compose.yml`):

```bash
docker compose up -d neo4j
docker compose exec -T neo4j cypher-shell -u "$NEO4J_USER" -p "$NEO4J_PASSWORD" \
  < scripts/cypher/constraints.cypher
```

Verificação:

```cypher
SHOW CONSTRAINTS;
```

## Diagrama ER (Figura 4 do memorial)

O modelo foi desenhado no **Neo4j Data Importer**; a fonte do diagrama está versionada em
[`docs/neo4j_importer_model.json`](./neo4j_importer_model.json). Para abri-la: Import →
painel do modelo → menu `…` → *Open model* → selecionar o arquivo. A captura do diagrama
é versionada em `docs/figuras/figura-04-diagrama-er.png`.
