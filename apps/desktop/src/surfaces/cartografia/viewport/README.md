# Cartografia Viewport

Responsavel por pan, zoom, fit, reset, transform e gestos do canvas.

Arquivos ativos:

- `useCartografiaViewport.ts`: composition root de transform e comandos.
- `useSceneAutoFit.ts`: refit semantico quando a cena ativa muda.
- `viewportMath.ts`: matematica pura de zoom/fit.
- `useViewportPanBindings.ts`: eventos mouse/wheel e drag.
- `viewportInteraction.ts`: protocolo de interacao, no-pan e fator de zoom.
- `viewportTypes.ts`: contratos locais do viewport.

Nao pode saber o que e repo, Vault, note, source ou inspector.

Regras:

- `viewportMath.ts` permanece puro e sem DOM.
- `useSceneAutoFit.ts` observa apenas mudancas semanticas de cena.
- `viewportInteraction.ts` guarda regras de interacao reutilizaveis.
- `useViewportPanBindings.ts` conecta eventos, mas nao define contrato visual.
