# Atlas Desktop · Design System Canon

> **Version**: 2.0 · 2026-05-14 (sessão K-O + Edit Mode 6 features + Surface Code dark + Hooks core)
> **Status**: canon · ativo
> **Owners**: Vitor (visão) · Atlas Desktop surface team
> **Predecessores**: 0001-atlas-desktop-boundaries · 0003-cartography-surface · 0006-cartography-surface-scalability-contract
> **Memória canon relacionada**: `reference_atlas_desktop_design_system` · `project_atlas_motion_principle` · `project_atlas_editorial_grid` · `project_atlas_vault_cartografia` · `project_atlas_source_authority` · `project_atlas_code_codex_slate_premium` · `feedback_atlas_cartografia_principle`

Esta é a referência **única e completa** que qualquer IA (ou humano) deve consultar antes de implementar qualquer surface, componente, hook ou interação no Atlas Desktop. Tudo aqui é canon — não é "sugestão". Anti-padrões estão marcados explicitamente.

Use este documento como **input de contexto** ao planejar uma feature nova. Releia o capítulo 1 (DNA) antes de escrever qualquer linha de CSS.

---

## 0 · Onboarding IA · Primeiro contato com Atlas Desktop

**Antes de fazer qualquer coisa**, siga esta sequência em ordem. Ela existe pra você convergir rápido com o canon sem inventar nada.

### 0.1 · Checagem de ambiente

```bash
# Confirme que atlas-server (backend Laravel) está vivo na :8001
curl -s -o /dev/null -w "atlas-server: %{http_code}\n" \
  -H "X-Atlas-Token: <token-do-.env.local>" \
  http://127.0.0.1:8001/atlas-cartography/graph
# Esperado: 200

# Confirme que Vite dev está vivo na :5173
curl -s -o /dev/null -w "vite: %{http_code}\n" http://127.0.0.1:5173/
# Esperado: 200
```

Se backend morto: `cd /Users/vitorepf/develop/Atlas/atlas-server && /opt/homebrew/bin/php artisan serve --port=8001 &`
Se Vite morto: `cd /Users/vitorepf/develop/Atlas/atlas-desktop && npm run dev --workspace=@atlas/desktop`

Token canon (somente leitura local): `apps/desktop/.env.local` → `VITE_ATLAS_API_TOKEN`.

### 0.2 · Leitura obrigatória antes de codar

| # | Arquivo | Por quê |
|---|---|---|
| 1 | Capítulos 1-2 deste doc (DNA + Tokens) | Você precisa SENTIR o canon antes de tocar pixel. |
| 2 | `atlas-server/docs/atlas-vault-cartografia.md` (1022 linhas) | A bíblia da Cartografia. Anti-canon catalogado. |
| 3 | `atlas-server/public/atlas-vault-cockpit-mockup.html` em browser | Gabarito visual canônico. Abra: `open atlas-server/public/atlas-vault-cockpit-mockup.html` |
| 4 | Capítulo 15 deste doc (checklist pré-PR) | Sua aferição final antes do diff. |

### 0.3 · Captura de estado atual antes de mexer

```bash
# Use o script Playwright canon (capítulo 19) pra capturar a tela em PNG
cd /tmp && node atlas-tauri-size.mjs
# Output: /tmp/atlas-tauri-size.png

# Compare a captura com o que você imagina ANTES de tocar nada.
```

Se a tela atual já está "good enough" pro user no aspecto que você ia mexer — **pause e pergunte**. Não otimize o que está aprovado.

### 0.4 · Princípio operacional

1. **Plan mode** antes de codar quando ambíguo. AskUserQuestion no ambíguo.
2. **Fatias finas**. Uma feature de cada vez. Build verde no fim de cada bloco.
3. **Plan + Read + Edit + Test (Playwright)** sempre nessa ordem.
4. **Memory canon** (`~/.claude/projects/-Users-vitorepf-develop-Atlas/memory/`) é auto-loaded. Leia entries relevantes antes de planejar.
5. **Honestidade canon**: se você atingiu 7.5/10, diga 7.5/10. Não promete 9.5 antes de entregar.

### 0.5 · Decisão · estou tocando Cartografia ou Code?

| Característica | Surface Cartografia | Surface Code |
|---|---|---|
| Tema canônico | **cream editorial** (Don Corleone Patek) | **slate teal dark warm** (Codex-inspired) |
| Tokens base | `--cream*`, `--ink*`, `--bronze*` | `--cc-bg`, `--cc-text*`, `--cc-accent` (atlas gold) |
| Background | `#f3ecda` cream | `#1d2b34` slate teal |
| Accent | bronze `#8a6a35` | atlas gold `#d4a85a` burnished |
| Scope CSS | `.cartografia-surface` | `.atlas-shell.surface-code` |
| Tipografia | Cormorant italic protagonista | Inter/system sans-serif protagonista |

Se você não tem certeza qual surface está tocando: **pergunte ao usuário**. Não invente.

Detalhes completos: capítulo 1 (Cartografia cream) e capítulo 16 (Code dark).

---

## 1 · DNA Visual Fundamental

### 1.1 · O nome do design

**Don Corleone editorial · Patek Philippe Calatrava · manuscript Smythson · whisky aged paper.**

Mais explícito:
- Luxo **patriarcal masculino** com **peso silencioso** — não é luxo feminino delicado tipo Aesop/Hermès.
- Referência sensorial: charuto cubano queimando lento, ledger manuscrito Smythson, Patek Calatrava sem complicações, whisky 18-anos em cristal Baccarat.
- Referência editorial: revista *The Gentleman's Quarterly* dos anos 1960, ledgers contábeis vitorianos, leis manuscritas, livros de Hermann Hesse encadernados em couro.

### 1.2 · Anti-canon · NÃO faça

| Errado | Por quê |
|---|---|
| Aesop / Hermès / sussurro apologético | Não é luxo feminino delicado. É masculino patriarcal. |
| Material Design / Linear / Notion / Vercel | Não é SaaS-premium. É manuscript editorial. |
| Bordas arredondadas 8/12/16px | Vibe SaaS. Use `border-radius: 2-3px` sempre. |
| Box-shadow elaborada em estado idle | Só em `.active` ou hover deliberado. Estado neutro = chão. |
| Animação bouncy/elastic | Use `cubic-bezier(0.32, 0.72, 0.24, 1)` (ease-considered). |
| Gradientes vibrantes / cores semafóricas (verde=OK / vermelho=erro) | Cor só em pontos canônicos. Pre-attentive Tufte, não Material. |
| Texto sans-serif em títulos | Cormorant Garamond italic em títulos. Sans (Inter) só em raras situações. |
| Emoji ornamental | Use `❦` (aldine leaf), `✦`, `·` editorial. Emojis SaaS proibidos. |
| Skeleton loaders animados de SaaS | Animação subtle só. Loading é silêncio editorial. |

### 1.3 · Princípios fundamentais

- **Peso silencioso, nunca sussurro**. Cada componente carrega peso (border, hairline, sombra deliberada). Mas não grita.
- **Ar editorial Patek**. Espaço em branco é deliberado — não é "espaço sobrando", é silêncio entre frases.
- **Hairlines manuscritas**. 1-2px com alpha 8-22% bronze. Marca divisões sem invadir.
- **Texto-com-peso**. Numerais romanos, eyebrow Mono caps, título Cormorant italic. Hierarquia tipográfica é estrutura.
- **Anti-mock honesto**. Dado que não existe é mostrado como ausente (border-left rec-red + hatching diagonal + badge "FONTE AUSENTE"), nunca inventado.
- **Source authority**. Os componentes representam documentação real (`.md`/banco/API). UI é leitura, não fabricação.

---

## 2 · Design Tokens · Canon

### 2.1 · Cores

Definidas em `apps/desktop/src/index.css` `@layer tokens`:

```css
/* Cream paper · base de toda surface */
--cream:        #f3ecda;  /* paper base */
--cream-paper:  #f7f1e3;  /* paper sobre cream · cards */
--cream-deep:   #ebe2cb;  /* paper denso · hover/active */
--cream-canvas: #faf4e4;  /* canvas vasto · world background */

/* Ink hierárquico · 4 níveis */
--ink:   #1a1714;  /* título / texto protagonista */
--ink2:  #4a4138;  /* secundário / deck italic */
--ink3:  #8a7f70;  /* terciário / meta caps */
--ink4:  #b6ac9c;  /* placeholder / disabled */

/* Bronze · signature canon (acentos, peso, ledger gold) */
--bronze:       #8a6a35;  /* peso médio · borders ativas */
--bronze-deep:  #5e4520;  /* peso forte · eyebrows, hover */
--bronze-soft:  rgba(138, 106, 53, 0.28); /* hairlines, dividers */
--bronze-veil:  rgba(138, 106, 53, 0.07); /* fills sutis, hover bg */

/* Prussian · timestamps, frio editorial (raro) */
--prussian:  #2b3e54;

/* Moss · positivo deliberado (raro) */
--moss:       #4a5f3a;
--moss-veil:  rgba(74, 95, 58, 0.10);
--moss-soft:  rgba(74, 95, 58, 0.28);

/* Rec-red · gargalo/destrutivo/missing-source */
--rec-red:       #8a3025;
--rec-red-veil:  rgba(138, 48, 37, 0.06);
--rec-red-soft:  rgba(138, 48, 37, 0.30);

/* Hairlines · divisões editorial */
--hair:       rgba(26, 23, 20, 0.14);
--hair-soft:  rgba(26, 23, 20, 0.07);
```

