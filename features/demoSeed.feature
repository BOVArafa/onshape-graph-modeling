# language: pt
@neo4j
Funcionalidade: Seed do modo de demonstração
  Para que o orientador visualize o grafo sem credenciais do Onshape
  Como fluxo de verificação do projeto
  Quero um seed que carregue o modelo real do Dumper Trailer a partir das fixtures

  Cenário: O seed carrega o modelo de demonstração no banco
    Dado um banco de demonstração vazio
    Quando executo o seed de demonstração
    Então o grafo do Dumper Trailer fica disponível para consulta

  Cenário: Reexecutar o seed não duplica o modelo
    Dado um banco de demonstração vazio
    E o seed de demonstração já executado
    Quando executo o seed de demonstração
    Então o grafo do Dumper Trailer fica disponível para consulta
