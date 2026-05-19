# Implementando uma surface nova · LEIA ANTES DE CODAR

> **Status**: canon · obrigatório
> **Origem**: 2026-05-18 após violação `surface-control_plane` (cream warm em vez de slate dark — `docs/anti-patterns/control-plane-cream-violation.png`)
> **Quem lê**: qualquer IA ou humano antes de tocar pixel em `atlas-desktop`

---

## A regra absoluta

> **Atlas Desktop é slate teal dark por DEFAULT.** Cream warm é EXCEÇÃO da Cartografia. Toda surface nova deve aparecer slate (`#1d2b34` + accent atlas gold `#d4a85a`), nunca cream.

Se sua surface aparece cream/bege/marrom, você caiu na armadilha que essa doc previne — ela existe porque outra IA fez exatamente isso. **Pare e refatore.**

---

## A armadilha · por que cream é o default acidental

Em `apps/desktop/src/index.css`, os tokens `--cc-*` são declarados no `:root` em **cream warm** (procure por `--cc-bg: #f4ede0;`). Esses são os defaults da Cartografia. **A slate dark vem de uma REDEFINIÇÃO dos mesmos tokens dentro de um seletor multi-classe** (procure pelo comentário `SURFACE OPT-IN SLATE DARK` no arquivo):

```css
.atlas-shell.surface-code,
.atlas-shell.surface-atencao,
.atlas-shell.surface-atlas_ai,
.atlas-shell.surface-atlas-ai {
  --cc-bg: #1d2b34;             /* slate teal */
  --cc-text: #d6dde2;
  --cc-accent: #d4a85a;         /* atlas gold */
  /* ... 50+ tokens redefinidos ... */
}
```

**Se sua surface nova NÃO está nessa lista, ela herda os tokens cream do `:root` e fica visualmente quebrada.** Foi exatamente isso que aconteceu com `surface-control_plane`.

---

## Os 3 passos obrigatórios

### Passo 1 · Inscrever a surface no opt-in slate

Abra `apps/desktop/src/index.css`. Procure o comentário-âncora `SURFACE OPT-IN SLATE DARK · ADICIONE SUA SURFACE NOVA AQUI` (atualmente perto da linha 235). Logo abaixo está o seletor agregado:

```css
.atlas-shell.surface-code,
.atlas-shell.surface-atencao,
.atlas-shell.surface-atlas_ai,
.atlas-shell.surface-atlas-ai {
  /* tokens slate redefinidos */
}
```

Adicione sua surface ao seletor:

```css
.atlas-shell.surface-code,
.atlas-shell.surface-atencao,
.atlas-shell.surface-atlas_ai,
.atlas-shell.surface-atlas-ai,
.atlas-shell.surface-{nome} {   /* ← sua surface */
  /* tokens slate redefinidos */
}
```

Em seguida, faça o mesmo nos OUTROS blocos agregados deste mesmo arquivo. Use grep para encontrar todos:

```bash
grep -n "surface-code," apps/desktop/src/index.css
```

Hoje há **6 lugares** que listam `surface-code, surface-atencao, surface-atlas_ai, surface-atlas-ai` em multi-class:

1. Opt-in slate tokens (o que você acabou de fazer)
2. `*::-webkit-scrollbar`
3. `*::-webkit-scrollbar-track`
4. `*::-webkit-scrollbar-thumb`
5. `*::-webkit-scrollbar-thumb:hover`
6. `font-feature-settings` global (seletor `* {...}`)

Adicione `surface-{nome}` em **TODOS os 6**. Sem este passo qualquer outro CSS que você escrever herda cream.

### Passo 2 · Registrar a surface no enum TypeScript

Em `apps/desktop/src/hooks/useSurface.ts`, adicione `'{nome}'` à union `Surface`:

```ts
export type Surface = 'code' | 'cartografia' | 'atencao' | 'atlas_ai' | 'control_plane' | '{nome}'
```

E ao validador:

```ts
v === 'control_plane' || v === '{nome}'
```

O nome do enum **deve casar exatamente** com o classname `surface-{nome}` usado no CSS. Inconsistência ali = surface nunca recebe os tokens slate.

### Passo 3 · CSS específico da surface

Crie `apps/desktop/src/surfaces/{nome}/{nome}.css`. Use APENAS os tokens `--cc-*` — não declare cores hex direto, não use os tokens legados `--cream*`/`--ink*`/`--bronze*`.

