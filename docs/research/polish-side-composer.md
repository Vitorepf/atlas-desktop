# Polish · Right Rail (Contexto / Plano) + Composer

**Audit date**: 2026-05-15
**Surface**: `atlas-ai` · screenshot `atlas-ai-current-deploy-79.png`
**Comparativo**: `atlas-ai-amador-78.png` (Plano tab antes do fix da filled box)
**Reference design language**: Cursor v3 Composer, Claude.ai chat input, Linear cmd-K, Raycast detail pane, Mercury input, Codex CLI

**Files audited**
- `apps/desktop/src/surfaces/atlas-ai/components/AtlasAiSidePanel.tsx`
- `apps/desktop/src/surfaces/atlas-ai/components/AtlasAiContextPanel.tsx`
- `apps/desktop/src/surfaces/atlas-ai/components/AtlasAiPlanPanel.tsx`
- `apps/desktop/src/surfaces/atlas-ai/components/AtlasAiComposer.tsx`
- `apps/desktop/src/surfaces/atlas-ai/components/AtlasAiComposerMenu.tsx`
- `apps/desktop/src/surfaces/atlas-ai/atlas-ai.css` (linhas 170-200, 1273-1407, 2467-2655, 2988-3430)

---

## TL;DR · Veredito agregado

| Área | Nota | Diagnóstico |
| --- | --- | --- |
| Right rail · tab Contexto inactive | 8/10 | Tipografia + cor faint corretos. Borda inferior 1px transparent é boa. |
| Right rail · tab Plano active | 6.5/10 | Sublinhado gold OK, MAS o screenshot 79 ainda mostra um **box filled** atrás do label "Plano" — não foi 100% removido. O `.atlas-ai-rail .atlas-ai-side-tab.is-active` zera bg, mas a versão base `.atlas-ai-side-tab.is-active` em CSS@2510 não tem `box-shadow: none` explícito. Validar inspect element no DevTools. |
| Right rail · eyebrow "PLANO DA CONVERSA" | 7/10 | Tracking + cor faint corretos, mas o texto está **muito perto** do underline do tab (8-10px de gap só). Respiro Linear-class seria 18-20px. |
| Right rail · italic placeholder | 7.5/10 | Serif italic + dashed border + veil gold sutil = Mercury-grade. MAS dashed border é um anti-pattern Apple (Linear/Mercury usam solid hairline). Trocar para `border: 1px solid var(--cc-border-soft)`. |
| Composer · placeholder text italic | 8/10 | Funciona. Bom. |
| Composer · pill "modo Programação · dev" | 6/10 | Pill correto mas eyebrow "Modo" repete-se em pílulas vizinhas. Borda 1px com 0.08 alpha está dentro do padrão Linear, MAS o label completo "Programação · dev" é longo e ocupa 140px+ no rail apertado. |
| Composer · pill "provider Auto (Atlas Decide)" | 5/10 | "Auto (Atlas Decide)" é label barroco. Linear/Cursor usam labels curtos ("auto", "claude-3.5", "gpt-4"). Reduzir. |
| Composer · token count "~0 tokens" | 9/10 | Discrição perfeita. mono + faint + tabular-nums. Mantém. |
| Composer · attach 📎 button (icon-only) | 7/10 | Icon-only correto mas o glyph SVG é um paperclip muito magro (stroke 1.7) — fica frágil. |
| Composer · send button gold gradient | 6/10 | **Exagerado para o contexto**. Slate teal + cool cream = paleta editorial calma. Gold gradient com 3 shadows + lift -0.5px = Stripe/Wells Fargo PaymentForm, não Don Corleone. Atlas DNA pede **flat gold filled, sem gradient, sem 3 shadows stacked**. |
| Composer · "+" new thread icon | 7/10 | Discreto mas pouco discoverable (sem tooltip visible). Funciona. |

