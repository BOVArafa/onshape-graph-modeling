# language: pt
Funcionalidade: Health check da API
  Para verificar que a aplicação está no ar
  Como operador da aplicação
  Quero consultar uma rota de health check

  Cenário: Servidor iniciado responde ao health check
    Dado que o servidor foi iniciado
    Quando eu faço uma requisição GET para "/health"
    Então recebo o status 200
    E o corpo da resposta contém o status "ok"
