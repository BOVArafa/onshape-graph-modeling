# language: pt
@neo4j
Funcionalidade: Rotas REST de mapeamento de documentos
  Para expor a sincronização, a consulta e a remoção do grafo por HTTP
  Como camada de controle da aplicação
  Quero rotas POST, GET e DELETE em /map/:documentId com erros padronizados

  Cenário: Sincronização inicial de um documento com reuso de peças
    Dado a API conectada ao Onshape de fixtures e ao banco efêmero
    Quando executo POST /map para o documento do Dumper Trailer
    Então recebo o status 200
    E o grafo persistido contém exatamente um nó para a peça reutilizada
    E esse nó possui um CONTAINS de entrada de cada subassembly que a reutiliza

  Cenário: Reexecutar o POST do mesmo documento é idempotente
    Dado a API conectada ao Onshape de fixtures e ao banco efêmero
    E o documento do Dumper Trailer já sincronizado pela API
    Quando executo POST /map para o documento do Dumper Trailer
    Então recebo o status 200
    E a contagem de nós e relacionamentos do documento permanece inalterada

  Cenário: Mates do assembly viram relacionamentos MATES_WITH
    Dado a API conectada ao Onshape de fixtures e ao banco efêmero
    Quando executo POST /map para o documento do Dumper Trailer
    Então o mate entre o parafuso e o suporte do calço vira um relacionamento MATES_WITH

  Cenário: Consultar o grafo de um documento mapeado
    Dado a API conectada ao Onshape de fixtures e ao banco efêmero
    E o documento do Dumper Trailer já sincronizado pela API
    Quando executo GET /map para o documento do Dumper Trailer
    Então recebo o status 200
    E o corpo da resposta contém os nós e relacionamentos do documento

  Cenário: Consultar documento não mapeado responde 404
    Dado a API conectada ao Onshape de fixtures e ao banco efêmero
    Quando executo GET /map para o documento do Dumper Trailer
    Então recebo o status 404
    E o corpo da resposta contém uma mensagem de erro

  Cenário: Remover o grafo de um documento mapeado
    Dado a API conectada ao Onshape de fixtures e ao banco efêmero
    E o documento do Dumper Trailer já sincronizado pela API
    Quando executo DELETE /map para o documento do Dumper Trailer
    Então recebo o status 204
    E o banco fica sem nenhum nó do documento

  Esquema do Cenário: Identificador fora do formato é rejeitado antes de tocar o banco
    Dado a API conectada ao Onshape de fixtures e ao banco efêmero
    Quando executo <método> /map com o identificador inválido "doc-invalido"
    Então recebo o status 400
    E o corpo da resposta contém uma mensagem de erro

    Exemplos:
      | método |
      | POST   |
      | GET    |
      | DELETE |

  Cenário: Falha na coleta do Onshape responde 500 sem vazar detalhes internos
    Dado a API cuja coleta no Onshape falha
    Quando executo POST /map para o documento do Dumper Trailer
    Então recebo o status 500
    E o corpo da resposta contém uma mensagem de erro sem detalhes internos
