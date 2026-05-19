# Cartografia Map

Responsavel por atoms, trails, geometry, visual lenses e relacoes visuais.

Arquivos ativos:

- `CartographyWorld.tsx`: moldura transformavel do mundo.
- `WorldSceneSwitch.tsx`: troca de cenas sem misturar transform/layout.
- `WorldSceneRenderers.tsx`: adaptadores de props entre o switch e cada cena.
- `worldSceneTypes.ts`: contratos de props para troca/renderizacao de cenas.
- `worldSceneModel.ts`: constantes e derivacoes puras para troca de cenas.
- `worldModel.ts`: classes e style puro do mundo.
- `Atom.tsx`: bloco visual atomico de node.
- `AtomVariants.tsx`: conteudo visual de atom pipeline/default.
- `atomStyle.ts`: style posicional do atom no canvas.
- `Trails.tsx`: render SVG das linhas derivadas de relacoes reais.
- `TrailPrimitives.tsx`: marcadores, beacons, gates e vessels das trilhas.
- `useTrailPaths.ts`: observa DOM/layout e recalcula paths.
- `trailGeometry.ts`: orquestracao do calculo de paths.
- `trailRouting.ts`: roteamento deterministico das conexoes.
- `trailRouteModel.ts`: endpoints, spans, gates, beacons e peso de pintura.
- `trailVisibility.ts`: regra de visibilidade por lente visual e foco.
- `trailShapes.ts`: shapes SVG puros usados pelas trilhas.
- `trailLanes.ts`: separacao de rotas sobrepostas em lanes visuais.
- `trailMotion.ts`: duracao, delay e ids de animacao.
- `trailPathBuilders.ts`: builders puros de SVG path.
- `trailDom.ts`: leitura controlada de DOM para medir atoms.
- `trailTypes.ts`: contratos locais de geometria.
- `atomModel.ts`: classes/estado derivado do atom.
- `useAtomActivation.ts`: protocolo single-click/double-click.
- `AtomSourceLine.tsx`: source authority visual do atom.
- `layout.ts`: geometria canonica do pipeline e lanes.

Toda linha precisa vir de `connections`, `semanticGraph.relations` ou relacao
normalizada. Nada aqui busca markdown ou abre arquivo externo.

Regras:

- `Atom.tsx` renderiza; regra derivada vai para `atomModel.ts`.
- variantes internas de atom ficam em `AtomVariants.tsx`.
- style posicional do atom fica em `atomStyle.ts`.
- `CartographyWorld.tsx` nao escolhe detalhes internos de cena; isso fica em
  `WorldSceneSwitch.tsx`.
- `WorldSceneSwitch.tsx` decide qual cena esta ativa; montagem de props de cada
  cena fica em `WorldSceneRenderers.tsx`.
- contratos de cena ficam em `worldSceneTypes.ts`, nao inline no JSX.
- ids canonicos usados por cenas ficam em `worldSceneModel.ts`.
- `Trails.tsx` renderiza SVG; medicao/roteamento nao entram nele.
- primitivas animadas das trilhas ficam em `TrailPrimitives.tsx`.
- `trailRouting.ts` decide rota; path string cru fica em `trailPathBuilders.ts`.
- regras puras de span, gate e endpoint ficam em `trailRouteModel.ts`.
- regra de visibilidade fica em `trailVisibility.ts`.
- shape SVG reutilizavel fica em `trailShapes.ts`.
- Todo helper de mapa deve ser puro, exceto `trailDom.ts`.
