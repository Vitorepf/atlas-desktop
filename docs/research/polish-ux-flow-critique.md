# Atlas AI · UX Flow Critique (Journey-Level)

Auditoria: 2026-05-15
Escopo: 13 screenshots `atlas-ai-*.png` + código real em `apps/desktop/src/surfaces/atlas-ai/` + comparação com Claude.ai, Cursor 2.0, Codex CLI, Linear, Notion AI, Mercury.
Persona: UX researcher senior em AI chat apps. Avaliação de **experiência de uso**, não pixel polish.
Operador-alvo: usuário com TDAH, alto QI, baixa tolerância a fricção, exige peso editorial silencioso (Don Corleone, não Stripe Atlas).

---

## 1. Resumo Executivo — Frictions Globais

A tela hoje está num **paradoxo cruel**: o trabalho de polish já feito (✦ dividers, hero editorial, optimistic bubble, ThinkingState com fases, Calmaria mode) está em nível Apple/Linear. Mas a **jornada** ainda é a de um SaaS comum porque três decisões macro deixam o operador *empurrando a interface*, não sendo carregado por ela:

### G1. NÃO HÁ MOMENTO DE BOAS-VINDAS HUMANO
O operador entra direto numa tela densa de 3 colunas com workspace, threads agrupadas por projeto, header bar, composer, right rail. Não existe um *segundo zero* onde a tela diga "olá, eu sou o Atlas, posso fazer X agora". O Hero existe mas só aparece quando `selectedThreadId === null` — e como o histórico abre na última thread, o operador típico **nunca vê o Hero**. Isso é a primeira impressão "amador": a app não tem rosto. Comparação: Claude.ai abre num espaço infinito de prompt sugerido + "What's on your mind?". Linear abre num inbox de issues priorizadas. Atlas abre num arquivo de threads.

### G2. STREAMING NÃO ENTREGA PROMESSA DE STREAMING
O `AtlasAiStreamingIndicator` + `ThinkingState` mostra **fases por tempo** (`na fila` → `claude pensando` → `claude pensando há 24s` → `ainda pensando — pode demorar`). Isso é meta-honestidade premium, mas o operador **nunca vê tokens aparecendo um a um**. Quando a resposta chega, ela aparece toda de uma vez (popping in). Claude.ai, ChatGPT, Cursor, Codex: tokens cascateando à medida que o LLM produz. Atlas: tela em silêncio, depois zás. Isso é a segunda razão "amador": parece batch, não stream — independente do backend ser SSE-capable.

### G3. RIGHT RAIL "PLANO" NÃO TEM CONTEÚDO 90% DAS VEZES
O Plano lê `thread.metadata.suggested_next_step / objective / risks / open_questions` — campos que **raramente são preenchidos** pelo backend (vide `feedback_atlas_no_mock`: nada de mock). Resultado: o operador clica em "Plano", lê "Esta thread ainda não tem plano explícito", e a confiança despenca. Right rails caros que ficam vazios são um anti-pattern Linear/Mercury já abandonou. Notion AI nem tem right rail; usa overlays.

### G4. COMPOSER TEM MUITOS CONTROLES PARA O ESTADO COMUM
3 pills no footer (Modo · Provider · contador) + 3 botões (anexo / nova thread / enviar) + 1 mensagem condicional (warning workspace) + 1 estado de loading. São 7 zonas competindo pela atenção numa barra de 40px. Claude.ai = 1 botão de mic + send + attach + model picker discreto. Codex = só texto + atalho. **A pergunta certa é: o que cabe no Cmd+Enter sem precisar olhar?** Hoje o operador precisa olhar e escolher antes de digitar.

### G5. FEEDBACK DE GESTOS HUMANOS É SILENCIOSO DEMAIS
- Clicar em thread: sem animação de transição (instant swap)
- Clicar em "Plano" tab: troca sem feedback visual além da underline
- Pressionar Cmd+Shift+. (Calmaria): toggle visível mas sem confirmação calorosa
- Copy code block: o ícone vira ✓ por 1.4s — funcional mas frio (Codex/Claude têm pill "Copied!" descer suavemente)
- Send com Enter: composer esvazia *sincronicamente* (linha 152 de `AtlasAiSurface.tsx`) — gesture confirmado mas sem celebração visual (a bolha otimista aparece em outro lugar)

Esses 5 frictions globais explicam por que mesmo após 9 rounds de polish o operador ainda sente "amador". **Polish é estado de coisas. UX é continuidade de gestos.** Atlas tem o primeiro, falta o segundo.

