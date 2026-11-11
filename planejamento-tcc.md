>[!note] Disclaimer 
> Este documento foi elaborado por Claude-Fable 5, baseado no
> [escopo](./escopo_projeto.md) escrito pelo autor do projeto

# Planejamento de Desenvolvimento — Onshape Graph Modeling (TCC PUCRS)

> Documento de planejamento derivado do memorial `rafael-bova_memorial_REVISADO_tracked.docx`.
> Destina-se a orientar o desenvolvimento completo do estudo de caso: integração entre um
> servidor ExpressJS e a API do Onshape para mapear modelos 3D em um banco de dados de grafos (Neo4j).

---

## 1. Visão geral

A aplicação percorre o ciclo completo full stack:

1. **Coleta**: consome o endpoint de *assemblies* da API do Onshape, autenticando cada
   requisição com assinatura **HMAC-SHA256** (API Keys).
2. **Transformação**: percorre a resposta aninhada com **travessia recursiva em profundidade (DFS)**,
   deduplicando peças reutilizadas via **hash map** indexado pelo identificador da peça.
3. **Persistência**: grava o grafo no **Neo4j** com Cypher **parametrizado**; o mapeamento é uma
   operação **idempotente** de sincronização (`MERGE`) e a remoção elimina o subgrafo completo
   (`DETACH DELETE`).
4. **Apresentação**: página web servida pelo próprio Express que consome o endpoint de consulta
   e renderiza o grafo interativamente com **vis-network**.

A estrutura resultante é um **DAG** (não uma árvore): as restrições de montagem (*mates*) viram
relacionamentos transversais `MATES_WITH`, e peças reutilizadas em múltiplas subassemblies são
um único nó deduplicado.

## 2. Stack tecnológica

| Camada            | Tecnologia                                              |
| ----------------- | ------------------------------------------------------- |
| Runtime / API     | Node.js + Express                                        |
| Banco de dados    | Neo4j (driver oficial JavaScript, Cypher parametrizado)  |
| Testes            | Cucumber.js (BDD/Gherkin), Testcontainers (Neo4j efêmero)|
| Relatórios        | cucumber-html-reporter (execução), c8 (cobertura)        |
| Segurança         | helmet, express-rate-limit, middleware de API Key, HMAC-SHA256 (crypto nativo) |
| Frontend          | HTML + vis-network (servido pelo Express)                |
| Interface IA      | Servidor MCP (Model Context Protocol) reutilizando a camada de dados |
| DevOps            | Docker, docker-compose, GitHub Actions                   |

## 3. Arquitetura em camadas

```
src/
├── controllers/   # Camada de controle: rotas REST, validação de parâmetros
├── services/      # Camada de serviços: auth HMAC, cliente Onshape, transformação (DFS + dedup)
├── data/          # Camada de dados: driver Neo4j, repositórios, queries Cypher
├── middleware/    # API Key, rate limit, tratamento de erros
└── public/        # Camada de apresentação: página de visualização vis-network
features/          # Arquivos .feature (Gherkin) + step definitions
```

## 4. Modelo de dados (grafo)

**Nós:**

| Label      | Descrição                                        | Chave de deduplicação |
| ---------- | ------------------------------------------------ | --------------------- |
| `Document` | Projeto/modelo 3D no Onshape                     | `documentId`          |
| `Assembly` | Estrutura que organiza os componentes            | `elementId`           |
| `Part`     | Componente individual da montagem                | `partId`              |
| `Property` | Metadado técnico/engenharia associado a uma peça | `(partId, name)`      |

**Relacionamentos:**

| Tipo           | Origem → Destino        | Semântica                                 |
| -------------- | ----------------------- | ----------------------------------------- |
| `CONTAINS`     | Document/Assembly → Assembly/Part | Hierarquia de contenção          |
| `HAS_PROPERTY` | Part → Property         | Metadados da peça                         |
| `LINKS_TO`     | Document → Document     | Referências entre documentos              |
| `MATES_WITH`   | Part → Part             | Restrição de montagem (aresta transversal do DAG) |

