# Polish Manual · Linear vs Mercury vs Stripe vs Vercel · Atlas Desktop AI

> **Scope**: enterprise dark — aplicável APENAS a `.atlas-shell.surface-code` (slate teal `#1d2b34` + atlas gold `#d4a85a`). NÃO se aplica a Cartografia cream (canon Don Corleone permanece intocado — capítulos 1 e 2 do design system canon).
>
> **Mission**: superar polimento de Linear / Mercury / Stripe / Vercel em dark enterprise SaaS, sem trair o DNA "Don Corleone silent luxury, peso decrescente, TDAH-friendly".
>
> **Source authority**: pesquisa via WebSearch + WebFetch · maio 2026. Citações marcadas `[fonte]`. Onde valores foram inferidos por leitura indireta, marca `[unconfirmed]`.
>
> **Author**: design researcher agent · 2026-05-15.
> **Predecessor**: `0007-atlas-desktop-design-system.md` capítulo 16 (Codex Slate Premium v1).

---

## 0 · TL;DR · O Que Atlas Code Tem Hoje vs O Que Falta

| Aspecto | Atlas Code hoje | Linear / Mercury / Stripe / Vercel | Gap |
|---|---|---|---|
| Tipografia | Inter/system genérico | Inter Display + Inter (Linear), Arcadia custom (Mercury), Geist Sans (Vercel), SF Pro (Stripe) | Falta **typeface protagonista** com `-feature-settings` afinado |
| Chips status | Yellow genérico dot+text | Badges filled com bg+border+text contrastes 3-token | Ainda parece Bootstrap admin |
| Tabelas | Sem layout dedicado | Headers Mono caps + rows 32-36px + hover bg subtle | Falta densidade editorial + caps eyebrow |
| Action buttons | Pink alarmista | Primary fill + secondary outline + destructive contained | Falta hierarquia visual + destructive sóbrio |
| Section headers | Sans regular sem peso | Mono caps + letter-spacing positive + tiny | Falta eyebrow tipográfico canon |
| Code inline | Sem tratamento | Mono + bg subtle + border-radius mínimo + padding 2px 4px | Identifiers visualmente equivalentes a body text |
| Spacing | Heurístico | Scale rígida (4/8/12/16/24/32 ou xs/sm/md/lg/xl) | Inconsistência visual entre painéis |
| Border radius | Mistura 4/6/8 | Linear: 2/4/6/9999 disciplinado por componente | Falta semântica de radius |
| Shadows | Genéricas | Inset hairlines + drop subtle + glow accent deliberado | Sem hierarquia de profundidade |

---

## 1 · Comparative Matrix · Dimensão por Dimensão

### 1.1 · Typography Stack

| Atom | Linear | Mercury | Stripe | Vercel/Geist | Notion Calendar |
|---|---|---|---|---|---|
| **Display** | Inter Display, weights 510/590, `-0.22px` letter-spacing | ArcadiaDisplay 480 (variable, non-standard increment), `45/50` size/lh | SF Pro Display [unconfirmed] | Geist Sans 700-900, `-2.125px ls` em display | NotionInter (Inter fork), 64px/1.0 lh, `-2.125px ls` |
| **Body** | Inter, weights 400/510, `-0.11px ls` | Arcadia, line-height **1.625** (generoso pra dark), `rgb(237,237,243)` text | SF Pro Text [unconfirmed] | Geist Sans 400-510, line-height base 1.5 | NotionInter, 14-16px |
| **Mono / code** | Berkeley Mono ou similar [unconfirmed] | Sem dedicated mono visível | Source Code Pro / SF Mono [unconfirmed] | **Geist Mono** (mesmo design language) | Mono em time gutter |
| **Caps / eyebrow** | Inter Medium, uppercase, `+0.125px` letter-spacing positive | Arcadia caps | SF Pro Caps | Geist Sans uppercase | NotionInter uppercase `+0.125px` |
| **Atlas hoje** | Inter system | Inter system | Inter system | Inter system | Inter system |

**Insight chave** [fonte: blakecrosley.com/guides/design/notion-calendar]:
- Notion Calendar usa `rgba(0,0,0,0.9)` em vez de pure black em light mode pra reduzir eye strain → análogo Atlas: usar `#f0f4f7` (cool cream) em vez de pure white em dark, **já implementado** no canon.
- Mercury usa **weight 480** (variable font, não standard 400/500) pra "authoritative without heavy" → Atlas pode adotar weight 510 (já no Inter Variable) pra display.

**Recomendação Atlas**:
```css
/* Adicionar ao @layer tokens · surface-code */
--cc-font-display: 'Inter Display', 'Inter', system-ui;
--cc-font-body:    'Inter', system-ui, -apple-system;
--cc-font-mono:    'JetBrains Mono', 'Berkeley Mono', ui-monospace;

--cc-weight-display:  590;   /* hero, painel titles · "Linear weight" */
--cc-weight-strong:   510;   /* section headers, emphasized body */
--cc-weight-body:     420;   /* body operacional · Mercury 480-ish */
--cc-weight-caps:     500;   /* eyebrow caps */

--cc-ls-display: -0.022em;   /* tight Linear display */
--cc-ls-body:    -0.011em;   /* tight Linear body */
--cc-ls-caps:    0.06em;     /* positive caps · 12% open */

--cc-lh-display: 1.05;       /* Notion display 1.0 mas Atlas 1.05 pra warmth */
--cc-lh-body:    1.55;       /* Mercury 1.625 - 0.075 (dark slate menos exigente) */
```

---

### 1.2 · Como renderizam CÓDIGO inline (file paths, function names, identifiers)

| Aspecto | Linear | Mercury | Stripe | Vercel | Atlas hoje |
|---|---|---|---|---|---|
| Font | Mono | n/a (banking) | SF Mono | Geist Mono | Mistura |
| Background | `rgba(255,255,255,0.06)` sutil [unconfirmed] | n/a | `#1B1E25` (badgeNeutralColorBackground) [fonte: docs.stripe.com] | `rgba(255,255,255,0.06)` [unconfirmed] | None |
| Border | None ou hairline 1px | n/a | `1px solid #2B3039` | None | None |
| Padding | `1px 4px` | n/a | `2px 6px` | `2px 4px` | n/a |
| Radius | `3px` | n/a | `4px` | `4px` | n/a |
| Color | Text muted secondary | n/a | `#C9CED8` | gray-700 | n/a |

**Insight chave**: Linear e Vercel renderizam inline code com **opacity-based background** (não cor sólida), o que se integra ao tema sem chamar atenção. Stripe usa **filled badge** com border explícita — mais corporativo, menos editorial.

**Recomendação Atlas** (alinhada ao DNA "peso decrescente"):
```css
.surface-code code.inline,
.surface-code .ident,
.surface-code .filepath {
  font-family: var(--cc-font-mono);
  font-size: 0.92em;
  font-weight: 450;
  padding: 1px 5px;
  background: rgba(212, 168, 90, 0.07);   /* atlas-gold-veil 7% */
  border: 1px solid var(--cc-border-soft); /* hairline editorial */
  border-radius: 3px;                      /* canon: 2-3px só */
  color: var(--cc-text);
  font-feature-settings: 'liga' 0, 'calt' 0;  /* code = no ligatures */
}

.surface-code code.inline:hover {
  background: rgba(212, 168, 90, 0.12);
  border-color: var(--cc-accent-border);
}
```

**Anti-pattern Stripe a evitar**: bordas explícitas sólidas em código inline ficam Bootstrap. Use **hairline com opacity** + gold veil.

---

### 1.3 · Como renderizam TABLES

