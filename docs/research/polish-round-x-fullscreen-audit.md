# Polish Round X — Fullscreen Audit (pixel-perfect)

> **Auditoria brutal pós-9-rounds.** Screenshot `atlas-ai-current-deploy-79.png`.
> Tela bombardeada com slate `#1d2b34` + gold `#d4a85a`. Build live, com
> Phase 1 + 1.5 + 2 spec aplicado. Operador segue chamando de amador.
> Esta auditoria explica por quê — sem hipótese, só evidência no pixel.

---

## 1. Resumo executivo

A tela ainda lembra duas escolas amadoras em conflito, não uma escola enterprise coesa:

1. **"Free Bootstrap admin theme 2018"** — quadrados de cards com borda hairline + radius 8 + box-shadow stack repetidos em TODOS os blocos (header bar, conversa, composer, rails). O olho não tem um único centro de gravidade. Apple/Linear não empilham caixas; Apple usa **um plano** (canvas), Linear usa **hairlines invisíveis** + tipografia decrescente. Atualmente Atlas AI tem 4 caixas concorrentes na mesma tela (header bar com gradient + border, conversation card com border+shadow, composer card com border+shadow inverso, rails sunken visíveis). Resultado: tela parece um dashboard de plugins WordPress, não uma cabine premium.

2. **"Discord/Slack-like dark theme"** — slate teal `#1d2b34` é correto, mas o uso de **gradients verticais sutis** (header bar 95% slate, composer v2 com layer translúcida 42%→62%, stage com radial gradient gold) cria uma "iluminação ambiente" cinemática que combina mal com a aspiração editorial enterprise. Apple (Pro app dark) e Linear são **achatados** (flat): canvas único, hairlines, sombras só onde há elevação real (popovers/menus). Cada gradient extra é uma régua a mais que o olho tem que reconciliar.

**Diagnóstico precise:** o problema não é mais cor/fonte/peso. Foi resolvido nos 9 rounds. **O problema é spatial composition (proximidade e elevação) e visual density management (silêncio).** Atlas AI tem qualidade de partes (tipografia OK, gold parcimônia OK, eyebrow corretos) mas QUANTIDADE de elementos visíveis simultaneamente — cada um respeitável — soma para um look de painel-de-cockpit, não de ferramenta de leitura prolongada. Linear/Mercury/Stripe são **silenciosos**; Atlas AI ainda **fala alto demais**.

Anti-padrões persistentes (lista curta, evidências adiante):

- 3 surfaces concorrentes empilhadas (`atlas-ai-header-bar` 70px → `atlas-ai-conversation-header` 17px H2 → `atlas-ai-message-header` role caps) competindo pela mesma fixação do olho.
- Composer com border-radius 14 + gradient layered + atlas-ai-conversation com border-radius 9 + shadow 3-stack = dois "objetos" pesados separados por uma tira escura, como se fossem dois apps abertos lado a lado.
- Counter `~0 tokens` em mono, hairline borda gold no send btn, gradient gold-on-gold no send, glyph SVG arrow → tudo ao mesmo tempo no rodapé. Quantidade de elementos premium "polidos" misturados causa o efeito "tudo importa = nada importa".
- Right rail `Plano da conversa` com placeholder italic serif em **caixa dashed warm** sobrando — única superfície dashed da tela inteira. Apple/Linear: dashed border é debug.
- Surface tab `Atlas AI 1 · Code 2 · Atenção 60 3 · Cartografia 4` com badge `60` em pill gold sólido + label normal: badge dominantemente visual num topbar que precisa ser **periférico**, não centro.

---

## 2. Tabela auditada — 32 elementos

Notas 1-10 (10 = Apple/Linear enterprise standard).

