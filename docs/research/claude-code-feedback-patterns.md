# Claude Code Feedback Patterns & State Communication

## Executive Summary

Claude Code communicates AI state to users through multiple feedback channels: terminal UI rendering (streaming text, thinking animations, spinners), permission dialogs, plan mode review panels, hook notifications, and error states. This document catalogs 15+ distinct feedback patterns observed in Claude Code's runtime and documented across its official docs, GitHub issues, and community implementations. These patterns reveal both strengths (clear planning workflows, async task visibility) and friction points (thinking opacity, permission denial UX inconsistency, terminal flickering). For Atlas Desktop AI surface to equal/exceed Claude Code, this research identifies which patterns work well and where Atlas can innovate.

---

## Pattern Catalogue

| # | Pattern Name | Category | One-Liner |
|---|---|---|---|
| 1 | **Streaming Text Rendering** | Output | Token-by-token text flow with cursor animation in terminal |
| 2 | **Thinking Animation** | Processing | Cycling thinking indicator with action phrases during extended thinking |
| 3 | **Plan Mode Panel** | Planning | Separate text panel showing numbered steps before execution |
| 4 | **Permission Prompt Dialog** | Safety | Modal approval UI for tool use (file edit, bash command, MCP) |
| 5 | **Permission Silent Denial** | Safety | Tool blocked without visible UI, causing confusion |
| 6 | **Tool Call Rendering** | Execution | Read/Edit/Bash/MCP tool display inline in conversation |
| 7 | **Diff Inline Preview** | Verification | File changes highlighted side-by-side in VS Code/IDE |
| 8 | **Hook Execution Notification** | Automation | Error notice when hook fires (success silent unless configured) |
| 9 | **Sub-agent Dispatch UI** | Coordination | Indicator when subagent spawned; state: running/done/failed |
| 10 | **Error State Display** | Errors | Timeout/network/permission errors shown inline with context |
| 11 | **Status Line** | Context | Configurable footer showing mode (plan/default), token count, session state |
| 12 | **Verbose Mode Toggle** | Transparency | Ctrl+O shows tool details + extended thinking blocks in gray italic |
| 13 | **Extended Thinking Peek** | Reasoning | Revealed via verbose mode only; no real-time streaming |
| 14 | **Slash Command Discovery** | Navigation | `/` trigger shows available commands (rewind, clear, plan, permissions) |
| 15 | **Background Task Badge** | Progress | Visual indicator that long-running task executing in background |

---

## Detailed Pattern Analysis

### 1. Streaming Text Rendering

**When triggers:**
- Claude responds to a prompt
- Tool output is being printed
- Any text generation event