| Aspecto | Linear | Mercury | Stripe | Vercel | Atlas hoje |
|---|---|---|---|---|---|
| Row height (default) | 32-34px [unconfirmed via redesign 2024] | 44-48px (transactions) | 40-44px [unconfirmed] | 36-40px [unconfirmed] | Variável |
| Row height (dense) | 28-30px | 36px | 32px | 32px | n/a |
| Header style | Mono caps positive letter-spacing, weight 510, color muted | Body weight 500 + muted color | Sans caps + uppercase + muted | Sans uppercase + muted gray-500 | n/a |
| Header height | 36-40px | 40px | 44px | 40px | n/a |
| Header divider | 1px solid hairline 8-10% alpha | Idem | 1px `#2B3039` | 1px `rgba(255,255,255,0.08)` | n/a |
| Row divider | Nenhum **OU** hairline 5% alpha — Linear preferiu remover linhas no redesign 2024 | Hairline 8% alpha | 1px `#2B3039` em cada row | Hairline subtle | n/a |
| Row hover | Background `rgba(255,255,255,0.03)` MUITO sutil | Background slightly raised + cursor pointer | Background `#1B1E25` (offset) | Background gray-900 | n/a |
| Row selected/active | Border-left accent 2-3px + bg sutil | Accent rgb(108,92,231) border-left | Border-left primary 3px | Border-left blue | n/a |
| Numeric alignment | Right-aligned + tabular-nums | Right-aligned + tabular-nums + Arcadia 28px weight 500 | Right + tabular | Right + tabular-nums | n/a |
| Density toggle | Sim (display options) [fonte: linear.app/docs/display-options] | Não exposto | Não exposto | Não exposto | n/a |

**Insight crítico** [fonte: linear.app/now/behind-the-latest-design-refresh]:
> "Borders and separators had proliferated... the refresh softened the contrast by rounding out their edges, giving users structure without cluttering their view."

Linear deliberadamente **REMOVEU linhas entre rows** e fia rows na percepção pelo hover + alignment vertical, não por borders. Isso é a aposta canônica Atlas (peso silencioso, hairline manuscrita).

**Recomendação Atlas**:
```css
.surface-code .table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--cc-text-body); /* 13.5px */
}

.surface-code .table thead th {
  height: 36px;
  padding: 0 12px;
  text-align: left;
  font-family: var(--cc-font-body);
  font-size: 10.5px;
  font-weight: var(--cc-weight-caps); /* 500 */
  letter-spacing: var(--cc-ls-caps);  /* +0.06em */
  text-transform: uppercase;
  color: var(--cc-text-muted);
  border-bottom: 1px solid var(--cc-border);
  background: transparent; /* nunca fill no header */
}

.surface-code .table tbody td {
  height: 32px;          /* default density · Linear comfortable */
  padding: 0 12px;
  color: var(--cc-text);
  border-bottom: 1px solid var(--cc-border-soft); /* 5% opacity */
  vertical-align: middle;
  transition: background-color 160ms cubic-bezier(0.32, 0.72, 0.24, 1);
}

.surface-code .table.density-dense tbody td { height: 28px; }
.surface-code .table.density-comfortable tbody td { height: 40px; }

.surface-code .table tbody tr:hover td {
  background: rgba(233, 238, 242, 0.03); /* canon: subtle warm */
}

.surface-code .table tbody tr.is-selected td {
  background: var(--cc-accent-veil);     /* atlas gold 12% */
  box-shadow: inset 2px 0 0 var(--cc-accent); /* left accent border */
}

/* Numeric columns: tabular nums + right align */
.surface-code .table td.num,
.surface-code .table th.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1;
}
```

**Anti-pattern Stripe a evitar**: borders em cada row + alternating zebra stripes — vibe SEO/SQL-admin. Use hairline 5% só.

---

### 1.4 · Como renderizam STATUS CHIPS

#### Stripe — três tokens por chip (background + border + text) [fonte: docs.stripe.com/connect/embedded-appearance-support-dark-mode]

```css
/* SUCCESS */
background: #152207;  border: #20360C;  text: #3EAE20;
/* WARNING */
background: #400A00;  border: #5F1400;  text: #F27400;
/* DANGER */
background: #420320;  border: #61092D;  text: #F46B7D;
/* NEUTRAL */
background: #1B1E25;  border: #2B3039;  text: #8C99AD;
```

**Padrão Stripe**: fundo dark saturado da família + border darker outer + text saturado bright. Cria filled badge muito legível em dark mode mas é visualmente "ruidoso" (5+ cores por componente).

#### Linear — chip filled monocromático

[unconfirmed via inspeção visual] Chip em Linear costuma ser:
- background sólido sólido em cor saturated do status (sem border)
- text white ou dark sobre fundo
- icon SVG 12px + label 11-12px caps
- padding 2-4px 6-8px
- border-radius **2px** (linear canon "tags") [fonte: refero.design]

Filosofia: 1-2 tokens por chip, máximo. Discrição.

#### Mercury — semantic + soft fill

Status financeiros usam cor da família mas **light fill com alpha** + text da família dark:
- Credit/positive: `rgba(52, 211, 153, 0.16)` bg + `rgb(52,211,153)` text
- Debit/negative: `rgba(248, 113, 113, 0.16)` bg + `rgb(248,113,113)` text
- Pending: `rgba(251, 191, 36, 0.16)` bg + `rgb(251,191,36)` text

Mais editorial que Stripe (sem border explícita), mais filled que Linear (cor presente).

#### Vercel — minimalista

Geist usa primarily neutral chips (gray-800 bg + gray-300 text) com accent color só quando necessário. Status colors são ramps 1-10 e tipicamente usa color-3 pra bg, color-10 pra text.

**Recomendação Atlas · Híbrido Mercury + Linear**:

```css
/* Chip canon · padrão Atlas surface-code */
.surface-code .chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 22px;
  padding: 0 8px;
  font-family: var(--cc-font-body);
  font-size: 11px;
  font-weight: var(--cc-weight-caps);  /* 500 */
  letter-spacing: 0.02em;              /* slight positive, NÃO caps */
  border-radius: 3px;                  /* canon 2-3px */
  border: 1px solid transparent;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

/* SUCCESS · moss bright */
.surface-code .chip.success {
  background: rgba(130, 181, 119, 0.12);    /* moss-bright 12% veil */
  color: var(--cc-success);                  /* #82b577 */
  border-color: rgba(130, 181, 119, 0.22);
}

/* WARNING · atlas gold warm */
.surface-code .chip.warning {
  background: rgba(224, 173, 94, 0.12);
  color: var(--cc-warning);                  /* #e0ad5e */
  border-color: rgba(224, 173, 94, 0.24);
}

/* DANGER · rec-red bright */
.surface-code .chip.danger {
  background: rgba(208, 90, 82, 0.12);
  color: var(--cc-danger);                   /* #d05a52 */
  border-color: rgba(208, 90, 82, 0.22);
}

/* INFO · prussian bright */
.surface-code .chip.info {
  background: rgba(127, 167, 196, 0.12);
  color: var(--cc-info);                     /* #7fa7c4 */
  border-color: rgba(127, 167, 196, 0.22);
}

/* NEUTRAL · default */
.surface-code .chip.neutral {
  background: rgba(149, 163, 172, 0.10);
  color: var(--cc-text-muted);
  border-color: var(--cc-border);
}

/* Status dot · inline · canon project_atlas_code_codex_slate_premium */
.surface-code .chip .status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  /* NUNCA animar pulse — canon premium proíbe */
}
.surface-code .chip.success .status-dot { background: var(--cc-success); }
.surface-code .chip.warning .status-dot { background: var(--cc-warning); }
.surface-code .chip.danger  .status-dot { background: var(--cc-danger); }
.surface-code .chip.info    .status-dot { background: var(--cc-info); }
.surface-code .chip.neutral .status-dot { background: var(--cc-neutral); }
```

