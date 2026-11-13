# Onshape Graph Modeling

Serviço que extrai a estrutura de modelos 3D do [Onshape](https://www.onshape.com/) (CAD paramétrico em nuvem) via API e a persiste como **grafo no Neo4j**, expondo-a por uma API REST, uma interface web de exploração visual e um servidor MCP para consumo por assistentes de IA.

Projeto de conclusão da Pós-Graduação em Desenvolvimento Full Stack da PUCRS — autor: **Rafael Augusto Bova**.

## Por quê

A estrutura de um produto em CAD paramétrico — quais peças compõem cada montagem, de que material são, como se restringem entre si, quais componentes se repetem — fica aprisionada dentro da ferramenta: só é acessível abrindo cada documento, manualmente, por quem tem licença. Perguntas simples ("em quantos conjuntos usamos o parafuso M16x60?") custam caro, e os dados não alimentam orçamento, compras nem iniciativas de IA.

Essa estrutura é, por natureza, um **grafo direcionado acíclico (DAG)**: documentos contêm montagens, montagens contêm submontagens e peças (com reuso), e restrições de montagem (*mates*) ligam peças entre si. Este projeto representa a estrutura no formato que ela realmente tem.

A especificação completa está em [`escopo_projeto.md`](escopo_projeto.md); o plano de execução, em [`planejamento-tcc.md`](planejamento-tcc.md).

## Status do projeto

**Em desenvolvimento.** O backlog completo está nas [issues](../../issues) (#1 a #15), organizado em 6 milestones:

| Milestone | Conteúdo | Issues |
| --- | --- | --- |
| M1 — Fundação do projeto | Scaffold Express, harness BDD, Docker Compose | #1 #2 #3 |
| M2 — Integração com a API do Onshape | Autenticação HMAC-SHA256, cliente de assemblies | #4 #5 |
| M3 — Modelagem e persistência em grafo | Modelo ER, camada Neo4j, mapeador DFS, Testcontainers | #6 #7 #8 #9 |
| M4 — API REST | Rotas `/map/:documentId`, middlewares de segurança | #10 #11 |
| M5 — Camadas de apresentação e consumo | Interface vis-network, servidor MCP | #12 #15 |
| M6 — DevOps e evidências | CI no GitHub Actions, documentação final | #13 #14 |

> As seções "Como rodar" e "Testes" descrevem o fluxo-alvo e ficam operacionais com a conclusão do M1 (issues #1–#3).

## Arquitetura

Aplicação Node.js + Express em camadas (padrão MVC, sem frameworks adicionais):

```
src/
├── controllers/   # Camada de controle: rotas REST, validação de parâmetros
├── services/      # Camada de serviços: auth HMAC, cliente Onshape, mapeador (DFS + dedup)
├── data/          # Camada de dados: driver Neo4j, repositórios, Cypher parametrizado
├── middleware/    # API Key, rate limit, tratamento de erros
└── public/        # Camada de apresentação: visualização interativa (vis-network)
features/          # Cenários BDD (Gherkin, pt-BR) + step definitions
```

Fluxo: `POST /map/:documentId` → autentica no Onshape (HMAC-SHA256) → busca a definição do assembly → travessia **DFS recursiva** com deduplicação de peças por hash map → persistência **idempotente** no Neo4j (`MERGE`, transação única). `GET /map/:documentId` devolve nós/arestas em JSON; `DELETE` remove o subgrafo (`DETACH DELETE`).

### Modelo de grafo

| Nó | Descrição | Chave |
| --- | --- | --- |
| `Document` | Projeto/modelo 3D no Onshape | `documentId` |
| `Assembly` | Estrutura que organiza os componentes | `elementId` |
| `Part` | Componente individual (deduplicado) | `partId` |
| `Property` | Metadado técnico de uma peça | `(partId, name)` |

| Relacionamento | Semântica |
| --- | --- |
| `CONTAINS` | Hierarquia de contenção (Document/Assembly → Assembly/Part) |
| `HAS_PROPERTY` | Metadados da peça |
| `LINKS_TO` | Referências entre documentos |
| `MATES_WITH` | Restrição de montagem entre peças — a aresta transversal que torna o grafo um DAG, e não uma árvore |

### Stack

| Camada | Tecnologia |
| --- | --- |
| Runtime / API | Node.js LTS + Express (JavaScript) |
| Banco de dados | Neo4j (driver oficial, Cypher parametrizado) |
| Testes | Cucumber.js (BDD/Gherkin) + Testcontainers (Neo4j efêmero) |
| Relatórios | cucumber-html-reporter, c8 (cobertura) |
| Segurança | HMAC-SHA256 (`crypto` nativo), helmet, express-rate-limit, API Key |
| Frontend | vis-network (servido pelo próprio Express) |
| Interface IA | Servidor MCP (Model Context Protocol) |
| DevOps | Docker, Docker Compose, GitHub Actions |

## Como rodar localmente

> Disponível após o M1. O projeto roda inteiramente local — não há deploy em nuvem (ver seção 7 do escopo).

Pré-requisitos: [Docker](https://docs.docker.com/get-docker/) e [Node.js LTS](https://nodejs.org/).

```bash
git clone git@github.com:BOVArafa/onshape-graph-modeling.git
cd onshape-graph-modeling
cp .env.example .env    # preencha as variáveis (ver "Credenciais")
docker compose up       # sobe API + Neo4j
```

A interface de visualização fica disponível na porta configurada (`PORT`) e o Neo4j Browser na porta mapeada no `docker-compose.yml`.

### Modo de demonstração (sem conta no Onshape)

Para explorar o grafo **sem credenciais do Onshape** — por exemplo, para a verificação do orientador:

```bash
docker compose up
npm run seed            # carrega a fixture do modelo "Dumper Trailer" no Neo4j
```

Depois, abra a interface web e informe o `documentId` de demonstração. O seed usa respostas reais da API do Onshape capturadas como fixtures versionadas — os testes também nunca tocam a rede.

## Credenciais

Todas as variáveis ficam no `.env` (nunca versionado — use o `.env.example` como template):

| Variável | O que é | Onde obter |
| --- | --- | --- |
| `ONSHAPE_ACCESS_KEY` / `ONSHAPE_SECRET_KEY` | Par de chaves da API do Onshape (assinatura HMAC-SHA256) | Crie em [dev-portal.onshape.com](https://dev-portal.onshape.com) → *API keys*. Guia oficial: [onshape-public.github.io/docs/auth/apikeys](https://onshape-public.github.io/docs/auth/apikeys/). Requer conta Onshape (o plano gratuito atende). |
| `NEO4J_USER` / `NEO4J_PASSWORD` | Credenciais do banco local | Definidas por você; o Docker Compose as repassa ao container do Neo4j. |
| `API_KEY` | Token que protege as rotas de escrita da própria API | Gere um valor aleatório, ex.: `openssl rand -hex 32`. |
| `PORT` | Porta do servidor Express | Qualquer porta livre (padrão sugerido: 3000). |

As chaves do Onshape só são necessárias para **sincronizar** documentos reais (`POST /map/...`). Consulta, visualização e o modo de demonstração funcionam sem elas.

## Integração com o Onshape

O modelo de referência do projeto é o **["Dumper Trailer"](https://cad.onshape.com/documents/492ae2574a348180fabf6fff/w/9e5ef30dc76b6a87db213fb3/e/f4b4556f2bfab459c2c18ca2)** (público — abre no navegador sem conta). Com as chaves no `.env`, a chamada real à API pode ser reproduzida assim:

```bash
node -r dotenv/config -e "
const { createOnshapeClient } = require('./src/services/onshapeClient');
const client = createOnshapeClient();
client
  .getDocument('492ae2574a348180fabf6fff')
  .then((document) => console.log(document.name)); // Dumper Trailer
"
```

Os testes **nunca** chamam a API real: usam respostas capturadas desse modelo, versionadas em [`fixtures/onshape/`](fixtures/onshape/README.md).

## Testes

> Disponível após o M1.

```bash
npm test                # suíte BDD completa (Cucumber.js)
npm run test:coverage   # cobertura via c8
```

Os testes de integração sobem um **Neo4j efêmero via Testcontainers** — nenhuma instalação prévia do banco é necessária, apenas Docker. Cenários escritos em Gherkin (pt-BR) em `features/`.

## Fluxo de desenvolvimento

- **BDD-first**: todo requisito nasce como cenário Gherkin antes do código.
- **Uma branch por issue**: `feature/<ID>-<slug>` (ex.: `feature/SETUP-001-scaffold-express`).
- **Commits atômicos** referenciando a issue (`feat: ... (#1)`) e **PR obrigatório** para `main`.
- Issues seguem template com contexto, escopo, critérios de aceite em Gherkin e DoD — ver [`planejamento-tcc.md`](planejamento-tcc.md).

## Documentos do projeto

| Documento | Papel |
| --- | --- |
| [`escopo_projeto.md`](escopo_projeto.md) | Especificação de escopo e requisitos (SOW) — RF, RNF, critérios de aceitação vinculantes |
| [`planejamento-tcc.md`](planejamento-tcc.md) | Backlog, template de issues, grafo de dependências |
| [Issues #1–#15](../../issues) | Execução rastreável do planejamento |
| `docs/figuras/` | Evidências citadas no memorial do TCC (geradas ao longo do desenvolvimento) |

## Licença

[MIT](LICENSE)