| # | Elemento | CSS scope | Nota | Diagnóstico amador (1 linha) | Princípio violado |
|---|---|---|---|---|---|
| 1 | Topbar surface tabs `Atlas AI 1` | `.surface-tab .surface-tab-shortcut` | 6.5 | Shortcut "1" em mono uppercase acopladíssimo ao label sem hierarquia visual; tabs ativam com filled raised + border + shadow xs = 3 sinais redundantes pra "selecionado" | Linear: 1 sinal de seleção (sublinhado OU peso, não ambos+) |
| 2 | Surface tab badge `Atenção 60` | inline style no `surface-tab-badge` | 4 | Pill gold sólido com `#1d2b34` text num topbar que devia ser quiet → 60 grita "olha aqui" mesmo sem clicar. Pill bg = warning, color = bg slate → dois acentos colados | Mercury HIG: badge counter = ink-muted dot+number, não pill saturado |
| 3 | Workspace pill `◆ ATLAS` | `.atlas-project-strip-name` | 7 | Glyph `◆` antes de "ATLAS" é uppercase tracking-wide — parecido com "BRAND" header, não com workspace ativo | Apple HIG: workspace label é meta, não branding |
| 4 | Atlas AI header bar h1 "Atlas AI" | `.atlas-ai-header-bar-title h1` | 6 | H1 17px peso 620 + p subtitle 12px abaixo em **duas linhas** "Uma única inteligência · Geral...workspace ativo: atlas" — texto longuíssimo, quebra na vertical, peso editorial alto roubando atenção do conteúdo central | Stripe/Linear: header é navegação, não manifesto |
| 5 | Header bar `gradient + box-shadow + backdrop-filter blur` | `.atlas-ai-header-bar` | 5 | Gradient `36,55,67 0% → 28,44,55 100%` + inset 0.025 + shadow + blur+saturate(120%) = 5 efeitos compostos numa barra de 50px. Soa fancy isolado, vira ruído composto | Apple Pro dark: header é flat, hairline-bottom apenas |
| 6 | Calmaria/promover→ link area | `.atlas-ai-link` + `.atlas-ai-calmaria-toggle` | 7 | OK individualmente, mas 2 links text-only `calmaria · ativa` (italic gold quando ON) e `promover para Forge →` próximos do toggle button = 3 "objects" no mesmo grupo, sem agrupamento spacial | Apple HIG: grouped controls precisam de proximidade clara |
| 7 | Left rail `Conversas + nova` | `.atlas-ai-history-header` | 7.5 | OK, mas h3 13px peso 580 + "+ nova" em link gold pequeno = balanced. Pequeno crime: lowercase "+ nova" parece chat amador (gh/slack), não Linear |
| 8 | Filter tabs `todas · geral · ops · dev` | `.atlas-ai-filter-tab` | 6 | Tabs filled veil-gold quando ativa criam 4 pequenas pill-boxes amontoadas. Linear/Stripe usam tabs hairline-bottom OU caps eyebrow sem fill | Linear filter row school: filter = quiet caps row, sem pílula |
| 9 | Refresh button `↻` | `.atlas-ai-refresh` | 6 | Glyph unicode `↻` num square 26x22 com border — parece ASCII bot 2010 sob lupa enterprise. Outros buttons da tela usam SVG limpo | Apple HIG: nunca system glyph num app premium |
| 10 | "PROJETOS" eyebrow | `.atlas-ai-tree-section-head` | 8 | Eyebrow caps 10.5px tracking 0.1em ink-faint — correto Apple Caption 2. Pequeno crime: gap 16px abaixo poderia respirar mais |
| 11 | Folder header `▾ atlas 31` | `.atlas-ai-folder-head` | 7 | OK, mas caret `▾` unicode dá feeling MSN 2008 + folder svg outlined + name + count mono `31` = 4 elementos compactos. Linear/Stripe usam um único ícone chevron limpo, count discreto à direita | Codex/Linear: hierarquia tree = caret OR icon, não ambos |
| 12 | Thread row `Esta funcionando ?` | `.atlas-ai-thread-button` | 7.5 | Texto 13px peso 520 OK. Active state: bg accent-veil + border accent-border + caps eyebrow indented = bom mas o veil gold é forte demais quando a única tarefa é "esta linha está focada" |
| 13 | Thread time `5h` | `.atlas-ai-thread-time` | 8 | OK, mono compact ink-faint. |
| 14 | "Mostrar mais" link | `.atlas-ai-show-more` | 7 | Indented 22px, font-size 11.5, OK. Pequeno crime: gold hover `rgba(212,168,90,0.06)` background no hover poluindo "calmness" do rail |
| 15 | Conversation card outer box | `.atlas-ai-conversation` | 4 | **PIOR ELEMENTO.** Card slate `#243743` com border + radius 9 + triple shadow stack (inset + bottom + 18px40px) DENTRO de um stage que JÁ tem gradient radial gold de fundo. Resultado: o conteúdo principal vira "uma caixa flutuando num palco bonito" — exatamente o anti-padrão Apple Pro (Apple Pro: conteúdo USA o canvas, não flutua sobre ele) | Apple HIG: edge-to-edge content, no nested-card. Linear: conteúdo principal = chromeless |
| 16 | Conversation H2 `Esta funcionando ?` | `.atlas-ai-conversation-header h2` | 8 | Inter 17px peso 580 letter-spacing -0.011em — Apple Books spirit OK. Pequeno crime: 17px é igual ao H1 da header bar = duas H1 competindo na vertical |
| 17 | Conversation meta `programming · atlas · 0` | `.atlas-ai-conversation-meta` | 7 | OK no princípio. Crime: 4 segmentos com 3 separadores `·` num ink-faint cinza num espaço de 60ch = string pesada de informação meta antes do conteúdo | Apple HIG: meta = subordinada, ≤ 3 segments visíveis |
| 18 | Conversation header bottom divider gradient fade | `.atlas-ai-conversation-header::after` | 9 | Gradient hairline 90deg fade-out — Apple Books spirit, melhor item da tela |
| 19 | Conversation actions `promover → · arquivar` | `.atlas-ai-conversation-actions` | 6 | "promover →" em gold + "arquivar" em italic ink-faint AO LADO de "promover para Forge →" no header bar. **Botão duplicado em 2 superfícies** = confusão de hierarquia | Linear/Mercury: ação única por contexto, não repetida |
| 20 | Message role label `ATLAS AI` caps | `.atlas-ai-message-role` | 8 | Caps 10.5px peso 600 tracking 0.06em ink-faint — Apple Caption 2 canon |
| 21 | Message meta `4o-mini · 1h atrás` | `.atlas-ai-message-meta` | 7.5 | OK. Pequeno crime: hairline 1px border-left azul 0.34 muito sutil — quase invisível, perde a função semafórica de "isso é atlas" |
| 22 | Message body 14.5px / lh 1.62 | `.atlas-ai-message-body` | 9 | Tipografia editorial canon (Apple Books / NYT) — melhor item de leitura |
| 23 | ✦ divider editorial gold | `.atlas-ai-md-rule-editorial` | 9 | Hairline fade + diamond gold com text-shadow — canon NYT Magazine, bem feito |
| 24 | Bullets `·` gold weight 700 | `.atlas-ai-md-ul li::before` | 6 | Bullet `·` em gold weight 700 opacity 0.85 — é centered/baseline misaligned em line-heights 1.7. Linear usa bullet SLIM em ink-muted, não accent | Stripe/Linear: bullet = punctuation, not accent |
| 25 | "open brain · parcial" italic line | `.atlas-ai-openbrain-line.tone-partial` | 7.5 | Italic serif gold opacity 0.75 — OK silent. Pequeno crime: ao lado de uma reaction row tem peso visual redundante |
| 26 | Reaction row 👍 👎 | `.atlas-ai-msg-actbtn` | 7 | OK na ausência (opacity 0.55 default → 1 on hover). Crime: ícones unicode emojis no slate dark com hover bg parece chat react Telegram, não Apple/Linear |
| 27 | Right rail tabs `Contexto · Plano` | `.atlas-ai-rail .atlas-ai-side-tab` | 6 | Active gold sublinhado correto, mas tabs muito juntos no top do rail (margin: 0 -12px 12px) e fundo é sunken = caixa flutuando dentro do rail. Plano ativo tem text-strong + 580 weight + underline gold = 3 sinais (peso, cor, sublinhado) | Linear cmd-K: 1 sinal de seleção |
| 28 | "PLANO DA CONVERSA" eyebrow | `.atlas-ai-context-eyebrow` | 8 | Apple Caption 2 canon. Pequeno crime: redundante com Tab "Plano" 5px acima — eyebrow repete a tab |
| 29 | Plan empty placeholder italic | `.atlas-ai-plan-empty` | 4 | **CRIME SECUNDÁRIO.** Caixa dashed warm `rgba(212,168,90,0.03)` border `dashed` border-soft + radius 7 + padding 14x16 + serif italic 13px = uma única caixa dashed na tela inteira gritando "vazio aqui mesmo". Linear/Mercury: empty state = um único parágrafo italic sem caixa | Apple HIG: empty state = inline italic, nunca caixa decorativa dashed |
| 30 | Composer outer box | `.atlas-ai-composer-v2` | 5 | Radius 14 (vs 9 do conversation) + gradient layered slate + border 0.10 + 4-stack shadow + on-focus glow gold ring → composer parece um **objeto flutuante separado** da conversa | Apple Pro: composer faz parte do canvas, hairline-top apenas |
| 31 | Composer footer `📎 Programação Auto ~0 tokens enviar →` | `.atlas-ai-composer-bar` | 6 | 6 elementos numa única linha sem separação visual clara: icon attach + Modo pill + Provider pill + counter mono + nova thread icon + send pill gold. Tudo é "primary candidate" pelo styling, embora apenas 1 (send) seja primário | Apple HIG: 1 botão primário por footer; resto = secundário grátis |
| 32 | Send button gradient gold | `.atlas-ai-send-btn` | 7.5 | Gradient gold + inset 0.20 + shadow 0.22 + on-hover translateY(-0.5px) — Apple Pro spirit OK isolado. Crime: o glyph `→` (SVG line + polyline) ao lado da palavra "enviar" é redundante (Enter envia) — duplica significado |