**Anti-pattern Stripe a evitar**: usar 3 tokens (bg + border + text) com cores muito saturadas — vira semáforo. Use **2 tokens** (veil bg + accent text), border opcional só pra `outline` variant.

**Anti-pattern atual Atlas**: chip yellow genérico sem família. Substituir por status específicos com semantic naming (`.success`, `.warning`, `.danger`, `.info`, `.neutral`).

---

### 1.5 · Como renderizam ACTION BUTTONS

#### Linear — disciplina 3-tier

[unconfirmed exact mas inferido de docs]:
- **Primary**: `background: var(--accent)` + `color: white` + radius 6px + height 28-32px
- **Secondary** (default): `background: rgba(255,255,255,0.05)` + border `rgba(255,255,255,0.10)` + text neutral
- **Ghost**: sem background, só hover bg sutil
- **Destructive**: `background: var(--danger)` + white text (raro, só action confirm dialog)
- Padding: 0 12-16px
- Font: Inter Medium 13px

#### Mercury

[fonte: blakecrosley.com/guides/design/mercury]:
```css
/* CTA primary */
border-radius: 8px;
padding: 14px 28px;
font-weight: 500;
background: rgb(108, 92, 231);
box-shadow: 0 0 24px rgba(108, 92, 231, 0.3); /* glow accent */

/* hover */
box-shadow: 0 0 32px rgba(108, 92, 231, 0.45);
```

#### Stripe

[fonte: docs.stripe.com/stripe-apps/components/button]:
- 3 sizes (small, medium, large)
- 3 types (primary, secondary default, destructive)
- Destructive button → red filled, white text, "exclusivamente pra ações destrutivas de dados"

Specific dark mode:
- Primary: `#0085FF` (colorPrimary)
- Secondary bg: `#2B3039` (buttonSecondaryColorBackground)
- Secondary text: `#C9CED8` (buttonSecondaryColorText)
- Destructive: `#F23154` (colorDanger)

#### Vercel — austero

Geist usa primary monochrome (`#fff` em dark, `#000` em light) — não cor acentuada. Buttons são minimalistic, radius 6-8px, height 32-40px.

**Recomendação Atlas · alinhada ao DNA editorial · destructive SÓBRIO**:

```css
/* Base button · sem aparência ainda */
.surface-code .btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 32px;
  padding: 0 14px;
  font-family: var(--cc-font-body);
  font-size: 13px;
  font-weight: var(--cc-weight-strong); /* 510 */
  letter-spacing: -0.005em;
  border-radius: 4px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: 
    background-color 160ms cubic-bezier(0.32, 0.72, 0.24, 1),
    border-color 160ms cubic-bezier(0.32, 0.72, 0.24, 1),
    box-shadow 220ms cubic-bezier(0.32, 0.72, 0.24, 1),
    transform 220ms cubic-bezier(0.4, 1, 0.2, 1);
  user-select: none;
}

.surface-code .btn:focus-visible {
  outline: none;
  box-shadow: var(--cc-focus-ring);  /* canon: 2px bg + 4px gold 55% */
}

.surface-code .btn:active {
  transform: translateY(0.5px);
}

/* PRIMARY · atlas gold burnished */
.surface-code .btn.primary {
  background: var(--cc-accent);                /* #d4a85a */
  color: #1d1a16;                              /* dark ink on gold */
  border-color: rgba(0, 0, 0, 0.2);            /* slight bottom contrast */
  box-shadow: 
    inset 0 1px 0 rgba(255, 255, 255, 0.2),   /* top edge highlight */
    0 1px 0 rgba(0, 0, 0, 0.25),              /* settle shadow */
    0 4px 12px rgba(212, 168, 90, 0.18);      /* SUTIL accent glow */
}

.surface-code .btn.primary:hover {
  background: var(--cc-accent-strong);         /* #e6b966 */
  box-shadow: 
    inset 0 1px 0 rgba(255, 255, 255, 0.25),
    0 1px 0 rgba(0, 0, 0, 0.3),
    0 6px 18px rgba(230, 185, 102, 0.28);
}

/* SECONDARY · default · texturizado mas calmo */
.surface-code .btn.secondary {
  background: rgba(233, 238, 242, 0.04);
  color: var(--cc-text);
  border-color: var(--cc-border);
}

.surface-code .btn.secondary:hover {
  background: rgba(233, 238, 242, 0.08);
  border-color: var(--cc-border-strong);
}

/* GHOST · zero background idle */
.surface-code .btn.ghost {
  background: transparent;
  color: var(--cc-text-muted);
  border-color: transparent;
}

.surface-code .btn.ghost:hover {
  background: rgba(233, 238, 242, 0.05);
  color: var(--cc-text);
}

/* DESTRUCTIVE · sóbrio · não rosa alarmista · canon "rec-red sóbrio" */
.surface-code .btn.destructive {
  background: rgba(208, 90, 82, 0.10);          /* veil 10% */
  color: var(--cc-danger);                       /* #d05a52 */
  border-color: rgba(208, 90, 82, 0.32);
}

.surface-code .btn.destructive:hover {
  background: rgba(208, 90, 82, 0.18);
  border-color: var(--cc-danger);
  /* NUNCA pink/saturated — destructive em Atlas é "advertência editorial", não Material */
}

/* DESTRUCTIVE confirmed · só em dialog final · filled vermelho rec-red bright */
.surface-code .btn.destructive.confirmed {
  background: var(--cc-danger);
  color: #1a1714;
  border-color: rgba(0, 0, 0, 0.3);
}

/* Sizes */
.surface-code .btn.small  { height: 26px; padding: 0 10px; font-size: 12px; }
.surface-code .btn.medium { height: 32px; padding: 0 14px; font-size: 13px; } /* default */
.surface-code .btn.large  { height: 38px; padding: 0 18px; font-size: 14px; }
```

**Anti-pattern Mercury a evitar**: glow shadow muito forte. Atlas usa `0 4px 12px accent 18%` em vez de `0 0 24px accent 30%`. Glow é "luxo discreto", não "neon".

**Anti-pattern Stripe a evitar**: destructive vermelho saturado puro em estado idle. Atlas usa **destructive veil** (10% bg + accent text) em idle; só vira filled solid no confirm dialog (estado terminal).

---

### 1.6 · Como renderizam SECTION HEADERS

| Atom | Linear | Mercury | Stripe | Vercel | Notion Cal |
|---|---|---|---|---|---|
| Eyebrow caps | Sim, Inter Medium, uppercase, `+0.125px ls` [fonte: Notion Cal article] | Sim, Arcadia caps | Sim | Sim, Geist caps | Sim, NotionInter caps `+0.125px` |
| Eyebrow size | 11-12px | 11px | 11-12px | 12px | 12px |
| Eyebrow color | Muted (gray-500 equivalent) | `rgb(170, 170, 185)` (text secondary) | `#8C99AD` (colorSecondaryText) | gray-500 / gray-600 | `rgba(0,0,0,0.54)` (light mode) |
| Title size | 14-16px | 18-22px | 16-20px | 18-24px | 16-20px |
| Title weight | 590 (Inter Display) | 480 (Arcadia variable) | 600 | 600-700 | 510-600 |
| Title color | High contrast (white-ish) | `rgb(237,237,243)` soft off-white | `#C9CED8` | foreground/gray-100 | `rgba(0,0,0,0.9)` |
| Separator hairline | Sim, 1px hairline 8-10% alpha BELOW eyebrow ou title | Pouco — usa espaço | Sim | Sim, hairline subtle | 1px `rgba(0,0,0,0.09)` |