**Regras de uso de cor**:
- `bronze` é signature: borders ativas, eyebrows, numerais, drop-caps, peso editorial geral.
- `rec-red` é EXCLUSIVO para: missing-source, has-risk, atom problemático, gargalo. NUNCA pra "erro" UI genérico.
- `moss` é raro: positivo deliberado (evidence loop tone, "próxima ação" badge).
- `prussian` é raríssimo: timestamps no inspector, lane HKS eyebrow tone.
- Cores fora deste paleta são proibidas a menos que sejam ANSI terminals (em surface code).

### 2.2 · Tipografia

```css
--serif: 'Cormorant Garamond', Georgia, serif;
--mono:  'JetBrains Mono', ui-monospace, 'Menlo', monospace;
--sans:  'Inter', system-ui, sans-serif;
```

**Hierarquia canon**:

| Uso | Font | Weight | Size | Style |
|---|---|---|---|---|
| Título protagonista (atom title, lane title) | `--serif` | 500-600 | 17-26px | italic |
| Numeral romano (pipeline, hero drop-cap) | `--serif` | 500-600 | 22-30px | italic |
| Deck / subtitle | `--serif` | 400 | 12-14.5px | italic |
| Eyebrow / metadata caps | `--mono` | 500 | 8.5-10px | uppercase, letter-spacing 1.4-2.4px |
| Source path / inline tech | `--mono` | 400 | 9.5-11px | normal |
| Sans-serif (raríssimo) | `--sans` | 400 | — | só em search input, breadcrumb |

**Regras tipográficas**:
- Títulos sempre Cormorant italic. Nunca sans-serif em título.
- Eyebrow (label acima de título) sempre Mono caps com letter-spacing >= 1.4px.
- Numerais romanos sempre Cormorant italic, nunca arábicos para enumeração canônica.
- `font-feature-settings: 'liga' 1, 'kern' 1` em surface root. Ligaduras editoriais ativadas.
- `text-rendering: optimizeLegibility` + `-webkit-font-smoothing: antialiased`.

### 2.3 · Espaçamento

Não há sistema rígido tipo 4/8/16. É **espaço editorial deliberado**:
- Padding interno de card: `14px 18px 12px` (default) ou `18px 22px 14px` (comfortable density).
- Gap entre cards numa lane: 18-22px.
- Espaço entre lanes (X): generoso, ~480px+ entre Domain Plane e Pipeline canon.
- Hairlines: 1-2px de altura, alpha 8-22%, gradient com fade nas pontas pra editorial breath.

### 2.4 · Border radius

**Sempre 2-3px**. Nunca 8/12/16 (vibe SaaS).
- `border-radius: 2px` · cards
- `border-radius: 3px` · containers com peso
- `border-radius: 50%` · APENAS em chips circulares (atom-pipe symbol, signal dots)

### 2.5 · Box-shadow

**Estado idle**: sombra mínima ou nenhuma. Cards têm peso pela border + hairline, não pelo shadow.

**Estado active/hover** (deliberado):
```css
box-shadow:
  inset 0 1px 0 rgba(255, 255, 255, 0.5),
  0 14px 28px rgba(77, 61, 34, 0.07),
  0 4px 10px rgba(77, 61, 34, 0.04);
```

**Hero (Atlas Decide)** · sombras múltiplas concentric ring:
```css
box-shadow:
  inset 0 1px 0 rgba(255, 255, 255, 0.7),
  inset 0 -1px 0 rgba(138, 106, 53, 0.12),
  0 22px 42px rgba(77, 61, 34, 0.11),
  0 7px 16px rgba(77, 61, 34, 0.06);
```

---

## 3 · Motion · Peso Silencioso

### 3.1 · Easing canon

**Único easing oficial**: `cubic-bezier(0.32, 0.72, 0.24, 1)` (ease-considered).

Subuso:
- `cubic-bezier(0.4, 1, 0.2, 1)` · transitions de scale/transform com leve overshoot
- Nunca `ease-in-out` puro, nunca bounce, nunca elastic.

### 3.2 · Durations canon

| Caso | Duration | Justificativa |
|---|---|---|
| Hover instinct (border, opacity sutil) | 160-220ms | Resposta imediata sem twitchy |
| Active state settle (transform, box-shadow) | 280-320ms | Ease-considered, peso silencioso |
| Reading mode transition / scene switch | 420ms | Editorial, deliberate |
| Hover insight tooltip delay | 380ms | Não-instantâneo, mas responsivo |

### 3.3 · Reduced motion

**Sempre** respeitar `@media (prefers-reduced-motion: reduce)`. Animações de transform/filter/scale viram `none`. Opacity transitions ficam (são essenciais).

---

## 4 · Estrutura de arquivos · Surface canon

```
apps/desktop/src/surfaces/<surface-name>/
├── <Surface>Surface.tsx          · composition root (hooks + composição)
├── <Surface>ViewportSlot.tsx     · viewport wrapper (transform, refs)
├── state/                        · hooks de state
│   ├── use<Surface>.ts           · master hook (data + navigation)
│   ├── use<Surface>ViewModel.ts  · derived state pra UI
│   ├── browserStorage.ts         · helpers localStorage canon
│   └── ...                       · hooks específicos (useEditMode, useCustomLayout, ...)
├── map/                          · canvas/atoms/world
│   ├── Atom.tsx
│   ├── atomModel.ts              · pure functions (className, classification)
│   ├── atomStyle.ts              · style helpers
│   └── layout.ts                 · WORLD_WIDTH/HEIGHT, LANE_LAYOUT, PIPELINE_LAYOUT
├── scenes/                       · cenas (FlowScene, GearScene, etc.)
│   ├── Flow*.tsx                 · view components
│   └── flow*Model.ts             · view-model builders (pure)
├── floaters/                     · UI flutuante (toolbar, controls, indicators)
│   ├── CartographyFloaters.tsx
│   ├── ZoomControls.tsx
│   └── ...
├── inspector/                    · sidebar lateral (opcional)
├── search/                       · busca global (opcional)
├── viewport/                     · hooks de pan/zoom
│   ├── useCartografiaViewport.ts
│   ├── viewportMath.ts
│   └── useViewportPanBindings.ts
└── styles/                       · CSS modular com prefixo numerado
    ├── 00-work.css               · layout shell
    ├── 01-viewport-world.css     · pan/zoom container
    ├── 02-trails.css             · SVG paths
    ├── 03-regions.css            · lanes/regions
    ├── 04-atoms.css              · cards
    ├── ...                       · seguir ordem cascade: layout → conteúdo → polish
    ├── 19-<feature>.css          · features novas em sufixo crescente
    └── <surface>.css             · @import index
```

**Regras estruturais**:
- CSS sempre prefixado por `.cartografia-surface` (ou `.<surface>-surface`) pra escopo.
- Cada arquivo CSS é um capítulo lógico (work, viewport, trails, regions, atoms, scenes, floaters, ...).
- Numeração 00..N indica ordem de cascade. Features novas adicionam ao fim.
- Hooks de state ficam em `state/`, não acoplados a componentes.
- View-model builders são funções PURAS em `*Model.ts` — separadas dos componentes (FlowLaneRegion vs flowLaneModel).

---

## 5 · Padrões de Componentes Canon

### 5.1 · Atom (card básico)

Atom é a peça fundamental: card cream com nome + deck + source path.

```tsx
<div className="atom" id={`atom-${graphId}`} onClick={handleClick}>
  <span className="a-name">{name}</span>          {/* Cormorant italic 14.5-17px */}
  <span className="a-deck">{deck}</span>           {/* italic 12.5-14.5px ink2 */}
  <span className="a-source">                     {/* Mono caps small */}
    <span className="a-source-badge repo">md</span>
    <span className="a-source-path">{basename(sourcePath)}</span>
  </span>
</div>
```

