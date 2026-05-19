# Cartografia Floaters

Responsavel pelos controles flutuantes que orbitam o mapa sem virar parte do
canvas: minimap, busca, lentes visuais, zoom e botoes de retorno.

Floaters sao navegacao e orientacao. Eles nao sao fonte canonica, nao carregam
arquivo, nao fazem polling e nao escrevem no Vault ou no repo. A trilha de
localizacao da Cartografia vive no TopBar global e usa `breadcrumbModel.ts`.

## Arquivos ativos

- `CartographyFloaters.tsx`: composition root dos controles flutuantes.
- `Minimap.tsx`: lista de continentes, estado recolhido e "voce esta aqui".
- `minimapModel.ts`: persistencia do minimap e label de source.
- `breadcrumbModel.ts`: modelo puro da trilha semantica publicada no TopBar.
- `VisualLensToolbar.tsx`: seletor de lentes `flow`, `relations`, `risk`,
  `recent` e `evidence`.
- `ZoomControls.tsx`: zoom, fit e volta ao universo.

## Pode

- Navegar entre regioes do grafo.
- Colapsar controle visual local.
- Ler preferencias locais via `state/browserStorage.ts`.
- Receber callbacks da composition root.

## Nao pode

- Buscar dados do backend.
- Ler markdown real.
- Abrir arquivo externo diretamente.
- Criar estado global proprio fora de preferencias locais.
- Esconder path, source ou estado de erro do inspector.

## Regras

- Cada floater deve ser pequeno e focado.
- Persistencia local precisa passar por `state/browserStorage.ts`.
- Acoes externas precisam ir por `source/` ou por callbacks vindos da surface.
- Controles iconicos precisam de `title` e `aria-label`.
