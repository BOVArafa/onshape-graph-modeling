# language: pt
@neo4j
Funcionalidade: Segurança da API
  Para proteger as rotas de escrita e limitar abuso mesmo em execução local
  Como camada de segurança da aplicação
  Quero exigir API Key nas escritas, limitar requisições por IP e endurecer os headers

  Cenário: Escrita sem credencial é rejeitada
    Dado a API protegida por API Key
    Quando faço POST /map sem o header de API Key
    Então recebo o status 401
    E o grafo permanece inalterado

  Cenário: Escrita com credencial inválida é rejeitada
    Dado a API protegida por API Key
    Quando faço POST /map com uma API Key inválida
    Então recebo o status 401
    E o grafo permanece inalterado

  Cenário: Escrita com a credencial válida é aceita
    Dado a API protegida por API Key
    Quando faço POST /map com a API Key válida
    Então recebo o status 200

  Cenário: Remoção também exige credencial
    Dado a API protegida por API Key
    Quando faço DELETE /map sem o header de API Key
    Então recebo o status 401

  Cenário: Consulta permanece aberta sem credencial
    Dado a API protegida por API Key
    E o documento sincronizado com a API Key válida
    Quando faço GET /map sem credencial
    Então recebo o status 200

  Cenário: Exceder o limite de requisições responde 429
    Dado a API com limite de 3 requisições por IP
    Quando excedo o limite de requisições
    Então recebo o status 429
    E o corpo da resposta contém uma mensagem de erro

  Cenário: Headers de segurança do helmet presentes nas respostas
    Dado a API protegida por API Key
    Quando faço GET /health
    Então a resposta contém o header "x-content-type-options" com valor "nosniff"
