# Cartografia Source

Responsavel por acoes read-only de fonte:

- abrir doc repo no editor;
- abrir nota Vault via Obsidian;
- revelar arquivo no Finder;
- copiar path canonico.

Arquivos ativos:

- `sourceActions.ts`: comandos read-only expostos para UI.
- `sourcePath.ts`: resolucao deterministica de paths repo/vault e URI Obsidian.

Nao pode criar, editar, mover ou apagar arquivo.
