# Cartografia Scenes

Responsavel pelas cenas navegaveis:

- `universe`
- `system`
- `flow`
- `gear`
- `subflow`

Scene nova deve entrar nesta pasta com props tipadas e dado ja normalizado pelo
state/view model. Scene nao pode inventar node quando a fonte real estiver
ausente.

Arquivos ativos:

- `UniverseScene.tsx`
- `SystemScene.tsx`
- `SystemCard.tsx`
- `systemSceneModel.ts`
- `FlowScene.tsx`: composition da cena do pipeline.
- `FlowStageFrame.tsx`: corredores, fases e moldura operacional.
- `FlowPipeline.tsx`: atoms centrais do Atlas AI Kernel.
- `FlowLanes.tsx`: lanes laterais e sinais agregados.
- `FlowLaneRegion.tsx`: render de uma lane lateral.
- `flowModel.ts`: constantes e selectors determinísticos da cena.
- `flowLaneModel.ts`: view model puro das lanes laterais.
- `flowTypes.ts`: contratos locais da cena.
- `GearScene.tsx`
- `GearHeader.tsx`
- `GearSatellites.tsx`
- `GearFicha.tsx`
- `GearActions.tsx`
- `gearModel.ts`
- `gearTypes.ts`
- `SubflowScene.tsx`

Regras:

- cena nao faz fetch;
- cena nao abre arquivo externo;
- cena nao calcula source authority;
- cena pode desenhar estado vazio, mas sempre de forma honesta;
- cena de sistema deriva filhos semanticos em `systemSceneModel.ts`;
- lane lateral deriva classe/sinais em `flowLaneModel.ts`, nao inline no JSX;
- qualquer cena acima de 220 linhas precisa ser quebrada antes de receber nova feature.
