# ADR-0001 · Atlas Desktop Boundaries

Status: accepted · 2026-05-12

Atlas Desktop is the macOS **operational cabin** of the Atlas Engineering
Operations System. It is not a second Atlas Kernel and must not duplicate the
`atlas-server` agent platform.

## Canonical Split

```text
atlas-server
  Kernel · policy · memory · provider routing · context packs
  Evidence Ledger · MCP authority · orchestrators · canonical docs.

atlas-desktop
  Tauri/React cockpit · terminal UI · PTY observer · filesystem watcher
  macOS native bridge · ed25519 receipt signing · packaging.

future atlas-daemon
  Background execution plane for PTY/process supervision, worktrees,
  local jobs, kill/retry/resume and OS bridge — extracted from
  crates/atlas-platform once it grows beyond the in-process boundary.
```

## Non-Negotiable Rules

- The desktop does **not** decide provider, policy, memory, canon authority
  or final evidence.
- The desktop **can** command, show, sign, observe and request actions.
- The Kernel decides. The runtime executes a signed contract.
- The UI reads real source files and server responses; it does **not** become
  the source of truth.
- Local SQLite, when added, is edge cache / outbox / audit only.

## Workspace Layout

```text
atlas-desktop/
├─ apps/desktop          React + Vite cockpit
├─ crates/atlas-tauri    Tauri shell · commands + lifecycle
├─ crates/atlas-platform PTY + notify-rs + objc2 bridge
├─ crates/atlas-bridge   HTTP/SSE client to atlas-server
├─ crates/atlas-receipts ed25519 signing boundary
├─ crates/atlas-canon    local guardrails before requests reach Kernel
├─ packages/atlas-domain TS types mirroring server contracts
└─ packages/atlas-ui     shared React primitives
```

The split is intentional:

- `apps/*` separates user-facing applications from shared libraries.
- `packages/*` keeps cross-app TS code out of the app folder so a future
  mobile companion or CLI surface can consume the same `@atlas/domain`.
- `crates/*` groups all native code; `atlas-tauri` is the only binary,
  the rest are libraries it composes — this preserves the future option
  to extract `atlas-platform` into a standalone `atlas-daemon` without
  rewriting the UI.

## MVP Scope

The MVP connects to `atlas-server` for existing capabilities and adds native
desktop power:

- Atlas Code cockpit UI rendered against atlas-server payloads.
- HTTP/SSE bridge consuming the 9 existing endpoints + 3 wraps + 3 new
  endpoints identified in the audit (`docs/audits` to be added).
- PTY terminal surface.
- File watcher for live scope visibility.
- Local ed25519 receipt signing.
- macOS capabilities through narrow, auditable platform APIs.

## Frontend Ownership Update · 2026-05-13

The React cockpit now follows this ownership model:

```text
apps/desktop/src/shell/
  global shell, surface routing, topbar, error boundaries.

apps/desktop/src/surfaces/code/
  Atlas Code product surface: obra, left rail, stage, right rail, terminal.

apps/desktop/src/components/
  legacy compatibility facades only. No new product feature starts here.
```

This update matters because Atlas Desktop is expected to grow into an
Engineering Operations System cockpit. Generic `components/` buckets are no
longer acceptable as the primary architecture. Product ownership must be local
to the surface or shell boundary that owns the behavior.

## Definition of Done · v1

- `npm install` resolves all workspaces with zero conflicts.
- `npm run dev` boots the React shell with honest empty/error states.
- `npm run tauri:dev` (when Rust is installed) boots the Tauri window.
- Each crate compiles with `cargo check`.
- No business logic in the desktop — only UI composition + bridge transport
  + native primitives.
- New UI behavior is added under `shell/` or `surfaces/`, not as a new generic
  component in `components/`.
- Production surfaces do not display silent mocks.

## Repo Status

As of 2026-05-13, the monorepo has moved beyond scaffold:

- `shell/` exists and owns global layout/topbar/surface host.
- `surfaces/code/` owns the Atlas Code cockpit boundaries.
- `surfaces/code/terminal/` owns PTY/xterm layout and protocol plumbing.
- `packages/atlas-domain` carries shared domain contracts.
- Rust crates exist for bridge/platform/tauri/receipts/canon boundaries.

The remaining risk is not folder layout. The remaining risk is operational
trust: backend contract gaps, terminal prompt regression, receipt/diff
verification, and visual regression coverage.