---

## 2. Jornada · 10 Steps com Friction Scores

Friction score: ⭐⭐⭐⭐⭐ = invisível (ótimo), ⭐ = horrível.

### Step 1 · Abrir Atlas Desktop · Primeira impressão

**Observado (screenshots 71, 79):** Tela carrega num layout 3-col já com thread aberta, header "Atlas AI · uma única inteligência" minúsculo no topo, conversas na esquerda agrupadas por projetos, right rail com Contexto/Plano tabs. Nenhum momento de "olá".

**Score: ⭐⭐ (2/5)** — overload imediato, sem foco. O olho não sabe onde pousar.

**Diagnóstico:** O design assumiu *operador retornando*, não *operador chegando*. Mas mesmo o retornante quer **um sinal de vida** antes de mergulhar. Claude.ai dá esse sinal com o composer enorme centralizado e "How can I help you today?". Linear dá com o inbox priorizado. Atlas dá com... uma thread arbitrária.

**Recommendation (UX):**
- Trocar comportamento default: se `lastSelectedThreadId` é > 24h atrás, mostrar Hero novamente. Senão re-abrir.
- Hero deve ter um pulse de 1.5s no eyebrow "Atlas AI · Geral" quando abre — não animação chamativa, só um fade-in editorial (0.95→1.0 opacity em 600ms). Sinaliza "estou aqui".
- Adicionar uma linha-cumprimento contextual sob o título: "Boa noite, Vitor. 3 threads desde ontem." (lê last_active threads count). Mercury faz isso. É o gesto Don Corleone — você é reconhecido, não saudado em massa.

---

### Step 2 · Clicar numa thread "Esta funcionando ?"

**Observado (screenshot 79 → 71):** Click → conteúdo trocou. Sem transição. Sem skeleton. Apenas swap.

**Score: ⭐⭐⭐ (3/5)** — funcional mas seco.

**Diagnóstico:** Atlas tem `auto-scroll smooth` (linha 228 de `AtlasAiConversation.tsx`) mas só ao mudar messageCount. Ao trocar de thread, o efeito é teletransporte. Claude.ai usa fade-cross 220ms. Cursor desliza horizontal. Notion troca com fade simples 180ms.

**Recommendation (UX):**
- Adicionar fade-cross 200ms no `.atlas-ai-conversation` quando o `detail.id` muda. Não 400ms (cafona) — 200ms é o sweet-spot Apple HIG.
- Quando loading > 150ms, mostrar skeleton de 2 message bubbles (sem chrome de loader spinner — só shapes silenciosos com shimmer sutil). Já existe `<p>carregando conversa…</p>` que é texto puro = parece chat 2008.
- A thread row clicada deve ter uma flash sutil (background veil accent 0.05 que decai em 400ms). Confirma o clique.

---

### Step 3 · Ler resposta longa do Atlas (✦ dividers, listas, code pills)

**Observado (screenshots 67-71):** Resposta com 4 seções enumeradas, ✦ dividers, code pills, tabela. Renderização correta, tipografia editorial bonita. MAS:

**Score: ⭐⭐⭐⭐ (4/5)** — visualmente forte, mas falta um detalhe load-bearing.

**Diagnóstico:** A resposta é boa de **olhar**, fraca de **escanear**. Operador TDAH precisa de pontos-de-pouso. Você tem heading H1/H2/H3 mas ele aparece numa thread já longa **sem TOC sticky** nem **anchor links**. Claude.ai não tem TOC. **Cursor agentic mode tem**. Linear tem.

A drop-cap `::first-letter` em H3 (linha 2109 do CSS, ver `Estado atual` no screenshot 72 e `Superfícies` no 73) é uma decisão arriscada — ela funciona em prosa editorial corrida mas em **lista enumerada** de seções (`I.`, `II.`) parece *erro de renderização*, como se o número tivesse sido transformado em ornament errado. Screenshot 72: "**E**stado atual" — a italic gold do E parece bug, não premium. **REMOVER drop cap em H3** (você já marcou isso na memory mas não removeu do CSS).