**Variantes canônicas**:
- `.atom` · default lateral (lanes)
- `.atom-pipe` · pipeline central numerado (numeral romano + symbol chip + body)
- `.atom-pipe#atom-<hero-id>` · hero (Atlas Decide) com peso adicional
- `.atom.missing-source` · doc ausente (border-left rec-red + hatching + badge)
- `.atom.has-risk` · gargalo (inset box-shadow rec-red-soft)
- `.atom.is-orphan` · órfão (outline dashed bronze)
- `.atom.active` · em foco (isolate mode)
- `.atom.kin` · vizinho do active

### 5.2 · Region / Lane

Container que agrupa atoms numa coluna.

```tsx
<div className="region territory-domain" style={{ left, top, width, height }}>
  <div className="region-head">
    <span className="eyebrow">domínio</span>      {/* Mono caps 9.5px */}
    <span className="count">08</span>             {/* Mono caps tabular */}
    <span className="title">Domain Plane</span>    {/* Cormorant italic 20px */}
    <span className="deck">conecta domain/profile/flow</span>
  </div>
  <div className="region-atoms">
    {atoms.map(atom => <Atom key={atom.graphId} atom={atom} />)}
  </div>
</div>
```

**Tones por território** (background sutil 4-7% alpha):
- `.territory-domain` · bronze-veil
- `.territory-capability` · moss-veil
- `.territory-business` · bronze-deep-veil
- `.territory-human` · prussian-veil
- `.territory-evidence` · rec-red 4% veil
- `.territory-docs` · bronze-soft-veil

### 5.3 · Floaters

Componentes flutuantes (UI chrome) ao redor do canvas. Classe `.floater .no-pan` evita que pan binding capture clicks.

```tsx
<div className="canvas-controls floater no-pan">
  <button type="button" onClick={...} title="..." aria-label="...">−</button>
  ...
</div>
```

**Floaters canônicos**:
- `Breadcrumb` · navegação contextual (top center)
- `Minimap` · continentes seletor (top left)
- `VisualLensToolbar` · 5 lentes (top right)
- `ZoomControls` · zoom + edit toggle + reset (bottom right)
- `CartografiaSearch` · busca global (bottom center)
- `LayoutSaveIndicator` · "salvo · há Xs" + undo/redo (bottom center, edit mode)
- `LayoutPresetsMenu` · presets nomeados (top right, edit mode)
- `ReadingModeNarrator` · breadcrumb narrativo (top center, reading mode)
- `AtomHoverPreview` · tooltip .md preview (next to hovered atom)

---

## 6 · Interação · Padrões canon

### 6.1 · Click model

Canon Cartografia (replicar em surfaces similares):

| Ação | Comportamento |
|---|---|
| Hover atom | Acende trilhas conectadas + popula inspector |
| Single click atom | Isola peça (spotlight + vinheta + blur no resto) |
| Double click atom | Entra em foco (gear scene) |
| Click espaço vazio | Pan inicia |
| Wheel | Zoom focal no ponto do cursor |
| Click button floater | Ação imediata (não pan) — usar `.no-pan` |
| Escape | Sai do foco / isolate |

### 6.2 · Keyboard shortcuts canon

| Tecla | Ação |
|---|---|
| `/1` `/2` `/3` `/4` `/5` | Trocam Visual Lens |
| `cmd+K` | Busca global |
| `cmd+shift+A` | Audit panel |
| `R` | Toggle reading mode |
| `← →` `Space` | Navega capítulos em reading mode |
| `0` ou `⊟` button | Fit-to-view |
| `Esc` | Sai do foco / isolate |
| `cmd+Z` | Undo (em edit mode) |
| `cmd+shift+Z` | Redo (em edit mode) |

**Regra de shortcut**:
- Sempre `ignore when typing` (verificar `target.tagName === 'INPUT' || 'TEXTAREA' || isContentEditable`)
- Atalhos contextuais (R só ativa coisas em flow view, undo só em edit mode)
- `preventDefault()` quando consumindo o evento canônico

### 6.3 · Pan/zoom integration

O `.world` aplica `transform: translate scale`. Coordenadas:
- **World coords** · 1880×1820 (sistema lógico imutável)
- **Screen coords** · post-transform (`getBoundingClientRect`)

**Pra converter screen → world** ao drag/click:
```ts
const worldDx = (event.clientX - startClientX) / scale
const worldDy = (event.clientY - startClientY) / scale
```

Pan binding (`useViewportPanBindings`) escuta `mousedown` no viewport mas IGNORA quando target está em `.no-pan, .atom, .satellite, .floater, .canvas-controls, .breadcrumb, .back-to-map` (NO_PAN_SELECTOR canon).

---

## 7 · Edit Mode · Lanes editáveis (2026-05-14)

### 7.1 · Princípio

A Cartografia é a **visualização e navegação da documentação canônica**. Atoms representam .md real e NÃO movem. Lanes são containers organizáveis pelo usuário (Edit Mode).

| Componente | Mover? | Redimensionar? |
|---|---|---|
| **Lanes** (Domain Plane, Capabilities, HKS, Evidence, Doc OS, Business Context) | ✅ Sim | ✅ Sim |
| **Atoms** (cards dentro de lanes) | ❌ Não | ❌ Não |
| **Pipeline central** | ❌ Não | ❌ Não |
| **Phase markers** | ❌ Não (ancorados ao pipeline) | ❌ Não |

### 7.2 · Hooks canônicos

```ts
// state/useCustomLayout.ts
const {
  overlay,           // CustomLayoutMap (graphId → {x, y, w?, h?})
  updateLane,        // (graphId, patch) → push snapshot to undo stack
  resetAll,          // limpa todos overrides
  resetLane,         // limpa override de uma lane
  replaceOverlay,    // substitui overlay inteiro (usado por presets)
  undo,              // → boolean (false se stack vazia)
  redo,              // → boolean
  canUndo, canRedo,  // memoized
  hasOverrides,      // memoized
  lastSavedAt,       // timestamp pro indicator
} = useCustomLayout(view)

// state/useEditMode.ts
const { isEditMode, toggle, setMode } = useEditMode()

// state/useLayoutPresets.ts
const {
  presetList,        // PresetSummary[] (sorted)
  savePreset,        // (name, overlay) → boolean
  loadPreset,        // (name) → overlay | null
  deletePreset,
  hasPresets,
} = useLayoutPresets(view)

// state/useLayoutShortcuts.ts
useLayoutShortcuts({ isEditMode, undo, redo })
```

### 7.3 · Snap-to-grid + magnetism

Implementado em `scenes/FlowLaneRegion.tsx`:

```ts
const SNAP_GRID = 8         // px no mundo
const MAGNET_SNAP = 12      // px até canon dentro do qual snap exato acontece

function snap(value, step) { return Math.round(value / step) * step }
function applyMagnet(candidate, canon) {
  if (Math.abs(candidate - canon) <= MAGNET_SNAP) return canon
  return candidate
}
```

Aplicado tanto em drag (X/Y) quanto resize (W/H).

### 7.4 · Drag/resize coordenação com pan

Region-head ganha `.no-pan` em edit mode pra que `useViewportPanBindings` não capture o mousedown. Drag usa `useEffect` com `window.addEventListener('mousemove'/'mouseup')` durante interaction → cleanup automático.

```tsx
<div className={`region-head${isEditMode ? ' no-pan' : ''}`} onMouseDown={(e) => beginInteraction(e, 'drag')}>
```

### 7.5 · localStorage namespace

```
atlas.cartografia.edit-mode            → '1' | '0'
atlas.cartografia.custom-layout.{view} → JSON CustomLayoutMap
atlas.cartografia.presets.{view}       → JSON PresetsMap
```

`view` é o continent ID atual (atlas-ai-kernel, memoria, obras, ...) — namespacing por view evita cross-pollination.

---

## 8 · Trail Re-routing Inteligente

Trail (SVG path) entre atoms canonicamente em `map/trailPathBuilders.ts`:

```ts
smartFlowPath(
  from: TrailRect,
  to: TrailRect,
  side: 'left' | 'right',    // sugestão preliminar
  lane: number,              // staggering pra trails paralelas
  endpoints?,                // forçar entry/exit points
  obstacles?: TrailRect[]    // atoms a evitar (geometry avoidance)
): string                    // SVG path d=
```

**Garantias geométricas**:
- `direction = ex >= sx ? 1 : -1` · auto-detect baseado em coords reais
- EXIT_RUN (40px) horizontal antes de curvar · não corta siblings stacked
- APPROACH_RUN (40px) horizontal antes de pousar
- MIN_CHANNEL (96px) · força bezier ter espaço pro S
- LONG_VERTICAL (200px) · trigger `parkedFlowPath` (S com rail horizontal mid-y)
- LANE_STAGGER (14px) · separa trails paralelas
- OBSTACLE_PAD (20px) · margem segura ao redor de obstacles

