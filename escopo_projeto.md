# Escopo de Projeto — OnshapeGraphModeling

**Documento:** Escopo e requisitos do projeto
**Solicitante:** Consultoria de engenharia de produto (projetos de equipamentos industriais em CAD paramétrico)
**Desenvolvedor responsável:** Rafael Augusto Bova
**Status:** Aprovado para desenvolvimento

---

## 1. Contexto de negócio

A consultoria para a qual vou desenvolver este projeto cria e mantém projetos mecânicos (flanges, tubulações, conjuntos aparafusados, skids) no **Onshape**, um CAD paramétrico que roda na nuvem. Hoje, as informações de engenharia desses projetos — quais peças compõem cada montagem, de que material são, como se conectam, quais componentes se repetem entre produtos — ficam presas dentro do CAD: para consultar qualquer coisa é preciso abrir os documentos um a um, ter licença e saber usar a ferramenta.

Na prática, isso causa três problemas:

1. **Perguntas simples dão muito trabalho.** "Em quantos conjuntos usamos o parafuso M16x60?" ou "quais peças de ASTM A193 existem no projeto X?" — hoje só dá para responder abrindo montagem por montagem.
2. **Não dá para ver o impacto de uma mudança.** Se uma peça é usada em vários subconjuntos, descobrir onde ela aparece é trabalho manual.
3. **Os dados não servem para outros sistemas.** Orçamento, compras e, futuramente, ferramentas de IA não conseguem acessar a estrutura dos produtos de forma automática.

Pesquisando sobre o assunto, entendi que a estrutura de um modelo CAD paramétrico já é, naturalmente, um **grafo direcionado**: documentos contêm montagens, montagens contêm submontagens e peças (a mesma peça pode aparecer em vários lugares), e as restrições de montagem (*mates*) ligam peças entre si. Por isso, a ideia do projeto é guardar essa estrutura em um banco de grafos — o formato que ela realmente tem.

## 2. Objetivo

Construir um serviço que **lê a estrutura dos produtos pela API do Onshape e a salva como grafo no banco Neo4j**, disponibilizando esses dados de três formas: uma API REST, uma página web para explorar o grafo visualmente e um servidor MCP para que assistentes de IA também consigam consultar.

**Resultado esperado:** qualquer pessoa autorizada (ou sistema) consegue responder em segundos perguntas sobre a estrutura dos produtos, sem precisar abrir o CAD.

## 3. Entregáveis

| # | Entregável | Descrição |
|---|-----------|-----------|
| E1 | Serviço de sincronização | API REST (Node.js + Express) que se autentica no Onshape, extrai a estrutura de um documento e a salva no Neo4j |
| E2 | Base de grafo modelada | Modelo de dados no Neo4j com constraints, que dá para popular e consultar em Cypher |
| E3 | Interface web | Página de exploração visual do grafo (busca, filtros, detalhes de nó) |
| E4 | Servidor MCP | Ferramentas MCP que expõem consultas do grafo a clientes de IA |
| E5 | Suíte de testes | Cenários BDD executáveis (unitários e integração) com relatório e cobertura |
| E6 | Empacotamento e CI | Docker Compose para subir o sistema completo; pipeline de CI rodando a suíte a cada push |
| E7 | Documentação | README com arquitetura, setup e operação |

## 4. Requisitos funcionais

### RF-01 — Autenticação no Onshape
O serviço se autentica na API REST do Onshape usando API Key com assinatura de requisição (HMAC-SHA256). As credenciais ficam em variáveis de ambiente — nunca no código nem no repositório.

### RF-02 — Extração da estrutura de um documento
Dado o identificador de um documento do Onshape, o serviço busca a definição da montagem (`rootAssembly`, `subAssemblies`, instâncias e *mates*) e a transforma em nós e relacionamentos:

- **Nós:** `Document`, `Assembly`, `Part`, `Property` — cada um com o identificador único que vem da própria API.
- **Relacionamentos:** `CONTAINS` (o que contém o quê), `HAS_PROPERTY` (metadados da peça: material, dimensões), `LINKS_TO` (referências entre documentos vinculados), `MATES_WITH` (restrições de montagem entre peças).
- Se a mesma peça aparece em várias submontagens, ela deve virar **um único nó** com várias arestas chegando nele (deduplicação pelo id).

### RF-03 — Persistência idempotente
`POST /map/:documentId` sincroniza o documento com o grafo. Se eu rodar de novo para o mesmo documento, o grafo deve ser atualizado sem duplicar nada (upsert com `MERGE`) — essa propriedade se chama idempotência. A gravação deve acontecer em uma transação única: se algo falhar no meio, nada pode ficar salvo pela metade.

### RF-04 — Consulta da estrutura
`GET /map/:documentId` devolve os nós e relacionamentos do documento em JSON, em um formato que a página web (ou qualquer outro sistema) consiga usar.

### RF-05 — Remoção
`DELETE /map/:documentId` apaga o subgrafo completo do documento (`DETACH DELETE`), sem mexer nos outros documentos.

### RF-06 — Exploração visual
Página web (servida pelo próprio serviço) que mostra o grafo de um documento de forma interativa: nós coloridos por tipo, arestas com o nome do relacionamento, zoom e arraste. Também deve ter **busca** por nome/id (destacando o nó encontrado), **filtro** por tipo de nó e um **painel de detalhes** com as propriedades e os vizinhos do nó selecionado.

