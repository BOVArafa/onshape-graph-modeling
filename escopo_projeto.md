# Escopo de Projeto — OnshapeGraphModeling

**Documento:** Especificação de escopo e requisitos (SOW)
**Solicitante:** Consultoria de engenharia de produto (projetos de equipamentos industriais em CAD paramétrico)
**Desenvolvedor responsável:** Rafael Augusto Bova
**Versão:** 1.0 — 10/11/2026
**Status:** Aprovado para desenvolvimento

---

## 1. Contexto de negócio

A consultoria desenvolve e mantém projetos mecânicos (flanges, tubulações, conjuntos aparafusados, skids) no **Onshape**, CAD paramétrico em nuvem. O conhecimento de engenharia desses projetos — quais peças compõem cada montagem, de que material são, como se restringem entre si, quais componentes se repetem entre produtos — está **aprisionado dentro do CAD**: só é acessível abrindo cada documento, manualmente, por quem tem licença e conhece a ferramenta.

Isso gera três dores recorrentes:

1. **Perguntas simples custam caro.** "Em quantos conjuntos usamos o parafuso M16x60?", "quais peças de ASTM A193 existem no projeto X?" — hoje, respondê-las exige abrir montagens uma a uma.
2. **Impacto de mudanças é invisível.** Alterar uma peça compartilhada entre subconjuntos exige descobrir, no braço, onde ela é usada.
3. **Os dados não alimentam nada.** Orçamento, compras e as iniciativas de IA da empresa não conseguem consumir a estrutura dos produtos de forma programática.

A estrutura de um modelo CAD paramétrico é, por natureza, um **grafo direcionado**: documentos contêm montagens, montagens contêm submontagens e peças (com reuso — a mesma peça em vários lugares), e restrições de montagem (*mates*) ligam peças entre si. A solução deve representar essa estrutura no formato que ela realmente tem.

## 2. Objetivo

Construir um serviço que **extrai a estrutura de produtos do Onshape via API e a persiste como grafo no Neo4j**, expondo-a por uma API REST própria, uma interface web de exploração visual e uma interface MCP para consumo por assistentes de IA.

**Resultado esperado:** qualquer pessoa autorizada (ou sistema) responde em segundos perguntas estruturais sobre os produtos, sem abrir o CAD.

## 3. Entregáveis

| # | Entregável | Descrição |
|---|-----------|-----------|
| E1 | Serviço de sincronização | API REST (Node.js + Express) que autentica no Onshape, extrai a estrutura de um documento e a persiste no Neo4j |
| E2 | Base de grafo modelada | Modelo de dados Neo4j com constraints, populável e consultável em Cypher |
| E3 | Interface web | Página de exploração visual do grafo (busca, filtros, detalhes de nó) |
| E4 | Servidor MCP | Ferramentas MCP expondo consultas do grafo a clientes de IA |
| E5 | Suíte de testes | Cenários BDD executáveis (unitários e integração) com relatório e cobertura |
| E6 | Empacotamento e CI | Docker Compose para subir o sistema completo; pipeline de CI executando a suíte a cada push |
| E7 | Documentação | README com arquitetura, setup e operação |

## 4. Requisitos funcionais

### RF-01 — Autenticação no Onshape
O serviço autentica na API REST do Onshape por API Key com assinatura de requisição (HMAC-SHA256), com credenciais fornecidas por variáveis de ambiente. Nenhuma credencial em código ou repositório.

### RF-02 — Extração da estrutura de um documento
Dado o identificador de um documento Onshape, o serviço obtém sua definição de montagem (`rootAssembly`, `subAssemblies`, instâncias e *mates*) e a transforma em nós e relacionamentos:

- **Nós:** `Document`, `Assembly`, `Part`, `Property` — todos com identificador único estável (o id da fonte).
- **Relacionamentos:** `CONTAINS` (hierarquia de contenção), `HAS_PROPERTY` (metadados de peça: material, dimensões), `LINKS_TO` (referências entre documentos vinculados), `MATES_WITH` (restrições de montagem entre peças).
- Peças reutilizadas em múltiplas submontagens são **um único nó** com múltiplas arestas de entrada (deduplicação por id).

### RF-03 — Persistência idempotente
`POST /map/:documentId` sincroniza o documento com o grafo. Reexecuções **atualizam** o grafo existente sem duplicar nós (upsert via `MERGE`), numa única transação: ou o documento inteiro entra, ou nada entra.

### RF-04 — Consulta da estrutura
`GET /map/:documentId` devolve nós e relacionamentos do documento em JSON, pronto para consumo pela interface web ou por terceiros.

