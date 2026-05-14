# Atlas Code Surface

Esta pasta contem a cabine operacional `Code` do Atlas Desktop.

Regra principal:

```text
components/ guarda somente fachadas legadas.
surfaces/code/ guarda a implementacao real e escalavel da cabine Code.
```

## Slots estaveis

`CodeSurfaceLayout` define os slots que nao devem ser quebrados:

- `obra`: intent e obra ativa;
- `left`: navegacao operacional;
- `stage`: trabalho principal;
- `right`: governanca, plano, verificacao e evidencia;
- `terminal`: PTY real.

Novas features entram em um slot existente ou em um registry interno.

## Registries atuais

- `leftRail/leftRailRegistry.tsx`: secoes da navegacao esquerda.
- `panels/rightRailRegistry.tsx`: tabs `Plan`, `Verify`, `Evidence`.
- `stage/mainStageRegistry.tsx`: modo unico `forge` do palco principal.

## Boundaries atuais

- `CodeSurface.tsx`: compoe os slots com dados do bridge.
- `CodeSurfaceLayout.tsx`: contrato de slots.
- `obra/ObraBar.tsx`: boundary de intent/obra ativa.
- `leftRail/LeftRail.tsx`: host da navegacao operacional.
- `stage/MainStage.tsx`: host do palco de trabalho.
- `panels/RightRail.tsx`: host da governanca operacional.
- `terminal/TerminalDock.tsx`: boundary para todo trabalho futuro de terminal.
- `terminal/`: tabs, sessao xterm, protocolo OSC, sizing e status operacional.

## Contrato Forge

Atlas Code SCOR-1 e a surface desktop de `programming.forge`. O composer e o
bridge devem enviar toda intencao com `surface_id=atlas_code`,
`flow_id=programming.forge`, `routing_task=forge` e
`programming_profile=forge`. Spec, plan, verify, evidence, replay e repair sao
etapas/artefatos do Forge, nao modos alternativos da surface.

## Anti-patterns

- Nao adicionar nova feature grande diretamente em `App.tsx`.
- Nao importar de `components/` dentro de `surfaces/code/`.
- Nao adicionar novos paineis diretamente em `RightRail.tsx`.
- Nao adicionar novas secoes diretamente em `LeftRail.tsx`.
- Nao misturar prompt/PTY protocol dentro de componentes de layout.
- Nao mostrar dados mockados como se fossem dados reais.
