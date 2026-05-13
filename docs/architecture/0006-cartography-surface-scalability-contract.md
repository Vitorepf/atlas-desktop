# ADR-0006 · Atlas Cartografia Surface Scalability Contract

Status: accepted · 2026-05-13

Este documento torna obrigatoria a arquitetura de escala da tela
`Cartografia` do Atlas Desktop. A Cartografia nao pode crescer como um unico
componente visual gigante. Ela e a interface navegavel da verdade canonica:
repo docs oficiais + AtlasVault real + arquivos markdown reais + audit do
grafo. Por isso precisa ser mais rigorosa que um canvas bonito.

Frase canonica:

```text
A Cartografia nao representa uma copia da verdade. Ela le a verdade onde ela
vive e torna essa verdade navegavel, auditavel e verificavel.
```

## Problema

A implementacao atual ja tem uma boa base funcional, mas ainda esta concentrada
em `apps/desktop/src/components/cartografia/`. Isso cria risco de escala:

- `CartografiaSurface.tsx` acumula layout, shortcuts, busca, resize, overlays,
  scenes e composicao;
- `Inspector.tsx` acumula source, ficha, markdown, acoes, timeline e resize;
- `Trails.tsx` concentra muita geometria e relacao visual;
- `cartografia.css` concentra todo o sistema visual em um arquivo unico;
- nao existe README local explicando boundaries, dono de estado, anti-patterns
  e caminho de refatoracao.

Sem contrato, a proxima feature tende a entrar no arquivo mais facil e a tela
vira um monolito visual dificil de validar.

## Decisao

Toda evolucao da Cartografia deve obedecer a este contrato:

```text
features novas entram em surfaces/cartografia/
components/cartografia/ vira legado congelado ate a migracao terminar
```

A fase 2 deve migrar a Cartografia para uma surface modular:

```text
apps/desktop/src/surfaces/cartografia/
  CartografiaSurface.tsx
  README.md
  layout/
  state/
  viewport/
  inspector/
  map/
  scenes/
  timeline/
  search/
  source/
  styles/
```

`components/cartografia/` pode continuar funcionando durante a transicao, mas
nao deve receber feature nova grande.

## Principios nao negociaveis

1. Fonte real sempre aparece.
   Cada peca visual precisa expor `graph_id`, `source`, `source_path` e estado
   de fonte. Se a fonte nao existe, a UI mostra ausencia, nunca conteudo
   inventado.

2. Cartografia e read-only.
   A surface pode abrir arquivo, revelar no Finder, copiar path e navegar. Ela
   nao escreve repo docs, nao escreve no AtlasVault e nao corrige frontmatter.

3. Repo e Vault nao sao sincronizados entre si.
   Repo docs sao autoridade tecnica. AtlasVault e segundo cerebro humano. A
   Cartografia le ambos, mas nao cria uma projecao duplicada.

4. O agente nao e fonte da verdade.
   A UI nao pode mostrar "documentado", "implementado", "sincronizado" ou
   "completo" baseado em frase do agente. Precisa vir de arquivo, frontmatter,
   git, mtime, audit ou endpoint.

5. Estado vazio honesto vence fallback bonito.
   Se `semantic_graph` vier vazio, a tela mostra vazio explicito. Fallback
   legado so pode existir se estiver rotulado como legado e nao parecer fonte
   canonica.

6. Navegacao e dado sao separados.
   Zoom, pan, foco, busca e breadcrumbs nao podem ficar misturados com fetch,
   cache de nota, adapter HTTP ou auditoria.

7. Inspector e leitura de arquivo.
   Inspector nao e painel decorativo; ele mostra o arquivo real, metadata real,
   source real, risco real e proxima acao real.

8. Layout nao pode esconder auditabilidade.
   Minimap, inspector, timeline, busca e canvas podem colapsar, mas nao podem
   remover fonte, path, estado de erro ou origem do dado.

