# language: pt
Funcionalidade: Modelo de grafo e constraints de unicidade
  Para garantir a deduplicação de nós no banco de grafos
  Como camada de dados da aplicação
  Quero um script Cypher versionado que crie uma constraint para cada chave de deduplicação

  Esquema do Cenário: Cada nó do modelo possui constraint de unicidade na sua chave
    Dado o script Cypher de constraints do projeto
    Então existe uma constraint de unicidade para o nó "<label>" na chave "<chave>"

    Exemplos:
      | label    | chave          |
      | Document | documentId     |
      | Assembly | elementId      |
      | Part     | partId         |
      | Property | partId, name   |

  Cenário: O script pode ser reexecutado sem erro
    Dado o script Cypher de constraints do projeto
    Então toda constraint é declarada com "IF NOT EXISTS"
