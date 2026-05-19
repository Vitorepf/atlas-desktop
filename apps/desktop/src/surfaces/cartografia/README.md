# Atlas Cartografia Surface

Esta pasta contem a implementacao canonica da Cartografia no Atlas Desktop.

Regra principal:

```text
Cartografia e leitura navegavel da verdade. Ela nunca inventa, nunca sincroniza
copia e nunca escreve na fonte.
```

## Estado atual

A fase 2 foi iniciada e a implementacao real esta aqui. A pasta antiga
`apps/desktop/src/components/cartografia/` ficou apenas como legado
documentado. Novas features entram nesta surface e precisam respeitar os
boundaries abaixo.

## Arquivos de composicao

- `CartografiaSurface.tsx`: conecta hooks e entrega slots para o layout.
- `CartografiaViewportSlot.tsx`: monta floaters, mundo e overlay dentro do
  viewport.
- `inspector/CartografiaInspectorSlot.tsx`: adapta estado da surface para o
  inspector sem mover regra de leitura para o root.

## Subareas obrigatorias

| Pasta | Responsabilidade |
|---|---|
| `layout/` | grid, inspector/canvas, resize e colapso |
| `state/` | graph, recent changes, note cache e navegacao |
| `viewport/` | pan, zoom, fit, transform e gestos |
| `map/` | atoms, trails, geometry, lenses e relacoes |
| `scenes/` | universe, system, flow, gear e subflow |
| `floaters/` | minimap, breadcrumb, busca, lentes, zoom e controles flutuantes |
| `inspector/` | source, ficha, markdown real, actions e empty states |
| `timeline/` | mudancas recentes reais |
| `search/` | busca local e navegacao por resultado |
| `source/` | abrir/revelar/copiar path read-only |
| `styles/` | CSS modular da Cartografia |

## Anti-patterns

- Nova feature grande em `components/cartografia/`.
- `CartografiaSurface.tsx` como arquivo central de toda logica.
- `CartografiaViewportSlot.tsx` contendo regra de dados, busca ou source.
- `Inspector.tsx` como deposito de todo painel lateral.
- CSS monolitico crescendo sem limite.
- Mostrar mock como se fosse fonte real.
- Escrever no repo ou Vault pela Cartografia.
- Usar agente como fonte de verdade.

## Validacao minima

Sempre que a Cartografia mudar:

```bash
npm run build
git diff --check
```

Quando tocar bridge/adapters:

```bash
cargo check --workspace
```