**Veredito geral right rail + composer**: **6.8/10**. Bom skeleton, mas três problemas matam o premium: (1) box-shadow residual no active tab, (2) gold gradient + 3 shadows no send button = "demo SaaS 2019", (3) pill provider label "Auto (Atlas Decide)" longo demais.

---

## ÁREA 1 · Right rail (Contexto / Plano)

### 1.1 Tab Contexto inactive

**Estado atual** (screenshot 79)
- Texto "Contexto" em sans 12px, weight 520, cor `var(--cc-text-faint)` (cool cream muito apagado, ~28% lum).
- Sem background, sem borda.
- Padding 10px 0 11px, gap entre tabs 18-20px.

**Nota: 8/10**

**Diagnóstico**
- Tipografia Linear-class correta. Inactive deve ser legível mas claramente secundária.
- Cor faint é boa (Apple HIG: "secondary text is 60% of primary for dark themes").
- **Pequeno problema**: weight 520 inactive vs 580 active = delta 60 só. Apple e Linear usam delta 100+ (400 vs 600). A diferença visual fica sutil demais — operador rápido pode não notar qual tab está ativa só pelo peso.

**Fix CSS concreto**
```css
.atlas-ai-side-tab {
  font-variation-settings: 'wght' 480; /* era 520 — afundar mais o inactive */
}
.atlas-ai-side-tab.is-active {
  font-variation-settings: 'wght' 620; /* era 580 — destacar mais */
}
```

### 1.2 Tab Plano active

**Estado atual** (screenshot 79 vs 78)
- Texto "Plano" em sans 12px, weight 580, cor `var(--cc-text-strong)`.
- Sublinhado gold 1px `var(--cc-accent)` na border-bottom.
- **Problema visível no screenshot 79**: parece haver ainda uma caixa filled atrás do texto "Plano" — não foi 100% limpa.
- Olhando screenshot 78 (versão antiga "amador"), a caixa filled era explícita; em 79 está atenuada mas ainda visível.

**Nota: 6.5/10**

**Diagnóstico**
- A versão escopada do rail (`.atlas-ai-rail .atlas-ai-side-tab.is-active` CSS@192-197) zera `background: transparent` e `box-shadow: none`, correto.
- MAS a versão base `.atlas-ai-side-tab.is-active` (CSS@2510-2516) zera `background` e `box-shadow` também. Então **deveria estar limpo**.
- Hipótese: o screenshot 79 está rasterizado antes do CSS deploy ou tem outra origem de bg (ex: focus-ring residual, hover state inadvertido, ou `.atlas-ai-side-tabs` parent com gradient).
- **Verificar no DevTools**: inspecionar `.atlas-ai-side-tab.is-active` e checar `background-color` computado. Provavelmente é `rgba(233,238,242,0.04)` herdado de algum hover ou da hairline border-bottom do parent `.atlas-ai-side-tabs`.
- Outro suspeito: o `position: relative; top: 1px` no `.atlas-ai-side-tab` (CSS@2502-2503) faz overlap com o `border-bottom` do parent. Pode estar criando ilusão de caixa.

**Fix CSS concreto**
```css
/* Garantir reset absoluto na active state · Apple Pro discipline */
.atlas-ai-side-tab.is-active,
.atlas-ai-rail .atlas-ai-side-tab.is-active {
  background: transparent !important;
  background-color: transparent !important;
  box-shadow: none !important;
  outline: none;
  /* Drop o top:1px se for o culpado pela ilusão de box */
}

/* Se o parent .atlas-ai-side-tabs gradient/bg estiver pintando atrás, neutralizar */
.atlas-ai-rail .atlas-ai-side-tabs {
  background: transparent;
  /* hairline divisor único, sem fill */
}
```

**Ação**: pedir screenshot do DevTools com `.atlas-ai-side-tab.is-active` selecionado, computed `background-color` value. Se for transparente, o "box" é uma ilusão da hairline `border-bottom: 1px solid rgba(233,238,242,0.04)` do parent capturada via `top: 1px` + sublinhado gold. Solução: trocar `top: 1px` por `margin-bottom: -1px` (mesmo efeito sem criar stacking context).

