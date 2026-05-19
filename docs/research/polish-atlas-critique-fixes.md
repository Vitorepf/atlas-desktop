# Atlas AI Surface · Polish Critique e Fixes Executáveis

Auditoria: 2026-05-15
Escopo: 5 screenshots (`atlas-ai-amador-67/68/69/70/71.png`) + CSS atual em `apps/desktop/src/surfaces/atlas-ai/atlas-ai.css` + tokens em `apps/desktop/src/index.css` + componentes (`AtlasAiConversation.tsx`, `AtlasAiMessageBody.tsx`, `markdown.tsx`).

Persona: design critic enterprise estilo Apple HIG / Linear / Mercury / Stripe Press.

---

## 1. Diagnóstico geral

A tela hoje lembra **wiki técnico tropical de PHP framework dos anos 2010** — algo entre Symfony bundles docs, Laravel Pulse, e uma página de Wikipedia em modo escuro improvisado. Os ingredientes ruins concentram-se em três escolhas:

1. **Excesso de pills/boxes ao redor de cada token monospace.** Cada classe (`AtlasForgeRivalsActionDispatcher`, `--confirm-*`, `external_rivals_certification`) ganha uma chrome individual com border + veil + padding — o resultado é um campo minado visual onde nada respira. Linear/Stripe nunca emboxam termos técnicos no corpo de texto; eles usam tipografia (peso + cor) para distinguir.
2. **Gold/yellow como cor única de informação.** O accent burnished `#d4a85a` aparece em (a) section headers uppercase, (b) header da tabela, (c) borda de cada pill, (d) texto monospace dentro da pill, (e) bullet de lista, (f) divider ✦. Quando tudo é dourado, nada é dourado — vira ruído amarelado tropical em vez de hierarquia. Apple HIG: "color signals importance only when scarce."
3. **Pink/salmon `#e89a93` como ação rotineira ("arquivar").** Mercury, Linear e Apple Mail tratam "arquivar" como ação neutra (ghost text). Reservar vermelho para destrutivo *irreversível* (delete). Salmon em "arquivar" cria pânico falso e parece SaaS Bootstrap 3.

Bottom-line: a tela tem peso editorial certo (serif h2, ✦, hairlines) mas suja tudo com pills retangulares yellow-on-slate que se acumulam em densidade de fila de aeroporto. **Remover 70% das pills e deixar a tipografia carregar a hierarquia já leva de 5/10 para 8/10**, sem refatorar layout.

Referência mal evocada: **Trello board com tags coloridas** + **DataDog log viewer** + **Stripe Atlas legal contract dark mode**.
Referência alvo: **Linear changelog**, **Mercury "issuing dashboard"**, **Apple Pro Display calibration sheet**.

---

## 2. Tabela de auditoria