## 5. Fluxo de trabalho

- **Branch por funcionalidade**: `feature/<id-da-issue>-<slug>` (ex.: `feature/API-010-rotas-crud`).
- **Commits atômicos** com mensagem no imperativo referenciando a issue (`feat: ... (#10)`).
- **Pull request obrigatório** para `main`, com CI verde (testes BDD + cobertura).
- **BDD primeiro**: toda issue de funcionalidade começa pela escrita/ajuste do cenário `.feature`
  em Gherkin (Dado/Quando/Então); os step definitions conectam o cenário ao código.
- O histórico público do repositório serve de **evidência para o memorial** — várias issues
  pedem captura de tela (figuras 1 a 12 do memorial).

---

## 6. Formato das issues

Toda issue deve ser criada no GitHub seguindo o template abaixo.

### Template

```markdown
## [<ÁREA>-<NNN>] <Título curto no imperativo>

**Labels:** `tipo:<...>` `area:<...>` `prioridade:<...>`
**Milestone:** M<n> — <nome>
**Depende de:** #<issues> (ou "nenhuma")

### Contexto
Por que esta issue existe e como se conecta ao estudo de caso / memorial.

### Escopo
- [ ] Tarefa objetiva 1
- [ ] Tarefa objetiva 2

### Critérios de aceite
Cenário(s) em Gherkin quando aplicável; caso contrário, lista verificável.

### Definição de pronto (DoD)
- [ ] Cenários BDD passando localmente e no CI
- [ ] Cobertura reportada pelo c8 sem regressão
- [ ] PR revisado e mergeado em `main`
- [ ] Evidência capturada (quando a issue gerar figura do memorial)
```

### Tags (labels)

| Grupo        | Valores                                                            |
| ------------ | ------------------------------------------------------------------ |
| `tipo:`      | `feature` · `test` · `infra` · `security` · `docs` · `frontend`    |
| `area:`      | `setup` · `onshape` · `grafo` · `api` · `db` · `devops` · `ui` · `mcp` |
| `prioridade:`| `alta` (bloqueia outras) · `media` · `baixa` (polimento/evidência) |

### Convenção de IDs

`<ÁREA>-<NNN>` — prefixo da área dominante + número sequencial de 3 dígitos.
Exemplos: `SETUP-001`, `BDD-002`, `ONS-004`, `DB-007`, `API-010`, `UI-012`, `OPS-013`.

---

## 7. Backlog de issues

### M1 — Fundação do projeto

---

#### [SETUP-001] Inicializar projeto Node.js/Express com arquitetura em camadas

**Labels:** `tipo:infra` `area:setup` `prioridade:alta`
**Depende de:** nenhuma

**Contexto:** base de todo o estudo de caso; a estrutura em camadas (controle, serviços, dados)
é requisito da disciplina de Arquitetura Server-Side.

**Escopo:**
- [ ] `npm init`, Express instalado, servidor sobe em porta configurável via `.env`
- [ ] Estrutura de pastas da seção 3 criada (controllers, services, data, middleware, public)
- [ ] `dotenv` para configuração; `.env.example` versionado, `.env` no `.gitignore`
- [ ] npm scripts: `start`, `dev`, `test`
- [ ] Rota de health check `GET /health` retornando `200 { status: "ok" }`

**Critérios de aceite:**
```gherkin
Dado que o servidor foi iniciado
Quando eu faço uma requisição GET para /health
Então recebo status 200 e o corpo contém "ok"
```

---

#### [BDD-002] Configurar harness de testes BDD (Cucumber.js + relatórios)

**Labels:** `tipo:test` `area:setup` `prioridade:alta`
**Depende de:** SETUP-001

**Contexto:** o fluxo do projeto é BDD-first (disciplina Qualidade e Testes de Software);
todos os requisitos serão expressos em Gherkin antes da implementação.

