# PROMPT · Ultra Premium Mobile Design Context

> **Como usar**: cole tudo abaixo (entre os `=====`) em uma sessão nova de Claude (ou Cursor/Codex) antes de pedir qualquer tela. Esse é o briefing completo do canon visual Atlas. Sem ele, a IA vai inventar SaaS premium genérico e produzir lixo.
>
> Última revisão: 2026-05-18

---

```
=================================================================
ATLAS · ULTRA PREMIUM DESIGN BRIEFING (mobile + canon completo)
=================================================================

Você está implementando telas para o app mobile do Atlas, sistema pessoal
de orquestração de IA do Vitor (vitordsny@gmail.com). NÃO INVENTE design
system novo. NÃO use Material Design. NÃO use vibe SaaS premium genérico.
Siga o canon abaixo PALAVRA POR PALAVRA.

──────────────────────────────────────────────────────────────────
1. QUEM USA (perfil crítico, define toda decisão de UX)
──────────────────────────────────────────────────────────────────

- Tem TDAH · peso decrescente, baixo ruído visual, hierarquia clara
- Sessões de 12h em frente à tela · legibilidade > ornamento
- Programador sênior · conhece UX a fundo
- Brutal feedback: "isso é nota 6.3", "amador", "horrível de ler"
- Qualidade > velocidade SEMPRE. Plan mode antes de codar. AskUserQuestion
  em ambiguidade. NUNCA código porco, NUNCA dispersão.

──────────────────────────────────────────────────────────────────
2. DNA VISUAL · o que Atlas É e o que NÃO É
──────────────────────────────────────────────────────────────────

ATLAS É:
- Don Corleone editorial · Patek Calatrava (mãos de Don com Patek de ouro)
- Manuscript Smythson · charuto cubano · whisky single malt
- Escritório de máfia anos 60 · couro, madeira escura, latão envelhecido
- Peso patriarcal masculino · silencioso · autoridade não declarada
- Editorial newspaper (NYT/WSJ/Economist) cruzado com cockpit operacional
  (Codex CLI, Linear, Mercury, Stripe Dashboard)

ATLAS NÃO É (NUNCA traga essas referências):
- Aesop minimalismo sussurrado · Atlas é PESO, não sussurro
- Hermès silk soft · Atlas é couro, não seda
- Material Design vibe · Atlas não é SaaS genérico
- Linear pure dark · Atlas tem WARMTH (teal warm, não cinza puro)
- Notion soft cream · Atlas é editorial sério, não cute
- Stripe gradient hero · Atlas é serif gravado, não fluid
- Glassmorphism · proibido
- Neumorphism · proibido
- Gradient cores múltiplas · proibido (a não ser radial sutil de bg)

──────────────────────────────────────────────────────────────────
3. PALETA · slate teal dark warm (Codex-inspired)
──────────────────────────────────────────────────────────────────

BACKGROUND / SUPERFÍCIES (escalonadas, slate teal warm)
  --cc-bg              #1d2b34   canvas principal · slate teal warm
  --cc-surface         #243743   painel/card normal
  --cc-surface-raised  #2d4351   popover/diálogo/modal sheet
  --cc-surface-sunken  #15212a   sidebar/footer (deep)

TEXTO (cool cream sobre slate · high contrast 12h-friendly)
  --cc-text-strong     #f0f4f7   headlines, números importantes
  --cc-text            #d6dde2   body primary (read for hours)
  --cc-text-muted      #95a3ac   secondary, meta
  --cc-text-faint      #677482   helpers, captions, eyebrow
  --cc-text-disabled   #3d4b54

BORDAS (alpha sobre cool cream)
  --cc-border-soft     rgba(233,238,242,0.05)
  --cc-border          rgba(233,238,242,0.10)
  --cc-border-strong   rgba(233,238,242,0.20)

ATLAS GOLD ACCENT (parcimônia · 1-2 elementos por view)
  --cc-accent          #d4a85a   burnished atlas gold
  --cc-accent-strong   #e6b966   hover/active state
  --cc-accent-veil     rgba(212,168,90,0.12)
  --cc-accent-border   rgba(212,168,90,0.34)

STATUS SEMAFÓRICOS (muted, não saturado neon)
  --cc-success         #82b577   moss green (só success real)
  --cc-success-fg      #b9e4ac
  --cc-success-veil    rgba(130,181,119,0.12)

  --cc-warning         #e0ad5e   gold warm
  --cc-warning-fg      #f0cf94
  --cc-warning-veil    rgba(224,173,94,0.12)

  --cc-danger          #d05a52   rec-red muted (NÃO red puro)
  --cc-danger-fg       #e89a93
  --cc-danger-veil     rgba(208,90,82,0.12)

  --cc-info            #7fa7c4   prussian blue muted
  --cc-info-fg         #b9d0e0
  --cc-info-veil       rgba(127,167,196,0.12)

  --cc-neutral         #95a3ac
  --cc-neutral-fg      #c0c9d0

REGRA ABSOLUTA: status saturado APENAS em erro REAL ou success confirmação.
Estado neutro tipo "arquivar/cancelar/pending" usa --cc-text-muted, NUNCA
info-blue. Cor semafórica em neutro = ruído visual = anti-pattern.

SHADOWS (≤2 layers max, NUNCA empilhar 3+)
  --cc-shadow-xs       0 1px 0 rgba(0,0,0,0.20)
  --cc-shadow-sm       0 2px 4px rgba(0,0,0,0.26)
  --cc-shadow-md       0 6px 16px rgba(0,0,0,0.32)
  --cc-shadow-lg       0 14px 32px rgba(0,0,0,0.38)

FOCUS RING (gold burnished sobre slate · NÃO outline padrão)
  --cc-focus-ring      0 0 0 2px var(--cc-bg), 0 0 0 4px rgba(230,185,102,0.55)

──────────────────────────────────────────────────────────────────
4. TIPOGRAFIA · Inter operacional + Cormorant ornamental
──────────────────────────────────────────────────────────────────

FAMÍLIAS
  Sans · 'Inter Variable', 'Inter', system-ui, -apple-system, sans-serif
  Serif · 'Cormorant Garamond', Georgia, serif  ← RESTRITO (ver abaixo)
  Mono · 'JetBrains Mono Variable', ui-monospace, Menlo, monospace

ESCALA (use os tokens, não números mágicos)
  --cc-text-display    22px   display/headlines especiais
  --cc-text-title      17px   título de panel/screen
  --cc-text-section    14px   título de seção
  --cc-text-body       13.5px corpo operacional principal
  --cc-text-body-sm    12.5px corpo denso
  --cc-text-caption    11.5px legendas, meta
  --cc-text-label      10px   labels uppercase, eyebrow
  --cc-text-data       12px   números em mono

PESOS Inter Variable (use font-variation-settings, não font-weight)
  Body         440
  Title h3/h2  560-580
  H1 display   620-680
  Eyebrow caps 540

LETTER-SPACING (canônico)
  Body         0     (zero, NUNCA negative em body)
  Title        -0.011em a -0.018em  (negative tight em headlines)
  Eyebrow caps  0.06em a 0.10em     (uppercase only)
  Mono         0

FONT FEATURES obrigatórias em texto longo
  font-feature-settings: 'cv11' 1, 'ss01' 1, 'kern' 1;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;

LINE-HEIGHT
  Body         1.62-1.65   (12h-friendly)
  Title        1.25
  Caption      1.45

CORMORANT GARAMOND · USO RESTRITO
  ✓ ✦ glyph (diamond editorial divisor)
  ✓ Numerais romanos (I, II, III, IV) em capítulos/seções
  ✗ NUNCA body operacional
  ✗ NUNCA state, label, meta, placeholder, helper text
  ✗ NUNCA button text
  ✗ NUNCA drop cap (::first-letter Cormorant gold vira typo glitch
    em palavras com acento: Quando, Estado, Superfícies, Camadas)

──────────────────────────────────────────────────────────────────
5. DISCIPLINE · regras invioláveis
──────────────────────────────────────────────────────────────────

BORDER-RADIUS · 4 / 6 / 8 / 10 APENAS
  Nunca 5/7/9/12/14. Pill 999px só pra chip filtro/status.

BOX-SHADOW · ≤2 LAYERS MAX
  Use --cc-shadow-*. NUNCA empilhar 3+ shadows (over-engineered, amador).
  Premium = 1 inset highlight sutil + opcional 1 drop shadow.

COR HARDCODED · PROIBIDA fora dos tokens
  Sempre var(--cc-*). Hex direto quebra theme switching.

TRANSITION
  Use var(--cc-ease-out) para 90% dos casos.
  Duração 200-280ms hover/state, 320-420ms enter/exit.
  NUNCA mais que 500ms em interação primária.
  Reduced-motion guard OBRIGATÓRIO em @keyframes:
    @media (prefers-reduced-motion: reduce) {
      .my-anim { animation: none; transition: none; }
    }

STATUS DOTS · ESTÁTICOS
  NUNCA animação pulse-halo (cafona).
  Status dot = round filled 6-8px sem animação.

ITALIC EM BODY · PROIBIDO Cormorant
  Se precisar emphasis, use <em> com Inter italic.

YELLOW CHROME EM INLINE CODE · PROIBIDO
  Inline code = mono sans-bg color text-strong + hairline border alpha 0.07.
  NUNCA pílula amarela (vibe SEO blog 2018).

MOCK DATA · PROIBIDO
  Sempre API real. Campo ausente no schema = silente + TODO comment.
  NUNCA helpers `*Mock.ts`.

──────────────────────────────────────────────────────────────────
6. MOTION CANON · easings exatos
──────────────────────────────────────────────────────────────────

  --cc-ease-out        cubic-bezier(0.16, 1, 0.3, 1)     (default)
  --cc-ease-in-out     cubic-bezier(0.65, 0, 0.35, 1)    (loops)
  --cc-ease-spring     cubic-bezier(0.34, 1.56, 0.64, 1) (entrada gestual)

Em mobile React Native: use react-native-reanimated v3+ com spring
(damping 18, stiffness 220) pra transições de tela. useNativeDriver true.

──────────────────────────────────────────────────────────────────
7. EDITORIAL GRID MOBILE · viewport 393 canon
──────────────────────────────────────────────────────────────────

Variante A canon (viewport 393px · iPhone 14/15/16 padrão):
  Trilhos:  32 — 64 — 329 — 361
  Left padding:   32px
  Content start:  32px (eyebrow alinhada)
  Content end:    361px
  Right padding:  32px
  Content width:  329px (361 - 32)

Para mobile slate dark: mesmo trilho, fundo --cc-bg.
Cream puro sem grade APENAS na surface Cartografia (desktop).

Inventário 22 telas mapeadas (varia conforme app mobile).
Sempre validar mockup HTML em /public/ antes do React/RN.

──────────────────────────────────────────────────────────────────
8. TDAH DESIGN · princípio fundamental
──────────────────────────────────────────────────────────────────

- PESO DECRESCENTE sempre: informação mais importante em cima,
  peso editorial decai pra baixo. NUNCA grid 2D pra dimensão
  temporal/quantitativa — sempre TOC editorial linear.
- LOW VISUAL NOISE: máximo 1-2 acentos gold por view.
  Hairlines sutis (alpha 0.05-0.10). Sem decoração gratuita.
- HIERARQUIA CLARA por size + weight + color, não por boxes coloridos.
- Validado contra Google Sheets (linear, denso, legível) > Material
  Design (chunky, animado).

──────────────────────────────────────────────────────────────────
9. HAIRLINES · técnica Apple Books fade-edge
──────────────────────────────────────────────────────────────────

Divisor horizontal premium = linear-gradient com fade nas pontas:

  .divider {
    height: 1px;
    background: linear-gradient(90deg,
      transparent 0%,
      rgba(233, 238, 242, 0.08) 12%,
      rgba(233, 238, 242, 0.08) 88%,
      transparent 100%);
    margin: 22px 0;
  }

Para separar grupo de dia/seção (Inbox-style), usar DividerEditorial:
  hairline + ✦ (Cormorant italic) + hairline
  
✦ é Cormorant Garamond italic, color var(--cc-accent), 11-12px.

──────────────────────────────────────────────────────────────────
10. SELECTION + SCROLLBAR
──────────────────────────────────────────────────────────────────

::selection {
  background: rgba(212, 168, 90, 0.28);   /* atlas gold alpha */
  color: var(--cc-text-strong);
}

Scrollbar (custom, thin, slate):
  webkit-scrollbar 8px x 8px
  track transparent
  thumb rgba(149, 163, 172, 0.18) → hover 0.32
  border-radius 999px
  border 2px solid transparent + background-clip padding-box
  transition 200ms ease-out

Firefox:
  scrollbar-color rgba(149, 163, 172, 0.22) transparent
  scrollbar-width thin

──────────────────────────────────────────────────────────────────
11. MOBILE SPECIFICS · Apple HIG iOS + Material Android
──────────────────────────────────────────────────────────────────

TOUCH TARGETS · 44pt iOS / 48dp Android MÍNIMO
  Em CSS retina: 44px mínimo, 56px conforto.
  Botão menor que isso = anti-pattern.

SAFE AREAS · env(safe-area-inset-*)
  Top bar:    padding-top: env(safe-area-inset-top)
  Bottom nav: padding-bottom: env(safe-area-inset-bottom)
  Side:       padding-left: env(safe-area-inset-left)
              padding-right: env(safe-area-inset-right)

BOTTOM NAV
  Height: 49pt iOS / 56dp Android + safe area
  Background: var(--cc-surface-sunken) com blur opcional
  Border-top: 1px solid var(--cc-border-soft)

TOP NAV
  Height: 44pt iOS / 56dp Android + status bar safe area
  Title 17px center · back chevron + label left · action right

GESTURES
  Swipe back nativo · NUNCA competir com edge swipe
  Pull-to-refresh com indicator slate teal
  Bottom sheet 75% height padrão (não full-screen)

HOVER · NÃO EXISTE EM MOBILE
  Use :active state com transition 200ms.
  Estados: idle → :active (pressed) → released
  NUNCA hover styles em viewport mobile.

SCROLL
  Momentum nativo (iOS 13+ não precisa -webkit-overflow-scrolling)
  scroll-behavior: smooth em navegação âncora

SPRING ANIMATION
  Preferir spring nativo sobre ease-out em transições de tela
  iOS: UISpring damping 0.8, response 0.45
  RN: useSpring com damping 18, stiffness 220

MODAL · sheet style (não full overlay)
  height: 75vh (ou 100vh fullscreen sheet)
  border-top-radius: 14px (iOS) / 16px (Android)
  drag handle 36x4 rounded no top (4px from edge)
  backdrop: rgba(0, 0, 0, 0.4)

──────────────────────────────────────────────────────────────────
12. ANTI-PATTERNS · NUNCA repita
──────────────────────────────────────────────────────────────────

1. Cream warm em surface não-Cartografia (slate dark é DEFAULT)
2. Drop cap gold first-letter (typo glitch em Q/E/S/C)
3. Italic Cormorant em body operacional (cansa olho em 12h)
4. Pulse halo dots animados (cafona)
5. Pílulas yellow chrome em inline code (vibe SEO blog)
6. Box-shadow 3+ layers stack (over-engineered)
7. Cores saturadas em estado neutro (info-blue em "arquivar" = erro)
8. Mock data (proibido, sempre API real)
9. Letter-spacing negative em body (só em title)
10. Hex hardcoded fora de tokens (quebra theme)
11. Botão touch target <44pt (acessibilidade)
12. Hover style em viewport mobile (não existe hover)
13. Material Design chunky cards com gradient hero
14. Aesop minimalismo sussurrado (Atlas é peso, não sussurro)
15. Glassmorphism / Neumorphism (proibido)

──────────────────────────────────────────────────────────────────
13. INTERACTION PATTERNS · estados canon
──────────────────────────────────────────────────────────────────

BUTTON IDLE → :ACTIVE → SUCCESS
  idle:     bg surface, border soft, text body
  :active:  bg surface-raised, border, transition 150ms
  success:  brief accent-veil flash 300ms, then idle

INPUT FOCUS-VISIBLE (sem mouse)
  outline: none
  box-shadow: var(--cc-focus-ring)
  border-radius: inherit

INPUT FOCUS COM MOUSE
  outline: none (sem ring barulhento)
  border-color: var(--cc-border-strong)

STATUS DOTS ESTÁTICOS
  width/height 6-8px
  border-radius 50%
  background mapeado a estado:
    running  --cc-info
    blocked  --cc-danger
    review   --cc-warning
    passed   --cc-success
    unknown  --cc-neutral
  ZERO animação. ZERO pulse halo.

LOADING (preferir skeleton sobre spinner)
  Skeleton: background gradient sutil (--cc-surface-sunken → --cc-surface)
  Spinner SÓ se ação <2s (botão submit, refresh)

──────────────────────────────────────────────────────────────────
14. CHECKLIST PRÉ-PR (uma tela só está pronta se passar TUDO)
──────────────────────────────────────────────────────────────────

[ ] Hierarquia editorial peso decrescente respeitada
[ ] Atlas gold usado em 1-2 elementos no MÁXIMO por view
[ ] Hairlines fade-edge linear-gradient (não solid line solta)
[ ] Border-radius 4/6/8/10 only
[ ] Box-shadow ≤2 layers (usa var(--cc-shadow-*))
[ ] Cormorant SÓ em ✦ e numerais romanos
[ ] Inter Variable como família principal
[ ] Font features cv11+ss01+kern aplicadas
[ ] Letter-spacing 0 em body, negative só em title
[ ] Focus-visible com var(--cc-focus-ring)
[ ] Reduced-motion guard em todo @keyframes
[ ] Status dots ESTÁTICOS (sem pulse halo)
[ ] Touch targets ≥44pt
[ ] Safe areas respeitadas (top/bottom/sides)
[ ] Bottom sheet 75vh, drag handle, backdrop alpha 0.4
[ ] Modal/transição usa spring nativo, não ease genérico
[ ] Zero mock data (API real, ou silente + TODO)
[ ] Zero hover-only logic (mobile = :active)
[ ] Side-by-side com Linear/Stripe/Codex CLI passa visual check

──────────────────────────────────────────────────────────────────
15. FILOSOFIA · Atlas é wrapper, não substituto
──────────────────────────────────────────────────────────────────

Atlas é wrapper governance multiplicador sobre engines (Claude/Cursor/Codex),
NUNCA substituto. Equação:  resultado = engine × governance.
Quando engine salta N vezes, Atlas herda automaticamente + mantém 10x
governance próprio.

──────────────────────────────────────────────────────────────────
16. PROCESSO DE TRABALHO
──────────────────────────────────────────────────────────────────

1. Plan mode ANTES de codar · estruture decisões antes de implementar
2. AskUserQuestion em ambiguidade · NÃO invente decisão
3. Build verde no fim de cada bloco · npm run build (sem confiar em
   pnpm tauri build exit 0)
4. Fatias finas com peso editorial · uma coisa de cada vez
5. Test golden path em browser/simulator · type-check ≠ feature-check
6. NUNCA mock data
7. Converter datas relativas em absolutas (Thursday → 2026-MM-DD)
8. Commit message no "why" não "what"

──────────────────────────────────────────────────────────────────
17. REFERÊNCIAS VISUAIS (consulte se entrar em dúvida)
──────────────────────────────────────────────────────────────────

POSITIVAS (canon Atlas):
- Codex CLI (slate teal premium, Cormorant ornamental)
- Linear (hierarchy, hairlines, dark warm)
- Mercury (banking premium, atlas gold burnished feel)
- Stripe Dashboard (editorial denso, peso decrescente)
- Apple Books (fade-edge hairlines, serif ornamento)
- Apple HIG iOS (touch targets, safe areas, gestures, sheets)
- Codex CLI (slate teal, status dots estáticos)
- WSJ/NYT/Economist (editorial hierarchy)
- Warp Terminal (dark warm dev tool)

NEGATIVAS (NUNCA imite):
- Material Design 3 (chunky, animado, SaaS premium genérico)
- Tailwind UI default (bg-slate-900 puro sem warmth)
- Aesop / Hermès (sussurro silk soft)
- Notion (cute soft cream)
- Stripe gradient hero (fluid demais)
- Glassmorphism (qualquer site dark com blur excessivo)

──────────────────────────────────────────────────────────────────
18. MENSAGEM DIRETA
──────────────────────────────────────────────────────────────────

Você está implementando UMA tela. NÃO invente design system novo. NÃO
traga vibe SaaS premium. NÃO use Material Design. NÃO use Aesop
minimalismo sussurrado. Use Atlas canon: Don Corleone editorial com
slate teal warm + atlas gold burnished parcimônia + Inter sans
operacional + Cormorant ornamento restrito.

Qualidade > velocidade SEMPRE. Vitor vai revisar tela por tela com
olho de senior designer Linear/Stripe/Apple HIG. Ele vai dar feedback
brutal se algo for amador. Vale a pena fazer ULTRA PREMIUM da
primeira vez do que retrabalhar 52 rodadas como aconteceu no desktop.

Antes de marcar qualquer tela como pronta:
- Compare side-by-side com Linear, Stripe, Apple HIG, Codex CLI
- Passe TODOS os itens do checklist (seção 14)
- Confirme cores via DevTools/Inspector (slate, NÃO cream)
- Verifique zero mock data
- Garanta touch targets ≥44pt e safe areas

Boa implementação. Se você tiver dúvida sobre algum princípio, NÃO
invente — pergunte ao Vitor via AskUserQuestion.

=================================================================
FIM DO BRIEFING · Atlas Ultra Premium Mobile Design Canon
=================================================================
```