| # | Elemento | Nota atual | Diagnóstico | Fix concreto |
|---|----------|------------|-------------|--------------|
| 1 | Pills de service `AtlasForgeRivalsActionDispatcher` (mono yellow border yellow text) | **3/10** | Boxes individuais explodem densidade. Border `accent-border 34%` + text `accent-strong` cria 11+ retângulos amarelos em fila. Lembra tag em Bugzilla. | Remover border/background/padding. Manter só `font-family: mono` + `color: var(--cc-accent)` (sem `-strong`) + `font-size 12px`. Tokens viram texto, não chrome. |
| 2 | Pill de caminho `app/Services/AI/Programming/ForgeRivals/` | **4/10** | Mesmo problema mas isolado é menos ruim. Ainda assim, código de caminho não precisa de border. | Igual #1, mas adicionar `opacity: 0.78` para hierarquia (caminho < classe). |
| 3 | Section header `4. GOVERNANCE — GATES E SPEC` (uppercase gold) | **6/10** | Tipografia certa (uppercase + tracking 0.12em + accent-strong), mas o `4.` numerado prefixado tem o mesmo peso do título — não fica claro que `4.` é índice. | Trocar `4.` por um `<span>` com `opacity 0.45 + font-variation 480` ou eliminar a numeração (deixar só "GOVERNANCE — GATES E SPEC"). Apple/Linear não numeram seções no corpo de mensagem. |
| 4 | Header da tabela `RESPONSABILIDADE` / `SERVIÇOS PRINCIPAIS` (uppercase gold sobre veil amarelo) | **5/10** | Bom uso de uppercase tracking, mas `background: rgba(212,168,90,0.04)` deixa header amarelado, e `color: accent-strong` repete a cor. Tabela inteira fica monocromática gold. | Remover `background` do `thead th`. Trocar `color` para `--cc-text-faint` (cinza-azulado). Manter só `border-bottom: 1px solid var(--cc-border-soft)`. Headers ficam editoriais e silenciosos como Linear. |
| 4b | Coluna esquerda da tabela ("Despacho de actions", "Adjudicação de resultado") | **6/10** | Funcional mas todas as linhas têm peso 440 igual — não há ancoragem visual. | `font-variation-settings 'wght' 540` + `color: var(--cc-text-strong)` na primeira coluna. Hierarquia entre rótulo e código. |
| 5 | Hairline divider entre rows da tabela | **7/10** | Aceitável. `border-bottom: 1px solid var(--cc-border-soft)` está bem. | Aumentar contraste sutil: `1px solid rgba(255,255,255,0.04)`. |
| 6 | ✦ divider entre seções da resposta | **8/10** | Bonito. Gradient para acccent funciona. Tamanho 13px do ✦ está bom. | Manter. Talvez reduzir margin de `22px 0 18px` para `28px 0 24px` em mensagens longas (mais ar). |
| 7 | Inline pill `external_rivals_certification` | **3/10** | Mesmo problema do #1 + ocorre dentro de parágrafo, quebra ritmo de leitura. | Sem border, sem background. Trocar por `color: var(--cc-warning)` ou `var(--cc-accent)` + `font-family mono` + `font-size 12.5px`. Aumentar `font-weight` para 540. |
| 8 | `bloqueada` (bold inline) | **7/10** | Bold + `--cc-text-strong` ok. Quase invisível em dark — fica branco. | Adicionar `color: var(--cc-warning-fg)` quando o contexto for risco (palavra "bloqueada"). Isso é trabalho semântico do componente, não do CSS — exigirá variante `.atlas-ai-md-strong--warn`. Opcional. |
| 9 | Pill `--confirm-*` (mono yellow) | **3/10** | Idem #1/#7. Pior porque é dentro de frase. | Igual #7. Sem border. |
| 10 | Header da mensagem "Esta funcionando ?" | **6/10** | Bom uso de sans 16px wght 580. Mas o título da mensagem está sendo confundido com o título da thread (header de conversa). Hierarquia ambígua. | Verificar layout: se "Esta funcionando ?" é título da thread, mover acima dos messages com tamanho 18px. Se é apenas conteúdo, trocar para h3 não-prefixo (sem `#4.`). Falta clareza no DOM — provavelmente `atlas-ai-conversation-header h2` está duplicando função. |
| 11 | Meta line `programming · /Users/.../atlas · claude_cli · 18 msg` (mono cinza) | **8/10** | Bom. Mono 11.5px + faint + separadores `·`. Limpo. | Manter. Talvez reduzir font-size para 11px e aumentar opacity para 0.65 — atualmente parece informação principal. |
| 12 | Action `promover →` (gold link sublinhado on hover) | **7/10** | Funcional. Mas usa border-bottom invisível até hover, deixando layout instável. | Manter cor `accent-strong` mas mudar visual: tirar border-bottom; adicionar `→` com `display: inline-block; transition: transform 200ms; on hover: transform: translateX(2px)`. Apple/Linear pattern. |
| 13 | Action `arquivar` (PINK/SALMON) | **2/10** | **PIOR ELEMENTO DA TELA.** `--cc-danger-fg: #e89a93` em dark é salmon-pink-coral SaaS Bootstrap 2014. Arquivar não é destrutivo. | Trocar para `color: var(--cc-text-faint)` (cinza-azulado neutro). Em hover: `color: var(--cc-text-strong)`. Reservar danger color para "delete permanently". Mercury, Apple Mail, Linear: arquivar é ação neutra ghost. |
| 14 | "open brain · parcial" (italic gold) | **9/10** | OK. Está bonito. Justificado: indicador de modo. Mantém serif italic + accent. | Manter. |
| 15 | User message bubble "VOCÊ" + texto | **6/10** | Role label uppercase tracking ok. Mas indistinguível visualmente da resposta da IA — só a barra esquerda muda cor (gold vs azul info). Em scroll rápido é difícil saber quem falou. | Adicionar leve diferença tipográfica: usuário em sans 14px wght 440 vs Atlas em serif italic ou sans 14.5px wght 450 (mantendo serif só para conteúdo editorial longo). Sutil. **OU** simplesmente aumentar contraste da border-left para 3px no usuário. |
| 16 | Optimistic meta "enviando agora…" (italic gold mono shimmer) | **7/10** | Shimmer animation funcional mas mono+italic+shimmer+gold é overload de signals. | Remover shimmer (`atlas-ai-optimistic-meta-shimmer`). Manter italic gold mono. O estado já é claro pela barra pulsando à esquerda. Dois signals concorrentes = ansiedade. |
| 17 | Bullet `·` gold gigante (font-size 22px) | **5/10** | Bullet 22px num corpo de texto 14.5px é desproporcional. Lista parece com âncoras vermelhas no PowerPoint. | Reduzir para `font-size: 14px; line-height: 1.2; top: 4px`. Bullet sutil, não gritante. |
| 18 | `Gates: SpecBeforeCode, ScopeGuard, Evidence, …` (7 pills em fila) | **2/10** | **TERCEIRO PIOR.** 8 pills consecutivas com border yellow == campo minado visual. Não dá pra ler. Parece kanban tags. | Listar como texto simples mono separado por vírgula: `SpecBeforeCode, ScopeGuard, Evidence, Completion, …`. Aplicar fix #1 globalmente em `.atlas-ai-md-code` resolve. Alternativa: quando 3+ inline codes consecutivos com vírgula no meio, agrupar como `<ul class="atlas-ai-md-tags">` sem chrome. |
| 19 | Tabela wrap container (`atlas-ai-md-table-wrap`) | **6/10** | Border 1px + radius 7px + background rgba(0,0,0,0.18) + inset shadow. Pesa demais. Lembra widget Bootstrap. | Remover `border` e `background`. Manter só `overflow-x: auto`. Tabela editorial flutua no fluxo, como New York Times stats table. |
| 20 | "claude ainda pensando — pode demorar" (footer italic) | **8/10** | Bom. Serif italic faint. Editorial. | Manter. |
| 21 | Spaçamento vertical entre seções da resposta | **5/10** | Tudo flui muito junto. Section header + path pill + texto + pills + texto + divider — sem respiração. | Aumentar `gap` em `.atlas-ai-md` de 16px para 22px. Adicionar `margin-top: 28px` em `.atlas-ai-md-h2` e `.atlas-ai-md-h3` (não só 18/20px). |