**Escopo:**
- [ ] `@cucumber/cucumber` instalado e configurado (`cucumber.js` na raiz)
- [ ] Estrutura `features/*.feature` + `features/step_definitions/*.js`
- [ ] Feature de exemplo (health check) com step definition passando
- [ ] `cucumber-html-reporter` gerando relatório HTML da execução
- [ ] `c8` gerando relatório de cobertura (`npm run test:coverage`)

**Critérios de aceite:**
- `npm test` executa todos os cenários e falha com exit code ≠ 0 se algum cenário falhar
- Relatório HTML e cobertura gerados em pasta ignorada pelo git

**Evidência:** estrutura dos testes (Figuras 1 e 2 do memorial).

---

#### [OPS-003] Containerizar aplicação e banco (Dockerfile + docker-compose)

**Labels:** `tipo:infra` `area:devops` `prioridade:alta`
**Depende de:** SETUP-001

**Contexto:** infraestrutura como código (disciplina DevOps): um único comando deve
provisionar API + Neo4j.

**Escopo:**
- [ ] `Dockerfile` da aplicação (imagem Node LTS, build enxuto)
- [ ] `docker-compose.yml` com serviços `api` e `neo4j` (volumes, rede, variáveis de ambiente)
- [ ] Credenciais do Neo4j via variáveis de ambiente, nunca hardcoded
- [ ] `docker compose up` deixa a aplicação acessível e conectada ao banco

**Critérios de aceite:**
- A partir de um clone limpo: `docker compose up` → `GET /health` responde 200
- Neo4j Browser acessível na porta mapeada

---

### M2 — Integração com a API do Onshape

---

#### [ONS-004] Implementar autenticação HMAC-SHA256 para a API do Onshape

**Labels:** `tipo:security` `area:onshape` `prioridade:alta`
**Depende de:** BDD-002

**Contexto:** toda requisição à API do Onshape deve ser assinada com API Key + HMAC-SHA256
(módulo `crypto` nativo do Node). Este é o cenário BDD de referência do memorial.

**Escopo:**
- [ ] Serviço `services/onshapeAuth.js`: gera o header `Authorization` com assinatura
      HMAC-SHA256 a partir de `method`, `url`, `nonce`, `date` e `Content-Type`
- [ ] Chaves (`ONSHAPE_ACCESS_KEY`, `ONSHAPE_SECRET_KEY`) lidas do `.env`
- [ ] Cenário Gherkin cobrindo a geração da assinatura com vetores conhecidos

**Critérios de aceite:**
```gherkin
Dado que possuo uma access key e uma secret key válidas
Quando gero a assinatura para uma requisição GET a um endpoint do Onshape
Então o header Authorization contém a assinatura HMAC-SHA256 no formato esperado pela API
```

**Evidência:** cenário + step definition (Figuras 1 e 2 do memorial).

---

#### [ONS-005] Implementar cliente do endpoint de assemblies do Onshape

**Labels:** `tipo:feature` `area:onshape` `prioridade:alta`
**Depende de:** ONS-004

**Contexto:** fonte dos dados do grafo. O cliente busca a definição do assembly
(documento, elementos, peças, propriedades e *mates*).

**Escopo:**
- [ ] `services/onshapeClient.js` com funções assíncronas (`async/await`) para:
      obter documento, obter definição de assembly (incl. subassemblies e mates),
      obter propriedades/metadados de peças
- [ ] Tratamento de erros HTTP (4xx/5xx) com mensagens claras
- [ ] Respostas de exemplo salvas como *fixtures* JSON para testes offline

**Critérios de aceite:**
- Cenários BDD usando fixtures validam o parse da resposta (sem chamada real à API)
- Chamada real documentada no README (modelo público `exemplo_neo4j`)

---

### M3 — Modelagem e persistência em grafo

---

#### [DB-006] Modelar o grafo e versionar scripts Cypher de criação

**Labels:** `tipo:feature` `area:grafo` `prioridade:alta`
**Depende de:** nenhuma (pode andar em paralelo com M2)

