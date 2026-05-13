# Atlas Cartografia Surface

Esta pasta e o destino canonico da fase 2 da Cartografia.

Regra principal:

```text
Cartografia e leitura navegavel da verdade. Ela nunca inventa, nunca sincroniza
copia e nunca escreve na fonte.
```

## Estado atual

A implementacao real ainda esta em:

```text
apps/desktop/src/components/cartografia/
```

Esta pasta existe para travar o contrato de migracao. Durante a fase 2, os
modulos devem ser movidos para ca em passos pequenos e verificaveis.

## Subareas obrigatorias

| Pasta | Responsabilidade |
|---|---|
| `layout/` | grid, inspector/canvas, resize e colapso |
| `state/` | graph, recent changes, note cache e navegacao |
| `viewport/` | pan, zoom, fit, transform e gestos |
| `map/` | atoms, trails, geometry, lenses e relacoes |
| `scenes/` | universe, system, flow, gear e subflow |
| `inspector/` | source, ficha, markdown real, actions e empty states |
| `timeline/` | mudancas recentes reais |
| `search/` | busca local e navegacao por resultado |
| `source/` | abrir/revelar/copiar path read-only |
| `styles/` | CSS modular da Cartografia |

## Anti-patterns

- Nova feature grande em `components/cartografia/`.
- `CartografiaSurface.tsx` como arquivo central de toda logica.
- `Inspector.tsx` como deposito de todo painel lateral.
- CSS monolitico crescendo sem limite.
- Mostrar mock como se fosse fonte real.
- Escrever no repo ou Vault pela Cartografia.
- Usar agente como fonte de verdade.

## Validacao minima

Sempre que a fase 2 mover uma peca:

```bash
npm run build
git diff --check
```

Quando tocar bridge/adapters:

```bash
cargo check --workspace
```