---

## 3. Top 10 fixes executáveis (priorizados por impacto)

### FIX 1 · Remover chrome dos inline codes (impacto: massivo)

**Princípio (Linear/Stripe):** tokens técnicos em prosa não precisam de chrome. Tipografia (família mono + cor accent) é suficiente. Border + background + padding criam "sticker noise" que destrói a leitura.

**Arquivo:** `apps/desktop/src/surfaces/atlas-ai/atlas-ai.css` linhas 2131-2139.

**Antes:**
```css
.atlas-ai-md-code {
  font-family: var(--cc-font-mono);
  font-size: 12.5px;
  background: rgba(212, 168, 90, 0.08);
  color: var(--cc-accent-strong);
  padding: 1.5px 5px;
  border-radius: 3px;
  border: 1px solid rgba(212, 168, 90, 0.18);
}
```

**Depois:**
```css
.atlas-ai-md-code {
  font-family: var(--cc-font-mono);
  font-size: 12.5px;
  color: var(--cc-accent);
  font-variation-settings: 'wght' 540;
  letter-spacing: -0.005em;
  /* Sem border, sem background, sem padding — tipografia carrega. */
}
```

**Resultado:** as 11+ pills de service viram texto mono dourado discreto. Densidade visual cai ~60%.

---

### FIX 2 · Neutralizar "arquivar" (impacto: alto · 1 linha)