**Contexto:** o diagrama ER orientado a grafos (Neo4j Data Importer) define nós
`Document`, `Assembly`, `Part`, `Property` e relacionamentos `CONTAINS`, `HAS_PROPERTY`,
`LINKS_TO`, `MATES_WITH` (seção 4 deste documento).

**Escopo:**
- [ ] Diagrama ER exportado e versionado em `docs/` (imagem + fonte)
- [ ] Scripts Cypher de constraints/índices (unicidade por `documentId`, `elementId`, `partId`)
- [ ] Documentar chaves de deduplicação de cada nó

**Critérios de aceite:**
- Script executa sem erro em instância limpa e cria todas as constraints
- Diagrama corresponde 1:1 ao modelo implementado

**Evidência:** Figura 4 do memorial (diagrama ER).

---

#### [DB-007] Implementar camada de dados Neo4j (repositórios + Cypher parametrizado)

**Labels:** `tipo:feature` `area:db` `prioridade:alta`
**Depende de:** DB-006, OPS-003

**Contexto:** persistência com o driver JavaScript oficial. Uso **exclusivo** de Cypher
parametrizado (prevenção de injeção — requisito de Segurança de Software).

**Escopo:**
- [ ] `data/neo4jDriver.js`: ciclo de vida do driver/sessões (abertura, fechamento, erros)
- [ ] `data/graphRepository.js` com operações:
      - `upsertDocumentGraph(graph)` — sincronização idempotente via `MERGE`
      - `getDocumentGraph(documentId)` — consulta de nós/relacionamentos para visualização
      - `deleteDocumentGraph(documentId)` — `DETACH DELETE` do subgrafo completo
- [ ] Nenhuma query montada por concatenação de strings

**Critérios de aceite:**
```gherkin
Dado um grafo de documento já persistido
Quando executo a sincronização do mesmo documento novamente
Então nenhum nó ou relacionamento é duplicado
E as propriedades alteradas são atualizadas
```

---

#### [DB-008] Implementar algoritmo de mapeamento assembly → grafo (DFS + deduplicação)

**Labels:** `tipo:feature` `area:grafo` `prioridade:alta`
**Depende de:** ONS-005, DB-007

**Contexto:** núcleo algorítmico do estudo de caso (disciplina Fundamentos de Computação e
Algoritmos): a resposta aninhada do Onshape é percorrida com DFS recursiva; um hash map por
`partId` garante que peças reutilizadas em múltiplas subassemblies virem um único nó.

**Escopo:**
- [ ] `services/graphMapper.js`: transforma a resposta do assembly em
      `{ nodes: [], relationships: [] }`
- [ ] Travessia DFS recursiva da hierarquia de subassemblies (`CONTAINS`)
- [ ] Deduplicação de `Part` via `Map` indexado pelo identificador
- [ ] Mapeamento dos *mates* como arestas `MATES_WITH` entre peças
- [ ] Propriedades de peças viram nós `Property` com `HAS_PROPERTY`

**Critérios de aceite:**
```gherkin
Dado um assembly com uma peça reutilizada em duas subassemblies
Quando executo o mapeamento
Então a peça aparece como um único nó no resultado
E possui um relacionamento CONTAINS a partir de cada subassembly

Dado um assembly com uma restrição de montagem entre duas peças
Quando executo o mapeamento
Então existe um relacionamento MATES_WITH entre os nós correspondentes
```

---

#### [DB-009] Testes de integração CRUD com Testcontainers (Neo4j efêmero)

**Labels:** `tipo:test` `area:db` `prioridade:alta`
**Depende de:** DB-007

**Contexto:** cada execução da suíte sobe uma instância temporária do Neo4j em Docker via
`testcontainers`, garantindo isolamento e controle de variáveis externas.

**Escopo:**
- [ ] Hooks do Cucumber (`BeforeAll`/`AfterAll`) sobem e derrubam o container Neo4j
- [ ] Cenários CRUD completos: criar, consultar, sincronizar (idempotência) e remover
      (`DETACH DELETE`) o grafo de um documento
