# Atlas AI · Ultra-Premium Polish Spec v1

> Sintetiza 5 reports de pesquisa (Apple HIG · Linear/Mercury/Stripe · Editorial Typography · Cursor/Warp/Raycast · Atlas Critique) em UM manifesto operacional de polish, listando o estado-da-tela ANTES (6.3/10 amador) → DEPOIS (target 9+/10 enterprise).

**Escopo:** `.atlas-shell.surface-atlas_ai` apenas. Cartografia cream + Atlas Code não tocados.

**Reports source (em `docs/research/`):**
- `polish-apple-hig.md` — 12 seções HIG, materials, type system SF
- `polish-linear-mercury-stripe.md` — 9 capítulos, 50+ tokens, comparative matrix
- `polish-editorial-typography.md` — 13 seções tipografia editorial
- `polish-premium-devtools.md` — 9 capítulos Cursor/Warp/Raycast
- `polish-atlas-critique-fixes.md` — 21 elementos auditados, 10 fixes priorizados

---

## 0. Princípio mestre (Apple HIG)

> **"Materials e tipografia carregam a hierarquia. Cor é tempero, nunca o prato."**

Tradução operacional:
- **Gold só é gold quando escasso.** Cada uso adicional dilui o sinal.
- **Pílulas/chrome destroem leitura.** Tipografia (família + peso + cor) basta para distinguir tokens técnicos.
- **Cores semafóricas (red/yellow/green) reservadas a ação realmente destrutiva irreversível.** "Arquivar" é benigno = ink-muted.
- **Streaming = silêncio.** Durante "pensando" só ThinkingState; badges aparecem APÓS resposta.

---

## 1. Token discipline (consolidado dos 5 reports)

### 1.1 Cor

| Token | Hex | Uso canônico | NÃO usar para |
|---|---|---|---|
| `--cc-accent` `#d4a85a` | atlas gold burnished | actions primárias (1 por view), links interativos, ✦ divider mark | section headers, code chips, table thead, bullets de lista padrão |
| `--cc-accent-strong` `#e6b966` | gold +highlight | hover/active de primary, focus ring | uso permanente |
| `--cc-text-strong` `#f0f4f7` | branco-azulado (não pure white) | titles, body strong, primeira coluna table | meta |
| `--cc-text` `#d6dde2` | body padrão | corpo de texto, body | titles |
| `--cc-text-muted` `#95a3ac` | secondary | meta, captions | body principal |
| `--cc-text-faint` `#677482` | tertiary | eyebrow, caps labels, ações benignas ("arquivar") | titles |
| `--cc-danger` `#d05a52` | rec-red dessaturado | ação destrutiva irreversível APENAS (delete forever) | arquivar, archive, close-thread |

### 1.2 Type scale (Apple Books / NYT Magazine)

| Role | Family | Size | Weight | Letter-spacing | Line-height |
|---|---|---|---|---|---|
| H1 markdown | Inter sans | 19px | 680 | -0.012em | 1.25 |
| H2 markdown | Inter sans | 16.5px | 640 | -0.008em | 1.3 |
| H3 markdown | Inter sans | 13.5px | 600 | -0.005em | 1.35 |
| Conversation H2 | Inter sans | 17px | 580 | -0.011em | 1.25 |
| Body | Inter sans | 14.5px | 440 | 0 | 1.62 |
| Caption / meta | Inter sans | 11.5px | 440 | 0 | 1.4 |
| Eyebrow caps | Inter sans | 10.5px | 600 | 0.06em | 1.0 |
| Code inline | mono | 12px | 540 (em h-context) | 0 | inherit |
| Pull quote | Cormorant italic | 14.5px | 500 | 0 | 1.55 |
| Drop cap ::first-letter | Cormorant italic | 1.45em | 500 | -0.02em | inherit |
| Numeral romano | Cormorant italic | 16px | 500 | normal | 1.0 |

**Font-features Inter canon:** `'cv11' 1, 'ss01' 1, 'kern' 1, 'tnum' 0`. Para metrics/counters: `'tnum' 1`.

### 1.3 Spacing rhythm

```
Headings respiration:  H1 32 / H2 28 / H3 24 (margin-top, first-child 0)
Body gap:              18px between paragraphs in .atlas-ai-md
List bullet:           14px font-size · opacity 0.85 (was 22px shouty)
Table padding:         11px vertical, 16px right (NO horizontal padding-left)
Section ✦ divider:     28 above / 24 below margin
```

### 1.4 Radius discipline (Linear school)

| Radius | Token | Aplicado em |
|---|---|---|
| 2px | (inline) | chevron arrows |
| 3px | (inline) | inline code chip |
| 6-8px | (inline) | side panel raised, attachment card |
| 999px | (inline) | hero chips, mode badge (now stripe-only) |

### 1.5 Motion canon (Apple HIG)

| Curve | Token | Uso |
|---|---|---|
| `cubic-bezier(0.16, 1, 0.3, 1)` | `--cc-ease-out` | hover, fade-in |
| `cubic-bezier(0.65, 0, 0.35, 1)` | `--cc-ease-in-out` | transitions de painel |
| `cubic-bezier(0.34, 1.56, 0.64, 1)` | `--cc-ease-spring` | hover lift |