### RF-05 — Remoção
`DELETE /map/:documentId` remove o subgrafo completo do documento (`DETACH DELETE`), sem afetar outros documentos.

### RF-06 — Exploração visual
Interface web (servida pelo próprio serviço) que renderiza o grafo de um documento de forma interativa: nós coloridos por tipo, arestas rotuladas por relacionamento, zoom e arraste; **busca** por nome/id com destaque do nó; **filtro** por tipo de nó; **painel de detalhes** exibindo propriedades e vizinhos do nó selecionado.

### RF-07 — Interface MCP
Servidor MCP expondo no mínimo três ferramentas sobre o grafo: `get_assembly_tree(documentId)`, `find_parts_by_property(propriedade, valor)` e `count_parts_by_material()`. Deve funcionar com um cliente MCP padrão de mercado.

## 5. Requisitos não-funcionais

- **RNF-01 · Linguagem e plataforma:** Node.js LTS, JavaScript, Express.
- **RNF-02 · Qualidade:** requisitos críticos especificados como cenários BDD (Gherkin) executáveis via Cucumber. Testes de integração rodam contra Neo4j **efêmero** (Testcontainers) — nunca contra base compartilhada. Relatório HTML de execução + cobertura de código.
- **RNF-03 · Segurança:** rotas de escrita protegidas por API key própria; headers de segurança (helmet); limitação de taxa de requisições; validação de parâmetros de entrada; consultas Cypher exclusivamente parametrizadas.
- **RNF-04 · Integridade de dados:** constraint de unicidade sobre o id de cada tipo de nó no Neo4j.
- **RNF-05 · Operação:** sistema completo (API + Neo4j) sobe com um comando (`docker compose up`). Pipeline de CI executa a suíte de testes a cada push, com status visível no repositório.
- **RNF-06 · Resiliência de desenvolvimento:** testes não dependem da disponibilidade da API do Onshape — respostas reais são capturadas como *fixtures* versionadas.
- **RNF-07 · Arquitetura:** separação em camadas (rotas → serviços → repositório de grafo). A camada de acesso ao grafo é única e reutilizada pela API REST e pelo servidor MCP.

## 6. Critérios de aceitação (amostra vinculante)

Os cenários abaixo são parte do contrato e devem constar da suíte BDD:

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

Critérios adicionais de aceite por entregável: E3 — um usuário localiza uma peça por nome e vê seus vizinhos em até 3 interações; E4 — um cliente MCP lista as ferramentas e obtém a árvore de um documento real; E6 — clone limpo do repositório + `docker compose up` + suíte verde, sem passos manuais além do `.env`.

## 7. Fora de escopo (nesta fase)

- Sincronização automática/agendada ou por webhook (a sincronização é sob demanda).
- Escrita de volta no Onshape (o fluxo é somente leitura do CAD).
- Autenticação multiusuário, perfis e SSO na interface web.
- Mapeamento de features paramétricas finas (equações, variáveis, sketches) — o grafo desta fase cobre contenção, propriedades e mates.
- Alta disponibilidade e deploy em nuvem gerenciada (o alvo é execução local/on-premise via Compose).

## 8. Premissas e dependências

- Conta Onshape com acesso de desenvolvedor e par de chaves de API ativo.
- Documentos de teste representativos disponíveis (ao menos um assembly com submontagens, peça reutilizada e mates).
- Limites de uso da API do Onshape (plano gratuito) são suficientes para sincronização sob demanda.
- Neo4j Community Edition atende ao volume desta fase (dezenas de documentos, milhares de nós).

## 9. Riscos conhecidos

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Assinatura HMAC da API Onshape é sensível a detalhes de formatação | Bloqueio da integração | Validar requisições no API Explorer antes de codificar; smoke test isolado |
| Estrutura do JSON de assemblies mais profunda/variada que o esperado | Retrabalho no mapeador | Mapeador como função pura testada sobre fixtures reais crescentes |
| Indisponibilidade/limites da API externa durante desenvolvimento | Atraso em testes | Fixtures versionadas; testes não tocam a rede (RNF-06) |
| Volume de grafo maior que o previsto na interface web | Degradação visual | Renderização por documento (não do grafo inteiro); filtros por tipo |

## 10. Definição de pronto (DoD do projeto)

O projeto é considerado entregue quando: todos os RF implementados e cobertos por cenários BDD verdes; RNF verificáveis demonstrados (compose único, CI verde, relatório de cobertura, constraints ativas); os critérios de aceitação da seção 6 passam contra um documento Onshape real; e a documentação permite que um desenvolvedor terceiro suba e opere o sistema sem auxílio.