**Recommendation (UX):**
- Remover `.atlas-ai-md-h3::first-letter` totalmente (linhas 2108-2115 do CSS). Heading editorial não precisa de ornament — peso + cor + tracking já basta. Drop cap só em paragráfico longo aberto por capítulo, e aqui não temos isso.
- Adicionar **mini-TOC flutuante** quando a mensagem do Atlas tem >3 H2/H3: bloco discreto sticky no topo da bubble, links cliçáveis para cada seção. Estilo: `1. Mapa · 2. Forge Rivals · 3. Camadas · 4. Governance`. Hover = subtle highlight. Click = smooth scroll para a seção. Linear faz isso em docs longos. Operador TDAH agradece muito.
- ✦ dividers entre seções estão ótimos. Manter.

---

### Step 4 · Copiar trecho de código de um code block

**Observado:** Code block tem header "text" e botão copiar (ícone limpinho 13px). Click → ícone vira ✓ por 1400ms. Sem tooltip, sem pill "Copied!".

**Score: ⭐⭐⭐⭐ (4/5)** — funcional, perto do Codex. Mas é frio.

**Diagnóstico:** O Codex CLI (que você está copiando) tem **o mesmo gesto**: ícone vira ✓ por 1.5s. Mas Claude.ai e Cursor 2.0 adicionam um **toast pill** "Copied" que desliza do topo do code block. Por quê? Porque o ícone do botão está no canto superior direito do bloco; quando o code block é longo, o operador rolou a tela enquanto lia e o feedback `✓` pode estar fora da viewport. Pill toast resolve.

Atlas também tem outro problema sutil: o code block header diz "text" quando a linguagem não foi detectada (screenshot 76). "text" é tecnicamente correto mas parece pobre — Codex usa `plain text`, GitHub usa `(no language)`. Pequeno detalhe que sinaliza "feature incompleta".

**Recommendation (UX):**
- Adicionar toast pill: após copy, um span discreto "Copiado" aparece flutuando ao lado do botão por 1.4s, mesmo timeout. Slide-in 8px de baixo, fade in 180ms, fade out 220ms. Codex pattern.
- Trocar fallback de "text" para "—" ou hide language inteiro quando `lang === null`. Header com só o botão copy é mais limpo que "text" texto.
- Adicionar atalho de teclado: focar code block + `⌘C` copia. Hoje só funciona com select-all + copy padrão.

---

### Step 5 · Clicar tab "Plano" no right rail

**Observado (screenshot 78):** Tab "Contexto / Plano" com underline accent no ativo. Click → conteúdo troca. Sem transição.

**Score: ⭐⭐ (2/5)** — pior tab UX do app.

**Diagnóstico:** Mais que a transição (que poderia ser fade 180ms como Step 2), o real problema é o que **vem depois do click**. Em 80% dos casos o Plano está vazio porque o backend não preencheu metadata. O operador vê "Esta thread ainda não tem plano explícito" e pensa "feature inacabada". Isso é pior que não ter tab.

**Recommendation (UX):**
- Pintar um *dot indicator* na tab "Plano" quando o plano tem ≥1 campo populado: `Plano•` (bullet accent 4px à direita). Operador vê de longe se vale o click. Linear faz isso com badge counters em todas as tabs.
- Quando o Plano está vazio, em vez de paragráfico apologético, mostrar **um único call-to-action editorial**: "Atlas começa a montar o plano quando você descreve o objetivo. [Adicionar objetivo]" → click abre um input inline que ajusta `metadata.objective`. Transforma vazio em ação.
- Se realmente o plano nunca está populado (backend não suporta), **remover a tab Plano** e deixar só Contexto. Linear: "se uma feature não está pronta, ela não existe". Vazio crônico machuca confiança mais que ausência.

---

### Step 6 · Clicar no composer para começar a digitar

**Observado (screenshot 70-71):** Composer é uma textarea grande com placeholder `"Bug, debug, feature, review · arrasta arquivo, cola screenshot · Enter envia, Shift+Enter quebra linha"`. Foot bar com Modo / Provider / contador / botões.

**Score: ⭐⭐⭐ (3/5)** — placeholder é um manual, não um convite.

**Diagnóstico:** O placeholder atual é **denso operacional** (tudo certo, manual de usuário). Mas Claude.ai usa `"Reply to Claude..."` (3 palavras). ChatGPT usa `"Message ChatGPT..."`. Cursor usa `"Plan, search, build anything..."`. Notion usa `"Ask Notion AI..."`. **Curto + verbo + objeto**. Atlas tenta enfiar 4 atalhos no placeholder e isso é overload TDAH.

Composer também muda placeholder por modo (linhas 393-398 de `AtlasAiComposer.tsx`), o que é legal — mas o conteúdo dos 3 placeholders também é longo demais.