**Princípio (Apple Mail, Mercury):** arquivar é ação neutra, reversível. Vermelho/pink reserva-se para destrutivo irreversível (delete forever). Pink em arquivar cria pânico falso e parece Bootstrap 3.

**Arquivo:** `apps/desktop/src/surfaces/atlas-ai/atlas-ai.css` linhas 310-311.

**Antes:**
```css
.atlas-ai-danger-link { color: var(--cc-danger-fg); }
.atlas-ai-danger-link:hover { color: var(--cc-danger); border-bottom-color: var(--cc-danger-border); }
```

**Depois:**
```css
.atlas-ai-danger-link { color: var(--cc-text-faint); }
.atlas-ai-danger-link:hover { color: var(--cc-text-strong); border-bottom-color: var(--cc-border-soft); }
```

**Alternativa premium:** se houver futuro botão `excluir thread`, criar variante `.atlas-ai-destructive-link` que mantenha danger color só para o destrutivo real.

---

### FIX 3 · Remover background do thead (impacto: médio · monocromia gold)

**Princípio (Linear, NYT Data):** header de tabela usa peso/tracking, não cor de fundo. Veil amarelado em header somado a accent-strong color empilha gold + gold + gold.

**Arquivo:** `apps/desktop/src/surfaces/atlas-ai/atlas-ai.css` linhas 2086-2097.

**Antes:**
```css
.atlas-ai-md-table thead th {
  padding: 9px 14px;
  text-align: left;
  font-size: 10.5px;
  font-variation-settings: 'wght' 620;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--cc-accent-strong);
  border-bottom: 1px solid var(--cc-accent-border);
  background: rgba(212, 168, 90, 0.04);
  vertical-align: bottom;
}
```

**Depois:**
```css
.atlas-ai-md-table thead th {
  padding: 10px 14px 8px;
  text-align: left;
  font-size: 10.5px;
  font-variation-settings: 'wght' 620;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--cc-text-faint);
  border-bottom: 1px solid var(--cc-border-soft);
  background: transparent;
  vertical-align: bottom;
}
```

**Resultado:** header da tabela fica editorial, gold passa a aparecer só no texto mono das cells (`.atlas-ai-md-table code`).

---

### FIX 4 · Remover wrap chrome da tabela (impacto: médio · respiração)

**Princípio (NYT, Stripe Press):** tabelas editoriais flutuam no fluxo de texto, sem widget border.

**Arquivo:** `apps/desktop/src/surfaces/atlas-ai/atlas-ai.css` linhas 2068-2075.

**Antes:**
```css
.atlas-ai-md-table-wrap {
  margin: 14px 0;
  overflow-x: auto;
  border: 1px solid var(--cc-border-soft);
  border-radius: 7px;
  background: rgba(0, 0, 0, 0.18);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.025);
}
```

**Depois:**
```css
.atlas-ai-md-table-wrap {
  margin: 18px 0 22px;
  overflow-x: auto;
}
```

**Resultado:** tabela some no slate; só hairlines de linha guiam o olho. Mais ar.

---

### FIX 5 · Reduzir bullet gold gigante (impacto: médio · escala)

**Princípio (Apple HIG):** glyph ornamental não pode ter mais peso visual que o texto que ele ancora.

**Arquivo:** `apps/desktop/src/surfaces/atlas-ai/atlas-ai.css` linhas 1977-1987.

**Antes:**
```css
.atlas-ai-md-ul li::before {
  content: '·';
  position: absolute;
  left: 8px;
  top: 0;
  font-size: 22px;
  line-height: 1.4;
  color: var(--cc-accent);
  font-variation-settings: 'wght' 700;
}
```

**Depois:**
```css
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
```

---

### FIX 6 · Cortar shimmer no optimistic meta (impacto: baixo · clareza)

**Princípio (Apple HIG · "feedback de estado deve ser único"):** dois signals concorrentes para o mesmo estado = ansiedade. A barra esquerda já pulsa em gold; meta animar opacity é redundante.

**Arquivo:** `apps/desktop/src/surfaces/atlas-ai/atlas-ai.css` linhas 826-835.

**Antes:**
```css
.atlas-ai-message-optimistic .atlas-ai-message-meta {
  color: var(--cc-accent, #d4a85a);
  font-style: italic;
  animation: atlas-ai-optimistic-meta-shimmer 1.4s ease-in-out infinite;
}
@keyframes atlas-ai-optimistic-meta-shimmer {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}
```