9. Toda relacao visual precisa ter relacao de grafo.
   Linhas, trails, feedback loops e kin highlights precisam vir de
   `connections`, `semanticGraph.relations` ou relacoes normalizadas no client.

10. Cada subarea precisa de README antes de receber feature.
    Se uma pasta nova nasce sem contrato local, a feature esta incompleta.

## Modelo mental da tela

```mermaid
flowchart TB
  Surface["Cartografia Surface"]
  Data["State + Data\nrepo docs + AtlasVault + recent changes"]
  Layout["Layout\ninspector + canvas + floaters"]
  Viewport["Viewport\npan + zoom + fit"]
  Map["Map\natoms + trails + scenes"]
  Inspector["Inspector\nsource + markdown real + audit"]
  Search["Search\nquery + result navigation"]
  Timeline["Timeline\nfile/git/server changes"]
  Source["Source Actions\nopen/reveal/copy only"]

  Surface --> Data
  Surface --> Layout
  Layout --> Viewport
  Viewport --> Map
  Data --> Map
  Data --> Inspector
  Data --> Search
  Data --> Timeline
  Inspector --> Source
```

## Regioes canonicas

| Regiao | Papel | Pode sumir? |
|---|---|---|
| `inspector` | leitura canonica do node, arquivo e audit | Pode colapsar, nao perder estado |
| `resize` | divisoria ajustavel do inspector | Nao, enquanto houver inspector |
| `canvas` | mapa navegavel com pan/zoom | Nao |
| `floaters` | minimap, breadcrumb, busca, lentes, zoom | Podem colapsar individualmente |
| `timeline` | mudancas recentes reais | Pode ficar vazia, nao simulada |

Regra: feature nova precisa declarar uma destas regioes ou criar uma subarea
registrada. Nao existe feature "solta" dentro de `CartografiaSurface.tsx`.

## Estrutura obrigatoria da fase 2

### `layout/`

Responsavel por grid, inspector/canvas, resize, colapso e composicao de slots.

Arquivos esperados:

- `CartografiaLayout.tsx`
- `InspectorColumn.tsx`
- `CanvasRegion.tsx`
- `layoutStore.ts`

Nao pode:

- fazer fetch;
- interpretar frontmatter;
- desenhar atom/trail;
- abrir arquivo externo.

### `state/`

Responsavel por graph, recent changes, note cache e maquina de estados.

Arquivos esperados:

- `useCartografiaData.ts`
- `useCartografiaNavigation.ts`
- `cartografiaStateTypes.ts`
- `cartografiaSelectors.ts`

Nao pode:

- conter JSX;
- manipular DOM;
- importar CSS;
- decidir visual de atom.

### `viewport/`

Responsavel por pan, zoom, fit, transform e gestos.

Arquivos esperados:

- `useCartografiaViewport.ts`
- `viewportMath.ts`
- `viewportTypes.ts`

Nao pode:

- carregar grafo;
- saber o que e repo/vault;
- alterar estado de inspector.

### `map/`

Responsavel por atom, trails, geometry, lenses e realce de relacoes.

Arquivos esperados:

- `MapCanvas.tsx`
- `Atom.tsx`
- `Trails.tsx`
- `trailGeometry.ts`
- `atomViewModel.ts`
- `visualLens.ts`

Nao pode:

- buscar nota;
- abrir arquivo;
- fazer polling;
- escrever no store global diretamente.

### `scenes/`

Responsavel por `universe`, `system`, `flow`, `gear`, `subflow`.

Arquivos esperados:

- `UniverseScene.tsx`
- `SystemScene.tsx`
- `FlowScene.tsx`
- `GearScene.tsx`
- `SubflowScene.tsx`
- `sceneRegistry.ts`

Nao pode:

- implementar layout global;
- duplicar adapters de grafo;
- inventar node quando `semanticGraph` vier vazio.

### `inspector/`

Responsavel por leitura canonica do node focado.