- [ ] Suíte roda sem nenhum Neo4j pré-instalado na máquina (só Docker)

**Critérios de aceite:**
- `npm test` executa os cenários CRUD contra o container efêmero e passa de forma repetível

**Evidência:** nenhuma figura específica (desde 2026-11-11 a Figura 3 do memorial é o backlog
de issues no GitHub; o código desta issue é referenciado na seção 2.1 do memorial).

---

### M4 — API REST

---

#### [API-010] Implementar rotas REST de mapeamento (camada de controle)

**Labels:** `tipo:feature` `area:api` `prioridade:alta`
**Depende de:** DB-008, DB-009

**Contexto:** API REST com semântica explícita: sincronização idempotente, consulta e remoção
de subgrafo (operações CRUD do estudo de caso).

**Escopo:**
- [ ] `POST /map/:documentId` — dispara coleta no Onshape + mapeamento + `MERGE`
- [ ] `GET /map/:documentId` — retorna nós/arestas em JSON (formato consumível
      pela visualização)
- [ ] `DELETE /map/:documentId` — remove o subgrafo (`DETACH DELETE`)
- [ ] Validação dos parâmetros de rota (formato dos IDs) antes de tocar serviço/banco
- [ ] Respostas de erro padronizadas (`400`, `401`, `404`, `429`, `500`)

**Critérios de aceite:**
```gherkin
Dado um documento válido do Onshape
Quando envio POST /map/{documentId} duas vezes
Então ambas respondem com sucesso
E o grafo persistido não contém duplicatas
```

**Evidência:** Figura 6 do memorial (aplicativo Express — controle).

---

#### [SEC-011] Aplicar middlewares de segurança na API

**Labels:** `tipo:security` `area:api` `prioridade:alta`
**Depende de:** API-010

**Contexto:** mesmo em execução local, a API própria é protegida por medidas de baixo custo
(disciplina Segurança de Software).

**Escopo:**
- [ ] Middleware de **API Key** obrigatório nas rotas de escrita (`POST`, `DELETE`)
- [ ] `helmet` aplicado globalmente (headers de segurança)
- [ ] `express-rate-limit` configurado (limite por IP, resposta `429`)
- [ ] Nenhum segredo logado ou retornado em mensagens de erro

**Critérios de aceite:**
```gherkin
Dado que não envio o header de API Key
Quando faço POST /map/{documentId}
Então recebo status 401

Dado que excedi o limite de requisições
Quando faço uma nova requisição
Então recebo status 429
```

---

### M5 — Camadas de apresentação e consumo

---

#### [UI-012] Página web de visualização interativa do grafo (vis-network)

**Labels:** `tipo:frontend` `area:ui` `prioridade:media`
**Depende de:** API-010

**Contexto:** fecha o ciclo full stack — o usuário audita visualmente a estrutura mapeada.

**Escopo:**
- [ ] Página estática servida pelo Express (`public/index.html`)
- [ ] Consome `GET /map/:documentId` e renderiza com **vis-network**
- [ ] Cores/formas distintas por label (`Document`, `Assembly`, `Part`, `Property`)
- [ ] Interações: zoom, arrastar nós, tooltip com propriedades do nó
- [ ] Campo para informar o `documentId` a visualizar

**Critérios de aceite:**
- Grafo do modelo `exemplo_neo4j` renderiza no navegador com todos os tipos de nó e aresta
- Teste manual no navegador documentado no PR (golden path + documento inexistente)

**Evidência:** Figura 9 do memorial (interface web interativa).

---

#### [MCP-015] Implementar servidor MCP com ferramentas de consulta ao grafo

**Labels:** `tipo:feature` `area:mcp` `prioridade:media`
**Depende de:** DB-007, DB-008

**Contexto:** entregável vinculante E4/RF-07 do escopo — expor o grafo a assistentes de IA
via Model Context Protocol. **Atenção (decisão D2):** o MCP é parte do projeto, mas **não é
citado no memorial** e não gera figura.

