# Codex CLI · AI Feedback Patterns (Research Dossier)

> Pesquisa exaustiva sobre como o **OpenAI Codex CLI** (terminal coding agent, codex-rs) comunica estado da IA ao usuário. Catalogada a partir do código-fonte público em `openai/codex` (Rust + Ratatui), documentação oficial em `developers.openai.com/codex`, e relatos de usuários (issues, blogs, OpenAI community). Coletada em 2026-05-15 para informar o Atlas Desktop AI surface.

---

## 1. Resumo executivo

O Codex CLI é uma TUI fullscreen escrita em Rust sobre **Ratatui** (imediate-mode), organizada em torno de três zonas: **transcript scrollable** (composto por `HistoryCell`s tipados), **`StatusIndicatorWidget`** (linha animada acima do composer enquanto o agente trabalha), e **bottom pane** (composer + footer configurável). O princípio dominante é **um símbolo, um estado**: cada cell começa com um marcador de uma coluna (`•` animado dim, `•` verde ou vermelho, `✔`/`✗`) seguido de um header curto bold (`Working`, `Exploring`/`Explored`, `Read`, `List`, `Search`, `Run`, `Running`/`Ran`, `Searching the web`/`Searched`, `Calling`/`Called`, `Proposed Plan`, etc.) e detalhes secundários em `dim`/cyan abaixo, conectados por `└` (U+2514). Comandos shell são agrupados visualmente: vários `Read` seguidos viram um único cell `Read a.rs, b.rs, c.rs`; o output é truncado em 5 linhas (`TOOL_CALL_MAX_LINES`) com aviso `… +N lines (ctrl + t to view transcript)`.

A distinção entre **ativo** e **finalizado** é codificada nos próprios marcadores: durante execução o bullet é um **shimmer band** animado RGB (gradiente que varre o caractere `•` em ondas) ou, quando animações estão off, um blink entre `•` e `◦`. Ao terminar, vira `•` verde (sucesso) ou `•` vermelho bold (falha exit≠0). O header também muta: `Exploring → Explored`, `Searching the web → Searched`, `Calling → Called`, `Running → Ran`. O `StatusIndicatorWidget` é a única peça com **contador de duração visível em tempo real**, exibido inline como `Working (15s · esc to interrupt) · detail`, com format compacto `Ns | Nm SSs | Nh MMm SSs`. Aprovações sandbox aparecem como **modal list-selection** no bottom pane (não dialog popup) com texto contextual ("Would you like to run the following command?") e opções por linha.

