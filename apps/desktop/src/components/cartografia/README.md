# Cartografia Legacy Components

Esta pasta nao contem mais a implementacao ativa da Cartografia.

Regra principal:

```text
components/cartografia/ esta congelado.
A implementacao real vive em apps/desktop/src/surfaces/cartografia/.
```

## Por que esta pasta existe

Ela preserva o historico da migracao e impede que agentes adicionem features
no caminho antigo por engano. Se um import novo apontar para esta pasta, trate
como regressao arquitetural.

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
- Nao misturar path repo/vault dentro de componente visual; use sempre
  `surfaces/cartografia/source/`.

## Permitido

- Atualizar este README.
- Remover a pasta quando nao houver mais referencia historica util.
- Criar fachada temporaria somente se um teste legado exigir, com comentario
  apontando para `surfaces/cartografia/`.

## Surface canonica

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
