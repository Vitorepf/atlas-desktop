# Atlas Desktop

Atlas Desktop is the macOS operational cockpit for **Atlas Code**.

It is the desktop surface of the Atlas Engineering Operations System: a local,
native-feeling control room where Vitor directs software work, the Atlas
Server Kernel decides, agents execute, receipts are signed and evidence is
inspected.

## Canon

```text
atlas-server   Kernel · policy · provider routing · memory · context pack
                Evidence Ledger · MCP authority · orchestrators
atlas-desktop  Cabine operacional · cockpit · terminal UI · native bridge
                receipt signing · live execution visibility
```

Atlas Desktop must not become a second Atlas Kernel. It consumes existing
Atlas Server capabilities and adds native macOS power.

## MVP Stack

| Layer            | Choice                                        |
| ---------------- | --------------------------------------------- |
| Shell            | Tauri 2 (WKWebView native)                    |
| Frontend         | React 19 + Vite + TypeScript + vanilla CSS    |
| Terminal UI      | Atlas native terminal over portable-pty (MVP) |
| Diff highlight   | shiki (planned)                               |
| Core daemon      | Rust + Tokio (Cargo workspace, 5 crates)      |
| PTY              | portable-pty                                  |
| FS watcher       | notify-rs (planned)                           |
| macOS bridge     | objc2-* family (planned)                      |
| Receipt signing  | ed25519-dalek + Apple Keychain (planned)      |
| Bridge transport | HTTP/SSE → atlas-server                       |

## Repo Structure

```text
atlas-desktop/
├─ apps/
│  └─ desktop/              React + Vite cockpit app (frontend)
│     ├─ src/components/    layout-first React components
│     ├─ src/data/empty.ts  honest empty states (no invented records)
│     ├─ src/hooks/         atlas-tauri command bridge
│     └─ src/index.css      editorial DNA tokens · slate teal dark (`--cc-*`) DEFAULT, cream only Cartografia
├─ crates/
│  ├─ atlas-tauri           Tauri bin · commands + lifecycle
│  ├─ atlas-platform        PTY + notify-rs + objc2 (native boundary)
│  ├─ atlas-bridge          HTTP/SSE client to atlas-server
│  ├─ atlas-receipts        ed25519 signing boundary
│  └─ atlas-canon           local guardrails before requests reach Kernel
├─ packages/
│  ├─ atlas-domain          TypeScript types mirroring Atlas Server contracts
│  └─ atlas-ui              shared React primitives (Pill, PanelTitle, …)
├─ docs/architecture/       ADRs · canonical desktop boundaries
├─ Cargo.toml               Cargo workspace root (5 members)
└─ package.json             npm workspaces root (apps/* + packages/*)
```

## Local Commands

```bash
npm install                 # installs all workspaces
npm run dev                 # browser fallback at http://localhost:5173
npm run lint                # lint all workspaces
npm run tauri:dev           # full Tauri shell (requires Rust toolchain)
npm run tauri:build         # production .app + .dmg
```

## macOS Build / Install Guardrail

`/Applications/Atlas Code.app` is the only installed Atlas Desktop app bundle
allowed.

Do not create timestamped app backups in `/Applications`. Agents and scripts
must not leave folders or bundles named `Atlas Code.app.backup-*`,
`Atlas Code.app-YYYY*`, or `Atlas Code.app...` there. Tauri build output belongs
in `target/release/bundle/macos/Atlas Code.app`; test that bundle directly or
replace the single canonical `/Applications/Atlas Code.app` when explicitly
asked.

## Current State

- React/Vite shell builds and renders the Atlas Code MVP layout against
  honest empty states until the Kernel returns real payloads.
- Cargo workspace declared with 5 crate stubs; each documents its boundary.
- Atlas Server bridge is the only source for real work data. When neither
  Tauri nor HTTP is configured, the UI enters explicit offline mode.
- Cartography has a dedicated implementation contract in
  `docs/architecture/0003-cartography-surface.md`.

## Non-Goals

- Do not reimplement provider routing in the desktop.
- Do not reimplement Atlas memory or context pack in the desktop.
- Do not let SQLite local become the canonical truth.
- Do not let the desktop decide policy or evidence finality.
- Do not duplicate atlas-server orchestrators.

## Roadmap

1. **Done · this commit** — monorepo scaffold + layout-only React + 5 Rust crate stubs.
2. **Next (passo 2)** — `atlas-bridge` contracts (12 typed functions covering
   the MVP needs) wired to atlas-server endpoints with explicit offline states.
3. **After (passo 3)** — `atlas-code-mvp-endpoints` branch on atlas-server
   adding the 3 new controllers + 3 wraps the audit identified.

## Implementando uma surface nova

> **PARE. Antes de criar uma surface nova, leia `docs/IMPLEMENTING-NEW-SURFACE.md`.**
>
> Atlas Desktop é **slate teal dark por DEFAULT** (`#1d2b34` + atlas gold `#d4a85a`). Cream warm é exceção EXCLUSIVA da Cartografia. Se a sua surface aparece cream/bege, você violou o canon — refatore.
>
> O documento curto tem template CSS copy-paste pronto + os 4 mandamentos (scope, tokens, tipografia, discipline) + checklist pré-PR. Doc completo (1700+ linhas): `docs/architecture/0007-atlas-desktop-design-system.md`.

## Architecture Docs

| Doc | Purpose |
| --- | --- |
| `docs/IMPLEMENTING-NEW-SURFACE.md` | **Atalho obrigatório · LEIA ANTES de criar surface nova** |
| `docs/architecture/0007-atlas-desktop-design-system.md` | Canon completo · DNA, tokens, tipografia, motion, componentes, cookbook |
| `docs/architecture/0001-atlas-desktop-boundaries.md` | Desktop vs Server ownership boundaries |
| `docs/architecture/0002-code-cartography-production-readiness.md` | Full readiness plan for Code + Cartography |
| `docs/architecture/0003-cartography-surface.md` | Cartography screen contract, API, states and roadmap |
| `docs/atlas-ai-ultra-premium-polish-spec.md` | ~80 polish fixes aplicados em Atlas AI (referência prática) |
| `docs/anti-patterns/` | Galeria visual de violações canon (cream em surface não-Cartografia, etc.) |

## Atlas Vox V6 · uso diário

> Mac/Desktop, local-first, sem API paga, sem áudio bruto persistido.
> Entrada humana canônica em PT-BR:
> **`apps/desktop/docs/vox-daily-use.md`** (abre, grava, modos, AirPods,
> microfone, segurança, checklist final).
>
> Para a primeira instalação (Whisper, PHP, cmake, permissões macOS):
> `apps/desktop/docs/vox-first-use.md`.
>
> Comando de uso diário:
> `npm run vox:dev --workspace=@atlas/desktop`