### RF-07 — Interface MCP
Servidor MCP com pelo menos três ferramentas de consulta ao grafo: `get_assembly_tree(documentId)`, `find_parts_by_property(propriedade, valor)` e `count_parts_by_material()`. Precisa funcionar com um cliente MCP comum de mercado.

## 5. Requisitos não-funcionais

- **RNF-01 · Linguagem e plataforma:** Node.js LTS, JavaScript, Express.
- **RNF-02 · Qualidade:** os requisitos principais devem ser escritos como cenários BDD (Gherkin) executáveis com Cucumber. Os testes de integração rodam contra um Neo4j temporário criado só para os testes (Testcontainers) — nunca contra um banco compartilhado. A suíte gera relatório HTML da execução e cobertura de código.
- **RNF-03 · Segurança:** rotas de escrita protegidas por uma API key própria; headers de segurança (helmet); limite de requisições por IP; validação dos parâmetros de entrada; todas as consultas Cypher parametrizadas (sem montar query concatenando texto).
- **RNF-04 · Integridade de dados:** constraint de unicidade no id de cada tipo de nó no Neo4j, para o próprio banco impedir duplicatas.
- **RNF-05 · Operação:** o sistema completo (API + Neo4j) sobe com um comando (`docker compose up`). Um pipeline de CI roda a suíte de testes a cada push, com o status visível no repositório.
- **RNF-06 · Testes sem depender da internet:** os testes não podem depender da API do Onshape estar no ar — respostas reais serão salvas como *fixtures* (arquivos JSON versionados) e usadas nos testes.
- **RNF-07 · Arquitetura:** separação em camadas (rotas → serviços → repositório de grafo). O acesso ao banco fica concentrado em um único módulo, usado tanto pela API REST quanto pelo servidor MCP.

## 6. Critérios de aceitação

Escrevi abaixo alguns cenários que a suíte de testes precisa cobrir obrigatoriamente:

```gherkin
# language: pt
Funcionalidade: Sincronização de documento Onshape para o grafo

  Cenário: Sincronização inicial de um documento com reuso de peças
    Dado um documento Onshape com 2 submontagens que compartilham a peça "Bolt-M16x60"
    Quando eu executo POST /map/{documentId}
    Então o grafo contém exatamente 1 nó Part com id da peça "Bolt-M16x60"
    E esse nó possui 2 relacionamentos CONTAINS de entrada

  Cenário: Reexecução é idempotente
    Dado um documento já sincronizado
    Quando eu executo POST /map/{documentId} novamente
    Então a contagem de nós e relacionamentos do documento permanece inalterada

  Cenário: Escrita sem credencial é rejeitada
    Quando eu executo POST /map/{documentId} sem a API key do serviço
    Então recebo o status 401 e o grafo permanece inalterado

  Cenário: Mates viram relacionamentos
    Dado um documento cujo assembly define um mate entre as peças A e B
    Quando eu executo POST /map/{documentId}
    Então existe um relacionamento MATES_WITH entre os nós das peças A e B
```

Além desses cenários, cada entregável tem um critério prático: E3 — um usuário encontra uma peça pelo nome e consegue ver seus vizinhos em até 3 interações; E4 — um cliente MCP lista as ferramentas e obtém a árvore de um documento real; E6 — a partir de um clone limpo do repositório, `docker compose up` sobe tudo e a suíte passa, sem nenhum passo manual além de preencher o `.env`.

## 7. Fora de escopo (nesta fase)

- Sincronização automática/agendada ou por webhook (a sincronização é sob demanda).
- Escrita de volta no Onshape (o fluxo é somente leitura do CAD).
- Autenticação multiusuário, perfis e SSO na interface web.
- Mapeamento de features paramétricas mais finas (equações, variáveis, sketches) — nesta fase o grafo cobre contenção, propriedades e mates.
- Alta disponibilidade e deploy em nuvem — o alvo é rodar localmente via Docker Compose.

## 8. Premissas (o que preciso para começar)

- Conta no Onshape com acesso de desenvolvedor e um par de chaves de API ativo.
- Documentos de teste representativos (pelo menos um assembly com submontagens, peça reutilizada e mates).
- Os limites da API do Onshape no plano gratuito devem ser suficientes para sincronização sob demanda.
- O Neo4j Community Edition deve dar conta do volume desta fase (dezenas de documentos, milhares de nós).

## 9. Dificuldades que prevejo

- Pelo que li na documentação, a assinatura HMAC do Onshape é bem sensível a detalhes de formatação da requisição — imagino que a autenticação será a parte mais difícil da integração.
- Ainda não sei o quão profundo e variado é o JSON de assemblies que a API retorna; isso pode gerar retrabalho no código de mapeamento.
- A API do Onshape pode ficar indisponível ou me limitar durante o desenvolvimento, já que estou no plano gratuito.
- Se o grafo de um documento for muito grande, a visualização na página web pode ficar pesada.

## 10. Quando vou considerar o projeto pronto

Vou considerar o projeto entregue quando: todos os requisitos funcionais estiverem implementados com os cenários BDD passando; os requisitos não-funcionais estiverem demonstrados (sistema subindo com um comando, CI verde, relatório de cobertura, constraints criadas no banco); os cenários da seção 6 passarem contra um documento real do Onshape; e o README permitir que outra pessoa suba e teste o sistema sem a minha ajuda.
