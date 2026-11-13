# Fixtures da API do Onshape

Respostas reais da API REST do Onshape, capturadas do modelo público
["Dumper Trailer"](https://cad.onshape.com/documents/492ae2574a348180fabf6fff/w/9e5ef30dc76b6a87db213fb3/e/f4b4556f2bfab459c2c18ca2)
em 2026-11-13. Os testes usam estes arquivos no lugar de chamadas de rede (RNF-06).

| Arquivo | Endpoint | Conteúdo |
| --- | --- | --- |
| `document-dumper-trailer.json` | `GET /api/documents/{did}` | Metadados do documento |
| `assembly-trailer-full.json` | `GET /api/assemblies/d/{did}/w/{wid}/e/{eid}?includeMateFeatures=true` | Assembly completo "Trailer Assembly" (26 subassemblies, 151 peças) — usado também pelo seed de demonstração |
| `assembly-hydraulics-small.json` | `GET /api/assemblies/d/{did}/w/{wid}/e/{eid}?includeMateFeatures=true` | Assembly "Hydraulics Assembly" (3 subassemblies, 13 peças, 15 mates, peças reutilizadas em mais de um conjunto) — fixture de referência dos cenários BDD |
| `parts-dumper-trailer.json` | `GET /api/parts/d/{did}/w/{wid}` | Peças do documento com metadados (`partNumber`, `description`, `state`) |
