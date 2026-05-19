# Polish · Editorial Typography para Atlas AI Chat

> Manual concreto de tipografia premium para o surface `atlas-ai` (React/Tauri dark slate teal + atlas gold).
> Alvo de qualidade: **Apple Books / NYT Magazine digital / Stripe Press / Cabinet**.
> Diagnóstico atual: tela parece SEO blog (h2 amarelo uppercase, code em pills amarelas, tabelas Bootstrap).
> Escopo: `apps/desktop/src/surfaces/atlas-ai/atlas-ai.css` (classes `.atlas-ai-md-*`).

---

## 0 · Princípio editorial

**Editorial não é decoração — é hierarquia de peso.**

Cabinet, NYT Magazine e Stripe Press não chamam atenção pela tipografia, **eles silenciam tudo o que não é o texto**. O olho não pode esbarrar em pill amarela, h2 berrante ou tabela Bootstrap. Tudo no chat deve descansar em três planos:

1. **Corpo** — Inter 14.5px, peso 440, line-height 1.72, cor `--cc-text` quase plana. **Disciplina monástica**.
2. **Estrutura** — h1/h2/h3 com peso e espaçamento, mas SEM cor accent. Cor accent (gold) é reservada.
3. **Pontuação editorial** — Cormorant italic, ✦ divider, drop cap em mensagem-resposta longa. **Raríssimo. Por respiração, não por enfeite.**

O gold (`#d4a85a`) é **moeda escassa**: só em link sublinhado, bullet de lista numerada importante, ✦ divider, e accent strong em h3 quando ele é label estrutural (`I · GOVERNANCE`). Nunca em h1/h2 inline normal, nunca em background de code inline, nunca em borda de tabela. [unconfirmed]

---

## 1 · Type scale proposto (8 níveis · escopado `surface-atlas_ai`)

Substitui a escala atual (que herda valores de Code/Cartografia). Os novos tokens vão dentro do bloco já existente `.atlas-shell.surface-atlas_ai` em `atlas-ai.css`.

| Token | Size | Line-height | Weight (`wght`) | Tracking | Uso canon |
|---|---|---|---|---|---|
| `--cc-text-display` | 28px | 1.18 | 620 | `-0.018em` | Hero h1 quando thread vazia (uma única vez por surface) |
| `--cc-text-h1` | 21px | 1.25 | 660 | `-0.014em` | Markdown h1 dentro de resposta longa (raro — modelo deve usar h2 por padrão) |
| `--cc-text-h2` | 17.5px | 1.32 | 600 | `-0.010em` | Section heading principal. **Sem cor accent.** Sem uppercase. |
| `--cc-text-h3` | 12px | 1.45 | 600 | `+0.14em` | Eyebrow label uppercase, **agora discreto** (era 11px + accent strong + 0.12em → cafona). Cor `--cc-text-muted` por padrão, gold só em mensagem CTA. |
| `--cc-text-body` | 14.5px | 1.72 | 440 | `0` | Body padrão de mensagem. Mantém. |
| `--cc-text-body-lg` | 16px | 1.72 | 440 | `-0.003em` | **Novo.** Opcional para mensagens longas de leitura (10+ parágrafos). Inspirado em Medium/Stripe Press body. |
| `--cc-text-meta` | 13px | 1.50 | 400 italic | `+0.005em` | **Cormorant Garamond italic.** Meta line de mensagem (timestamp + autor secundário + footnote). |
| `--cc-text-data` | 12.5px | 1.50 | 500 | `0` | **Mono tabular.** Timestamps, IDs curtos, métricas inline. `tnum` ligado. |

> **Por que body 14.5px e não 16px:** Atlas AI é workstation 12h, não revista digital. Stripe Press usa 18-20px em laptop, mas é leitura linear de capítulo, não scroll de chat com 20 turnos. 14.5px com lh 1.72 é o sweet spot Atlas: lê bem em sessão longa, mas cabe 3 mensagens na vista sem scroll abusivo. [unconfirmed — validar com operador em PT-BR longo]

---

## 2 · Font features CSS prontos (Inter + Cormorant)

### 2.1 · Root da surface (atualizar bloco existente)

