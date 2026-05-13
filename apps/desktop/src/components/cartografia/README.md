# Cartografia Legacy Components

Esta pasta contem a implementacao atual da Cartografia.

Regra principal:

```text
components/cartografia/ esta congelado para features grandes.
A fase 2 deve migrar a implementacao para surfaces/cartografia/.
```

## Por que esta pasta e legado

A Cartografia nasceu como port visual do mockup `atlas-truth-cartography.html`.
Ela ja le fontes reais e possui bons componentes, mas ainda concentra muita
responsabilidade:

- `CartografiaSurface.tsx`: layout, busca, viewport, shortcuts, scenes,
  overlays e composicao;
- `Inspector.tsx`: source, ficha, markdown, acoes, timeline, resize e empty
  states;
- `Trails.tsx`: geometria, relacoes, DOM measurement e SVG;
- `cartografia.css`: todo o sistema visual em um unico arquivo.

Isso e aceitavel apenas como estado transitorio.

## Contrato obrigatorio

Antes de mudar esta area, leia:

- `docs/architecture/0003-cartography-surface.md`
- `docs/architecture/0006-cartography-surface-scalability-contract.md`

## Regras

- Nao adicionar feature grande diretamente aqui.
- Nao aumentar `CartografiaSurface.tsx`, `Inspector.tsx` ou `Trails.tsx` sem
  justificar.
- Nao adicionar fallback hardcoded que pareca dado real.
- Nao escrever arquivo pela Cartografia.
- Nao esconder `source`, `sourcePath` ou `missingSource`.
- Nao misturar path repo/vault dentro de componente visual; use `sourceActions`
  ate a migracao para `surfaces/cartografia/source/`.

## Permitido antes da fase 2

- Correcoes pequenas de bug visual.
- Acessibilidade pontual.
- Ajustes de copy/icone.
- Fix de contrato com backend.
- Preparacao de docs para a migracao.

## Destino da fase 2

```text
apps/desktop/src/surfaces/cartografia/
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
