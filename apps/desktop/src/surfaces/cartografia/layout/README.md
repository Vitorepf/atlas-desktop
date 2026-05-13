# Cartografia Layout

Responsavel pelo grid da surface: inspector, resize handle, canvas e slots de
floaters.

Arquivos ativos:

- `CartografiaLayout.tsx`: shell estrutural da surface.
- `CartographyOverlay.tsx`: loading/offline honesto.
- `useInspectorColumn.ts`: state machine da coluna do inspector.
- `useHorizontalResizeDrag.ts`: protocolo reutilizavel de drag horizontal.
- `inspectorLayout.ts`: constantes e persistencia local da coluna.
- `currentLocationLabel.ts`: label humano do ponto atual do mapa.

Nao pode buscar grafo, abrir arquivo, desenhar atom ou interpretar source.

Regras:

- persistencia e clamp da coluna ficam em `inspectorLayout.ts`;
- estado da coluna fica em `useInspectorColumn.ts`;
- eventos globais de resize ficam em `useHorizontalResizeDrag.ts`.