```css
.atlas-shell.surface-atlas_ai,
.atlas-shell.surface-atlas-ai {
  font-family: var(--cc-font-sans);
  font-variation-settings: 'wght' 440;

  /* CANON editorial: kern + ligaduras discretas + 1-storey 'a' + disambiguation
     + tnum DESLIGADO em corpo (queremos numerais proporcionais em prosa). */
  font-feature-settings:
    'kern' 1,   /* kerning sempre */
    'liga' 1,   /* ligaduras standard (fi, fl) — discretas */
    'calt' 1,   /* contextual alternates */
    'ss01' 1,   /* Inter: open digits (4 aberto, etc) — editorial feel */
    'ss03' 1,   /* Inter: round quotes & commas — premium quente */
    'cv11' 1,   /* Inter: single-storey 'a' — Stripe Press signature */
    'cv05' 1,   /* Inter: l with tail — desambigua I/l/1 sem brutalismo */
    'tnum' 0,   /* desligado em corpo — proporcional respira melhor */
    'pnum' 1,   /* proporcional explícito */
    'zero' 0;   /* slashed-zero SÓ em mono — em sans é técnico demais */

  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  font-optical-sizing: auto;  /* Inter Variable usa opsz */
}
```

**Decisões aqui (todas explicáveis):**
- `ss07` (period quadrado) e `ss08` (quote quadrado) **NÃO** — esses são para brutalismo geométrico (Cabinet print), e o Atlas é Don Corleone, não Bauhaus. [unconfirmed]
- `ss02` desambiguação completa **NÃO** em corpo — só em mono (code). Desambiguar em prosa fica técnico, perde poesia.
- `cv11` (single-storey `a`) **SIM** — assinatura Stripe Press. Sem isso, Inter parece SaaS Vercel padrão.
- `cv05` (l com tail) **SIM** — resolve sozinho a confusão `Il1` sem precisar do `ss02`.

### 2.2 · Tabular numbers (escopado, não global)

Aplicado APENAS em métricas/badges/tabelas/timestamps:

```css
.atlas-ai-md-table,
.atlas-ai-meta-data,
.atlas-ai-message-meta time,
.atlas-ai-data-num {
  font-feature-settings:
    'kern' 1,
    'tnum' 1,   /* tabular — colunas alinhadas */
    'lnum' 1,   /* lining — descansa na baseline */
    'zero' 1,   /* slashed-zero em métrica */
    'ss02' 1;   /* desambiguação total em código/dado */
}
```

### 2.3 · Cormorant Garamond italic (apenas dois usos)

```css
.atlas-ai-message-meta,           /* meta line do header de mensagem */
.atlas-ai-md-quote {              /* pull quote / blockquote */
  font-family: var(--cc-font-serif);
  font-style: italic;
  font-feature-settings:
    'kern' 1,
    'liga' 1,
    'dlig' 1,    /* discretionary ligatures — st/ct ligature do Garamond */
    'onum' 1;    /* oldstyle figures EM ITÁLICO SERIF — combinam */
  font-variation-settings: 'wght' 420;  /* leve, nunca bold em italic serif */
}
```