```css
/* apps/desktop/src/surfaces/{nome}/{nome}.css */

.atlas-shell.surface-{nome} .{nome}-root {
  background: var(--cc-bg);
  color: var(--cc-text);
  font-family: var(--cc-font-sans);
  font-feature-settings: 'cv11' 1, 'ss01' 1, 'kern' 1;
  -webkit-font-smoothing: antialiased;
}

.atlas-shell.surface-{nome} .{nome}-card {
  background: var(--cc-surface);
  border: 1px solid var(--cc-border-soft);
  border-radius: 8px;
  padding: 14px 18px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.02);
}

.atlas-shell.surface-{nome} .{nome}-title {
  font-size: var(--cc-text-title);            /* 17px */
  font-variation-settings: 'wght' 580;
  color: var(--cc-text-strong);
  letter-spacing: -0.011em;
  line-height: 1.25;
}

.atlas-shell.surface-{nome} .{nome}-body {
  font-size: var(--cc-text-body);             /* 13.5px */
  line-height: 1.65;
  color: var(--cc-text);
  font-variation-settings: 'wght' 440;
}

.atlas-shell.surface-{nome} .{nome}-eyebrow {
  font-size: var(--cc-text-label);            /* 10px */
  font-variation-settings: 'wght' 540;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--cc-text-faint);
}

.atlas-shell.surface-{nome} .{nome}-mono {
  font-family: var(--cc-font-mono);
  font-size: var(--cc-text-data);             /* 12px */
  color: var(--cc-text-strong);
}

.atlas-shell.surface-{nome} .{nome}-divider {
  height: 1px;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(233, 238, 242, 0.08) 12%,
    rgba(233, 238, 242, 0.08) 88%,
    transparent 100%);
  margin: 22px 0;
}

.atlas-shell.surface-{nome} button:focus-visible,
.atlas-shell.surface-{nome} a:focus-visible {
  outline: none;
  box-shadow: var(--cc-focus-ring);
  border-radius: var(--cc-radius-sm);
}
```

---

## Tokens canônicos · use APENAS estes

Todos esses são redefinidos em slate quando sua surface está no seletor do Passo 1. Use o token, não a cor direta — assim Cartografia continua funcionando com cream e seu painel funciona com slate sem branching no código.

### Background / superfície

| Token | Slate |
|---|---|
| `--cc-bg` | `#1d2b34` canvas principal |
| `--cc-surface` | `#243743` painel/card |
| `--cc-surface-raised` | `#2d4351` popover/diálogo |
| `--cc-surface-sunken` | `#15212a` sidebar/footer |

### Texto

| Token | Slate |
|---|---|
| `--cc-text-strong` | `#f0f4f7` headlines |
| `--cc-text` | `#d6dde2` corpo primary |
| `--cc-text-muted` | `#95a3ac` secondary |
| `--cc-text-faint` | `#677482` helpers/captions |
| `--cc-text-disabled` | `#3d4b54` |

### Bordas

| Token | Slate |
|---|---|
| `--cc-border-soft` | `rgba(233,238,242,0.05)` |
| `--cc-border` | `rgba(233,238,242,0.10)` |
| `--cc-border-strong` | `rgba(233,238,242,0.20)` |

### Accent (atlas gold) · parcimônia

| Token | Slate |
|---|---|
| `--cc-accent` | `#d4a85a` |
| `--cc-accent-strong` | `#e6b966` |
| `--cc-accent-veil` | `rgba(212,168,90,0.12)` |
| `--cc-accent-border` | `rgba(212,168,90,0.34)` |

### Status semânticos

`--cc-success` (moss), `--cc-warning` (e0ad5e), `--cc-danger` (d05a52 muted), `--cc-info` (prussian), `--cc-neutral`. Cada um tem variantes `*-fg`, `*-veil`, `*-border`. **Use apenas para erros reais ou confirmações** — nunca em estado neutro.

### Tipografia

| Token | Valor |
|---|---|
| `--cc-font-sans` | Inter Variable + system-ui |
| `--cc-font-serif` | Cormorant Garamond (APENAS para `✦` glyph + numerais romanos) |
| `--cc-font-mono` | JetBrains Mono |
| `--cc-text-display` | 22px |
| `--cc-text-title` | 17px |
| `--cc-text-section` | 14px |
| `--cc-text-body` | 13.5px |
| `--cc-text-body-sm` | 12.5px |
| `--cc-text-caption` | 11.5px |
| `--cc-text-label` | 10px |
| `--cc-text-data` | 12px (mono) |

### Motion

| Token | Valor |
|---|---|
| `--cc-ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` |
| `--cc-ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` |
| `--cc-ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` |

### Outros

`--cc-focus-ring`, `--cc-shadow-xs|sm|md|lg`, `--cc-radius-*`, `--cc-dot-running|blocked|review|passed|unknown`. Todos definidos. **Não invente cores.**

---

## Discipline · regras de design (todas obrigatórias)