A filosofia visual: **default-foreground primário**, **dim** para todo metadado/output (Modifier::DIM aplicado por span), **cyan** para parâmetros (path, query) e role labels, **green** para sucesso e prefixos shell `$`, **red** para falha/erro/`■`, **magenta** para `Codex-branded`/`/comandos slash`/`✘ Failed to apply patch`/`/ps`, **yellow** para `⚠ warning`. Não há cores semânticas custom configuráveis (issue #21130 pendente). O usuário pode customizar apenas o tema **syntect** de syntax-highlighting via `/theme`.

Inovações específicas: **agrupamento automático de leituras consecutivas** (`Read a.rs, b.rs`), **shimmer band animado** sincronizado ao process start (sweep period 2s, half-width 5 chars), **`StreamingPlanTailCell`/`StreamingAgentTailCell`** que mutam in-place enquanto streamam markdown sem quebrar tabelas, e o conceito de **HookCell.PendingReveal** (300ms reveal delay + 600ms quiet linger para evitar flash de hook instantâneo). Limitações: thinking/reasoning é renderizado **após o bloco terminar** (não streamado token-a-token como na extensão VS Code — issue #5339), duration timer pós-task foi removido em 0.98+ (issue #10891), e o spinner às vezes some quando o agente continua trabalhando (issue #10534).

---

## 2. Tabela de signals (índice rápido)

| Nome canônico | Categoria | Visual one-liner |
| --- | --- | --- |
| `StatusIndicatorWidget` "Working" | progress | `• Working (15s · esc to interrupt) · Reading file.md` linha shimmer animada acima do composer |
| `ExecCell` Exploring | reading+searching+executing | `• Exploring` bold + tree `└ Read foo.rs, bar.rs` cyan |
| `ExecCell` Explored | reading+searching+completed | `• Explored` dim + `└ Read foo.rs` cyan (final state) |
| `ExecCell` Running | executing | `• Running cmd…` (animated marker, bold "Running") |
| `ExecCell` Ran | completed | `• Ran cmd` verde bullet ou `• Ran cmd` vermelho se exit≠0, output em 5 linhas dim com `└` |
| `ExecCell` You ran | executing | `• You ran cmd` (até 50 linhas de output, vs 5) |
| `ParsedCommand::Read` | reading | header cyan `Read` + path cyan, vários paths agrupados com `, ` |
| `ParsedCommand::Search` | searching | header cyan `Search` + `query` cyan + ` in path` dim |
| `ParsedCommand::ListFiles` | searching | header cyan `List` + path cyan |
| `ParsedCommand::Unknown` | executing | header cyan `Run` + cmd cyan |
| `WebSearchCell` Searching | searching+other | `• Searching the web` (active) → `• Searched` (done), detail dim |
| `McpToolCallCell` Calling | mcp | `• Calling server.tool({args})` → bullet verde/vermelho + `Called` |
| `PatchHistoryCell` | writing | diff summary com headers magenta `A path` / `M path` / `D path` |
| `ApplyPatch failure` | error | `✘ Failed to apply patch` magenta bold + stderr dim em `└` |
| `PlanUpdateCell` (todo list) | progress | checkboxes (pending/in_progress/completed) |
| `ProposedPlanCell` | progress | `• Proposed Plan` bold + body markdown em background custom |
| `StreamingPlanTailCell` | thinking | preview-only tail que muta in-place enquanto stream |
| `ReasoningSummaryCell` | thinking | `• ...` em **dim italic** wrap após bloco terminar |
| `AgentMessageCell` | thinking+completed | `• ` dim + markdown agent response (consolida em `AgentMarkdownCell` no final) |
| `UserHistoryCell` | other | `› ` bold-dim prefix + texto cyan |
| `ApprovalOverlay` | awaiting_permission | modal list-selection com "Would you like to run the following command?" |
| `new_approval_decision_cell Approved` | completed | `✔ ` verde + "You approved codex to run X this time" |
| `new_approval_decision_cell Denied` | blocked | `✗ ` vermelho + "You did not approve…" |
| `new_approval_decision_cell TimedOut` | blocked | `✗ ` vermelho + "Review timed out before…" |
| `new_error_event` | error | `■ message` em vermelho |
| `new_warning_event` | error | `⚠ ` amarelo + texto amarelo |
| `CyberPolicyNoticeCell` | blocked | `ⓘ ` cyan + "This chat was flagged…" |
| `DeprecationNoticeCell` | error | `⚠ ` vermelho bold + detail dim |
| `UpdateAvailableHistoryCell` | other | `✨ Update available! 0.X → 0.Y` cyan bold em border `╭─╮` |
| `RequestUserInputResultCell` | awaiting_permission+completed | `• Questions 2/3 answered` + `answer: ...` cyan |
| `HookCell` Pending | other | invisível até 300ms (`HOOK_RUN_REVEAL_DELAY`) |
| `HookCell` Visible | progress | spinner + header, agrupa rodando adjacentes |
| `HookCell` QuietLinger | completed | sucesso silencioso, lingera 600ms então some |
| `UnifiedExecInteractionCell` | executing | `• Waited for background terminal` ou `↳ Interacted with background terminal · cmd` |
| `UnifiedExecProcessesCell` | other | `Background terminals` lista de processos `• cmd` cyan + recent chunks |
| `UnifiedExecFooter` | progress | "N background terminal(s) running · /ps to view · /stop to close" dim |
| `view_image_tool_call` | reading | `• Viewed Image` bold + `└ path` dim |
| `image_generation_call` | writing | `• Generated Image:` + revised prompt dim + `Saved to:` URL |
| `ConsolidateAgentMessage` event | thinking→completed | substitui run contíguo de `AgentMessageCell`s por `AgentMarkdownCell` re-renderizável |
| Footer status line | progress | configurable: model, branch, tokens, rate limits, sessão id, cwd, versão |
| Terminal title | progress | default `["spinner", "project"]`, exibido no chrome do terminal |

---

## 3. Sessões detalhadas

### 3.1 Reasoning / Thinking

#### `StatusIndicatorWidget` (header "Working")
1. **Nome canônico**: `StatusIndicatorWidget`
2. **Categoria**: progress / thinking
3. **Trigger**: agente turn começa (event `TaskStarted` na chatwidget); pausa quando agente está bloqueado em I/O, retoma em delta de output.
4. **Visual**:
   - Ícone: `•` shimmer animado quando `animations_enabled == true`; quando false e `ReducedMotionIndicator::Hidden`, **nenhum** ícone (apenas texto).
   - Cor: foreground default + dim no `(15s · esc to interrupt)` e em `· detail`. O texto "Working" passa por `shimmer_text` que aplica gradiente RGB se terminal suportar 16M, senão alterna DIM/normal/BOLD em onda.
   - Animação: `frame_requester.schedule_frame_in(Duration::from_millis(32))` — refresh ~30 FPS enquanto ativo. Shimmer sweep period 2.0s.
   - Posição: linha 1 acima do composer (`bottom_pane.status_indicator_widget`), abaixo do transcript scrollable.
   - Texto formato: `{shimmer_bullet} {shimmer_header} ({elapsed} · esc to interrupt) · {inline_message}` onde inline_message vem do unified-exec footer ("3 background terminals running") ou do agente.
5. **Lifecycle**:
   - **Start**: `StatusIndicatorWidget::new()` → header `"Working"`, `elapsed_running: Duration::ZERO`, `last_resume_at: Instant::now()`.
   - **Progress**: `update_header(s)` muda label; `update_details(Some(text), …)` adiciona linha 2 com prefix `  └ ` (até `details_max_lines=3` linhas, ellipsis `…` se overflow); `update_inline_message(s)` adiciona suffix após `(elapsed · interrupt)`.
   - **Pause/Resume**: `pause_timer()` congela counter (`elapsed_running += now - last_resume_at`), `resume_timer()` continua.
   - **End**: widget destruído ao final do turn; substituído pelo bullet final do cell que mudou de estado.
6. **Interaction**: `Esc` interrompe (`self.app_event_tx.interrupt()`).
7. **Why it works**: o usuário sempre sabe **(a)** que algo está rodando (shimmer), **(b)** há quanto tempo (counter), **(c)** como parar (esc), **(d)** o que está acontecendo agora (detail line). Counter compacto `0s/59s/1m 00s/1h 00m 00s` cabe em qualquer largura.
8. **Source**: `codex-rs/tui/src/status_indicator_widget.rs` — `fmt_elapsed_compact`, `StatusIndicatorWidget::render` (linha de teste prova: `assert!(line.starts_with("Working (0s · esc to interrupt)"))`).

#### `ReasoningSummaryCell`
1. **Nome canônico**: `ReasoningSummaryCell` (helper `new_reasoning_summary_block`)
2. **Categoria**: thinking / completed
3. **Trigger**: ao final de um bloco de reasoning (não streamado token a token — issue #5339 confirma "it only outputs all intermediate thinking content after the last step, just before taking a tool action").
4. **Visual**:
   - Ícone: `• ` (dim).
   - Cor: **dim + italic** (`Style::default().dim().italic()`) aplicado a todos os spans.
   - Animação: nenhuma (post-hoc).
   - Posição: inline no transcript, após user prompt e antes do tool call.
   - Texto formato: markdown renderizado, indent `• ` na primeira linha e `  ` nas seguintes (`adaptive_wrap_lines` com initial/subsequent indent).
5. **Lifecycle**: criado ao receber summary block completo. Pode ser `transcript_only` (não aparece no chat ativo, só no overlay Ctrl+T).
6. **Interaction**: copiável via Ctrl+O / Ctrl+T transcript overlay.
7. **Why it works**: dim+italic comunica "isso é metadado, não a resposta final"; markdown preservado para que tipografia (bold do header) ainda navegue.
8. **Source**: `codex-rs/tui/src/history_cell/messages.rs::ReasoningSummaryCell::lines`.

#### Configuração de reasoning visibility
- `show_raw_agent_reasoning` (bool): "Surface raw reasoning content when the active model emits it."
- `hide_agent_reasoning` (bool): "Suppress reasoning events in both the TUI and `codex exec` output."
- Modes "none"/"experimental"/"steps only" — issue #5476 propõe modo intermediário com apenas títulos dos thinking steps; **não implementado** ainda.
- **Source**: developers.openai.com/codex/config-reference; github.com/openai/codex/issues/5476.

#### `AgentMessageCell` + `AgentMarkdownCell` (resposta final)
1. **Nome canônico**: `AgentMessageCell` (streaming) → consolidado em `AgentMarkdownCell` (finalizado)
2. **Categoria**: thinking → completed
3. **Trigger**: agente emite text response; durante stream usa `AgentMessageCell` por delta. No final, `ConsolidateAgentMessage` substitui o run contíguo por um único `AgentMarkdownCell` que armazena `markdown_source` para re-render em resize.
4. **Visual**:
   - Ícone: `• ` dim na primeira linha (`is_first_line: true`), `  ` (dois espaços) nas continuações.
   - Cor: cores do markdown renderer (códigos, links, headings com syntect).
   - Posição: inline no transcript.
   - Texto formato: markdown wrap com `LIVE_PREFIX_COLS` reserved + 2 cols para `"• "`.
5. **Lifecycle**: cada delta cria um `AgentMessageCell`/`StreamingAgentTailCell`. Tabelas markdown ficam em `StreamingAgentTailCell` (transient, lines pre-rendered) para evitar quebrar borders mid-stream. Consolidação no fim.
6. **Why it works**: a separação stream-vs-consolidado evita resize-reflow bugs em tabelas/links locais; bullet único marca "esse é o agent speaking".
7. **Source**: `codex-rs/tui/src/history_cell/messages.rs::{AgentMessageCell, AgentMarkdownCell, StreamingAgentTailCell}`.

### 3.2 Searching / Reading

#### `ExecCell` modo Exploring/Explored (agrupador de leitura+busca+list)
1. **Nome canônico**: `ExecCell::exploring_display_lines` (chamado quando `is_exploring_cell()` é true — i.e., todos parsed commands são tipos `Read/Search/ListFiles`, sem `Unknown`)
2. **Categoria**: reading + searching
3. **Trigger**: agente executa comandos shell parseáveis como leitura/busca/listagem. O parser `codex_protocol::parse_command::ParsedCommand` classifica em variantes `Read{name,…}`, `Search{cmd,query,path}`, `ListFiles{cmd,path}`, `Unknown{cmd}`.
4. **Visual**:
   - Ícone: bullet animado (shimmer) enquanto ativo; vira `•` dim ao completar.
   - Cor: header `Exploring`/`Explored` em **bold default**; títulos por-call (`Read`, `Search`, `List`) em **cyan**; nomes/queries em default; ` in path` dim; separador entre múltiplos `Read` é `, ` dim.
   - Animação: spinner shimmer enquanto ativo.
   - Posição: inline no transcript, com sub-itens prefixados por `  └ ` (dim) e continuações por `    ` (4 espaços).
   - Texto formato:
     ```
     • Exploring                  <- ou • Explored
       └ Read foo.rs, bar.rs       <- agrupamento automático de reads consecutivos
         List src/                
         Search "fn main" in src/ 
         Run cargo check          <- (na verdade muda para command_display_lines se algum Unknown)
     ```
5. **Lifecycle**:
   - Vários comandos consecutivos cujos `parsed` são todos Read viram um **único call agrupado** (loop em `command_display_lines` que faz `calls.remove(0)` enquanto próximo é Read-only).
   - Header transiciona "Exploring" → "Explored" baseado em `self.is_active()`.
6. **Interaction**: Ctrl+T abre transcript overlay com lines unwrapped; output completo dentro do exec cell pode ser >5 linhas mostrando "… +N lines" hint.
7. **Why it works**: **reduz ruído visual drasticamente** — 8 `Read`s consecutivos viram uma linha `Read a, b, c, d, e, f, g, h`. Cyan nos títulos diferencia tipo de operação sem precisar de ícones distintos. O verbo conjugado em `-ing`/`-ed` codifica estado sem cor mudar.
8. **Source**: `codex-rs/tui/src/exec_cell/render.rs` (`exploring_display_lines`, branch agrupador `while next.parsed.iter().all(is_read)`).

#### `WebSearchCell`
1. **Nome canônico**: `WebSearchCell`
2. **Categoria**: searching
3. **Trigger**: agente chama `web_search` tool (first-party). "You'll see web_search items in the transcript or `codex exec --json output` whenever Codex looks something up" — docs/features.
4. **Visual**:
   - Ícone: spinner shimmer enquanto ativo, `•` dim quando completed.
   - Cor: header bold default; detail em default.
   - Texto formato: `{bullet} Searching the web {detail}` → `{bullet} Searched {detail}`. Detail é `query`, ou `'pattern' in url` (FindInPage), ou `url` (OpenPage).
5. **Lifecycle**: `new_active_web_search_call` → `update(action, query)` em deltas → `complete()` finaliza.
6. **Source**: `codex-rs/tui/src/history_cell/search.rs::WebSearchCell`.

#### `ParsedCommand::Read`, `Search`, `ListFiles`, `Unknown` (helpers do parser)
- Renderizados como linhas dentro de `ExecCell` no modo Exploring:
  - `Read{name}` → `("Read", [name.cyan()])` — múltiplos viram `Read a, b, c`.
  - `ListFiles{cmd, path}` → `("List", [path.cyan() ou cmd.cyan()])`.
  - `Search{cmd, query, path}` → `("Search", [query.cyan(), " in ".dim(), path.cyan()])` ou apenas `query`/`cmd`.
  - `Unknown{cmd}` → `("Run", [cmd.cyan()])` — força modo `command_display_lines` (não Exploring).
- **Source**: `codex-rs/tui/src/exec_cell/render.rs` linhas ~302-345.

### 3.3 Writing / Editing

#### `PatchHistoryCell` (apply_patch summary)
1. **Nome canônico**: `PatchHistoryCell`
2. **Categoria**: writing
3. **Trigger**: agente chama `apply_patch` tool com sucesso → `new_patch_event(changes, cwd)`.
4. **Visual**: diff summary criado por `create_diff_summary(changes, cwd, width)` — typicamente mostra headers de arquivo (`A`, `M`, `D`) seguidos do diff colorido (additions verde, deletions vermelho via syntect).
5. **Lifecycle**: cell estático após apply.
6. **Source**: `codex-rs/tui/src/history_cell/patches.rs::PatchHistoryCell`.

#### `new_patch_apply_failure`
1. **Nome canônico**: helper que cria `PlainHistoryCell`
2. **Categoria**: error / writing
3. **Trigger**: apply_patch falha (exit code != 0 or parse error).
4. **Visual**:
   - Título: `"✘ Failed to apply patch"` em **magenta bold** (interessante: magenta, não vermelho — sinaliza "Codex-branded" falha).
   - Stderr: até 5 linhas (`TOOL_CALL_MAX_LINES`) em dim com prefix `  └ ` na primeira linha e `    ` nas demais (`only_err: true, include_angle_pipe: true`).
5. **Source**: `codex-rs/tui/src/history_cell/patches.rs::new_patch_apply_failure`.

#### `new_view_image_tool_call` e `new_image_generation_call`
- Viewed Image: `• Viewed Image` bold + `└ path` dim.
- Generated Image: `• Generated Image:` bold + `└ revised_prompt` dim + `└ Saved to: file://path` dim.
- **Source**: `codex-rs/tui/src/history_cell/patches.rs`.

### 3.4 Executing (shell command)

#### `ExecCell::command_display_lines` (modo "Run/Running/Ran")
1. **Nome canônico**: `ExecCell` modo command (chamado quando há ao menos um `ParsedCommand::Unknown`)
2. **Categoria**: executing
3. **Trigger**: `new_active_exec_command(call_id, command, parsed, source, interaction_input, animations_enabled)`.
4. **Visual**:
   - Ícone: bullet animated (shimmer/blink `•`/`◦`) enquanto ativo, `•` verde bold se exit 0, `•` vermelho bold se exit ≠ 0.
   - Header: `"Running"` bold enquanto ativo; `"Ran"` bold quando completo; `"You ran"` se `is_user_shell_command()` (usuário digitou `!cmd`); string vazia se é unified-exec interaction.
   - Cor: bullet (verde/vermelho/animado), title bold default, comando highlighted_bash (syntect → keywords cyan, strings, etc), output em **dim**.
   - Posição: inline; continuação do comando wrap com prefix `"    "` dim (continuation_max_lines default).
   - Texto formato:
     ```
     • Ran cmd --flag value      <- bullet verde + Ran bold + cmd highlighted
       cmd-continuation...       <- wrap se comando longo
       stdout line 1             <- output dim, até 5 linhas
       stdout line 2
       … +N lines (ctrl + t to view transcript)
       stdout final 1
       stdout final 2
     ```
     Output ellipsis (`output_ellipsis_text`): `format!("… +{omitted} lines ({TRANSCRIPT_HINT})")` — `TRANSCRIPT_HINT = "ctrl + t to view transcript"`.
5. **Lifecycle**:
   - `start_time: Some(Instant::now())` na criação → spinner começa.
   - Recebe `ExecCommandEnd { exit_code, output }` → vira `Ran`, bullet muda.
   - **Transcript line** (Ctrl+T full view): `$ cmd` em magenta + output ANSI-decoded + linha de resultado: `✓` verde bold + ` • {duration}` dim ou `✗` vermelho bold + `(exit_code)` + ` • {duration}` dim. `format_duration` vem de `codex_utils_elapsed`.
6. **Interaction**: aprovação via `ApprovalOverlay` se sandbox bloquear. Output completo em Ctrl+T overlay.
7. **Why it works**: o **mesmo bullet** muda de cor para conduzir o olho (running gris-animado → verde/vermelho final); 5 linhas head+tail+ellipsis cobre 80% dos casos sem floodar viewport.
8. **Source**: `codex-rs/tui/src/exec_cell/render.rs::command_display_lines` + `transcript_lines`.

#### `UnifiedExecInteractionCell` (background terminal interaction)
- Texto: `• Waited for background terminal` (se stdin vazio) ou `↳ Interacted with background terminal · cmd` bold + body input com prefix `  └ ` dim.
- **Source**: `codex-rs/tui/src/history_cell/exec.rs::UnifiedExecInteractionCell::display_lines`.

#### `UnifiedExecProcessesCell` (lista de processos rodando)
- Texto: `Background terminals` bold + lista `  • {cmd.cyan()} [...]` (cmd truncado em 80 graphemes) + `    ↳ {recent_chunk}` dim para output recente.
- Limite 16 processos exibidos + `  • ... and N more running` dim.
- Aciona em `/ps` slash command.
- **Source**: `codex-rs/tui/src/history_cell/exec.rs::UnifiedExecProcessesCell`.

#### `UnifiedExecFooter` (linha de status no bottom pane)
- Texto: `"N background terminal{s} running · /ps to view · /stop to close"` em dim, indent `  `.
- Aparece logo acima do composer enquanto há processos vivos.
- Mesma string pode aparecer inline em `StatusIndicatorWidget.inline_message`.
- **Source**: `codex-rs/tui/src/bottom_pane/unified_exec_footer.rs::summary_text`.

### 3.5 MCP tool calls

#### `McpToolCallCell`
1. **Nome canônico**: `McpToolCallCell`
2. **Categoria**: mcp / executing
3. **Trigger**: agente invoca MCP tool via protocolo.
4. **Visual**:
   - Ícone: bullet animado enquanto ativo; `•` verde bold se sucesso, `•` vermelho bold se erro (`is_error == true` ou Err).
   - Header: `"Calling"` bold (active) → `"Called"` bold (complete).
   - Invocação: `format_mcp_invocation(server.tool({args}))` — quando cabe em linha vai inline, senão wrap em segunda linha com prefix `  └ `.
   - Result block: cada `Content` (Text/Image/Audio/Resource/Link) trunca via `format_and_truncate_tool_result(text, TOOL_CALL_MAX_LINES=5, width)`. Imagens viram `<image content>`, resources viram `embedded resource: uri`.
   - Erros: `format_and_truncate_tool_result(format!("Error: {err}"), 5, width)` em dim.
5. **Source**: `codex-rs/tui/src/history_cell/mcp.rs::McpToolCallCell`.

#### `/mcp` slash command output
- Lista MCP servers configurados, status auth (`Unsupported`/`Not logged in`/`Bearer token`/`OAuth`), ferramentas expostas.
- `mcp_auth_status_label` map estático.
- **Source**: `codex-rs/tui/src/history_cell/mcp.rs::mcp_auth_status_label`.

### 3.6 Git operations

Codex CLI tem operações git mediadas por **slash commands**, não por widgets dedicados:
- `/diff`: roda `git diff` (inclusive untracked) e mostra raw output dentro de uma `PlainHistoryCell` com syntax highlighting.
- `/review`: roda análise contra base branch / uncommitted / commit específico, retorna `Proposed Plan` style cell.
- Branch é exibido na **status line do footer** se `git_branch` estiver entre `tui.status_line` items.
- **Source**: developers.openai.com/codex/cli/slash-commands; `codex-rs/tui/src/get_git_diff.rs`.

### 3.7 Errors & blocked states

#### `new_error_event`
- Texto: `■ {message}` em **vermelho**. (Comentário no source: "Use a hair space (U+200A) to create a subtle, near-invisible separation before the text. VS16 is intentionally omitted to keep spacing tighter in terminals like Ghostty.")
- **Source**: `codex-rs/tui/src/history_cell/notices.rs::new_error_event`.

#### `new_warning_event`
- Texto: `⚠ {message}` em **amarelo** (helper `PrefixedWrappedHistoryCell`).
- **Source**: idem.

#### `CyberPolicyNoticeCell` (blocked por safety filter)
- Linha 1: `ⓘ ` cyan + `"This chat was flagged for possible cybersecurity risk"` bold.
- Linha 2: `"If this seems wrong, try rephrasing your request. To get authorized for security work, join the "` dim + `"Trusted Access for Cyber"` cyan underlined + `" program."` dim.
- Linha 3: URL `https://chatgpt.com/cyber` cyan underlined.

#### `DeprecationNoticeCell`
- `⚠ {summary}` vermelho bold + detalhes dim wrap.

### 3.8 Awaiting permission / approvals

#### `ApprovalOverlay` (modal de aprovação)
1. **Nome canônico**: `ApprovalOverlay` (vive em `bottom_pane`)
2. **Categoria**: awaiting_permission
3. **Trigger**: agente tenta executar algo que sandbox bloqueia (Exec, ApplyPatch, Permissions request, MCP elicitation).
4. **Visual**:
   - **Não é dialog popup** — é um `ListSelectionView` que ocupa o bottom pane substituindo o composer enquanto ativo.
   - Header bold: pergunta contextual:
     - Exec sem rede: `"Would you like to run the following command?"`
     - Exec com rede: `"Do you want to approve network access to "{host}"?"`
     - Permissions: `"Would you like to grant these permissions?"`
     - ApplyPatch: `"Would you like to make the following edits?"`
     - MCP: `"{server_name} needs your approval."`
   - Body: comando highlighted via `highlight_bash_to_lines` ou diff via `create_diff_summary`.
   - Opções: lista de `SelectionItem { name, display_shortcut }` — ex.: "Approve", "Approve every time this session", "Approve & amend execpolicy", "Deny", "Cancel".
   - Footer hint: `accept_cancel_hint_line()` mostra `[enter] accept · [esc] cancel`.
5. **Lifecycle**:
   - `enqueue_request(req)`: aprovações pendentes empilham; uma de cada vez.
   - `apply_selection(idx)`: emite `AppEvent::ExecApproval` ou `PatchApproval` etc.
   - Após resolução, **insere `new_approval_decision_cell`** no transcript com símbolo persistente (`✔ ` verde ou `✗ ` vermelho).
6. **Interaction**: setas/digit pra escolher, Enter pra aplicar, Esc pra cancelar.
7. **Why it works**: substitui o composer (não overlay) forçando decisão antes de continuar; histórico fica no transcript com símbolo+frase ("You approved codex to run `cmd` this time").
8. **Source**: `codex-rs/tui/src/bottom_pane/approval_overlay.rs`.

#### `new_approval_decision_cell` (artefato persistente da decisão)
- Símbolos e frases (extraído literalmente do source `history_cell/approvals.rs`):
  - **Approved** (this time, command): `✔ ` verde + `"{actor} approved codex to run {snippet} this time"`.
  - **ApprovedForSession**: `✔ ` verde + `"{actor} approved codex to run {snippet} every time this session"`.
  - **ApprovedExecpolicyAmendment**: `✔ ` verde + `"{actor} approved codex to always run commands that start with {snippet}"`.
  - **NetworkPolicyAmendment Allow**: `✔ ` verde + `"{actor} persisted Codex network access to {target}"`.
  - **NetworkPolicyAmendment Deny**: `✗ ` vermelho + `"{actor} denied codex network access to {target} and saved that rule"`.
  - **Denied**: `✗ ` vermelho + `"{actor} did not approve codex to run {snippet}"` ou (Guardian) `"Request denied for codex to run {snippet}"`.
  - **TimedOut**: `✗ ` vermelho + `"Review timed out before codex could run {snippet}"`.
  - **Abort**: `✗ ` vermelho + `"{actor} canceled the request to run {snippet}"`.
- `truncate_exec_snippet` corta no primeiro newline e adiciona `" ..."`, cap em 80 graphemes.
- **Source**: `codex-rs/tui/src/history_cell/approvals.rs::new_approval_decision_cell`.

#### `RequestUserInputResultCell` (questions/answers)
- Header: `• Questions {answered}/{total} answered` + ` (interrupted)` cyan se interrompido.
- Cada pergunta: `  • {question}` + ` (unanswered)` dim se não respondida.
- Resposta: `    answer: {option}` (cyan) ou `    note: {note}` (cyan dim).
- Pergunta secreta: `    answer: ••••••` cyan.
- **Source**: `codex-rs/tui/src/history_cell/request_user_input.rs`.

### 3.9 Progress / Plans

#### `ProposedPlanCell`
- Header: `• Proposed Plan` bold.
- Body: markdown renderizado com `proposed_plan_style()` (background custom para destacar).
- Indent: 2 cols nas linhas internas.
- **Source**: `codex-rs/tui/src/history_cell/plans.rs::ProposedPlanCell`.

#### `PlanUpdateCell` (todo list)
- Renderiza `UpdatePlanArgs { explanation, plan }` como **lista de checkboxes** (PlanItemArg com StepStatus pending/in_progress/completed).
- Visualização tipo todo-list.
- **Source**: `codex-rs/tui/src/history_cell/plans.rs::PlanUpdateCell`.

#### `StreamingPlanTailCell`
- Cell **transient** que muta in-place enquanto plan streama; é substituída por `ProposedPlanCell` source-backed no final para que resize re-renderize markdown corretamente.

### 3.10 Footer / Status line

#### `tui.status_line` (linha contextual configurável)
- Items disponíveis (configuráveis via `tui.status_line` array): `model`, `model+reasoning`, `context stats`, `rate limits`, `git_branch`, `token_counters`, `session_id`, `current directory/project root`, `Codex version`.
- Posição: row 1 do footer, abaixo do composer, separada por hairline.
- Pode ser desativado com `null`.
- **Source**: developers.openai.com/codex/config-reference (tui.status_line).

#### `tui.terminal_title` (window title)
- Default: `["spinner", "project"]` — spinner emoji + nome do projeto.
- Disponíveis: `app name`, `project`, `spinner`, `status`, `thread`, `git branch`, `model`, `task progress`.
- Aparece no chrome do terminal (não dentro da TUI).
- **Source**: developers.openai.com/codex/config-reference (tui.terminal_title).

#### `FooterMode` (modos transient do footer instrucional)
- `ComposerEmpty`: shortcuts hint `[?] for shortcuts`.
- `ComposerHasDraft`: queue hint `[Tab] to queue` se task running, senão suprimido.
- `QuitShortcutReminder`: `"press {key} again to quit"` transient (3s).
- `HistorySearch`: prompt Ctrl+R com query inline.
- `ShortcutOverlay`: multi-linha com todos atalhos após `?`.
- `EscHint`: `"press Esc again"` após primeira Esc idle.
- **Source**: `codex-rs/tui/src/bottom_pane/footer.rs::FooterMode`.

### 3.11 Hooks (peri-tool lifecycle)

#### `HookCell` com state machine
- 4 estados:
  1. **PendingReveal**: rodando, mas escondido até `HOOK_RUN_REVEAL_DELAY = 300ms` — evita flash.
  2. **VisibleRunning**: depois do 300ms, mostra spinner + header. Grupos adjacentes coalesce em uma linha com count.
  3. **QuietLinger**: completou com sucesso sem output — fica visível 600ms (`QUIET_HOOK_MIN_VISIBLE`) então some.
  4. **Completed**: completou com output ou status non-success — persiste no transcript.
- **Why it works**: hooks são intencionalmente quietos. "A hook that starts and finishes successfully without output should not leave a transcript artifact."
- **Source**: `codex-rs/tui/src/history_cell/hook_cell.rs`.

### 3.12 Session header / startup

#### `SessionInfoCell` com border
- Renderizado dentro de `╭─╮ │ │ ╰─╯` (chars `\u{256D}`/`\u{2500}`/`\u{2570}`).
- Border style: dim.
- Largura interna: `SESSION_HEADER_MAX_INNER_WIDTH = 56` (comentário: "Just an eyeballed value").
- Conteúdo: cwd, model, approval policy, sandbox mode, MCP servers.
- **Source**: `codex-rs/tui/src/history_cell/session.rs`.

#### `UpdateAvailableHistoryCell`
- Texto: `✨ Update available!` cyan bold + `current → latest` bold + `Run codex upgrade to update.` cyan + URL release notes.
- Border `╭─╮` dim.
- **Source**: `codex-rs/tui/src/history_cell/notices.rs::UpdateAvailableHistoryCell`.

### 3.13 Slash commands (output specs)

| Comando | O que mostra |
| --- | --- |
| `/status` | session config: model, approval policy, writable roots, sandbox mode, **token usage + context remaining**, MCP server count |
| `/diff` | git diff staged + unstaged + untracked, syntax-highlighted, scrollable |
| `/review` | issues prioritized actionable em `Proposed Plan`-style cell, focus on behavioral changes / missing tests |
| `/permissions` ou `/approvals` | picker: Auto / Read-only / Full Access (com confirm) |
| `/model` | picker de model (gpt-5-codex, gpt-5.3-codex, mini variants) |
| `/theme` | picker com **live preview** dos themes syntect (`.tmTheme`) |
| `/title` | picker reorderable dos terminal title items |
| `/statusline` | picker reorderable dos status line items |
| `/mcp` | lista MCP servers + auth status + tools; com `verbose` mostra details |
| `/resume` | picker das saved sessions (sem args) ou resume direto por ID |
| `/fork` | cria branch paralelo do conversation history |
| `/compact` | sumariza conversation pra liberar tokens |
| `/clear` | reseta tela (Ctrl+L equivalente) |
| `/copy` | copia last response (Ctrl+O equivalente) |
| `/fast` | toggle Fast mode (modelo "minimal reasoning") |
| `/ps` | lista UnifiedExecProcessesCell (background terminals) |
| `/stop` | mata background terminal |
| `/quit` ou `/exit` | fecha sessão |

- **Source**: developers.openai.com/codex/cli/slash-commands.

### 3.14 Atalhos de teclado canônicos

| Tecla | Ação |
| --- | --- |
| `Ctrl+L` | Clear screen sem reset conversation |
| `Ctrl+O` | Copy último output completed |
| `Tab` | Queue follow-up enquanto rodando |
| `Up`/`Down` | Navigate draft history no composer |
| `Ctrl+R` | History search prompts |
| `Ctrl+T` | Open transcript overlay (mostra lines unwrapped, scrollback completo) |
| `Ctrl+G` | External editor |
| `Esc` | Interrupt task ativo; segunda Esc edita previous user message |
| `Ctrl+C` ou `/exit` | Close session |
| `Alt+,` / `Alt+.` | Reasoning effort down/up |
| `Shift+Tab` | Cycle collaboration mode (Plan/Pair/Execute) |
| `?` | Toggle shortcut overlay |
| `!cmd` | Run local shell command e tratá-lo como user input |

- **Source**: developers.openai.com/codex/cli/features + `codex-rs/tui/src/bottom_pane/footer.rs::FooterKeyHints`.

---

## 4. Innovations específicas do Codex CLI

1. **Agrupamento semântico de leituras**: vários `Read` consecutivos colapsam em uma linha `Read a.rs, b.rs, c.rs` — reduz N linhas em 1 sem perder informação. **Atlas pode adotar**: agrupar leituras dentro de uma turn em um único receipt.

2. **Shimmer band animado RGB**: gradiente sincronizado ao process start (sweep period 2s, half-width 5 chars, cosine falloff) aplicado ao texto inteiro do header "Working" — não só ao spinner. Fallback elegante para terminals sem 16M: alterna `•` ↔ `◦` a cada 600ms. **Atlas pode adotar**: shimmer subtle no header de status (não só spinner discreto). Implementado em `shimmer.rs::shimmer_spans`.

3. **`HookCell.PendingReveal + QuietLinger`**: hooks rápidos (<300ms) **nunca aparecem** no transcript; sucessos silenciosos vivem 600ms e somem. Evita scroll-jank e ruído. **Atlas pode adotar**: para auto-saves, lint, format-on-save — não floodar histórico com sucessos triviais.

4. **Duration timer com pause/resume**: `StatusIndicatorWidget.pause_timer_at(now)` congela counter durante I/O bloqueante; `fmt_elapsed_compact` produz `0s/59s/1m 00s/1h 00m 00s` cabendo em qualquer largura. **Atlas pode adotar**: counter pausável durante approval prompt, etc.

5. **Output ellipsis com transcript hint**: `… +47 lines (ctrl + t to view transcript)` — comunica não só "tem mais" mas também o **caminho de fuga**. Truncamento middle (head+ellipsis+tail), não tail-only.

6. **Símbolos de approval persistentes no transcript**: depois da aprovação, `✔ You approved codex to run cmd this time` fica no histórico — auditoria visível sem precisar de log separado.

7. **Modal substitui composer (não overlay)**: aprovações forçam decisão antes de continuar, mas usam a mesma zona do composer (`bottom_pane`), evitando dialog popup que esconde o transcript.

8. **`StreamingPlanTailCell`/`StreamingAgentTailCell`**: cells transient que mutam in-place enquanto stream; substituídas por source-backed cell no final que **re-renderiza markdown em resize**. Resolve bug clássico de tabelas markdown quebradas mid-stream.

9. **`UnifiedExecFooter` reused inline**: mesma string ("3 background terminals running · /ps to view") aparece como footer linha 2 OU como inline_message do StatusIndicator — uma única fonte de truth.

10. **Magenta para `Codex-branded`**: prefixos magenta para `/comandos slash`, `$ ` prefix nos transcript exec lines, `✘ Failed to apply patch`. Diferencia do verde/vermelho semântico.

11. **Header conjugado**: `Exploring`/`Explored`, `Searching`/`Searched`, `Running`/`Ran`, `Calling`/`Called`. Tempo verbal codifica estado **sem mudar cor** (cor sinaliza outcome). Atlas pode replicar: `Lendo`/`Leu`, `Executando`/`Executou`, `Buscando`/`Buscou`.

12. **Hair space (U+200A) após emojis**: `padded_emoji("✨")` adiciona U+200A, evita "excessive padding after the emoji while still providing a small visual gap across terminals". Truque tipográfico pequeno mas confiável.

---

## 5. Limitações observadas (gaps que Atlas pode superar)

1. **Thinking não streamado**: issue #5339 confirma que CLI mostra **todo o thinking depois** que o bloco fecha, antes do tool call. A extensão VS Code streama cada bloco progressivamente — CLI ainda não. Atlas pode streamar token-a-token desde o início.

2. **Sem modo intermediário de thinking**: só `none` ou `experimental` (verbose total). Issue #5476 pede "steps only" (só títulos de cada thinking block). Atlas pode oferecer 3 modos: collapsed (só count) / titles / full.

3. **Duration timer pós-task removido**: issue #10891 — versão 0.98+ não mostra mais "Task completed in X minutes Y seconds" acima do summary. Apenas o counter durante execução. Atlas pode manter ambos.

4. **Spinner some quando ainda está trabalhando**: issue #10534 — "CLI looks finished/idle while still running" em certas condições. Atlas precisa de **heartbeat invariant**: enquanto houver tool call ou stream pendente, spinner está visível.

5. **Cores semânticas non-syntax não configuráveis**: issue #21130 pede tema para primary text, muted, borders, role labels, success/warning/error — atualmente só syntax highlighting via syntect é tematizável. Atlas pode oferecer paleta semântica completa desde o início.

6. **Aprovação repetitiva**: issue #10187 reporta usuários precisando aprovar 25× o mesmo comando "even after selecting don't ask again this session" — bug de persistência. Atlas precisa garantir "don't ask again" durável.

7. **bwrap sandbox prompts excessivos**: issue #14936 — após 0.115.0, aprovação prompted em comandos read-only como `find`, `sed`, `ls`. Atlas pode ter allowlist read-only inicial mais generosa.

8. **Tool receipts sem **count summary** condensado**: Codex mostra cada `Read` como linha (agrupada quando consecutivos), mas não tem helper `"📂 Explorou 5 arquivos, 2 pesquisas e 1 lista e executou 6 comandos"` ao final do turn. Atlas pode adicionar **turn-level receipt** condensado.

9. **Sem ícones distintos por tipo**: tudo usa `•`. Cyan no título diferencia (`Read`/`Search`/`List`/`Run`), mas não há ícones inline tipo 📂/🔍/📝/▶. Atlas pode usar ícones específicos por categoria.

10. **Reasoning como dim+italic, sem distinção visual entre tipos de thinking**: ReasoningSummaryCell é uniforme. Atlas pode diferenciar "Planning" / "Verifying" / "Searching context" / "Decision".

11. **Sem indicação de progresso quantitativa**: nada como "fase 3 de 7" ou "85% complete" — apenas duration + detail line. Atlas pode adicionar **progress bar discreta** em operações multi-step.

12. **Bottom pane modal bloqueia composer**: aprovação remove acesso ao composer; usuário não consegue digitar follow-up enquanto decide. Atlas pode permitir continuar typing com bottom-anchored approval.

---

## 6. Recomendações concretas para o Atlas Desktop AI surface

(Aplicáveis ao chat bubble React/Tauri, mantendo DNA Don Corleone com peso editorial)

### 6.1 Receipt inline (header do bubble)
- **Adotar header conjugado**: durante operação `Lendo arquivo.md`; após: `Leu arquivo.md`. Cor não muda — só o verbo.
- **Adotar count summary turn-level** ao final: `Explorou 5 arquivos, 2 buscas e 1 listagem, executou 6 comandos`. Posição: 1 linha abaixo da resposta final do agente, em `dim`.
- **Adotar agrupamento de reads consecutivos**: `Leu foo.ts, bar.ts, baz.ts` — não 3 linhas separadas.

### 6.2 Live activity footer do bubble
- **Adotar shimmer subtle** no header "Trabalhando" — sweep period 2s, half-width 5, fallback CSS animation se RGB não disponível. CSS `background-clip: text` + `linear-gradient` animado funciona em qualquer browser.
- **Adotar duration counter pausável**: format compacto Ns/Nm SSs/Nh MMm SSs. Posição: inline após header `Trabalhando (15s · esc para interromper)`.
- **Adotar detail line abaixo**: `└ Lendo InboxScreen.tsx` em dim. Wrap até 3 linhas, ellipsis no fim.
- **Heartbeat invariant**: spinner sempre visível enquanto há tool call ativa, evitar bug do Codex.

### 6.3 Distinção de operação por ícones (onde Codex falha)
- Substituir `•` único por ícones por categoria:
  - 📂 Leitura/exploração
  - 🔍 Busca/pesquisa
  - 📝 Edição/escrita
  - ▶ Execução shell
  - 🌐 Web search
  - 🔧 MCP tool
  - 💭 Thinking
  - ✓ Sucesso (verde)
  - ✗ Falha (vermelho)
- Mas manter o **header conjugado bold** ao lado, não substituir.

### 6.4 Aprovação
- **Persistir decisão visualmente no transcript** após approve/deny — frase como Codex faz: "Aprovou Codex a rodar `cmd` desta vez" + check verde.
- **"Don't ask again" durável de verdade**: persistir no .atlas/config após primeiro session approval.
- **Allowlist read-only generosa**: `ls`, `cat`, `head`, `tail`, `grep`, `find`, `git status`, `git diff` jamais pedem aprovação.

### 6.5 Thinking visibility
- **3 modos**: `collapsed` (só count), `titles` (cada thinking step com header), `full` (raw reasoning).
- **Stream token-a-token** desde o primeiro delta (superar gap do Codex CLI).
- Cores: dim + italic mantém do Codex; adicionar prefix `💭 ` no primeiro line para distinguir.

### 6.6 Hooks (lifecycle)
- **Adotar PendingReveal + QuietLinger**: hooks <300ms invisíveis, sucessos silenciosos lingeram 600ms e somem. Aplicar a auto-save, format-on-save, lint passes.

### 6.7 Output truncation
- **Head+ellipsis+tail** (não tail-only).
- Ellipsis com escape route: `… +47 linhas (clique para expandir · ⌘T para transcript)`.

### 6.8 Background processes
- **Footer reusable**: "3 processos em background · /ps para ver · /stop para encerrar" tanto inline no status quanto como linha 2 do footer (única fonte). Aplicável a watch tasks, dev servers, etc.

---

## 7. Bibliografia (URLs + autores)

### Documentação oficial OpenAI
- [Codex CLI overview](https://developers.openai.com/codex/cli) — OpenAI
- [Codex CLI features](https://developers.openai.com/codex/cli/features) — OpenAI
- [Codex CLI command-line reference](https://developers.openai.com/codex/cli/reference) — OpenAI
- [Codex CLI slash commands](https://developers.openai.com/codex/cli/slash-commands) — OpenAI
- [Codex CLI changelog](https://developers.openai.com/codex/changelog) — OpenAI
- [Codex configuration reference](https://developers.openai.com/codex/config-reference) — OpenAI
- [Agent approvals & security](https://developers.openai.com/codex/agent-approvals-security) — OpenAI
- [Sandboxing](https://developers.openai.com/codex/concepts/sandboxing) — OpenAI
- [Non-interactive mode](https://developers.openai.com/codex/noninteractive) — OpenAI
- [Reasoning models guide](https://developers.openai.com/api/docs/guides/reasoning) — OpenAI
- [Introducing GPT-5.3-Codex](https://openai.com/index/introducing-gpt-5-3-codex/) — OpenAI
- [Introducing upgrades to Codex](https://openai.com/index/introducing-upgrades-to-codex/) — OpenAI

### Código-fonte (openai/codex no GitHub)
- `codex-rs/tui/src/history_cell/mod.rs` — trait `HistoryCell`, render modes.
- `codex-rs/tui/src/history_cell/exec.rs` — `UnifiedExecInteractionCell`, `UnifiedExecProcessesCell`.
- `codex-rs/tui/src/history_cell/messages.rs` — `UserHistoryCell`, `AgentMessageCell`, `AgentMarkdownCell`, `ReasoningSummaryCell`, `StreamingAgentTailCell`.
- `codex-rs/tui/src/history_cell/approvals.rs` — `new_approval_decision_cell`, `ApprovalDecisionSubject`, `ReviewDecision`.
- `codex-rs/tui/src/history_cell/patches.rs` — `PatchHistoryCell`, `new_patch_apply_failure`.
- `codex-rs/tui/src/history_cell/mcp.rs` — `McpToolCallCell`, `mcp_auth_status_label`.
- `codex-rs/tui/src/history_cell/plans.rs` — `ProposedPlanCell`, `PlanUpdateCell`, `StreamingPlanTailCell`.
- `codex-rs/tui/src/history_cell/search.rs` — `WebSearchCell`.
- `codex-rs/tui/src/history_cell/hook_cell.rs` — `HookCell` state machine (PendingReveal/VisibleRunning/QuietLinger/Completed).
- `codex-rs/tui/src/history_cell/notices.rs` — `new_error_event` (`■`), `new_warning_event` (`⚠`), `CyberPolicyNoticeCell`, `DeprecationNoticeCell`, `UpdateAvailableHistoryCell`.
- `codex-rs/tui/src/history_cell/session.rs` — `SessionInfoCell`, `with_border`.
- `codex-rs/tui/src/history_cell/request_user_input.rs` — `RequestUserInputResultCell`.
- `codex-rs/tui/src/exec_cell/render.rs` — `ExecCell::exploring_display_lines`, `ExecCell::command_display_lines`, `output_lines`, `TOOL_CALL_MAX_LINES=5`, `TRANSCRIPT_HINT`.
- `codex-rs/tui/src/status_indicator_widget.rs` — `StatusIndicatorWidget`, `fmt_elapsed_compact`.
- `codex-rs/tui/src/motion.rs` — `activity_indicator`, `MotionMode`, `ReducedMotionIndicator`.
- `codex-rs/tui/src/shimmer.rs` — `shimmer_spans` (RGB sweep).
- `codex-rs/tui/src/bottom_pane/approval_overlay.rs` — `ApprovalOverlay`, build_options titles.
- `codex-rs/tui/src/bottom_pane/footer.rs` — `FooterMode`, `FooterProps`, single-line collapse logic.
- `codex-rs/tui/src/bottom_pane/unified_exec_footer.rs` — `UnifiedExecFooter::summary_text`.

### Issues canônicas (openai/codex)
- [#5339 Stream thinking blocks in real time](https://github.com/openai/codex/issues/5339) — autor: usuário macOS, codex-cli 0.47.0.
- [#5476 Add 'Steps Only' thinking display mode](https://github.com/openai/codex/issues/5476) — autor: BobbyWang0120 (2025-10-21).
- [#10534 Still working but no progress indication](https://github.com/openai/codex/issues/10534) — spinner some bug.
- [#10891 Missing time counter in latest CLI version](https://github.com/openai/codex/issues/10891) — autor: macOS arm64, iTerm2, v0.98.0.
- [#12278 Unified exec command disappears with exploring cell](https://github.com/openai/codex/issues/12278) — exec cell visibility bug.
- [#21130 Allow configuring semantic TUI colors beyond syntax highlighting](https://github.com/openai/codex/issues/21130) — semantic theming gap.
- [#10187 Codex repeatedly asks for approval despite auto-approve](https://github.com/openai/codex/issues/10187) — persistência de "don't ask again" bug.
- [#14936 bwrap: Approval prompt for every command after 0.115.0](https://github.com/openai/codex/issues/14936) — sandbox prompt regression.
- [#1247 Improve copy/paste in Rust TUI](https://github.com/openai/codex/issues/1247) — usability.
- [#1618 Control over color theme in TUI](https://github.com/openai/codex/issues/1618) — theming.
- [#9381 Expose thinking level param](https://github.com/openai/codex/issues/9381) — reasoning configurability.

### Análises externas
- [Simon Willison — Reverse engineering Codex CLI to get GPT-5-Codex-Mini to draw me a pelican](https://simonwillison.net/2025/Nov/9/gpt-5-codex-mini/) — `--debug` flag inspeção, reasoning summary on stderr (2025-11-09).
- [Aman Mittal — First few days with Codex CLI](https://amanhimself.dev/blog/first-few-days-with-codex-cli/) — `/status` output, `gpt-5.2-codex` default, `medium` reasoning.
- [Daniel Vaughan — The codex-rs Architecture: How OpenAI Rewrote Codex CLI in Rust](https://codex.danielvaughan.com/2026/03/28/codex-rs-rust-rewrite-architecture/) — Ratatui immediate-mode, color scheme (cyan tips, green success, red errors, magenta Codex-branded), insta snapshot tests (2026-03-28).
- [Daniel Vaughan — Codex CLI as a Unix Citizen: Prompt-Plus-Stdin, Shell Pipelines](https://codex.danielvaughan.com/2026/04/15/codex-exec-unix-pipelines-prompt-plus-stdin/) — `codex exec` semantics (2026-04-15).
- [Jonathan Fulton — Inside the Agent Harness: How Codex and Claude Code Actually Work](https://medium.com/jonathans-musings/inside-the-agent-harness-how-codex-and-claude-code-actually-work-63593e26c176) — comparativo arquitetural.
- [DeepWiki — openai/codex Terminal User Interface](https://deepwiki.com/openai/codex/4.1-authentication-system) — App/ChatWidget/BottomPane/HistoryCell hierarchy.
- [Shipyard — Codex CLI Cheatsheet](https://shipyard.build/blog/codex-cli-cheat-sheet/) — `/statusline`, `project_doc_max_bytes=32 KiB`.
- [Vladimir Siedykh — Codex CLI approval modes 2025](https://vladimirsiedykh.com/blog/codex-cli-approval-modes-2025) — Auto/Read-only/Full Access.
- [SmartScope — Codex CLI No-Approval Guide](https://smartscope.blog/en/generative-ai/chatgpt/codex-cli-approval-modes-no-approval/) — `--full-auto`, `-a never`, `--dangerously-bypass-approvals-and-sandbox`, `--yolo`.
- [Nathan Onn — The latest Codex CLI commands](https://www.nathanonn.com/the-latest-codex-cli-commands-that-will-save-your-sanity-and-your-rate-limits/) — `/diff`, `/review`, `/fork`.
- [Augment Code — Codex CLI v0.116.0 enterprise features](https://www.augmentcode.com/learn/openai-codex-cli-enterprise) — versioning.
- [silenceper — Codex Beginner Guide](https://silenceper.com/en/article/2026-05-07-codex-beginner-guide/) — workflow básico.
- [Vincent Schmalbach — Breaking Out of the Codex Sandbox](https://www.vincentschmalbach.com/breaking-out-of-the-codex-sandbox-while-keeping-approval-controls/) — sandbox internals.
- [computingforgeeks — OpenAI Codex CLI Cheat Sheet 2026](https://computingforgeeks.com/codex-cli-cheat-sheet/) — atalhos.
- [LinkedIn — orhunp post sobre Ratatui + Codex Fund](https://www.linkedin.com/posts/orhunp_rustlang-ratatui-tui-activity-7325942251916808193-3T6B) — Ratatui foundation partnership.
- [Undercode Testing — Ratatui Joins OpenAI's Codex Fund](https://undercodetesting.com/ratatui-joins-openais-codex-fund-building-terminal-uis-with-rust/) — funding context.
- [OpenAI Community — Codex CLI prompting for approval](https://community.openai.com/t/codex-cli-and-ide-prompting-for-approval-to-edit-files/1354993) — "Waiting for approval to edit files" text.

### Constantes técnicas extraídas
- `TOOL_CALL_MAX_LINES = 5` (em `exec_cell/render.rs`)
- `USER_SHELL_TOOL_CALL_MAX_LINES = 50` (idem)
- `MAX_INTERACTION_PREVIEW_CHARS = 80` (idem)
- `TRANSCRIPT_HINT = "ctrl + t to view transcript"` (idem)
- `HOOK_RUN_REVEAL_DELAY = 300ms` (em `hook_cell.rs`)
- `QUIET_HOOK_MIN_VISIBLE = 600ms` (idem)
- `STATUS_DETAILS_DEFAULT_MAX_LINES = 3` (em `status_indicator_widget.rs`)
- `DETAILS_PREFIX = "  └ "` (idem)
- Shimmer sweep period `2.0s`, band half-width `5.0` chars (em `shimmer.rs`)
- Animation frame interval `32ms` (~30 FPS) (em `status_indicator_widget.rs::render`)
- `SESSION_HEADER_MAX_INNER_WIDTH = 56` (em `session.rs`)
- `LIVE_PREFIX_COLS` (definido em `ui_consts.rs`, usado por `UserHistoryCell`)
- `FOOTER_INDENT_COLS` (em `ui_consts.rs`, usado por footer)
- `FOOTER_CONTEXT_GAP_COLS = 1` (em `footer.rs`)
- `MODE_CYCLE_HINT = "shift+tab to cycle"` (idem)

### Cores semânticas observadas
- **Default foreground**: texto primário, bullets ativos.
- **`.dim()`**: metadados, output stdout, paths em separadores, prefixos `└`/`  `, ellipsis hints, `(0s · esc to interrupt)`.
- **`.cyan()`**: parâmetros (path, query, target host), role labels (em CyberPolicyNotice), update CTAs, URLs underlined, "Trusted Access for Cyber", note text em RequestUserInputResultCell, titles dos ParsedCommands (`Read`, `Search`, `List`, `Run`).
- **`.green().bold()`**: bullets `•` de sucesso, `✔ ` approval, `✓` transcript success marker.
- **`.red().bold()`**: bullets `•` de failure, `✗ ` denial, `✗` transcript failure marker, `■ {error}`.
- **`.magenta()`**: `$ ` shell prefix nos transcript lines, `✘ Failed to apply patch`, `Plan mode` indicator, `/ps` command prefix.
- **`.yellow()`**: `⚠ ` warning prefix.
- **`.dark_gray()`**: hints opcionais em `new_info_event`.
- **`.italic()`** (combinado com dim): `ReasoningSummaryCell` body.
- **`.underlined()`**: URLs em notices.

---

## 8. Notas finais / pesquisa adicional necessária

Pontos não confirmados ou que precisariam de mais investigação:
- **[unconfirmed]** Não localizei screenshots de alta resolução com a versão atual (5.2-codex+) lado a lado com Claude Code para comparação direta de visual hierarchy. Issues mostram bug reports textuais mas raramente prints.
- **[unconfirmed]** A integração MCP `verbose` (`/mcp verbose`) — formato exato dos detalhes de server status quando expandido. Source disponível mas não inspecionado em profundidade.
- **[unconfirmed]** O comportamento exato do `/title` picker (reorderable visual?) — docs mencionam "use the picker to toggle and reorder items" mas implementation details não foram inspecionadas.
- **[unconfirmed]** Como exatamente a "queue" funciona quando user pressiona Tab durante execução (visual da queue, ordem de processamento). Implementation está em `chat_composer` mas não foi inspecionado.
- **[unconfirmed]** Animação exata do `/theme` live preview — docs dizem "preview themes live, and save your selection" mas não há descrição visual.
- **[unconfirmed]** Comportamento de `tui.notification_method` (osc9/bel/auto) e como `tui.notification_condition` (unfocused/always) interagem.

Para uma segunda rodada de pesquisa focar em: vídeos demo no YouTube/Twitter mostrando frames específicos, e o arquivo `codex-rs/tui/src/chatwidget.rs` (orquestração de eventos → cells, que coordena tudo acima).
