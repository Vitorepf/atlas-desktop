# Cartografia Search

Responsavel por busca local no snapshot carregado e navegacao para nodes
existentes.

Arquivos ativos:

- `useCartografiaSearch.ts`: estado, foco, keyboard e commit da busca.
- `CartografiaSearch.tsx`: floater visual da busca.
- `searchModel.ts`: normalizacao, limite, ranking e navegacao de indice.
- `searchScoring.ts`: matching e score deterministico.
- `types.ts`: tipos derivados do hook.

Nao pode navegar para graph_id ausente sem mostrar erro/vazio honesto.

Regras:

- ranking e limite de resultados ficam em `searchModel.ts`;
- matching textual fica em `searchScoring.ts`;
- `useCartografiaSearch.ts` nao deve voltar a conter regra de ranking inline.
