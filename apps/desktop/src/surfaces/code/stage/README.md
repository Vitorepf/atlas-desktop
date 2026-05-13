# Atlas Code Main Stage

Esta pasta contem o palco principal da cabine Code.

Regra principal:

```text
MainStage mostra o trabalho atual. Composer permanece estavel.
```

## Responsabilidades

- `MainStage.tsx`: host do modo ativo e composer.
- `mainStageRegistry.tsx`: modos internos do palco.
- `mainStageTypes.ts`: contrato de contexto.
- `ConversationPanel.tsx`: conversa/thread da obra.
- `ComposerPanel.tsx`: entrada principal do operador.
- `SddMini.tsx`: resumo visual de etapas SDD.

## Modos esperados

| Modo | Papel |
|---|---|
| `conversation` | direcao natural da obra |
| `spec` | leitura/critica do SDD |
| `plan` | plano executavel e packets |
| `diff` | review de patch |
| `replay` | auditoria de receipt/evidence |
| `repair` | recuperacao de falha/gate |

## Contrato

- Modo novo entra por `mainStageRegistry.tsx`.
- Composer nao desaparece ao trocar modo.
- Toda mensagem enviada precisa estar ligada a Obra/thread real ou ficar em
  estado pendente honesto.
- O palco nao deve manipular RightRail, terminal ou grid global.

## Anti-patterns

- Fazer um modo ocupar a tela inteira e esconder governanca.
- Criar conversa local falsa quando backend rejeitar envio.
- Usar o palco como lugar para logs longos que pertencem a Evidence/Terminal.

