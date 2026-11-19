# language: pt
Funcionalidade: Pipeline de integração contínua
  Para que toda mudança seja validada pela suíte BDD completa
  Como processo de entrega do projeto
  Quero um workflow versionado que rode os testes a cada push e publique os relatórios

  Cenário: O workflow é disparado a cada push
    Dado o workflow de CI do projeto
    Então ele é disparado no evento "push"

  Cenário: O workflow executa a suíte completa a partir de uma instalação limpa
    Dado o workflow de CI do projeto
    Então ele executa o passo "npm ci"
    E ele executa o passo "npm run test:coverage"

  Cenário: Relatórios de execução e cobertura viram artefatos
    Dado o workflow de CI do projeto
    Então ele gera o relatório HTML sem reexecutar a suíte
    E ele publica os diretórios "reports" e "coverage" como artefatos mesmo em caso de falha