### 1.3 Eyebrow "PLANO DA CONVERSA"

**Estado atual**
- Sans 10.5px, weight 580, uppercase, letter-spacing 0.06em, cor faint.
- Margin 0 0 8px abaixo.

**Nota: 7/10**

**Diagnóstico**
- Tipografia Linear-class correta — uppercase + tracking + faint = eyebrow editorial bom.
- **Problema**: o gap entre o underline gold do tab "Plano" e a eyebrow "PLANO DA CONVERSA" é muito apertado no screenshot 79 (parece ~12px só). Linear, Mercury e Cursor usam 20-24px entre tab bar e primeira eyebrow. Respiro.
- **Redundância semântica**: o tab já se chama "Plano". Mostrar "PLANO DA CONVERSA" como eyebrow logo abaixo é repetir o título. Apple HIG / Linear: drop redundante.

**Fix CSS concreto**
```css
/* Aumentar respiro · padding-top do .atlas-ai-plan / .atlas-ai-context */
.atlas-ai-rail .atlas-ai-plan,
.atlas-ai-rail .atlas-ai-context {
  padding: 16px 4px 8px; /* era 4px 4px 8px no rail scope */
}

/* Dropar a eyebrow no Plano panel quando ela duplica o tab */
.atlas-ai-context-eyebrow {
  /* OPÇÃO A · drop completo (preferido — tab já indica) */
  display: none;
}
/* OPÇÃO B · mantém mas afunda muito (peso 480, opacity 0.55) */
```

**Recomendação**: Opção A — remover eyebrow inteiramente quando o panel já está sob um tab nomeado. Princípio editorial Atlas: "uma palavra única, sem ornamento".

### 1.4 Italic placeholder text (empty state Plano)

**Estado atual**
- "Esta thread ainda não tem plano explícito. Atlas só promove para Forge/Obra quando você decide — até lá, o plano é descobrir junto."
- Serif italic, 13px, line-height 1.55, color text-muted.
- Border: 1px **dashed** soft, radius 7px, padding 14px 16px.
- Background: `rgba(212, 168, 90, 0.03)` (gold veil ultra-leve).

**Nota: 7.5/10**

**Diagnóstico**
- Voz editorial Atlas honesta — "descobrir junto", "Atlas só promove quando você decide" = peso editorial Don Corleone, não chatbot.
- Serif italic + veil gold + line-height 1.55 = Mercury "graceful empty state".
- **Anti-pattern Apple/Linear**: `border: 1px dashed` é vibe "drag-and-drop dropzone" ou "form validation error" de Bootstrap 2015. Linear/Mercury/Stripe usam **solid hairline** com alpha 8-12% para qualquer container em rest state. Dashed só aparece em **dropzone ativo** (drag over).
- O veil gold `0.03` é tão sutil que pode passar despercebido em screen calibrado — quase invisible. Subir para `0.05` ou trocar por veil cool cream `rgba(233, 238, 242, 0.02)` neutro.

**Fix CSS concreto**
```css
.atlas-ai-plan-empty {
  margin: 0;
  padding: 16px 18px; /* era 14px 16px — Mercury 18px de respiro */
  border: 1px solid var(--cc-border-soft); /* era dashed → solid */
  border-radius: 6px; /* era 7 → 6 · canon radius semântico */
  background: rgba(233, 238, 242, 0.025); /* veil neutro, era gold 0.03 */
  color: var(--cc-text-muted);
  font-family: var(--cc-font-serif);
  font-style: italic;
  font-size: 13.5px; /* era 13 → 13.5 para legibilidade serif */
  line-height: 1.6;  /* era 1.55 → 1.6 Mercury */
  /* Hairline interior + sombra sutil = "container respirando", não "form error" */
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.02);
}
```

**Comparação Raycast detail pane**: Raycast usa empty state em **sans regular (não italic)** com cor faint. Serif italic é mais Mercury/Atlas editorial. Manter italic é DNA correto — só trocar dashed por solid.