**Notas <6 (oito críticas):** #2 badge, #15 conversation box, #29 plan empty dashed, #30 composer box, #5 header bar gradient stack, #8 filter tabs, #9 refresh glyph, #19 botão duplicado.

---

## 3. Top 10 fixes priorizados por impacto visual

### Fix 1 — Quebrar a "card-em-card" da conversation (impacto MUITO alto)

**Problema:** O `.atlas-ai-conversation` é um card slate com border + radius 9 + triple shadow flutuando sobre o stage que já tem radial gradient gold + slate canvas. Dois planos elevados na mesma tela é o que mais grita "amador" pixel-by-pixel.

**Princípio:** Apple Pro / Linear / Mercury — **chromeless content area**. Conversa é o **conteúdo**, não um widget. Stage = canvas, conversa = leitura, sem caixa.

**Fix CSS:**

```css
/* ANTES (linhas 662-679) */
.atlas-ai-conversation {
  background: var(--cc-surface);
  border: 1px solid var(--cc-border-soft);
  border-radius: 9px;
  padding: 18px 22px 18px;
  /* ... */
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.025),
    0 1px 0 rgba(0, 0, 0, 0.20),
    0 18px 40px rgba(5, 12, 18, 0.20);
}

/* DEPOIS — chromeless */
.atlas-ai-conversation {
  background: transparent;
  border: none;
  border-radius: 0;
  padding: 0 8px 0;
  /* ... */
  box-shadow: none;
}
```

