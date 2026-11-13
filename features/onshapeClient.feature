# language: pt
Funcionalidade: Cliente do endpoint de assemblies do Onshape
  Para alimentar o mapeamento do grafo
  Como serviço de integração
  Quero obter documentos, definições de assembly e peças da API do Onshape

  Cenário: Obter a definição de um assembly com subassemblies e mates
    Dado que a API do Onshape responderá com a fixture "assembly-hydraulics-small.json"
    Quando solicito a definição do assembly
    Então a definição contém 3 subassemblies e 13 peças
    E a definição contém pelo menos um mate
    E existe uma peça utilizada em mais de um conjunto

  Cenário: Obter os dados de um documento
    Dado que a API do Onshape responderá com a fixture "document-dumper-trailer.json"
    Quando solicito os dados do documento
    Então o documento se chama "Dumper Trailer"

  Cenário: Obter as peças do documento com metadados
    Dado que a API do Onshape responderá com a fixture "parts-dumper-trailer.json"
    Quando solicito as peças do documento
    Então recebo uma lista de peças onde cada uma possui identificador e nome

  Cenário: Erro da API vira exceção com mensagem clara
    Dado que a API do Onshape responderá com o status 404
    Quando solicito a definição do assembly
    Então o cliente lança um erro que contém "404"
    E a mensagem de erro não contém credenciais