**Duração:** 160-200ms para hover micro-state, 280-340ms para layout transitions.

**Reduce-motion guard:** kill switch em `@media (prefers-reduced-motion: reduce)` para todas animações (thinking pulse, optimistic pulse, live shimmer, await blink).

---

## 2. Tabela de 30 polish fixes aplicados (rounds 1-9)

| # | Elemento | Antes (6.3/10) | Depois | Round |
|---|---|---|---|---|
| 1 | Inline `<code>` | bg gold + texto gold + border gold (Bootstrap 2014) | mono cinza 4.5% alpha + ink-strong + hairline | 1 |
| 2 | "arquivar" link | pink salmon `#e89a93` alarmista | italic ink-faint cinza-azul | 1 |
| 3 | Table thead | uppercase gold + bg veil + border gold | ink-faint quiet caps, sem bg, hairline 1px | 1 |
| 4 | Table wrap | box border + radius + bg + shadow | sem wrap — flui no texto | 1 |
| 5 | Bullet `·` | 22px wght 700 gigante | 14px wght 700 opacity 85% | 1 |
| 6 | H3 section | uppercase gold tracking 0.12em | title-case ink-strong + numeral italic Cormorant | 1 |
| 7 | Headings respiration | 22/20/18 margin-top | 32/28/24 + first-child 0 | 1 |
| 8 | Tabela 1ª col | wght 440 igual todas | wght 540 + text-strong + 24% min-width | 1 |
| 9 | Blockquote | gold veil + gold border + radius (SO callout) | hairline cinza + serif italic max 62ch | 1 |
| 10 | Action `→` | border-bottom invisível (layout instável) | hover translateX 2px micro-motion | 1 |
| 11 | Optimistic shimmer meta | opacity pulse animation | static italic 78% (Apple single signal) | 1 |
| 12 | User msg distinção | border 2px gold mesma weight | border 3px gold + body wght 460 ink-strong | 1 |
| 13 | Role labels (VOCÊ/ATLAS AI) | uppercase 11px gold/azul | 10.5px caps ink-faint constante + ss01 cv11 | 2 |
| 14 | Body line-height | 1.7 (loose) | 1.62 (NYT/Apple Books) + cv11 ss01 kern | 2 |
| 15 | Reduced-motion guard | sem | kill switch global | 2 |
| 16 | Conversation H2 | 16px ls -0.005em | 17px ls -0.011em + ss01 + cv11 + kern + liga | 3 |
| 17 | Meta line | flat gap-6 todos faint | hierarquia (mode caps lower + workspace basename + provider mono small + count tabular pt-BR) | 3 |
| 18 | Drop cap respostas Atlas | sem | Cormorant italic gold 1.45em first-letter | 3 |
| 19 | Streaming bubble | só border-left gold | + Mercury glow `-1px 0 12px -4px gold 0.18` + ::before linear-gradient blur 2px | 3 |
| 20 | Pin emoji 📌 | unicode emoji (amateur) | SVG estrela 5-pontas 9px gold 78% | 4 |
| 21 | Mode badge pill | gold/info/neutral filled veil | Warp stripe 2px esquerda + ink-muted text | 4 |
| 22 | Conversation header bottom | solid border 1px | Apple Books gradient fade hairline (transp 12% → 8% → 88% → transp) | 5 |
| 23 | Side panel container | border + radius + 3 shadows stack | transparent (rail-sunken já carrega) | 6 |
| 24 | Side panel tabs | pill bg-sunken + raised active | Linear sublinhado gold (border-bottom-color em active) | 6 |
| 25 | Composer placeholder | 3 frases "Bug debug feature… Enter envia Shift+Enter quebra linha" | enxuto "Bug, debug, feature ou review — arrasta arquivo ou cola screenshot." | 6 |
| 26 | Empty states | "Carregando thread…" "Sem thread carregada." "Sem mensagens ainda. Envie a primeira pergunta no composer abaixo." | "carregando conversa…" "nenhuma conversa aberta" "primeira pergunta — escreva abaixo" | 6 |
| 27 | Calmaria toggle | unicode `◐ calmaria on` / `◑ calmaria` | SVG circle+half-fill 11px premium + label "calmaria · ativa" | 7 |
| 28 | Hero chip chevron `›` | unicode | SVG polyline arrow 9px stroke 1.6 | 7 |
| 29 | ✦ rule mark | 13px opacity 0.85 | 14px opacity 0.9 + text-shadow gold blur 8px (NYT depth) | 8 |
| 30 | Rail toggle pressed | accent gold veil + accent-strong text | surface-raised + text-strong (state ≠ action) | 9 |

---

## 3. Componentes Phase 1 baseline parity (Codex/Claude/Cursor)

Construídos antes do polish (ordem cronológica):