**Insight chave** [fonte: blakecrosley.com/guides/design/notion-calendar]:
> "Label-style section headers employ uppercase text with positive letter-spacing (0.125px) and medium weight to organize information hierarchy without visual weight."

Caps eyebrow + tight title big = hierarquia tipográfica sem precisar de cor ou peso visual. Editorial puro. **Atlas já tem isso no canon Cartografia** (Mono caps eyebrow + Cormorant italic title). No surface-code, replicar com **Inter Display + Inter caps**.

**Recomendação Atlas**:

```css
.surface-code .section-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px 0 12px;
  border-bottom: 1px solid var(--cc-border-soft);
  margin-bottom: 16px;
}

.surface-code .section-header .eyebrow {
  font-family: var(--cc-font-body);
  font-size: 10.5px;
  font-weight: var(--cc-weight-caps);    /* 500 */
  letter-spacing: var(--cc-ls-caps);     /* +0.06em */
  text-transform: uppercase;
  color: var(--cc-text-muted);
  line-height: 1;
}

.surface-code .section-header .title {
  font-family: var(--cc-font-display);
  font-size: 17px;
  font-weight: var(--cc-weight-display); /* 590 */
  letter-spacing: var(--cc-ls-display);  /* -0.022em */
  color: var(--cc-text-strong);
  line-height: 1.2;
}

.surface-code .section-header .deck {
  font-family: var(--cc-font-body);
  font-size: 12.5px;
  font-weight: 400;
  color: var(--cc-text-muted);
  line-height: 1.45;
  margin-top: 2px;
}

/* Inline variant (compact, no border) */
.surface-code .section-header.inline {
  flex-direction: row;
  align-items: baseline;
  gap: 10px;
  padding: 8px 0;
  border: none;
  margin: 0;
}

.surface-code .section-header.inline .eyebrow {
  font-size: 9.5px;
}

.surface-code .section-header.inline .title {
  font-size: 14.5px;
}
```

**Anti-pattern atual Atlas Code**: section headers sans-serif regular sem peso, sem eyebrow caps, indistinguíveis do body. Adicionar **eyebrow obrigatório** + **title Inter Display 590 com tight letter-spacing**.

---

### 1.7 · Spacing System

| System | Linear | Mercury | Stripe | Vercel | Atlas hoje |
|---|---|---|---|---|---|
| Base unit | 4px [fonte: refero.design] | n/a — heurístico | 2px [fonte: docs.stripe.com] | 4px (8px grid) | Editorial deliberado |
| Tokens | 4 / 8 / 12 / 24 | n/a | 0 / 2 / 4 / 8 / 16 / 24 / 32 / 48 | 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128 | Sem scale rígida |
| Pattern | 4-multiple strict | Não exposto | 2-multiple base, 8-multiple body | Powers-of-2 (4/8/16/32) | Improvised |
| Section gap | 24px | Maior — uses negative space | 24-32px | 32-48px | 18-24px |
| Card padding | 12px (subtle) [fonte: refero] | 18-24px | 16-24px | 16-24px | 14-18px |

**Recomendação Atlas · Scale 4-multiple híbrida**:

```css
/* @layer tokens · surface-code */
--cc-space-1:   4px;
--cc-space-2:   8px;
--cc-space-3:  12px;
--cc-space-4:  16px;
--cc-space-5:  20px;     /* extra granular sem 6/24 jump */
--cc-space-6:  24px;
--cc-space-8:  32px;
--cc-space-10: 40px;
--cc-space-12: 48px;
--cc-space-16: 64px;

/* Semantic spacing */
--cc-pad-card-x:        16px;
--cc-pad-card-y:        14px;
--cc-pad-card-comfort-x: 22px;
--cc-pad-card-comfort-y: 18px;
--cc-gap-row:            12px;     /* entre rows em lista */
--cc-gap-card:           16px;     /* entre cards em coluna */
--cc-gap-section:        32px;     /* entre sections de painel */
--cc-gap-panel:          24px;     /* entre painéis adjacentes */
```

**Regra prática**: nunca usar valor fora dessa scale. Se precisar de 10px, troca pra 8 ou 12. Disciplina visual emerge da repetição.

---

### 1.8 · Border Radius Discipline

| Component | Linear | Mercury | Stripe | Vercel | Atlas canon |
|---|---|---|---|---|---|
| Tags | **2px** | n/a | 4px | 4px | 2px (canon Cartografia) |
| Badges/chips | **4px** | 6-8px | 4px | 4-6px | 3px (recomendado) |
| Buttons | **6px** | 8px | 6-8px | 6-8px | 4px (recomendado) |
| Cards | **6px** | 8-12px | 8px | 8-12px | 2-3px (Cartografia canon) |
| Inputs | **6px** | 8px | 8px | 6-8px | 3-4px |
| Pill | **9999px** | 9999px | 9999px | 9999px | 50% (só em chips circulares) |
| Modals | 6-8px | 12px | 8-12px | 12px | 4px |

**Insight chave**: Linear tem a **maior disciplina** — apenas 4 valores (2/4/6/9999) com semântica clara. Cada radius significa algo:
- 2px → "tag" (smallest unit identifier)
- 4px → "badge" (status marker)
- 6px → "container" (interactive surface)
- 9999px → "pill" (round)

**Recomendação Atlas · 4 valores semânticos**:

```css
--cc-radius-tag:    2px;   /* meta tags, source badges, micro */
--cc-radius-chip:   3px;   /* status chips, code inline */
--cc-radius-button: 4px;   /* buttons, inputs, cards */
--cc-radius-panel:  6px;   /* large containers, modals */
--cc-radius-pill:   9999px; /* só pra elementos perfeitamente circulares */
```

Cartografia canon usa 2-3px exclusivamente. Surface-code pode estender pra 4-6px em buttons/panels (mais SaaS-friendly sem trair DNA, porque Code é workbench operacional 12h+/dia, precisa de touch zones mais óbvias).

---

### 1.9 · Shadow / Depth Recipes

#### Linear

[fonte: refero.design]:
```css
/* small · cards idle subtle */
box-shadow: rgba(0, 0, 0, 0.4) 0px 2px 4px 0px;

/* medium · inset glow ambient */
box-shadow: rgba(0, 0, 0, 0.2) 0px 0px 12px 0px inset;

/* subtle border · 1px inset hairline */
box-shadow: rgb(35, 37, 42) 0px 0px 0px 1px inset;

/* extra large · modals */
box-shadow: rgba(8, 9, 10, 0.6) 0px 4px 32px 0px;
```

**Padrão Linear**: combina **inset 1px border** (em vez de border CSS) + drop shadow externa. Isso garante hairline pixel-perfect mesmo em scaling/zoom.

#### Mercury

```css
/* card */
box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);

/* CTA glow */
box-shadow: 0 0 24px rgba(108, 92, 231, 0.3);

/* hover glow */
box-shadow: 0 0 32px rgba(108, 92, 231, 0.45);
```

**Padrão Mercury**: deep drop shadows + accent glow em interactive. Mais "cinematic" que Linear.

#### Vercel — austero

Vercel raramente usa shadow em dark mode — confia em border + background contrast. Quando usa: `0 8px 24px rgba(0,0,0,0.4)`.

**Recomendação Atlas · híbrido editorial**:

```css
/* canon surface-code · capítulo 16 do design system */
--cc-shadow-xs:  0 1px 0 rgba(0, 0, 0, 0.20);              /* settle */
--cc-shadow-sm:  0 2px 4px rgba(0, 0, 0, 0.26);            /* card idle */
--cc-shadow-md:  0 6px 16px rgba(0, 0, 0, 0.32);           /* card hover */
--cc-shadow-lg:  0 14px 32px rgba(0, 0, 0, 0.38);          /* modal */

/* NOVO · hairline-as-shadow · Linear pattern */
--cc-hairline-inset: inset 0 0 0 1px var(--cc-border-soft);
--cc-hairline-top:   inset 0 1px 0 rgba(255, 255, 255, 0.04);
--cc-hairline-bottom:inset 0 -1px 0 rgba(0, 0, 0, 0.20);

/* NOVO · accent glow sutil (não Mercury intensity) */
--cc-glow-accent-sm: 0 0 12px rgba(212, 168, 90, 0.12);
--cc-glow-accent-md: 0 0 18px rgba(212, 168, 90, 0.18);

/* Composição canon · card hero */
.surface-code .card-hero {
  box-shadow:
    var(--cc-hairline-top),
    var(--cc-hairline-inset),
    var(--cc-shadow-md);
}

/* Composição canon · primary button */
.surface-code .btn.primary {
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    0 1px 0 rgba(0, 0, 0, 0.25),
    var(--cc-glow-accent-sm);
}
```

**Anti-pattern Mercury a evitar**: glow intensity 30%+ — vira "neon SaaS futurista". Atlas usa 12-18% max.

**Anti-pattern Vercel a evitar**: zero depth — fica flat e perde sensação de "peso editorial". Atlas SEMPRE tem pelo menos hairline-inset.

---

## 2 · Token System Unificado · Proposta Atlas Code (Slate Dark)

### 2.1 · Cores · Estende canon existente

```css
.atlas-shell.surface-code {
  /* ============ EXISTENTES (canon · cap 16) ============ */
  --cc-bg:              #1d2b34;
  --cc-surface:         #243743;
  --cc-surface-raised:  #2d4351;
  --cc-surface-sunken:  #15212a;
  
  --cc-text-strong:     #f0f4f7;
  --cc-text:            #d6dde2;
  --cc-text-muted:      #95a3ac;
  --cc-text-faint:      #677482;
  --cc-text-disabled:   #3d4b54;
  
  --cc-border-soft:     rgba(233, 238, 242, 0.05);
  --cc-border:          rgba(233, 238, 242, 0.10);
  --cc-border-strong:   rgba(233, 238, 242, 0.20);
  
  --cc-accent:          #d4a85a;
  --cc-accent-strong:   #e6b966;
  --cc-accent-veil:     rgba(212, 168, 90, 0.12);
  --cc-accent-border:   rgba(212, 168, 90, 0.34);
  
  --cc-success:  #82b577;
  --cc-warning:  #e0ad5e;
  --cc-danger:   #d05a52;
  --cc-info:     #7fa7c4;
  --cc-neutral:  #95a3ac;
  
  /* ============ NOVOS · derivados desta pesquisa ============ */
  
  /* Status veils · 12% alpha · pra chip backgrounds Mercury-style */
  --cc-success-veil: rgba(130, 181, 119, 0.12);
  --cc-warning-veil: rgba(224, 173, 94, 0.12);
  --cc-danger-veil:  rgba(208, 90, 82, 0.12);
  --cc-info-veil:    rgba(127, 167, 196, 0.12);
  --cc-neutral-veil: rgba(149, 163, 172, 0.10);
  
  /* Status borders · 22% alpha · sobre veil */
  --cc-success-border: rgba(130, 181, 119, 0.22);
  --cc-warning-border: rgba(224, 173, 94, 0.24);
  --cc-danger-border:  rgba(208, 90, 82, 0.22);
  --cc-info-border:    rgba(127, 167, 196, 0.22);
  
  /* Hover surfaces · sem cor, só warmth */
  --cc-hover-soft:   rgba(233, 238, 242, 0.03);
  --cc-hover-medium: rgba(233, 238, 242, 0.06);
  --cc-hover-strong: rgba(233, 238, 242, 0.10);
  
  /* Code inline · gold veil */
  --cc-code-bg:     rgba(212, 168, 90, 0.07);
  --cc-code-bg-hover: rgba(212, 168, 90, 0.12);
  
  /* Hairline shadows · Linear pattern */
  --cc-hairline-inset:  inset 0 0 0 1px var(--cc-border-soft);
  --cc-hairline-top:    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  --cc-hairline-bottom: inset 0 -1px 0 rgba(0, 0, 0, 0.20);
  
  /* Accent glow · subtle Mercury-inspired */
  --cc-glow-accent-sm: 0 0 12px rgba(212, 168, 90, 0.12);
  --cc-glow-accent-md: 0 0 18px rgba(212, 168, 90, 0.18);
  --cc-glow-accent-lg: 0 0 28px rgba(212, 168, 90, 0.22);
}
```

### 2.2 · Typography · Estende com weight discipline

```css
.atlas-shell.surface-code {
  /* Font families */
  --cc-font-display: 'Inter Display', 'Inter', system-ui;
  --cc-font-body:    'Inter', system-ui, -apple-system;
  --cc-font-mono:    'JetBrains Mono', 'Berkeley Mono', ui-monospace, 'SF Mono';
  
  /* Weights · Linear/Mercury approach */
  --cc-weight-display: 590;
  --cc-weight-strong:  510;
  --cc-weight-body:    420;
  --cc-weight-caps:    500;
  
  /* Letter spacing · tight Linear */
  --cc-ls-display: -0.022em;
  --cc-ls-strong:  -0.015em;
  --cc-ls-body:    -0.011em;
  --cc-ls-caps:    0.06em;
  
  /* Line heights */
  --cc-lh-display: 1.05;
  --cc-lh-title:   1.2;
  --cc-lh-body:    1.55;
  --cc-lh-tight:   1.25;
  
  /* Sizes · existentes do canon */
  --cc-text-display:  22px;
  --cc-text-title:    17px;
  --cc-text-section:  14px;
  --cc-text-body:     13.5px;
  --cc-text-body-sm:  12.5px;
  --cc-text-caption:  11.5px;
  --cc-text-label:    10.5px;
  --cc-text-data:     12px;
  
  /* Feature settings · ligaduras editoriais */
  font-feature-settings: 'liga' 1, 'calt' 1, 'kern' 1, 'tnum' 0;
}

/* Tabular nums em data cells */
.surface-code .num,
.surface-code .tabular,
.surface-code td.num,
.surface-code th.num {
  font-feature-settings: 'tnum' 1;
  font-variant-numeric: tabular-nums;
}
```

### 2.3 · Spacing · 4-multiple strict

```css
.atlas-shell.surface-code {
  --cc-space-1:   4px;
  --cc-space-2:   8px;
  --cc-space-3:  12px;
  --cc-space-4:  16px;
  --cc-space-5:  20px;
  --cc-space-6:  24px;
  --cc-space-8:  32px;
  --cc-space-10: 40px;
  --cc-space-12: 48px;
  --cc-space-16: 64px;
  
  /* Semantic */
  --cc-pad-card-x:         16px;
  --cc-pad-card-y:         14px;
  --cc-pad-card-comfort-x: 22px;
  --cc-pad-card-comfort-y: 18px;
  --cc-gap-row:            12px;
  --cc-gap-card:           16px;
  --cc-gap-section:        32px;
  --cc-gap-panel:          24px;
}
```

### 2.4 · Radius · 4 valores semânticos

```css
.atlas-shell.surface-code {
  --cc-radius-tag:    2px;
  --cc-radius-chip:   3px;
  --cc-radius-button: 4px;
  --cc-radius-panel:  6px;
  --cc-radius-pill:   9999px;
}
```

### 2.5 · Motion · canon