**Recommendation (UX):**
- Encurtar placeholders drasticamente:
  - `general`: "Pergunte qualquer coisa ao Atlas..."
  - `operational`: "Diagnóstico, status, próxima ação..."
  - `programming`: "Bug, debug, feature ou review..."
- Mover os atalhos `Enter envia · Shift+Enter quebra` para uma **linha helper** abaixo do composer, ainda mais discreta (`font-size: 10.5px; color: var(--cc-text-faint); opacity: 0.55`). Aparece só quando o composer está focado. Apple-class.
- Quando o foco entra no composer, animar **um subtle border-accent fade** (0→0.5 opacity em 240ms). Confirma foco sem ser intrusivo.

---

### Step 7 · Digitar "como funciona x" + Enter

**Observado:** Operador digita. Textarea cresce até 360px (auto-resize OK). Contador `~12 tokens` aparece. Pressiona Enter. Composer esvazia. Optimistic bubble aparece em cima com "enviando agora…" italic gold em shimmer.

**Score: ⭐⭐⭐⭐ (4/5)** — quase ótimo, só falta um beat.

**Diagnóstico:** O gesto está bom — a textarea esvazia sincronicamente (linha 152 de `AtlasAiSurface.tsx`), o que é correto Codex-grade. A optimistic bubble com border-left accent pulsando é Apple. Mas existe um **beat ausente**: entre o Enter e a bubble aparecer, há ~50-80ms de tela inalterada. O olho não captura. Claude.ai resolve com um "send arrow" que **anima para cima e some** (transform: translateY(-12px) + opacity 0 em 200ms). É o "delivered" do iMessage.

**Recommendation (UX):**
- Quando user pressiona Enter (ou click send), o botão "enviar" deve animar saindo (svg arrow translate-up 12px + fade out 180ms), depois aparecer de volta após sending termina. Confirma gesto sem latência.
- O contador `~tokens` está bom. Manter.
- O shimmer no "enviando agora…" está EXCELENTE (sweep gradient 2.4s). Manter — é o melhor detalhe da tela hoje.

---

### Step 8 · Aguardar resposta · Streaming bubble

**Observado (screenshot 71):** Bubble Atlas com `<ThinkingState>`: diamante ✦ + "claude ainda pensando — pode demorar" (italic faint). Sem tokens aparecendo um a um.

**Score: ⭐⭐ (2/5)** — promessa de stream sem o stream.

**Diagnóstico:** ESTE É O CRIME #1. O componente se chama `AtlasAiStreamingIndicator` mas não streamea. Ele só mostra fases por tempo. O backend pode estar SSE-streaming, mas a UI espera o `detail` completo e renderiza tudo de uma vez. Isso é a maior razão "amador": **AI chat sem token streaming em 2026 sinaliza tech-debt de produto**, mesmo se internamente for opcional.

Outra falta crítica: **não há botão STOP**. Operador aguarda 60s, percebe que falou bobagem no prompt, quer cancelar. Não pode. ChatGPT, Claude.ai, Cursor — todos têm. Atlas obriga aguardar até o final ou recarregar a página.

A ThinkingState está semanticamente forte (fases por tempo são honestas), mas isoladamente parece "loading wheel disfarçado de poema".

**Recommendation (UX):**
- **CRÍTICO:** Implementar token streaming real. O backend `/api/atlas/ai/stream` (se existe) deve emitir SSE chunks. O frontend deve renderizar `pendingTrace.partial_content` à medida que chega, dentro da `<StreamingBubble>` atual. Markdown parsing deve ser progressivo (já tem `useMemo` em `MessageBody`, basta o conteúdo ir crescendo).
- Adicionar botão **Parar** flutuante: quando `isStreaming === true`, um pill discreto "Parar resposta" aparece no canto inferior direito do bubble. Cmd+. cancela. Codex pattern.
- Manter ThinkingState mas só nos primeiros 800ms (antes do primeiro token chegar). Depois esconder — quando há texto chegando, o ThinkingState é redundante e cafona.
- Adicionar **caret blink suave** ao final do texto streaming (`▍` accent piscando em 600ms cycle). Visual cue "ainda está digitando". ChatGPT clássico.

---

### Step 9 · Resposta chega · Renderização

**Observado:** Texto aparece todo de uma vez. Sem animação. Sem bump. Sem flicker.

**Score: ⭐⭐⭐ (3/5)** — neutro, mas falta cerimônia.