| Item | Regra |
|---|---|
| Border-radius | **4 / 6 / 8 / 10** apenas (consulte `--cc-radius-*`). Sem 5/7/9/14. |
| Box-shadow | **≤2 layers**. Use `--cc-shadow-sm/md/lg`. Nunca empilhar 3+. |
| Cores semafóricas | Apenas erro REAL ou success de confirmação. Nunca em estado neutro. |
| Transition | Use `--cc-ease-out`. Reduced-motion guard obrigatório em `@keyframes`. |
| Focus | `box-shadow: var(--cc-focus-ring); outline: none;` |
| Italic small body | **NUNCA Cormorant em texto operacional.** Cormorant só em `✦` + numerais romanos. |
| Drop cap | NUNCA `::first-letter` Cormorant gold. |
| Hardcoded cor | NUNCA hex direto fora dos tokens. Quebra Cartografia. |

---

## Smoke test obrigatório · prove que está slate

Type-check passa e build verde **não provam** que sua surface está visualmente correta. Foi exatamente assim que Control Plane caiu em cream: o código compilou limpo, mas faltou o Passo 1 e a surface herdou cream do `:root`.

**Antes de pedir review, faça esses 3 testes ao vivo:**

1. **DevTools computed style** — abra a app, navegue até sua surface, inspecione qualquer elemento, e confira no painel "Computed" o valor real de `--cc-bg`:
   - ✅ `#1d2b34` (slate) → sua surface está canon
   - ❌ `#f4ede0` (cream warm) → você falhou o Passo 1, sua surface não está inscrita no opt-in

2. **Screenshot side-by-side** — capture sua surface ao lado de Atlas Code ou Atlas AI. O background deve ser visualmente idêntico (slate teal). Se o seu está mais bege/quente, falhou.

3. **Grep duplo** — confirme que sua surface aparece em `index.css` **pelo menos 6 vezes** nos seletores agregados (opt-in slate + 4 scrollbar selectors + font-feature global):
   ```bash
   grep -c "surface-{nome}" apps/desktop/src/index.css
   # esperado: 6 ou mais
   ```

Falha qualquer um destes 3 testes = surface não está canon. **Não merge.**

---

## Checklist pré-PR · obrigatório

- [ ] Surface adicionada ao seletor agregado `index.css` abaixo do comentário-âncora `SURFACE OPT-IN SLATE DARK` (slate tokens)
- [ ] Surface adicionada aos 5 seletores agregados de scrollbar + font-feature (use `grep -n "surface-code," index.css` para listar os 6 lugares totais)
- [ ] Surface adicionada ao enum `Surface` em `useSurface.ts`
- [ ] CSS específico usa APENAS `var(--cc-*)`, zero hex direto fora dos tokens
- [ ] Zero `--cream*` / `--ink*` / `--bronze*` no arquivo da surface
- [ ] Border-radius respeitando 4/6/8/10
- [ ] Box-shadow ≤2 layers
- [ ] Focus-visible discipline aplicada
- [ ] Reduced-motion guard em todo `@keyframes`
- [ ] Cormorant ausente do texto operacional (só ✦ + numerais romanos)
- [ ] **Screenshot side-by-side com Atlas AI ou Atlas Code · mesmo tom slate?**
- [ ] Build limpo: `npm run build` (não confiar em `pnpm tauri build` exit 0)

Falha qualquer um → **NÃO MERGE**, refatore.

---

## Surfaces existentes · referência

| Surface | Tema | Diretório | Status |
|---|---|---|---|
| `cartografia` | cream warm (única exceção) | `surfaces/cartografia/` | canon |
| `code` | slate dark | `surfaces/code/` | canon |
| `atlas_ai` | slate dark | `surfaces/atlas-ai/` | canon |
| `atencao` | slate dark | `surfaces/atencao/` | canon |
| `control_plane` | slate dark (em refactor) | `surfaces/control-plane/` | violação detectada 2026-05-18 |

---

## Referências

- **Doc canon completo** · `docs/architecture/0007-atlas-desktop-design-system.md` v2.1, capítulo 22 NEW SURFACE BLUEPRINT
- **Polish spec aplicado em Atlas AI** · `docs/atlas-ai-ultra-premium-polish-spec.md`
- **Research reports** · `docs/research/` (Apple HIG, Linear/Mercury/Stripe, editorial typography)
- **Anti-patterns visuais** · `docs/anti-patterns/`

---

**Última revisão**: 2026-05-18
**Motivo da criação**: violação `surface-control_plane` (cream warm em vez de slate dark). O canon 0007 existia mas tinha 1700 linhas. Esse arquivo é o ATALHO obrigatório com a verdade técnica.