E remover o radial gradient gold do stage para deixar canvas slate puro:

```css
/* atlas-ai.css linhas 214-223 — DELETAR ou reduzir a opacidade pra 0.020/0.012 */
.atlas-ai-stage::before {
  background:
    radial-gradient(ellipse 90% 60% at 50% 0%, rgba(212, 168, 90, 0.020) 0%, transparent 60%);
}
```

### Fix 2 — Composer plano, sem caixa flutuante (impacto MUITO alto)

**Problema:** Composer v2 com radius 14 + gradient layered slate + border ink-soft + 4-stack shadow vira "objeto separado", quebra o eixo de leitura conversa→composer.

**Princípio:** Apple Pro composer (Mail/Notes) = canvas único, hairline-top com fade gold quando focused. Não é uma "card de input".

**Fix CSS:**

```css
/* ANTES (linhas 2988-3001) */
.atlas-ai-composer.atlas-ai-composer-v2 {
  padding: 14px 18px 12px;
  background:
    linear-gradient(180deg, rgba(45, 67, 81, 0.42) 0%, rgba(36, 55, 67, 0.62) 100%),
    var(--cc-surface);
  border: 1px solid rgba(233, 238, 242, 0.10);
  border-radius: 14px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.035),
    0 -1px 0 rgba(0, 0, 0, 0.22),
    0 -10px 28px rgba(5, 12, 18, 0.28),
    0 18px 40px rgba(5, 12, 18, 0.18);
}

/* DEPOIS — plano, hairline-top apenas, integrado ao stage */
.atlas-ai-composer.atlas-ai-composer-v2 {
  padding: 14px 0 8px;
  background: transparent;
  border: none;
  border-top: 1px solid var(--cc-border-soft);
  border-radius: 0;
  box-shadow: none;
}
.atlas-ai-composer-v2:focus-within {
  border-top-color: rgba(212, 168, 90, 0.32);
  box-shadow: 0 -8px 24px -10px rgba(212, 168, 90, 0.10);
}
```