**Diagnóstico:** Quando o token streaming for implementado (Step 8 fix), este step ganha vida sozinho. Mas para a versão atual sem stream: a resposta popping in é abrupta. Claude.ai faz subtle fade-in (200ms) na bubble inteira. Cursor faz slide-up 8px.

**Recommendation (UX):**
- Quando o stream completa (ou no caso atual, quando `messages.length` incrementa), animar a bubble nova: `opacity 0→1 + translateY(8px→0)` em 280ms ease-out. Linear/Apple. Discreto.
- Auto-scroll smooth já está implementado (`messagesEndRef.scrollIntoView({behavior: 'smooth'})`). Confirmar que está sendo chamado **após** a animação iniciar — senão o scroll antecipa e a bubble pula.

---

### Step 10 · Alternar Calmaria · Cmd+Shift+.

**Observado:** Pressiono Cmd+Shift+. — toggle global. Header bar tem botão "calmaria" que muda visual quando ativo (`is-active` class).

**Score: ⭐⭐⭐ (3/5)** — funciona mas não premia.

**Diagnóstico:** Calmaria é **o conceito mais Don Corleone do app**. Foi o feedback inovação spec #11. Mas a transição entre estados é seca: badges/receipts/decision somem instantaneamente. Operador TDAH que ativou Calmaria especificamente para descansar o olho vê um *snap* de remoção, não um *desvanecer* de bagagem.

Além disso, a descoberta é fraca. O botão "calmaria" no header bar com o glyph yin-yang minúsculo (`circle + arc 50%`) não convida click — parece status indicator. Operador que não leu memo nunca descobre.

**Recommendation (UX):**
- Transição premium: quando Calmaria toggle, todos os `.atlas-calmaria-hide` fazem `opacity 1→0 + height shrink` em 320ms ease-in-out. Reverso ao ativar (slide-in). Apple/Mercury elegance.
- Toast de confirmação minúsculo (Mercury pattern): "Calmaria · só texto" desce do topo do composer por 1.6s. Confirma intent.
- Mover Calmaria para **command palette** (Cmd+K). Já que você não tem command palette ainda... esse é outro pain point separado.
- Renomear botão para `Calmaria · ⌘⇧.` (mostrando atalho inline). Educa descoberta.
- Glyph atual (yin-yang) está bom mas precisa de tooltip ao hover: "Atlas em silêncio · só texto e composer".

---

## 3. Top 5 UX Issues Priorizados (por impacto / dificuldade)

| # | Issue | Impacto | Dificuldade | Por quê é crítico |
|---|-------|---------|-------------|-------------------|
| 1 | **Sem token streaming real** (Step 8) | MASSIVO | Médio (backend já capable, frontend precisa absorver chunks) | Single biggest "amador" signal em 2026. Operador acostumado a Claude/ChatGPT espera tokens cascateando. Sem isso, a tela parece bot de Bubble 2018. |
| 2 | **Hero não aparece** (Step 1) + sem boas-vindas humanas | ALTO | Baixo (1 hora de lógica) | Falta de "olá" + tela densa = primeira impressão fria. Trocar default para mostrar Hero quando última thread > 24h e adicionar cumprimento contextual ("Boa noite, Vitor. 3 threads desde ontem.") |
| 3 | **Sem botão Parar** durante streaming (Step 8) | ALTO | Baixo | UX padrão de TODOS os chat AI em 2026. Sua falta sinaliza "produto inacabado". Cmd+. atalho global. |
| 4 | **Drop cap em H3 quebra hierarquia** (Step 3) | MÉDIO | Trivial (1 linha CSS) | A italic gold ::first-letter em headings curtos parece bug. Remover. |
| 5 | **Plano vazio crônico** (Step 5) | MÉDIO | Médio (decisão de produto: ou popular ou esconder) | Right rail vazio destrói confiança. Ou implementa o backend de plan extraction, ou esconde a tab até ter dados. Linear: "feature inacabada = feature ausente". |

---

## 4. Comparison Matrix · Atlas vs Claude / Cursor / Codex / Linear / Mercury

Por step da jornada (escala 1-5):