**Quando passar obstacles**:
```ts
// callers que sabem a topologia (atoms vizinhos da rota)
smartFlowPath(from, to, side, lane, endpoints, neighborhoodAtoms)
```

Quando obstacle bloqueia bezier: control points ajustados pra desviar acima/abaixo (simple repulsion). Não é A* completo, mas cobre 80% dos casos Edit Mode.

---

## 9 · Hover Insight · Preview do .md

**Hook canon**: `map/useAtomNotePreview.ts`

```ts
const preview = useAtomNotePreview({
  atom: { graphId, name, deck },  // ou null
  enabled: boolean,                 // disable em isolate/edit/reading modes
})
```

**Comportamento**:
- Hover → timer 380ms (HOVER_DELAY)
- Após delay → `bridge.loadCartographyNote(graphId)` → cache Map por graphId
- Cancel se atom muda antes do timer disparar (useEffect cleanup)
- Cache em memória (sessão) — anti-mock canônico: re-fetch em reload pra que documento real seja a fonte

**Componente** `map/AtomHoverPreview.tsx`:
- Posicionamento auto (direita se cabe, senão esquerda)
- Estados loading (skeleton animation) / error (eyebrow rec-red) / success (body extraído)
- `pointer-events: none` · não compete com hover do atom
- `role="tooltip"` + `aria-live="polite"`

**Disable rules**:
- Em isolate mode (peça já em foco, preview redundante)
- Em edit mode (hover é prompt pra drag, não pra leitura)
- Em isolated view (peça em gear/subflow)

---

## 10 · Reading Mode · Narrativa sequencial

Tecla `R` ativa. Setas ← → e Space navegam capítulos do pipeline.

**State** (`state/useCartografia.ts`):
```ts
{ readingMode, readingFocusOrder, setReadingMode, readingNext, readingPrev }
```

**Componente** `floaters/ReadingModeNarrator.tsx`:
- Phase canon: `intake (i-iii)` `shape (iv-viii)` `decide (ix-xii)` `prove (xiii-xv)` `render (xvi-xvii)`
- Eyebrow + numeral romano + título + deck + role + próxima ação
- Footer navigation (← progress → ) + atalhos visual

**CSS** (`styles/14-reading-mode.css`):
- `.world.reading-mode` aplica radial vignette + blur nas lanes laterais
- `.atom-pipe.reading-focus` ganha ring duplo bronze + scale 1.08
- `.trail.path-active` (entre focus e próximo) acende com filter drop-shadow

---

## 11 · Cookbook · Como adicionar feature nova

### 11.1 · Checklist

1. **Leia o capítulo 1 (DNA) e capítulo 2 (Tokens) de novo.** Sempre. Especialmente anti-canon.
2. **Defina o state** num hook isolado em `state/<feature>.ts`. Pure functions onde possível.
3. **Defina o view-model** num builder em `scenes/<feature>Model.ts`. Pure.
4. **Crie o componente** consumindo state + view-model. Tipado completo.
5. **Crie o CSS** em arquivo numerado novo (`19-<feature>.css` ou superior). Escopo `.cartografia-surface`.
6. **Importe o CSS** em `cartografia.css` na ordem correta (depende cascade).
7. **A11y obrigatório**: `aria-label`, `role`, keyboard nav, `prefers-reduced-motion` respect.
8. **localStorage**: se a feature persistir, usar namespace `atlas.cartografia.<feature>.{view}`.
9. **Documente comment canon** no topo de cada hook/componente. Why/How/Tradeoffs explícitos.
10. **Smoke test Playwright** pra confirmar zero erros + elementos chave renderizados.

### 11.2 · Componentes inline · estrutura padrão

```tsx
/**
 * <ComponentName> · <descrição 1-line>.
 *
 * Why: <motivação · referência canon ou memória>
 * How: <comportamento principal · estados / edge cases>
 * Tradeoffs: <decisões tomadas / alternativas rejeitadas>
 */
import { ... } from 'react'
import type { ... } from './<types>'

const CANON_CONSTANT = 8  // explicação inline do número canon

interface PropsName { ... }

export function ComponentName({ ... }: PropsName) {
  // useState/useEffect canon
  // useCallback/useMemo nos handlers
  return (
    <div className="<scope>-component" role="...">
      {/* sub-conteúdo */}
    </div>
  )
}
```

### 11.3 · Hooks · estrutura padrão

```ts
/**
 * use<Feature> · <descrição>.
 *
 * Schema persistente (se aplicável):
 *   key   = `atlas.cartografia.<feature>.{view}`
 *   value = JSON.stringify(<shape>)
 *
 * Read/write rules: <quando lê, quando persiste, quando reseta>
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { readCartografiaStorage, writeCartografiaStorage } from './browserStorage'

export interface FeatureState { ... }

const CANON_LIMIT = 50  // explicação canon

export function useFeature(view: string) {
  const [state, setState] = useState<FeatureState>(() => loadFromStorage(view))

  // Re-load quando view muda
  useEffect(() => { ... }, [view])

  const operation = useCallback((...) => { ... }, [...])

  return { state, operation, ... }
}
```

### 11.4 · CSS · estrutura padrão

```css
/*
 * <NN> · <FEATURE NAME> · canon (<data>).
 *
 * Comportamento: <quando ativa, o que muda visualmente>
 * Tokens: <quais usados (bronze, ink2, etc.)>
 * Anti-canon: <o que NÃO fazer (relevante a essa feature)>
 */

/* ─── Sub-seção ────────────── */
.cartografia-surface .<feature-classname> {
  /* sempre prefixar com .cartografia-surface (ou <surface>-surface) */
  /* tokens via var(--xxx) · NÃO hard-coded */
  /* radius 2-3px, motion via cubic-bezier(0.32, 0.72, 0.24, 1) */
}
```

---

## 12 · Anti-patterns observados (e proibidos)

Coletados de iterações anteriores. NÃO repetir:

| Anti-pattern | Por quê (incidente) |
|---|---|
| Aumentar "tudo 5×" via multiplicar coordenadas | Não resolve "leitura ruim". Quebra topologia. (2026-05-14 incident) |
| CSS `zoom: 5` no .cartografia-surface como solução pra "tela pequena" | Zoom virtual ≠ tamanho real. User criticou como "porca e burra" — está certo. |
| Atoms drag livre | Quebra o princípio: atom = doc canônica. Fase 3 do Edit Mode rejeitada. |
| Mock data como decoração ("PROXIMA" hardcoded) | Anti-mock canon. Decoração sem campo schema = TODO comment + render silente. |
| Setar `font-size: 130px` no inspector | UI chrome NÃO escala com canvas. Inspector fica canon (12-26px). |
| Sombra elaborada em estado idle | Peso editorial é via border/hairline, não shadow. Shadow só em active/hover. |
| Multi-paragraph docstring em código | Don't write multi-paragraph comments. Why em 1 linha + how em 1 linha. |
| Refactor além do escopo | Bug fix não justifica cleanup adjacente. Don't surf the codebase. |
| `eslint-disable` sem comentário explicando why | Justifique o disable inline. |

---

## 13 · Glossário canon

| Termo | Significado |
|---|---|
| **Atom** | Card-peça canônica. Representa graph_id → .md real. |
| **Lane** | Container vertical agrupando atoms (Domain Plane, Capabilities, HKS, ...). |
| **Pipeline** | Sequência central de 17 atoms numerados (i..xvii) que define o AI Kernel. |
| **Trail** | SVG path conectando 2 atoms. Tipos: sequence, feed, feedback, governance. |
| **Phase** | Capítulo do pipeline. 5 fases canon: intake, shape, decide, prove, render. |
| **Region head** | Cabeçalho de lane: eyebrow + count + title + deck. |
| **Atom-pipe** | Variante de atom usada no pipeline central (numeral + symbol + body). |
| **Hero (Atlas Decide)** | Peça hero do pipeline (step x). Drop-cap ❦ + ring triplo + numeral 26px. |
| **Missing source** | Atom cujo .md não existe ainda. Border rec-red + hatching + badge "FONTE AUSENTE". |
| **Floater** | UI chrome flutuante (toolbar, controls, indicators). Classe `.floater .no-pan`. |
| **Edit mode** | Lock/unlock toggle pra drag/resize de lanes. |
| **Custom layout overlay** | Map de overrides {x, y, w, h?} por graphId, persistido em localStorage. |
| **Preset** | Layout customizado nomeado, salvo pra alternar entre configurações. |
| **Reading mode** | Modo narrativo · R toggla, ← → space navegam capítulos. |
| **Isolate mode** | Spotlight numa peça (click), resto blur+vinheta. |
| **Visual lens** | 5 modos: fluxo, relações, risco, recentes, evidência. |
| **Continent** | Domínio top-level (atlas-ai-kernel, memoria, obras, filosofia, gargalos). |
| **Snap-to-grid** | Alinhamento 8px durante drag. |
| **Magnetism canon** | Atração discreta pra posição original (LANE_LAYOUT canon) quando perto. |