> **Cormorant pitfall:** weight regular (400-420) é o sweet spot em itálico. Bold italic em Cormorant fica "wedding invitation cafona". Para display peso 600+, usar variant `Cormorant Garamond` (não `Cormorant`) — o Garamond tem counters maiores e segura melhor. ([Typewolf · Cormorant](https://www.typewolf.com/cormorant))

---

## 3 · Recipes ANTES / DEPOIS por elemento

### 3.1 · Section header `## 4. GOVERNANCE — GATES E SPEC`

**ANTES** (`.atlas-ai-md-h3` atual, linha 1946 atlas-ai.css):
```css
.atlas-ai-md-h3 {
  margin: 18px 0 4px;
  font-size: 11px;
  font-variation-settings: 'wght' 620;
  color: var(--cc-accent-strong);     /* GOLD ostentando */
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
```
Render: `4. GOVERNANCE — GATES E SPEC` em **gold uppercase 11px**. Parece SEO blog "OUR SERVICES".

**DEPOIS** (h2 verdadeiro, sem cor accent):
```css
.atlas-ai-md-h2 {
  margin: 32px 0 10px;
  font-family: var(--cc-font-sans);
  font-size: 17.5px;
  font-variation-settings: 'wght' 600;
  color: var(--cc-text-strong);       /* CREAM, não gold */
  letter-spacing: -0.010em;           /* tight, premium */
  line-height: 1.32;
  /* Hairline opcional abaixo, só se h2 abre seção massiva (3+ parágrafos seguidos) */
}

/* h2 numerado canon: o "4." vira numeral romano em Cormorant italic muted */
.atlas-ai-md-h2-numeral {
  font-family: var(--cc-font-serif);
  font-style: italic;
  font-variation-settings: 'wght' 420;
  color: var(--cc-text-faint);
  margin-right: 12px;
  font-size: 0.85em;                  /* relativo ao h2 */
  vertical-align: 0.05em;
}
```

Render proposto: <span style="color:#677482">_iv._</span> &nbsp; **Governance — gates e spec** em sans 17.5px cream, sem caps, sem gold. Title case humano. O `iv` em Cormorant italic faint substitui o `4.` arábico ostentoso.

> **Decisão arquitetural no markdown renderer:** o renderer (em `markdown.tsx`) precisa detectar headings começando com `N.` ou `N — ` e quebrar em `<span class="atlas-ai-md-h2-numeral">{romano}</span><span>{rest}</span>`. Cair em arábico se não converter — não usar romano em N > 12 (parece confuso). [unconfirmed — discutir mapeamento]

### 3.2 · Inline code path `` `app/Services/AtlasCore/Pipeline.php` ``

**ANTES** (`.atlas-ai-md-code` atual, linha 2131):
```css
.atlas-ai-md-code {
  font-family: var(--cc-font-mono);
  font-size: 12.5px;
  background: rgba(212, 168, 90, 0.08);     /* GOLD veil */
  color: var(--cc-accent-strong);            /* GOLD strong */
  padding: 1.5px 5px;
  border-radius: 3px;
  border: 1px solid rgba(212, 168, 90, 0.18);  /* GOLD border */
}
```
Render: pill amarela bordeada `app/Services/...`. Parece tag de blog Hashnode/Medium dev.

**DEPOIS** (text-level, sem pill):
```css
.atlas-ai-md-code {
  font-family: var(--cc-font-mono);
  font-size: 0.88em;                  /* relativo ao body — desce com o tamanho */
  font-variation-settings: 'wght' 480;
  color: var(--cc-text-strong);       /* cream, não gold */
  background: transparent;            /* SEM pill */
  padding: 0;
  border: none;
  border-radius: 0;
  /* Sutil: hairline embaixo (tipográfico, não box) */
  border-bottom: 1px dotted var(--cc-border);
  padding-bottom: 0.5px;
  letter-spacing: -0.005em;           /* mono respira menos que sans */
  font-feature-settings: 'tnum' 1, 'ss02' 1, 'zero' 1;
}
```

Render: `app/Services/AtlasCore/Pipeline.php` em mono cream com tracejado fininho embaixo. **Apple Books style** — código aparece como texto realmente, não como botão.

### 3.3 · Inline function name `` `external_rivals_certification` ``

**Mesmo recipe que 3.2** — não diferenciar path vs identifier. A consistência é mais editorial do que a "ajuda visual".

> **Exceção UMA:** quando o identifier é **TARGET de ação** ("clique em `Save`", "veja `pricing.tsx`"), aí ele ganha **bottom-border solid bronze** em vez de tracejado. Sinal sutil de "isto é interativo / clicável / referência forte". Não é pill — é underline editorial. [unconfirmed — testar com 3 prompts reais]

```css
.atlas-ai-md-code--target {
  border-bottom: 1px solid var(--cc-accent-border);
}
```

### 3.4 · Block quote / Pull quote

**ANTES** (`.atlas-ai-md-quote` atual, linha 2009):
```css
.atlas-ai-md-quote {
  padding: 8px 14px;
  border-left: 2px solid var(--cc-accent-border);     /* gold bar */
  background: rgba(212, 168, 90, 0.04);                /* gold veil */
  border-radius: 0 4px 4px 0;
  color: var(--cc-text-muted);
  font-style: italic;
  font-family: var(--cc-font-serif);
  font-size: 13.5px;
  line-height: 1.55;
}
```
Render: caixinha amarela à esquerda, italic dentro. Stack Overflow callout.

**DEPOIS** (NYT Magazine pull quote):
```css
.atlas-ai-md-quote {
  margin: 28px 24px;                  /* respira generoso, indenta */
  padding: 0;
  border-left: none;                  /* sem barra */
  background: transparent;            /* sem veil */
  border-radius: 0;
  color: var(--cc-text);              /* cor cheia, não muted */
  font-family: var(--cc-font-serif);
  font-style: italic;
  font-variation-settings: 'wght' 420;
  font-size: 19px;                    /* MAIOR que o body — vira pull quote real */
  line-height: 1.45;
  letter-spacing: -0.003em;
  font-feature-settings: 'kern' 1, 'liga' 1, 'dlig' 1, 'onum' 1;
  position: relative;
}

/* Marca tipográfica: aspas-tipo de abertura grande, faint, à esquerda fora do flow */
.atlas-ai-md-quote::before {
  content: '\201C';                   /* " unicode */
  position: absolute;
  left: -22px;
  top: -4px;
  font-family: var(--cc-font-serif);
  font-size: 38px;
  line-height: 1;
  color: var(--cc-accent);
  opacity: 0.35;
  font-style: italic;
}

/* Attribution opcional: em dash + Cormorant italic menor */
.atlas-ai-md-quote-attribution {
  display: block;
  margin-top: 10px;
  font-size: 13px;
  font-variation-settings: 'wght' 440;
  color: var(--cc-text-muted);
  font-feature-settings: 'onum' 1;
}
.atlas-ai-md-quote-attribution::before {
  content: '— ';
  color: var(--cc-text-faint);
}
```

### 3.5 · List discipline

**ANTES** bullet `·` gold 22px (linha 1978) — proeminente demais, parece "lista de feature comparison page".

**DEPOIS** — três tipos de lista por intenção, todos disciplinados:

```css
/* (a) UL canônica — bullet hairline meio-corpo, cor faint, não gold */
.atlas-ai-md-ul li::before {
  content: '';                              /* sem caractere */
  position: absolute;
  left: 8px;
  top: 0.85em;                              /* alinha com x-height */
  width: 4px;
  height: 1px;
  background: var(--cc-text-faint);         /* hairline cream-faint */
  border-radius: 0;
}

/* (b) OL canônica — numeral mono tabular small caps feel, faint, sem gold */
.atlas-ai-md-ol li::before {
  content: counter(ai-li) '.';
  font-family: var(--cc-font-mono);
  font-size: 11.5px;
  font-variation-settings: 'wght' 520;
  color: var(--cc-text-faint);              /* não gold */
  font-feature-settings: 'tnum' 1, 'lnum' 1;
  letter-spacing: 0;
}

/* (c) NOVA: OL editorial — numeral romano em Cormorant italic, gold faint
   Uso: listas canônicas de princípio, regras, governance (1-7 itens). */
.atlas-ai-md-ol.editorial li::before {
  content: counter(ai-li, upper-roman);
  font-family: var(--cc-font-serif);
  font-style: italic;
  font-variation-settings: 'wght' 420;
  font-size: 14px;
  color: var(--cc-accent);
  opacity: 0.80;
  letter-spacing: 0.02em;
}
```

> **Regra de quando usar `editorial` em OL:** apenas em listas curtas (≤7 itens) que são manifesto/princípio/decisão. Lista de "steps técnicos" mantém arábica mono. O modelo precisa aprender essa distinção via prompt — mas o renderer pode auto-detectar headings tipo "Princípios:", "Regras:", "Decisões:" e marcar como `.editorial`. [unconfirmed]

### 3.6 · Tables typography

**ANTES** (linhas 2068-2129): thead **uppercase gold 10.5px tracking 0.1em** + background veil gold + border gold + zebra hover gold. Bootstrap admin panel.

**DEPOIS** (Stripe Press / Praxis table):
```css
.atlas-ai-md-table {
  font-family: var(--cc-font-sans);
  font-size: 13px;
  line-height: 1.55;
  border-collapse: collapse;
  /* Tabular SEMPRE em tabela */
  font-feature-settings: 'tnum' 1, 'lnum' 1, 'zero' 1, 'ss02' 1, 'kern' 1;
}

.atlas-ai-md-table-wrap {
  margin: 22px 0;
  border: none;                       /* sem caixa */
  border-top: 1px solid var(--cc-border);
  border-bottom: 1px solid var(--cc-border);
  border-radius: 0;                   /* sem radius — editorial é reto */
  background: transparent;            /* sem veil */
  overflow-x: auto;
}

.atlas-ai-md-table thead th {
  padding: 8px 14px 6px;
  text-align: left;
  font-family: var(--cc-font-sans);
  font-size: 10.5px;                  /* small caps feel */
  font-variation-settings: 'wght' 600;
  text-transform: uppercase;
  letter-spacing: 0.085em;
  color: var(--cc-text-muted);        /* MUTED, não gold */
  background: transparent;            /* sem veil */
  border-bottom: 1px solid var(--cc-border);
}

.atlas-ai-md-table tbody td {
  padding: 9px 14px;
  border-bottom: 1px solid var(--cc-border-soft);
  color: var(--cc-text);
}

.atlas-ai-md-table tbody tr:hover td {
  background: rgba(255, 255, 255, 0.012);   /* hairline lift, não gold */
}

/* Code dentro de tabela: igual recipe 3.2 — sem pill */
.atlas-ai-md-table code {
  background: transparent;
  border: none;
  padding: 0;
  color: var(--cc-text-strong);
  font-family: var(--cc-font-mono);
  font-size: 0.88em;
  font-feature-settings: 'tnum' 1, 'ss02' 1, 'zero' 1;
}
```

Render: thead **uppercase muted** small-caps + hairline top/bottom (não box completo) + rows com border-soft. **Mesa de jantar Park Avenue**, não admin table.

### 3.7 · Meta line italic (header de mensagem)

```css
.atlas-ai-message-meta {
  font-family: var(--cc-font-serif);
  font-style: italic;
  font-variation-settings: 'wght' 420;
  font-size: 13px;
  letter-spacing: 0.005em;
  color: var(--cc-text-muted);
  font-feature-settings: 'kern' 1, 'liga' 1, 'onum' 1;
}

/* Timestamp dentro da meta line: mono tabular, mas faint */
.atlas-ai-message-meta time {
  font-family: var(--cc-font-mono);
  font-style: normal;
  font-size: 11.5px;
  color: var(--cc-text-faint);
  font-feature-settings: 'tnum' 1, 'lnum' 1, 'zero' 1;
  margin-left: 8px;
}
```

Render: `_Atlas, respondendo via Code surface_  `15:42:08`  — italic Cormorant cream-muted seguido de timestamp mono tabular faint. Don Corleone signing a letter, not a Slack header.

---

## 4 · Spacing rhythm (baseline grid)

**Baseline canônico Atlas AI: 4px**, mas a régua editorial soma em múltiplos de 8 (com escapes para alinhamento ótico).

| Espaço entre... | px | Em múltiplo |
|---|---|---|
| Linhas dentro de parágrafo | line-height 1.72 × 14.5 ≈ 25px | — |
| Parágrafo → parágrafo | 16 | 2u |
| Parágrafo → h2 acima | 32 | 4u |
| h2 → primeiro parágrafo abaixo | 10 | — (ótico, não 8) |
| Parágrafo → pull quote | 28 | — (ótico) |
| h3 → primeiro parágrafo abaixo | 6 | — (ótico) |
| Lista → próximo parágrafo | 20 | 2.5u |
| Lista item → item | 10 | — (ótico) |
| Tabela → parágrafo | 22 | — (ótico) |
| ✦ divider → parágrafo seguinte | 24 acima, 28 abaixo | — |

**Regra de ouro:** baseline rhythm puro (a la Tufte CSS) **NÃO funciona em chat de IA** porque mensagens têm tamanhos diferentes e elementos heterogêneos. O Atlas usa **rhythm de ar entre blocos**, não baseline strict. Cabinet faz o mesmo em print. ([baseline grid trade-offs · Medium](https://medium.com/@gombau/the-baseline-grid-friend-or-foe-d4bec9ae595e)) [unconfirmed]

---

## 5 · ✦ Diamond divider treatment

### Atual (linhas 2029-2065 atlas-ai.css)
- Grid 3-col `1fr auto 1fr`
- Hairlines com gradient gold 0.32→0.10 alpha
- ✦ em Cormorant serif 13px, gold opacity 0.85, letter-spacing 0

**Diagnóstico:** está **quase certo**. Mas o ✦ está pequeno demais (some na linha) e os hairlines em gold ficam um pouco "neon" no dark slate teal — o gradient não respira tão bem em backgrounds escuros quanto em cream.

### Proposto
```css
.atlas-ai-md-rule-editorial {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 18px;
  margin: 32px 0 28px;             /* mais ar acima que abaixo — editorial */
  padding: 0;
}

.atlas-ai-md-rule-line {
  display: block;
  height: 1px;
  /* MUDA: gradient menos saturado, transparente nas pontas, faint no meio */
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(149, 163, 172, 0.18) 35%,     /* cream-muted faint, não gold */
    rgba(149, 163, 172, 0.28) 50%,
    rgba(149, 163, 172, 0.18) 65%,
    transparent 100%
  );
}

/* Espelho perfeito do lado direito */
.atlas-ai-md-rule-editorial > .atlas-ai-md-rule-line:last-child {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(149, 163, 172, 0.18) 35%,
    rgba(149, 163, 172, 0.28) 50%,
    rgba(149, 163, 172, 0.18) 65%,
    transparent 100%
  );
}

