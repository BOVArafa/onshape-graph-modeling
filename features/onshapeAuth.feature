# language: pt
Funcionalidade: Autenticação HMAC-SHA256 na API do Onshape
  Para consumir a API do Onshape com segurança
  Como serviço de integração
  Quero assinar cada requisição com HMAC-SHA256 no formato exigido pela API

  Cenário: Gerar a assinatura de uma requisição GET
    Dado que possuo uma access key "chave-de-acesso-de-teste" e uma secret key "chave-secreta-de-teste"
    E que o nonce é "ABCDEFGHIJKLMNOPQRSTUVWXY" e a data é "Mon, 10 Nov 2026 12:00:00 GMT"
    Quando gero a assinatura para uma requisição GET ao endpoint "https://cad.onshape.com/api/users/sessioninfo"
    Então o header Authorization começa com "On chave-de-acesso-de-teste:HmacSHA256:"
    E a assinatura corresponde ao vetor conhecido "vqCHU2JVRtKww9RsjCKpZ0dV+7CkJR51XYil4iiBqWE="
    E os headers incluem o nonce e a data utilizados

  Cenário: Gerar nonce e data automaticamente quando não informados
    Dado que possuo uma access key "chave-de-acesso-de-teste" e uma secret key "chave-secreta-de-teste"
    Quando gero a assinatura para uma requisição GET ao endpoint "https://cad.onshape.com/api/users/sessioninfo"
    Então os headers incluem um nonce de 25 caracteres alfanuméricos e uma data válida
