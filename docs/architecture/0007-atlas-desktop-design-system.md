# Atlas Desktop · Design System Canon

> **Status**: canon · ativo a partir de 2026-05-14
> **Owners**: Vitor (visão) · Atlas Desktop surface team
> **Predecessores**: 0001-atlas-desktop-boundaries · 0003-cartography-surface · 0006-cartography-surface-scalability-contract
> **Memória canon relacionada**: `project_atlas_motion_principle` · `project_atlas_editorial_grid` · `project_atlas_vault_cartografia` · `project_atlas_source_authority` · `feedback_atlas_cartografia_principle`

Esta é a referência **única e completa** que qualquer IA (ou humano) deve consultar antes de implementar qualquer surface, componente, hook ou interação no Atlas Desktop. Tudo aqui é canon — não é "sugestão". Anti-padrões estão marcados explicitamente.

Use este documento como **input de contexto** ao planejar uma feature nova. Releia o capítulo 1 (DNA) antes de escrever qualquer linha de CSS.

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
