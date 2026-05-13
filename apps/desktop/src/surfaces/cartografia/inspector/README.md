# Cartografia Inspector

Responsavel por leitura canonica do node selecionado: source, path, metadata,
ficha, markdown real, riscos, evidencias, proximas acoes e acoes read-only.

Inspector nunca escreve arquivo e nunca esconde `sourcePath`.

## Arquivos ativos

- `Inspector.tsx`: composition root do painel quando existe node focado.
- `CartografiaInspectorSlot.tsx`: adaptador entre estado da surface e inspector.
- `DefaultInspector.tsx`: estado inicial sem node selecionado.
- `DefaultInspectorContent.tsx`: conteudo vazio honesto do inspector.
- `InspectorHeader.tsx`: titulo, source authority e path primario.
- `InspectorSections.tsx`: secoes de metadados, evidencia, riscos e acoes.
- `InspectorFileContent.tsx`: markdown real do arquivo canonico.
- `RecentChangesDock.tsx`: mudancas recentes relacionadas ao node.
- `InspectorResizeControls.tsx`: controles de largura/colapso do painel.
- `Ficha.tsx`: ficha operacional curta do node.
- `InspectorRows.tsx`: primitives de linha e acao.
- `buildFichaFields.ts`: adapter do atom para ficha.
- `inspectorModel.ts`: tags e derivacoes puras do inspector.
- `useInspectorNote.ts`: carregamento lazy da nota real do node focado.
- `markdown.ts`: render markdown controlado.
- `types.ts`: tipos locais do inspector.

## Regras

- Toda acao externa passa por `source/`.
- Toda leitura de arquivo passa pelo note cache da Cartografia.
- O slot adapta props, mas nao deriva ficha, tags, markdown ou source.
- Linha visual reutilizavel entra em `InspectorRows.tsx`.
- Controle de coluna entra em `InspectorResizeControls.tsx`.
- Carregamento lazy de nota entra em `useInspectorNote.ts`.
- Derivacao pura para tags/ficha entra em model/helper, nao no JSX.
- `Inspector.tsx` nao deve crescer para conter primitives internas.