---

## 14 · Referências cruzadas

- `0001-atlas-desktop-boundaries.md` · contratos shell entre Cartografia e outras surfaces
- `0003-cartography-surface.md` · contrato da Cartografia (4 endpoints backend, schema graph)
- `0006-cartography-surface-scalability-contract.md` · scaling guarantees
- `atlas-server/docs/atlas-vault-cartografia.md` · canon visual + mockup HTML
- Memória `feedback_atlas_cartografia_principle` · princípio fundamental (atoms = doc, não movem)
- Memória `project_atlas_motion_principle` · DNA Don Corleone (Patek, NÃO Aesop)
- Memória `project_atlas_editorial_grid` · grid editorial Variante A canon
- Memória `project_atlas_source_authority` · docs .md = fonte autoral única

---

## 15 · Checklist pré-PR

Antes de submeter PR que toca uma surface (Cartografia ou similar):

- [ ] **DNA respeitado**: cream/bronze/Cormorant/Mono, zero Aesop/Material/SaaS-premium
- [ ] **Tokens canon**: cores via `var(--xxx)`, font-family via `var(--serif|--mono|--sans)`
- [ ] **Border radius 2-3px**: nunca 8/12/16
- [ ] **Motion canon**: cubic-bezier(0.32, 0.72, 0.24, 1) · durations 160-420ms
- [ ] **Anti-mock**: dado ausente = "FONTE AUSENTE" + hatching, nunca inventado
- [ ] **Hooks isolados**: state em `state/`, view-model em `*Model.ts`, componente em `scenes/`/`floaters/`
- [ ] **CSS modular**: arquivo numerado `NN-<name>.css`, escopo `.<surface>-surface`
- [ ] **A11y**: aria-label, role, keyboard nav, `prefers-reduced-motion` respect
- [ ] **localStorage namespaced**: `atlas.<surface>.<feature>.{context}`
- [ ] **Comments canon**: 1-line why + 1-line how no topo. Sem multi-paragraph.
- [ ] **Smoke test**: Playwright confirma zero erros + elementos chave
- [ ] **Memória atualizada** (se mudança canônica): `~/.claude/projects/.../memory/` + MEMORY.md index

---

**Última revisão**: 2026-05-14 · Vitor + sessão Atlas Code
**Próxima revisão obrigatória**: ao adicionar surface nova ou alterar tokens canon

---

## 16 · Surface Code · Tema Dark Warm (Codex-inspired)

A surface `code` (Atlas Code workbench) usa **tema dark warm** completamente diferente da Cartografia. Aplicado SOMENTE dentro do escopo `.atlas-shell.surface-code` — Cartografia permanece cream intocada.

### 16.1 · Por quê dark · razão canon

Atlas Code é workbench operacional · ledger de execução, gates, evidências, Forge runs. Uso é prolongado (12h+ por dia). Cream cansa em sessão longa — slate teal preserva atenção. Inspiração: Codex CLI editor + ledger contábil noturno.

### 16.2 · Tokens canon (light + dark via overlay)

Definidos em `apps/desktop/src/index.css` em duas camadas:

**Base (light · default Atlas Code)** · linhas 70-200:
```css
--cc-bg:              #f4ede0;       /* canvas warm ivory */
--cc-surface:         #faf5e8;       /* superfícies / cards */
--cc-surface-raised:  #fcfaf4;       /* popovers / dialogs */
--cc-surface-sunken:  #ece4d3;       /* sidebars / footers */

--cc-text:            #1d1a16;       /* primary */
--cc-text-strong:     #0f0e0c;       /* headlines */
--cc-text-muted:      #5a544a;       /* secondary */
--cc-text-faint:      #8a8275;       /* helpers */
--cc-text-disabled:   #b3ac9e;

--cc-border-soft:     rgba(26, 23, 20, 0.08);
--cc-border:          rgba(26, 23, 20, 0.16);
--cc-border-strong:   rgba(26, 23, 20, 0.28);

/* Status saturados sem agressão */
--cc-success:  #4a6a3c;  --cc-success-fg: #2d4525;
--cc-warning:  #a87327;  --cc-warning-fg: #6e4818;
--cc-danger:   #b94d44;  --cc-danger-fg:  #7d2b25;
--cc-info:     #4a6a7c;  --cc-info-fg:    #2a4554;
--cc-neutral:  #5a544a;
```

**Dark warm overlay** (Codex slate · linhas 218-313):
```css
.atlas-shell.surface-code {
  --cc-bg:              #1d2b34;     /* slate teal Codex */
  --cc-surface:         #243743;     /* card slate elevated */
  --cc-surface-raised:  #2d4351;     /* popover */
  --cc-surface-sunken:  #15212a;     /* sidebar/footer */

  --cc-text-strong:     #f0f4f7;     /* cool cream high-contrast */
  --cc-text:            #d6dde2;
  --cc-text-muted:      #95a3ac;
  --cc-text-faint:      #677482;
  --cc-text-disabled:   #3d4b54;

  --cc-border-soft:     rgba(233, 238, 242, 0.05);
  --cc-border:          rgba(233, 238, 242, 0.10);
  --cc-border-strong:   rgba(233, 238, 242, 0.20);

  /* Accent · atlas gold burnished sobre slate */
  --cc-accent:          #d4a85a;
  --cc-accent-strong:   #e6b966;
  --cc-accent-veil:     rgba(212, 168, 90, 0.12);
  --cc-accent-border:   rgba(212, 168, 90, 0.34);

  /* Status afinados pra slate · saturados mas low-glare */
  --cc-success:  #82b577;  /* moss-bright */
  --cc-warning:  #e0ad5e;  /* atlas-gold-warm */
  --cc-danger:   #d05a52;  /* rec-red-bright */
  --cc-info:     #7fa7c4;  /* prussian-bright */
  --cc-neutral:  #95a3ac;

  /* Status dot mapping */
  --cc-dot-running:  var(--cc-info);
  --cc-dot-blocked:  var(--cc-danger);
  --cc-dot-review:   var(--cc-warning);
  --cc-dot-passed:   var(--cc-success);
  --cc-dot-unknown:  var(--cc-neutral);

  /* Sombras profundas slate */
  --cc-shadow-xs:  0 1px 0 rgba(0, 0, 0, 0.20);
  --cc-shadow-sm:  0 2px 4px rgba(0, 0, 0, 0.26);
  --cc-shadow-md:  0 6px 16px rgba(0, 0, 0, 0.32);
  --cc-shadow-lg:  0 14px 32px rgba(0, 0, 0, 0.38);

  /* Focus ring burnished gold */
  --cc-focus-ring: 0 0 0 2px var(--cc-bg), 0 0 0 4px rgba(230, 185, 102, 0.55);
}
```

### 16.3 · Bridge tokens · Cartografia → Code

Como Atlas Code tem painéis legacy que usam tokens canon Cartografia (`--cream`, `--ink`, `--bronze`), o overlay slate REDEFINE esses tokens dentro do escopo `.atlas-shell.surface-code` pra mapear no slate. Isso é **bridge intencional** — painéis legacy ainda funcionam, só ganham tema dark sem refactor.

Mapeamento canon (preservado):
```
--cream         → #1d2b34 (slate teal bg)
--cream-paper   → #243743 (surface card)
--cream-deep    → #15212a (sunken sidebar)
--ink           → #e9eef2 (cool cream high-contrast)
--ink2          → #cdd6dc
--bronze        → #d4a85a (atlas gold)
--bronze-deep   → #e6b966 (gold strong)
```

### 16.4 · Tipografia code surface

| Token | Valor | Uso |
|---|---|---|
| `--cc-text-display` | 22px | Headlines / hero numerals |
| `--cc-text-title` | 17px | Painel titles |
| `--cc-text-section` | 14px | Section headers |
| `--cc-text-body` | 13.5px | Body operacional |
| `--cc-text-body-sm` | 12.5px | Body denso |
| `--cc-text-caption` | 11.5px | Legendas |
| `--cc-text-label` | 10px | Labels uppercase |
| `--cc-text-data` | 12px | Dados em Mono |

Font canon: **Inter** (sans-serif) protagonista · **JetBrains Mono** pra dados/IDs/timestamps. **NÃO Cormorant** — esse é da Cartografia.

### 16.5 · Status dots · canon (não pulsa)

Atlas Code Codex Slate Premium v1 (memória `project_atlas_code_codex_slate_premium`) decidiu: **status dots NÃO pulsam**. Halo pulsando foi removido por ser "cafona SaaS".

