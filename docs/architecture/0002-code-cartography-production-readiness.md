# ADR-0002 · Prontidao Profissional do Atlas Code e Cartografia

Status: accepted · 2026-05-13

Este documento transforma o mockup atual do Atlas Desktop em plano executavel
de produto. A meta nao e apenas "conectar a tela". A meta e fazer a cabine
operacional funcionar com seguranca, fonte real, terminal real, documentacao
real, Vault real e contratos verificaveis.

## Norte canonico

```text
Atlas Desktop e cabine operacional.
Atlas Server e Kernel.
Cartografia e leitura navegavel da verdade.
AtlasVault e segundo cerebro compartilhado.
docs/engineering-knowledge-base e documentacao oficial tecnica.
```

O Desktop nao inventa Obra, sessao, spec, receipt, evidencia, terminal output
ou chamada MCP. Quando nao houver dado real, a tela deve mostrar vazio honesto,
erro acionavel ou capacidade indisponivel.

## Fontes de verdade

| Area | Fonte primaria | Como a tela usa |
|---|---|---|
| Arquitetura tecnica | `atlas-server/docs/engineering-knowledge-base/` | Cartografia le arquivos reais e mostra path/source |
| Memoria, filosofia, livros, historias | iCloud Obsidian `AtlasVault/` | Cartografia le notas reais e abre no Obsidian |
| Obras e execucao | `atlas-server` | Atlas Code cria/lista Obra, thread, trace, gates e evidence |
| Decisoes | `atlas-server` + assinatura local | Receipt nasce no Kernel, Desktop assina quando ed25519 real existir |
| Terminal | `atlas-platform` local | PTY real do Mac, auditavel, sem output simulado |
| MCP | `atlas-server` Open Brain MCP | Desktop mostra status/ferramentas/chamadas do MCP real |

## Definition of Done v1

- O topo da tela mostra Kernel conectado, com erro explicavel quando falhar.
- Criar Obra chama backend real e aparece na sidebar sem registro inventado.
- Enviar mensagem cria ou continua uma thread real no Atlas Server.
- Conversa recebe stream ou polling de trace real, com estado de execucao claro.
- Pipeline SDD mostra estado real: context, spec, plan, execute, verify e learn.
- Painel direito mostra spec, plano, receipt, gates, evidence, repair e learning
  a partir de backend real.
- Terminal inferior usa PTY real via Tauri; se indisponivel, mostra motivo e
  proxima acao.
- Cartografia le simultaneamente docs oficiais e AtlasVault, com source visivel.
- Mudancas recentes da Cartografia refletem arquivo real salvo ou commit real.
- MCP aparece como capacidade real, nao como label decorativo.
- Assinatura ed25519 assina payload canonico e o server valida/grava no Ledger.
- `npm run build`, `cargo check` e testes de contrato passam.

## P0 · Corrigir a conexao real

Esta fase remove a fragilidade que aparece no screenshot: `kernel falhou`,
`bridge tauri offline`, `PTY unavailable`, `Signing unavailable`.

1. Diagnostico de Kernel
   - `atlas-tauri` deve expor `failure_code`, `repair_hint`, `stdout_tail`,
     `stderr_tail`, `base_url`, `port`, `server_path` e `php_path`.
   - A UI deve mostrar "Kernel falhou porque..." em vez de apenas "falhou".
   - Deve existir acao `Tentar novamente` chamando o boot manager.

2. Contratos do bridge
   - Corrigir divergencias entre shapes do `atlas-server` e DTOs Rust/TS.
   - `GET /projects` retorna wrapper legado; bridge precisa adaptar ou consumir
     endpoint dedicado `/atlas-code/works`.
   - `POST /projects` retorna `{ project, active_next_task, receipt_id }`;
     bridge precisa extrair Obra e guardar `receipt_id`.
   - `GET /ai/threads/{thread}` retorna wrapper com thread/messages; bridge
     nao pode esperar lista crua.
   - `/atlas-code/works/{id}/sessions` e `/evidence` retornam `{ data, meta }`;
     Rust bridge precisa wrappers tipados.
   - `POST /ai/interactions` deve receber payload real do server:
     `input_text`, `source_type`, `kind`, `thread_id|new_thread`,
     `source_id`, e nao um payload local inventado.

3. Health unificado
   - Criar ou consumir endpoint dedicado `GET /atlas-code/boot`.
   - Ele deve agregar: health, providers, MCP, cartography roots, queue,
     database, workspace e versao.
   - A topbar deve usar esse contrato para declarar estado real.

## P1 · Atlas Code utilizavel

1. Obra
   - `Nova Obra` deve criar projeto real.
   - A Obra ativa deve carregar objetivo, workspace, status e runs ativos.
   - Sidebar nao pode injetar "thread atual" artificial; se o server ainda nao
     vincula thread a obra, corrigir o backend ou mostrar "thread aguardando
     vinculo".

2. Conversa
   - Composer envia intent para o Kernel.
   - A resposta deve vir por SSE quando houver `trace_id`; polling e fallback.
   - Mensagens locais sao apenas estado pendente visual e desaparecem se o
     backend rejeitar.

3. Spec OS
   - Substituir `idlePipeline` estatico por estado real vindo do server.
   - Cada etapa mostra: status, artefato, owner, evidencia e bloqueio.
   - Se ainda nao existir spec, mostrar "sem spec criada" e proxima acao.