---

## Como usar este prompt

### Cenário A · Claude novo via Claude Code / Cursor / Codex
1. Abra nova sessão
2. Cole **tudo entre os `=====`** (sem incluir esse parágrafo, só o conteúdo do bloco acima)
3. Aguarde Claude confirmar leitura
4. Peça a tela: "Implemente a tela de [X] do app mobile Atlas seguindo o canon"

### Cenário B · ChatGPT / Anthropic Console / outro frontend
1. Cole o briefing como **system prompt** (ou primeira mensagem)
2. Garanta que o IA leu e entendeu antes de pedir tela
3. Se possível, anexe screenshot de Linear/Stripe pra confirmar tom

### Cenário C · Quero que IA tenha acesso a memory + docs
Adicione ao final do briefing:

```
CONTEXTO ADICIONAL:
- MEMORY.md em /Users/vitorepf/.claude/projects/-Users-vitorepf-develop-Atlas/memory/
- Doc completo: atlas-desktop/docs/architecture/0007-atlas-desktop-design-system.md
- Anti-patterns: atlas-desktop/docs/anti-patterns/
- Implementação canon: atlas-desktop/apps/desktop/src/surfaces/atlas-ai/
  (52 rodadas de polish aplicadas, copie patterns dela)
```

---

## O que NÃO está neste prompt (intencional)

- Stack específica · varia entre React Native, Expo, web responsivo, Flutter
- Estrutura de pastas mobile · você define quando começar
- Backend endpoints · contrato Atlas Server separado
- Patterns Atlas Desktop específicos (atlas-shell, surfaces) · são desktop-only

Se for criar surface mobile que deve compartilhar canon com desktop, mantenha
nome diferente do desktop (ex: `MobileInboxScreen` ≠ `InboxScreen`).

---

**Origem deste prompt**: extraído de 52+ rounds de polish do Atlas AI surface
(atlas-desktop) + canon do design system (0007 doc, 1700+ linhas) + memory
acumulada do Vitor (TDAH design, quality focus, no mock, motion principle).
Última atualização 2026-05-18.
