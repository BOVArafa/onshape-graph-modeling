# language: pt
Funcionalidade: Mapeamento de assembly do Onshape para grafo
  Para persistir a estrutura real de um modelo 3D como um DAG
  Como camada de serviços da aplicação
  Quero transformar a resposta aninhada do assembly em nós e relacionamentos deduplicados

  Cenário: Peça reutilizada em múltiplas subassemblies vira um único nó
    Dado um assembly com uma peça reutilizada em duas subassemblies
    Quando executo o mapeamento
    Então a peça aparece como um único nó no resultado
    E possui um relacionamento CONTAINS a partir de cada subassembly

  Cenário: Restrição de montagem vira aresta transversal entre peças
    Dado um assembly com uma restrição de montagem entre duas peças
    Quando executo o mapeamento
    Então existe um relacionamento MATES_WITH entre os nós correspondentes

  Cenário: Peças distintas que compartilham partId não são fundidas
    Dado um assembly com duas peças distintas que compartilham o mesmo partId
    Quando executo o mapeamento
    Então cada peça vira um nó com identificador próprio

  Cenário: Metadados de engenharia viram nós Property
    Dado um assembly acompanhado da lista de peças do documento
    Quando executo o mapeamento
    Então a peça "Enclosure Cover" possui a propriedade "partNumber" com valor "PRT-00239"

  Cenário: O grafo parte do nó do documento
    Dado um assembly acompanhado da lista de peças do documento
    Quando executo o mapeamento
    Então o nó do documento contém a montagem raiz por CONTAINS