**Depois:**
```css
.atlas-ai-message-optimistic .atlas-ai-message-meta {
  color: var(--cc-accent, #d4a85a);
  font-style: italic;
  opacity: 0.78;
  /* shimmer removido — barra esquerda já comunica estado em curso. */
}
/* keyframes pode ser deletado por completo. */
```

---

### FIX 7 · Polish da action `promover →` (impacto: baixo · charme)

**Princípio (Linear, Apple Mail):** affordance via micro-movement do glyph (seta translada 2px no hover). Sem border-bottom invisível.

**Arquivo:** `apps/desktop/src/surfaces/atlas-ai/atlas-ai.css` linhas 292-308 + ajuste em `AtlasAiConversation.tsx` para envolver a seta num span.

**Antes (CSS):**
```css
.atlas-ai-link {
  background: transparent;
  border: none;
  color: var(--cc-accent-strong);
  cursor: pointer;
  font-size: 13px;
  font-family: var(--cc-font-sans);
  font-variation-settings: 'wght' 520;
  padding: 4px 0;
  border-bottom: 1px solid transparent;
  transition: color 200ms var(--cc-ease-out), border-color 200ms var(--cc-ease-out);
}
.atlas-ai-link:hover {
  color: var(--cc-accent);
  border-bottom-color: var(--cc-accent-border);
}
```

**Depois (CSS):**
```css
.atlas-ai-link {
  background: transparent;
  border: none;
  color: var(--cc-accent-strong);
  cursor: pointer;
  font-size: 13px;
  font-family: var(--cc-font-sans);
  font-variation-settings: 'wght' 520;
  padding: 4px 0;
  transition: color 200ms var(--cc-ease-out);
}
.atlas-ai-link:hover { color: var(--cc-accent); }
.atlas-ai-link:hover .atlas-ai-link-arrow {
  transform: translateX(2px);
}
.atlas-ai-link-arrow {
  display: inline-block;
  margin-left: 2px;
  transition: transform 200ms var(--cc-ease-out);
}
```

**Depois (JSX em `AtlasAiConversation.tsx`):**
```tsx
promover <span className="atlas-ai-link-arrow" aria-hidden="true">→</span>
```

---

### FIX 8 · Respiração entre seções (impacto: médio)

**Princípio (Stripe Press, Pentagram):** headings precisam de margin-top generoso para ancorar o olho. 22px é apertado para H1 de uma seção nova.

**Arquivo:** `apps/desktop/src/surfaces/atlas-ai/atlas-ai.css` linhas 1923-1955.

**Antes:** ver bloco original (margin 22px 0 6px / 20px 0 6px / 18px 0 4px).

**Depois:**
```css
.atlas-ai-md-h1 { margin: 32px 0 8px; /* resto igual */ }
.atlas-ai-md-h2 { margin: 28px 0 8px; }
.atlas-ai-md-h3 { margin: 24px 0 6px; }
.atlas-ai-md { gap: 18px; /* era 16px */ }
```

Primeiro heading num bubble não precisa do margin-top — adicionar regra `.atlas-ai-md > :first-child { margin-top: 0; }`.

---

### FIX 9 · `Gates:` lista de pills consecutiva (impacto: alto · "tag stripping")

**Princípio (Linear, Notion):** quando 3+ inline codes aparecem em fila separados por vírgula, eles param de ser citação técnica e viram catálogo. Catálogo merece tratamento próprio.

**Estratégia em duas camadas:**

1. **Solução genérica via FIX 1:** ao remover border/background dos inline codes, a fila já fica respirável (texto mono accent separado por vírgula).

2. **Solução premium opcional:** detectar no `markdown.tsx` quando um parágrafo é prefixado por `Label:` seguido de 3+ inline codes virgulados, e renderizar como `<dl class="atlas-ai-md-tags">`. Custo: ~20 linhas de parser. Adiar para v2. Por ora, FIX 1 resolve o pior do problema.

---

### FIX 10 · Hierarquia da coluna esquerda da tabela (impacto: baixo · ancoragem)

**Arquivo:** `apps/desktop/src/surfaces/atlas-ai/atlas-ai.css` linhas 2099-2105.