Já existe `.atlas-ai-stage-composer` envolvendo com `border-top + bg`. Remover o card interno deixa esse wrapper fazer o trabalho. Resultado: composer "vive" no canvas do stage, igual Claude.ai/Codex.

### Fix 3 — Header bar plano slate (impacto alto)

**Problema:** Header bar com gradient `36,55,67→28,44,55` + inset + shadow + `backdrop-filter: blur(12px) saturate(120%)` = 5 efeitos compostos para uma região de 50px. Vira um app dentro do app.

**Princípio:** Apple Pro top bar = flat surface + hairline-bottom. Linear = pure background. Backdrop blur só faz sentido se houver conteúdo escrolando por baixo (não há aqui — header bar é fixed, content scrolla em outra zona).

**Fix CSS:**

```css
/* ANTES (linhas 55-70) */
.atlas-ai-header-bar {
  background:
    linear-gradient(180deg, rgba(36, 55, 67, 0.95) 0%, rgba(28, 44, 55, 0.95) 100%),
    var(--cc-surface);
  border-bottom: 1px solid var(--cc-border-soft);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.025),
    0 1px 0 rgba(0, 0, 0, 0.30);
  backdrop-filter: blur(12px) saturate(120%);
  -webkit-backdrop-filter: blur(12px) saturate(120%);
}

/* DEPOIS — flat, hairline-bottom, sem blur */
.atlas-ai-header-bar {
  background: var(--cc-surface);
  border-bottom: 1px solid var(--cc-border-soft);
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}
```

### Fix 4 — Encurtar subtitle do header bar para 1 linha (impacto alto)

**Problema:** Subtitle atual "Uma única inteligência · Geral, Operacional e Programação são modos do mesmo Atlas AI · Workspace ativo: atlas" — texto longuíssimo, manifesto editorial num header.

**Princípio:** Apple HIG: title + subtitle = identificação imediata, não manifesto. Subtitle ≤ 60 chars.

**Fix JSX (`AtlasAiSurface.tsx` linha 278-281):**

```tsx
// ANTES
<p className="atlas-ai-header-bar-sub">
  Uma única inteligência · Geral, Operacional e Programação são modos do mesmo Atlas AI
  {activeWorkspaceName ? ` · Workspace ativo: ${activeWorkspaceName}` : ''}
</p>

// DEPOIS — uma frase quiet
<p className="atlas-ai-header-bar-sub">
  Conversa com Atlas{activeWorkspaceName ? ` · ${activeWorkspaceName}` : ''}
</p>
```

### Fix 5 — Plan empty: drop a caixa dashed warm (impacto médio-alto)

**Problema:** Único elemento com border-dashed na tela inteira. Em ambiente premium, dashed = debug/draft.

**Princípio:** Apple HIG / Linear empty state = inline italic ink-faint, **nunca** caixa decorativa.

**Fix CSS (`.atlas-ai-plan-empty`, linhas 2546-2557):**

