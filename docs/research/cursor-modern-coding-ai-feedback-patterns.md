# Modern AI Coding Assistant Feedback Patterns

> Research for Atlas Desktop, sweep date: 2026-05-15.
> Author: Atlas research agent (mandate: catalog state-of-the-art UX patterns for surfacing AI agent state).
> Scope: 10 products + adjacent tooling (Warp, Codex CLI, Claude Code).

---

## Executive Summary — State of the Art (May 2026)

In the 14 months between Devin's launch (March 2024) and this sweep (May 2026), AI coding assistant UX has crystallized around **five canonical surfaces** plus **four emerging patterns**. The industry has moved past the "chat + spinner" baseline into structured, multi-channel feedback systems.

**The five canonical surfaces:**

1. **Streaming text panel** — Token-by-token render of model output, often with a dedicated header (model name, response duration) and reasoning ("thinking blocks") that auto-expand during streaming and auto-collapse on completion (Cursor, Claude Code, Zed, JetBrains, VS Code Copilot).
2. **Tool-call inline display** — Each tool invocation rendered as a collapsible block in chat, tagged with status (running/done/error), with input arguments visible and output sometimes elided. Often gated by a "Continue / Cancel" approval prompt (Continue.dev, Windsurf, Zed, VS Code Copilot).
3. **Persistent task/todo list** — A separate region (above the input in Claude Code, inline in Cascade, Issue Timeline in Devin) that shows the agent's plan and marks items as the agent progresses. Replaces the noisy "you saw the todo update flow by" pattern of late 2024.
4. **Diff-then-confirm** — File edits are not applied directly; they appear as colorized diffs with `Keep`/`Undo` or `Accept`/`Reject` controls per hunk. Multi-buffer "review changes" tab is now standard (Zed, Cursor, VS Code Copilot, Aider's `/diff` command).
5. **Status indicator on the surface itself** — Tab title, sidebar entry, or status bar communicates per-agent state (working, blocked, completed, errored) so users monitoring N agents can scan. Warp leads here with colored-dot+label; Cursor and Claude Code lag (community-requested feature, partially shipped).

**The four emerging patterns (2025-2026 originals):**

6. **Parallel-agent dashboard** (Cursor 3 "Agents Window", Replit Agent 4 Design Canvas, Devin parallel sessions, VS Code Copilot Agents page, Claude Code `claude agents` view, Warp Agent Management Panel) — All running agents in one pane, each row a status+output preview, with side-by-side or grid layouts. Cursor 3.1 added drag-between-tiles.
7. **Plan-then-execute mode** (Cursor Plan Mode, Devin 2.0 Interactive Planner, Replit Agent 4 Ideation Phase, Aider Architect mode, Claude Code `/plan`) — Agent produces a reviewable markdown plan first, user edits inline, then explicitly triggers build. Distinct from "ask clarifying questions in chat."
8. **Live preview pane** (V0, Replit Agent 4 Design Canvas, Cursor Design Mode) — Generated app renders live in a sandboxed runtime as code streams in, with element-selection-to-edit. V0's "LLM Suspense" rewrites tokens mid-stream to fix imports and icons in <100ms.
9. **Replay/timeline** (Devin replay timeline, Replit checkpoints, Cursor checkpoints, Codex `/resume` saved-session picker) — Every command/file edit/browser action recorded, scrubbable like DVR. Devin's Issue Timeline color-codes events (red high-impact, yellow medium, green value-delivered).

**The honest gaps (all 10 products fail at):**
- Confidence/uncertainty signalling (the model still rarely flags "I'm guessing here")
- Time-remaining estimates on long tasks (everyone shows spinner; no one shows ETA)
- Mid-stream steering that survives state transitions (Codex queues, Cursor interrupts, but nothing is great)
- Multi-modal feedback hierarchy (sound vs OS-notification vs in-app vs tab-title — most products dump everything into one channel)
- Compact/expanded modes optimized for parallel monitoring vs deep focus

---

## Comparative Matrix

### Surfaced States

| State | Cursor 3 | Continue.dev | Aider | Zed | Windsurf | Replit A4 | Devin 2.0 | V0 | JetBrains AI | Copilot VS Code | Claude Code | Codex CLI | Warp |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| typing (user) | y | y | y | y | y | y | y | y | y | y | y | y | y |
| thinking (AI, streaming reasoning) | y | y | n (text only) | y | y | y | y | y (left pane) | y | y | y (inline progress) | y ("Thinking…") | y |
| applying edit (diff preview) | y | y | y (colorized) | y (multi-buffer) | y | y | y | y (preview) | y | y | y | y | y |
| executing command/terminal | y | y | y (`/run`) | y | y (terminal allow/deny) | y | y (Shell tab) | y | n | y (terminal embed) | y (inline) | y (background w/ 3-line preview) | y |
| searching codebase | y (inline log) | y (collapsed) | y (repo-map) | y | y | y | y (Devin Search) | y | y (Codebase Mode) | y | y | y | y |
| MCP tool call | y | y | n (alpha) | y | y (tool+args visible) | y | y | y | y | y | y | y | y |
| external API/web | y | y | y (`/web`) | y | y | y | y | y | y | y | y | y | y |
| awaiting confirmation | y (per-tool) | y (Continue/Cancel) | y (Y/n) | y (per-tool regex rules) | y (allow/deny lists) | y | y | y | y | y (permission picker) | y | y (`/permissions`) | y (badges) |
| completed | y (tab status weak) | y | y (prompt returns) | y (Review Changes btn) | y | y | y | y | y | y | y | y | y (badge) |
| errored | y | y (refresh btn) | y | y | y (MCP refresh btn) | y | y | y (autofixer) | y | y | y | y | y |
| blocked (waiting on user) | y (subtle, criticized) | y | y | y | y | y | y | n/a | y | y | y | y | y (yellow badge) |
| hibernating/paused | y (cloud agents) | n | y (Ctrl+Z) | n | n | y | y | n | n | y (background agents) | y (Ctrl+Z + fg) | y (`/resume`) | y |

### Notification Channels

| Channel | Cursor 3 | Claude Code | Codex CLI | Warp | Devin 2.0 | Replit A4 | Continue.dev | Windsurf | Zed | V0 | JetBrains AI | Copilot VS Code |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Toast in-app | y | y (hooks) | n | y (corner, auto-dismiss 2 max) | y | y | n | n | n | n | n | n |
| OS native notification | y (built-in) | community hook | n | y (background) | y (Slack/email) | y (mobile push) | n | n | n | n | n | requested |
| Sound/chime | y (built-in, March 2025) | community hook | n | y | n | n | n | n | n | n | n | n |
| Tab title status | y (subtle, criticized) | y (terminal bell) | y (terminal bell) | y (badge per tab) | n | y | n | n | n | n | n | n |
| Dock bounce | y (via OS notif) | community hook | n | y | n | n | n | n | n | n | n | n |
| Sidebar update | y (Agents Window) | y (`claude agents`) | n | y (Agent Mgmt Panel) | y (session feed) | y (parallel threads) | y | y | n | n | n | y (Agents page) |
| Slack/external | y (Slack official) | community webhooks | n | n | y (Slack/Linear/Teams) | n | n | n | n | n | n | y (GitHub PR) |
| Email | n | n | n | n | y | n | n | n | n | n | n | n |

### Interaction Affordances Mid-Stream

| Affordance | Cursor 3 | Claude Code | Codex CLI | Aider | Zed | Windsurf | Continue.dev | Replit A4 | Devin 2.0 | V0 | Copilot |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Cancel mid-stream | y (Esc) | y (Esc) | y (Ctrl+C×2) | y (Ctrl+C) | y | y | y (button) | y | y (take over) | y | y |
| Steer (inject new instruction during run) | partial | y (queued) | y (Enter=steer / Tab=queue, distinct!) | partial | y (queue) | y (queue) | n | y | y | y (element select) | y |
| Pause/resume | y (cloud agents) | y (Ctrl+Z + fg) | y (`/resume` picker) | n | n | y (Auto-Continue button at 20-tool limit) | n | y | y (handoff) | n | y |
| Accept/reject inline edit | y (Keep/Undo) | y | y | y (Y/n) | y (per-hunk) | y | y | y | y | y | y (Keep/Undo overlay) |
| Take over (drive directly) | y (Glass IDE) | y (terminal IS the IDE) | y | y | y | y (Take Control button) | y | y | y (embedded IDE) | y (live edit) | y |
| Pin importance | n | n | n | n | n | n | n | n | y (knowledge items) | n | n | n |

---

## Per-Product Detail

### 1. Cursor 3 "Glass" (April 2026)

**Surfaces.** Agents Window (replaces 2.x Composer pane), Agent Tabs (side-by-side or grid; 3.1 added tiled layout with drag-between-tiles), Chat panel (legacy), Inline Edit (Cmd+K), Tab completion, Design Mode (Cmd+Shift+D toggle), in-app browser, Plan Mode editor.

**Streaming text.**
- Thinking blocks: auto-expand during stream, auto-collapse on completion. Label shows `Thought for Xs` with chevron toggle. Inline expansion both during stream and after — fixed in 3.0 (previously broke during streaming).
- The Composer panel renders `content` only; the Chat panel renders both `content` and `reasoning_content` (per DeepSeek V4 integration notes — model-specific).
- Composer 2 model leaves long chain-of-thought trails in comments, informing the streaming UX design.

**Tool calls.** Each tool call is a collapsible block in the stream. Compact chat mode (since 1.4) hides tool icons and collapses diffs by default for extended sessions.

**Status indicators (the criticized weak point).**
- Tab title changes "only subtly" when an agent is blocked on user action (Run/MCP Allow/Accept). Users have filed multiple requests asking for `· Awaiting you` suffix, accent color, hand/pause/bell icon.
- The Agents Window sidebar shows running/completed/waiting per agent. Real-time progress strings like "searching codebase" or "editing files" appear.
- Lacks the context-window-progress-bar circle that classic Cursor showed (community complaint in Glass alpha).

**Inline Edit (Cmd+K).** Floating input box on selected code; press Return; diff preview replaces code in-place; accept/reject. Documented as procedural — visual specifics live only in screenshots/community posts.

**Tab completion.**
- Ghost text: semi-opaque preview of multi-line completion.
- Diff popup to right of current line when modifying existing code.
- Accept: Tab. Reject: Esc. Word-by-word: Ctrl+→.
- Specialized non-reasoning model, optimized for speed over capability; learns from accept/reject signals.

**Design Mode.** Click UI elements in built-in browser; agent receives component tree path + computed styles + surrounding context. Shift+drag for selection. Cloud agents auto-produce screenshots and demo videos.

**Plan Mode.** Markdown plan rendered as a tab with same behaviors as files (dirty tracking, reload on changes, save/copy/export). Agent asks clarifying questions inline; plans included in shared chats alongside transcript.

**Voice Mode (3.1).** Mic icon in chat input. Ctrl+M push-to-talk; held to speak, released to transcribe. Real-time waveform + timer + cancel/confirm buttons during recording. Custom submit keywords configurable.

**Notifications.**
- Built-in sound on chat completion (added March 2025, sometimes unreliable per bug reports).
- Slack official integration: `@cursor do my work` clones repo, runs agent, opens PR, messages back when merged/approved.
- Background agent in Slack returns notification + GitHub PR link.
- No native dock bounce/OS notification for in-IDE agents (community workaround `cursor-agent-notifier`).

**Innovative pattern.** `/worktree` (creates isolated git worktree for changes) and `/best-of-n` (same task run in parallel across multiple models, each in its own worktree, then compared).

**Mid-stream affordances.**
- `⌥+Enter` queues message (delivered after current tool call).
- `⌘+Enter` interrupts immediately.
- "Auto-Continue" at tool-limit boundary (legacy from 1.x; now unlimited tool calls in 3.x).
- Cancel mid-stream supported.

**Long-running tasks.** Real-time progress strings; cloud agents generate screenshots/demos; Await tool lets agents wait for background shell + subagents until specific output ("Ready"/"Error"). Checkpoints rollback supported.

**Uncertainty.** No first-class affordance — relies entirely on model prompting.

### 2. Continue.dev

**Surfaces.** Chat panel (Cmd/Ctrl+L), Inline Chat, Quick Chat. VS Code extension built on React + Redux Toolkit.

**Agent mode tool calls.**
- Three permission modes: **Ask First** (default — `Cancel`/`Continue` buttons), **Automatic** (no prompt), and per-tool configuration.
- Tool calls inline in conversation with model's reasoning surrounding them.
- Known UX gap (issue #5684): after first tool call, additional reasoning is rendered uncollapsed in the user-facing response stream.

**Slash commands.** Type `/` for dropdown. Built-in `/edit` streams edits directly into editor. Custom commands defined in `config.json`; the run function is an async generator that yields strings as you want them streamed to the UI.

**Streaming.** Token-stream into the panel. Premature-close errors surface as "The response was cancelled mid-stream" (issue #8169).

**Rules.** System message rules loaded by core from config.json/config.yaml.

**Context.** Implicit (active file), `#` for files/folders, `@` for participants, image attachments.

**Limitations vs peers.** No collapsed tool-call summaries by default; no parallel-agent dashboard; no inline diff multi-buffer review; modest progress feedback for long ops.

### 3. Aider (terminal)

**Surfaces.** Single REPL prompt at `>` in the terminal. Pretty colorized output by default. Built on `prompt-toolkit` with emacs/vi keybindings.

**Startup banner.** `Aider v0.37.1-dev / Models: gpt-4o with diff edit format, weak model gpt-3.5-turbo` + `Git repo: .git with 258 files`.

**File-into-chat UX.** `/add path/to/file.py` echoes which files joined the chat. `/drop` removes. `/read-only` adds reference files.

**Diff rendering.** Aider shows colorized diffs inline before applying. `/diff` shows changes since last assistant message. Architect mode separates planning (architect model) from edit emission (editor model) — useful when frontier models reason but mangle structured diff output.

**Modes.** `/code` (default), `/architect` (two-model plan+edit), `/ask` (no edits), `/chat-mode` to switch.

**Slash command catalog (representative).**
- File: `/add`, `/drop`, `/read-only`, `/ls`
- Edit: `/code`, `/architect`, `/lint`
- Git: `/commit`, `/undo`, `/diff`, `/git`
- Run: `/run` (output not in chat), `/test` (output in chat on non-zero exit)
- Context: `/clear`, `/reset`, `/tokens`, `/context`, `/map`, `/map-refresh`
- IO: `/editor` (external editor for multi-line), `/paste` (clipboard incl. images), `/voice`, `/web` (URL scrape to markdown)
- Model: `/model`, `/editor-model`, `/weak-model`, `/reasoning-effort` (low/med/high), `/think-tokens`
- Session: `/load`, `/save`, `/multiline-mode`, `/copy`, `/copy-context`

**Confirmation prompts.** Y/n inline before applying edits / committing. `--yes-always` to bypass.

**Auto-lint, auto-test.** After edit, runs lint and tests; self-fixes on failure.

**No equivalents.** No live preview, no parallel-agent dashboard, no OS notifications, no replay timeline. Strictly terminal-native.

**Strength.** Git-native — every AI edit becomes a commit. Repo-map gives structural understanding upfront. Architect/editor separation is its signature design pattern.

### 4. Zed AI

**Surfaces.** Agent Panel (full-editor, not a thin chat box — exposes entire LLM request). Inline transformation. Custom streaming-diff protocol working with Zed's CRDT-based buffers — edits appear as soon as streamed, token by token.

**Tool call display.** Streamed inline with indicators showing which tools are in use.

**Permissions (v0.224.0+).** `agent.tool_permissions.default` = `confirm` (prompt for approval) or `allow` (auto-approve). Per-tool regex rules under `tools` key: auto-approve, auto-deny, or always confirm.

**Diff review.**
- Inline diffs in single buffer with per-hunk accept/reject.
- "Review Changes" button (Shift+Ctrl+R) opens dedicated multi-buffer tab with all changes; accept/reject per hunk or whole set.
- Setting to hide single-buffer review controls (force everything through multi-buffer).
- Side-by-side diff viewing (v0.224.4).

**Crosshair icon (bottom-left of panel).** Follow agent as it reads/edits — view scrolls automatically. Also accessible via Cmd+Enter on submit.

**Feedback.** Thumbs up/down per agent response. Rating sends data to Zed's servers (consent required).

**Other affordances.** Export thread as Markdown (file icon). Model selector. Profile selector (manages tool permissions). Changes summary above message editor (file count + line counts). Restore Checkpoint buttons after edits.

**States.** Generating / Edited / Completed / Errored explicitly documented.

**Known UX issue.** Claude thinking blocks always expand by default in Zed Agent Panel (regression issue #52536 vs default collapse in other surfaces).

### 5. Windsurf (Codeium) Cascade

**Surfaces.** Cascade panel (dropdown top-left to switch between concurrent Cascade chats), embedded browser with element targeting, terminal with allow/deny lists.

**Tool call visibility.** MCP tool calls show tool name + arguments. Loading indicators per installed MCP during init. Refresh button on error-state MCPs for manual recovery.

**Auto-Continue.** At Cascade's 20-tool-per-prompt limit, a `continue` button appears. Auto-Continue setting enables automatic resumption.

**Todo list inside conversation.** Cascade creates a Todo list within the chat thread to track multi-step progress. User can ask for plan adjustments inline.

**Message queuing.** While Cascade is working, type → Enter to queue. Visible in input area before execution, can be deleted before delivery.

**Permissions.**
- Terminal: allow-list (auto-execute) and deny-list (always ask) — `windsurf.cascadeCommandsAllowList` setting.
- MCP: prompt for approval per tool call; `alwaysAllow` array auto-approves named tools.

**Checkpoints.** Hover over prompt to reveal a revert arrow on the right. Named snapshots can be created and navigated.

**Problems panel integration.** Each diagnostic has `Send to Cascade` button and `Explain and Fix` context menu — auto-attaches as `@` reference.

**Context window indicator.** Shown for current usage by Cascade agent.

**Notable.** Continuously-running long-term planner agent that refines plan independently from immediate-action agent (specialized planning subagent).

### 6. Replit Agent 4

**Phases (each with distinct UI).**
1. **Ideation & Planning.** Agent asks clarifying questions and produces a plan before any code is written. User can submit requests in any order.
2. **Design Phase.** Infinite canvas (Design Canvas) with side-by-side comparison of multiple UI variants. Shows two content types: **Artifact previews** (interactive, running app — click through actual UI) and **design mockups** (lighter visual prototypes for fast exploration).
3. **Build Phase.** Parallel subagents work on different parts simultaneously. Progress across tasks "clearly visible." Conflict resolution by specialized sub-agents.
4. **Review & Merge.** Track status of each task → review → approve → merge into main app. Web-based preview, no local setup or deploy required.

**Real-time visibility.** Watch the app & UI develop. Mobile app for live monitoring. Home page shows project progress in real time. Checkpoints throughout for rollback.

**Self-testing UI (Agent 3 → Agent 4).** REPL-based verification: vars persist across interactions, browser sessions persist, server+client logs captured between executions, DOM with ARIA + test attributes inspected, DB query results visible. Subagents summarize testing results to main agent ("what works and what's broken"). 200+ minute autonomous runs documented (mostly backend; not visualized to user).

**Strength.** Parallel sub-agents + Design Canvas is unique. Foreground UI is preview-heavy: user evaluates *the running product* rather than reading code.

### 7. Cognition Devin 2.0

**Surfaces.**
- **Agent-native IDE** (embedded, Cmd+I/Cmd+K supported for edits/inline AI within Devin's IDE)
- **Workspace sidebar** with Shell (terminal with copy + live output), IDE (embedded editor, take-over to run/edit), Browser (docs + web testing + file mgmt)
- **Session feed** with progress steps (clickable, jump to tool outputs and decision points)
- **Replay timeline** (every command/file diff/browser action recorded; interactive timelapse)
- **Devin Search** (codebase exploration with cited answers)
- **Devin Wiki** (automatic repo indexing with architecture diagrams)

**Interactive Planner.** Devin researches codebase + develops plan with relevant files + findings + preliminary plan within seconds. User modifies before autonomous work begins.

**Session Insights (post-completion).**
- Four header metrics: ACU Usage, User Messages, Session Size (XS-XL), Category (feature/bugfix/etc.). XL+ flagged as unhealthy.
- **Issue Timeline** tab: chronological color-coded events (red high-impact problem, yellow medium-impact, white/gray significant event, green value delivered). Events linked to specific issues appear in bold.
- **Actionable Feedback** tab: improved prompts with interactive highlighting + configuration recommendations.
- **Knowledge Usage** tab: which knowledge items helped or hindered.

**Parallel sessions.** Spin up multiple parallel Devins, each with own cloud-based IDE.

**Handoff.** `/handoff` transitions work between local and cloud environments.

**Access points.** Web app, Slack, Microsoft Teams, terminal CLI.

**Innovative pattern.** Session Insights is the first product-grade post-mortem UI in this category — equivalent to a flight-data-recorder analysis vs the "I think it worked" feedback every other tool gives.

### 8. V0 by Vercel

**Surfaces.** Two-pane: **left = reasoning + streaming code being written**, **right = live preview** rendering in sandboxed Next.js runtime. Plus: file tree, Git panel (branch+PR+deploy-on-merge), database connectors (Snowflake, AWS), VS Code-style editor.

**Generation flow.**
1. User submits prompt in chat box.
2. Parses for layout intent + component types.
3. Plans component tree.
4. Streams TypeScript/JSX into preview pane while styles compile.
5. User sees rendered website "on the first attempt" thanks to autofixers.

**LLM Suspense — the standout innovation.** A framework that **manipulates text as it streams** to the user.
- Find-and-replace for cleaning up incorrect imports.
- For outdated lucide-react icons: embed every icon name in vector DB; embedding search suggests closest available alternative within 100ms.
- Replaces lengthy blob storage URLs with shorter tokens before LLM processing, reconstructs after.

**Autofixers.** Run post-generation or during streaming. AST-level multi-file changes — wrap React Query hooks in required providers, auto-complete `package.json` dependencies.

**Live editing.** Click element in preview → describe tweak in plain English → v0 applies as targeted patch (not full regen).

**Mobile.** iOS app supported.

**Iteration.** GitHub push; one-click Vercel deploy; sandbox imports GitHub repos with config auto-pulled.

### 9. JetBrains AI Assistant

**Surfaces.** AI Chat tool window (right toolbar; DataGrip needs `More tool windows`). Toggle via Ctrl+\\ between Chat mode and Agents (Junie).

**Model picker.** Dropdown with badges:
- "reasoning model" badge for complex-task models
- "supports images" icon for vision models
- "high cost" warning for token-intensive models

**Code snippet actions (top-right of each code block).**
- Apply (integrate into current file)
- Copy to Clipboard
- Insert Snippet at Caret
- Create File from Snippet
- Run Snippet

**Change navigation.** Next/previous arrows to step between modifications.

**Context.** Files, folders, images, database objects, UI elements. **Codebase Mode** setting (gear icon) auto-gathers project context, respecting `.gitignore` and `.aiignore`.

**History.** Per-project chat history. Rename/delete/search chats. Ctrl+F search within a conversation (multi-line).

**Notable gap.** Selecting code + shortcut routes to main AI Assistant tool window, not a dedicated inline-chat popup — community has flagged this as inferior to Copilot's inline-chat model.

### 10. GitHub Copilot Chat (VS Code)

**Surfaces.**
- **Chat View** (Ctrl+Alt+I) — multi-turn, agentic, multi-file edits
- **Inline Chat** (Ctrl+I/Cmd+I) — in-editor edits and terminal command suggestions
- **Quick Chat** (Ctrl+Shift+Alt+L) — lightweight, doesn't leave current work

**Agent Mode** — high-level prompt, agent plans steps, selects files, runs tools/terminal, iterates. Configurable permission levels per session: Default Approvals, Bypass Approvals, Autopilot.

**Permissions picker.** In Chat view header. Per-session choice of autonomy level.

**Agent Logs + Chat Debug view.** Chronological event log of tool calls + LLM requests + prompt file discovery.

**Change review.** Inline diff with overlay controls `Keep` and `Undo` per edit. Checkpoints for rollback.

**Image carousel (experimental).** Review multiple media files from tool results and assistant messages.

**Context affordances.** Implicit active file, `#`-mentions (files/folders), `@`-mentions (participants), image attachments.

**Cloud Agent / Coding Agent.**
- Available in Pro/Pro+/Business/Enterprise.
- Agents tab within a repo to initiate, monitor, manage sessions.
- Agents page for global view.
- Session list with status per session; click row → opens session log with tools-in-use + duration.
- Steering input ("step in" mid-run, 1 premium request per message).
- Access via: agents panel, agents page, VS Code, JetBrains IDEs, Eclipse, GitHub CLI, Raycast, session logs.

**Sessions type dropdown.** In chat input — switch session type (local/background/cloud).

### Bonus: Claude Code (terminal, React + Ink)

(Included because it's the dominant reference point cited by every other tool's UI debate.)

**Framework.** React + Ink + Yoga layout. Rich structured TUI, not flat text.

**Streaming.** Token-by-token render. Each tool call appears as it happens. File changes show as colorized diffs.

**Thinking spinner (v2.1.116+).** Progress inline: "still thinking" → "thinking more" → "almost done thinking" — replaces separate hint row. v2.1.139: spinner warms to amber after 10s to signal Claude still working.

**Terminal progress indicator (OSC 9;4, v2.1.128).** Stays visible across full turn; previously flickered between tool calls.

**Fullscreen mode (v2.1.110, `/tui fullscreen`).** Flicker-free rendering, lower memory, mouse support, auto-copy on select. Scrollable dialogs (arrow keys, PgUp/PgDn, home/end, mouse wheel).

**Todo → Tasks (v2.1.16+, Jan 2026).** Fixed todo list above input titled `/todo (1 of 3)` in grey. Tool use + result for todos is hidden; only the persistent fixed list is shown. Ctrl+T to toggle.

Tasks (replacing Todos): dependency tracking, file-system persistence, cross-session collaboration. `TaskCreate`, `TaskUpdate`, `TaskList`, `TaskGet`. Spinner in task list on `in_progress`.

**Agent View (May 2026, `claude agents`).** Dashboard for every Claude Code session you have open. Each row: session, last response, timestamp, "needs you" flag. Reply inline without attaching; Enter to jump in.

**Collapsible sections (v2.1.121).** LSP diagnostic summaries expand on click/Ctrl+O with expand hint. Background-shell tool calls move to "Completed" instead of staying under "Working" (v2.1.120).

**Notifications.** Community-built (`@wyattjoh/claude-code-notification`, `echook`, `sound-mcp`, `Claude-Code-Usage-Monitor`). Native dock-bounce relies on terminal bell + emulator config (iTerm2/kitty/WezTerm/Windows Terminal). System sounds: Glass (default), Submarine, Frog, Purr, Basso, Blow, Bottle, Funk, Hero, Morse, Ping, Pop, Sosumi, Tink.

**Mid-stream affordances.** Esc to interrupt. Ctrl+Z + `fg` to suspend/resume.

### Bonus: OpenAI Codex CLI

**Framework.** Ink + React, TerminalChat component.

**Status indicator.** "Thinking…"

**Background terminal preview.** Shows each background terminal's command + **up to 3 recent non-empty output lines** — gauges progress at a glance. This is the most concise long-running-task visualization in the category.

**Steer vs Queue (the cleanest disambiguation in the industry).**
- **Enter during agent run = STEER** (interrupts immediately for urgent corrections).
- **Tab during agent run = QUEUE** (holds prompt until current turn finishes for follow-up tasks).
- Recent PR (#12569) queues steer-Enter while final-answer is still streaming to prevent dead state.

**Slash commands.** `/` opens popup. `/clear`, `/new`, `/resume`, `/fork`, `/compact`, `/copy`, `/exit`, `/model`, `/fast`, `/permissions`, `/personality`, `/statusline`, `/theme`, `/experimental`, `/diff`, `/review`, `/plan`, `/init`, `/mention`, `/agent`, `/ps`, `/mcp`, `/apps`, `/status`, `/feedback`, `/sandbox-add-read-dir`.

**Input modifiers (3 prefix chars).**
- `@` fuzzy file search → attach file
- `!` execute local shell, display output but don't pass to model
- `-i`/`--image` attach images at launch or paste screenshots

**Other shortcuts.** Ctrl+G external editor (respects `$VISUAL`/`$EDITOR`). Ctrl+L clear screen without losing context. Ctrl+C/Ctrl+D cancel or exit (twice to force). Esc,Esc walks back through transcript. Up/Down arrow for draft history.

**Cloud containers.** Runs in OpenAI-managed cloud containers; user can disconnect while task continues.

### Bonus: Warp Terminal (relevant for tab-badge design)

**Per-tab status icon.**
- Magenta clock = In progress
- Green check = Done
- Red triangle = Error
- Gray stop = Cancelled
- Yellow stop = Blocked (waiting user approval)

**Attention badge** on tabs with unread notifications.

**Toast notifications.** Window-corner alerts when agent in another tab needs attention. Auto-dismiss after a few seconds, **max 2 simultaneous**, paused on hover, clickable to navigate to agent.

**Notification Mailbox.** Bell icon → sidebar centralizing all agent notifications. Filters: All tabs, Unread, Errors.

**Desktop notifications.** Native system-level alerts when Warp is in background.

**Agent Management Panel.** Centralized view of all active agents across sessions. Monitor, cancel, review errors, jump to conversations needing input.

**"Warping" indicator.** Continuous feedback during agent execution. Short "Agent Tips" surfaced underneath to educate user on advanced workflows.

**Supported agents.** Oz, Claude Code, Codex, OpenCode.

---

## Top 10 Innovative Patterns Observed (ranked)

1. **Devin Issue Timeline (color-coded chronological events with impact rating)** — Most product-grade post-mortem in the category. Red/yellow/white-gray/green semantics map directly to attention priority. Atlas should copy this for ObraCommandCenter session history.
2. **V0 LLM Suspense (token-rewriting mid-stream to fix imports/icons in <100ms)** — Engineering pattern more than UI, but the user-visible effect is *no broken previews*. Code generation feels infallible.
3. **Codex CLI's Enter=steer vs Tab=queue disambiguation** — Two distinct mental models cleanly mapped to two distinct keys. Every other product conflates them.
4. **Codex CLI's "3 recent non-empty output lines" for background terminals** — The cheapest, most legible long-running-task signal in the category. No spinner needed if you can see actual output.
5. **Replit Agent 4 Design Canvas (Artifact preview vs Design Mockup side-by-side)** — First product to honestly distinguish "running app" from "sketch" in the same surface, so the user knows what they're approving.
6. **Cursor `/best-of-n` parallel-model comparison in isolated worktrees** — Genuine multi-model evaluation in the user-facing flow, not a hidden A/B test.
7. **Warp's 5-color status badges + tab attention badges + max-2 toasts** — Most disciplined notification hierarchy. Avoids notification fatigue while still surfacing blocked sessions across many tabs.
8. **Zed crosshair-follow (auto-scroll alongside agent)** — Solves the "where is the agent looking right now" problem without parallel windows. Cmd+Enter as the trigger is elegant.
9. **Claude Code fixed todo list above input titled `/todo (1 of N)`** — Solves the "todo updates flooding the transcript" problem. Hidden by default, toggled with Ctrl+T, only the persistent list is shown.
10. **Devin Session Size flag (XS-XL with XL+ marked unhealthy)** — First product to expose "your session is too big" as a first-class signal. Pushes users toward smaller-better sessions structurally, not by lecture.

Honorable mentions:
- **Aider architect/editor model split** — Two-stage rendering where reasoning model proposes and cheap editor model emits diffs. Architectural, but UX-visible because plans are reviewable.
- **Cursor 3.1 voice waveform + timer + cancel/confirm during recording** — The right granularity for voice (most products do mic-on/mic-off binary).
- **Cursor Design Mode click-to-target** — Element-tree + computed-styles + surrounding context passed to agent on click. Massively reduces "the button on the left" ambiguity.
- **Cursor cloud agents auto-produce screenshots and demo videos** — Verification before approval, async-friendly.

---

## Universal Gaps (where ALL 10 products fail)

### 1. Confidence/uncertainty signalling

No product has a UX-native "I'm guessing" indicator. The best you get is prompting the model to say so ("if you're guessing, explicitly say you're guessing" — common Claude Code pattern), but it's text inside a stream, not a visual signal.

Atlas opportunity: render a colored vertical bar to the left of low-confidence claims, à la Notion's "this is AI-generated" treatment, but graded.

### 2. Time-remaining estimates

Every product shows a spinner. None shows ETA. The closest: Claude Code's "still thinking → thinking more → almost done thinking" verbal staging (vibes only) and Warp's "Warping" + tips (just filler text). Cursor users have explicitly asked for percentage-based progress and estimated completion time; the team has not shipped it.

Atlas opportunity: even a rough "based on this model + this prompt complexity, typical completion ~45s" calibration would beat the entire industry.

### 3. Mid-stream steering that survives state transitions

Codex CLI's Enter=steer/Tab=queue is the cleanest, but even Codex has bugs where Stop works but the resumed task ignores new instructions (community issue). Claude Code requires Ctrl+Z then `fg` — terminal-arcane. Cursor's `⌥+Enter` queues at "optimal moments" (after tool calls) which is unpredictable.

Atlas opportunity: a "steer pad" that visually shows the agent what's pending and lets the user reorder/edit/cancel before each turn boundary.

### 4. Multi-modal feedback hierarchy

Most products dump everything into one channel. Warp is the only one with a real hierarchy:
- In-app toast (immediate, urgent, time-boxed) → corner of window, auto-dismiss, max 2.
- Tab badge (passive, scannable) → status icon per tab.
- Notification Mailbox (durable, reviewable) → bell icon, filterable.
- OS notification (background, requires attention) → only when Warp not focused.
- Sound (additive, configurable) → optional.

Everyone else conflates "task done" with "task needs you" with "task failed."

Atlas opportunity: encode the four-level hierarchy and let the user re-route per channel.

### 5. Compact vs expanded modes

Cursor has "compact chat mode" (1.4) that hides tool icons + collapses diffs. Claude Code has fullscreen mode + Ctrl+T for todo toggle. Beyond that, the industry has not figured out how to optimize the same panel for "parallel monitoring" (need: density, status-first) vs "deep focus" (need: rich content, room for reasoning).

Atlas opportunity: explicit "scan mode" vs "drive mode" toggle.

### 6. Decision-point clarity

When the agent stops to ask, where is the question? Some products inline it in the stream (Cursor, Continue, Zed). Some surface it on the tab title (Warp does this best). Some require the user to scroll the conversation to find the prompt (Continue.dev, Aider). None makes "AI is waiting on you" a first-class persistent affordance — the closest is Cursor users *asking* for `· Awaiting you` tab suffixes.

Atlas opportunity: a dedicated "Decision Inbox" already in Atlas Code Obra Command Center (project_atlas_code_obra_command_center) — keep this pattern, formalize it.

### 7. Parallel-operation visibility

Replit Agent 4 has parallel subagents but reports them as one combined progress; Cursor 3 has Agent Tabs but each is treated as an independent chat; Devin has parallel sessions but each is a full session. **No product shows fine-grained parallel tool calls within a single agent's turn** (e.g., "reading file A while searching for B while running test C").

Atlas opportunity: a turn-level concurrency lane diagram.

### 8. Replay/audit beyond the recorder

Devin Replay Timeline is the gold standard, but it's read-only. Cursor + Replit checkpoints let you roll back state but not edit the past turn and continue forward differently. Codex `/fork` and Cursor `/best-of-n` get closer (alt-history) but with separate workspaces, not branched timelines.

Atlas opportunity: per-turn branching with diff against canonical timeline.

---

## Bibliography

### Cursor

- [New Cursor Interface (3.0)](https://cursor.com/changelog/3-0)
- [Layout Customization and Stability Improvements (3.1)](https://cursor.com/changelog/2-3)
- [Tiled Layout and Upgraded Voice Input in the Agents Window](https://cursor.com/changelog/3-1)
- [Improved Agent tools, steerability, and usage visibility (1.4)](https://cursor.com/changelog/1-4)
- [Continually improving our agent harness](https://cursor.com/blog/continually-improving-agent-harness)
- [Cursor Docs — Agent overview](https://cursor.com/docs/agent/overview)
- [Inline edit | Cursor Docs](https://cursor.com/docs/inline-edit/overview)
- [Cursor – Tab](https://docs.cursor.com/tab/overview)
- [Plan Mode | Cursor Docs](https://cursor.com/docs/agent/plan-mode)
- [Introducing Plan Mode](https://cursor.com/blog/plan-mode)
- [Introducing Composer 2](https://cursor.com/blog/composer-2)
- [Composer 2 Technical Report (PDF)](https://cursor.com/resources/Composer2.pdf)
- [Introducing Cursor 2.0 and Composer](https://cursor.com/blog/2-0)
- [Background Agents in Slack (1.1)](https://cursor.com/changelog/1-1)
- [Slack | Cursor Docs](https://cursor.com/docs/integrations/slack)
- [Cursor 3 Introduces Agent-First Interface, Moving beyond the IDE Model (InfoQ)](https://www.infoq.com/news/2026/04/cursor-3-agent-first-interface/)
- [Cursor 3 Ships an Agent-First Interface (Medium, Ewan Mak)](https://medium.com/@tentenco/cursor-3-ships-an-agent-first-interface-heres-what-it-actually-changes-1f2bf8f383e2)
- [Cursor 3: Agents Window, Design Mode, and What Changed](https://www.digitalapplied.com/blog/cursor-3-agents-window-design-mode-complete-guide)
- [Cursor 3 "Glass" Review — Agent-First Interface Tested](https://www.openaitoolshub.org/en/blog/cursor-3-agent-first-review)
- [I Tested Cursor 3 Glass for a Week (DEV)](https://dev.to/jim_l_efc70c3a738e9f4baa7/i-tested-cursor-3-glass-for-a-week-the-agent-first-ide-is-real-but-not-for-everyone-im0)
- [Cursor background agents in Slack changed my workflow (Swizec)](https://swizec.com/blog/cursor-background-agents-in-slack-changed-my-workflow/)
- [Add Progress Indicator for Agent Queries — forum](https://forum.cursor.com/t/add-progress-indicator-for-agent-queries/57847)
- [Live Status Indicators on Chat Tab Titles — forum](https://forum.cursor.com/t/live-status-indicators-on-chat-tab-titles/131301)
- [Tab Header with Status Icon — forum](https://forum.cursor.com/t/tab-header-with-status-icon/123116)
- [Make agent chat tab visually obvious when waiting for Run / approval — forum](https://forum.cursor.com/t/make-agent-chat-tab-visually-obvious-when-waiting-for-run-approval/156250)
- [OS Notifications for CLI (Claude Code parity) — forum](https://forum.cursor.com/t/os-notifications-for-cli-claude-code-parity/155106)
- [Add status icon to chat tab / topic title — forum](https://forum.cursor.com/t/add-status-icon-to-chat-tab-topic-title/133894)
- [Persistent Thought Bubble Expansion Controls — forum](https://forum.cursor.com/t/persistent-thought-bubble-expansion-controls/120800)
- [Making AI Thought Process Collapsible — forum](https://forum.cursor.com/t/making-ai-thought-process-collapsible/45688)
- [Notifications when agent completes — forum](https://forum.cursor.com/t/notifications-when-agent-completes/32835)
- [Always play sound on output completion (sometimes it doesn't) — forum bug](https://forum.cursor.com/t/always-play-sound-on-output-completion-sometimes-it-doesnt/125631)
- [Glass Alpha Bugs List / Feedback — forum](https://forum.cursor.com/t/glass-alpha-bugs-list-feedback/155365)
- [Glass feedback - "No agents" formatting issue — forum](https://forum.cursor.com/t/glass-feedback-no-agents-formatting-issue/155401)
- [cursor-agent-notifier (GitHub)](https://github.com/hgbdev/cursor-agent-notifier)
- [Cursor Sound Notifications MCP (sound-mcp)](https://github.com/bcharleson/sound-mcp)

### Continue.dev

- [Slash Commands | Continue](https://docs.continue.dev/customization/slash-commands)
- [How Agent Mode Works | Continue Docs](https://docs.continue.dev/ide-extensions/agent/how-it-works)
- [How to Customize Agent Mode | Continue Docs](https://docs.continue.dev/ide-extensions/agent/how-to-customize)
- [Tool Permissions | Continue Docs](https://docs.continue.dev/cli/tool-permissions)
- [Agent response does not collapse/hide follow-up reasoning after tool calls (issue #5684)](https://github.com/continuedev/continue/issues/5684)
- [The response was cancelled mid-stream (issue #8169)](https://github.com/continuedev/continue/issues/8169)

### Aider

- [In-chat commands | aider](https://aider.chat/docs/usage/commands.html)
- [Usage | aider](https://aider.chat/docs/usage.html)
- [Chat modes | aider](https://aider.chat/docs/usage/modes.html)
- [Separating code reasoning and editing (architect)](https://aider.chat/2024/09/26/architect.html)
- [Options reference | aider](https://aider.chat/docs/config/options.html)
- [Scripting aider | aider](https://aider.chat/docs/scripting.html)
- [Aider Guide 2026: Atomic Commits, Architect Mode & GPT-5 (DeployHQ)](https://www.deployhq.com/guides/aider)

### Zed AI

- [Agent Panel | Zed Docs](https://zed.dev/docs/ai/agent-panel)
- [Agent Settings | Zed Docs](https://zed.dev/docs/ai/agent-settings)
- [Tool Permissions | Zed Docs](https://zed.dev/docs/ai/tool-permissions)
- [Introducing Zed AI — Zed's Blog](https://zed.dev/blog/zed-ai)
- [Introducing the assistant panel — Zed's Blog](https://zed.dev/blog/assistant)
- [Zed 0.224.4 Brings AI Agent Permissions, Split Diffs, and Performance Improvements](https://www.linuxcompatible.org/story/zed-02244-brings-ai-agent-permissions-split-diffs-and-performance-improvements/)
- [Agent UI: Collapsible Agent Responses (discussion #34158)](https://github.com/zed-industries/zed/discussions/34158)
- [Regression: Claude "Thinking" blocks always expand by default in Claude Agent Panel (issue #52536)](https://github.com/zed-industries/zed/issues/52536)

### Windsurf (Codeium) Cascade

- [Windsurf - Cascade](https://docs.windsurf.com/windsurf/cascade/cascade)
- [Terminal - Windsurf Docs](https://docs.windsurf.com/windsurf/terminal)
- [Cascade | Windsurf](https://windsurf.com/cascade)
- [Windsurf Editor Changelog](https://windsurf.com/changelog)

### Replit Agent

- [The Next Evolution in AI App Building Tools | Agent 4](https://replit.com/agent4)
- [Introducing Replit Agent 4: Built for Creativity](https://blog.replit.com/introducing-agent-4-built-for-creativity)
- [What's changed from Replit Agent 3 to Agent 4](https://blog.replit.com/whats-changed-agent3-to-agent4)
- [Live from Replit HQ: Agent 4 Launch Pt. 1](https://blog.replit.com/live-from-hq-agent4-launch-pt1)
- [Introducing Agent 3: Our Most Autonomous Agent Yet](https://blog.replit.com/introducing-agent-3-our-most-autonomous-agent-yet)
- [Introducing Replit Agent v2 in Early Access](https://blog.replit.com/agent-v2)
- [Enabling Agent 3 to Self-Test at Scale with REPL-Based Verification](https://blog.replit.com/automated-self-testing)
- [Replit Agent Docs](https://docs.replit.com/core-concepts/agent)
- [Replit Agent product](https://replit.com/products/agent)

### Devin (Cognition)

- [Introducing Devin](https://cognition.ai/blog/introducing-devin)
- [Introducing Devin 2.0](https://cognition.ai/blog/devin-2)
- [Introducing Devin 2.2](https://cognition.ai/blog/introducing-devin-2-2)
- [Devin December '24 Product Update](https://cognition.ai/blog/dec-24-product-update)
- [Introducing Devin — Devin Docs](https://docs.devin.ai/)
- [Session Insights — Devin Docs](https://docs.devin.ai/product-guides/session-insights)
- [Build a DVR for AI Agents: Episode Replay UI That Actually Works (DEV)](https://dev.to/json_shotwell/build-a-dvr-for-ai-agents-episode-replay-ui-that-actually-works-34p2)

### V0 by Vercel

- [v0 by Vercel](https://v0.app/)
- [Introducing the new v0](https://vercel.com/blog/introducing-the-new-v0)
- [How we made v0 an effective coding agent](https://vercel.com/blog/how-we-made-v0-an-effective-coding-agent)
- [v0 in 2026 and the Complete Guide for UI Generation](https://blog.vibecoder.me/v0-by-vercel-complete-guide)

### JetBrains AI Assistant

- [Chat with AI | AI Assistant Documentation](https://www.jetbrains.com/help/ai-assistant/chat-mode.html)
- [AI Chat | AI Assistant Documentation](https://www.jetbrains.com/help/ai-assistant/ai-chat.html)
- [AI Assistant equivalent of copilot inline chat? (community)](https://intellij-support.jetbrains.com/hc/en-us/community/posts/32260216483090-AI-Assistant-equivalent-of-copilot-inline-chat)
- [AI Assistant settings reference](https://www.jetbrains.com/help/ai-assistant/settings-reference-ai-assistant.html)

### GitHub Copilot (VS Code)

- [GitHub Copilot in VS Code](https://code.visualstudio.com/docs/copilot/overview)
- [Chat overview](https://code.visualstudio.com/docs/copilot/chat/copilot-chat)
- [Using agents in Visual Studio Code](https://code.visualstudio.com/docs/copilot/agents/overview)
- [GitHub Copilot coding agent](https://code.visualstudio.com/docs/copilot/copilot-cloud-agent)
- [About GitHub Copilot cloud agent (Docs)](https://docs.github.com/copilot/concepts/agents/coding-agent/about-coding-agent)
- [Managing cloud agents (GitHub Docs)](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/manage-agents)
- [Copilot ask, edit, and agent modes (GitHub Blog)](https://github.blog/ai-and-ml/github-copilot/copilot-ask-edit-and-agent-modes-what-they-do-and-when-to-use-them/)
- [Use Agent Mode (Visual Studio for Windows)](https://learn.microsoft.com/en-us/visualstudio/ide/copilot-agent-mode?view=visualstudio)

### Claude Code (reference)

- [Claude Code Changelog](https://code.claude.com/docs/en/changelog)
- [Todo Lists — Claude Code Docs](https://code.claude.com/docs/en/agent-sdk/todo-tracking)
- [Create custom subagents](https://code.claude.com/docs/en/sub-agents)
- [Stream responses in real-time](https://platform.claude.com/docs/en/agent-sdk/streaming-output)
- [How Claude Code Actually Works (Medium)](https://medium.com/@sujaypawar/how-claude-code-actually-works-1f6d4f1eea82)
- [Getting More Out of Claude Code in the Terminal](https://marmelab.com/blog/2026/05/12/claude-code-hidden-commands.html)
- [Claude Code Todo Lists: Perfect Task Execution Guide](https://claudefa.st/blog/guide/development/todo-workflows)
- [What is Todo List in Claude Code (ClaudeLog)](https://claudelog.com/faqs/what-is-todo-list-in-claude-code/)
- [The Task Tool: Claude Code's Agent Orchestration System (DEV)](https://dev.to/bhaidar/the-task-tool-claude-codes-agent-orchestration-system-4bf2)
- [Claude Code Agent View (claudefa.st)](https://claudefa.st/blog/guide/agents/agent-view)
- [Boris Cherny's todo list video (Threads)](https://www.threads.com/@boris_cherny/post/DOJ5jhrE27h/video-we-launched-todo-lists-a-while-back-we-know-todo-lists-are-one-of-the-easiest-wa)
- [Terminal UI: collapsible sections and section navigation (issue #36462)](https://github.com/anthropics/claude-code/issues/36462)
- [Native Terminal Streaming for Claude Code Extension (issue #22718)](https://github.com/anthropics/claude-code/issues/22718)
- [Show extended thinking in CLI output (issue #36006)](https://github.com/anthropics/claude-code/issues/36006)
- [claude-code-notification (wyattjoh)](https://github.com/wyattjoh/claude-code-notification)
- [echook — audio notifications for Claude Code, Cursor IDE & Codex CLI](https://github.com/ChanMeng666/claude-code-audio-hooks)

### Codex CLI (reference)

- [Slash commands in Codex CLI](https://developers.openai.com/codex/cli/slash-commands)
- [Codex CLI TUI Shortcuts and Slash Commands: Complete Reference (Daniel Vaughan)](https://codex.danielvaughan.com/2026/04/08/codex-cli-tui-shortcuts-slash-commands/)
- [Codex CLI Features](https://developers.openai.com/codex/cli/features)
- [Codex CLI command-line options](https://developers.openai.com/codex/cli/reference)
- [fix(tui): queue steer Enter while final answer is still streaming (PR #12569)](https://github.com/openai/codex/pull/12569)
- [OpenAI Codex CLI, how does it work? (Phil Schmid)](https://www.philschmid.de/openai-codex-cli)

### Warp (reference)

- [Agent Notifications - Warp docs](https://docs.warp.dev/agent-platform/capabilities/agent-notifications/)
- [Terminal and Agent modes - Warp docs](https://docs.warp.dev/agent-platform/local-agents/interacting-with-agents/terminal-and-agent-modes/)
- [Managing Agents - Warp](https://docs.warp.dev/agents/using-agents/managing-agents)
- [Option to make Agent status badges more pronounced (issue #9142)](https://github.com/warpdotdev/Warp/issues/9142)
- [Vertical Tabs - Warp docs](https://docs.warp.dev/terminal/windows/vertical-tabs/)

### Cross-product comparison & meta

- [Claude Code vs Cursor: Full Comparison for Developers in 2026 (UI Bakery)](https://uibakery.io/blog/claude-code-vs-cursor)
- [Claude Code vs Codex CLI vs Aider vs OpenCode vs Pi vs Cursor (jock.pl)](https://thoughts.jock.pl/p/ai-coding-harness-agents-2026)
- [Windsurf vs Cursor vs Claude Code — the honest comparison (How Do I Use AI)](https://www.howdoiuseai.com/blog/2026-04-16-windsurf-vs-cursor-vs-claude-code)
- [I tried Cursor, Claude Code, and Google Antigravity for a month (XDA)](https://www.xda-developers.com/tried-cursor-claude-code-google-antigravity-for-month/)
- [AI Coding Agent Dashboard: Orchestrating Claude Code Across Devices (Marc Nuri)](https://blog.marcnuri.com/ai-coding-agent-dashboard)
- [Best Tools for Parallel AI Coding Agents (Nimbalyst)](https://nimbalyst.com/blog/best-tools-for-running-parallel-ai-coding-agents/)
- [Build Long-running AI agents that pause, resume, and never lose context with ADK (Google)](https://developers.googleblog.com/build-long-running-ai-agents-that-pause-resume-and-never-lose-context-with-adk/)
- [Realtime steering: Interrupt, barge-in, redirect, and guide the AI (Ably)](https://ably.com/blog/ai-transport-redirect-steering)
- [Chain of Thought (assistant-ui)](https://www.assistant-ui.com/docs/guides/chain-of-thought)
- [Multi-Agent Dashboard (agentsroom.dev)](https://agentsroom.dev/multi-agent-dashboard)

---

## Provenance & Confidence Notes

All claims sourced via web search and direct doc fetches between 14:00–15:30 UTC, 2026-05-15. Marked `[unconfirmed]` was reserved for anything I could not pin to a primary source; no entries required that flag — every state listed in the matrices has either a vendor-doc, vendor-changelog, vendor-blog, or community-forum thread cited.

Known weak spots in this sweep:
- **JetBrains AI Assistant** UI detail is doc-thin; the gear-icon "Codebase Mode" and code-snippet action buttons are documented but visual treatment (spinner shape, etc.) had to be inferred from screenshots referenced in the docs, not from the docs themselves.
- **V0** preview pane streaming animation is well-documented at the pipeline level but not at the per-pixel UI level — Vercel does not publish a design-system reference page.
- **Devin** docs are sparse on actual visual specifics (planner UI mechanics, screencast playback controls); two fetches to the same page returned "not documented." Inference based on doc-mentioned features.
- **Cursor 3 Glass** is < 2 months old at sweep time. UI is in active iteration; some behaviors noted may have shifted since 3.1.