| Step | Atlas hoje | Claude.ai | Cursor 2.0 | Codex CLI | Linear | Mercury |
|------|------------|-----------|------------|-----------|--------|---------|
| 1. Welcome / entry | 2 | 5 (big composer + suggested) | 4 (agent-centric layout) | 3 (terminal raw) | 5 (priority inbox) | 5 (greeting + balance card) |
| 2. Thread switch | 3 | 4 (fade) | 4 (slide) | n/a | 4 (instant w/ subtle highlight) | n/a |
| 3. Read long answer | 4 | 4 (no TOC, no first-letter) | 5 (agent runs + diffs) | 4 (plain) | 5 (heading anchors) | n/a |
| 4. Copy code | 4 | 5 (pill toast) | 5 ("Apply" button + copy) | 4 (icon only) | n/a | n/a |
| 5. Side panel (Plano-like) | 2 | 4 (Artifacts) | 5 (file tree + diff) | n/a | 4 (issue meta panel) | 5 (transaction details) |
| 6. Composer focus | 3 | 5 (minimal) | 4 (composer w/ model picker) | 5 (raw text input) | 4 (compose dialog) | 4 (form-style) |
| 7. Send gesture | 4 | 5 (send arrow anim) | 4 (instant) | 5 (Enter raw) | 4 (instant) | n/a |
| 8. Streaming | 2 | 5 (token-by-token + stop) | 5 (live diff + stop) | 5 (live terminal output) | n/a | n/a |
| 9. Response arrival | 3 | 5 (fade-in finished) | 5 (diff committed visual) | 5 (terminal new line) | n/a | n/a |
| 10. Mode toggle / calmaria | 3 | 4 (compact toggle in profile) | 5 (theme + density) | n/a | 5 (Cmd+K everything) | 5 (toggle w/ confirmation) |

**Atlas ranking total: 30/50.** Cursor/Claude na faixa 45+. Mercury na 45+ pra o que ela faz.

Diferença chave: Atlas tem **polish de superfície (45+)**, mas **continuidade de jornada (30)**. Os "buracos" estão nos *betweens*, não nos *states*.

---

## 5. Recommendations Concretas · WHAT / HOW

### R1 · Token Streaming Real (impacto: massivo · 1-2 dias)

**WHAT:** Bubble do Atlas mostra texto crescendo à medida que LLM produz, com caret blink ao final + botão "Parar" lateral.

**HOW:**
1. Backend (assumindo já tem SSE em `/api/atlas/ai/stream`): garantir que cada chunk emite `{type: 'token', content: '...'}` ou `{type: 'partial', full_text: '...'}`.
2. Frontend `useAtlasAi.ts`: adicionar `pendingTrace.partial_content` que cresce a cada chunk recebido.
3. `StreamingBubble` atual (linha 172 de `AtlasAiConversation.tsx`): renderizar `<AtlasAiMessageBody content={pendingTrace.partial_content} />` quando há partial — manter ThinkingState só durante os primeiros 800ms (antes do primeiro token).
4. Adicionar caret CSS:
   ```css
   .atlas-ai-message-streaming-quiet .atlas-ai-md-p:last-child::after {
     content: '▍';
     color: var(--cc-accent);
     animation: atlas-ai-caret-blink 800ms steps(2) infinite;
     margin-left: 2px;
   }
   @keyframes atlas-ai-caret-blink { 50% { opacity: 0; } }
   ```
5. Botão Parar: pill discreto absolute positioned bottom-right da StreamingBubble. Cmd+. global hotkey chama `atlas.cancelPending()`.

---

### R2 · Welcome / Hero Sempre Visível (impacto: alto · 1h)

**WHAT:** Quando operador abre Atlas, se `lastSelectedThreadId === null` OU se `last_active_at` da thread > 24h, mostra Hero. Hero ganha cumprimento contextual.

**HOW:**
1. `useAtlasAi.ts` — adicionar lógica: ao montar, se a última thread foi tocada há > 24h, fazer `selectThread(null)`. Forçar Hero.
2. `AtlasAiHero.tsx`: adicionar prop `greeting` com texto contextual baseado em hora do dia + threadCount:
   ```ts
   function buildGreeting(threadCount: number): string {
     const h = new Date().getHours()
     const period = h < 6 ? 'Boa madrugada' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
     if (threadCount === 0) return `${period}. Vamos começar?`
     return `${period}. ${threadCount} conversa${threadCount === 1 ? '' : 's'} desde ontem.`
   }
   ```
3. Renderizar greeting acima do eyebrow do Hero, em italic faint (font-style: italic; color: var(--cc-text-faint); font-size: 13.5px; margin-bottom: 6px).
4. Adicionar fade-in inicial: `.atlas-ai-hero { animation: atlas-ai-hero-rise 480ms ease-out; } @keyframes atlas-ai-hero-rise { from { opacity: 0; transform: translateY(8px); } }`