```css
.atlas-shell.surface-code {
  --cc-ease: cubic-bezier(0.32, 0.72, 0.24, 1);
  --cc-ease-overshoot: cubic-bezier(0.4, 1, 0.2, 1);
  
  --cc-dur-hover:   180ms;
  --cc-dur-settle:  280ms;
  --cc-dur-scene:   420ms;
  
  --cc-focus-ring: 0 0 0 2px var(--cc-bg), 0 0 0 4px rgba(230, 185, 102, 0.55);
}
```

---

## 3 · Recipes · Atom-by-Atom

### 3.1 · Chip · 5 variantes

```css
.surface-code .chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 22px;
  padding: 0 8px;
  font-family: var(--cc-font-body);
  font-size: 11px;
  font-weight: var(--cc-weight-caps);
  letter-spacing: 0.015em;
  border-radius: var(--cc-radius-chip);
  border: 1px solid transparent;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.surface-code .chip.success { background: var(--cc-success-veil); color: var(--cc-success); border-color: var(--cc-success-border); }
.surface-code .chip.warning { background: var(--cc-warning-veil); color: var(--cc-warning); border-color: var(--cc-warning-border); }
.surface-code .chip.danger  { background: var(--cc-danger-veil);  color: var(--cc-danger);  border-color: var(--cc-danger-border); }
.surface-code .chip.info    { background: var(--cc-info-veil);    color: var(--cc-info);    border-color: var(--cc-info-border); }
.surface-code .chip.neutral { background: var(--cc-neutral-veil); color: var(--cc-text-muted); border-color: var(--cc-border); }

/* Outline variant · sem fill, só border */
.surface-code .chip.outline { background: transparent; border-color: currentColor; }

/* Solid variant · fill saturado, raro · só em hero context */
.surface-code .chip.solid.success { background: var(--cc-success); color: #1d1a16; border-color: rgba(0,0,0,0.3); }

/* Status dot */
.surface-code .chip .dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}
```

### 3.2 · Pill · diferente de chip · mais texto, mais altura

```css
.surface-code .pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 28px;
  padding: 0 12px;
  font-family: var(--cc-font-body);
  font-size: 12.5px;
  font-weight: var(--cc-weight-body);
  letter-spacing: var(--cc-ls-body);
  border-radius: var(--cc-radius-pill);   /* full round · só em pill */
  border: 1px solid var(--cc-border);
  background: var(--cc-hover-soft);
  color: var(--cc-text);
  cursor: pointer;
  transition: 
    background-color 180ms var(--cc-ease),
    border-color 180ms var(--cc-ease);
}

.surface-code .pill:hover {
  background: var(--cc-hover-medium);
  border-color: var(--cc-border-strong);
}

.surface-code .pill.is-active {
  background: var(--cc-accent-veil);
  border-color: var(--cc-accent-border);
  color: var(--cc-accent-strong);
}
```

### 3.3 · Button · 4 variants × 3 sizes

```css
/* Base */
.surface-code .btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 32px;
  padding: 0 14px;
  font-family: var(--cc-font-body);
  font-size: 13px;
  font-weight: var(--cc-weight-strong);
  letter-spacing: -0.005em;
  border-radius: var(--cc-radius-button);
  border: 1px solid transparent;
  cursor: pointer;
  user-select: none;
  transition: 
    background-color 180ms var(--cc-ease),
    border-color 180ms var(--cc-ease),
    box-shadow 280ms var(--cc-ease),
    transform 280ms var(--cc-ease-overshoot);
}

.surface-code .btn:focus-visible {
  outline: none;
  box-shadow: var(--cc-focus-ring);
}

.surface-code .btn:active:not(:disabled) {
  transform: translateY(0.5px);
}

.surface-code .btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* Primary */
.surface-code .btn.primary {
  background: var(--cc-accent);
  color: #1d1a16;
  border-color: rgba(0, 0, 0, 0.2);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    0 1px 0 rgba(0, 0, 0, 0.25),
    var(--cc-glow-accent-sm);
}
.surface-code .btn.primary:hover {
  background: var(--cc-accent-strong);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.25),
    0 1px 0 rgba(0, 0, 0, 0.3),
    var(--cc-glow-accent-md);
}

/* Secondary */
.surface-code .btn.secondary {
  background: rgba(233, 238, 242, 0.04);
  color: var(--cc-text);
  border-color: var(--cc-border);
}
.surface-code .btn.secondary:hover {
  background: var(--cc-hover-medium);
  border-color: var(--cc-border-strong);
}

/* Ghost */
.surface-code .btn.ghost {
  background: transparent;
  color: var(--cc-text-muted);
}
.surface-code .btn.ghost:hover {
  background: var(--cc-hover-soft);
  color: var(--cc-text);
}

/* Destructive (sóbrio · veil + accent text) */
.surface-code .btn.destructive {
  background: var(--cc-danger-veil);
  color: var(--cc-danger);
  border-color: var(--cc-danger-border);
}
.surface-code .btn.destructive:hover {
  background: rgba(208, 90, 82, 0.18);
  border-color: var(--cc-danger);
}

/* Destructive confirmed (filled · só em terminal confirm) */
.surface-code .btn.destructive.confirmed {
  background: var(--cc-danger);
  color: #1a1714;
  border-color: rgba(0, 0, 0, 0.3);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    0 1px 0 rgba(0, 0, 0, 0.25);
}

/* Sizes */
.surface-code .btn.size-sm { height: 26px; padding: 0 10px; font-size: 12px; }
.surface-code .btn.size-md { height: 32px; padding: 0 14px; font-size: 13px; }
.surface-code .btn.size-lg { height: 38px; padding: 0 18px; font-size: 14px; }
```

### 3.4 · Table-row · Linear density discipline

```css
.surface-code .table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--cc-text-body);
  font-family: var(--cc-font-body);
}

.surface-code .table thead th {
  height: 36px;
  padding: 0 var(--cc-space-3);
  text-align: left;
  font-size: var(--cc-text-label);
  font-weight: var(--cc-weight-caps);
  letter-spacing: var(--cc-ls-caps);
  text-transform: uppercase;
  color: var(--cc-text-muted);
  border-bottom: 1px solid var(--cc-border);
  background: transparent;
  white-space: nowrap;
}

.surface-code .table tbody td {
  height: 32px;
  padding: 0 var(--cc-space-3);
  color: var(--cc-text);
  border-bottom: 1px solid var(--cc-border-soft);
  vertical-align: middle;
  line-height: 1.3;
  transition: background-color 160ms var(--cc-ease);
}

.surface-code .table.density-dense tbody td { height: 28px; }
.surface-code .table.density-comfortable tbody td { height: 40px; padding: 0 var(--cc-space-4); }

.surface-code .table tbody tr:hover td {
  background: var(--cc-hover-soft);
}

.surface-code .table tbody tr.is-selected td {
  background: var(--cc-accent-veil);
}
.surface-code .table tbody tr.is-selected td:first-child {
  box-shadow: inset 2px 0 0 var(--cc-accent);
}

.surface-code .table td.num,
.surface-code .table th.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.surface-code .table td.actions {
  text-align: right;
  padding-right: var(--cc-space-4);
  width: 1%;
  white-space: nowrap;
}
```

### 3.5 · Section-header