### 1.5 Plan cards (quando há dados)

**Estado atual** (não visível no screenshot 79 porque thread está sem plano)
- `.atlas-ai-plan-card`: bg surface-raised, border soft, radius 7px, padding 12px 14px.
- Header uppercase 10.5px weight 600 tracking 0.08em.
- Body 13.5px weight 460 line-height 1.55.
- Variant `is-primary` com gradient gold subtle.
- Variant `is-warning` com warning veil.

**Nota: 8/10 (sem screenshot, baseado em código)**

**Diagnóstico**
- Estrutura excelente: header eyebrow + body + variantes semânticas.
- Bullet `›` accent (CSS@2627) em vez de `•` redondo = peso editorial.
- **Pequeno ajuste**: radius 7px é inconsistente com canon (4/6/8 + 9999). Padronizar para 6.

---

## ÁREA 2 · Composer (bottom bar)

### 2.1 Placeholder "Bug, debug, feature ou review — arrasta arquivo ou cola screenshot."

**Estado atual**
- Italic faint, sans 15px (textarea bg), line-height 1.6.
- Placeholder altera conforme `mode` (programming/operational/general).

**Nota: 8/10**

**Diagnóstico**
- Voz editorial correta: lista 4 verbos (Bug/debug/feature/review) + 2 affordances (arrastar/colar). Cursor v3 placeholder é "Plan, search, build anything"; Claude.ai usa "Reply to Claude...". Atlas tem mais especificidade operacional — bom DNA "instrumento operacional do dono".
- Italic placeholder = Mercury school. Funciona.
- **Pequeno excesso**: 13 palavras é levemente longo. Cursor/Claude usam 4-7 palavras. Mas mantém o tom Atlas — aceitável.

**Fix CSS concreto** (opcional, refinar contraste)
```css
.atlas-ai-composer-v2 .atlas-ai-textarea-v2::placeholder {
  color: var(--cc-text-faint);
  opacity: 0.85; /* era 1 — micro-afundar para placeholder não competir com texto digitado */
  font-style: italic;
  font-variation-settings: 'wght' 400; /* era 420 — placeholder ainda mais leve */
  letter-spacing: 0.005em;
}
```

### 2.2 Footer pill "Modo Programação · Dev"

**Estado atual**
- `.atlas-ai-cmenu-trigger`: sans 12.5px, weight 520, border 1px alpha 0.08, radius 8px, padding 5px 10px 5px 11px.
- Eyebrow "Modo" inline 9.5px uppercase tracking 0.08em weight 580 faint.
- Label "Programação · Dev" inline 12.5px weight 540 muted.
- Chevron 10x6px à direita, opacity 0.7.

**Nota: 6/10**

**Diagnóstico**
- Pill é Linear/Cursor school: hairline border, chevron compacto, eyebrow + label inline.
- **Problema 1 · redundância de eyebrow**: ter "Modo Programação · Dev" significa que "Modo" aparece duas vezes no mesmo pill (uma como eyebrow uppercase, outra como label). Operador lê: "Modo · Modo Programação · Dev". Cursor v3 dropa eyebrow completamente em pill mode — só "Agent" / "Ask" / "Plan".
- **Problema 2 · length**: "Programação · Dev" ocupa ~120-140px. No rail centro de 593-1100px (393px viewport), com 2 pills + token count + send + 2 icons → composer footer fica claustrofóbico.
- **Problema 3 · "·" separator**: separar Programação e Dev com "·" gold é editorial bonito mas cria duas cores no mesmo pill (cool cream + gold). Linear/Cursor usam um label só.