.atlas-ai-md-rule-mark {
  font-family: var(--cc-font-serif);
  font-style: italic;
  font-variation-settings: 'wght' 420;
  font-size: 16px;                  /* +3px — agora se firma */
  color: var(--cc-accent);          /* gold mantém — é a única gota de cor */
  line-height: 1;
  letter-spacing: 0;
  opacity: 0.78;
  /* Sutil text-shadow pra "respirar" sem brilhar */
  text-shadow: 0 0 12px rgba(212, 168, 90, 0.12);
}
```

**Decisão chave:** os hairlines agora são **cream-muted faint** (não gold). O ✦ continua gold — mas é a **única gota** de gold no divider. Antes, o gold estava em três lugares (line esq + ✦ + line dir) e diluía. Agora o ✦ vira o ponto focal real.

---

## 6 · Drop cap decision tree

Drop cap em chat de IA é arma rara — pode virar gimmick em 0.3s. Use **APENAS** quando:

```
A mensagem do Atlas é resposta?
├── NÃO (mensagem do operador) → SEM drop cap, sempre.
└── SIM
    │
    ├── Comprimento < 200 palavras → SEM drop cap.
    │
    ├── 200-500 palavras
    │   ├── Resposta começa com narrativa/análise/manifesto?
    │   │   ├── SIM (começa com "Vamos pensar", "A questão é", "Olhando", "Antes de")
    │   │   │   → DROP CAP em Cormorant italic gold faint
    │   │   └── NÃO (começa com bullet, h1, code block) → SEM drop cap
    │   └── Resposta é resumo executivo/lista direta? → SEM drop cap
    │
    └── 500+ palavras (long form de leitura) → DROP CAP sempre