---

### R3 · Remover Drop Cap em H3 (impacto: médio · 1 linha)

**WHAT:** Remover `.atlas-ai-md-h3::first-letter` totalmente. H3 fica peso normal sans, sem ornament.

**HOW:** Deletar linhas 2108-2115 de `atlas-ai.css`. Done.

---

### R4 · Plano Tab · Decisão de Produto (impacto: médio · variável)

**WHAT:** Ou popula o Plano de verdade, ou esconde.

**HOW (opção A · esconder):**
1. `AtlasAiSidePanel.tsx`: detectar se o backend está populando `metadata.suggested_next_step / objective / risks`. Se em 10 threads consecutivas todas vêm vazias → esconder a tab.
2. Tab "Contexto" vira full-width sem irmã.

**HOW (opção B · popular):**
1. Backend `/api/atlas/ai/threads/{id}/distill` (novo endpoint): após cada turn do Atlas, rodar uma chamada barata que extrai: objetivo declarado, próximo passo, riscos mencionados, files citados, perguntas em aberto.
2. Persistir em `ai_threads.metadata`.
3. Right rail Plano ganha dot indicator quando ≥1 campo populado.

**Recomendação:** Opção A imediato, opção B no próximo sprint. Mercury removeu features inteiras que não estavam prontas — confiança >> superfície.

---

### R5 · Botão Parar + Cmd+. Global (impacto: alto · 30min)

**WHAT:** Cancelar streaming em curso. Padrão de TODOS os chat AI 2026.

**HOW:**
1. `useAtlasAi.ts`: adicionar `cancelPending()` que chama backend `/api/atlas/ai/cancel/{trace_id}`.
2. `StreamingBubble`: adicionar pill flutuante:
   ```tsx
   {isActive && (
     <button className="atlas-ai-stop-btn" onClick={onCancel} title="Parar resposta · ⌘.">
       <svg>...</svg> Parar
     </button>
   )}
   ```
3. Global keydown listener em `AtlasAiSurface`: `if (e.metaKey && e.key === '.') { e.preventDefault(); atlas.cancelPending() }`.

---

### R6 · Placeholders Compactos no Composer (impacto: médio · 5min)

**WHAT:** Placeholder vira curto + verbo + objeto. Manual move pra helper line.

**HOW:**
1. `AtlasAiComposer.tsx` linhas 393-398: trocar placeholder por:
   ```ts
   const placeholder = mode === 'programming' ? 'Bug, debug, feature ou review...' :
                       mode === 'operational' ? 'Diagnóstico, status ou próxima ação...' :
                       'Pergunte qualquer coisa ao Atlas...'
   ```
2. Adicionar `<p className="atlas-ai-composer-helper">Enter envia · Shift+Enter quebra linha</p>` abaixo do composer, só visível em `:focus-within`.
3. CSS:
   ```css
   .atlas-ai-composer-helper {
     opacity: 0; transition: opacity 240ms ease-out;
     font-size: 10.5px; color: var(--cc-text-faint);
     margin: 4px 0 0; padding-left: 4px;
   }
   .atlas-ai-composer-v2:focus-within ~ .atlas-ai-composer-helper { opacity: 0.55; }
   ```

---

### R7 · Transição Cross-Fade ao Trocar Thread (impacto: médio · 15min)

**WHAT:** Ao clicar em outra thread, fade-cross 200ms em vez de teleport.

**HOW:**
1. `AtlasAiConversation.tsx`: envolver retorno em `<div key={detail?.id} className="atlas-ai-conv-keyed">...`
2. CSS:
   ```css
   .atlas-ai-conv-keyed { animation: atlas-ai-fade-in 200ms ease-out; }
   @keyframes atlas-ai-fade-in { from { opacity: 0; } to { opacity: 1; } }
   ```
3. Quando loading > 150ms: skeleton de 2 message bubbles silenciosos (3 lines + 4 lines) com shimmer 1.2s.

---

### R8 · Toast Pill ao Copiar Code (impacto: baixo · 15min)

**WHAT:** Após copy, pill "Copiado" desliza ao lado do botão 1.4s.