```css
.surface-code .section-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--cc-space-4) 0 var(--cc-space-3);
  border-bottom: 1px solid var(--cc-border-soft);
  margin-bottom: var(--cc-space-4);
}

.surface-code .section-header .eyebrow {
  font-family: var(--cc-font-body);
  font-size: var(--cc-text-label);
  font-weight: var(--cc-weight-caps);
  letter-spacing: var(--cc-ls-caps);
  text-transform: uppercase;
  color: var(--cc-text-muted);
  line-height: 1;
}

.surface-code .section-header .title {
  font-family: var(--cc-font-display);
  font-size: var(--cc-text-title);
  font-weight: var(--cc-weight-display);
  letter-spacing: var(--cc-ls-display);
  color: var(--cc-text-strong);
  line-height: var(--cc-lh-title);
}

.surface-code .section-header .deck {
  font-family: var(--cc-font-body);
  font-size: var(--cc-text-body-sm);
  font-weight: 400;
  color: var(--cc-text-muted);
  line-height: 1.45;
  margin-top: 2px;
}

.surface-code .section-header.inline {
  flex-direction: row;
  align-items: baseline;
  gap: 10px;
  padding: var(--cc-space-2) 0;
  border: none;
  margin: 0;
}
.surface-code .section-header.inline .eyebrow { font-size: 9.5px; }
.surface-code .section-header.inline .title { font-size: 14.5px; }
```

### 3.6 · Code-inline · file paths, identifiers, function names

```css
.surface-code code,
.surface-code .ident,
.surface-code .filepath {
  font-family: var(--cc-font-mono);
  font-size: 0.92em;
  font-weight: 450;
  padding: 1px 5px;
  background: var(--cc-code-bg);
  border: 1px solid var(--cc-border-soft);
  border-radius: var(--cc-radius-chip);
  color: var(--cc-text);
  font-feature-settings: 'liga' 0, 'calt' 0;
  white-space: nowrap;
}

.surface-code code:hover {
  background: var(--cc-code-bg-hover);
  border-color: var(--cc-accent-border);
}

/* Variant · file path · stronger emphasis */
.surface-code .filepath {
  color: var(--cc-text-strong);
  background: rgba(212, 168, 90, 0.10);
}

/* Variant · identifier · subtle */
.surface-code .ident {
  background: transparent;
  border: none;
  padding: 0;
  color: var(--cc-accent-strong);
}

/* Block · pre · multi-line */
.surface-code pre {
  padding: var(--cc-space-3) var(--cc-space-4);
  background: var(--cc-surface-sunken);
  border: 1px solid var(--cc-border);
  border-radius: var(--cc-radius-button);
  overflow-x: auto;
  line-height: 1.55;
  font-family: var(--cc-font-mono);
  font-size: 12.5px;
}

.surface-code pre code {
  background: transparent;
  border: none;
  padding: 0;
  white-space: pre;
  font-size: inherit;
  border-radius: 0;
}
```

---

## 4 · Code Block · Integration-Ready CSS

Para colar direto em `apps/desktop/src/index.css` dentro de `@layer enterprise`:

```css
@layer enterprise {
  .atlas-shell.surface-code {
    /* ===== STATUS VEILS (novos) ===== */
    --cc-success-veil: rgba(130, 181, 119, 0.12);
    --cc-warning-veil: rgba(224, 173, 94, 0.12);
    --cc-danger-veil:  rgba(208, 90, 82, 0.12);
    --cc-info-veil:    rgba(127, 167, 196, 0.12);
    --cc-neutral-veil: rgba(149, 163, 172, 0.10);
    
    --cc-success-border: rgba(130, 181, 119, 0.22);
    --cc-warning-border: rgba(224, 173, 94, 0.24);
    --cc-danger-border:  rgba(208, 90, 82, 0.22);
    --cc-info-border:    rgba(127, 167, 196, 0.22);
    
    /* ===== HOVER SURFACES (novos) ===== */
    --cc-hover-soft:   rgba(233, 238, 242, 0.03);
    --cc-hover-medium: rgba(233, 238, 242, 0.06);
    --cc-hover-strong: rgba(233, 238, 242, 0.10);
    
    /* ===== CODE INLINE (novos) ===== */
    --cc-code-bg:       rgba(212, 168, 90, 0.07);
    --cc-code-bg-hover: rgba(212, 168, 90, 0.12);
    
    /* ===== HAIRLINE SHADOWS (novos · Linear pattern) ===== */
    --cc-hairline-inset:  inset 0 0 0 1px var(--cc-border-soft);
    --cc-hairline-top:    inset 0 1px 0 rgba(255, 255, 255, 0.04);
    --cc-hairline-bottom: inset 0 -1px 0 rgba(0, 0, 0, 0.20);
    
    /* ===== ACCENT GLOWS (novos · Mercury-inspired sutil) ===== */
    --cc-glow-accent-sm: 0 0 12px rgba(212, 168, 90, 0.12);
    --cc-glow-accent-md: 0 0 18px rgba(212, 168, 90, 0.18);
    
    /* ===== TYPOGRAPHY DISCIPLINE (novos) ===== */
    --cc-font-display: 'Inter Display', 'Inter', system-ui;
    --cc-font-body:    'Inter', system-ui, -apple-system;
    --cc-font-mono:    'JetBrains Mono', 'Berkeley Mono', ui-monospace;
    
    --cc-weight-display: 590;
    --cc-weight-strong:  510;
    --cc-weight-body:    420;
    --cc-weight-caps:    500;
    
    --cc-ls-display: -0.022em;
    --cc-ls-strong:  -0.015em;
    --cc-ls-body:    -0.011em;
    --cc-ls-caps:    0.06em;
    
    --cc-lh-display: 1.05;
    --cc-lh-title:   1.2;
    --cc-lh-body:    1.55;
    
    /* ===== SPACING SCALE (novos · 4-multiple) ===== */
    --cc-space-1:  4px;  --cc-space-2:  8px;  --cc-space-3: 12px;
    --cc-space-4: 16px;  --cc-space-5: 20px;  --cc-space-6: 24px;
    --cc-space-8: 32px;  --cc-space-10: 40px; --cc-space-12: 48px;
    
    /* ===== RADIUS DISCIPLINE (novos · 4 valores) ===== */
    --cc-radius-tag:    2px;
    --cc-radius-chip:   3px;
    --cc-radius-button: 4px;
    --cc-radius-panel:  6px;
    --cc-radius-pill:   9999px;
    
    font-feature-settings: 'liga' 1, 'calt' 1, 'kern' 1;
  }
  
  /* Inserir aqui todos os recipes da seção 3 acima */
}
```

---

## 5 · Anti-Patterns Explicit · O Que NÃO Copiar

### Stripe — não copiar:
- **Chips 3-token (bg + border + text) com cores saturadas**. Cria "semáforo Material" — Bootstrap admin. Use 2-token veil + accent text.
- **Destructive button vermelho saturado em estado idle**. Atlas usa destructive veil em idle, só vira filled solid em terminal confirm.
- **Table com border em cada row + zebra stripes**. SEO admin vibe. Use hairline 5% só + hover bg sutil.
- **Modal corners 12px+**. Vibe SaaS calmaria genérico. Atlas 4-6px max.

### Linear — não copiar:
- **Texto-de-marca sólido azul/roxo nos chips de estado**. Atlas é gold + status-family discreto, não brand-blue.
- **Sidebar com background pleno diferente**. Atlas Code mantém sidebar `--cc-surface-sunken` (não cor distinta).
- **Animations bouncy/spring**. Atlas easing único `cubic-bezier(0.32, 0.72, 0.24, 1)`.
- **Inter Display em body text**. Inter Display SÓ em display/title; body usa Inter regular.

### Mercury — não copiar:
- **Glow shadow accent 30%+ intensidade**. Vira "neon SaaS futurista". Atlas usa 12-18% max.
- **Border radius 8-12px em buttons/cards**. Vibe fintech moderno mainstream. Atlas 4-6px max.
- **Cinematic deep shadows `0 4px 24px rgba(0,0,0,0.4)` em cards idle**. Atlas usa hairline-inset + shadow-sm idle, shadow-md só em hover.
- **Purple/violet accent**. Atlas é atlas gold burnished — único accent.

