# Atlas Code Main Stage

Esta pasta contem o palco principal da cabine Code.

Regra principal:

```text
MainStage mostra o trabalho atual. Composer permanece estavel.
```

## Responsabilidades

- `MainStage.tsx`: host do modo Forge e composer.
- `mainStageRegistry.tsx`: registry do modo Forge unico.
- `mainStageTypes.ts`: contrato de contexto.
- `ConversationPanel.tsx`: conversa/thread da obra.
- `ComposerPanel.tsx`: entrada principal do operador.
- `SddMini.tsx`: resumo visual de etapas SDD.

## Modo unico

Atlas Code SCOR-1 nao possui modos `conversation`, `spec`, `plan`, `diff`,
`replay` ou `repair` como escolhas de surface. Ele possui um unico modo:
`forge`. Spec, plan, diff, replay e repair sao artefatos/etapas governadas
dentro do fluxo `programming.forge`.

| Modo | Papel |
|---|---|
| `forge` | Surface desktop para `programming.forge`, da intencao ate evidence/learning/cartografia |

## Contrato

- Modo novo nao entra em Atlas Code; novas visoes entram como painel,
  artefato, etapa SDD ou evidencia do Forge.
- Composer nao desaparece ao trocar modo.
- Toda mensagem enviada precisa estar ligada a Obra/thread real ou ficar em
  estado pendente honesto.
- O palco nao deve manipular RightRail, terminal ou grid global.

## Anti-patterns

- Fazer um modo ocupar a tela inteira e esconder governanca.
- Criar conversa local falsa quando backend rejeitar envio.
- Usar o palco como lugar para logs longos que pertencem a Evidence/Terminal.