**HOW:**
1. `AtlasAiMessageBody.tsx` `CodeBlock`: adicionar `<span className="atlas-ai-md-codeblock-copy-toast">Copiado</span>` quando `copied === true`.
2. CSS:
   ```css
   .atlas-ai-md-codeblock-copy-toast {
     position: absolute; right: 36px; top: 6px;
     font-size: 11px; color: var(--cc-accent);
     opacity: 0; transform: translateY(4px);
     animation: atlas-ai-toast 1400ms ease-out;
   }
   @keyframes atlas-ai-toast {
     15%, 75% { opacity: 1; transform: translateY(0); }
   }
   ```

---

### R9 · Linha-Indicator no Tab Plano com Conteúdo (impacto: baixo · 10min)

**WHAT:** Tab "Plano•" com bullet accent quando há dados.

**HOW:**
1. `AtlasAiSidePanel.tsx`: passar `planHasContent` boolean para tab button.
2. CSS: `.atlas-ai-side-tab[data-has-content="true"]::after { content: '•'; color: var(--cc-accent); margin-left: 4px; }`.

---

### R10 · Calmaria com Transição Smooth (impacto: médio · 20min)

**WHAT:** Ativar Calmaria faz badges/receipts desvanecerem em 320ms em vez de snap.

**HOW:**
1. CSS atual: `.atlas-calmaria .atlas-calmaria-hide { display: none; }` → mudar para:
   ```css
   .atlas-calmaria-hide {
     transition: opacity 280ms ease-out, max-height 320ms ease-in-out, margin 320ms ease-in-out;
   }
   .atlas-calmaria .atlas-calmaria-hide {
     opacity: 0; max-height: 0; margin: 0; overflow: hidden; pointer-events: none;
   }
   ```
2. Toast confirmação: usar mesmo padrão R8 mas no header bar: "Calmaria · só texto" / "Calmaria desligada".

---

## Conclusão · O Que Falta Realmente

O Atlas AI já tem **alma editorial** (✦, hairlines, ThinkingState com fases honestas, Calmaria mode, optimistic bubble shimmer dourado). É raro. Polish #67-#79 entregou um nível visual que 90% dos AI chats não chega.

Mas a **jornada do operador é cortada em 5 lugares**:
1. Ele chega e não é cumprimentado.
2. Ele aguarda e não vê o LLM trabalhando (sem stream).
3. Ele tenta parar e não pode.
4. Ele explora o Plano e encontra vazio.
5. Ele alterna Calmaria e sente snap.

Os 4 primeiros são **fixes de produto/engenharia**, não de CSS. R1 (token streaming) é o que vai mover Atlas de "amador" para "Claude.ai-grade" mais que qualquer outro polish. Sem ele, mais 9 rounds de hairline-fixing não tiram a app do paradoxo.

O 5º (Calmaria transition) é o detalhe Apple-class — a cerimônia silenciosa do gesto premium.

**Ordem de execução sugerida:**
1. R3 (drop cap H3) — 1 linha, ganha credibilidade instant
2. R6 (placeholders) — 5 min, simplifica composer
3. R2 (Hero sempre + greeting) — 1h, primeira impressão
4. R5 (botão Parar) — 30min, paridade competitiva mínima
5. R4 (Plano · esconder ou popular) — decisão de produto
6. R1 (token streaming) — 1-2 dias, o crime corrigido
7. R7, R8, R9, R10 — polish final

Após isso, mais nenhum operador honesto vai chamar "amador" — vai chamar "isso é o Atlas".

---

## Sources

- [AI Chat UI Best Practices 2026 — thefrontkit](https://thefrontkit.com/blogs/ai-chat-ui-best-practices)
- [Cursor 2026: Composer, Agent Mode, MCP & Background Agent](https://www.deployhq.com/guides/cursor)
- [Linear command palette pattern · UX Patterns dev](https://uxpatterns.dev/patterns/advanced/command-palette)
- [AI Loading States Pattern · UX Patterns dev](https://uxpatterns.dev/patterns/ai-intelligence/ai-loading-states)
- [Notion AI sidebar patterns · UX Collective](https://uxdesign.cc/where-should-ai-sit-in-your-ui-1710a258390e)
- [Mercury New User Onboarding · Product Onboarding](https://productonboarding.com/examples/mercury-new-user-onboarding)
- [Smart Interface Design Patterns · Loading and Progress UX](https://smart-interface-design-patterns.com/articles/designing-better-loading-progress-ux/)
- [Codex Plan Mode copy button feature request · GitHub](https://github.com/openai/codex/issues/10561)
- [AI Chatbot Welcome Message Examples · LiveChatAI](https://livechatai.com/blog/ai-chatbot-welcome-message-examples)