**Antes:**
```css
.atlas-ai-md-table tbody td {
  padding: 10px 14px;
  vertical-align: top;
  border-bottom: 1px solid var(--cc-border-soft);
  font-variation-settings: 'wght' 440;
  color: var(--cc-text);
}
```

**Depois (mantém row, adiciona regra para primeira coluna):**
```css
.atlas-ai-md-table tbody td {
  padding: 11px 14px;
  vertical-align: top;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  font-variation-settings: 'wght' 440;
  color: var(--cc-text);
  font-size: 13px;
}
.atlas-ai-md-table tbody td:first-child {
  font-variation-settings: 'wght' 540;
  color: var(--cc-text-strong);
  width: 24%;
  min-width: 180px;
}
```

---

## 4. Sequência de implementação

| Ordem | Fix | Razão | Tempo estimado |
|-------|-----|-------|----------------|
| 1 | **FIX 1** (remover chrome de inline code) | Maior impacto visual, 1 bloco CSS. Resolve metade da poluição da tela de uma vez. | 5 min |
| 2 | **FIX 2** (neutralizar `arquivar`) | 2 linhas. Elimina o elemento mais amador. | 1 min |
| 3 | **FIX 3** (thead sem background) | Tira camada gold acumulada na tabela. | 3 min |
| 4 | **FIX 4** (tabela sem wrap chrome) | Tabela passa a flutuar editorial. | 2 min |
| 5 | **FIX 10** (coluna esquerda peso) | Combina com FIX 3/4 — tabela fica completa. | 3 min |
| 6 | **FIX 5** (bullet 22px → 14px) | Listas param de gritar. | 1 min |
| 7 | **FIX 8** (respiração entre headings) | Tela respira sem mexer estrutura. | 4 min |
| 8 | **FIX 7** (action promover com micro-motion) | Charme premium. Opcional mas barato. | 6 min (CSS + JSX) |
| 9 | **FIX 6** (cortar shimmer otimista) | Polimento de detalhe, baixa prioridade visível. | 1 min |
| 10 | **FIX 9** (lista de pills `Gates:`) | Já resolvido em 80% via FIX 1; solução premium fica para v2. | 0 min agora |

**Tempo total para fixes 1-9 (sem FIX 9 premium):** ~25 minutos. Build verde sem refatorar componentes.

---

## 5. Notas finais brutalmente honestas

- **A surface tem boa fundação:** tokens slate/gold canon, serif para conteúdo editorial, hairlines, ✦ divider, mono limpo. O DNA está certo.
- **O pecado é uniforme:** acumulação de chrome em cada termo técnico. Não há um único componente gritante (exceto o pink "arquivar"); há excesso de pequenos detalhes corretos somados sem hierarquia. É o **anti-Apple**: Apple remove até doer, Atlas adiciona até confortar.
- **FIX 1 sozinho move a tela de 5/10 para 7.5/10** porque elimina ~70% da poluição. Os outros 9 fixes empurram para 8.5-9/10.
- **NÃO inventado neste audit (transparência):** não foi verificado se `--cc-text-faint` rende cinza-azulado adequado no contraste WCAG sobre o slate `#1d2b34` no contexto exato dessas cells — operador deve validar visualmente no Desktop após FIX 3.
- **O que ficou intencionalmente fora:** redesign de pills do PromotionPanel, attachment cards, composer footer, thread list — esses não aparecem nos 5 screenshots auditados. Limitar escopo a evidência visível.

---

## 6. Caminho de arquivos editáveis (resumo executivo)

- `apps/desktop/src/surfaces/atlas-ai/atlas-ai.css` — todos os 9 fixes priorizados acima.
- `apps/desktop/src/surfaces/atlas-ai/components/AtlasAiConversation.tsx` — FIX 7 (envolver `→` em span).
- `apps/desktop/src/surfaces/atlas-ai/markdown.tsx` — FIX 9 premium (futuro, fora do escopo deste audit).

Validar no Desktop com `pnpm tauri dev` após cada bloco — atenção ao pitfall `tsc -b` reusando dist/ stale (validar via `npm run build` + inspecionar `dist/` antes de assumir que reload pegou as mudanças).