**Fix CSS concreto**
```css
/* Drop eyebrow inline — Linear/Cursor school. Label é auto-suficiente */
.atlas-ai-cmenu-eyebrow { display: none; }

/* Compactar pill — menos padding, peso label maior para compensar perda do eyebrow */
.atlas-ai-cmenu-trigger {
  padding: 5px 9px 5px 11px;  /* mantém */
  gap: 6px; /* era 7 — apertar */
}

.atlas-ai-cmenu-label {
  font-size: 12px; /* era 12.5 */
  font-variation-settings: 'wght' 560; /* era 540 — compensar drop do eyebrow */
  color: var(--cc-text-strong); /* era inherit muted — destacar label */
}
```

**E trocar o label JSX** (`AtlasAiComposer.tsx@282-284`):
```tsx
// Atual
const modePillLabel =
  mode === 'programming' ? `Programação · ${task}` : mode === 'operational' ? 'Operacional' : 'Geral'

// Sugerido — drop "Programação" prefix quando programming (redundante; o ícone/cor já indica)
const modePillLabel =
  mode === 'programming' ? task : mode === 'operational' ? 'Operacional' : 'Geral'
// Resultado: pill "Dev" / "Bug" / "Feature" — Cursor style, 4-6 chars
```

**Indicador alternativo**: glyph SVG à esquerda do label (atualmente `triggerIcon` é opcional e não usado). Adicionar `</>` para programming, `⊙` para operational, `⌘` para general. 14x14px, accent strong. Comunica modo sem texto longo.

### 2.3 Footer pill "provider Auto (Atlas Decide)"

**Estado atual**
- Mesmo `.atlas-ai-cmenu-trigger`.
- Label = `PROVIDER_OPTIONS.find(p => p.value === provider)?.label`. Para `auto`, é "Auto (Atlas Decide)" (12-14 chars + parênteses).
- Align end (CSS@3287).

**Nota: 5/10**

**Diagnóstico**
- "Auto (Atlas Decide)" é label barroco. Tem três sinais no mesmo lugar: "Auto" + parênteses + "Atlas Decide". Apple HIG: "one signal per affordance".
- Cursor v3 mostra "auto" ou model name ("claude-sonnet-4", "gpt-5"). Claude.ai mostra "Sonnet 4" / "Opus 4". Sempre 4-12 chars.
- "Atlas Decide" como suffix em paren é internal jargon — o operador nem sempre lembra o que significa. Se quiser preservar, mover para description dentro do menu sheet (já existe via `p.sub`).
- Resultado: pill ocupa 145-170px só pra "Auto (Atlas Decide)" — desproporcional em footer apertado.

**Fix CSS concreto** (no código, não CSS)
```tsx
// AtlasAiComposer.tsx@287-288
const currentProvider = PROVIDER_OPTIONS.find((p) => p.value === provider)
// Trocar label barroco por compact
const providerPillLabel = provider === 'auto' ? 'auto' : (currentProvider?.label ?? 'auto')
// "Atlas Decide" vai no description/sub do menu item
```

**Visual no pill**: "auto" minúsculo, mono opcional para reforçar que é um keyword de roteamento. 4 chars + chevron = ~50-60px. 60-70% de redução de width.

```css
/* OPÇÃO B · mono para provider pill (distingue do mode pill que é sans) */
.atlas-ai-cmenu-trigger.is-provider .atlas-ai-cmenu-label {
  font-family: var(--cc-font-mono);
  font-size: 11.5px;
  letter-spacing: 0;
}
```

### 2.4 Token count "~0 tokens"

**Estado atual**
- `.atlas-ai-composer-tokens`: mono 11px, color faint, tabular-nums.
- "~" prefix indica estimativa (não exato — bom DNA honesto).
- Sempre visível à direita das pills, antes do send.

**Nota: 9/10**

**Diagnóstico**
- Discrição perfeita. Mono + faint + tabular-nums = Linear/Cursor school para metadata read-only.
- "~" prefix é editorial Atlas — comunica que é estimativa, não verdade. Honesto.
- Quando há anexos, prepended com counter "1 img · 1 pdf" + " · " sep + tokens. Bom layout.
- **Único refinement**: 11px é o mínimo legível em macOS 2x retina. Em monitor 1x (operator no notebook + monitor externo), pode virar 9.5px efetivos e ficar inilegível. Subir para 11.5px.