4. Plano e execucao
   - Painel direito deve ler plano real da Obra, packets, scope heatmap,
     quality gates, repair loop e learning proposals.
   - Nenhuma contagem deve ser simulada.

## P2 · Terminal real

O terminal inferior e uma fronteira critica do produto. Ele precisa ser real,
observavel e seguro.

- `atlas-platform` cria PTY com `portable-pty`.
- Frontend usa `xterm.js`.
- Tauri envia eventos `pty://data`, `pty://exit`, `pty://cwd`.
- UI manda input por comando `pty_write`.
- O workspace vem da Obra ativa ou config local.
- Sessao terminal deve gerar evidencia quando usada em execucao Atlas.
- Comandos destrutivos exigem contrato ou confirmacao humana.

Estado atualizado em 2026-05-13:

- PTY real ja existe em `crates/atlas-platform`.
- Frontend ja isola `TerminalDock`, `TerminalTabs`, `TerminalSession`,
  `TerminalToolbar`, `TerminalStatusBar` e `session/`.
- O contrato OSC `A/B/C/D` ja foi separado em protocolo proprio.
- A prioridade restante e regressao de confianca: comando rapido precisa voltar
  para estado `ready` de forma visualmente inequívoca.

## P3 · Cartografia viva

A Cartografia nao e projecao do Vault. Ela e interface de leitura da verdade.

1. Repo docs
   - Ler `atlas-server/docs/engineering-knowledge-base/`.
   - Cada node tecnico mostra `source=repo`, path real, frontmatter e markdown.

2. AtlasVault
   - Ler `/Users/vitorepf/Library/Mobile Documents/iCloud~md~obsidian/Documents/AtlasVault`.
   - Cada node humano mostra `source=vault`, path real e link Obsidian.

3. Tempo real
   - L1 pode usar polling com cache curto e checksum.
   - L2 deve usar watcher/SSE para arquivo salvo aparecer em segundos.
   - Timeline deve diferenciar `file_saved`, `git_commit`, `server_event`.

4. Acoes
   - Abrir doc repo no editor local.
   - Abrir nota Vault via `obsidian://`.
   - Copiar path canonico.
   - Nunca escrever pela Cartografia v1.

## P4 · MCP e Open Brain

O MCP precisa aparecer como sistema vivo, nao como texto.

- `GET /atlas-code/mcp/status` deve retornar server, protocol, tools_count,
  tools, docs_indexed, symbols_indexed, last_call e freshness.
- A tela deve mostrar quando MCP esta ativo, degradado ou indisponivel.
- Chamadas MCP devem ser registradas no ledger ou access log do server.
- O Desktop nunca vira autoridade MCP; ele apenas exibe e aciona o Kernel.

## P5 · Receipts, assinatura e diff

- `atlas-receipts` guarda chave ed25519 no Apple Keychain.
- O payload assinado deve ser canonico e reproduzivel.
- `POST /atlas-code/decisions/{decision}/sign` deve verificar assinatura real,
  nao apenas registrar texto.
- `POST /atlas-code/diffs/{patch}/apply` deve aplicar via runtime/gates reais
  ou recusar explicitamente. Nunca retornar `diff_applied=true` sem apply real.

## P6 · QA profissional

| Camada | Verificacao |
|---|---|
| Desktop TS | `npm run build` |
| Desktop Rust | `cargo check --workspace` |
| Server contratos | feature tests para `/atlas-code/*` e `/atlas-cartography/*` |
| Visual | abrir Tauri e validar estados: offline, kernel falhou, conectado |
| Cartografia | contagem repo/vault, source paths, note preview |
| Terminal | criar PTY, escrever comando, ler output, encerrar sessao |
| Receipt | assinar, verificar, gravar ledger, rejeitar assinatura invalida |

## Ordem de implementacao recomendada

1. P0 bridge/kernel: sem isso a tela nao e confiavel.
2. P1 Obra/conversa/spec: vira produto usavel.
3. P3 Cartografia: conecta verdade oficial + segundo cerebro.
4. P2 Terminal: libera cabine de programacao real.
5. P4 MCP: torna Open Brain visivel e auditavel.
6. P5 Receipt/diff: fecha governanca de execucao.
7. P6 QA: trava o produto para uso diario.

## Estado atual auditado

- A tela ja tem visual forte e estados vazios honestos.
- O shell foi extraido para `apps/desktop/src/shell/`.
- A surface Code foi separada em slots: obra, left, stage, right e terminal.
- `components/` virou fachada legada; nao deve receber feature nova.
- Cartografia ja possui componentes e backend inicial.
- Server ja possui rotas iniciais `/atlas-cartography/*` e `/atlas-code/*`.
- O bridge ainda pode ter divergencias de contrato com rotas legadas.
- PTY real existe, mas precisa regressao de prompt/ready/failed para uso diario
  sem ambiguidade.
- Signing existe como boundary arquitetural, mas precisa validacao end-to-end
  com payload canonico e Ledger.
- O Kernel manager existe e a UI tem diagnostico acionavel no TopBar.
- O SDD pipeline da tela ainda precisa evoluir para estado real completo vindo
  do Kernel.