### Vercel — não copiar:
- **Zero depth / flat tudo**. Atlas SEMPRE tem hairline-inset pra peso editorial.
- **Mono monochrome accent (white em dark)**. Atlas é atlas gold accent, monochrome é mortal.
- **Display 64px+ em UI text**. Atlas display max 28-32px (UI, não marketing).
- **Letter-spacing -0.04em em display**. Demais tight pra Atlas — usa -0.022em.

### Notion Calendar — não copiar:
- **Pure black text `rgba(0,0,0,0.9)`** em dark equivalence. Atlas usa `#f0f4f7` cool cream (canon).
- **Display 64px no app**. Excessive pra workbench operacional.

---

## 6 · Plano de Adoção (sugestão de slice fino)

### Slice 1 · Tokens novos (1h)
- Adicionar tokens novos em `index.css` `@layer enterprise` no escopo `.atlas-shell.surface-code`.
- Não remover nenhum token existente — só adicionar.
- Validar visualmente que telas existentes não regrediram.

### Slice 2 · Atoms base (2h)
- Implementar `.chip`, `.pill`, `.btn`, `.section-header`, `code.inline` no canon CSS.
- Criar página de showcase em `apps/desktop/src/dev/PolishShowcase.tsx` com todas variantes.
- Screenshot via Playwright canonico.

### Slice 3 · Migrar Action Buttons (2h)
- Localizar todos pink "destructive" buttons atuais.
- Substituir por `.btn.destructive` (veil sóbrio).
- Localizar primary actions e migrar pra `.btn.primary` (gold com glow sutil).

### Slice 4 · Migrar Chips (2h)
- Localizar todos chips yellow genéricos atuais.
- Adicionar semantic class apropriada (`.chip.success`, etc).
- Garantir status dot inline quando aplicável.

### Slice 5 · Tables (3h)
- Onde existir tabela atual SEO-style, refatorar pra `.table` canon.
- Headers Mono caps eyebrow + rows 32px + hover sutil.

### Slice 6 · Section headers (1h)
- Substituir headings sans-regular por `.section-header` com eyebrow + title Inter Display 590.

### Slice 7 · Code inline (1h)
- Wrap file paths, function names, identifiers em `<code class="filepath">`, `<code class="ident">`, etc.

**Total estimado**: ~12h de polimento aplicado. Build verde cada slice. Plan mode antes de cada um.

---

## 7 · Validação · Como Aferir Que Superou Linear

### Heurísticas premium (subjective scorecard)

| Aspecto | Linear (10) | Atlas atual | Atlas pós-polish |
|---|---|---|---|
| Typography precision | 9.5 | 5 | 9 [target] |
| Status chips clarity | 9 | 4 | 9 [target] |
| Table density discipline | 9 | 3 | 8.5 [target] |
| Button hierarchy | 9 | 4 | 9 [target] |
| Section header polish | 8.5 | 4 | 9 [target] |
| Code inline elegance | 8 | 2 | 9 [target] |
| Shadow depth hierarchy | 8 | 5 | 9 [target] |
| Brand differentiation | 7 (brand-blue padrão) | 6 (Codex slate distinto) | **9.5** (slate + gold único no mercado) |

**Insight final**: o trunfo Atlas é **brand differentiation** — slate teal `#1d2b34` + atlas gold burnished `#d4a85a` é **único**. Linear (blue), Mercury (purple), Stripe (blue), Vercel (monochrome) — nenhum tem essa paleta. Polimento técnico + paleta única = ultrapassa.

### Playwright checklist pós-polish

```js
// Smoke test polish · usar canon `tmp/atlas-tauri-size.mjs`
await page.click('button.primary'); // primary visível + gold accent
await page.hover('.chip.success'); // chip não muda (idle, sem animation)
await page.hover('tr.table-row'); // row hover bg subtle
await page.locator('code.filepath').first().screenshot(); // file path com gold veil
```

---

## 8 · Fontes & Links

### Linear
- [Linear brand guidelines](https://linear.app/brand)
- [Linear design refresh 2024](https://linear.app/now/behind-the-latest-design-refresh)
- [Linear UI redesign part II](https://linear.app/now/how-we-redesigned-the-linear-ui)
- [Linear design tokens via refero.design](https://styles.refero.design/style/90ce5883-bb24-4466-93f7-801cd617b0d1)
- [Inter on linear.app via type.fan](https://www.type.fan/site/linear-app)

### Mercury
- [Mercury banking design system breakdown · Blake Crosley](https://blakecrosley.com/guides/design/mercury)
- [Mercury iOS dark mode launch · Mercury blog](https://mercury.com/blog/inside-mercury/december-2022-product-updates)
- [Mercury fonts in use](https://fontsinuse.com/typefaces/7534/mercury)

### Stripe
- [Stripe Apps · style tokens](https://docs.stripe.com/stripe-apps/style)
- [Stripe Apps · button component](https://docs.stripe.com/stripe-apps/components/button)
- [Stripe Apps · table component](https://docs.stripe.com/stripe-apps/components/table)
- [Stripe Connect · dark mode appearance variables](https://docs.stripe.com/connect/embedded-appearance-support-dark-mode)
- [Stripe Apps · design patterns](https://docs.stripe.com/stripe-apps/patterns)

### Vercel / Geist
- [Geist · introduction](https://vercel.com/geist/introduction)
- [Geist · typography](https://vercel.com/geist/typography)
- [Geist · colors](https://vercel.com/geist/colors)
- [Vercel design tokens breakdown · SeedFlip](https://seedflip.co/blog/vercel-design-system)
- [Geist colors GitHub](https://github.com/ephraimduncan/geist-colors)

### Notion Calendar (Cron)
- [Notion Calendar Swiss precision design · Blake Crosley](https://blakecrosley.com/guides/design/notion-calendar)
- [Introducing Notion Calendar](https://www.notion.com/blog/introducing-notion-calendar)

### Atlas canon predecessor
- `/Users/vitorepf/develop/Atlas/atlas-desktop/docs/architecture/0007-atlas-desktop-design-system.md` (capítulo 16 · Surface Code Dark Warm Codex Slate Premium v1)
- Memory canon: `project_atlas_code_codex_slate_premium`, `project_atlas_motion_principle`, `reference_atlas_desktop_design_system`

---

## 9 · Open Questions (para o user decidir)

1. **Inter Display vs Inter**: licenciar Inter Display ou stick com Inter Variable variável `font-stretch`? Inter Display tem letter-spacing nativo melhor mas custa font weight de download. **Default**: usar Inter Variable + adjustments manuais (sem download extra).
2. **JetBrains Mono vs Berkeley Mono**: Berkeley Mono é premium ($), JetBrains Mono é grátis. Atlas Code usa código inline frequentemente — Berkeley vale a pena? **Default**: JetBrains Mono.
3. **Slice order**: a sequência de adoção é só sugestão — começar por chips (mais visível) ou tokens (mais foundational)? **Recomendação**: tokens primeiro pra evitar dupla-migração.
4. **Cartografia surface**: este manual NÃO se aplica. Cartografia permanece Don Corleone cream canon. Confirma?
5. **Status pulse**: canon `project_atlas_code_codex_slate_premium` proíbe pulse animation em status dots. Manter? **Default**: sim, manter proibição.

---

> **Encerramento**: este documento é input contextual pra próxima iteração visual de Atlas Code. Não é especificação de implementação — implementação requer plan mode + slice fino + Playwright validation por slice (princípio canon "qualidade > velocidade · foco em uma coisa").
>
> Para usar: ler capítulos 1-4 antes de tocar CSS, escolher um slice em cap 6, plan mode com user, implementar, screenshot, próximo.
