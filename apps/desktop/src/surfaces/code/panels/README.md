# Atlas Code Right Rail Panels

Esta pasta contem a coluna operacional direita da tela Code.

Regra principal:

```text
RightRail e governanca: plano, verificacao, evidencia, recibos e gates.
Ele nunca e substituido pelo terminal ou por uma feature auxiliar.
```

## Responsabilidades

- `RightRail.tsx`: host das tabs e selecao de painel.
- `rightRailRegistry.tsx`: lista canonica de panels.
- `rightRailTypes.ts`: contrato compartilhado de contexto.
- `PlanPanel.tsx`: estado de plano, receipt, core local e acao de assinatura.
- `VerifyPanel.tsx`: quality gates e acoes de verificacao.
- `EvidencePanel.tsx`: evidencias e ledger da obra.
- `RightRailPrimitives.tsx`: pequenos blocos visuais compartilhados.

## Contrato

- `Plan`, `Verify` e `Evidence` continuam sempre presentes.
- Novo painel entra pelo registry, nao como `if` hardcoded dentro de
  `RightRail.tsx`.
- Painel novo precisa declarar fonte real, vazio honesto e erro acionavel.
- Nenhum painel pode aplicar diff, assinar receipt ou rodar gate sem chamar o
  bridge/Kernel correto.
- Terminal lateral pode entrar abaixo da coluna, mas nao remove tabs.

## Anti-patterns

- Esconder tabs para ganhar espaco.
- Mostrar contagens ou status sem fonte real.
- Colocar chamada direta de backend dentro de painel visual.
- Misturar layout do terminal com logica de receipts/gates.

