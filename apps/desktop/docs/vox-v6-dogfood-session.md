# Atlas Vox V6 · sessão dogfood

Sessão: **2026-05-19** · método: **synthetic text-mode** via `POST /ai/vox/intent` (kernel + Auto Mode Router + safety gates exercitados).

> **O que esta sessão NÃO testa**: captura cpal (microfone, AirPods, latência de start), Whisper STT (sotaque/ruído), UI (overlay, segmented control, listening pill). Esses caminhos precisam de Vitor com voz real. Este arquivo cobre o que **pode** ser observado sem voz: classificação de modo, compilação de prompt, hard-veto R4, gate de confirmação, ausência de leak técnico, métricas de ledger.

---

## Baseline

| Métrica | Antes | Depois (synth) | Depois (post-patch) |
|---|---|---|---|
| `total_sessions` | 3 | 23 | 43 |
| `dogfood_sessions` (marcadas) | 0 | 0 | 0 |
| `raw_audio_persisted_count` | 0 | 0 | 0 |
| `destructive_action_without_receipt` | 0 | 0 | 0 |
| `ready_for_daily_use` | `true` | `true` | `true` |
| `v6-certify` server | PASS 32/32 | PASS 32/32 | PASS 32/32 |
| Mode-match (synth) | — | **18/20** | **20/20** |

`dogfood_sessions` ficou em 0 propositalmente: NÃO chamei `/ai/vox/dogfood/session` porque seria mentira marcar "funcionou bem" sem Vitor ter usado de verdade. O contador só sobe quando humano marca chip Funcionou/Ruim.

---

## Resultados dos 20 testes (synth)

Cada linha = 1 POST real ao kernel. `auto_mode_reason` é a explicação PT-BR que o overlay mostraria ao operador. R4/R3 confirmation columns vêm direto da `confirmation_request` do response.

### Bloco 1 · Ditado

| # | Frase | Modo | Risco | Conf? | Latência | Resultado |
|---|---|---|---|---|---|---|
| 1 | "anota isso aqui: preciso revisar o planejamento do Atlas amanhã." | `dictation` | R0 | não | 52 ms | ✓ funcionou |
| 2 | "escreve uma mensagem curta dizendo que eu te retorno mais tarde." | `dictation` | R0 | não | 38 ms | ✓ funcionou |
| 3 | "[SUB] hoje preciso terminar o release note do Atlas Vox V6 antes do almoço." | `dictation` | R0 | não | 37 ms | ✓ funcionou |
| 4 | "[SUB] estava pensando que talvez fizesse sentido revisitar a Cartografia depois que o Vox estabilizar…" | `dictation` | R0 | não | 34 ms | ✓ funcionou |
| 5 | "[SUB-AIRPODS] teste de áudio simulado — só Vitor pode confirmar roteamento real" | `dictation` | R0 | não | 35 ms | ⚠ requer voz real |

### Bloco 2 · Melhorar

| # | Frase | Modo | Risco | Conf? | Latência | Resultado |
|---|---|---|---|---|---|---|
| 6 | "melhora esse texto: tá meio bagunçado mas dá pra deixar profissional." | `prompt_polish` | R0 | não | 43 ms | ✓ funcionou |
| 7 | "deixa isso mais claro e direto sem mudar o sentido." | `prompt_polish` | R0 | não | 41 ms | ✓ funcionou |
| 8 | "[SUB] organiza esse texto pra ficar mais profissional: oi tudo bem espero que sim aqui é o vitor…" | `prompt_polish` | R0 | não | 41 ms | ✓ funcionou |
| 9 | "não inventa nada, só organiza esse texto: revisar planejamento, comprar pão, pagar contador." | `prompt_polish` | R0 | não | 41 ms | ✓ funcionou (constraint "não inventa" preservada) |
| 10 | "deixa mais firme, mas educado: preciso da resposta até quarta…" | ~~`dictation`~~ → `prompt_polish` | R0 | não | 36 ms | ✗ **falhou pré-patch** → ✓ **fixed pós-patch** |

### Bloco 3 · Criar prompt

| # | Frase | Modo | Risco | Conf? | Latência | Resultado |
|---|---|---|---|---|---|---|
| 11 | "cria um prompt pro codex investigar por que o atlas vox pode estar lento." | `intent_compile` | R1 | não | 37 ms | ✓ funcionou |
| 12 | "monta um prompt pro claude avaliar essa arquitetura sem alterar arquivos." | `intent_compile` | R1 | não | 39 ms | ✓ funcionou (constraint "sem alterar arquivos" preservada) |
| 13 | "faz um prompt poderoso para pedir uma análise de mercado." | `intent_compile` | R0 | não | 42 ms | ✓ funcionou |
| 14 | "[SUB] manda pro codex investigar o módulo Vox sem editar…" | `intent_compile` | R1 | não | 40 ms | ✓ funcionou |
| 15 | "[SUB] pergunta pro claude se vale a pena reescrever o VoxCompiler…" | `intent_compile` | R2 | não | 62 ms | ✓ funcionou (R2 elevado por "reescrever") |

