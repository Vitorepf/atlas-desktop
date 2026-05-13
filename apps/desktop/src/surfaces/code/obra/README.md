# Atlas Code Obra Bar

Esta pasta contem o boundary de Obra ativa.

Regra principal:

```text
ObraBar declara intencao. Kernel cria e governa a Obra real.
```

## Responsabilidades

- `ObraBar.tsx`: escolhe estado ativo/criacao/carregamento.
- `CreateObraBar.tsx`: entrada de objetivo e contexto opcional.
- `ActiveObraBar.tsx`: mostra obra ativa e acao de nova obra.
- `LoadingObraBar.tsx`: estado de consulta ao Kernel.
- `obraBarStyles.ts`: estilos compartilhados ainda em TS.
- `obraBarUtils.ts`: formatacao pura.

## Contrato

- Criar Obra chama backend real via bridge.
- Se o backend falhar, nao cria registro visual falso.
- Objetivo e intent sao entrada operacional, nao texto decorativo.
- Obra ativa deve ser fonte para conversa, stage, right rail e terminal quando
  houver workspace associado.

## Anti-patterns

- Criar Obra local sem confirmação do Kernel.
- Manter objetivo antigo depois de criacao bem-sucedida.
- Colocar logica de sessions, gates ou receipts nesta barra.