```css
/* ANTES */
.atlas-ai-plan-empty {
  margin: 0;
  padding: 14px 16px;
  border: 1px dashed var(--cc-border-soft);
  border-radius: 7px;
  background: rgba(212, 168, 90, 0.03);
  color: var(--cc-text-muted);
  font-family: var(--cc-font-serif);
  font-style: italic;
  font-size: 13px;
  line-height: 1.55;
}

/* DEPOIS — apenas italic ink-faint, sem caixa */
.atlas-ai-plan-empty {
  margin: 0;
  padding: 8px 0;
  border: none;
  background: transparent;
  color: var(--cc-text-faint);
  font-family: var(--cc-font-serif);
  font-style: italic;
  font-size: 13px;
  line-height: 1.55;
  max-width: 38ch;
}
```

### Fix 6 — Surface tab badge quiet (impacto médio-alto)

**Problema:** Badge `60` em pill gold sólido com `--cc-bg` color: dois acentos colados no topbar que devia ser periférico.

**Princípio:** Mercury counter pattern — número em mono ink-strong com dot ou parêntese, sem fill.

**Fix JSX (`SurfaceSwitcher.tsx`, remove inline style and use CSS class):**

```tsx
// ANTES (linhas 70-93)
{hasBadge ? (
  <span
    className="surface-tab-badge"
    style={{
      background: 'var(--cc-warning, #d4a85a)',
      color: 'var(--cc-bg, #1d2b34)',
      fontWeight: 600,
      // ...
    }}
  >
    {badge > 99 ? '99+' : badge}
  </span>
) : null}

// DEPOIS — span limpa, estilo via CSS
{hasBadge ? (
  <span className="surface-tab-badge" aria-label={`${badge} de atenção`}>
    {badge > 99 ? '99+' : badge}
  </span>
) : null}
```

CSS novo (em `index.css` no scope `.atlas-shell.surface-code` ou shared):

```css
.surface-tab .surface-tab-badge {
  font-family: var(--cc-font-mono);
  font-size: 10px;
  font-variation-settings: 'wght' 540;
  color: var(--cc-text-faint);
  background: transparent;
  padding: 0;
  margin-left: 6px;
  letter-spacing: 0;
  font-variant-numeric: tabular-nums;
}
.surface-tab.on .surface-tab-badge {
  color: var(--cc-accent);
}
```

### Fix 7 — Bullet `·` ink-muted, não gold (impacto médio)

**Problema:** Bullets gold weight 700 em listas longas roubam atenção do conteúdo. Stripe Press / Linear: bullet = punctuation discreta.

**Princípio:** "Cada uso adicional de gold dilui o sinal." Bullet aparece N vezes por mensagem → dilui ✦ divider e action primária.

**Fix CSS (linhas 2125-2136):**

```css
/* ANTES */
.atlas-ai-md-ul li::before {
  content: '·';
  position: absolute;
  left: 8px;
  top: 1px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--cc-accent);
  font-variation-settings: 'wght' 700;
  opacity: 0.85;
}

/* DEPOIS — bullet quiet */
.atlas-ai-md-ul li::before {
  content: '·';
  position: absolute;
  left: 8px;
  top: 1px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--cc-text-faint);
  font-variation-settings: 'wght' 600;
  opacity: 0.65;
}
```

Gold permanece em: action primary (send), ✦ divider, link interativo, numerais romanos H3, accent rare actions.

### Fix 8 — Filter tabs: drop pill fill, use ink hierarchy (impacto médio)

**Problema:** 4 pílulas mini-bg veil-gold quando ativa amontoadas. Linear filter row = caps row hairline, sem pílula.

**Princípio:** Linear cmd-K / Stripe filter: 1 sinal de ativação (peso ink-strong) basta.

**Fix CSS (linhas 434-461):**

