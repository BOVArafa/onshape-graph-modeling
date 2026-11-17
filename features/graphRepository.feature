# language: pt
@neo4j
Funcionalidade: Camada de dados do grafo no Neo4j
  Para manter o grafo persistido fiel ao modelo do Onshape
  Como camada de dados da aplicação
  Quero sincronizar, consultar e remover o grafo de um documento com Cypher parametrizado

  Cenário: Ressincronizar um documento não duplica o grafo e atualiza propriedades
    Dado um grafo de documento já persistido
    Quando executo a sincronização do mesmo documento novamente
    Então nenhum nó ou relacionamento é duplicado
    E as propriedades alteradas são atualizadas

  Cenário: Remover o grafo completo de um documento
    Dado um grafo de documento já persistido
    Quando removo o grafo do documento
    Então o banco não possui mais nós nem relacionamentos do documento
