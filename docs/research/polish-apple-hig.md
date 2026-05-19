# Polish Apple HIG — manual de ultra-premium para Atlas AI

> Research: 2026-05-15 · Target surface: `apps/desktop/src/surfaces/atlas-ai/atlas-ai.css`
> Audience: alguém que vai polir uma tela slate teal `#1d2b34` + atlas gold `#d4a85a` em dark mode até bater 9+/10 em design polish.
> Cutoff visual: hoje a surface parece "GPT 2022 / Tailwind admin" (pílulas amarelas em código inline, headers caps amarelos alarmantes, action buttons gold pesados). Meta: editorial dark "Apple Press / Books / Music dark" feeling.

---

## 0. Resumo executivo

**Princípio mestre Apple aplicado a Atlas:** *"Materials e tipografia carregam a hierarquia. Cor é tempero, nunca o prato."*

A diferença entre uma surface admin amadora e uma surface Apple-grade não é mais escala, mais animação, ou mais cor. É exatamente o oposto: **cor mais contida, monocroma com 90% de neutros, accent gold reservado apenas para 1-2 elementos focais por tela**. Apple usa peso tipográfico, hairlines, materials translúcidos (Liquid Glass desde macOS Tahoe 26, setembro 2025) e easing curves spring-like para construir hierarquia — não saturação. Em dark mode especificamente, **accent colors são tonalizados, nunca saturados** (semantic color tokens em vez de fixos); inline code não vira pílula colorida, vira *texto monospace levemente entintado* (sem fundo, ou com fundo brand-neutral 4-8% alpha); section headers em editorial caps são CINZA descansado (#EBEBF5 alpha 0.4-0.6), nunca o accent da brand. Apple Books / Notes / Mail provam isso: nenhum desses apps usa "pílula yellow" em filename — usam a própria SF Mono em um inline-fill quase invisível.

Adoção para Atlas: aplicar os 10 capítulos abaixo move o sistema de "Bootstrap admin com tema dark" para "Apple Press dark editorial" sem mexer no DNA Don Corleone — porque silent luxury, no fim, é exatamente isto: **subtração agressiva de cor e ruído**, peso transferido para tipografia, material e geometria.

---

## 1. Type system — fonte, peso, escala

Apple usa hoje 3 famílias canônicas (todas próprias):

| Família | Uso | Tipo |
|---|---|---|
| **SF Pro** (Display / Text) | UI sans-serif. Display ≥ 20pt, Text ≤ 19pt. 9 weights. Em iOS 26 / macOS Tahoe (jun 2025), a SF Pro ganhou variable scaling para Lock Screen e contextos editoriais. | sans variable |
| **SF Mono** | Inline code, terminal, Xcode default. Single-style "monostyled" em Apple Notes desde iOS 17 (cmd-shift-M aplica fundo levemente entintado, *sem* destaque de sintaxe). | mono |
| **New York** | Editorial / reader: Safari Reader, Apple Books, App Store editorial. Transitional serif, 4 optical sizes × 6 weights. Pareada deliberadamente com SF Pro (mesmas proporções, espírito literário). | serif optical |

**Escala SF Pro canônica (Apple HIG iOS — pontos = base 16, line-height aproximada, tracking em px):**

| Style | Size | Weight | Tracking | Line | Uso |
|---|---|---|---|---|---|
| Large Title | 34 | Bold | -1.05 / 1.1 % | 41 | Hero / screen title |
| Title 1 | 28 | Bold | -0.80 | 34 | Section title |
| Title 2 | 22 | Bold | -0.70 | 28 | Modal header |
| Title 3 | 20 | Semibold | -0.60 | 25 | List group header |
| Headline | 17 | Semibold | -0.43 | 22 | Body emphasized |
| Body | 17 | Regular | -0.43 | 22 | Main reading |
| Callout | 16 | Regular | -0.32 | 20 | Secondary descrição |
| Subhead | 15 | Regular | 0 | 19 | Form label |
| Footnote | 13 | Regular | +0.03 | 16 | Metadata / timestamp |
| Caption 1 | 12 | Regular | +0.12 | 15 | Captions, UI hints |
| Caption 2 | 11 | Regular | +0.15 | 14 | Microcopy |

**Regras de ouro Apple:**

1. **Tracking é negativo nos grandes, zero no meio, positivo nos pequenos.** Quanto maior o tipo, mais apertado; quanto menor, mais arejado. É exatamente o oposto do que admins Bootstrap fazem.
2. **Hierarquia vem do PESO, não do SIZE.** Apple aumenta para semibold antes de aumentar pt. "iOS doesn't style font sizes the way you might naively expect — rather than enlarging titles, Apple uses heavier font weights and strategic placement."
3. **WWDC 2025: "left-aligned para improve readability in critical moments"** — abandone center-align em conteúdo denso.

### ANTES (amador) vs DEPOIS (premium) — Type

**ANTES (Bootstrap admin tropes):**
- Tudo em 14px regular, hierarquia via uppercase yellow.
- Section headers `text-transform: uppercase` + `color: gold`.
- Letter-spacing positivo em todos os tamanhos.
- Inter para body + Inter para "código" também (sem mono real).

**DEPOIS (Apple editorial dark):**
- Body 14.5-17px @ 1.55-1.62 lh, weight 440 (não 400).
- Section headers em **title case ink-strong**, gold reservado para *primary action única*.
- Tracking: -0.012em em h2/h3, 0 em body, +0.06em só em caps reais (mas caps usadas com parcimônia).
- Inter Variable para UI, **JetBrains Mono / SF Mono para código**.

**Recipe — Type system base:**

```css
/* Atlas AI · Apple-grade type stack */
.atlas-shell.surface-atlas_ai {
  /* font stacks */
  --cc-font-sans:
    'Inter Variable', 'SF Pro Text', -apple-system, BlinkMacSystemFont,
    'Helvetica Neue', sans-serif;
  --cc-font-mono:
    'JetBrains Mono', 'SF Mono', 'Menlo', 'Consolas',
    ui-monospace, monospace;
  --cc-font-serif:
    'New York', 'Cormorant Garamond', 'Iowan Old Style',
    'Apple Garamond', Georgia, serif;

  /* Apple-aligned scale (px, dark UI 14h-friendly) */
  --cc-text-large-title: 26px;     /* hero only */
  --cc-text-title-1:     20px;     /* h1 of body */
  --cc-text-title-2:     17px;     /* h2 of body */
  --cc-text-title-3:     15px;     /* h3 of body — title-case ink, NÃO uppercase gold */
  --cc-text-headline:    14.5px;   /* emphasized body */
  --cc-text-body:        14.5px;   /* reading */
  --cc-text-callout:     14px;     /* secondary */
  --cc-text-subhead:     13.5px;   /* form labels */
  --cc-text-footnote:    12.5px;   /* metadata */
  --cc-text-caption:     11.5px;   /* eyebrow / chip text */

  /* weight tokens (variable) */
  --cc-wght-regular: 440;
  --cc-wght-medium:  520;
  --cc-wght-semi:    600;
  --cc-wght-bold:    660;

  /* tracking — negativo nos grandes, positivo nos pequenos */
  --cc-track-display:  -0.014em;
  --cc-track-title:    -0.008em;
  --cc-track-body:      0;
  --cc-track-footnote: +0.012em;
  --cc-track-caption:  +0.025em;
  --cc-track-eyebrow:  +0.08em;   /* só para CAPS reais (raros) */

  /* leading */
  --cc-lh-tight:   1.22;   /* title */
  --cc-lh-snug:    1.35;   /* h3 / headline */
  --cc-lh-body:    1.55;   /* body */
  --cc-lh-relaxed: 1.7;    /* long-form lists */
}
```

---

## 2. Color discipline — dark mode Apple

**Princípio Apple HIG:** *"Use desaturated colors across the board. If you need a color to stand out, go for a LIGHTER (but still desaturated) shade — never up the saturation."* Em dark mode, Apple opera com **semantic tokens** (label, secondaryLabel, tertiaryLabel, quaternaryLabel) que carregam *papel*, não *valor* — o token muda de hex automaticamente entre temas.

**Apple semantic colors — valores Dark Mode exatos (iOS 13+):**

| Token | Light | Dark | Função |
|---|---|---|---|
| `label` | `#000000` | `#FFFFFF` | Primary text |
| `secondaryLabel` | `#3C3C43 / 0.6` | `#EBEBF5 / 0.6` | Caption, less-important |
| `tertiaryLabel` | `#3C3C43 / 0.3` | `#EBEBF5 / 0.3` | Placeholder, disabled-ish |
| `quaternaryLabel` | `#3C3C43 / 0.18` | `#EBEBF5 / 0.18` | Decorative hint |
| `systemBackground` | `#FFFFFF` | `#000000` | Root canvas |
| `secondarySystemBackground` | `#F2F2F7` | `#1C1C1E` | Card / surface 1 |
| `tertiarySystemBackground` | `#FFFFFF` | `#2C2C2E` | Card / surface 2 |
| `separator` | `#3C3C43 / 0.29` | `#545458 / 0.6` | Hairline divider |
| `opaqueSeparator` | `#C6C6C8` | `#38383A` | Opaque divider |

**Observação:** Apple usa **branco-azulado `#EBEBF5`** (não `#FFFFFF`) como base de texto em dark — leve viés cool que evita o "white burn" puro.

### Atlas tradução — Slate teal `#1d2b34` com tokens semantic

```css
.atlas-shell.surface-atlas_ai {
  /* Apple semantic tokens em dark mode, tradução Atlas slate teal */

  /* Texto — base cool cream (#EBEBF5 spirit, ajustado para atlas teal) */
  --cc-text:         rgba(235, 235, 245, 0.92);   /* primary (~secondaryLabel light side) */
  --cc-text-strong:  rgba(245, 245, 250, 0.98);   /* label primary — só pra h1/h2 e emphasis */
  --cc-text-muted:   rgba(235, 235, 245, 0.62);   /* secondaryLabel */
  --cc-text-faint:   rgba(235, 235, 245, 0.38);   /* tertiaryLabel — caption/meta */
  --cc-text-ghost:   rgba(235, 235, 245, 0.20);   /* quaternaryLabel — decoration */

  /* Surface ladder — 4 níveis, NUNCA puro black */
  --cc-bg:           #1d2b34;                      /* root canvas (slate teal canon) */
  --cc-surface:      #21303a;                      /* secondary — card flutuante */
  --cc-surface-2:    #263641;                      /* tertiary — nested card */
  --cc-surface-sunk: #18242d;                      /* below — composer footer, sunk panels */

  /* Hairlines — sempre alpha, nunca opaco em dark */
  --cc-border-soft:  rgba(235, 235, 245, 0.08);    /* default */
  --cc-border:       rgba(235, 235, 245, 0.14);    /* emphasized */
  --cc-border-strong:rgba(235, 235, 245, 0.22);    /* focus / active */

  /* Accent gold — TONALIZADO, não saturado.
     Reservado para 1 elemento focal por tela máxima. */
  --cc-accent:        #d4a85a;                     /* canon */
  --cc-accent-strong: #e6bd72;                     /* hover / emphasis (mais claro, NÃO mais saturado) */
  --cc-accent-soft:   rgba(212, 168, 90, 0.65);    /* secondary use */
  --cc-accent-veil:   rgba(212, 168, 90, 0.06);    /* fill subtilíssimo — chip, current state */
  --cc-accent-border: rgba(212, 168, 90, 0.22);    /* border de accent surfaces */

  /* Status — desaturado, Apple-style.
     Nunca vermelho puro #F00, nunca verde puro #0F0. */
  --cc-info:    #7fa7c4;       /* azul aço dessaturado */
  --cc-success: #8aa888;       /* verde sálvia */
  --cc-warn:    #c8a665;       /* âmbar — quase indistinguível do accent, intencional */
  --cc-danger:  #b87766;       /* terracota — não red */
}
```

**Regra ouro:** Em qualquer tela Atlas, **conte** os elementos amarelos. Se >3, está saturada demais. Apple Music dark tem exatamente 1-2 cor accent visíveis por tela (a album art ocupa o pop visual; UI fica neutra).

---

## 3. Materials & depth

Apple lançou **Liquid Glass** em jun 2025 (WWDC25) como o novo material universal — translúcido, refrata o que está atrás, com specular highlights. Tecnicamente são GPU-blurs Gaussianos + saturate. Em macOS Tahoe (set 2025), sidebars e toolbars passaram a usar Liquid Glass por default.

**Os 4 materials nativos Apple (NSVisualEffectView / SwiftUI):**

| Material | Uso | CSS equivalente (aproximado) |
|---|---|---|
| `.ultraThinMaterial` | Sticky bars sobre conteúdo — sutilíssimo | `backdrop-filter: blur(8px) saturate(120%); bg: rgba(29,43,52,0.55)` |
| `.thinMaterial` | Sidebar, toolbar | `blur(16px) saturate(140%); bg: rgba(29,43,52,0.70)` |
| `.regularMaterial` | Modais, sheet, default panels | `blur(24px) saturate(160%); bg: rgba(29,43,52,0.82)` |
| `.thickMaterial` | Alert dialogs, blocking | `blur(32px) saturate(180%); bg: rgba(29,43,52,0.92)` |

**Regras Apple para Liquid Glass (WWDC25 — "Get to know the new design system"):**

1. **Aplicar APENAS no navigation layer flutuante.** Nunca em content layers, full-screen backgrounds ou scrollable content.
2. **Nunca empilhar glass em glass** — agrupar via `GlassEffectContainer` (CSS equivalent: usar mesmo blur stack para toda barra, não cada filho).
3. **Vibrancy "cuts through the blur"** — texto/ícones sobre material precisam de `mix-blend-mode: plus-lighter` ou similar para ter o "cut" característico.
4. **Scroll Edge Effects** substituem hard dividers: blur fade no topo/bottom do scroll, não linha sólida.

### Shadows Apple dark mode

Em dark mode Apple usa **inset highlights** mais do que drop shadows externos. A profundidade vem do gradiente sutil do top (lighter) → bottom (darker) + um inset hairline branco-alpha de 1px no topo.

```css
/* Apple-style dark card depth */
.atlas-ai-card-premium {
  background:
    linear-gradient(180deg,
      rgba(255, 255, 255, 0.025) 0%,
      transparent 12%,
      transparent 100%
    ),
    var(--cc-surface);
  border: 1px solid var(--cc-border-soft);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),   /* highlight topo (vibrancy spec) */
    0 1px 2px rgba(0, 0, 0, 0.25),             /* contact shadow */
    0 8px 24px -8px rgba(0, 0, 0, 0.45);       /* float ambient */
}
```

### Recipe — Header bar com material thinMaterial-like

```css
/* WWDC25-style sticky toolbar com Liquid Glass spirit */
.atlas-ai-header-bar {
  /* sem cor sólida — o material é o background */
  background: rgba(29, 43, 52, 0.72);
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);

  /* hairline + inset highlight (não shadow externa) */
  border-bottom: 1px solid var(--cc-border-soft);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);

  /* zero outras cores. Toda a hierarquia vem do conteúdo dentro */
}

/* Composer footer — material thicker (input precisa contraste) */
.atlas-ai-composer-shell {
  background: rgba(24, 36, 45, 0.86);
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  border-top: 1px solid var(--cc-border-soft);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035);
}
```

### Scroll edge effect (substitui hairline dura)

```css
/* Substitui o `border-bottom` da header por blur fade — feel WWDC25 */
.atlas-ai-conversation {
  position: relative;
}
.atlas-ai-conversation::before {
  content: '';
  position: sticky;
  top: 0;
  height: 24px;
  background: linear-gradient(180deg,
    rgba(29, 43, 52, 0.92) 0%,
    rgba(29, 43, 52, 0) 100%);
  backdrop-filter: blur(8px);
  pointer-events: none;
  z-index: 5;
  margin-bottom: -24px;
}
```

---

## 4. Code / file path rendering — o crime central

**O problema:** hoje a Atlas renderiza `app/Services/Ai/Programming/ForgeRivals/` e `external_rivals_certification` como **pílulas amarelas com fundo `rgba(212,168,90,0.08)` + borda `rgba(212,168,90,0.18)`**. Isso é o gesto mais clichê de "Tailwind admin template" possível — Bootstrap default, GitHub light-mode 2014, Stack Overflow comment. Apple **nunca** faz isso.

**Como Apple renderiza inline code:**

- **Apple Notes (iOS 17+):** "Monostyled" — texto monospace, fundo de fill semantic `tertiarySystemBackground` (#2C2C2E em dark) com leve inset (4-6px lateral, 1-2px vertical). **Nenhum amarelo**. **Nenhuma borda**. Color do texto = label primary normal.
- **Xcode:** SF Mono na cor de syntax (variável: branco para identificadores em dark, sem fundo nenhum no inline). Background apenas em codeblocks completos.
- **Apple Developer Docs site:** `<code>` inline renderizado com `font-family: SF Mono`, `font-size: 0.93em`, `background: rgba(255,255,255,0.08)` (cinza neutro, **NÃO accent**), `padding: 0.1em 0.3em`, `border-radius: 4px`. Zero borda. Zero accent.

**Filename / path = NÃO é "code", é METADATA.** Apple renderia `app/Services/Ai/Programming/ForgeRivals/` como **texto SF Mono na cor `secondaryLabel`** (cinza alpha), sem fundo, possivelmente com underline `text-decoration` se for clicável. Olhe Finder, Xcode project navigator, ou Pages "Insert > Link to file" — paths são **cinza monospace nu**, nunca chips amarelos.

### ANTES (amador) vs DEPOIS (premium) — Inline code

**ANTES (atlas-ai.css atual, linha 2131):**
```css
.atlas-ai-md-code {
  font-family: var(--cc-font-mono);
  font-size: 12.5px;
  background: rgba(212, 168, 90, 0.08);    /* ← AMARELO */
  color: var(--cc-accent-strong);           /* ← AMARELO */
  padding: 1.5px 5px;
  border-radius: 3px;
  border: 1px solid rgba(212, 168, 90, 0.18); /* ← BORDA AMARELA */
}
```
Resultado: pílula yellow GitHub-2014. Grita "admin template".

**DEPOIS (Apple Notes / Pages spirit):**

```css
/* ===== Inline code · Apple Notes "monostyled" ===== */

/* Inline code GENÉRICO (palavra técnica solta) — fundo neutro brand, ZERO accent */
.atlas-ai-md-code {
  font-family: var(--cc-font-mono);
  font-size: 0.92em;                        /* relativo ao body — escala junto */
  font-variation-settings: 'wght' 480;      /* mono peso médio (SF Mono spirit) */
  background: rgba(235, 235, 245, 0.055);   /* fill neutro frio — NÃO accent */
  color: var(--cc-text);                    /* cor de texto normal, não gold */
  padding: 0.08em 0.34em;
  border-radius: 4px;
  border: none;                             /* Apple não usa borda em inline code */
  letter-spacing: 0;
  /* opcional: levíssimo inset para profundidade */
  box-shadow: inset 0 0 0 1px rgba(235, 235, 245, 0.03);
}

/* File path / identificadores qualificados — METADATA, não code.
   Renderizar como Finder: SF Mono cinza nu, sem fundo nenhum.
   Usa class explícita no markdown render: `<code class="is-path">...</code>`
   OU detect via regex (contém '/' ou '.' chain). */
.atlas-ai-md-code.is-path,
.atlas-ai-md-code.is-filename {
  background: transparent;
  color: var(--cc-text-muted);              /* secondaryLabel — cinza */
  padding: 0;
  box-shadow: none;
  font-size: 0.94em;
  font-variation-settings: 'wght' 460;
}

/* Hover SE for clicável (file open) — underline subtilíssimo, não cor */
.atlas-ai-md-code.is-path[role="button"]:hover,
.atlas-ai-md-code.is-filename[role="button"]:hover {
  color: var(--cc-text);
  text-decoration: underline;
  text-decoration-color: var(--cc-border);
  text-underline-offset: 3px;
  text-decoration-thickness: 1px;
}

/* Class identifier / type name (ex: `AtlasForgeRivalsActionDispatcher`) —
   monospace mas com leve emphasis no peso, sem fundo */
.atlas-ai-md-code.is-symbol {
  background: transparent;
  color: var(--cc-text-strong);
  font-variation-settings: 'wght' 520;
  padding: 0;
}
```

**Quando ainda OK usar leve accent:** se o termo é uma **flag explícita do usuário** que ele precisa copiar literal (ex: `--confirm-real`), aí sim um fill bem suave. Mas **um por bloco**, não todos os identificadores virando pílula.

```css
/* Reservado para flags / comandos copiáveis */
.atlas-ai-md-code.is-flag {
  background: var(--cc-accent-veil);
  color: var(--cc-accent-strong);
  border-radius: 4px;
  padding: 0.08em 0.4em;
}
```

---

## 5. Headers & sections — fim do uppercase gold alarmante

**O problema:** "4. GOVERNANCE — GATES E SPEC" rendendo em **uppercase gold** com letter-spacing positivo. Isso é a estética "dashboard de fintech 2018" — Stripe Atlas era assim em 2017, ninguém faz mais. Apple **nunca** usa caps amarelo para section header de body content. Caps amarelos = botão de **alerta**, e o cérebro lê assim involuntariamente.

**Como Apple faz section breaks em editorial:**

- **Apple Books reader:** Section title em **New York Semibold title-case**, mesmo tamanho do body + 4-6px, cor `label` primary (#EBEBF5 alpha 0.95). Acima/abaixo: hairline ou espaçamento. **Zero cor.**
- **Apple News editorial:** "Chapter" em SF Pro Display Semibold title-case + número em SF Pro Display Light separado por hairline vertical de 1px alpha 0.3. Cinza, não color.
- **Pages "Heading 2":** SF Pro Semibold 19pt title-case, `label primary`, espaçamento generoso. Zero fundo. Zero borda. Zero color.
- **Xcode "MARK: -":** comentário virou small caps cinza com hairline antes — `label tertiary`, sem cor.

### ANTES vs DEPOIS — Section heading

**ANTES:**
```css
.atlas-ai-section-eyebrow {
  font-size: 11px;
  font-weight: 620;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--cc-accent);   /* ← ALARME */
}
```

**DEPOIS (Apple Books / Pages spirit):**

```css
/* ===== Section headers · editorial Apple ===== */

/* H2 body · Title 2 spirit (17px, semibold, title-case, ink) */
.atlas-ai-md-h2 {
  margin: 28px 0 8px;
  font-family: var(--cc-font-sans);
  font-size: 17px;
  font-variation-settings: 'wght' 620;
  color: var(--cc-text-strong);
  letter-spacing: -0.012em;       /* Apple negative tracking */
  line-height: 1.25;
  /* zero text-transform, zero color accent */
}

/* H3 body · Title 3 / Subhead spirit. Title-case ink. */
.atlas-ai-md-h3 {
  margin: 22px 0 6px;
  font-family: var(--cc-font-sans);
  font-size: 14.5px;
  font-variation-settings: 'wght' 600;
  color: var(--cc-text-strong);
  letter-spacing: -0.005em;
  line-height: 1.35;
}

/* H4 body · Headline spirit. Mesmo size do body, peso a mais. */
.atlas-ai-md-h4 {
  margin: 18px 0 4px;
  font-family: var(--cc-font-sans);
  font-size: 14px;
  font-variation-settings: 'wght' 600;
  color: var(--cc-text);
  letter-spacing: -0.003em;
}

/* Numerais antes de section (ex: "4. Governance") — italic serif Apple Books */
.atlas-ai-md-h2 .section-number,
.atlas-ai-md-h3 .section-number {
  font-family: var(--cc-font-serif);
  font-style: italic;
  font-variation-settings: 'wght' 460;
  color: var(--cc-text-muted);
  margin-right: 0.45em;
  /* SUTIL — nunca o accent */
}

/* Se PRECISAR de eyebrow caps (categoria acima do título, raro) —
   usar cinza tertiaryLabel, NÃO accent. SF Pro caption peso médio. */
.atlas-ai-eyebrow {
  font-family: var(--cc-font-sans);
  font-size: 10.5px;
  font-variation-settings: 'wght' 540;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--cc-text-faint);    /* tertiary cinza — nunca gold */
  margin-bottom: 4px;
}
```

**Para o caso específico "4. GOVERNANCE — GATES E SPEC" da screenshot:**

Render no markdown render como:
```html
<h3 class="atlas-ai-md-h3">
  <span class="section-number">4.</span>
  Governance · gates e spec
</h3>
```

Resultado visual: "*4.* Governance · gates e spec" — italic serif cinza no número + sans semibold ink-strong no título + zero cor + zero caps. Lê como página de livro Apple, não como alerta dashboard.

---

## 6. Action buttons — "arquivar" sem virar Red Alert

**O problema atual:** "promover →" e "arquivar" rendendo **gold** no canto superior direito da mensagem. Gold = primary CTA na linguagem Atlas; arquivar é **destrutivo-secundário**, não primary. Aplicar gold em ambos confunde a hierarquia.

**Como Apple resolve hierarquia de ações:**

Apple HIG canon (3 níveis):

| Nível | Como Apple renderiza | Cor |
|---|---|---|
| **Primary** | Filled button (background sólido accent ou tinted) | accent color |
| **Secondary** | Plain button (texto + leve underline/border on hover) | label primary |
| **Destructive** | Plain button, mas vermelho dessaturado (#FF453A em iOS) | systemRed |
| **Tertiary / metadata** | Texto pequeno, secondaryLabel cinza | cinza |

E em macOS Tahoe (WWDC25): "**Remove customizations — eliminate extra backgrounds or borders added to buttons. Express hierarchy through layout and grouping, not decoration.**"

### ANTES vs DEPOIS — Action buttons

**ANTES:** `promover →` e `arquivar` ambos em gold = ambiguidade.

**DEPOIS (Apple plain button spirit):**

```css
/* ===== Message actions · Apple plain button ===== */

.atlas-ai-message-action {
  background: transparent;
  border: none;
  padding: 4px 8px;
  border-radius: 5px;
  font-family: var(--cc-font-sans);
  font-size: 12.5px;
  font-variation-settings: 'wght' 480;
  color: var(--cc-text-muted);              /* secondaryLabel — cinza */
  letter-spacing: 0;
  cursor: pointer;
  transition:
    color 200ms var(--cc-ease-out),
    background 200ms var(--cc-ease-out);
}

.atlas-ai-message-action:hover {
  color: var(--cc-text-strong);
  background: rgba(235, 235, 245, 0.05);    /* fill cinza-neutro on hover */
}

/* Primary action ("promover") — único permitido em gold, e mesmo assim discreto */
.atlas-ai-message-action.is-primary {
  color: var(--cc-accent);
  font-variation-settings: 'wght' 540;
}
.atlas-ai-message-action.is-primary:hover {
  color: var(--cc-accent-strong);
  background: var(--cc-accent-veil);
}

/* Destructive ("arquivar", "deletar") — terracota dessaturada, NÃO red puro */
.atlas-ai-message-action.is-destructive:hover {
  color: var(--cc-danger);
  background: rgba(184, 119, 102, 0.08);
}

/* Default (icon-only feedback: copy, thumbs up/down) — quase invisível.
   Apple HIG: "give way to content" — controles desaparecem até hover. */
.atlas-ai-message-action.is-icon-only {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  color: var(--cc-text-faint);
  opacity: 0.7;
}
.atlas-ai-message:hover .atlas-ai-message-action.is-icon-only {
  opacity: 1;
}
.atlas-ai-message-action.is-icon-only:hover {
  color: var(--cc-text);
  background: rgba(235, 235, 245, 0.06);
}
```

**Regra TDAH-friendly:** uma mensagem deve ter **no máximo 1 ação primária visível**. Tudo o mais é icon-only ou secondary cinza. Olhe Apple Mail v2025: cada mensagem tem 1 botão tinted ("Reply") e o resto é icon-only cinza no toolbar.

---

## 7. Pills / chips — quando SIM, quando NÃO

**Regra de ouro (H Locke / industry consensus):** *"Buttons do something, links go somewhere. Pills are distinct because they do neither — they affect the state of the data shown on screen."*

**Apple usa pills SÓ para:**
1. Filtros aplicados (chip removível com `×`).
2. Tag/category selectors em segmented controls.
3. Status badges (claim, completion %, count).
4. Multi-select em onboarding.

**Apple NÃO usa pills para:**
- Code inline, filename, path → texto monospace nu.
- Section headers → tipografia.
- Action buttons → plain button.
- Identificadores técnicos → texto monospace cinza.
- Metadata em headers → texto pequeno cinza.

### Recipe — Chip Apple-grade (quando justificado)

```css
/* ===== Chip · Apple segmented / filter spirit ===== */

.atlas-ai-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  padding: 0 10px;
  border-radius: 12px;             /* capsule shape (Apple WWDC25 concentricity) */
  background: rgba(235, 235, 245, 0.06);
  border: 1px solid transparent;   /* sem hairline default */
  color: var(--cc-text-muted);
  font-family: var(--cc-font-sans);
  font-size: 12px;
  font-variation-settings: 'wght' 500;
  letter-spacing: 0;
  cursor: pointer;
  transition: all 200ms var(--cc-ease-out);
}

.atlas-ai-chip:hover {
  background: rgba(235, 235, 245, 0.10);
  color: var(--cc-text);
}

/* Selected — accent tinted, NÃO accent saturado */
.atlas-ai-chip.is-selected {
  background: var(--cc-accent-veil);
  border-color: var(--cc-accent-border);
  color: var(--cc-accent-strong);
}

/* Removable chip (filtro aplicado) */
.atlas-ai-chip.is-removable::after {
  content: '×';
  margin-left: 4px;
  color: var(--cc-text-faint);
  font-size: 14px;
  line-height: 1;
}
```

---

## 8. Tables — Apple Books / App Store editorial

**Como Apple renderiza tabelas:**

- **App Store comparison tables:** SF Pro 13pt body, divisores `separator` cinza-alpha (#EBEBF5 ~0.1), **zero zebra-striping** (zebra é admin template), header row em peso semibold com leve hairline embaixo. Cell padding generoso (~12-16px vertical).
- **Apple Books "compare editions":** First column = label peso semibold ink, demais = body regular. Linhas separadas por hairline alpha 0.08. Cell vertical alignment top.
- **Numbers / Pages:** Header em fill `secondarySystemBackground` (cinza levíssimo), corpo transparente, hairlines minimais.

**Regras Apple para tables em surface dark:**
1. **Sem zebra.** Hairline cinza entre rows é suficiente.
2. **Sem accent na header.** Header é semibold ink + hairline embaixo, não gold + caps.
3. **Padding vertical generoso** (10-14px). Aperto = admin Bootstrap.
4. **First column = identifier** em peso semibold; demais = regular.

### Recipe — Table Apple Books style

```css
/* ===== Table · Apple Books / App Store editorial ===== */

.atlas-ai-md-table {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
  font-family: var(--cc-font-sans);
  font-size: 13.5px;
  /* SEM border externa — tabelas Apple não têm "caixa" */
}

.atlas-ai-md-table thead th {
  text-align: left;
  font-variation-settings: 'wght' 600;
  color: var(--cc-text);
  padding: 10px 16px 10px 0;
  border-bottom: 1px solid var(--cc-border);  /* hairline única semibold */
  letter-spacing: 0;
  /* SEM uppercase. SEM accent. SEM background. */
}

.atlas-ai-md-table tbody td {
  padding: 12px 16px 12px 0;
  color: var(--cc-text);
  border-bottom: 1px solid var(--cc-border-soft);  /* hairline alpha 0.08 */
  vertical-align: top;
}

/* Primeira coluna · identifier, peso a mais (Apple Numbers) */
.atlas-ai-md-table tbody td:first-child {
  font-variation-settings: 'wght' 520;
  color: var(--cc-text-strong);
  padding-right: 24px;
}

/* Last row · sem hairline (cleaner edge) */
.atlas-ai-md-table tbody tr:last-child td {
  border-bottom: none;
}

/* Inline code DENTRO de table cell — herda o discipline geral */
.atlas-ai-md-table code {
  /* já herda .atlas-ai-md-code — Apple Notes spirit */
  font-size: 0.9em;
}
```

---

## 9. Motion — micro-interactions Apple-grade

**Apple animation principles (WWDC23 "Animate with springs", iOS 26 Liquid Glass):**

1. **Springs > eases** em interações de UI moderna. Apple migrou progressivamente de cubic-bezier para spring-based em iOS 17+.
2. **Continuous position e velocity** — animações que interrompem outras devem partir do estado atual, não da posição final.
3. **Reduce motion respect** — `prefers-reduced-motion: reduce` cancela springs e elastic, mantém opacity transitions.

**Cubic-bezier values canônicos Apple (CSS equivalents):**

| Apple curve | Cubic-bezier | Uso |
|---|---|---|
| `easeInOut` (UIKit padrão) | `cubic-bezier(0.42, 0, 0.58, 1.0)` | Default UI movement |
| `easeOut` | `cubic-bezier(0, 0, 0.58, 1.0)` | Enter / appear |
| `easeIn` | `cubic-bezier(0.42, 0, 1, 1)` | Exit / disappear |
| iOS default timing | `cubic-bezier(0.25, 0.1, 0.25, 1.0)` | Generic UI |
| iOS spring approx | `cubic-bezier(0.5, 0.15, 0.45, 0.94)` | Sheet, drawer |
| Material standard (Google, evitar) | `cubic-bezier(0.4, 0, 0.2, 1)` | **NÃO Apple — não usar** |

**Durations canônicas Apple:**

- Micro feedback (hover, tap): **150-200ms**.
- Standard transitions (modal, sheet): **300-350ms**.
- Hero / page transitions: **400-450ms**.
- Spring overshoot bounce: **600-800ms total** (com damping).

### Recipe — Motion tokens + applied transitions

```css
/* ===== Motion tokens · Apple curves ===== */

.atlas-shell.surface-atlas_ai {
  --cc-ease-out:        cubic-bezier(0, 0, 0.58, 1.0);
  --cc-ease-in-out:     cubic-bezier(0.42, 0, 0.58, 1.0);
  --cc-ease-default:    cubic-bezier(0.25, 0.1, 0.25, 1.0);
  --cc-ease-spring:     cubic-bezier(0.5, 0.15, 0.45, 0.94);
  --cc-ease-emphasized: cubic-bezier(0.32, 0.72, 0, 1);      /* iOS sheet feel */

  --cc-dur-micro:  160ms;
  --cc-dur-short:  220ms;
  --cc-dur-medium: 340ms;
  --cc-dur-long:   420ms;
}

/* Hover/focus base transition — sempre micro + ease-out */
.atlas-ai-message-action,
.atlas-ai-chip,
.atlas-ai-md-link {
  transition:
    color var(--cc-dur-micro) var(--cc-ease-out),
    background-color var(--cc-dur-micro) var(--cc-ease-out),
    border-color var(--cc-dur-micro) var(--cc-ease-out);
}

/* Card hover lift — discreto, Apple WWDC25 "give way to content" */
.atlas-ai-card-premium {
  transition:
    transform var(--cc-dur-short) var(--cc-ease-out),
    box-shadow var(--cc-dur-short) var(--cc-ease-out);
}
.atlas-ai-card-premium:hover {
  transform: translateY(-1px);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 2px 4px rgba(0, 0, 0, 0.3),
    0 16px 32px -12px rgba(0, 0, 0, 0.5);
}

/* Modal / sheet enter — emphasized curve, longer duration */
.atlas-ai-modal-enter {
  animation: atlasModalEnter var(--cc-dur-medium) var(--cc-ease-emphasized);
}
@keyframes atlasModalEnter {
  from { opacity: 0; transform: translateY(8px) scale(0.99); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* Streaming dots — gentle pulse, NÃO bouncy */
@keyframes atlasStreamPulse {
  0%, 100% { opacity: 0.3; }
  50%      { opacity: 0.9; }
}
.atlas-ai-streaming-dot {
  animation: atlasStreamPulse 1400ms var(--cc-ease-in-out) infinite;
}
.atlas-ai-streaming-dot:nth-child(2) { animation-delay: 160ms; }
.atlas-ai-streaming-dot:nth-child(3) { animation-delay: 320ms; }

/* Reduce motion respect */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 10. Hairlines, dividers e separators

**O detalhe que mais delata "Bootstrap admin" é a **borda dura `1px solid #333`** em todo lugar. Apple usa **hairlines alpha** que adaptam ao fundo:

```css
/* Hairlines Apple-grade — sempre alpha, nunca opaco */
--cc-border-soft:    rgba(235, 235, 245, 0.08);   /* default — quase invisível */
--cc-border:         rgba(235, 235, 245, 0.14);   /* standard separator */
--cc-border-strong:  rgba(235, 235, 245, 0.22);   /* emphasized (focus, active) */

/* Divider editorial — hairline + diamond Atlas canon */
.atlas-ai-divider-editorial {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 32px 0;
  color: var(--cc-text-faint);
}
.atlas-ai-divider-editorial::before,
.atlas-ai-divider-editorial::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg,
    transparent 0%,
    var(--cc-border-soft) 20%,
    var(--cc-border-soft) 80%,
    transparent 100%);   /* fade nas pontas — Apple Books spirit */
}
.atlas-ai-divider-editorial-diamond {
  color: var(--cc-accent);
  font-size: 10px;
  opacity: 0.7;
}
```

---

## 11. Composer / input field

O input é onde Apple investe pesado em **inset shadows + material**. O composer atual (rodapé) provavelmente está borda dura — vamos torná-lo Liquid Glass + inset highlight:

```css
.atlas-ai-composer-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.025);   /* leve "lift" do sunk surface */
  border: 1px solid var(--cc-border-soft);
  border-radius: 10px;
  padding: 12px 14px;
  font-family: var(--cc-font-sans);
  font-size: 14.5px;
  line-height: 1.55;
  color: var(--cc-text);
  caret-color: var(--cc-accent);
  resize: none;

  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),  /* inset highlight topo */
    0 1px 0 rgba(0, 0, 0, 0.15);              /* contact shadow muito sutil */

  transition:
    border-color var(--cc-dur-short) var(--cc-ease-out),
    box-shadow var(--cc-dur-short) var(--cc-ease-out),
    background var(--cc-dur-short) var(--cc-ease-out);
}

.atlas-ai-composer-input::placeholder {
  color: var(--cc-text-faint);
  font-style: normal;        /* italic placeholder é tropo amador, evitar */
}

.atlas-ai-composer-input:focus {
  outline: none;
  background: rgba(255, 255, 255, 0.04);
  border-color: var(--cc-border);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 0 0 3px rgba(212, 168, 90, 0.15);   /* focus ring tinted, NÃO sólido */
}
```

---

## 12. Checklist de "amador → premium" (passo a passo)

**Triagem em ordem de prioridade visual:**

1. **REMOVER** todo `text-transform: uppercase` em headers de body. Manter caps SÓ em true eyebrow labels (e mesmo assim em cinza tertiaryLabel, não accent).
2. **REMOVER** fundo gold e borda gold de `.atlas-ai-md-code` inline. Substituir por fill neutro `rgba(235,235,245,0.055)` sem borda.
3. **REMOVER** cor gold em ações secundárias ("arquivar", "fechar", "compartilhar"). Substituir por `--cc-text-muted` + hover sutil.
4. **CONTAR** elementos gold por viewport. Meta: ≤2 por tela visível. Se mais, refatorar.
5. **APLICAR** `backdrop-filter: blur(16-24px) saturate(140-160%)` em sticky bars (header, composer footer) e remover fundos sólidos.
6. **APLICAR** `inset 0 1px 0 rgba(255,255,255,0.04)` como highlight topo em cards e surfaces flutuantes — substitui shadow externa.
7. **TROCAR** hairlines opacas (`#333`, `#444`) por alpha (`rgba(235,235,245,0.08)`).
8. **AJUSTAR** tracking: -0.012em em h2/h3, 0 em body, +0.025em só em caption pequena.
9. **MIGRAR** action button styling: plain default → tinted on hover, accent reservado para 1 primary por view.
10. **MIGRAR** tables: zerar zebra, manter hairlines alpha + header semibold ink (não accent).

---

## Fontes consultadas

### Apple oficial / WWDC

- [Apple Developer · Typography (HIG)](https://developer.apple.com/design/human-interface-guidelines/typography)
- [Apple Developer · Dark Mode (HIG)](https://developer.apple.com/design/human-interface-guidelines/dark-mode)
- [Apple Developer · Materials (HIG)](https://developer.apple.com/design/human-interface-guidelines/materials)
- [Apple Newsroom · "A delightful and elegant new software design" (Liquid Glass, jun 2025)](https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/)
- [Apple Developer · WWDC25 "Get to know the new design system"](https://developer.apple.com/videos/play/wwdc2025/356/)
- [Apple Developer · UICubicTimingParameters](https://developer.apple.com/documentation/uikit/uicubictimingparameters)
- [Apple Developer · WWDC23 "Animate with springs"](https://developer.apple.com/videos/play/wwdc2023/10158/)
- [Apple Fonts](https://developer.apple.com/fonts/)
- [Apple Developer · NSVisualEffectView](https://developer.apple.com/documentation/appkit/nsvisualeffectview)

### Especificação técnica + reverse-engineering

- [Sarunw · Dark color cheat sheet (semantic colors hex)](https://sarunw.com/posts/dark-color-cheat-sheet/)
- [eonist gist · Apple HIG Typography (escala completa SF Pro)](https://gist.github.com/eonist/b9c180a67980c6e18a5184f19bff68fa)
- [LearnUI · iOS 17 font size & typography guidelines](https://www.learnui.design/blog/ios-font-size-guidelines.html)
- [Wikipedia · New York (2019 typeface)](https://en.wikipedia.org/wiki/New_York_(2019_typeface))
- [MDN · backdrop-filter](https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter)
- [Wikipedia · Liquid Glass](https://en.wikipedia.org/wiki/Liquid_Glass)
- [DEV · Liquid Glass best practices iOS 26 / macOS Tahoe](https://dev.to/diskcleankit/liquid-glass-in-swift-official-best-practices-for-ios-26-macos-tahoe-1coo)
- [Medium · "What does Apple's Liquid Glass design promise?"](https://medium.com/design-bootcamp/what-does-apples-liquid-glass-design-promise-16787f50da49)

### Editorial / referência indireta

- [H Locke · "The problem with pills"](https://hlockeux.substack.com/p/the-problem-with-pills-25-01-17)
- [Linear · "How we redesigned the Linear UI (part II)"](https://linear.app/now/how-we-redesigned-the-linear-ui)
- [Chyshkala · "Why Linear design systems break in dark mode"](https://chyshkala.com/blog/why-linear-design-systems-break-in-dark-mode-and-how-to-fix-them)
- [animations.dev · The Easing Blueprint](https://animations.dev/learn/animation-theory/the-easing-blueprint)

### [unconfirmed]

- Apple Notes "Monostyled" exato hex de fundo em dark mode — referência via copyprogramming.com bloqueado por 403; valor recomendado (`rgba(235,235,245,0.055)`) é minha tradução para slate teal de baixa saturação consistente com `tertiarySystemBackground` alpha.
- Apple Books New York optical-size threshold exato (Text → Display switching point) — fontes citam 4 optical sizes mas não publicam o ponto exato de troca; assumir 17pt como threshold conservador.
- Spring damping/stiffness Apple defaults (`UISpringTimingParameters` default mass=1, stiffness=100, damping=10) não confirmados em fonte primária; valores comumente citados em documentação third-party.