| Componente | Propósito | Source backend |
|---|---|---|
| `AtlasAiIcons` (16 SVG) | Vocabulário canônico ferramentas | client-side |
| `AtlasAiThinkingState` | 4-phase phrased duration counter | trace.provider + pendingUserMessage.startedAt |
| `AtlasAiLiveActivity` | Current-step footer ("Lendo X", "Executando Y") | tool_events + stream_events + job.status |
| `AtlasAiToolReceipts` | Codex-style inline summary ("5 arquivos · 6 comandos") | tool_events |
| `AtlasAiDecisionBadge` (v2 editorial) | italic linha quiet de routing decision | atlas_decision |
| `AtlasAiQualityBadge` (v2 editorial) | italic linha quiet de quality eval | quality_evaluation |
| `AtlasAiOpenBrainBadge` (v2 editorial) | italic linha quiet de canon injection | metadata.open_brain_injection |

## 4. Componentes Phase 2 innovation (universal gaps)

| Componente | Innovation |
|---|---|
| `AtlasAiConfidenceBand` | Hairline gradient acima do bubble (alta/média sólido, baixa tracejada). Universal gap — ninguém faz. |
| `AtlasAiReasoningDrawer` | Drawer 5 seções numerais romanos (I contexto · II decisão · III ferramentas · IV custo · V qualidade) |
| `useCalmaria` hook + `Cmd+Shift+.` | Esconde TODOS badges/receipts/decisões — só texto + composer (TDAH-first) |

---

## 5. Anti-padrões explícitos (Atlas NÃO faz)

Adotado dos 5 reports + DNA Atlas:

1. **NÃO usar pílulas filled para code/tokens técnicos** — tipografia carrega
2. **NÃO usar uppercase yellow em headers** — SEO blog 2018 vibe
3. **NÃO empilhar box-shadow stack >2** — Apple thin material via blur+saturate ou hairline simples
4. **NÃO pulsar dots/badges** — canon Codex Slate Premium (status estático)
5. **NÃO usar red/pink em ações benignas** — destrutivo irreversível somente
6. **NÃO empilhar gold em 6 papéis** — accent escasso
7. **NÃO usar emojis em UI premium** — SVG inline
8. **NÃO duplicar feedback de estado** — single signal Apple HIG
9. **NÃO usar table wrap chrome (border + bg + shadow)** — NYT/Stripe Press
10. **NÃO numerar seções no corpo da mensagem** — Apple Books drop the `4.`

---

## 6. Validação visual checklist (pré-PR)

- [x] Inline `<code>` sem chrome — mono cinza neutro
- [x] Headings sem gold uppercase — title-case ink
- [x] Tables sem wrap + hairline-only rows
- [x] Bullets 14px proporcionais ao corpo
- [x] Blockquote serif italic max 62ch
- [x] Action `→` micro-motion translateX
- [x] Optimistic meta italic estático
- [x] User vs Atlas distinção tipográfica
- [x] Role labels ink-faint constante
- [x] Drop cap Cormorant em respostas Atlas
- [x] Streaming bubble Mercury glow esquerda
- [x] Pin SVG (não emoji)
- [x] Mode badge stripe (não pill colorida)
- [x] Conversation header gradient hairline
- [x] Side panel sem box-shadow stack
- [x] Side panel tabs Linear sublinhado
- [x] Empty states minúsculo italic
- [x] Calmaria SVG circle half-fill
- [x] Hero chip arrow SVG
- [x] ✦ rule mark text-shadow gold blur
- [x] Rail toggle pressed neutro (não accent)
- [x] Reduced-motion guard global

---

## 7. Métricas estimadas

| Métrica | Antes | Depois | Δ |
|---|---|---|---|
| Nota subjetiva (user-rated) | 6.3/10 | target 9+/10 | +2.7 |
| Densidade gold elements | 12+ usos | 4 usos (action, drop cap, ✦, pin) | -67% |
| Pílulas/chrome filled | 11+ por bloco | 0 (tipografia only) | -100% |
| Box-shadow stacks >2 | 3 (composer, side, send) | 1 (composer único) | -67% |
| Cores semafóricas em ações benignas | 1 (arquivar pink) | 0 | -100% |
| Emojis em UI | 2 (📌 + 📂 hero) | 0 | -100% |

---

## 8. Próximos rounds (opcionais — diminishing returns)

Possíveis polish futuros se necessário:

1. Composer attach button hover state refine
2. Codeblock header `lang` label refine
3. Streaming bubble ThinkingState diamond animation timing tune
4. Reaction icons (copy/up/down) stroke weight harmonize
5. Token canon `--cc-radius-{xs,sm,md,lg}` extract
6. Side panel inner sections (Identidade/Roteamento/Trace) hairline rhythm
7. Promotion panel preview polish
8. Attachment card busy/error states refine

---

**Sintetizado:** 2026-05-15 por Atlas Polish Synthesis  
**Reports sources:** 5 agents (Apple HIG · Linear/Mercury/Stripe · Editorial Type · Cursor/Warp/Raycast · Atlas Critique)  
**Rounds aplicados:** 9  
**SHAs deployados:** progressivos até `4725043cb48763f9d01904515cd10c6dec853a62302eb785df4eaf7295acc221`