**Fix CSS concreto** (micro)
```css
.atlas-ai-composer-counter,
.atlas-ai-composer-tokens {
  font-size: 11.5px; /* era 11 — micro-bump para tela 1x */
  /* opacity 0.95 mantém faint, mas legível */
}
```

### 2.5 Attach 📎 button (icon-only)

**Estado atual**
- `.atlas-ai-icon-btn`: 30x30px, radius 8, border transparent, color muted.
- Hover: bg 0.06 + border 0.08 + color strong.
- SVG paperclip 14x14px, stroke 1.7.

**Nota: 7/10**

**Diagnóstico**
- Icon-only correto — Apple HIG / Linear: ações secundárias (anexar) ficam icon-only com tooltip; ações primárias (enviar) ficam labeled.
- **Problema 1 · paperclip frágil**: stroke 1.7 + glyph SVG complexo (curva paperclip) fica magrinho/quebrado em 14px. Cursor v3 usa paperclip preenchido (`fill` em vez de stroke) ou `+` simples (12x12px sólido). Claude.ai usa `+` redondo com bg circular.
- **Problema 2 · ambiguidade com "+" (nova thread)**: ao lado tem outro `.atlas-ai-icon-btn` com `+` (nova thread). Dois icon-only sem distinção visual entre attach (paperclip) e new thread (+) cria confusão. Operador hesita.
- **Problema 3 · falta de label visível**: drag-and-drop e paste funcionam (código tem handlers), mas operador novo não descobre. Tooltip resolve mas só aparece após 600ms hover.

**Fix CSS concreto**
```css
/* Paperclip mais robusto — engrossar stroke + reduzir complexity */
.atlas-ai-icon-btn svg {
  /* No JSX: stroke-width="2" em vez de 1.7 */
}

/* OU melhor: trocar paperclip por glyph mais sólido tipo "+" com bg veil quando ativo */
.atlas-ai-icon-btn.is-attach {
  /* Glyph alternativo · ↗ ou ⎘ ou + + atalho visible "⌘V para colar" */
}
```

**Fix JSX recomendado** (`AtlasAiComposer.tsx@438-440`):
```tsx
// Atual: paperclip stroke 1.7 (frágil)
<path d="M14.2 8 8 14.2a3.6 3.6 0 0 1-5.1-5.1l6.6-6.6a2.4 2.4 0 0 1 3.4 3.4l-6.6 6.6a1.2 1.2 0 0 1-1.7-1.7L11 5" />

// Sugerido · stroke 2 + path simplificado (paperclip Linear school)
<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
  <path d="M11 4.5v6.5a3 3 0 0 1-6 0V4a2 2 0 0 1 4 0v6.5a1 1 0 0 1-2 0V5" />
</svg>
```

**Recomendação alternativa · usar label compacto** (Cursor v3 pattern):
- Em vez de icon-only com tooltip, mostrar "anexar" sans 11px uppercase ao lado do paperclip quando o composer está em foco. Drop label quando idle/digitando.
- Discoverable + economiza tooltip.

### 2.6 Send button gold gradient

**Estado atual**
- `.atlas-ai-send-btn`: bg gradient `linear-gradient(180deg, var(--cc-accent-strong) 0%, var(--cc-accent) 100%)`.
- Color `#15212a` (slate dark — bom para legibilidade em gold).
- Border 1px accent-strong, radius 8.
- 3 box-shadows stacked: inset highlight + 1px dark + 6-16px gold glow.
- Hover: gradient invertido + transform translateY(-0.5px) + glow expandido.

**Nota: 6/10**

