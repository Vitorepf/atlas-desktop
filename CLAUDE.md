# CLAUDE.md · Atlas Desktop

Este arquivo é carregado automaticamente por Claude Code, Cursor e IAs que reconhecem o protocolo. **Leia antes de tocar pixel ou linha de código neste repositório.**

---

## A regra que NÃO se quebra · design canon

> **Atlas Desktop é slate teal dark por DEFAULT** (`#1d2b34` + atlas gold `#d4a85a`). Cream warm é EXCEÇÃO exclusiva da Cartografia. Surface nova em cream = violação canon catalogada.

Se você está prestes a criar uma surface nova OU encostar em CSS de surface existente:

1. **PARE.** Leia `docs/IMPLEMENTING-NEW-SURFACE.md` inteiro (181 linhas).
2. Verifique `apps/desktop/src/index.css` linha ~218 — o opt-in slate é via inclusão no seletor agregado, **não** via cópia de tokens no seu CSS.
3. Cumpra os 3 passos canônicos: (a) inscrever surface nos seletores agregados de `index.css`, (b) registrar no enum `Surface` em `useSurface.ts`, (c) escrever CSS usando APENAS `var(--cc-*)`.

Anti-pattern de referência: `docs/anti-patterns/control-plane-cream-violation.png` — outra IA implementou surface em cream warm porque não inscreveu no opt-in slate. **Não repita.**

---

## Stack & arquitetura

- **Shell**: Tauri 2 (WKWebView)
- **Frontend**: React 19 + Vite + TypeScript + vanilla CSS (sem CSS-in-JS, sem Tailwind)
- **Backend**: separado em `atlas-server` (Laravel/PHP 8.4 em `/opt/homebrew/bin/php`)
- **Rust**: workspace 5 crates (`atlas-tauri`, `atlas-platform`, `atlas-bridge`, `atlas-receipts`, `atlas-canon`)
- **Bridge**: HTTP/SSE para `127.0.0.1:8001` (atlas-server local)

Atlas Desktop **não** decide política, **não** reimplementa orquestradores, **não** assume SQLite local como fonte canônica. Tudo isso vive em atlas-server.

---

## Surfaces existentes (estado atual)

| Surface | Tema | Diretório | Notas |
|---|---|---|---|
| `cartografia` | cream warm (EXCEÇÃO canon) | `apps/desktop/src/surfaces/cartografia/` | Don Corleone editorial Patek |
| `code` | slate dark | `apps/desktop/src/surfaces/code/` | Atlas Code · Codex-inspired |
| `atlas_ai` | slate dark | `apps/desktop/src/surfaces/atlas-ai/` | Conversação ultra-premium |
| `atencao` | slate dark | `apps/desktop/src/surfaces/atencao/` | Attention queue |
| `control_plane` | slate dark (em refactor) | `apps/desktop/src/surfaces/control-plane/` | violação cream detectada 2026-05-18, ver anti-pattern |

---

## Comandos locais

```bash
npm install                 # instala todos os workspaces
npm run dev                 # fallback browser http://localhost:5173
npm run lint                # lint
npm run tauri:dev           # shell Tauri completo (precisa Rust)
npm run build               # build de produção · sempre validar antes de finalizar
```

**Armadilha conhecida**: `pnpm tauri build` reporta `exit 0` mesmo quando `tauri: command not found`. Não confie no exit code — inspecione `dist/` e rode `npm run build` separado. Detalhes em memory `feedback_atlas_tauri_build_pipeline`.

---

## Regras invioláveis ao escrever código

| Tema | Regra |
|---|---|
| Mock | **NUNCA mock data.** Sempre API real. Campo ausente no schema → silente + comentário TODO, jamais fake. Helpers `*Mock.ts` proibidos. |
| Empty states | Estados honestos quando atlas-server não respondeu. Não inventar registros. |
| Tipografia | Inter Variable é a única operacional. **Cormorant italic apenas em `✦` glyph + numerais romanos.** Nunca em body/state/label/placeholder. |
| Border-radius | 4 / 6 / 8 / 10 apenas (via `--cc-radius-*`). |
| Box-shadow | ≤ 2 layers. Use `--cc-shadow-*`. |
| Cor hardcoded | Proibida fora dos tokens `--cc-*`. Quebra Cartografia. |
| Drop cap | `::first-letter` Cormorant gold = typo glitch. Proibido. |
| Italic Cormorant em body | Proibido — cansa olho em sessão de 12h. |
| Reduced motion | Guard obrigatório em `@keyframes`. |

Origem: usuário tem TDAH (peso decrescente, baixo ruído visual) + sessão de trabalho 12h (legibilidade > ornamento).

---

## Documentação canônica · ordem de leitura

1. **`docs/IMPLEMENTING-NEW-SURFACE.md`** — atalho obrigatório antes de surface nova (181 linhas, template CSS + checklist)
2. **`docs/architecture/0007-atlas-desktop-design-system.md`** — canon completo v2.1, 1700+ linhas, 22 capítulos
3. **`docs/atlas-ai-ultra-premium-polish-spec.md`** — ~80 fixes aplicados em Atlas AI (referência prática)
4. **`docs/anti-patterns/`** — galeria visual de violações canon
5. **`docs/research/`** — Apple HIG, Linear/Mercury/Stripe, editorial typography, Cursor/Warp/Raycast

---

## Fronteiras importantes

- **Esta é Atlas Desktop, não Atlas Server.** Para mudar policy, provider routing, memory ou orchestrators → `atlas-server/`.
- **Atlas AI ≠ Atlas Code.** Atlas AI é a surface de conversação (produto), Atlas Code é a surface operacional (workspace).
- **Cartografia tem doc própria**: `docs/architecture/0003-cartography-surface.md` + `0007` capítulo 1.
- **Tema cream NÃO é depreciado** — é o tema CANÔNICO da Cartografia. Mantenha intacto.

---

**Última revisão**: 2026-05-18
**Motivo**: criação após violação `surface-control_plane` em cream warm. Centraliza regra de surface nova + onboarding de IA neste repositório.