Arquivos esperados:

- `Inspector.tsx`
- `InspectorHeader.tsx`
- `InspectorSource.tsx`
- `InspectorFicha.tsx`
- `InspectorMarkdown.tsx`
- `InspectorActions.tsx`
- `InspectorEmpty.tsx`
- `InspectorResizeToolbar.tsx`

Nao pode:

- escrever arquivo;
- assinar receipt;
- criar proposta sem passar por fluxo/Kernel futuro;
- esconder `source_path`.

### `timeline/`

Responsavel por mudancas recentes.

Arquivos esperados:

- `TimelinePanel.tsx`
- `TimelineFloater.tsx`
- `timelineFormat.ts`

Nao pode:

- simular evento recente;
- misturar mtime com commit sem source;
- atualizar `secondsAgo` como se fosse fonte canonica.

### `search/`

Responsavel por busca local no snapshot carregado.

Arquivos esperados:

- `CartografiaSearch.tsx`
- `searchScoring.ts`
- `searchTypes.ts`

Nao pode:

- disparar fetch global sem contrato;
- navegar para node inexistente;
- esconder quando nao ha resultados.

### `source/`

Responsavel por acoes read-only de fonte.

Arquivos esperados:

- `sourceActions.ts`
- `sourcePath.ts`
- `sourceTypes.ts`

Nao pode:

- escrever;
- mover arquivo;
- criar nota;
- abrir path sem validar `source`.

### `styles/`

Responsavel por dividir `cartografia.css`.

Arquivos esperados:

- `cartografia.css`
- `layout.css`
- `inspector.css`
- `canvas.css`
- `atoms.css`
- `trails.css`
- `floaters.css`
- `responsive.css`

Nao pode:

- conter estilo de Code;
- depender de DOM fora de `.cartografia-surface`;
- criar z-index global sem token/justificativa.

## Contratos de dados obrigatorios

Os tipos vivem em `packages/atlas-domain/src/cartography.ts`.

Qualquer mudanca em payload precisa atualizar:

1. `packages/atlas-domain/src/cartography.ts`;
2. adapter em `apps/desktop/src/lib/bridge.ts`;
3. este ADR ou ADR sucessor;
4. teste/fixture de adapter;
5. UI de erro para campo ausente.

Campos minimos para qualquer node:

| Campo | Obrigatorio | Motivo |
|---|---|---|
| `graphId` | Sim | identidade visual e navegacao |
| `name` ou `graphTitle` | Sim | legibilidade |
| `graphSource` | Sim | repo/vault/missing |
| `sourcePath` | Sim | verificabilidade |
| `missingSource` | Sim | vazio honesto |
| `graphLayer` | Para semantic nodes | zoom semantico |
| `graphParent` | Para semantic nodes | hierarquia |
| `depends/unblocks/flowsTo` | Quando existir | relacoes navegaveis |

## Contrato de source authority

| Conteudo | Fonte canonica | Como UI mostra |
|---|---|---|
| Arquitetura tecnica | repo docs | `source=repo`, path do repo, abrir editor/Finder |
| Segundo cerebro | AtlasVault | `source=vault`, abrir Obsidian/Finder |
| Agregado visual | atlas-server | `source=mixed`, nunca substituir path real |
| Node esperado sem arquivo | contrato/audit | `source=missing`, path esperado e proxima acao |

Regra: `mixed` nao pode ser usado para esconder ausencia de fonte. Se a peca
tem arquivo primario, deve apontar para `repo` ou `vault`.

## Contrato de estados

| Estado | UI obrigatoria |
|---|---|
| `loading` | overlay claro, sem mostrar mock como real |
| `offline` | erro acionavel com endpoint/fonte afetada |
| `empty graph` | mensagem de grafo vazio + audit |
| `missing source` | badge missing + path esperado |
| `note loading` | indicar arquivo sendo carregado |
| `note missing` | nao existe arquivo real |
| `note empty` | arquivo existe, corpo vazio |
| `recent empty` | sem mudancas recentes reais |

