# Cartografia State

Responsavel por graph snapshot, note cache, recent changes, erros, loading e
maquina de navegacao `universe -> system -> flow -> gear -> subflow`.

Arquivos ativos:

- `useCartografia.ts`: composition root do estado da surface.
- `useCartografiaData.ts`: graph snapshot, recent changes, polling e erro de leitura.
- `useCartografiaNotes.ts`: cache lazy de markdown real por `graphId`.
- `useCartografiaNavigation.ts`: maquina de navegacao e atalhos de volta via `Escape`.
- `navigationModel.ts`: transicoes puras de navegacao e ids semanticos canonicos.
- `atomIndex.ts`: indice O(1) de qualquer node visual.
- `atomBuilders.ts`: adapters puros de pipeline/lane/continente/semantic node para `CartographyAtom`.
- `browserStorage.ts`: API defensiva de persistencia local da Cartografia.
- `cartografiaTypes.ts`: contrato exportado do hook.
- `useCartografiaViewModel.ts`: selectors derivados para a surface.
- `useCartografiaShortcuts.ts`: atalhos globais da Cartografia.
- `shortcutModel.ts`: protocolo puro dos atalhos globais.
- `useVisualLens.ts`: hook de lente visual persistida.
- `visualLens.ts`: modelo puro da lente visual e shortcuts 1-5.

Nao pode conter JSX, CSS ou DOM measurement.

Regras:

- dado real entra por `useCartografiaData`;
- markdown real entra por `useCartografiaNotes`;
- transicao de tela entra por `useCartografiaNavigation`;
- regra de transicao pura entra por `navigationModel.ts`;
- derivacao para render entra por `useCartografiaViewModel` ou selector puro;
- adapters de payload para atom entram em `atomBuilders.ts`;
- prefs locais entram por `browserStorage.ts` com nomes explicitos
  `readCartografiaStorage` e `writeCartografiaStorage`;
- regra de teclado entra em `shortcutModel.ts`, nao inline no listener;
- `useCartografia.ts` nao pode voltar a ser monolito.