```

### CSS canon
```css
/* Aplicado quando o renderer detecta condições acima e adiciona .has-dropcap
   no primeiro <p> da mensagem-resposta. */
.atlas-ai-message.tone-atlas .atlas-ai-md-p.has-dropcap::first-letter {
  font-family: var(--cc-font-serif);
  font-style: italic;
  font-variation-settings: 'wght' 480;
  font-size: 3.2em;                 /* 3 linhas de capacidade */
  line-height: 0.85;
  float: left;
  margin: 0.08em 0.12em 0 -0.04em;
  color: var(--cc-accent);
  opacity: 0.80;
  letter-spacing: -0.04em;          /* puxa o letra1 pra perto do letra2 */
  /* Inicial NÃO pode bloquear texto seguinte em PT-BR com acento */
}

/* Alternativa moderna (Chrome 110+, Safari 16+): initial-letter, mais previsível */
@supports (initial-letter: 3) {
  .atlas-ai-message.tone-atlas .atlas-ai-md-p.has-dropcap::first-letter {
    initial-letter: 3 2;            /* 3 lines deep, raise 2 from baseline */
    float: none;
    margin: 0 8px 0 0;
  }
}
```

### Acessibilidade
- ::first-letter **não bloqueia screen reader** — leitor lê palavra inteira normalmente. ([DAISY KB · Drop caps](https://kb.daisy.org/publishing/docs/html/dropcaps.html))
- TDAH: drop cap **ajuda** porque marca claramente "aqui começa um novo bloco de respiração". Mas **só funciona se for raro** — 5 em 5 mensagens = drop cap vira ruído.

### Quando ABSOLUTAMENTE não usar
- Mensagem começa com markdown heading (h1/h2/h3) — drop cap aplicaria no `#`, ridículo.
- Mensagem começa com code block, lista, ou pull quote.
- Operador desativou via setting (futuro) ou via `body.atlas-calmaria` (modo calmaria já existe, linha 3812).