```css
.status-dot.running  { background: var(--cc-dot-running); }
.status-dot.blocked  { background: var(--cc-dot-blocked); }
.status-dot.review   { background: var(--cc-dot-review); }
.status-dot.passed   { background: var(--cc-dot-passed); }
.status-dot.unknown  { background: var(--cc-dot-unknown); }
/* sem animation: pulse — proibido */
```

### 16.6 · Letter-spacing canon code

**`letter-spacing: 0` em corpo de texto**. Letter-spacing aplica APENAS em labels uppercase (Mono caps) com tracking ≥ 1.4px. Decisão Codex Slate v1.

### 16.7 · Quando aplicar Cartografia vs Code

| Caso | Use |
|---|---|
| Surface NOVA cuja função é **visualizar/navegar documentação canônica** | Canon Cartografia (cream) |
| Surface NOVA cuja função é **operar/executar/auditar** (workbench, ledger, gates) | Canon Code (slate dark warm) |
| Componente reutilizável entre as duas (button, modal genérico) | Use tokens `--cc-*` (presentes em ambas) |
| Componente exclusivo de uma | Use scope `.cartografia-surface` ou `.atlas-shell.surface-code` |

### 16.8 · Anti-canon Code surface

- ❌ Cor saturada brilhante (azul Material #2196F3, verde Tailwind #10B981) → use status colors canon
- ❌ Tipografia serif em body Code (deixa pra Cartografia) → Inter sans-serif
- ❌ Box-shadow sem profundidade (offset 0 0 X 0) → use `--cc-shadow-*` canon
- ❌ Border-radius >= 6px em elementos workbench → 2-3px
- ❌ Pulse animation em status dots → estático

---

## 17 · Hooks Core · API Completa

Cartografia tem ~15 hooks. Aqui estão os 10 mais usados, agrupados por responsabilidade. Estrutura padrão: **um hook, uma responsabilidade**.

### 17.1 · Master hook · `useCartografia()`

```ts
import { useCartografia } from './state/useCartografia'

const c = useCartografia()
```

Retorna `CartografiaState` (interface canônica em `state/cartografiaTypes.ts`):

```ts
interface CartografiaState {
  // Data
  loading: boolean
  errors: string[]
  graph: CartographyGraph | null
  recentChanges: RecentChange[]
  noteCache: Record<string, CartographyNote | null>
  atomIndex: Record<string, CartographyAtom>

  // Navigation state
  view: CartographyView                 // 'universe' | 'system' | 'flow' | 'gear' | 'subflow'
  continent: string                      // 'atlas-ai-kernel' | 'memoria' | 'obras' | ...
  systemParentId: string | null
  focusedId: string | null
  isolatedId: string | null              // peça em isolate mode (spotlight)
  hoverId: string | null
  searchQuery: string

  // Reading mode
  readingMode: boolean
  readingFocusOrder?: number | null
  toggleReadingMode: () => void
  setReadingMode: (next: boolean) => void
  readingNext: () => void
  readingPrev: () => void

  // Density (atom compactness)
  density: 'comfortable' | 'compact'
  setDensity: (next: 'comfortable' | 'compact') => void

  // Navigation actions
  setView: (v: CartographyView) => void
  selectContinent: (id: string) => void
  enterNode: (graphId: string) => void
  enterIsolate: (graphId: string) => void
  exitIsolate: () => void
  enterGear: (graphId: string) => void
  exitGear: () => void
  enterSubflow: () => void
  setHover: (graphId: string | null) => void
  setSearch: (q: string) => void

  // Async
  loadNoteFor: (graphId: string) => Promise<CartographyNote | null>
  refreshRecent: () => Promise<void>
}
```

**Regra**: este é o **único** caller de `useCartografiaData/Navigation/Notes`. Composition root chama `useCartografia()` uma vez, passa pra downstream. Nunca chame `useCartografiaData()` direto fora deste hook.

### 17.2 · ViewModel · `useCartografiaViewModel(c)`

```ts
import { useCartografiaViewModel } from './state/useCartografiaViewModel'

const vm = useCartografiaViewModel(c)
// vm: { continent, focusedAtom, hoveredAtom, hereLabel, isOffline, lensStats }
```

Hook **derived state** — computa ViewModels memoized a partir do master state. Pure derivation. Sem efeitos. Use em props pra componentes child.

### 17.3 · Viewport · `useCartografiaViewport(config)`

```ts
import { useCartografiaViewport } from './viewport/useCartografiaViewport'

const viewport = useCartografiaViewport({
  worldWidth: WORLD_WIDTH,         // 1880 canon
  worldHeight: WORLD_HEIGHT,       // 1820 canon (ou 2500 com cards maiores)
  initialScale: 0.4,               // opcional, default 0.4
  minScale: 0.3,                   // opcional, default 0.3
  maxScale: 2.4,                   // opcional, default 2.4
})
```

Retorna:
```ts
{
  viewportRef: RefObject<HTMLDivElement>,  // ref pra atribuir ao container
  transform: { scale, x, y },              // estado atual
  animating: boolean,                       // motion transition active?
  zoomBy: (factor, focalX?, focalY?) => void,
  fit: () => void,                          // fit-to-screen
  fitToStage: (stage) => void,              // fit a um sub-stage
  reset: () => void,                        // initialScale centralizado
  setAnimating: (bool) => void,
  didDrag: () => boolean,                   // pra distinguir pan vs click
}
```

**Math canon** em `viewport/viewportMath.ts`:
- `clampScale(scale, min, max)` · clamp básico
- `zoomAroundPoint({...})` · zoom focal mantendo ponto na tela
- `fitWorld({...})` · scale pra mundo inteiro caber + centralização
- `fitStage({...})` · scale pra um stage específico com cap 1.05

### 17.4 · Pan/zoom bindings · `useViewportPanBindings({...})`

Hook interno usado pelo `useCartografiaViewport`. Adiciona mouse/wheel listeners no viewport. Respeita `NO_PAN_SELECTOR` canon:

```ts
const NO_PAN_SELECTOR = [
  '.no-pan',         // marcador explícito
  '.atom',           // não pan ao clicar atom
  '.satellite',
  '.focus-action',
  '.floater',
  '.canvas-controls',
  '.breadcrumb',
  '.back-to-map',
].join(', ')
```

Qualquer elemento que tenha `closest(NO_PAN_SELECTOR)` truthy IGNORA mousedown pra pan. Use `.no-pan` em handlers customizados (drag de lane, resize, botão floater).

### 17.5 · SceneAutoFit · `useSceneAutoFit({...})`

```ts
useSceneAutoFit({
  viewport,                    // do useCartografiaViewport
  view: c.view,
  continent: c.continent,
  systemParentId: c.systemParentId,
  focusedId: c.focusedId,
})
```

Dispara `viewport.reset()` (ou `viewport.fit()` legacy) quando view/continent/system/focused muda — re-centraliza após navegação. Implementação canon usa `reset()` pra honrar `initialScale` configurado.

### 17.6 · Visual Lens · `useVisualLens()`

```ts
import { useVisualLens } from './state/useVisualLens'
const { visualLens, setVisualLens } = useVisualLens()
```

Toggle de 5 lentes:
```ts
type VisualLens = 'flow' | 'relations' | 'risk' | 'recent' | 'evidence'
```

Persisted em localStorage `atlas.cartografia.visualLens`.

Aplicado como class no `.world` (`world.lens-flow` etc.) — CSS reage com filtros/destaque por lente.

### 17.7 · Search · `useCartografiaSearch(atomIndex, enterNode)`

```ts
import { useCartografiaSearch } from './search/useCartografiaSearch'
const search = useCartografiaSearch(c.atomIndex, c.enterNode)
```

Retorna controller pra busca global (`Cmd+K`). Acopla input + results + navegação.

### 17.8 · Shortcuts · `useCartografiaShortcuts({...})`

```ts
import { useCartografiaShortcuts } from './state/useCartografiaShortcuts'

useCartografiaShortcuts({
  view: c.view,
  isolatedId: c.isolatedId,
  search,
  onFit: viewport.fit,
  onSetVisualLens: setVisualLens,
  onExitGear: c.exitGear,
  onExitIsolate: c.exitIsolate,
  onToggleAuditPanel: toggleAudit,
})
```

Registra keyboard shortcuts canon (`/1..5`, `cmd+K`, `cmd+shift+A`, `0`, `Esc`). Skip when typing rule built-in.

### 17.9 · Inspector column · `useInspectorColumn()`

```ts
import { useInspectorColumn } from './layout/useInspectorColumn'
const inspector = useInspectorColumn()
// { collapsed, toggle, width, setWidth }
```

Gerencia sidebar lateral (inspector ficha 7 campos). Width resizable, persistido em localStorage.

### 17.10 · Edit Mode hooks (capítulo 7 já detalha)

```ts
import { useCustomLayout, useEditMode, useLayoutPresets, useLayoutShortcuts } from './state/...'

const editMode = useEditMode()
const customLayout = useCustomLayout(c.continent)
const layoutPresets = useLayoutPresets(c.continent)
useLayoutShortcuts({ isEditMode: editMode.isEditMode, undo: customLayout.undo, redo: customLayout.redo })
```

### 17.11 · Hover Insight · `useAtomNotePreview({...})`

```ts
import { useAtomNotePreview } from './map/useAtomNotePreview'

const preview = useAtomNotePreview({
  atom: hoveredAtom ? { graphId, name, deck } : null,
  enabled: !isEditMode && !isolatedId,
})
```

### 17.12 · Regra mestre · composição

**Composition root (`<Surface>Surface.tsx`)** instancia TODOS os hooks. Passa pra child slots via props. Nunca crie hooks no meio da árvore — atalho que vira manutenção horrível.

```tsx
export function CartografiaSurface() {
  const c = useCartografia()
  const viewport = useCartografiaViewport({ worldWidth: WORLD_WIDTH, worldHeight: WORLD_HEIGHT })
  const inspector = useInspectorColumn()
  const { visualLens, setVisualLens } = useVisualLens()
  const search = useCartografiaSearch(c.atomIndex, c.enterNode)
  const vm = useCartografiaViewModel(c)
  const editMode = useEditMode()
  const customLayout = useCustomLayout(c.continent)
  const layoutPresets = useLayoutPresets(c.continent)

  useLayoutShortcuts({ isEditMode: editMode.isEditMode, undo: customLayout.undo, redo: customLayout.redo })
  useSceneAutoFit({ viewport, view: c.view, continent: c.continent, systemParentId: c.systemParentId, focusedId: c.focusedId })
  useCartografiaShortcuts({ view: c.view, isolatedId: c.isolatedId, search, onFit: viewport.fit, onSetVisualLens: setVisualLens, onExitGear: c.exitGear, onExitIsolate: c.exitIsolate, onToggleAuditPanel: toggleAudit })

  return (
    <CartografiaLayout inspector={inspectorPanel} inspectorColumn={inspector}>
      <CartografiaViewportSlot cartografia={c} viewModel={vm} viewport={viewport} ... />
    </CartografiaLayout>
  )
}
```

---

## 18 · Performance & Memoization Rules

### 18.1 · Performance budget Cartografia

| Métrica | Target | Hoje (canon) |
|---|---|---|
| Total atoms no DOM | ≤ 60 | ~50 (17 pipeline + 26 lanes + 6 region heads) |
| Trails SVG | ≤ 30 | 24 (auditado) |
| Re-render por hover | ≤ 1 (componente hovered) | ✓ |
| First paint after data load | ≤ 200ms | ✓ |
| Pan/zoom 60fps em zoom-mid | sem stutter | ✓ |
| Reading mode transition | < 500ms | ✓ (420ms) |

### 18.2 · Memoization rules

**Use `useMemo` quando**:
- Computação O(n) ou maior sobre data props (ex: `computeStepYs(pipeline)`)
- Building view-model objects passados como prop (evita re-render do child)
- Derived state com múltiplas dependências

**Use `useCallback` quando**:
- Handler passado como prop pra child memoized
- Função usada em useEffect dependency array
- Handler que cria closures sobre state caro

**NÃO use memo quando**:
- A função recompõe rápido (< 1ms)
- A child não é memoized (memo no callback é wasted)
- Você não tem evidência de problema

**Antipattern observado**: `useCallback` em handler de 1-linha passado pra `<button>` HTML nativo. Wasted. HTMLButtonElement não memoiza.

### 18.3 · React.memo rules

**Use `React.memo`** em:
- Componentes que renderizam ≥ 30 vezes (atoms numa lista canon)
- Componentes com props estáveis (não recriadas a cada render do parent)

**NÃO use** em:
- Top-level surface components (render só uma vez por mudança de view)
- Componentes com `children` JSX prop (filhos sempre recriam)
- Componentes que recebem callbacks inline (memo + inline = inútil sem useCallback)

### 18.4 · Virtualization threshold

| Lista | Tamanho atual | Virtualizar? |
|---|---|---|
| Atoms numa lane | 1-8 | ❌ Não |
| Pipeline atoms | 17 | ❌ Não |
| Search results | 0-50 | ❌ Não (já é limitado por query) |
| Audit broken paths list | 0-N | ⚠️ Avaliar se passar de 100 |
| Recent changes timeline | 0-100 | ⚠️ Avaliar paginação |

**Lib canon se precisar**: `react-window` (light) sobre `react-virtualized` (heavy). Aplicar apenas com evidência de jank.

### 18.5 · Subpixel rendering canon

`.world` aplica `transform: scale`. Subpixel rendering causa blur em texto quando scale ≠ 1. Mitigação:

```css
.cartografia-surface .world {
  will-change: transform;        /* GPU hint */
  backface-visibility: hidden;
}
.cartografia-surface .atom .a-name {
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
}
```

### 18.6 · Performance debug

```bash
# Captura DOM count + frame rate
node /tmp/atlas-perf-probe.mjs   # script Playwright (cap. 19)

# React DevTools profiler · ative em dev mode pra ver re-renders.
```

Quando re-render explodir: olhar `flowLaneModel.buildFlowLaneViewModel` (chamado pra cada lane), considerar memoização.

---

## 19 · Playwright · Template Canon

Atlas tem padrão Playwright canônico. Scripts vivem em `/tmp/atlas-*.mjs` e usam Playwright instalado em `/tmp/node_modules/playwright`.

### 19.1 · Setup

```bash
cd /tmp && npm i playwright@1.60.0 --no-save && npx playwright install chromium
```

### 19.2 · Template canônico

```javascript
// /tmp/atlas-<feature>-test.mjs
import { chromium } from 'playwright'

const TOKEN = '2af71f11fd9904e35ede0da56c1888085fd41e7a150150f29852bafaeb3d38389297ccf1d2d067a01f1cabf60b6bb488'
// ⚠️ Substitua pelo token canônico do seu apps/desktop/.env.local

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 960 },  // Tauri window size canon
  deviceScaleFactor: 2,                      // retina sharp
})
const page = await ctx.newPage()

// Console + page errors capture
const errs = []
page.on('pageerror', e => errs.push('PAGEERR: ' + e.message.slice(0, 200)))
page.on('console', m => { if (m.type() === 'error') errs.push('ERR: ' + m.text().slice(0, 200)) })

// Load surface
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
await page.evaluate(`localStorage.clear()`)              // estado limpo
// Opcional: collapse minimap pra screenshot limpo
await page.evaluate(`localStorage.setItem('atlas.cartografia.minimapCollapsed', '1')`)
await page.reload({ waitUntil: 'domcontentloaded' })

// Aguarda root do canvas
await page.waitForSelector('.cartografia-surface .world', { timeout: 15000 })

// WARM-UP CANON · primeira fetch pode perder a race com SSE/auth.
// 8 retries × 2s, força fetch direto até atoms aparecerem.
for (let i = 0; i < 8; i++) {
  const ready = await page.evaluate(`document.querySelectorAll('.atom-pipe').length`).catch(() => 0)
  if (ready > 0) break
  await page.evaluate(`fetch('http://127.0.0.1:8001/atlas-cartography/graph', {
    headers: { 'X-Atlas-Token': '${TOKEN}' }
  }).catch(() => {})`).catch(() => {})
  await page.waitForTimeout(2000)
}
await page.waitForTimeout(2500)                          // settle final

// === TEST AQUI ===
const elements = await page.evaluate(() => ({
  atoms: document.querySelectorAll('.atom-pipe').length,
  regions: document.querySelectorAll('.region').length,
  // ... seus selectors
}))
console.log('elements:', JSON.stringify(elements))

// Screenshot
await page.screenshot({ path: '/tmp/atlas-<feature>.png' })

// Verifica zero erros
console.log('errors:', errs.length ? errs.slice(0, 5).join(' | ') : 'NONE')
await browser.close()
```

### 19.3 · Captura de seletor específico (close-up)

```javascript
const el = await page.$('#atom-atlas-decide')
if (el) {
  const box = await el.boundingBox()
  if (box) {
    const pad = 30
    await page.screenshot({
      path: '/tmp/atlas-decide-closeup.png',
      clip: {
        x: Math.max(0, box.x - pad),
        y: Math.max(0, box.y - pad),
        width: Math.min(1440, box.width + pad * 2),
        height: Math.min(960, box.height + pad * 2),
      },
    })
  }
}
```

### 19.4 · Manipular transform pra teste

`useViewportPanBindings` ignora pan em `.no-pan`. Pra testar drag, force transform inline + use mouse events nativos:

```javascript
// Force a known transform pra coords previsíveis
await page.evaluate(`
  const w = document.querySelector('.world')
  w.style.transform = 'translate(100px, 80px) scale(1.0)'
`)
await page.waitForTimeout(400)

// Drag via mouse (não pointer · pan binding canon usa mouse)
await page.mouse.move(cx, cy)
await page.mouse.down()
await page.mouse.move(cx + 80, cy + 60, { steps: 8 })
await page.mouse.up()
```

### 19.5 · Tamanhos viewport canon

| Caso | viewport | deviceScaleFactor |
|---|---|---|
| Tauri default | 1440×960 | 2 |
| Captura wide pra demo | 2200×1400 | 2 |
| Captura close-up | 1600×1100 | 2 |
| Mobile (Atlas App, se aplicável) | 393×852 | 3 |

### 19.6 · Atalhos canon nos tests

| Tecla | Disparo |
|---|---|
| `await page.keyboard.press('r')` | Reading mode toggle |
| `await page.keyboard.press('ArrowRight')` | Reading next |
| `await page.keyboard.press('0')` | Fit-to-view |
| `await page.keyboard.press('Escape')` | Sai isolate/foco |
| `await page.keyboard.press('Meta+z')` | Undo (em edit mode) |
| `await page.keyboard.press('Meta+k')` | Search global |

### 19.7 · Validação obrigatória

Todo PR que toca surface DEVE rodar:

1. Smoke test (template 19.2) → `errors: NONE`
2. Captura screenshot pré e pós mudança
3. Comparação visual manual (you ou usuário)

---

## 20 · Versioning + Changelog

### 20.1 · Version scheme

Major.Minor canônico:
- **Major bump** quando: token canon muda (cor/fonte/radius), princípio DNA muda, surface root nova.
- **Minor bump** quando: feature nova (Edit Mode, Reading Mode aprimorado), hook novo, anti-pattern catalogado.
- **Patch** (não numera): comments, examples, typo fixes.

### 20.2 · Migration path quando token muda

Se canon Mover `--bronze` de `#8a6a35` pra `#8e6c34`:

1. Update token em `apps/desktop/src/index.css`
2. Sweep visual completo: capturas Playwright de 3 surfaces principais (Cartografia universo + flow + gear; Code workbench)
3. Update este doc com changelog entry
4. Bump version major (`2.0` → `3.0`)
5. Documente o "por quê" na entry — futura IA precisa entender contexto

### 20.3 · Changelog

#### v2.0 · 2026-05-14 · Sessão Edit Mode + Doc Canon

**Added**
- Capítulo 0 · Onboarding IA passo-a-passo
- Capítulo 7 · Edit Mode (drag/resize lanes + snap-grid + magnetism + undo/redo + presets)
- Capítulo 8 · Trail re-routing geometry-aware com obstacle avoidance opt-in
- Capítulo 9 · Hover Insight com preview `.md` (cache, debounce, anti-mock)
- Capítulo 10 · Reading Mode aprimorado (Narrator editorial · phase canon)
- Capítulo 16 · Surface Code dark warm (Codex slate teal)
- Capítulo 17 · Hooks core completos (12 hooks documentados com APIs)
- Capítulo 18 · Performance & memoization rules + budget
- Capítulo 19 · Playwright template canon (warm-up 8 retries)
- Capítulo 20 · Versioning + changelog (este)
- 5 hooks novos: `useCustomLayout`, `useEditMode`, `useLayoutPresets`, `useLayoutShortcuts`, `useAtomNotePreview`
- 4 floaters novos: `LayoutSaveIndicator`, `LayoutPresetsMenu`, `ReadingModeNarrator`, `AtomHoverPreview`
- 1 CSS module novo: `19-edit-mode.css`

**Changed**
- `trailPathBuilders.smartFlowPath` agora aceita `obstacles?` array (backward-compatible)
- `useCustomLayout` retorna `undo/redo/canUndo/canRedo/replaceOverlay/lastSavedAt`
- Cartografia agora abre em `scale 0.4` por default (era `0.65`); `reset()` honra `initialScale`

**Removed**
- Pulse animation em status dots (cafona SaaS)
- Letter-spacing em corpo Code surface (canon Codex)

**Anti-patterns catalogados nesta versão**
- Aumentar tudo "5×" via multiplicar coordenadas (não resolve "leitura ruim")
- CSS `zoom: N` no surface root (zoom virtual ≠ tamanho real)
- Atoms drag livre (quebra princípio Cartografia)
- Setar font-size grande em ins-title (UI chrome ≠ canvas scale)

#### v1.0 · 2026-05-14 · Sessão K-O + Polish micro

**Added**
- Capítulos 1-15 · DNA, tokens, motion, estrutura, componentes, interação
- Polishes K-O · lane identity, phase rhythm, hero signature, paper texture, density default
- 4 CSS modules: `15-lane-identity.css`, `16-phase-rhythm.css`, `17-hero-signature.css`, `18-paper-texture.css`

### 20.4 · Pre-revisão guidelines

Ao criar PR que tocar este doc:

- [ ] Bump version se aplicável (regras 20.1)
- [ ] Entry no changelog (regra 20.3 format)
- [ ] Update memória `reference_atlas_desktop_design_system` se mudou estrutura
- [ ] Update MEMORY.md index se entry foi renomeada

---

## 21 · Visual References · Links Canon

### 21.1 · Mockup canon HTML (gabarito visual da Cartografia)

```bash
open /Users/vitorepf/develop/Atlas/atlas-server/public/atlas-vault-cockpit-mockup.html
```

Mockup standalone (HTML/CSS/JS puro, sem build) com canon visual completo. Use como referência ao implementar componente novo na Cartografia. Estrutura:

- `<head>` · todas variables CSS canon (cream/ink/bronze/Cormorant/Mono)
- `.region-head` (linha 183) · padrão lane head
- `.atom` (linha 207+) · padrão atom card
- `.atom-pipe` · variant pipeline
- `.trail` · SVG paths bezier

### 21.2 · Doc canon completa (1022 linhas)

```bash
open /Users/vitorepf/develop/Atlas/atlas-server/docs/atlas-vault-cartografia.md
```

Sections importantes pra implementação:
- §3-§4 · Componentes do canvas
- §7 · Visual lens (5 modos)
- §10 · Anti-canon explícito
- §15-§18 · Edit Mode (este doc consolida + estende)

### 21.3 · Capturas Playwright canon (referência visual viva)

Quando você precisar comparar uma implementação com canon, rode:

```bash
cd /tmp && node /tmp/atlas-tauri-size.mjs   # estado atual em viewport Tauri
```

Output: `/tmp/atlas-tauri-size.png` — abra e compare com seu trabalho.

### 21.4 · Comparação Errado vs Canon

| Elemento | ❌ Errado (Material/SaaS) | ✅ Canon Atlas |
|---|---|---|
| Card | `border-radius: 8px` + sombra fofa | `border-radius: 2-3px` + hairline bronze |
| Título | Sans-serif bold | Cormorant italic medium 17-22px |
| Label metadata | Inter 11px regular | Mono 9-10px caps tracking 1.4-2.4px |
| Cor de erro | `#EF4444` red brilhante | `--rec-red #8a3025` editorial |
| Animação hover | `transform: scale(1.1)` bouncy | translateY(-1px) + transition 180ms ease-considered |
| Loading | Skeleton blocks pulsing | Silêncio editorial + opacity subtle |
| Cor positiva | `#10B981` green vibrant | `--moss #4a5f3a` deliberado raro |
| Status dot | Pulse infinito | Estático (Codex Slate v1) |
| Empty state | Ilustração + CTA bold | Cormorant italic ink3 + 1 frase |
| Tooltip | Dark gradient pill | Cream-paper + hairline bronze + Cormorant |
| Modal | Backdrop opaque + bg branco + radius 12px | Vinheta radial + atom ring + ficha lateral |

### 21.5 · Mapa de surfaces

```
Atlas Desktop
├── surface-cartografia                    · cream editorial (Don Corleone Patek)
│   ├── views: universe / system / flow / gear / subflow
│   └── continents: atlas-ai-kernel · memoria · obras · forge · filosofia · gargalos
├── surface-code                            · slate teal dark warm (Codex)
│   ├── Forge workbench
│   ├── Spec OS / SDD pipeline
│   ├── Evidence ledger
│   ├── Self-improvement cockpit
│   └── Decisions / Gates / Live activity
└── (futuro · surfaces novas)              · usar capítulo 0.5 decision tree
```

---

**Última revisão**: 2026-05-14 · v2.0 · sessão Edit Mode + Doc Canon completa
**Próxima revisão obrigatória**: ao adicionar surface nova, alterar tokens canon, ou catalogar novo anti-pattern