```css
/* ANTES — filled veil active */
.atlas-ai-filter-tab.is-active {
  background: var(--cc-accent-veil);
  border-color: var(--cc-accent-border);
  color: var(--cc-accent-strong);
}

/* DEPOIS — quiet, peso só */
.atlas-ai-filter-tab {
  background: transparent;
  border: none;
  border-radius: 0;
  padding: 3px 8px 3px 0;
  /* ... */
  color: var(--cc-text-faint);
  font-variation-settings: 'wght' 500;
}
.atlas-ai-filter-tab:hover {
  color: var(--cc-text-strong);
  background: transparent;
}
.atlas-ai-filter-tab.is-active {
  background: transparent;
  border: none;
  color: var(--cc-text-strong);
  font-variation-settings: 'wght' 600;
}
```

### Fix 9 — Refresh button: drop unicode `↻`, use SVG (impacto baixo-médio)

**Problema:** Glyph `↻` no `.atlas-ai-refresh` (linha 463-481) parece bot ASCII 2010 do lado de SVGs limpos no resto da tela.

**Princípio:** "Apple HIG: nunca system glyph num app premium."

**Fix JSX (`AtlasAiThreadList.tsx` linha 261):**

```tsx
// ANTES
{loading ? '…' : '↻'}

// DEPOIS — SVG reload
{loading ? (
  <span aria-hidden="true">…</span>
) : (
  <svg viewBox="0 0 14 14" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M11.5 4.5a4.5 4.5 0 1 0 1 3.5" />
    <polyline points="11.5 1.5 11.5 4.5 8.5 4.5" />
  </svg>
)}
```

### Fix 10 — Remover botão "promover" duplicado (impacto médio)

**Problema:** "promover para Forge →" aparece no header bar (linha 311-317) E "promover →" aparece nas conversation actions (AtlasAiConversation.tsx linha 322-329). Mesma ação, 2 entrypoints → confusão de hierarquia.

**Princípio:** Linear/Mercury: ação única por contexto. Promote vive no header bar (workspace-level) OU na conversa (thread-level), não ambos.

**Fix JSX (`AtlasAiSurface.tsx`, remover do header bar; manter apenas na conversation):**

```tsx
// ANTES (linhas 310-317)
<button
  type="button"
  className="atlas-ai-link"
  onClick={() => onRequestSurfaceChange?.('code')}
  title="Atlas Code · cabine para problemas ultra-hard"
>
  promover para Forge →
</button>

// DEPOIS — remover do header bar. Manter apenas onPromote dentro de AtlasAiConversation
// (já existe lá). Header bar fica só com calmaria + toggles.
```

Header bar fica: rail toggle | título | (espaço) | calmaria | rail toggle. Mais quiet, mais Apple-like.

---

## 4. Anti-padrões observados (síntese)

1. **Card-stack syndrome** — 4 superfícies elevadas (header bar, conversation card, composer card, rails sunken) competindo. Apple Pro: 1 plano de elevação real por tela; resto = canvas.
2. **Triple-shadow stack** — `inset + bottom-hairline + 18px40px drop` em 3 elementos (header bar, conversation, composer). Stripe/Linear usam 1 shadow por elemento elevado, e só em popovers/menus.
3. **Backdrop-filter onde não há scroll** — header bar tem `blur(12px) saturate(120%)` mas nada scrolla atrás. Apple HIG: blur é ferramenta de hierarquia visual real, não decoração.
4. **Gradient gold radial no canvas + card slate flutuando** — combinação cria efeito "fundo de loja", não calma de cabine.
5. **Pílulas decorativas em filter row + segmented control** — 8 mini-rounded-fills na tela inteira. Linear: filter row = caps hairline; segmented = inset minimalist.
6. **Empty states com border-dashed** — single element with dashed border na tela toda — dashed = debug/draft em ambiente premium.
7. **Unicode glyphs misturados com SVG** — `↻`, `▾`, `▸`, `›`, `·` (bullet gold), `→` (no header link mas SVG no send btn). Inconsistência arrebata leitor.
8. **Action duplicate** — "promover" em 2 surfaces, "arquivar" só na conversation. Sem regra única.
9. **Manifesto subtitle no header** — texto explicativo longo onde devia haver identificação curta.
10. **Badge counter saturado no topbar** — pill gold sólido enquanto topbar deveria ser peripheral.

---

## 5. Sequência de implementação