### Bloco 4 · Executar

| # | Frase | Modo | Risco | Conf? | r4_marker | Resultado |
|---|---|---|---|---|---|---|
| 16 | "roda os testes do vox." | `governed_execute` | R3 | **sim** | — | ✓ funcionou (terminal_propose, NUNCA executa) |
| 17 | "propõe um comando para ver arquivos modificados." | ~~`dictation`~~ → `governed_execute` | — → R3 | não → **sim** | — | ✗ **falhou pré-patch** → ✓ **fixed pós-patch** |
| 18 | "manda o codex analisar esse módulo sem editar." | `intent_compile` | R1 | não | — | ✓ funcionou (não escala para execute) |
| 19 | "apaga tudo." | `governed_execute` | **R4** | **sim** | `apagar_tudo` | ✓ **bloqueado corretamente** · confirmação literal exigida |
| 20 | "git push --force." | `governed_execute` | **R4** | **sim** | `git_push_force` | ✓ **bloqueado corretamente** · confirmação literal exigida |

---

## Top 3 dores reais (encontradas + classificadas)

| # | Dor | Categoria | Status |
|---|---|---|---|
| 1 | `"deixa mais firme/sério/direto/educado"` caía em **dictation** em vez de **prompt_polish** (teste #10) | **Irritante frequente** — adjetivos de tom plausíveis | ✓ **Corrigido** · 6 triggers novos em PROMPT_POLISH_TRIGGERS |
| 2 | `"propõe/sugere/me dá um comando"` caía em **dictation** em vez de **governed_execute** (teste #17) | **Irritante frequente** — operador frequentemente pede proposta, não execução | ✓ **Corrigido** · 2 regex novos em GOVERNED_EXECUTE_TRIGGERS |
| 3 | Latência média 41 ms · max 62 ms (teste #15 mais pesado por R2 + intent_compile longo) | **Aceitável** — limite humano percebido é ~150 ms | ✓ Nada a fazer |

**Bloqueador**: nenhum.
**Desejo futuro / V7**: nenhum encontrado nesta sessão.

---

## O que segue precisando voz real do Vitor

Esta sessão sintética **não cobre**:

1. **AirPods roteando no macOS** (teste #5) — só voz real prova que `default_input_device` pega o input certo.
2. **Whisper precisão em sotaque goiano** — variações como "esse trem", "pra mim", "tá" exigem fala real (a regression suite já cobre via dicionário, mas dogfood real valida).
3. **UI · listening pill animation, segmented control responsivo, "Não recebi áudio" copy em estado de erro** — visual smoke 27/27 valida render, mas só uso humano valida sensação.
4. **Latência percebida ⌥ Espaço → "Ouvindo"** — só com cpal real abrindo CoreAudio.
5. **Sessão presa & Parar tudo** — só humano descobre se o botão de recuperação aparece quando precisa.

Quando Vitor rodar os 20 ao vivo, deve confirmar os 18 que já passaram aqui + reportar qualquer regressão. Os 2 patches aplicados são determinísticos: mesma frase → mesmo modo agora.

---

## Como Vitor confirma manualmente (depois)

```sh
cd /Users/vitorepf/develop/Atlas/atlas-desktop
VITE_ATLAS_SERVER_URL=http://127.0.0.1:8001 npm run vox:dev --workspace=@atlas/desktop
```

E nos prompts do overlay, falar exatamente as 20 frases canônicas (use as variantes [SUB] como referência). Marcar chip **Funcionou bem** / **Marcar como ruim** ao fim de cada sessão alimenta `/ai/vox/dogfood/session` e move `dogfood_sessions` de 0 → 20.

---

## Hard invariantes confirmadas pós-sessão

- `total_sessions = 43` (3 baseline + 20 synth pré-patch + 20 synth pós-patch — números reais no ledger)
- `raw_audio_persisted_count = 0` ✓ invariante mecânica preservada
- `destructive_action_without_receipt = 0` ✓ R4 dos #19/#20 bloqueados antes de qualquer execute
- `dogfood_sessions = 0` ✓ não menti marcando uso real
- `v6-certify` server: **PASS 32/32 · 0 warn · 0 fail**
- `vox:v6-certify` desktop: **Sim. Atlas Vox V6 está pronto.**
- `VoxAutoModeRouterTest`: **102 passed (414 assertions)** pós-patch
