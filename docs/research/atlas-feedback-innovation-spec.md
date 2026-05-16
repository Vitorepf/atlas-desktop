# Atlas AI · Feedback Architecture Innovation Spec

> **Status**: research draft · 2026-05-15
> **Owners**: Atlas Desktop UX research
> **Scope**: surface `atlas-ai` (chat com IA) — arquitetura de feedback que vai ALÉM de Cursor, Claude Code, Codex CLI, Cognition Devin
> **Canon prereq**: leia `docs/architecture/0007-atlas-desktop-design-system.md` (DNA visual) e `apps/desktop/src/surfaces/atlas-ai/types.ts` (contratos de trace) antes de implementar.
> **Princípio operacional**: nenhuma inovação aqui justifica violar o DNA. Don Corleone editorial sempre. Don nunca pisca em verde-semáforo.

---

## 0 · Resumo executivo

**Estado-da-arte 2026 (síntese honesta).** Os players líderes convergem em padrões já maduros: Cursor mostra agentes paralelos em grid (Mission Control / Agent Tabs), Claude Code expõe `thinking` em streaming com modos `summarized`/`raw`, Devin v3 entrega Focus Mode + child sessions com TODOs visíveis, Linear publica AIG (Agent Interaction Guidelines) exigindo *identidade clara · feedback imediato · estados thinking/waiting/executing/finished · disengagement sob comando · responsabilidade humana final*. Perplexity normalizou citação inline + Copilot follow-up. GitHub Copilot Coding Agent introduziu `ask_user` tool para clarificação inline. v0 estabeleceu "live preview + side panel de código" como esperado. XAI/HCI 2026 catalogou três padrões canon: **Confidence Visualization (>80%/50-80%/<50%)**, **Transparency Moments por reversibilidade**, e **Interactive Reasoning Tree** (Hippo/UIST'25). O denominador comum: *transparência sob demanda, não data dump*; *identidade não-humana*; *undo robusto*.

**Onde Atlas pode chegar (ambição).** Os líderes têm um teto cultural: SaaS-premium genérico (Linear/Vercel/Notion). Atlas tem três vetores que ninguém combina: (1) **DNA editorial Don Corleone** — peso silencioso, hairlines bronze, Cormorant italic, anti-semáforo — que transforma feedback de "notificação chamativa" em "anotação manuscrita à margem"; (2) **TDAH-first** — hierarquia ultra-decrescente onde só UM elemento pode "respirar" por vez; (3) **kernel próprio com trace pipeline rico** (status, provider, latency_ms, metadata, atlas_dev_runtime, expected_artifacts, decision_mode) já implementado — não precisamos pedir nada novo do modelo, só *ler honestamente o que já temos e renderizar com peso*. As 14 inovações abaixo elevam Atlas de "chat de IA bem feito" para "instrumento de orquestração de IA — calmaria, evidência, peso editorial — em uma classe que nenhum concorrente disputa".

---

## 1 · Padrões pesquisados (estado-da-arte 2026)

### 1.1 · Concorrentes diretos

| Player | Padrão de feedback dominante | Gap onde Atlas pode atacar |
|---|---|---|
| **Cursor** ([cursor.com/product](https://cursor.com/product)) | Mission Control (grid de agentes paralelos), Agent Tabs, Design Mode (anotar UI no browser), terminal output inline | Visualmente ruidoso (SaaS roxo/preto), sem hierarquia editorial — todo agente parece igualmente urgente |
| **Claude Code CLI** ([docs](https://platform.claude.com/docs/en/build-with-claude/extended-thinking) · [Q1 2026 update](https://www.mindstudio.ai/blog/claude-code-q1-2026-update-roundup)) | `thinking_delta` streaming, Channels (event stream), Effort levels, `--output-format stream-json`, AutoDream | Terminal-only, sem peso visual, "spinner staring" durante thinking longo ([issue #30660](https://github.com/anthropics/claude-code/issues/30660)) |
| **Codex CLI** | Plan-before-build, steer-as-you-go ([Jan 2026 changelog](https://github.blog/changelog/2026-01-21-github-copilot-cli-plan-before-you-build-steer-as-you-go/)) | Estilo terminal IBM, sem premium-ness, plan tree em ASCII puro sem peso editorial |
| **Cognition Devin** ([2026 docs](https://docs.devin.ai/release-notes/2026)) | Focus Mode (esconde chrome), child sessions tab com status+TODOs+PR, inline file previews, dynamic re-planning | UI flat web-app, sem tipografia premium, transparência só em painel lateral |
| **GitHub Copilot Workspace** ([docs](https://docs.github.com/en/copilot/tutorials/plan-a-project)) | Spec → Plan → Implement com `ask_user` tool, fila de file updates com status in-progress/done | Demasiado linear, sem capacidade de comparar 2 abordagens |
| **Vercel v0** ([guide](https://blog.vibecoder.me/v0-by-vercel-complete-guide)) | Live preview + side-panel código, refinement select-and-reprompt | UI-only (não chat de domínio geral), nenhum trace de tool/reasoning |

### 1.2 · Adjacências (não-AI mas instrutivas)

| Produto | Lição transferível |
|---|---|
| **Linear AIG** ([linear.app/developers/aig](https://linear.app/developers/aig)) | "Imediato mas unobtrusive", "identidade não-humana clara", "disengagement instantâneo sob comando" — *contrato* de UX, não só UI |
| **Linear UI refresh** ([2026-03-12](https://linear.app/changelog/2026-03-12-ui-refresh)) | Tempo de resposta percebido > beleza estática (30ms abrir issue) |
| **Notion AI** ([command palette pattern](https://medium.com/design-bootcamp/command-palette-ux-patterns-1-d6b6e68f30c1)) | Spacebar abre AI palette agrupado por intenção (generate/edit/draft), não menu de tools cru |
| **Perplexity Copilot** ([ZipTie pipeline](https://ziptie.dev/blog/how-perplexity-ai-answers-work/)) | Sugestões de follow-up *estruturadas por intent* (broaden / recent / counter / compare) — não "what next?" genérico |
| **Figma multiplayer** ([blog](https://www.figma.com/blog/multiplayer-editing-in-figma/)) | Presença visível = confiança; Dev Mode esconde cursors ociosos (só aparecem ao clicar) → presença *condicional* |
| **Mercury/Stripe** | Estado de transação como narrativa visível (pending → posted → reconciled), nunca silêncio |

### 1.3 · Pesquisa acadêmica relevante

| Paper / fonte | Insight aplicável |
|---|---|
| **Interactive Reasoning (UIST'25)** ([arxiv 2506.23678](https://arxiv.org/html/2506.23678v1)) | Tree hierárquica de reasoning supera "wall of text" (p=0.004), feedback nodes focados > prompts excessivos, breadth-first > depth-first para sense-making |
| **Human-Centered XAI** ([arxiv 2110.10790](https://arxiv.org/abs/2110.10790)) | Perguntas canônicas dos usuários organizam-se em 9 categorias: "How / Why / Why Not / What If / How Confident / What Data / What Else / How To Be Sure / Performance" — XAI surface tem que ENDEREÇAR essas perguntas, não despejar dados |
| **HCXAI workshop CHI 2026** ([hcxai.jimdosite.com](https://hcxai.jimdosite.com/)) | Agentic AI quebra paradigmas XAI legados — multi-step + tools + coordenação exige NOVA primitiva visual |
| **Smashing — Transparency Moments** ([2026/04](https://www.smashingmagazine.com/2026/04/identifying-necessary-transparency-moments-agentic-ai-part1/)) | Decision Node Audit: mapeie *onde* o modelo escolhe (não onde executa regra). Surface APENAS esses moments. Pattern por reversibilidade: irreversível+alto = modal · reversível+alto = audit+undo · baixo = toast |
| **AI UX Design Guide — Confidence Viz** ([aiuxdesign.guide](https://www.aiuxdesign.guide/patterns/confidence-visualization)) | Thresholds canônicos: high >80%, medium 50-80%, low <50%. Anti-pattern: confiança como decoração permanente |

---

## 2 · As 14 inovações

Cada inovação respeita o DNA editorial Don Corleone (hairlines bronze, Cormorant italic títulos, Mono caps eyebrows, peso silencioso). Nenhuma usa cores semafóricas. Toda inovação é OFF-by-default ou DEEPLY DISCREET por padrão TDAH.

### Inovação 1 · Pulso editorial (não spinner)

**1. Problema.** Spinners SaaS giram em loop infinito sem contar nada — durante `thinking` longo de Claude o usuário fica olhando uma rodinha que não significa nada ([Claude Code issue #30660](https://github.com/anthropics/claude-code/issues/30660) é exatamente esse atrito). Atlas hoje tem três pontos animados (`AtlasAiStreamingIndicator.tsx` linha 47-49) — funciona, mas é genérico SaaS.

**2. Inspiração.** Pulsar editorial da pena que pausa entre frases num manuscrito Smythson + radar náutico vintage de submarino + tinta secando. Não Linear, não Notion.

**3. Concept sketch (layout exato, viewport 720px).**

```
┌──────────────────────────────────────────────────────────┐
│  Atlas AI   ·   queued · claude_cli                       │ ← eyebrow Mono caps 9px bronze
│  ─────────                                                │
│                                                           │
│  ❦  preparando o contexto                                 │ ← Cormorant italic 14px
│       ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯  ·  8s                                  │ ← progress hairline bronze 1px
│                                                           │
└──────────────────────────────────────────────────────────┘
```

A hairline bronze cresce da esquerda para direita em **fases editoriais** — não linear: rápido 0–30%, pausa quase imperceptível em 30%, retoma 30–70%, pausa em 70% (como respiração). Ao lado, contador honesto `· 8s` (não estimativa fake "loading 87%"). O `❦` é o aldine leaf canon — substitui o "✦ pensando".

**4. Por que ninguém faz bem.** Cursor: spinner roxo. Claude Code: nada (silêncio). Codex: dots ASCII. Devin: skeleton SaaS animado. Nenhum tem peso editorial, nenhum mostra *fase de pensamento*, nenhum confessa "ainda estou no contexto, ainda não comecei a gerar".

**5. Implementation skeleton.**
- **Component**: `AtlasAiPulseIndicator.tsx` substitui `AtlasAiStreamingIndicator.tsx`.
- **Signal source**: campo novo `trace.metadata.phase` no backend (`gathering_context` | `reasoning` | `generating` | `tool_calling` | `finalizing`). Fallback honesto: se `phase` ausente, mostra label genérico atual.
- **Lifecycle**:
  - Mount: animação inicia com `prefers-reduced-motion` respeitado (cresce sem easing se reduzido).
  - Update: cada novo `phase` reinicia a hairline com nova label (transição 600ms cubic-bezier(0.32,0.72,0.24,1)).
  - Unmount: hairline completa 100% em 200ms, depois o componente sai (não some abruptamente).
- **A11y**: `aria-live="polite"`, `aria-busy="true"`, screen reader anuncia "Atlas AI, fase atual: preparando o contexto, 8 segundos".
- **TDAH**: HIERARQUIA — eyebrow Mono 9px (meta · esquece) > título Cormorant italic 14px (foco · única coisa que respira) > hairline 1px bronze (pulso · subliminar). Nunca mais de uma linha de texto. Contador segundos em Mono 9px ink3 ao lado da hairline, não destacado.

---

### Inovação 2 · Glifo de convicção (conviction glyph)

**1. Problema.** Toda resposta de Cursor/Claude Code/Devin parece igualmente confiante — não há diferença visual entre "tenho certeza, vi no código" e "estou inferindo, pode estar errado". Pesquisa XAI 2026 ([aiuxdesign.guide](https://www.aiuxdesign.guide/patterns/confidence-visualization)) confirma que confidence sem visualização = decisões equivocadas do usuário. Mas os concorrentes que tentam mostram barra de progresso "87% confidence" que é decoração SaaS.

**2. Inspiração.** Margem manuscrita de ledger contábil onde o escrivão marca dúvida com um símbolo discreto à esquerda. Patek manual onde "calibração in-house" é gravado discretamente no movimento, não na tela.

**3. Concept sketch.**

```
┌──────────────────────────────────────────────────────────┐
│  Atlas AI   ·   2s atrás · claude_cli                     │
│  ─────────                                                │
│ │                                                         │ ← border-left 2px bronze SOLID = alta convicção
│ │  Rode os testes com `npm test --workspace=@atlas/...`   │
│ │  No CI o comando é igual.                               │
│                                                           │
│  ‒ ‒ ‒                                                    │
│  Atlas AI   ·   inferência · sem evidência direta         │ ← eyebrow ADICIONAL Mono caps
│ ┊                                                         │ ← border-left 2px bronze DOTTED = inferência
│ ┊  Provavelmente o flag `--filter` resolve, mas não       │
│ ┊  encontrei doc canônica confirmando.                    │
│ ┊  ⌕ buscar evidência                                     │ ← affordance Mono caps 9.5px
│                                                           │
└──────────────────────────────────────────────────────────┘
```

Três níveis de convicção, codificados na **border-left** do bubble (DNA já usa border-left em vários componentes):
- **alta** · `border-left: 2px solid var(--bronze)` — modelo viu evidência direta (file/canon citado)
- **inferida** · `border-left: 2px dotted var(--bronze)` — modelo extrapolou, evidência indireta
- **especulativa** · `border-left: 2px dotted var(--ink3)` + eyebrow "especulação · pode estar errado" — modelo confessa que não sabe mas tenta

Nada de barra de %. Nada de cor verde/amarelo/vermelho.

**4. Por que ninguém faz bem.** Cursor: zero distinção. Claude Code: zero distinção. Perplexity: cita fonte mas não gradua certeza. Devin: tom de voz uniforme. v0: nunca confessa incerteza. As barras de progresso "87%" são incoerentes (modelos têm calibração ruim).

**5. Implementation skeleton.**
- **Component**: `AtlasAiMessageBody` ganha prop `conviction: 'evidence' | 'inferred' | 'speculative' | null`.
- **Signal source**: campo novo `message.metadata.conviction` derivado backend a partir de: (a) presença de tool_calls com retorno real (= `evidence`); (b) reasoning chain mencionando "provavelmente/talvez" sem tool call (= `inferred`); (c) ausência de evidência + hedge linguistic (= `speculative`). MVP: heurística simples no backend. Fase 2: classifier treinado nos próprios traces do Atlas.
- **Lifecycle**:
  - Mount: border-left aparece junto com o bubble.
  - Update: se mensagem é editada/re-streamed e ganha evidência, border transitiona de dotted → solid em 400ms.
- **A11y**: border é decoração visual; texto "evidência confirmada" / "inferência sem evidência direta" entra como `<span class="sr-only">` antes do corpo.
- **TDAH**: a marca está na MARGEM (border-left), não no conteúdo — quem só lê o texto não é interrompido. Quem escaneia a coluna esquerda vê o padrão em segundos.

---

### Inovação 3 · Drawer de razão (reasoning peek)

**1. Problema.** Claude Code expõe `thinking` em raw (verboso, assustador) ou hidden (opaco). Cursor tem chat de pensamento dentro do chat principal (poluído). Devin esconde reasoning em painel lateral pouco descoberto. Pesquisa Interactive Reasoning ([arxiv 2506.23678](https://arxiv.org/html/2506.23678v1)) prova: árvore hierárquica > wall of text (p=0.004), mas TEM que ser sob demanda.

**2. Inspiração.** Marginalia de manuscrito iluminado — anotação só aparece quando você passa o dedo na margem. Devin Focus Mode ao avesso: o modo padrão é foco, drawer aparece ao gesto.

**3. Concept sketch.**

```
┌────────────────────────────── viewport (chat) ─────────────────────────────┐
│                                                                            │
│  você  ·  agora                                                            │
│  ─────                                                                     │
│  Como roda os testes do workspace atlas-tauri?                             │
│                                                                            │
│  Atlas AI  ·  6s · claude_cli      ‒‒ pensou 4s ⌕ ──┐ ← affordance discreta│
│  ─────────                                          │                      │
│ │  Rode `npm test --workspace=@atlas/desktop`.      │                      │
│ │  Os testes vivem em `apps/desktop/src/**.test.ts` │                      │
│                                                     │                      │
└─────────────────────────────────────────────────────┼──────────────────────┘
                                                      │
                       ─── ao clicar abre drawer ─────┘
┌────────────── drawer right (480px, esfumaça o chat sob veil cream) ────────┐
│  ❦ Razão · 4s de pensamento                              fechar  ✕         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                                     │
│                                                                            │
│   I.  Identifiquei o workspace                                             │
│       ⎯⎯⎯  você disse "atlas-tauri" → workspace canon atlas-desktop        │
│                                                                            │
│   II. Procurei convenção de testes                                         │
│       ⎯⎯⎯  tool_call: read_file('package.json')                            │
│            ╰─ script "test": "vitest run"                                  │
│                                                                            │
│   III.Verifiquei nesting                                                   │
│       ⎯⎯⎯  ls apps/desktop/src/**.test.ts → 47 arquivos                    │
│                                                                            │
│   IV. Concluí                                                              │
│       ⎯⎯⎯  comando único + path do glob = resposta acima                   │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

Numerais romanos Cormorant italic. Cada nó é um *step*. Tool calls mostrados em Mono 10px ink3. O drawer pode ser fechado ou minimizado (vira badge ao topo do chat).

**4. Por que ninguém faz bem.** Claude Code mostra reasoning bruto inline (poluição). Cursor não mostra. Devin mostra mas em painel lateral *sempre visível* (TDAH-hostil). Hippo (paper UIST'25) mostra árvore lateral mas estilo SaaS. Atlas: numerais romanos, espaço editorial, *só aparece ao gesto*.

**5. Implementation skeleton.**
- **Component**: `AtlasAiReasoningDrawer.tsx` + affordance `AtlasAiReasoningPeek.tsx` (no header da bolha).
- **Signal source**: campo `trace.metadata.reasoning_steps: Array<{step: number, label: string, tool_call?: ToolCall, evidence?: string}>` — derivado do `thinking` streaming do Claude / `reasoning` do gpt-4-codex. Backend já tem `trace.metadata`, basta normalizar.
- **Lifecycle**:
  - Mount: affordance "pensou 4s ⌕" aparece junto com bubble se `reasoning_steps.length > 0`.
  - Click: drawer slide-in 280ms da direita (`transform: translateX(0)` from `100%`), veil cream `rgba(243, 236, 218, 0.92)` desfoca chat com `backdrop-filter: blur(2px)`.
  - Update: novos steps streamam durante geração (cada step entra fade-in 200ms).
  - Unmount: drawer recolhe, veil some.
- **A11y**: drawer é `<aside aria-label="razão expandida">`, focus trap quando aberto, ESC fecha. Numerais romanos têm `aria-label="passo 1"` etc.
- **TDAH**: padrão DRAWER ≠ inline. Reasoning NUNCA polui o chat — só vem se você pediu. Drawer fecha automaticamente ao mandar nova mensagem.

---

### Inovação 4 · Steering em curso (mid-stream nudge)

**1. Problema.** O modelo está escrevendo uma resposta gigantesca na direção errada e você é obrigado a esperar terminar para corrigir. Cursor: cancel → reprompt (perde contexto). Claude Code: Ctrl+C (mata). Devin: pause botão (mata thread). Pesquisa recente ([procedure.tech SSE](https://procedure.tech/blogs/sse-for-llms/), [steering vector fields 2026](https://subhadipmitra.com/blog/2026/activation-steering-field-guide/)) já tem técnica para activation steering live mas ninguém superficializa.

**2. Inspiração.** O "ahem" educado num jantar — você não interrompe o convidado, você sinaliza com um som breve que algo precisa ser ajustado. Ele continua a frase mas absorve.

**3. Concept sketch.**

```
┌──────────────────────────────────────────────────────────┐
│  Atlas AI  ·  escrevendo · 3.2s                           │
│  ─────────                                                │
│ │  Vou começar criando um service Laravel novo chamado    │
│ │  AtlasAuthService que vai gerenciar tokens JWT e        │
│ │  refresh tokens via middleware customizado, integrado   │
│ │  com Passport, instalando primeiro com composer requ ▌  │ ← cursor pisca
│                                                           │
│  ┌─ steerer  ──────────────────────────────────────────┐  │ ← composer compact 1 linha
│  │ ⌕  "use Sanctum, não Passport" ___________________ ➤│  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

Enquanto Atlas escreve, abaixo da bolha streaming aparece **um composer mini, 1 linha, hairline bronze sutil**. Você digita um nudge e Enter. Backend:
1. Pausa o stream (sinal SSE `pause`),
2. Injeta o nudge como mensagem de sistema breve no contexto,
3. Resume (sinal SSE `resume`),
4. Modelo pode emendar a frase atual ("...na verdade, vou usar Sanctum, é mais leve...") OU recomeçar daquele ponto (decisão do prompt-engineering do nudge).

A bolha NÃO é descartada — vira append. O texto "instalando primeiro com composer requ" continua: "...esperando, na verdade, vou usar Sanctum porque é mais leve, então o comando é `composer require laravel/sanctum`".

**4. Por que ninguém faz bem.** Steering hoje é "cancelar e refazer". Atlas é o primeiro a dar UX de *correção em curso* — pesquisa BRT-ALIGN/SAE-Steering já viabilizou o backend, ninguém embalou em UX premium. v0 tem refinement mas POST-geração. Cursor permite chat continuation mas após resposta.

**5. Implementation skeleton.**
- **Component**: `AtlasAiSteerer.tsx` — composer 1-line, aparece SÓ durante stream ativo, posicionado logo abaixo da bolha streaming.
- **Signal source**: novo endpoint `POST /ai/interactions/{trace}/steer` body `{nudge: string, mode: 'amend' | 'restart_from_here'}`. Backend ativa pause-resume no provider stream.
- **Lifecycle**:
  - Mount: aparece quando `trace.status === 'running'` E `useAtlasAiSettings().steeringEnabled === true` (off-by-default canon TDAH).
  - Submit: Enter envia nudge, composer recolhe pra eyebrow "nudge enviado · Atlas considerando…", reabre após resume.
  - Unmount: ao `trace.status === 'completed'`, composer slide-out 200ms.
- **A11y**: composer tem `aria-label="enviar correção em curso para Atlas"`, screen reader anuncia "Atlas pausou e considerou seu nudge" quando aceito.
- **TDAH**: **OFF por padrão** (canon obrigatório — distração contínua durante leitura streaming destrói foco TDAH). Quando ligado, hairline mais sutil que tudo, posicionado abaixo da bolha (foco continua no texto).

---

### Inovação 5 · Coreografia multi-agente (multi-agent choreography)

**1. Problema.** Quando Atlas Decide dispara 2-3 sub-agentes (Forge Rivals dispara até 7 arms), o usuário vê só um único "thinking" — opaco. Cursor Mission Control mostra grid de tabs (TDAH-hostil: 9 cards igualmente urgentes). Devin tem child sessions tab que precisa navegar.

**2. Inspiração.** Orquestra de câmara onde o regente é silencioso e os músicos respondem com peso editorial. Cada agente é uma "voz" mas a partitura é uma só linha temporal.

**3. Concept sketch.**

```
┌──────────────────────────────────────────────────────────────────────┐
│  Atlas AI  ·  orquestrando 3 vozes · 12s                              │
│  ─────────                                                            │
│                                                                       │
│  I.   claude_cli  ⎯ analisando schema atlas_programming_work_items     │
│       ⌐ 4s ── 8s ──── 12s ─                                           │ ← timeline horizontal
│                                                                       │
│  II.  codex_cli   ⎯ varrendo cards `forge_*` em forge-rivals/         │
│       ⌐── 2s ─── 7s ─                                                 │
│                                                                       │
│  III. gemini_cli  ⎯ revisando docs/architecture/0005-*.md             │
│       ⌐──── 6s ────── 11s ─                                           │
│                                                                       │
│  ── ‧ ── ‧ ── ‧ ── ‧ ── ‧ ── 12s ── ‧                                 │ ← eixo temporal
│                                                                       │
│  ❦  Atlas vai cruzar as 3 vozes em ~3s                                │ ← rodapé Cormorant italic
└──────────────────────────────────────────────────────────────────────┘
```

Cada agente é uma **linha horizontal** com numeral romano (I/II/III), nome do provider em Mono 10px caps, deck Cormorant italic descrevendo a tarefa. Barras curtas debaixo representam *spans de atividade* (não bar charts SaaS — são marcas tipográficas hairline bronze, como sublinhados manuscritos). Eixo temporal sutil embaixo. Rodapé honesto: "Atlas vai cruzar em ~Xs".

Ao terminar, as três linhas convergem em um nó único e o stream final aparece abaixo. Cada linha clica para abrir um drawer com o output bruto daquele agente.

**4. Por que ninguém faz bem.** Cursor: grid de tabs sem ordem (TDAH-hostil). Devin: child sessions em painel lateral sem cronologia. Forge Rivals interno hoje: tabela cinza Plano comum. Nenhum tem narrativa temporal *editorial*. Atlas: numerais romanos + hairlines = poesia operacional.

**5. Implementation skeleton.**
- **Component**: `AtlasAiOrchestrationPanel.tsx`. Substitui o indicator quando `trace.metadata.is_orchestration === true`.
- **Signal source**: campo novo `trace.metadata.sub_agents: Array<{id, role, provider, task_label, started_at, completed_at?, status, output_preview?}>`. Backend já tem isso conceitualmente no Forge Rivals — falta normalizar.
- **Lifecycle**:
  - Mount: painel aparece em vez do indicator se ≥2 sub-agentes.
  - Update: cada sub-agente atualiza sua hairline (cresce até `completed_at`).
  - Click linha: abre drawer com output bruto.
  - Unmount: painel persiste como "histórico de execução" depois que a resposta final chega — colapsa para 1 linha "orquestrou 3 vozes em 12s · ver".
- **A11y**: `<ol>` semântica, cada linha é `<li>` com `aria-label="agente II, codex_cli, varrendo cards forge_*"`.
- **TDAH**: máximo 5 linhas visíveis simultâneas; se >5, mostra "I-IV + 3 outras" com expansão sob demanda. Eixo temporal é hairline sutil ink3, não foco.

---

### Inovação 6 · Inbox de decisão (decision inbox)

**1. Problema.** Modelo pede confirmação ("posso deletar?") interrompendo o flow. GitHub Copilot Workspace tem `ask_user` mas é modal-ish. Cursor: confirm/deny inline (intrusivo). Linear AIG diz "imediato mas unobtrusive" — ninguém entrega isso pra confirmação de ação. Pesquisa Smashing ([Transparency Moments](https://www.smashingmagazine.com/2026/04/identifying-necessary-transparency-moments-agentic-ai-part1/)) mapeia: high-impact+irreversible = modal · high-impact+reversible = audit+undo · low = toast. Mas SEMPRE intrusivo no estado-da-arte atual.

**2. Inspiração.** Bandeja de correspondência onde o secretário deixa cartas "para sua atenção" — você atende quando quiser, sem pressão. Patek Calatrava onde a complicação só aparece se você girar a coroa.

**3. Concept sketch.**

```
┌──────────────────────────────────────────────────────────┐
│  Atlas AI  ·  aguardando você · 2 itens                   │ ← eyebrow Mono caps bronze
│  ─────────                                                │
│ │                                                         │ ← border-left bronze SOLID
│ │  I. ❦ confirmar antes                                   │ ← Cormorant italic 13px
│ │     deletar tabela `ai_traces_legacy` (4.211 rows)      │
│ │     ▸ confirmar    ▸ pular    ▸ ver razão               │ ← Mono caps 9.5px hairline buttons
│ │                                                         │
│ │  II.❦ confirmar antes                                   │
│ │     enviar diff de `migrations/` para o repo            │
│ │     ▸ confirmar    ▸ pular    ▸ ver razão               │
│                                                           │
│  Atlas continua quando você responder.                    │ ← rodapé italic ink2
└──────────────────────────────────────────────────────────┘
```

A bolha de decisão tem **mesma altura** que uma bolha normal (não pisca, não vibra, não escala). Eyebrow "aguardando você · 2 itens" é a única coisa que muda do tom normal. Numerais romanos italic. Cada item: linha 1 = tipo (`confirmar antes` / `validar resultado` / `escolher entre N`), linha 2 = ação específica, linha 3 = 3 botões mono caps hairline (sem cor de preenchimento, só border-bottom bronze ao hover).

Notificação OS opcional (off-by-default): bounce discreto no dock.

**4. Por que ninguém faz bem.** Copilot Workspace: modal centro tela (interrompe). Cursor: prompt amarelo inline (chamativo). Devin: notification sidebar (perdida). Atlas: *inbox* — eu atendo quando quiser, ele PARA até eu atender.

**5. Implementation skeleton.**
- **Component**: `AtlasAiDecisionInbox.tsx`. Renderiza dentro do `AtlasAiConversation` quando `trace.status === 'awaiting_user'`.
- **Signal source**: novo status `awaiting_user` no enum de trace status. Campo `trace.metadata.pending_decisions: Array<{id, kind: 'confirm' | 'choose' | 'validate', label, reason_brief, options: Array<{id, label}>}>`.
- **Lifecycle**:
  - Mount: bolha aparece quando status muda; o `StreamingIndicator` some.
  - Click ação: `POST /ai/interactions/{trace}/respond` body `{decision_id, choice_id}`. Trace volta para `running`.
  - Unmount: ao status mudar para `running` ou `completed`.
- **A11y**: `role="region" aria-label="decisões aguardando sua resposta"`. Cada botão é `<button>`. Keyboard nav: Tab cicla, Enter confirma.
- **TDAH**: a bolha NÃO oscila / NÃO usa cor laranja / NÃO bouncea. É a *única* mudança permitida no eyebrow ("aguardando você"). OS notification = opt-in.

---

### Inovação 7 · Marginália de evidência (evidence margin pin)

**1. Problema.** Atlas afirma "rode `npm test --workspace=@atlas/desktop`" — onde isso veio? Perplexity tem citação inline numerada (boa para web search) mas para *código/arquitetura* fica feio. Cursor mostra file mentions em chip. Claude Code: nada visível, você confia. Devin: panel lateral.

**2. Inspiração.** Margem de livro acadêmico com pin discreto referenciando rodapé. Hermann Hesse com anotações à mão direita do parágrafo — você só vê se procurar.

**3. Concept sketch.**

```
┌──────────────────────────────────────────────────────────────────┐
│  Atlas AI  ·  2s                                                  │
│  ─────────                                                        │
│ │  Rode `npm test --workspace=@atlas/desktop`.[i]                 │
│ │  Os testes vivem em `apps/desktop/src/**.test.ts`.[ii]          │
│ │  Para subset use `--filter`.[iii]                               │
│                                                                   │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─                                                │
│  ❦ evidência                                                      │
│   i.   package.json:14 · script "test": "vitest run"              │ ← Mono 10px italic
│   ii.  apps/desktop/vitest.config.ts:8 · include pattern          │
│   iii. docs/architecture/0007 · ch.12 testing                     │
└──────────────────────────────────────────────────────────────────┘
```

Inline: cada afirmação ganha um superscript **algarismo romano minúsculo italic bronze** `[i]` (não número arábico SaaS azul). Rodapé editorial separado por hairline ink3, eyebrow "evidência" Mono caps bronze. Cada item: numeral + path + chunk-summary.

**Hover sobre `[i]`** ou clique → **popover** abre com o chunk REAL extraído daquela fonte (10-30 linhas de código com syntax highlight Shiki, ou trecho de doc Cormorant italic). Não é modal — é popover compacto que fecha ao click-outside.

**4. Por que ninguém faz bem.** Perplexity: chip número azul SaaS. Cursor: file chip mas sem chunk preview. Claude Code: zero. v0: zero. Atlas: numerais romanos manuscritos + popover com chunk real = único editorial.

**5. Implementation skeleton.**
- **Component**: `AtlasAiMessageBody` ganha parser que detecta `[citation:id]` syntax e renderiza superscript. `AtlasAiEvidenceFooter.tsx` renderiza o rodapé. `AtlasAiEvidencePopover.tsx` mostra chunk.
- **Signal source**: campo `message.metadata.evidence: Array<{id: 'i'|'ii'|..., source_kind: 'file'|'doc'|'previous_message'|'canon', path: string, line?: number, chunk: string}>`. Modelo é prompted a *citar* inline com tag.
- **Lifecycle**:
  - Mount: parser substitui `[citation:i]` por `<sup className="atlas-ai-evidence-pin">i</sup>`. Footer renderiza lista.
  - Hover/click pin: popover abre com chunk.
  - Unmount popover: blur outside ou ESC.
- **A11y**: pin é `<button aria-label="ver evidência i: package.json linha 14" aria-haspopup="dialog">`. Popover tem `role="dialog"` com focus return.
- **TDAH**: pin é MAIS PEQUENO que o texto (superscript), em bronze sutil — não chama atenção. Quem só lê o texto não vê pin. Footer é separado por hairline = leitura opcional.

---

### Inovação 8 · Custo silencioso (silent budget meter)

**1. Problema.** Ninguém mostra custo de forma honesta. Cursor: $/mês no settings. Claude Code: nada por turno. Devin: token counter cinza pequeno. Atlas tem `latency_ms` no trace — tem cost_estimate calculável (provider × tokens). Mas TDAH-friendly = nunca números piscando.

**2. Inspiração.** Velocímetro de Patek — sub-dial discreto na 6h, você só vê se procurar. Ledger contábil onde a coluna de débito está fechada por padrão.

**3. Concept sketch.**

```
┌──────────────────────────────────────────────────────────┐
│  Atlas AI  ·  3.4s · claude_cli                           │
│  ─────────                                                │
│ │  ... resposta ...                                       │
│                                                           │
│  ‧ ‧ ‧ ‧ ‧ ‧ ‧ ‧ ‧ ‧ 1.4k tokens · ~$0.02 · 3.4s         │ ← hairline meta · ink4 9.5px Mono
└──────────────────────────────────────────────────────────┘
```

UMA linha hairline no rodapé da bolha (ink4 = quase invisível). Tokens · custo estimado · latência. Sem cor, sem ícone, sem gráfico. Click expande para drawer com breakdown (input tokens, output tokens, thinking tokens, tool calls, semantic context retrievals — cada custo separado).

**Acumulado da thread** aparece no header da conversation: "thread · 12 msgs · ~$0.34 · 47.2k tokens" em Mono ink3 — também sutil.

**4. Por que ninguém faz bem.** Cursor: custo apenas no billing. Claude Code: nada. Devin: counter cinza pequeno SaaS. Anthropic Console mostra mas em painel separado. Atlas: rodapé editorial, peso ink4, *informativo sem ruído*.

**5. Implementation skeleton.**
- **Component**: `AtlasAiBudgetMeter.tsx` (rodapé bolha) + `AtlasAiBudgetDrawer.tsx` (breakdown).
- **Signal source**: campos `trace.metadata.tokens_input`, `tokens_output`, `tokens_thinking`, `cost_estimate_usd`, `latency_ms`. Cálculo no backend baseado em provider+model rates.
- **Lifecycle**:
  - Mount: aparece quando trace `completed`. Fade-in 200ms (não distrai).
  - Click: drawer slide-up (mobile-style mas no desktop) mostrando breakdown.
- **A11y**: `aria-label="custo da resposta: 1400 tokens, estimado 2 centavos de dólar, 3.4 segundos"`. Sempre legível por screen reader.
- **TDAH**: cor ink4 (penúltimo) torna invisível em leitura normal. Foco mantém-se no conteúdo. Drawer só ao gesto.

---

### Inovação 9 · Linha do tempo (replay timeline)

**1. Problema.** Você teve uma sessão de 40 mensagens com Atlas, modelo deu uma resposta excelente na #14 e agora você quer "voltar" pra explorar variante. Hoje: scroll manual. Cursor: branch chat mas perde-se de bifurcações. Devin: replay session feature mas em modal pesado.

**2. Inspiração.** Régua de Schubert manuscrito onde cada compasso é uma marca a tinta. Patek world-timer — você vê o tempo todo em uma faixa horizontal.

**3. Concept sketch.**

```
┌────────────────────────────────── chat ───────────────────────────────────┐
│ ...                                                                       │
│ Atlas AI · 14 (atual)                                                     │
│ "Use Sanctum, não Passport, porque..."                                    │
│ ...                                                                       │
│                                                                           │
└──────────────────────────────────── rodapé ───────────────────────────────┘
                                       │
              ─── ao Cmd+T abre régua ──┘
┌──── régua horizontal fixed-bottom (60px alta, esfumaça subtle) ───────────┐
│ I ── II ─── III ────── IV ── V ── VI ───── VII ── VIII ── IX ── X ── XIV ▌│ ← marca atual em bronze
│ ↑ 11:04                                                               ↑   │ ← timestamp inicial e atual
│  hover sobre VIII abre preview da bolha em popover acima da régua         │
└───────────────────────────────────────────────────────────────────────────┘
```

Régua horizontal **opt-in** (Cmd+T abre). Cada mensagem é um numeral romano italic Cormorant na linha. Numeral atual em bronze sólido, anteriores em ink3, futuras (se houve branch) hairline. Hover sobre numeral → preview popover (compacto, 240px). Click → scroll-to + opção "ramificar daqui" (cria branch da thread).

**4. Por que ninguém faz bem.** Cursor: scroll up linear. Claude Code: nada (terminal). Devin: timeline em panel SaaS roxo. Atlas: régua editorial peso ink3, gesto de teclado, branch reversível.

**5. Implementation skeleton.**
- **Component**: `AtlasAiTimelineRuler.tsx` — fixed-bottom, toggle por Cmd+T.
- **Signal source**: já existe — `detail.messages` ordenado por `position`. Branch novo precisa novo endpoint `POST /ai/threads/{id}/branch?from_message={id}`.
- **Lifecycle**:
  - Mount: oculto. Cmd+T monta com slide-up 240ms.
  - Hover sobre numeral: popover preview.
  - Click: scroll-to + opção "ramificar daqui".
  - Cmd+T novamente: unmount slide-down.
- **A11y**: arrow keys navegam numerais quando focado, Enter scrolla. `aria-label="linha do tempo da conversa"`.
- **TDAH**: **fechada por padrão**, gesto de teclado dedicado. Numerais romanos = peso baixo, leitura fluida.

---

### Inovação 10 · Variante paralela (parallel variant)

**1. Problema.** "Será que outra abordagem é melhor?" — hoje você manda outra mensagem ou abre nova thread. Comparison tools como [LinkedIn Crosscheck](https://almcorp.com/blog/linkedin-crosscheck-ai-model-comparison-tool/) e [OverallGPT](https://overallgpt.com/) fazem isso entre PROVIDERS — Atlas pode fazer entre *abordagens* (mesmo provider, prompts variantes) ou *providers* (mesma pergunta, claude vs codex vs gemini).

**2. Inspiração.** Manuscript Yale Beinecke com glossas marginais lado a lado — duas vozes interpretando o mesmo texto. Hermann Hesse com duas traduções confrontadas.

**3. Concept sketch.**

```
┌─ chat normal (até a sua pergunta) ────────────────────────────────────────┐
│ você · "qual provider devo usar pra parse de PDF?"                        │
└───────────────────────────────────────────────────────────────────────────┘
                       ‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒
                       ❦ Atlas pensa em 2 vozes
                       ‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒
┌─────────── coluna A (50%) ─────────────┬─────────── coluna B (50%) ──────┐
│  I.  claude_cli · 4s                    │  II. codex_cli · 3s              │
│  ─────                                  │  ─────                          │
│ │ "Para PDF parse robusto eu             │ │"Pra PDF parse rápido, use     │
│ │ recomendaria pdf-parse + pdfjs        │ │`pdf2json` Python-side e expõe │
│ │ fallback. Tira tabelas com tabula..." │ │ via FastAPI. Tabelas com      │
│ │ ...                                   │ │ pdfplumber..."                │
│                                         │                                 │
│  ◉ ficar com esta                        │  ○ ficar com esta               │ ← radio editorial Mono
└─────────────────────────────────────────┴─────────────────────────────────┘
              ‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒
                       ❦ ou ❦ unifique  ⌕ destile o melhor das duas
              ‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒‒
```

Duas colunas 50/50, hairline bronze vertical no meio. Cada uma é uma "voz" (provider ou prompt variante). Eyebrow numeral romano. Radio editorial (◉ / ○) embaixo para escolher. Botão central "destile o melhor" → Atlas gera terceira resposta sintetizando as duas (Mono caps + ⌕ glyph).

**4. Por que ninguém faz bem.** LinkedIn Crosscheck: lado-a-lado mas SaaS plain. OverallGPT: tabela de N modelos sem peso. Cursor: nem tenta. Atlas: editorial + opção de destilar = passo além.

**5. Implementation skeleton.**
- **Component**: `AtlasAiVariantSplit.tsx` substitui o `AtlasAiConversation` rendering quando última mensagem tem `metadata.variants: VariantConfig`.
- **Signal source**: `POST /ai/interactions` ganha `payload.variants: Array<{provider?, prompt_variant_id?, label}>`. Backend dispara N traces, agrupa por `parent_trace_id`. Frontend exibe quando todas completam.
- **Lifecycle**:
  - Mount: composer ganha botão "↹ 2 vozes" que abre seletor (claude/codex/gemini). Após envio, split aparece em vez de bolha única.
  - Update: cada coluna stream independentemente (cada uma com pulso editorial).
  - Escolha: click no radio anexa só a variante escolhida à thread; a outra fica como "variante descartada" no histórico (acesso via timeline ruler).
  - Destilar: trigger `POST /ai/interactions/distill` com os 2 trace_ids → terceira resposta.
- **A11y**: `<section aria-label="variante A"> / <section aria-label="variante B">`. Radio é `<input type="radio">` real. Botão destilar é `<button>`.
- **TDAH**: **opt-in** via botão explícito no composer. Nunca acidental. Quando ativo, sempre exatamente 2 colunas (nunca 3+ — TDAH-hostil). Hairline vertical entre delimita foco.

---

### Inovação 11 · Modo Calmaria (Calmaria mode)

**1. Problema.** TDAH-friendly EXIGE um modo absoluto onde tudo some menos o texto. Devin Focus Mode existe mas esconde só painéis laterais. Cursor não tem. Claude Code é terminal puro mas perde markdown. Atlas hoje tem tudo ligado por padrão.

**2. Inspiração.** "Reading mode" do Instapaper/iA Writer/typewriter mode — mas com peso editorial Don Corleone. Manuscrito sob luz de vela, sem mais nada na sala.

**3. Concept sketch.**

```
Cmd+Shift+. (ou botão no header)

┌────────────────────── viewport · normal ────────────────────────┐
│  composer ───── sidepanel ───── thread list ─────── plan panel  │
│  conversation com pulso · evidence pin · budget · tools         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────── viewport · Calmaria ──────────────────────┐
│                                                                 │
│                                                                 │
│      você · 11:04                                               │
│      como rodam os testes?                                      │
│                                                                 │
│      Atlas AI · 11:04                                           │
│      Rode `npm test --workspace=@atlas/desktop`.                │
│      Os testes vivem em apps/desktop/src/**.test.ts.            │
│                                                                 │
│      ─── composer 1-linha discreto embaixo ────                  │
└─────────────────────────────────────────────────────────────────┘
```

Calmaria esconde: thread list, side panel, plan panel, budget meter, evidence pins, conviction borders, reasoning peek, multi-agent, decision inbox (apaga, persiste estado), variant split (volta a 1 coluna na thread atual). **Persiste**: timestamps simples, separação user/atlas, conteúdo das mensagens. Plus: backdrop cream-paper mais claro, font-size +1px, line-height +0.05, max-width 640px centrado.

Cmd+Shift+. toggle. Estado persiste por workspace (lembra escolha).

**4. Por que ninguém faz bem.** Devin Focus Mode: esconde chrome mas mantém botões. Cursor: zero. iA Writer: foca texto mas é editor, não chat com IA. Atlas Calmaria: foco em DIÁLOGO, mantém peso editorial, esconde TODA UI auxiliar.

**5. Implementation skeleton.**
- **Component**: zero novo componente — toggle global em `useAtlasAi` ou novo hook `useCalmariaMode`. CSS aplica via `.atlas-ai-calmaria` no root da surface, esconde via `display: none` ou `visibility: hidden` componentes auxiliares.
- **Signal source**: localStorage `atlas.ai.calmaria.enabled` per workspace.
- **Lifecycle**:
  - Toggle: Cmd+Shift+. ou botão.
  - Mount: aplica classe, transição opacity 200ms nos elementos que somem.
  - Unmount: reverso.
- **A11y**: aria-pressed no botão toggle, screen reader anuncia "modo calmaria ativado, painéis auxiliares ocultos".
- **TDAH**: **a inovação canon TDAH**. É a oferta explícita de "tudo desligado, só texto e silêncio". Defeito sutil: ainda mostra streaming pulse (sem peso) — alternativa Calmaria Plus desliga TUDO incluindo pulse, mostra texto vindo letra-a-letra puro.

---

### Inovação 12 · Atmosfera (atmospheric audio)

**1. Problema.** Som em apps SaaS é UMA notification chiclete. Não há som AMBIENTE de estado. Audiolibros e podcasts usaram música para sinalizar transição há décadas; apps de IA não. Stripe Mercury tem "ka-ching" mas é gimmick.

**2. Inspiração.** Charuto queimando devagar, máquina de escrever em outra sala, vinil de Sinatra rodando — som ambiente que sinaliza *contexto* sem demandar atenção. Sub-bass quase imperceptível para "running", click típico para "completed".

**3. Concept sketch.** (descrição, áudio não cabe em ASCII)

| Estado | Som | Duração | Volume canon |
|---|---|---|---|
| `running` (Atlas pensando) | sub-bass 60Hz contínuo, fade-in 800ms, fade-out 400ms | enquanto running | -42dB (subliminar) |
| `awaiting_user` (decisão) | acorde discreto 2 notas violoncelo (D-A) | 600ms | -32dB |
| `completed` (resposta pronta) | click hairline (acoustic tap, like book closing) | 80ms | -36dB |
| `failed` | nada (silêncio é a sinalização) | — | — |

**OFF por padrão**. Ligado em settings: "ambient · click · cello chord" individuais. Tem que respeitar OS Do Not Disturb. Stream pausa se janela perde foco.

**4. Por que ninguém faz bem.** Discord/Slack: bipes alarmantes. Cursor: silêncio. Apple Intelligence: silêncio. Atlas: paisagem sonora editorial *opt-in* — luxo Don Corleone aplicado a áudio.

**5. Implementation skeleton.**
- **Component**: `useAtlasAiAtmosphere.ts` hook. Web Audio API com 4 buffers pre-loaded (pequenos, <30kb cada).
- **Signal source**: muda baseado em `trace.status` mudanças.
- **Lifecycle**:
  - Mount hook: pré-carrega buffers se setting ON.
  - Status muda → toca buffer correspondente com fade-in/out.
  - Janela blur → fade-out total 200ms.
  - Janela focus → resume se estado ainda relevante.
- **A11y**: respeitar `prefers-reduced-motion` ≠ aplicável; mas respeitar OS Do Not Disturb + setting "som off". Screen reader já anuncia status — som é EXTRA, não substituto.
- **TDAH**: **OFF por padrão**. Quando ON, volume sub-perceptual (-36 a -42dB). Sub-bass é especialmente bom: TDAH responde a *energy presence* mais que pulse visual.

---

### Inovação 13 · Dock vivo (OS dock integration)

**1. Problema.** Tauri é desktop nativo — pode usar dock/badge/notification OS de jeito real. Cursor/Claude Code/Devin web não conseguem. Atlas joga fora a vantagem hoje (zero integração dock).

**2. Inspiração.** Mail.app bounce + badge counter. Linear macOS app subtle bounce. Cluely (controverso) mostrou que system tray pode ser premium. Patek tem complicação "minute repeater" que toca a hora em sino interno — você decide quando girar.

**3. Concept sketch.**

```
Dock macOS · Atlas Desktop icon

estado idle           → ícone normal
estado running        → ícone com pulso editorial sub-pixel (luz interna pulsa, não bounce)
estado awaiting_user  → badge bronze "1" (sem cor SaaS)
estado completed      → bounce ÚNICO discreto (uma vez, não loop), badge "1" some ao foco
estado failed         → ícone com tint rec-red sutil (sem badge)
```

System tray (macOS top bar) opcional: ícone Atlas mini que abre Calmaria mode em popover global (quick prompt sem abrir janela).

**4. Por que ninguém faz bem.** Cursor/Devin web: zero. Claude Desktop: bounce padrão SaaS. Atlas: integração com peso editorial bronze, *uma única vez* (não bounce repetido), system tray opcional.

**5. Implementation skeleton.**
- **Component**: `useAtlasAiDockIntegration.ts` hook. Usa `@tauri-apps/api/window` + `setBadgeCount` + `requestAttention`.
- **Signal source**: `trace.status` mudanças globais (via hook context).
- **Lifecycle**:
  - `running`: pulso sub-pixel (CSS animation no icon source SVG via tray API se disponível, fallback nada).
  - `awaiting_user`: badge "N" (count de decisions pending).
  - `completed`: `requestAttention('Informational')` único (mac dock bounce 1x).
  - Janela focused: badge clear, attention clear.
- **A11y**: OS já lida com acessibilidade de dock. Setting ON/OFF por estado.
- **TDAH**: bounce *único*, não loop. Badge bronze (não vermelho/azul SaaS). Off-by-default. Configurável por estado individualmente.

---

### Inovação 14 · Sussurro de citação (whisper citation)

**1. Problema.** Hover em path de arquivo (`apps/desktop/src/...`) hoje não faz nada. Cursor abre arquivo no editor. Claude Code: nada. Cmd+click pode abrir external. Mas LER o conteúdo do arquivo SEM sair do chat? Nenhum faz com peso editorial.

**2. Inspiração.** Glossário medieval onde tocando o nome de uma cidade no manuscrito uma página interna se abre com mapa. Patek manual where flipping the back reveals movimento.

**3. Concept sketch.**

```
Atlas: "Veja `apps/desktop/src/surfaces/atlas-ai/types.ts` linha 90."

         ⌐ hover por 600ms ──┐
                              ↓
┌────────────────────────────────────────────────────────────────┐
│  ❦  apps/desktop/src/surfaces/atlas-ai/types.ts  ·  line 90    │ ← popover compacto
│  ──────────                                                    │
│  88   created_at: string | null                                │
│  89   updated_at: string | null                                │
│  90 → }                                                        │ ← linha target highlighted
│  91                                                            │
│  92   export interface AtlasAiInteractionRequest {             │
│  ──────────                                                    │
│  ⌕  abrir no editor       ⌶  copiar path                       │ ← Mono caps actions
└────────────────────────────────────────────────────────────────┘
```

Hover por 600ms sobre qualquer path inline → popover compacto cream-paper, mostra ±5 linhas centrado na linha target, syntax highlight Shiki, eyebrow com path + line, ações em Mono caps.

**Quem decide o que é "path"**: regex `[/\.][\w/]+\.(ts|tsx|md|php|py|json|html|css|jsx|js|sh|toml)` + match com `[file:path]` syntax do prompt.

**4. Por que ninguém faz bem.** Cursor: cmd+click vai editor (perde contexto). Devin: file preview lateral. Claude Code: nada. Atlas: popover *no chat*, peek-not-leave.

**5. Implementation skeleton.**
- **Component**: `AtlasAiMessageBody` ganha post-processor que detecta paths e wrapper em `<button class="atlas-ai-file-hover">`. `AtlasAiFileWhisperPopover.tsx` renderiza popover.
- **Signal source**: novo endpoint `GET /ai/file-peek?path=...&line=...&context=5` retorna `{lines: Array<{number, content, highlighted}>, language}`.
- **Lifecycle**:
  - Hover 600ms (debounce): fetch + show popover.
  - Mouse leave from path OR popover: 200ms grace then close.
  - Click popover "abrir no editor": invoke tauri command (já existe canon).
- **A11y**: `<button aria-haspopup="dialog" aria-label="prévia de types.ts linha 90">`. Popover `role="dialog"` com focus trap leve.
- **TDAH**: hover *sustained* (600ms) — nunca acidental. Click necessário para sair do chat. Popover é cream-paper sobre cream-canvas (peso editorial, não floater branco SaaS).

---

## 3 · Stack de priorização (impact × effort)

Matriz canon — cada célula referencia inovação por número.

|  | Impact ALTO | Impact MÉDIO | Impact BAIXO |
|---|---|---|---|
| **Effort BAIXO** (≤1 dia) | **#1 Pulso editorial** · **#8 Custo silencioso** · **#11 Calmaria mode** | #14 Sussurro de citação | #13 Dock vivo (parcial) |
| **Effort MÉDIO** (2-4 dias) | **#2 Glifo de convicção** · **#3 Drawer de razão** · **#7 Marginália de evidência** · **#6 Inbox de decisão** | #9 Linha do tempo | #12 Atmosfera |
| **Effort ALTO** (≥1 semana) | **#5 Coreografia multi-agente** · **#4 Steering em curso** · **#10 Variante paralela** | #13 Dock vivo (completo, com tray) | — |

**Critério IMPACT**: quanto eleva Atlas acima de Cursor/Claude Code/Devin no eixo "operador TDAH com kernel próprio + DNA Don Corleone".
**Critério EFFORT**: presunção de equipe de 1 dev senior fluente em React/Tauri/Laravel + canon design system.

---

## 4 · Phase rollout (sequência sugerida)

### Phase 1 · Fundação editorial (sprint 1-2 · ~2 semanas)

Objetivo: substituir o "spinner SaaS" e introduzir peso editorial mínimo. Sem novo signal de backend obrigatório (todas usam dados existentes ou degradam graciosamente).

1. **#1 Pulso editorial** — substitui `AtlasAiStreamingIndicator` por `AtlasAiPulseIndicator` com hairline editorial. Backward-compat: sem `phase`, usa label genérico.
2. **#11 Calmaria mode** — toggle global Cmd+Shift+. Esconde panels via CSS. Zero novo signal.
3. **#8 Custo silencioso** — rodapé bolha + acumulado no header. Usa `latency_ms` existente + cost_estimate calculado no client a partir de provider rates table (constante).
4. **#14 Sussurro de citação** — file-peek endpoint novo (simples GET) + popover.

**Cert critério**: nenhum spinner SaaS visível, Calmaria operacional, custo legível em todas as respostas, hover em path mostra peek.

### Phase 2 · Transparência editorial (sprint 3-5 · ~3 semanas)

Objetivo: introduzir os contratos novos de backend (`conviction`, `reasoning_steps`, `evidence`, `pending_decisions`) + UI editorial sobre eles.

5. **#2 Glifo de convicção** — backend deriva `conviction` por heurística inicial (tool_call presente = evidence, hedge linguistic = inferred).
6. **#7 Marginália de evidência** — modelo prompted a usar `[citation:i]` syntax + footer + popover.
7. **#3 Drawer de razão** — captura `thinking` streaming + estruturação em steps + drawer.
8. **#6 Inbox de decisão** — novo status `awaiting_user` no trace pipeline + UI inbox + endpoint respond.
9. **#13 Dock vivo (Phase 2 scope: pulse + badge + bounce; tray opcional pra depois)**.

**Cert critério**: cada afirmação de Atlas carrega marca de convicção; reasoning peekable; decisions surface em inbox; dock reflete estado.

### Phase 3 · Orquestração editorial (sprint 6-8 · ~3-4 semanas)

Objetivo: features avançadas — multi-agent, steering, variantes.

10. **#5 Coreografia multi-agente** — normaliza sub_agents schema; reusa do Forge Rivals.
11. **#9 Linha do tempo** — régua Cmd+T + endpoint branch.
12. **#4 Steering em curso** — endpoint steer com pause-resume SSE; arquitetura backend-heavy.
13. **#10 Variante paralela** — split UI + payload variants + endpoint distill.

**Cert critério**: orchestration visível, threads ramificáveis, mid-stream nudge funcional, variants comparáveis e destiláveis.

### Phase 4 · Polish e opt-ins (sprint 9+)

14. **#12 Atmosfera** — ambient audio com 4 sons curados.
15. **#13 Dock vivo completo** — system tray + popover global quick-prompt.

**Não-objetivo Phase 4**: deixar atmosphere defaults ON. Continua opt-in canon.

---

## 5 · Princípios canon (refresher TDAH-friendly)

Antes de implementar QUALQUER inovação:

1. **Off-by-default ou Deeply Discreet**. Todo nudge novo nasce desligado se houver risco de distração contínua (especialmente #4 Steering, #12 Atmosfera).
2. **Hierarquia única respiradora**. Em uma viewport, só UM elemento pode "respirar" (animar/destacar). Se você liga conviction + decision inbox + multi-agent + reasoning drawer simultaneamente, refatore.
3. **Cores canônicas**. Bronze para peso, ink hierárquico para texto, rec-red SOMENTE para missing-source / has-risk / gargalo. Nada de verde-OK / amarelo-warn / vermelho-error SaaS.
4. **Peso editorial > skeumorfismo SaaS**. Hairlines, numerais romanos, Cormorant italic, Mono caps eyebrows. Nunca border-radius 12px+, nunca gradiente vibrante, nunca emoji ornamental.
5. **Calmaria sempre alcançável**. Cmd+Shift+. é um direito do usuário TDAH. Em qualquer estado (mid-orchestration, mid-decision-inbox, mid-stream), Calmaria reduz para texto.
6. **Honestidade canon**. Nunca inventar dado. Se conviction não pode ser derivada, não mostre border-left. Se cost não pode ser estimada, mostre "—".

---

## 6 · Anti-padrões explícitos

Coisas que NÃO devemos copiar dos concorrentes:

- **Cursor Mission Control grid**: 9 cards igualmente urgentes. Não aplicar. Coreografia multi-agente (#5) é linear cronológica, não grid.
- **Claude Code raw thinking inline**: poluição. Reasoning vai em drawer (#3), não inline.
- **Devin Focus Mode parcial**: esconde só side panels. Calmaria (#11) esconde TUDO auxiliar.
- **Perplexity numbered chips azuis**: cor SaaS. Use numerais romanos minúsculos bronze (#7).
- **Linear AI "Thinking" bubble**: SaaS-clean mas sem peso. Use pulso editorial (#1).
- **Devin child sessions tab**: navegação extra. Multi-agent (#5) é inline na thread principal.
- **Cursor Design Mode anotação browser**: out-of-scope, distração visual.
- **OpenAI canvas split editor**: paralelo mas para EDIT, não para QUERY comparada. Variante (#10) é só para query, escolha-uma.
- **Discord/Slack notification sounds**: alarmantes. Atmosfera (#12) é sub-perceptual cello/sub-bass.

---

## 7 · Bibliografia canon

### 7.1 · Concorrentes diretos (estado-da-arte)

- Cursor — [Cursor: Build Software with AI Agents](https://cursor.com/product) · [Cursor AI 2026: The Complete Guide](https://dev.to/sahilkhurana/cursor-ai-2026-the-complete-guide-to-the-ai-native-ide-3n4h) · [Cursor IDE Complete Guide 2026](https://codersera.com/blog/cursor-ide-complete-guide-2026/)
- Claude Code CLI — [Building with extended thinking](https://platform.claude.com/docs/en/build-with-claude/extended-thinking) · [Claude Code Q1 2026 Update Roundup](https://www.mindstudio.ai/blog/claude-code-q1-2026-update-roundup) · [issue #30660 streaming thinking](https://github.com/anthropics/claude-code/issues/30660) · [Best practices for Claude Code](https://www.anthropic.com/engineering/claude-code-best-practices)
- Cognition Devin — [Cognition AI](https://cognition.ai/) · [Devin 2026 release notes](https://docs.devin.ai/release-notes/2026) · [Introducing Devin 2.2](https://cognition.ai/blog/introducing-devin-2-2) · [Devin AI Guide 2026](https://aitoolsdevpro.com/ai-tools/devin-guide/)
- GitHub Copilot Workspace / Coding Agent — [Hands On with Copilot Planning Preview](https://visualstudiomagazine.com/articles/2025/10/23/hands-on-with-new-visual-studio-copilot-planning-feature-preview.aspx) · [Planning a project with Copilot](https://docs.github.com/en/copilot/tutorials/plan-a-project) · [Plan before you build (Jan 2026)](https://github.blog/changelog/2026-01-21-github-copilot-cli-plan-before-you-build-steer-as-you-go/)
- Vercel v0 — [Introducing the new v0](https://vercel.com/blog/introducing-the-new-v0) · [v0 by Vercel 2026 Review](https://weavai.app/blog/en/2026/04/28/v0-by-vercel-2026-review-ui-quality-pricing-verdict/) · [v0 Complete Guide 2026](https://blog.vibecoder.me/v0-by-vercel-complete-guide)

### 7.2 · Padrões adjacentes (lições transferíveis)

- Linear — [Agent Interaction Guidelines](https://linear.app/developers/aig) · [UI refresh 2026-03-12](https://linear.app/changelog/2026-03-12-ui-refresh) · [How we redesigned Linear UI part II](https://linear.app/now/how-we-redesigned-the-linear-ui)
- Notion AI — [What is Notion AI](https://www.notion.com/help/notion-ai-faqs) · [How Notion Designs with AI](https://www.chatprd.ai/how-i-ai/how-notion-designs-with-ai-brian-lovins-prototype-playground-and-claude-code-workflows) · [Command Palette UX Patterns](https://medium.com/design-bootcamp/command-palette-ux-patterns-1-d6b6e68f30c1)
- Perplexity — [Citation-Forward Answers](https://www.unusual.ai/blog/perplexity-platform-guide-design-for-citation-forward-answers) · [How Perplexity AI Answers Work](https://ziptie.dev/blog/how-perplexity-ai-answers-work/) · [Citation Patterns Comparison](https://medium.com/@shuimuzhisou/how-ai-engines-cite-sources-patterns-across-chatgpt-claude-perplexity-and-sge-8c317777c71d)
- Figma — [Multiplayer Editing in Figma](https://www.figma.com/blog/multiplayer-editing-in-figma/) · [Multi-Cursor Presence in Dev Mode](https://designilo.com/2025/07/20/understanding-figmas-multi-cursor-presence-in-dev-mode/)
- Anthropic Computer Use — [Computer use tool docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool) · [anthropic-quickstarts computer-use-demo](https://github.com/anthropics/anthropic-quickstarts/tree/main/computer-use-demo)
- Comparison/preference — [LinkedIn Crosscheck](https://almcorp.com/blog/linkedin-crosscheck-ai-model-comparison-tool/) · [OverallGPT](https://overallgpt.com/) · [PAIR LLM Comparator](https://github.com/PAIR-code/llm-comparator)

### 7.3 · Pesquisa acadêmica e XAI

- HCXAI workshop CHI 2026 — [hcxai.jimdosite.com](https://hcxai.jimdosite.com/)
- Liao & Vaughan — [Human-Centered Explainable AI (XAI): From Algorithms to User Experiences](https://arxiv.org/abs/2110.10790)
- Pang et al. — [Interactive Reasoning: Visualizing and Controlling Chain-of-Thought (UIST'25)](https://arxiv.org/html/2506.23678v1)
- Smashing Magazine — [Identifying Necessary Transparency Moments In Agentic AI (Part 1)](https://www.smashingmagazine.com/2026/04/identifying-necessary-transparency-moments-agentic-ai-part1/)
- AI UX Design Guide — [Confidence Visualization](https://www.aiuxdesign.guide/patterns/confidence-visualization)
- Steering vector research 2026 — [Activation Steering Field Guide](https://subhadipmitra.com/blog/2026/activation-steering-field-guide/) · [BRT-ALIGN: PREEMPTIVE DETECTION AND STEERING (arxiv 2509.21528)](https://www.arxiv.org/pdf/2509.21528)
- SSE & streaming infra — [Streaming Backbone of LLMs](https://procedure.tech/blogs/sse-for-llms/) · [Resumable LLM streaming](https://stardrift.ai/blog/streaming-resumptions)

### 7.4 · Canon Atlas próprio (releitura obrigatória antes de implementar)

- `/Users/vitorepf/develop/Atlas/atlas-desktop/docs/architecture/0007-atlas-desktop-design-system.md` — DNA Don Corleone, tokens, motion, componentes
- `/Users/vitorepf/develop/Atlas/atlas-desktop/apps/desktop/src/surfaces/atlas-ai/types.ts` — contratos AiTrace, AtlasDevRuntime
- `/Users/vitorepf/develop/Atlas/atlas-desktop/apps/desktop/src/surfaces/atlas-ai/components/AtlasAiConversation.tsx` — surface atual a evoluir
- `/Users/vitorepf/develop/Atlas/atlas-desktop/apps/desktop/src/surfaces/atlas-ai/components/AtlasAiStreamingIndicator.tsx` — referência do que vamos refinar
- Memory canon: `feedback_atlas_tdah_design`, `project_atlas_motion_principle`, `reference_atlas_desktop_design_system`

---

## 8 · Apêndice · Mapeamento direto de gaps

Tabela rápida para o time decidir "qual gap atacamos primeiro":

| Gap concreto observado | Inovação que resolve | Eixo TDAH |
|---|---|---|
| "Spinner gira sem dizer nada" | #1 Pulso editorial | Reduz ansiedade · informa fase |
| "Não sei se posso confiar nessa resposta" | #2 Glifo de convicção | Margem visual · texto não polui |
| "Quero entender por que ele decidiu isso" | #3 Drawer de razão | Sob demanda · não invade |
| "Ele está indo na direção errada e tem que esperar" | #4 Steering | Opt-in · hairline sub-bolha |
| "São 3 agentes trabalhando, não sei onde estão" | #5 Coreografia multi-agente | Numerais romanos · timeline única |
| "Ele me interrompe pedindo confirmação no meio" | #6 Inbox de decisão | Bolha não-pisca · você atende quando |
| "Onde isso veio? que linha do arquivo?" | #7 Marginália de evidência | Pin discreto superscript · popover sob demanda |
| "Quanto isso me custou?" | #8 Custo silencioso | Rodapé ink4 · invisível em leitura |
| "Quero voltar pra resposta #14 da semana passada" | #9 Linha do tempo | Cmd+T opt-in · régua editorial |
| "Será que com claude vs codex daria diferente?" | #10 Variante paralela | 2 colunas explícito · radio · destilar |
| "Tem coisas demais na tela" | #11 Calmaria mode | THE canon TDAH |
| "Janela em background, quero saber quando terminou" | #13 Dock vivo | Badge bronze · bounce único |
| "Hover em path não faz nada" | #14 Sussurro de citação | Peek sem leave-chat |
| "Quero sentir o estado sem olhar" | #12 Atmosfera | Sub-perceptual · opt-in |

---

> **Última nota.** Este doc é spec de pesquisa, não plano de execução. Antes de qualquer phase, abrir Plan mode e validar com o operador. Toda inovação aqui tem que passar pelo checklist do capítulo 15 de `0007-atlas-desktop-design-system.md` ANTES do PR — incluindo aferição de peso editorial, hierarquia única respiradora e respeito ao DNA Don Corleone.