Ordem por **risco visual ascendente** (do mais conservador ao mais transformador):

### Bloco A — Polish quiet (risco baixo, ganho médio)
1. **Fix 9** — Refresh SVG (~5 min)
2. **Fix 6** — Surface tab badge quiet (~10 min)
3. **Fix 7** — Bullets ink-faint (~5 min)
4. **Fix 4** — Subtitle do header bar 1-linha (~5 min)

Total ~25 min. Resultado: 7 elementos individualmente mais Apple-grade, sem mexer em layout.

### Bloco B — Drop chrome decorativa (risco médio, ganho alto)
5. **Fix 5** — Plan empty sem caixa dashed (~10 min)
6. **Fix 8** — Filter tabs hairline-only (~15 min)
7. **Fix 3** — Header bar plano sem gradient/blur (~10 min)
8. **Fix 10** — Drop "promover" duplicado (~5 min)

Total ~40 min. Resultado: redução significativa de "noise" visual; tela começa a respirar Linear/Stripe.

### Bloco C — Reset arquitetura visual central (risco mais alto, ganho MUITO alto)
9. **Fix 1** — Conversation chromeless (~20 min, testar com hero state)
10. **Fix 2** — Composer plano sem caixa (~25 min, testar com drag-active + focus glow)

Total ~45 min. Resultado: tela passa de "dashboard de admin" para "ferramenta de leitura premium". Este é o salto que destrava o "amador → enterprise" do operador.

### Validação após cada bloco
- Tirar screenshot, comparar com a referência amador-72/73/74 (drop cap), amador-75 (sweep), amador-78 (caixa Plano).
- Testar `prefers-reduced-motion`: kill switch ainda válido (linhas 13-22 atlas-ai.css).
- Testar hero state (`AtlasAiHero` ainda usa `.atlas-ai-hero` que tem border + radius + shadow stack — pode precisar do mesmo tratamento que `.atlas-ai-conversation` no Fix 1, mas em fase posterior, para não acumular muito risco).
- Validar contraste WCAG AA: ink-faint `#677482` sobre slate `#1d2b34` é ~5.3:1 — passa AA para large text/labels mas fica no limite para body. Manter `--cc-text-muted` (#95a3ac) para body, `--cc-text-faint` só para labels caps/eyebrows e bullets.

### Quando parar
Após Bloco C, fazer **mais 1 screenshot** e perguntar ao operador se ainda lembra amador. Se sim, é provável que o problema seja específico (ex.: subtitle ainda longo, ou contrast do gold na badge tab). Se não, polish está terminado em ~110 min de trabalho.

---

## 6. Itens deixados de fora desta auditoria (intencional)

- **Chip Mode "Programação · dev"** no composer footer — design já passou por iteração; mexer aqui requer re-validar slash menu, popover menu (linha 451-474). Fora do budget.
- **Reactions emoji 👍👎** — discutível mas requer redesenho semântico (passa a action buttons?). Tratar em round dedicado.
- **Confidence band** (`.atlas-ai-confidence-band`) — hairline 1px com 3 modos; pode estar invisível ou redundante após Fix 1 (sem caixa de bubble, hairline gold passa quase batido). Validar após implementação dos blocos A+B+C.
- **Spec atlas-ai-ultra-premium-polish-spec.md** — não está sendo invalidado; este audit é continuação ortogonal. As regras de tokens/typography do spec seguem válidas; o que muda é **densidade espacial** e **uso de chrome (cards/borders/shadows)**.

---

**Brutal honesty:** os 9 rounds anteriores curaram tipografia, cor, weights, motion, eyebrows, italic/serif discipline. Tudo certo individualmente. **O round X aborda spatial composition e elevation discipline** — a única dimensão que ainda separa Atlas AI de Linear/Stripe/Apple Pro: silêncio do canvas.

Após Blocos A+B+C, expectativa razoável: operador deixa de ler "amador" e passa a ler "intenso, ainda denso, mas premium". Nível 8.5-9/10 enterprise. Próximos passos depois disso são micro-refinos (hero state, confidence band, side panel polishing) e não são bloqueadores.