## Contrato de performance

Meta operacional:

- pan/zoom nao pode travar com 500 nodes;
- hover nao pode disparar fetch repetido;
- note fetch e lazy e cacheado por `graphId`;
- invalidacao de cache deve usar `modifiedAt` quando existir;
- trails devem recalcular por resize/layout, nao por todo keystroke;
- busca local precisa operar sobre indice normalizado.

Fase 2 deve separar selectors e view models para evitar recomputacao dentro de
componentes grandes.

## Contrato de acessibilidade e operacao

- `Escape` volta um nivel.
- `/` foca busca.
- `0` ajusta o mapa.
- Botoes precisam de `aria-label`.
- Controles iconicos precisam de tooltip.
- Colapsar inspector/minimap nao pode prender foco invisivel.
- Search result precisa ser navegavel por teclado.

## Anti-patterns proibidos

- Adicionar feature nova diretamente em `CartografiaSurface.tsx`.
- Adicionar feature nova diretamente em `Inspector.tsx`.
- Aumentar `cartografia.css` para resolver feature nova sem criar subarea.
- Criar novo fallback visual sem label de "legado" ou "sem fonte".
- Mostrar mock/hardcoded como se fosse dado canonico.
- Tratar Vault como copia da documentacao oficial.
- Fazer Cartografia escrever arquivo.
- Fazer uma action externa sem passar por `source/`.
- Criar path absoluto ad hoc dentro de componente visual.
- Criar z-index global sem escopo `.cartografia-surface`.

## Limites de arquivo para fase 2

Durante a refatoracao, estes limites passam a valer:

| Arquivo | Limite alvo |
|---|---|
| `CartografiaSurface.tsx` | ate 180 linhas |
| `Inspector.tsx` | ate 160 linhas |
| `Trails.tsx` | ate 220 linhas |
| qualquer scene | ate 220 linhas |
| qualquer hook | ate 220 linhas |
| CSS por arquivo | ate 500 linhas |

Se passar do limite, criar subcomponente, selector, primitive ou helper.

## Plano obrigatorio da fase 2

1. Criar `surfaces/cartografia/` com a estrutura deste ADR.
2. Mover `CartografiaSurface.tsx` para a surface nova sem mudar comportamento.
3. Extrair `layout/` e manter screenshot/visual equivalente.
4. Extrair `state/` de `useCartografia`.
5. Extrair `viewport/`.
6. Extrair `inspector/`.
7. Extrair `map/Trails` e geometry.
8. Extrair `search/`, `timeline/`, `source/`.
9. Dividir CSS.
10. Transformar `components/cartografia/*` em fachadas legadas ou remover.

Cada passo precisa passar:

```bash
npm run build
git diff --check
```

Quando tocar bridge/adapters:

```bash
npm run build
cargo check --workspace
git diff --check
```

## Definition of Done da refatoracao

- `apps/desktop/src/surfaces/cartografia/` contem a implementacao real.
- `components/cartografia/` nao recebe feature nova.
- Existem READMEs em todas as subareas.
- `CartografiaSurface.tsx` vira composicao, nao centro de logica.
- Inspector e dividido por responsabilidade.
- CSS deixa de ser monolito.
- State/data/viewport/source/actions ficam separados.
- Nenhum comportamento read-only foi quebrado.
- Nenhum fallback inventado foi introduzido.
- `npm run build` passa.
- `git diff --check` passa.

## Estado atual aceito antes da fase 2

Aceitamos temporariamente:

- implementacao ainda em `components/cartografia/`;
- CSS monolitico;
- `CartografiaSurface.tsx` grande;
- `Inspector.tsx` grande;
- `Trails.tsx` grande;
- polling em vez de SSE.

Mas estas condicoes sao divida tecnica documentada. Elas nao autorizam novas
features grandes no modelo antigo.
