# Atlas Code Terminal

Esta pasta contem a camada de terminal da surface Code.

Regra principal:

```text
Terminal e infraestrutura operacional. Ele deve ser tratado como protocolo,
nao como textarea bonita.
```

## Responsabilidades

- `TerminalDock.tsx`: boundary publico usado pela `CodeSurface`.
- `TerminalTabs.tsx`: sessao visual, tabs, busca e status bar.
- `TerminalTab.tsx`: tab atomica de uma sessao.
- `TerminalSession.tsx`: host visual de uma sessao xterm.
- `TerminalToolbar.tsx`: tabs, contexto, acoes e dock controls.
- `TerminalSearchBar.tsx`: busca no buffer ativo.
- `TerminalStatusBar.tsx`: estado operacional claro: executando, pronto,
  falhou ou finalizando prompt.
- `useTerminalDockSizing.ts`: altura, dock bottom/right e resize.
- `useTerminalShortcuts.ts`: atalhos globais do terminal.
- `useTerminalActions.ts`: comandos imperativos enviados para a sessao ativa.
- `useTerminalStatusView.ts`: view model derivado do protocolo OSC/runtime.
- `terminalFormat.ts`: formatacao pura.
- `session/`: runtime de uma sessao PTY/xterm. O componente publico fica fino;
  protocolo OSC, resize, addons xterm, comandos globais e lifecycle ficam aqui.

## Ainda fora desta pasta

`components/TerminalTab.tsx`, `components/TerminalTabs.tsx` e
`components/TerminalSession.tsx` existem apenas como fachadas de compatibilidade.
A implementacao real vive nesta pasta.

## Contrato

- Nao escrever prompt falso no buffer.
- Nao duplicar PTY ao mudar layout.
- Nao misturar resize/shortcut/status/render no mesmo arquivo.
- Nao usar heuristica visual para decidir se o comando terminou.
- `running/ready/failed` vem do runtime/protocolo, nao de timeout cosmetico.

## Subcamadas

| Subcamada | Arquivos | Papel |
|---|---|---|
| Layout | `TerminalDock`, `TerminalTabs`, `TerminalToolbar`, `TerminalStatusBar` | composicao visual, tabs, dock, status |
| Sessao | `TerminalSession`, `session/useAtlasTerminalSession` | lifecycle de uma sessao PTY/xterm |
| Protocolo | `session/terminalPromptProtocol`, `lib/oscParser` | OSC 133, cwd, exit, prompt/input ready |
| Xterm | `session/openAtlasXterm`, `terminalSessionOptions` | addons, tema, links, unicode |
| Controle | `useTerminalActions`, `useTerminalSessionCommands` | clear, interrupt, search, comandos imperativos |
| Layout persistente | `state/terminalStore` | tabs, dock, altura, max |
| Runtime vivo | `state/terminalRuntime` | running, inputReady, exit, duracao, cwd |

## Regressao minima

Sempre que tocar terminal:

```bash
npm run build
cargo test -p atlas-platform pty_echoes_written_input_back_to_output_channel -- --nocapture
git diff --check
```

Validacao manual minima:

- `ls`: output imediato e volta para input pronto.
- `cd ..`: cwd muda no prompt/status.
- `zi blackink`: cwd muda quando o alias funcionar no shell do usuario.
- `false`: status mostra falha/exit non-zero.
- `sleep 2`: status mostra executando e depois pronto.
- Dock bottom -> right -> bottom nao perde buffer nem cria nova sessao.
