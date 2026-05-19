# Atlas Desktop Shell

Esta pasta contem a casca global do Atlas Desktop.

Regra principal:

```text
Shell decide moldura global. Surfaces decidem produto.
```

## Responsabilidades

- `AtlasShell.tsx`: classe/layout global consumido pelo CSS.
- `ErrorBoundary.tsx`: fallback visual para crash de surfaces/paneis.
- `SurfaceHost.tsx`: escolhe qual surface de produto renderizar.
- `surfaceRegistry.ts`: registro das surfaces, atalhos e autoridade.
- `topbar/`: barra global com marca, surfaces, kernel, MCP e bridge.

## Contrato

- Nao colocar regra de negocio de Code ou Cartografia no shell.
- Nao fazer surface importar componente legado de `components/` quando existir
  modulo proprio em `shell/` ou `surfaces/`.
- Nao desmontar areas operacionais globais por efeito de estado interno de uma
  surface.
- TopBar mostra saude global; nao executa fluxo de obra, gate, diff ou terminal.