**Visual:**
- Token-by-token character display in terminal
- Cursor appears at end of line (blinking cursor behavior inconsistent; GitHub #8984, #30342)
- Markdown rendered incrementally as tokens arrive

**Lifecycle:**
1. Prompt submitted
2. Tokens arrive via SSE (Server-Sent Events)
3. Each token displayed immediately
4. Response complete, cursor returns to prompt

**Strengths:**
- Real-time feedback — no waiting for full response buffering
- Server-Sent Events architecture allows progressive rendering
- Browser rendering shows HTML widget fragments as they stream (custom partial JSON parser extracts widget code mid-JSON)

**Limitations:**
- Terminal flickering on every SSE chunk (700+ GitHub upvotes for fix; GitHub #18084)
  - Fixed with `CLAUDE_CODE_NO_FLICKER=1` env var (uses alternate screen buffer like vim/htop)
  - Core issue: full terminal redraw per chunk instead of incremental updates
- Cursor blinking not always visible (GitHub #18581, #8984) — appears as solid block
- Overly fast token display can make long thinking chains unreadable

**Source:**
- Observed in runtime: Claude Code streaming in terminal
- https://blog.alexbeals.com/posts/claude-codes-thinking-animation
- https://slyapustin.com/blog/claude-code-no-flicker.html

---

### 2. Thinking Animation

**When triggers:**
- Extended thinking is enabled
- Model enters reasoning phase
- Pre-response deliberation occurring

**Visual:**
- Spinning indicator (Unicode spinner or animated icon)
- Rotates through 184-word action phrase library: "analyzing", "considering", "cross-checking", etc.
- Bespoke animation paired to Claude branding (not generic spinner)
- **Positioned:** spinner in prompt area, status line, or corner depending on surface

**Lifecycle:**
1. Prompt sent
2. Thinking starts → spinner begins cycling
3. No token output during thinking (blocked until thinking ends)
4. Thinking completes → spinner stops → response begins streaming
5. When verbose mode on (`Ctrl+O`), thinking blocks rendered in gray italic text after response

**Strengths:**
- Visual indicator that model is working (better than blank cursor wait)
- Branding-consistent animation builds confidence
- Phrase cycling adds personality vs. static spinner

**Limitations:**
- **No real-time streaming**: thinking stays hidden until complete (GitHub issue #30660)
  - Only visible post-hoc if verbose mode on
  - Long reasoning chains = long spinner stare with zero progress visibility
  - Cannot catch model misunderstanding early
- Spinner does not indicate *what* the model is thinking through
- Requested feature (issue #30660): stream thinking token-by-token like regular output, with optional `--stream-thinking` flag and gray/dimmed styling
- Toggle thinking (`Option+T`) disables it entirely rather than streaming it

**Source:**
- https://github.com/anthropics/claude-code/issues/30660
- https://blog.alexbeals.com/posts/claude-codes-thinking-animation
- https://platform.claude.com/docs/en/build-with-claude/extended-thinking

---

### 3. Plan Mode Panel

**When triggers:**
- User enables plan mode (`Shift+Tab` twice)
- Prompt submitted while plan mode active
- User requests explicit planning workflow

**Visual:**
- Separate panel opens (as of v2.1.70, previously inline)
- Plain-English document with numbered steps
- Shows:
  - Files to modify
  - Logic to add/remove
  - Side effects (migrations, dependencies, env vars)
  - Risk assessments
- Footer confirms: "plan mode on"

**Lifecycle:**
1. Enable plan mode via `Shift+Tab` (footer shows confirmation)
2. Submit prompt
3. Plan generated → panel displays
4. Cursor waits in prompt (paused state)
5. User provides feedback (remove step, add step, change order, narrow scope)
6. Claude revises and reshows plan (iterate until approved)
7. Approve → implementation begins with normal permission prompts

**Strengths:**
- **Pause-and-review workflow** prevents wrong solution from running
- Plain English forces clarity vs. implicit understanding
- Iterative refinement loop before any file touches
- Works well for multi-file changes, unfamiliar codebases, risky refactoring
- Footer status clear and glanceable

**Limitations:**
- **Adds overhead for small fixes** (single typo, rename variable, add log line — skip plan)
- Plan panel separate from conversation (as of v2.1.70) — some users prefer inline display (GitHub #33525)
- Lack of structured diff preview — just English text, not highlighted file diffs
- No inline accept/reject per-step buttons — all-or-nothing approval

**Feedback Requested (GitHub #33932, #31395):**
- Inline per-change diff approval UI like GitHub Copilot Edits
  - Accept/discard individual hunks with buttons or keyboard shortcuts
  - Per-file diff review without leaving chat context
- Option to revert to inline plan display

**Source:**
- https://code.claude.com/docs/en/best-practices (Explore → Plan → Implement → Commit section)
- https://www.anyonebuilds.com/guides/claude-code-plan-mode
- https://github.com/anthropics/claude-code/issues/33932
- https://github.com/anthropics/claude-code/issues/31395
- https://github.com/anthropics/claude-code/issues/33525

---

### 4. Permission Prompt Dialog

**When triggers:**
- File write requested
- Bash command (non-read-only) attempted
- MCP tool invoked
- First use of a tool in a session

**Visual:**
- Modal dialog (appears above terminal/conversation)
- Shows:
  - Tool name (Edit, Bash, WebFetch, MCP)
  - Specific command/path/domain
  - Reason for permission check
- Two buttons:
  - "Yes, don't ask again" (allows + saves rule to settings.json)
  - "No" / "Cancel" (denies, blocks tool call)

**Lifecycle:**
1. Claude attempts tool use
2. Permission system evaluates rules (deny > ask > allow precedence)
3. If `ask` rule matches → dialog appears
4. User selects approval or denial
5. On approval: tool executes, rule saved to `permissions.allow`
6. On denial: tool blocked, error returned to Claude

**Strengths:**
- Clear, explicit consent model
- "Yes, don't ask again" reduces friction after first approval
- Rules saved to `.claude/settings.json` (checkable in version control)
- Wildcard pattern support (`Bash(npm run *)`, `WebFetch(domain:example.com)`)
- Fine-grained control per file path, command prefix, domain

**Limitations:**
- **Silent denial on error**: If tool not in allowlist and permission rule evaluation fails, tool is silently blocked with no visible prompt (GitHub #27073, #9383)
  - Claude interprets silence as user rejection → repeated failed attempts
  - No `extension_ui_request` event emitted → no dialog surfaces
  - User confusion: "Why didn't my command run?"
- **"Don't ask again" too permanent**: saves to project settings, not session-only
- Prompt fatigue on 10+ identical tools (click-through behavior degrades intent)
- In "dontAsk" permission mode: tools not pre-approved are auto-denied with zero UI (no dialog at all)

**Related Settings:**
- `defaultMode`: permission mode (`default`, `plan`, `auto`, `dontAsk`, `bypassPermissions`)
- `permissions.allow`, `.ask`, `.deny`: rule arrays
- `/permissions` command: view and manage rules interactively

**Source:**
- https://code.claude.com/docs/en/permissions
- https://github.com/anthropics/claude-code/issues/27073 (silent denial bug)
- https://github.com/anthropics/claude-code/issues/9383 (UI not displayed)

---

### 5. Permission Silent Denial

**When triggers:**
- Tool use attempted
- Tool not in allowlist
- "dontAsk" permission mode active (or auto-deny in default mode with no rule match)

**Visual:**
- **No dialog appears**
- Error message in conversation: "Permission denied" or "Tool blocked"
- No visible confirmation prompt
- Claude receives error but context shows no user action

**Lifecycle:**
1. Claude attempts tool (e.g., `Bash(unknown-command)`)
2. Permission system checks rules
3. No matching allow rule found
4. Tool silently denied
5. No UI event triggered (`extension_ui_request` not emitted)
6. Claude sees error, tries alternative approach or asks user
7. User has no idea permission was checked and denied

**Strengths:**
- Fast execution in auto-deny mode (no wait for user)
- Prevents accidental tool misuse

**Limitations:**
- **Opaque to user**: looks like tool failure, not permission denial
- Breaks debugging workflow: user doesn't know permission was issue
- Issue #27073: "update_plan never triggers domain approval, navigate returns Permission denied with no visible prompt"
- Issue #9383: "Permission approval UI not displayed — operations immediately rejected"
- Causes frustration and repeated attempts with same error

**Atlas Improvement Opportunity:**
- Always surface permission denial visibly (never silent)
- Distinguish permission denial from tool execution error
- Show "Grant permission?" inline or as toast notification

**Source:**
- https://github.com/anthropics/claude-code/issues/27073
- https://github.com/anthropics/claude-code/issues/9383

---

### 6. Tool Call Rendering

**When triggers:**
- Claude reads file (Read tool)
- Claude edits file (Edit/Write tools)
- Claude runs bash command (Bash tool)
- Claude calls MCP server tool
- Claude fetches web content (WebFetch)

**Visual (Terminal):**
- Tool name displayed inline: `Read /src/auth.ts`
- Command shown: `Bash npm run test`
- File path shown: `Edit src/components/Button.tsx`
- Output follows tool invocation

**Visual (VS Code Extension):**
- Inline diff view with changes highlighted
- Hover preview of file content
- Side-by-side before/after code
- Color coding: added (green), removed (red)

**Visual (Desktop App):**
- Full visual diff panel
- File tree showing changed files
- Line-by-line diff with context

**Lifecycle:**
1. Tool call sent by Claude
2. Tool name rendered in conversation
3. Tool executes
4. Output returned
5. Output displayed (file contents, command output, error)

**Strengths:**
- Transparent tool use (user sees every read/write/exec)
- VS Code integration provides rich diff context
- File contents readable inline

**Limitations:**
- Terminal rendering is text-only (no color-coded diffs)
- Large tool outputs can flood context
- No visual distinction between successful tool use and blocked tool use (see pattern #5)

**Source:**
- Observed in runtime: Claude Code terminal and VS Code extension
- https://code.claude.com/docs/en/vs-code (mentions inline diffs)

---

### 7. Diff Inline Preview

**When triggers:**
- File edited in VS Code/JetBrains
- User hovers over or selects changed region
- Plan mode review workflow

**Visual:**
- Side-by-side diff (before | after)
- Line numbers aligned
- Added lines highlighted green
- Removed lines highlighted red
- Context lines shown in gray

**Lifecycle:**
1. Claude makes file edit
2. Diff calculated
3. Highlighted in editor margin/gutter
4. User can hover for full context
5. User can accept/reject change (feature request #31395, not yet implemented in all surfaces)

**Strengths:**
- Quick visual verification of changes
- Familiar GitHub/Git diff syntax
- IDE-native experience

**Limitations:**
- Only available in IDE extensions (VS Code, JetBrains)
- Feature request (GitHub #31395): per-hunk accept/discard buttons (like Copilot Edits)
- Terminal view has no visual diff support

**Source:**
- https://github.com/anthropics/claude-code/issues/31395
- Observed in VS Code extension runtime

---

### 8. Hook Execution Notification

**When triggers:**
- Hook configured in `.claude/settings.json`
- Hook event fires (e.g., PreFileEdit, PostCommand, Notification)
- Hook script completes

**Visual:**
- Inline error notice if hook fails: `<hook-name> hook error` + first line of stderr
- Full stderr logged to debug log (`claude --debug`)
- **Success is silent** (unless hook outputs text or notification)
- Notification hook can trigger desktop alert (via shell script/terminal-notifier)

**Lifecycle:**
1. Hook event occurs (file edit, bash command, etc.)
2. Hook script runs synchronously
3. Hook exits with code 0 (success) or non-zero (fail)
4. If failed: error notice appears in conversation
5. If successful: silent (no feedback unless hook itself generates output)
6. Debug log captures full stderr/stdout

**Strengths:**
- Silent success reduces noise
- Explicit error feedback when hook fails
- Debug log available for troubleshooting

**Limitations:**
- **Silent success**: user doesn't know if hook ran successfully (was it even called?)
- No visual indicator hook is executing (no spinner/badge)
- Error message only shows first line of stderr (full output in debug log)
- Background hook execution not tracked in main UI

**Notification Hook Alternative:**
- Community implementations (GitHub: disler/claude-code-hooks-mastery, wyattjoh/claude-code-notification)
  - MacOS desktop notifications when hook fires
  - Custom sound alerts
  - Notification hook type triggers on wait/completion events

**Source:**
- https://code.claude.com/docs/en/hooks-guide
- https://github.com/disler/claude-code-hooks-mastery
- https://github.com/wyattjoh/claude-code-notification
- https://alexop.dev/posts/claude-code-notification-hooks/

---

### 9. Sub-agent Dispatch UI

**When triggers:**
- Claude spawns a subagent (e.g., `Agent(Explore)`, `Agent(my-custom-agent)`)
- Subagent task begins
- Subagent completes or fails

**Visual:**
- Inline notification: "Spawned subagent: [Name]"
- State indicator during execution (running / done / failed)
- Subagent context maintained separately
- Results returned to main conversation

**Lifecycle:**
1. Claude decides to delegate (e.g., "use a subagent to investigate X")
2. Subagent dispatched with isolated context window
3. State shows: running
4. Subagent explores files/tools (separate from main conversation)
5. Subagent reports findings
6. State shows: done or failed
7. Main Claude incorporates results

**Strengths:**
- Isolation prevents file reads from polluting main context
- Parallel investigation frees main context for implementation
- Clear delegation pattern

**Limitations:**
- Limited visibility into subagent work (no real-time streaming of subagent's actions)
- State indicator not prominently displayed
- Terminal rendering unclear (vs. VS Code/Desktop which have better layout)

**Source:**
- https://code.claude.com/docs/en/best-practices (mentions subagents for investigation)
- Observed in runtime: Claude Code with subagents

---

### 10. Error State Display

**When triggers:**
- Tool timeout (e.g., Bash command exceeds 120s default)
- Network error (MCP, WebFetch failure)
- Permission denied (see pattern #5)
- Tool execution failure (exit code non-zero)
- File not found / access denied

**Visual:**
- Error message inline in conversation
- Includes:
  - Error type (timeout, network, permission, execution)
  - Context (command run, file path, domain, error code)
  - Stderr output (if applicable)
- Typically red/bold text in terminal

**Lifecycle:**
1. Tool call made
2. Tool execution fails
3. Error captured
4. Error message formatted
5. Displayed to Claude and user
6. Claude can retry, use fallback, or ask user

**Strengths:**
- Error context provided inline
- Allows Claude to reason about failure
- User sees exact error (vs. silent failure)

**Limitations:**
- Terminal errors can be verbose (multi-line) and hard to scan
- No visual hierarchy (all errors same visual weight)
- Timeout errors not always clear (spinner just stops)
- Network errors may not distinguish "temporary" vs. "permanent" failures

**Example Error States:**
- **Timeout**: "Bash command timed out after 120s: npm run test"
- **Permission denied**: "Permission denied: Bash(rm -rf /src)"
- **Network error**: "WebFetch failed: connection refused to example.com"

**Source:**
- Observed in runtime: Claude Code
- https://code.claude.com/docs/en/permissions (mentions permission errors)

---

### 11. Status Line (Configurable Footer)

**When triggers:**
- Session active
- Footer enabled (default)
- Mode or context changes

**Visual:**
- Fixed footer at bottom of terminal
- Displays:
  - **Mode**: `plan mode on` / `default mode`
  - **Permission mode**: `auto`, `dontAsk`, `plan`, etc.
  - **Context usage**: token count, % full
  - **Session state**: idle, running, thinking
  - **Custom status**: user-configured `/statusline` command output

**Lifecycle:**
1. Session starts
2. Status line rendered at bottom
3. Updates on mode changes, token consumption, state transitions
4. Always visible (glanceable)

**Strengths:**
- Persistent context awareness (glance any time)
- Mode confirmation visible without prompt
- Token usage tracking prevents context surprise

**Limitations:**
- Terminal width constraints may truncate status
- Custom status requires `/statusline` setup (not default documented)
- Limited extensibility (fixed set of fields)

**Configuration:**
- `/statusline` command to customize output
- `.claude/settings.json`: `statusLine` field

**Source:**
- https://code.claude.com/docs/en/statusline
- Observed in runtime: Claude Code footer

---

### 12. Verbose Mode Toggle

**When triggers:**
- User presses `Ctrl+O`
- Extended thinking enabled
- Tool details desired during session

**Visual:**
- Toggles verbose output on/off
- When **on**, displays:
  - Tool call details (exact command/path/domain)
  - Execution traces (stdout/stderr in full)
  - **Extended thinking blocks in gray italic text** (reveals model's reasoning)
  - MCP tool definitions
- When **off**: minimal output (results only)

**Lifecycle:**
1. Press `Ctrl+O`
2. Verbose mode toggles on/off
3. Subsequent output rendered at verbose level
4. No retroactive reveal of prior non-verbose output
5. Press `Ctrl+O` again to toggle off

**Strengths:**
- Transparency on demand (don't need full verbosity all the time)
- Thinking blocks visible when wanted (only way to see extended thinking output currently)
- Single keystroke toggle

**Limitations:**
- **Extended thinking blocks shown only after thinking completes** (not real-time streaming)
- Verbose output can flood terminal (large tool outputs, many tool calls)
- No filtering option (all-or-nothing verbosity)
- Thinking blocks shown in gray italic, easy to miss
- Real-time streaming of thinking requested (GitHub #30660, not implemented)

**Source:**
- https://wmedia.es/en/tips/claude-code-verbose-output-see-thinking
- Observed in runtime: Claude Code
- https://github.com/anthropics/claude-code/issues/30660

---

### 13. Extended Thinking Peek

**When triggers:**
- Extended thinking enabled
- Model enters reasoning phase
- Verbose mode on (`Ctrl+O`)

**Visual:**
- Reasoning output rendered **after thinking completes**
- Displayed in gray italic text (or dimmed styling)
- Full reasoning chain shown
- Positioned above main response

**Lifecycle:**
1. Model begins thinking
2. Thinking spinner shown (no token output)
3. Thinking completes
4. If verbose mode on: thinking blocks rendered in gray italic
5. If verbose mode off: thinking hidden (silent)
6. Regular response follows

**Strengths:**
- Reveals model's internal reasoning (when verbose on)
- Useful for debugging model decisions
- Clear visual distinction from main response (gray italic)

**Limitations:**
- **Not real-time**: thinking stays hidden until complete
  - Cannot follow reasoning as it unfolds
  - Cannot interrupt early if model on wrong track
  - Long reasoning = long spinner wait
- **Display: "omitted"** setting reduces time-to-first-text (thinking discarded, not shown)
- Real-time streaming requested (GitHub issue #30660)
- Toggle thinking (`Option+T`) disables rather than streams

**Requested Enhancement (Issue #30660):**
- Stream thinking token-by-token like regular text
- Optional flags: `--stream-thinking`, config option
- Visually distinct styling (collapsible, gray, dimmed)
- Same token-by-token streaming as responses

**Source:**
- https://github.com/anthropics/claude-code/issues/30660
- https://platform.claude.com/docs/en/build-with-claude/extended-thinking
- Observed in runtime: Claude Code with Ctrl+O toggle

---

### 14. Slash Command Discovery

**When triggers:**
- User types `/` in prompt
- Autocomplete invoked
- Help requested

**Visual:**
- Dropdown menu or list showing available commands
- Common commands:
  - `/plan` — enter plan mode
  - `/clear` — reset context
  - `/rewind` — restore previous conversation/code state
  - `/permissions` — view/manage permission rules
  - `/add-dir` — add additional working directory
  - `/hooks` — view/manage hooks
  - `/statusline` — configure status line output
  - `/skill-name` — invoke named skill
  - `/btw` — side question (doesn't enter context)

**Lifecycle:**
1. User types `/`
2. Dropdown/list displayed
3. User selects or types command name
4. Command executes

**Strengths:**
- Discoverability without documentation
- Keyboard-friendly (tab completion)
- Non-intrusive help

**Limitations:**
- Autocomplete behavior not documented (works in some surfaces, not others)
- Command list can be long (50+ skills + built-ins)
- No inline help (description of each command)
- Discovery depends on knowing `/` exists

**Source:**
- https://code.claude.com/docs/en/cli-reference (lists all commands)
- Observed in runtime: Claude Code

---

### 15. Background Task Badge

**When triggers:**
- Long-running task spawned (e.g., npm install, test suite)
- Task runs in background
- Desktop app or web session (not terminal)

**Visual:**
- Badge indicator in corner or tab
- Shows:
  - Task name (e.g., "npm install")
  - Progress % or spinner
  - Elapsed time
- Clickable to view details or focus session

**Lifecycle:**
1. Background task started
2. Badge appears
3. Task executes (user can continue other work)
4. Badge updates with progress
5. Task completes → badge disappears or shows "done"

**Strengths:**
- Allows multitasking (start task, work on something else)
- Visual progress indication
- Reduces need to stare at spinner

**Limitations:**
- Only in Desktop/Web (not terminal)
- Terminal sessions show spinner only (no badge)
- No notification when task completes (unless hook configured)

**Source:**
- Observed in runtime: Claude Code Desktop app
- https://code.claude.com/docs/en/desktop (mentions background sessions)

---

## Strengths: What Claude Code Does Well

### 1. **Planning Workflow (Plan Mode)**
   - Pause-and-review pattern prevents wrong solutions from running
   - Numbered steps + risk assessment = clear mental model
   - Iteration before execution = safety
   - Footer status confirmation is glanceable
   
   **Atlas can learn**: Adopt similar pause-review loop but with richer diffs (per-hunk approval, visual highlighting)

### 2. **Real-Time Streaming via SSE**
   - Token-by-token text flow provides instant feedback
   - Partial JSON parsing allows widget rendering mid-stream (impressive technical execution)
   - Server-Sent Events architecture is clean and extensible
   
   **Atlas can learn**: Streaming architecture is sound; extend to thinking blocks (real-time reasoning visibility)

### 3. **Fine-Grained Permission Rules**
   - Wildcard support (`Bash(npm run *)`, `WebFetch(domain:*)`)
   - Persistent rules in `.claude/settings.json` (versionable, shareable with team)
   - Settings precedence clear (deny > ask > allow)
   - Multiple permission modes (default, plan, auto, dontAsk, bypassPermissions)
   
   **Atlas can learn**: Adopt similar rule system but fix silent denial UX (always surface permission checks visibly)

### 4. **IDE Integration (VS Code/JetBrains)**
   - Inline diff viewing with color-coded changes
   - Hover preview of file content
   - Selection context sharing between IDE and Claude
   - Rich editor-native experience
   
   **Atlas can learn**: If building IDE integration, match or exceed this UX richness

### 5. **Deterministic Checkpointing**
   - Every prompt creates a checkpoint (file snapshot)
   - `/rewind` command restores conversation, code, or both to any checkpoint
   - Persistent across sessions (close terminal, rewind later)
   - Encourages experimentation ("try risky approach, rewind if wrong")
   
   **Atlas can learn**: Implement similar checkpoint system; extremely powerful for risk mitigation

---

## Limitations: Where Claude Code Falls Short

### 1. **Thinking Block Opacity** ⭐ **Major Gap**
   - Extended thinking hidden behind spinner until complete
   - No real-time streaming of reasoning (requested GitHub #30660, not implemented)
   - Verbose mode reveals thinking *after* completion only
   - Long reasoning chains = long spinner stare with zero progress
   - Cannot detect model misunderstanding early to interrupt
   
   **Atlas opportunity**: Stream thinking token-by-token, collapsible, gray/dimmed. Show reasoning as it unfolds.

### 2. **Permission Silent Denial** ⭐ **Major UX Friction**
   - Tools silently denied when not in allowlist (GitHub #27073, #9383)
   - No visible prompt → user thinks tool failed, not denied
   - Debugging workflow broken (user repeats same command, same error)
   - "dontAsk" mode auto-denies with zero feedback
   
   **Atlas opportunity**: Always surface permission checks visibly. Never deny silently. Show "Grant permission?" inline or as toast.

### 3. **Terminal Flickering** ⭐ **Major Polish Issue**
   - Full terminal redraw on every SSE chunk (700+ GitHub upvotes for fix; #18084)
   - Workaround: `CLAUDE_CODE_NO_FLICKER=1` env var (uses vim-style alternate screen buffer)
   - Distraction, eye strain, accessibility concern
   - Still unresolved in default behavior as of 2026-05
   
   **Atlas opportunity**: Use incremental terminal updates from day 1. No redraw per chunk.

### 4. **Cursor Visibility Inconsistent** ⭐ **Polish Issue**
   - Cursor doesn't blink even when terminal configured to blink (GitHub #8984)
   - Appears as solid white block (hard to see on light backgrounds #46374)
   - Users can't tell if prompt has focus
   - Feature request #30342: "Add blinking cursor indicator"
   
   **Atlas opportunity**: Render visible, blinking cursor. Honor terminal cursor settings.

### 5. **Hook Execution Invisible on Success** ⭐ **Process Clarity**
   - Success is completely silent (no badge, no feedback)
   - User doesn't know if hook ran or if it failed
   - Error shown inline only if hook exits non-zero
   - No visual indicator hook is executing
   
   **Atlas opportunity**: Always show hook execution state (running → done/failed). No silent success.

### 6. **No Per-Hunk Approval in Plan Mode** ⭐ **Plan UX Gap**
   - Plan mode shows all-or-nothing approval (accept whole plan or reject)
   - Feature request #31395: per-hunk accept/discard like GitHub Copilot Edits
   - Cannot approve step 1 & 3 but reject step 2
   - No inline buttons for quick approval
   
   **Atlas opportunity**: Implement hunk-level approval (like Copilot Edits). Accept/discard inline buttons per change.

### 7. **Plan Mode Separate from Conversation** ⭐ **UX Regression**
   - As of v2.1.70, plans open in separate panel (not inline)
   - Users prefer inline plan display in conversation (GitHub #33525)
   - Plan review less integrated with chat flow
   
   **Atlas opportunity**: Keep plan in chat flow (or offer both inline + panel view with user toggle).

### 8. **No Structured Error Classification**
   - All errors shown same visual weight (timeout vs. permission vs. network)
   - No clear distinction between recoverable (retry) vs. permanent (ask user) errors
   - Terminal errors can be verbose/hard to scan
   
   **Atlas opportunity**: Color-code / categorize errors. Show retry suggestion, not just error.

### 9. **Sub-agent State Not Prominent**
   - Subagent dispatch shows minimal UI feedback
   - No real-time visibility into subagent work
   - Running/done/failed state not prominently displayed
   - Useful for multi-agent coordination but opaque to user
   
   **Atlas opportunity**: Show subagent work visually (work in progress panel, status per subagent).

### 10. **Slash Command Discoverability Weak**
   - No inline help descriptions for commands
   - Command list can be 50+ items (skills + built-ins)
   - Autocomplete works in some surfaces, inconsistent in others
   - Users must know `/` syntax exists
   
   **Atlas opportunity**: Inline help on hover. Smart command ranking (frequent vs. rare). Video tutorials on key commands.

---

## Bibliography & Sources

### Official Claude Code Documentation
- https://code.claude.com/docs (main documentation hub)
- https://code.claude.com/docs/en/best-practices (planning, verification, context management)
- https://code.claude.com/docs/en/permissions (fine-grained permission rules)
- https://code.claude.com/docs/en/hooks-guide (hook execution, automation)
- https://code.claude.com/docs/en/statusline (status line configuration)
- https://wmedia.es/en/tips/claude-code-verbose-output-see-thinking (verbose mode & thinking)

### Anthropic Platform Documentation
- https://platform.claude.com/docs/en/build-with-claude/extended-thinking (extended thinking streaming)
- https://platform.claude.com/docs/en/build-with-claude/streaming (SSE architecture)

### GitHub Issues (Feedback & Feature Requests)
- https://github.com/anthropics/claude-code/issues/30660 (Stream extended thinking in real-time)
- https://github.com/anthropics/claude-code/issues/33932 (VS Code: Diff review UI like Copilot Edits)
- https://github.com/anthropics/claude-code/issues/31395 (Inline per-hunk diff approval)
- https://github.com/anthropics/claude-code/issues/33525 (Revert plan to inline display)
- https://github.com/anthropics/claude-code/issues/27073 (Permission UI not displayed, silent denial)
- https://github.com/anthropics/claude-code/issues/9383 (Permission approval UI not displayed)
- https://github.com/anthropics/claude-code/issues/18084 (Terminal flickering on SSE chunks)
- https://github.com/anthropics/claude-code/issues/18581 (Add cursor blink setting)
- https://github.com/anthropics/claude-code/issues/18797 (Cursor blinks below status bar)
- https://github.com/anthropics/claude-code/issues/8984 (Cursor not blinking in iTerm2)
- https://github.com/anthropics/claude-code/issues/46374 (Blinking cursor invisible in light mode)
- https://github.com/anthropics/claude-code/issues/30342 (Add blinking cursor indicator)

### Community & Blog Coverage
- [A Designer's Guide to Claude Code | Katherine Yeh | Medium](https://medium.com/design-bootcamp/a-designers-guide-to-organizing-ai-skills-and-tools-in-claude-code-f87477c35b82)
- [Claude Code Plan Mode: The Complete 2026 Guide | AnyOneBuilds](https://www.anyonebuilds.com/guides/claude-code-plan-mode)
- [Claude Code's Thinking Animation | Alex Beals](https://blog.alexbeals.com/posts/claude-codes-thinking-animation)
- [CLAUDE_CODE_NO_FLICKER: The Fix a Year in the Making | Sergey Lyapustin](https://slyapustin.com/blog/claude-code-no-flicker.html)
- [Simple Notifications Hook for Claude Code | aitmpl](https://aitmpl.com/blog/simple-notifications-hook/)
- [Claude Code Notification Hooks | Masato Naka | Medium](https://nakamasato.medium.com/claude-code-hooks-automating-macos-notifications-for-task-completion-42d200e751cc)

### Hook & Notification Resources
- https://github.com/disler/claude-code-hooks-mastery (hook patterns & examples)
- https://github.com/wyattjoh/claude-code-notification (macOS desktop notifications hook)
- https://alexop.dev/posts/claude-code-notification-hooks/ (hook setup for notifications)

---

## Recommendations for Atlas Desktop AI Surface

### High-Priority Adoptions
1. **Implement real-time thinking streaming** (vs. spinner-only) — addresses major transparency gap
2. **Surface permission checks visibly** (never silent) — fixes UX confusion
3. **Hunk-level plan approval** (like Copilot Edits) — improves plan UX
4. **Avoid terminal flickering** (incremental updates) — polish from day 1
5. **Show hook execution state** (never silent success) — improve process visibility

### Medium-Priority Innovations
6. Keep plan in chat flow (offer both inline + panel view)
7. Color-code/categorize errors (timeout vs. permission vs. network)
8. Implement checkpoint system (restore conversation/code to prior state)
9. Subagent progress panel (real-time visibility into delegated work)
10. Smart command discovery (inline help, frequently-used ranking)

### Polish Details
11. Visible, blinking cursor (honor terminal settings)
12. Per-tool execution UI improvements (differentiate success/fail/blocked visually)
13. Status line extensibility (allow custom fields beyond mode/tokens)
14. Verbose mode enhancements (thinking block filtering, not all-or-nothing)
15. Context-aware error suggestions ("Retry?", "Grant permission?", "Add to allowlist?")

---

## Notes for Implementation Teams

- **Streaming is critical**: SSE + incremental rendering are non-negotiable for real-time feedback
- **Thinking opacity is the biggest UX gap**: Real-time reasoning visibility differentiates Atlas from Claude Code
- **Permission UX must never be silent**: Every permission check should be visible to user
- **Plan mode benefits from structured diffs**: Full integration with hunk-level approval (not just text steps)
- **Checkpointing enables experimentation**: Users need to feel safe taking risks (rewind safety net)
- **Status line pays dividends**: Glanceable context (mode, tokens, state) prevents surprises
- **Desktop experience differs from terminal**: Leverage richer UI in desktop app (vs. terminal TUI constraints)

---

**Document Date**: 2026-05-15  
**Research Budget**: ~30 mins (comprehensive web fetch + GitHub issue analysis)  
**Last Updated**: As of Claude Code v2.1.70+ and Anthropic Platform docs (May 2026)