**Escopo:**
- [ ] Servidor MCP com as ferramentas `get_assembly_tree(documentId)`,
      `find_parts_by_property(propriedade, valor)` e `count_parts_by_material()`
- [ ] Reutilizar `data/graphRepository` — camada de acesso ao grafo única para a API REST
      e para o MCP (RNF-07)
- [ ] Sem dependências novas além do SDK oficial do MCP

**Critérios de aceite:**
- Um cliente MCP padrão de mercado lista as 3 ferramentas e obtém a árvore de um
  documento real (critério E4 do escopo)

---

### M6 — DevOps e evidências

---

#### [OPS-013] Pipeline de integração contínua no GitHub Actions

**Labels:** `tipo:infra` `area:devops` `prioridade:alta`
**Depende de:** DB-009

**Contexto:** a cada push, o CI executa a suíte BDD completa com bancos efêmeros do
Testcontainers (disciplina DevOps — figura 12 do memorial).

**Escopo:**
- [ ] Workflow `.github/workflows/ci.yml`: checkout, Node LTS, `npm ci`, `npm test`
- [ ] Testcontainers funcionando no runner (Docker disponível)
- [ ] Relatórios (HTML + cobertura) publicados como artefatos do workflow
- [ ] Badge de status no README

**Critérios de aceite:**
- Push em qualquer branch dispara o workflow; falha de cenário quebra o build
- PRs para `main` exigem CI verde

**Evidência:** Figura 12 do memorial (pipeline no GitHub Actions).

---

#### [DOC-014] README completo + captura das evidências do memorial

**Labels:** `tipo:docs` `area:setup` `prioridade:media`
**Depende de:** UI-012, MCP-015, OPS-013

**Contexto:** o repositório público é a fonte das figuras citadas no memorial
(Figuras 1, 2, 3, 6, 8, 9 e 12) e evidência do processo de construção.

**Escopo:**
- [ ] README: visão geral, arquitetura, setup (`docker compose up`), variáveis de ambiente,
      execução dos testes, uso da API (exemplos de requisição) e visualização
- [ ] Seção **"Como rodar localmente"**: passo a passo desde o clone limpo
      (`cp .env.example .env` → `docker compose up` → seed → abrir a UI)
- [ ] Seção **"Credenciais"**: cada variável do `.env` com a fonte para obtê-la —
      chaves da API Onshape criadas no Developer Portal (https://dev-portal.onshape.com;
      guia oficial: https://onshape-public.github.io/docs/auth/apikeys/); credenciais do
      Neo4j e API Key da própria aplicação definidas pelo usuário no `.env`
- [ ] Modo de demonstração **sem credenciais Onshape**: `npm run seed` carrega a fixture
      do modelo `exemplo_neo4j` no Neo4j (verificação do orientador sem conta no Onshape)
- [ ] Pasta `docs/figuras/` com as capturas numeradas conforme o memorial
- [ ] Link público do modelo Onshape `exemplo_neo4j` documentado
- [ ] Documentar a configuração de um cliente MCP para usar as ferramentas do servidor
      (critério E4 do escopo)

**Critérios de aceite:**
- Um desenvolvedor novo consegue subir e testar o projeto apenas seguindo o README
- O orientador consegue visualizar o grafo de demonstração **sem possuir chaves do
  Onshape** (fluxo `docker compose up` + `npm run seed`)

---

## 8. Ordem de execução sugerida

```
SETUP-001 ─┬─> BDD-002 ──> ONS-004 ──> ONS-005 ─┐
           └─> OPS-003 ─┐                       ├─> DB-008 ─┐
DB-006 ─────────────────┴─> DB-007 ──> DB-009 ──┘           ├─> API-010 ─> SEC-011
                                          │                 │        └───> UI-012
                                          └─> OPS-013 <─────┘
DB-007 + DB-008 ──────> MCP-015
UI-012 + MCP-015 + OPS-013 ──> DOC-014
```

Prioridade de entrega: **M1 → M2 → M3 → M4 → M5 → M6**, com DB-006 podendo ser
antecipada em paralelo ao M2.