**Diagnóstico**
- **Exagerado para o contexto Atlas Codex Slate Premium**. O DNA canon é "peso silencioso, não sussurro" — gold deve ser presença, não show.
- Stripe/Notion Calendar/Cursor usam send button **flat filled** (sem gradient) em primary color, com **1 shadow sutil** ou nenhuma. O gold de Atlas (`#d4a85a`) já é vivo o suficiente para não precisar de gradient.
- 3 shadows stacked + hover lift -0.5px + glow expansion = "demo SaaS 2019" / "Mercury 2020 pre-redesign". Mercury 2024 e Linear 2024 ambos removeram gradient + lift do primary button.
- Border 1px na mesma cor que o bg = redundante. Linear: drop border, deixa sombra cuidar do edge.

**Fix CSS concreto** (Codex Slate Premium correct)
```css
/* Send button · flat filled, peso silencioso · Linear/Mercury 2024 school */
.atlas-ai-send-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--cc-accent);            /* flat, era gradient */
  color: #15212a;                          /* mantém — slate dark sobre gold */
  border: none;                            /* era 1px accent-strong */
  border-radius: 8px;
  padding: 7px 14px 7px 16px;
  font-family: var(--cc-font-sans);
  font-size: 13px;
  font-variation-settings: 'wght' 600;     /* era 620 — micro-afundar */
  letter-spacing: 0;
  cursor: pointer;
  transition:
    background 180ms var(--cc-ease-out),
    box-shadow 180ms var(--cc-ease-out);   /* drop transform */
  /* Single shadow — peso, não show */
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.16),
    0 1px 2px rgba(0, 0, 0, 0.18);
}

.atlas-ai-send-btn:hover:not(:disabled) {
  background: var(--cc-accent-strong);      /* darken on hover, era gradient flip */
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.22),
    0 2px 4px rgba(0, 0, 0, 0.22);
  /* drop translateY — peso silencioso, ZERO lift */
}

.atlas-ai-send-btn:active:not(:disabled) {
  background: var(--cc-accent-strong);
  box-shadow:
    inset 0 1px 2px rgba(0, 0, 0, 0.18),    /* invertido — feedback de pressão */
    0 1px 0 rgba(0, 0, 0, 0.12);
}

.atlas-ai-send-btn:disabled {
  background: var(--cc-surface-raised);
  color: var(--cc-text-faint);
  border: 1px solid var(--cc-border-soft);
  box-shadow: none;
  opacity: 0.55;
}

.atlas-ai-send-btn:focus-visible {
  outline: none;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.22),
    0 0 0 3px rgba(212, 168, 90, 0.32);     /* focus ring sutil */
}
```

**Princípio Codex Slate Premium**: "status dots ESTÁTICOS (pulse halo cafona REMOVIDO)" do canon project. O send button é o ponto de maior visibilidade no composer — qualquer shimmer/glow extra contamina o silêncio.

### 2.7 "+" new thread icon

**Estado atual**
- `.atlas-ai-icon-btn` com SVG `+` (12x12 viewbox, stroke 1.7).
- Title="Nova thread (envia sem entrar na atual)".

**Nota: 7/10**

**Diagnóstico**
- Funcional, mas **ambíguo** ao lado do send button: visualmente é um `+` neutro; semanticamente é "envia em nova thread" (ação destrutiva-ish — pode confundir operador apertado).
- Cursor v3 esconde "new chat" no menu chevron do send button (split button pattern). Claude.ai usa "+" no header da lista, não no composer.

**Recomendação**
- Mover "+" new thread para o **menu do send button** (split-button Linear school):
  - Botão principal = "enviar" (gold)
  - Chevron à direita = abre menu com "Nova thread" + "Cancelar agendamento" + futuros
- Resultado: 2 icon-only viram 0 icon-only + 1 send + 1 split-chevron. Limpa o composer.

---

## Fixes prioritários (ordem de impacto)

