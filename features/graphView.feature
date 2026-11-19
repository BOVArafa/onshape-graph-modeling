# language: pt
Funcionalidade: Página de visualização do grafo
  Para auditar visualmente a estrutura mapeada
  Como usuário da aplicação
  Quero uma página interativa servida pelo próprio Express

  Cenário: A página de visualização é servida na raiz
    Dado que o servidor foi iniciado
    Quando abro o caminho "/"
    Então recebo o status 200
    E a resposta é um documento HTML

  Cenário: A biblioteca vis-network é servida localmente
    Dado que o servidor foi iniciado
    Quando abro o caminho "/vendor/vis-network/vis-network.min.js"
    Então recebo o status 200

  Esquema do Cenário: A página contém os controles exigidos pelo RF-06
    Dado que o servidor foi iniciado
    Quando abro o caminho "/"
    Então a página contém o elemento com id "<elemento>"

    Exemplos:
      | elemento          |
      | document-id-input |
      | search-input      |
      | node-type-filters |
      | details-panel     |
      | graph-container   |
