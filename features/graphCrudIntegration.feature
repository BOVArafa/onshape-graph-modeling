# language: pt
@neo4j
Funcionalidade: Jornada CRUD do grafo de um documento real
  Para garantir que mapeamento e persistência funcionam integrados
  Como suíte de integração da aplicação
  Quero criar, consultar, ressincronizar e remover o grafo do Dumper Trailer em um Neo4j efêmero

  Cenário: Criar e consultar o grafo do documento a partir das fixtures reais
    Dado o grafo mapeado do modelo real do Dumper Trailer
    Quando sincronizo o grafo com o banco
    Então a consulta devolve os mesmos nós e relacionamentos do grafo mapeado
    E o material "Silicone Rubber" da peça "Tire" sobrevive à ida e volta ao banco

  Cenário: Ressincronizar o documento inteiro é idempotente
    Dado o grafo mapeado do modelo real do Dumper Trailer
    E o grafo já sincronizado com o banco
    Quando sincronizo o grafo com o banco novamente
    Então a consulta devolve os mesmos nós e relacionamentos do grafo mapeado
    E o banco contém exatamente os nós do grafo mapeado

  Cenário: Remover o grafo do documento limpa o banco
    Dado o grafo mapeado do modelo real do Dumper Trailer
    E o grafo já sincronizado com o banco
    Quando removo o subgrafo do documento do banco
    Então o banco fica sem nenhum nó do documento