1. **CRÍTICO** · Remover "box filled" residual do active tab Plano (CSS@2510 + inspect element)
2. **CRÍTICO** · Trocar gold gradient + 3 shadows do send button por flat filled + 2 shadows (Codex Slate Premium canon)
3. **ALTO** · Compactar pill label `provider`: "Auto (Atlas Decide)" → "auto"
4. **ALTO** · Drop eyebrow inline do pill `Modo`: "Modo · Programação · Dev" → "Dev" (com glyph opcional)
5. **MÉDIO** · Trocar dashed border do empty state Plano por solid hairline + veil neutro
6. **MÉDIO** · Drop eyebrow "PLANO DA CONVERSA" (redundante com tab)
7. **BAIXO** · Engrossar paperclip stroke 1.7 → 1.8-2.0 para robustez visual
8. **BAIXO** · Considerar split-button send com chevron para "Nova thread" (reduz 2 icons no footer)

---

## Comparativos · onde Atlas hoje supera / fica abaixo

| Aspecto | Atlas hoje | Cursor v3 | Claude.ai | Linear cmd-K | Raycast | Mercury |
| --- | --- | --- | --- | --- | --- | --- |
| Pill mode/provider | hairline + eyebrow + chevron | hairline + label only (no eyebrow) | dropdown sans eyebrow | filter pill sans accent | n/a (não tem composer) | sans pill chip |
| Send button | gold gradient + 3 shadows + lift | flat blue accent + 1 shadow | flat purple + 0 shadow | n/a | n/a | flat green + 0 shadow |
| Attach icon | paperclip stroke 1.7 | `+` icon-only solid | `+` rounded bg | n/a | n/a | paperclip stroke 2 |
| Token count | mono faint tabular `~0 tokens` | mono faint `0 / 200k` | hidden | n/a | n/a | n/a |
| Empty state | serif italic + dashed + veil gold | sans muted | sans italic | n/a | sans regular muted | serif italic + solid hairline + neutral veil |
| Tab active | underline gold | underline blue | tab bg subtle filled | underline accent | n/a | underline brand |
| Eyebrow above panel | yes (uppercase tracking) | no | no | no | no | yes |

**Onde Atlas supera**: voz editorial dos placeholders e empty states, serif italic disciplinado, gold accent canon, token count honesto com "~", letter-spacing 0 corpo (não over-tracked).

**Onde Atlas fica abaixo**: send button gold gradient (Stripe-grade exagerado), pill labels longos com eyebrow redundante, dashed border anti-pattern, ambiguidade entre attach + new-thread icon-only buttons.

---

## Checklist de validação pós-fix

- [ ] DevTools inspect `.atlas-ai-side-tab.is-active` → `background-color: rgba(0,0,0,0)` (transparente)
- [ ] Send button screenshot ao lado de Linear primary CTA → diferença é só cor, não "shine"
- [ ] Pill "Modo" + Pill "Provider" cabem em footer width 360px sem overflow
- [ ] Empty state Plano com `border: 1px solid` (não dashed) e veil neutro
- [ ] Paperclip SVG inspect → stroke-width="1.8" mínimo
- [ ] Eyebrow "PLANO DA CONVERSA" removida do JSX `AtlasAiPlanPanel.tsx@58`
- [ ] Rodar build verde + screenshot pra comparar 79 vs 80 antes/depois

---

## Sources & references

- [Cursor 3: Agents Window, Design Mode](https://www.digitalapplied.com/blog/cursor-3-agents-window-design-mode-complete-guide) — confirma pill mode pattern + skill chips
- [How we redesigned the Linear UI (part II)](https://linear.app/now/how-we-redesigned-the-linear-ui) — filter pills + dark mode + hairline disciplines
- [Mercury — token-based semantic color system](https://mercury.com/blog/inside-mercury/december-2022-product-updates) — pill chip + dark mode rules
- [Badges vs Pills vs Chips vs Tags](https://smart-interface-design-patterns.com/articles/badges-chips-tags-pills/) — taxonomy + when to use eyebrow
- [Raycast List + Detail API](https://developers.raycast.com/api-reference/user-interface/detail) — empty state guidance
- [Linear command palette redesign](https://linear.app/changelog/2024-03-20-new-linear-ui) — drop filled bg em active tab, hairline only