---

## 7 · Marginalia / sidenotes (futuro · não MVP)

Stripe Press e Tufte CSS usam margin notes pra "footnote sem quebrar fluxo". No Atlas AI, a coluna central tem tipicamente 720-820px no laptop, com rails dos lados — **há espaço técnico** para margin notes na direita do parágrafo. Mas:

- **Não MVP** desta fase. Marginalia exige decisão de informação: o que vai pra margem? (citation? aside? tool receipt?)
- **Hipótese**: tool receipts (atualmente em painel direito separado) poderiam aparecer como margin note inline na primeira menção da ferramenta dentro do parágrafo. Reduziria contexto switching. [unconfirmed — testar mockup primeiro]
- **CSS futuro** (rascunho):
  ```css
  .atlas-ai-md-margin-note {
    position: absolute;
    right: -200px;
    width: 180px;
    font-family: var(--cc-font-serif);
    font-style: italic;
    font-size: 12px;
    line-height: 1.4;
    color: var(--cc-text-muted);
  }
  ```
- Ativar somente em viewport ≥ 1280px de conteúdo central. Em laptop normal vira footnote inline `(¹)` com hover popover.

Ref: [Tufte CSS](https://edwardtufte.github.io/tufte-css/) · [Sidenotes In Web Design · Gwern](https://gwern.net/sidenote)

---

## 8 · Numerais romanos vs arábicos · regra simples

| Contexto | Sistema | Fonte | Exemplo |
|---|---|---|---|
| Lista numerada técnica (steps, code) | Arábico | Mono tabular | `1. 2. 3.` |
| Lista canônica de princípios / decisões | Romano | Cormorant italic | `I. II. III.` |
| Heading numerado de seção canônica (`I · GOVERNANCE`) | Romano | Cormorant italic faint, prefixo do h2 | `iv · Governance` |
| Métrica / dado / timestamp | Arábico | Mono tabular `tnum lnum` | `15:42 · 47/52` |
| Numeral inline em prosa ("os 7 princípios") | Arábico | Inter `pnum onum` ideal | `os 7 princípios` |
| Numeração de footnote | Arábico superscript | Mono | `¹ ² ³` |
| Pagination / version (`v1.2.3`) | Arábico | Mono `tnum` | `v1.2.3` |

**Decisão:** romanos são **raros e cerimoniais**. Nunca em métrica, nunca em step técnico, nunca em número > 12 (porque `XIII` quebra o ritmo). Quando o operador vê um romano, sabe que aquele item é canon, não step.

---

## 9 · Caps & small caps premium

Atlas hoje usa muito `text-transform: uppercase` + `letter-spacing: 0.08em-0.12em`. **Isso é a falha #1** que faz parecer SEO blog. Caps reais editoriais são:

| Onde | Tamanho | Tracking | Weight | Cor |
|---|---|---|---|---|
| Eyebrow label (acima de h1 hero) | 10.5-11px | `0.14em` | 600 | `--cc-text-faint` (NÃO accent) |
| Section thead em tabela | 10.5px | `0.085em` | 600 | `--cc-text-muted` |
| Pill de status (badge) | 9.5-10px | `0.10em` | 600 | depende do status |
| Mono lang label em code block | 10.5px | `0.08em` | 500 | `--cc-text-faint` |
| Group header em sidebar (já correto, linha 1888) | 10.5px | `0.08em` | 600 | `--cc-text-faint` |

**Regras invioláveis:**
1. Caps **nunca** em accent strong (gold) por padrão. Gold em caps = NYT homepage CTA "SUBSCRIBE". Indignante no Atlas.
2. Caps **nunca** em body. Tudo que é uppercase no Atlas é metadata/label, nunca prosa.
3. Tracking proporcional ao size: 10px → 0.10em mínimo, 11px → 0.085em, 12px → 0.07em, 14px+ uppercase JAMAIS.
4. Weight 600, não 700. Bold caps fica grito.

> Inter Variable não tem small caps reais (`smcp`) — usa fake smcp via `font-size: 0.78em; text-transform: uppercase; letter-spacing: 0.05em`. Aceitável para Atlas porque Cormorant tampouco tem small caps no peso italic. [unconfirmed — checar specimen]

---

## 10 · Letter-spacing tracking curve (por size)

Curva canon Atlas AI (negative em display, neutro em body, positive só em caps):

| Size | Letter-spacing | Razão |
|---|---|---|
| 28px display | `-0.018em` | tighten — letras grandes têm espaço aparente maior |
| 21px h1 | `-0.014em` | |
| 17.5px h2 | `-0.010em` | |
| 16px body-lg | `-0.003em` | quase neutro |
| 14.5px body | `0` | **neutro absoluto, regra Codex Slate** |
| 13.5px body-sm | `0` | |
| 12.5px data mono | `0` | mono é monoespaçado, não mexer |
| 12px caption | `+0.002em` | mínimo positivo — texto pequeno respira mais |
| 11px label uppercase | `+0.14em` | tracking forte — é caps |
| 10.5px caps thead | `+0.085em` | |
| 10px nano mono lang | `+0.08em` | caps |

Source: tracking digital negativo em display ([How to make typography effortlessly right · Apple-like · Medium](https://medium.com/@iam.hari/how-to-make-typography-effortlessly-right-for-every-screen-size-1a82ece4926d))

---

## 11 · Line-height ratios por size (regra)

| Body size | Line-height ratio | LH absoluto |
|---|---|---|
| 14.5px (body) | 1.72 | 25px |
| 16px (body-lg) | 1.72 | 27.5px |
| 13.5px (body-sm) | 1.68 | 22.5px |
| 12.5px (caption mono) | 1.50 | 19px |
| 17.5px (h2) | 1.32 | 23px |
| 21px (h1) | 1.25 | 26px |
| 28px (display) | 1.18 | 33px |
| 19px (pull quote italic) | 1.45 | 27.5px |

**Princípio:** texto pequeno precisa de **menos** LH proporcional (já tem ar denso); texto grande precisa de **menos LH ainda** (1.25 ou abaixo) porque cada linha tem peso visual. Body 14.5px em 1.72 é "respiração de Stripe Press / Medium 18px adaptado para 14.5px denso".

---

## 12 · Ligatures: discretas SIM, ostentosas NÃO

| Feature | Ligar? | Por quê |
|---|---|---|
| `liga` (standard, fi/fl/ffi) | **SIM sempre** | natural reading flow |
| `calt` (contextual alternates) | **SIM sempre** | Inter usa pra ajustar `t·h` etc |
| `dlig` (discretionary, ct/st serifa) | **SIM em Cormorant italic only** | wedding card em Inter, perfeito em Cormorant |
| `hlig` (historical, longa-s, etc) | **NUNCA** | Brutalist hipster |
| `swsh` (swashes) | **NUNCA** | Hand-lettered diploma |

---

## 13 · Quick reference card · O que MUDAR primeiro

Se tiver 1 hora, atacar nesta ordem (impacto descending):

1. **h2/h3 do markdown** — remover uppercase gold no h3, criar h2 verdadeiro 17.5px cream (recipe 3.1). Resolve sozinho 50% do "feel SEO blog".
2. **Inline code** — remover pill amarela, usar text-level com border-bottom dotted (recipe 3.2). Resolve 25%.
3. **Tables** — remover veil/border gold, hairline top+bottom, thead muted (recipe 3.6). Resolve 15%.
4. **Pull quote** — virar pull quote real italic 19px com aspa-tipo decorativa (recipe 3.4). Resolve 5%.
5. **font-feature-settings root** — `ss01 cv11 cv05` + remover `tnum 0` ambíguo (seção 2.1). Resolve 5%.

O resto (drop caps, marginalia, type scale completo) é polish iterativo.

---

## Sources

- [Stripe Press · Ideas for progress](https://press.stripe.com/)
- [Stripe Press case study · Yuin Chien](https://yuinchien.com/p/stripe-press)
- [Inter stylistic sets & OpenType features · Lexington Themes](https://lexingtonthemes.com/blog/inter-stylistic-sets-css-tailwind)
- [Features of your font you had no idea about · OlegWock · sinja.io](https://sinja.io/blog/get-maximum-out-of-your-font)
- [The Complete CSS Demo for OpenType Features · sparanoid](https://sparanoid.com/lab/opentype-features/)
- [NYT Mag Serif & Slab · Fonts In Use](https://fontsinuse.com/typefaces/44948/nyt-mag-serif)
- [NYT Magazine Typefaces · D&AD Awards 2016](https://www.dandad.org/awards/professional/2016/crafts-for-design/24975/nyt-magazine-typefaces/)
- [Cormorant · Typewolf](https://www.typewolf.com/cormorant)
- [Cormorant Garamond + Inter pairing · FontAlternatives](https://fontalternatives.com/pairings/cormorant-garamond-and-inter/)
- [Cormorant Garamond · Google Fonts specimen](https://fonts.google.com/specimen/Cormorant+Garamond)
- [Apple Human Interface Guidelines · Typography](https://developers.apple.com/design/human-interface-guidelines/foundations/typography/)
- [Apple Books iBooks Asset Guide 5.2.5](https://help.apple.com/itc/booksassetguide/en.lproj/itc5b189ed96.html)
- [Drop Caps · DAISY Accessible Publishing KB](https://kb.daisy.org/publishing/docs/html/dropcaps.html)
- [Elevate Your Web Typography · CSS Drop Caps · Greenlit](https://greenlitcontent.com/website/elevate-your-web-typography-a-complete-guide-to-css-drop-caps)
- [Tufte CSS](https://edwardtufte.github.io/tufte-css/)
- [Sidenotes In Web Design · Gwern](https://gwern.net/sidenote)
- [Sidenotes: Marginalia for the Web · Marcin](https://marcin.cylke.com.pl/2024/03/13/sidenotes-demo/)
- [font-variant-numeric · MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/font-variant-numeric)
- [Registered OpenType features p-t · Microsoft Learn](https://learn.microsoft.com/en-us/typography/opentype/spec/features_pt)
- [Facts about figures: numeric styles with OpenType features · RWT](https://www.rwt.io/typography-tips/facts-about-figures-numeric-styles-with-opentype-features/)
- [8-Point Grid: Typography On The Web · freeCodeCamp](https://www.freecodecamp.org/news/8-point-grid-typography-on-the-web-be5dc97db6bc/)
- [The baseline grid: friend or foe? · Alberto Gombáu · Medium](https://medium.com/@gombau/the-baseline-grid-friend-or-foe-d4bec9ae595e)
- [How to make typography effortlessly right for every screen size · Apple-like · Medium](https://medium.com/@iam.hari/how-to-make-typography-effortlessly-right-for-every-screen-size-1a82ece4926d)
- [Optimizing Typography for Dark Mode Interfaces · Design Work Life](https://designworklife.com/optimizing-typography-for-dark-mode-interfaces/)
- [Optical Alignment, Baseline Grids & Rhythmic Flow · Letterhanna Studio](https://letterhanna.com/optical-alignment-baseline-grids-rhythmic-flow/)
- Atlas Desktop Design System canon (interno): `docs/architecture/0007-atlas-desktop-design-system.md`
- Atlas AI surface CSS (interno): `apps/desktop/src/surfaces/atlas-ai/atlas-ai.css`

---

*Manual fechado · pronto para iteração concreta no surface `atlas-ai`. Próxima fase recomendada: aplicar Quick Reference §13 itens 1-3 em PR pequeno, validar visualmente com 5 prompts reais (curto/médio/longo/com-tabela/com-code), depois iterar 4-5.*
