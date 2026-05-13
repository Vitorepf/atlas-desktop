# Atlas Code Left Rail

Esta pasta contem a navegacao operacional esquerda.

Regra principal:

```text
LeftRail navega obras e sessoes. Nao e file explorer.
```

## Responsabilidades

- `LeftRail.tsx`: host das secoes registradas.
- `leftRailRegistry.tsx`: registro de secoes.
- `leftRailTypes.ts`: contrato de contexto.
- `ObrasSection.tsx`: lista de obras.
- `SessionsSection.tsx`: sessoes em curso/recentes.
- `LeftRailPrimitives.tsx`: blocos visuais compartilhados.
- `leftRailUtils.ts`: formatacao pura.

## Contrato

- Secao nova entra pelo registry.
- A selecao ativa de obra nao pode se perder em colapso/layout futuro.
- Item recente precisa apontar para entidade real: obra, thread, trace,
  evidence ou path.
- Nada nesta pasta cria obra falsa ou thread falsa.

## Anti-patterns

- Virar explorador de arquivos.
- Misturar busca global, terminal e cartografia na mesma lista.
- Esconder erro de carregamento como lista vazia.

