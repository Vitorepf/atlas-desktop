# Atlas Vox · first use

Runbook para usar Atlas Vox a primeira vez. Siga em ordem. Cada comando é copiável.

---

## Sequência canônica (1 comando · Wave V3.10)

> A partir da Wave V3.10 existe um orquestrador profissional que sobe
> tudo. Vitor não precisa mais abrir 3 terminais.

Pré-requisitos uma única vez:

```sh
# (uma vez, na vida da máquina)
brew install cmake
mkdir -p ~/.atlas/vox/models
# baixe ggml-large-v3.bin (~3.1 GB) de huggingface.co/ggerganov/whisper.cpp/tree/main
# mova:  mv ~/Downloads/ggml-large-v3.bin ~/.atlas/vox/models/

# (uma vez por checkout, idempotente)
cd /Users/vitorepf/develop/Atlas/atlas-server
/opt/homebrew/bin/php artisan migrate

cd /Users/vitorepf/develop/Atlas/atlas-desktop
npm install
```

Cada sessão de uso:

```sh
cd /Users/vitorepf/develop/Atlas/atlas-desktop
npm run vox:dev --workspace=@atlas/desktop
```

`vox:dev` faz tudo em ordem:

1. Preflight (PHP / cmake / modelo Whisper / Cargo feature `whisper-cpp`).
2. Boota `atlas-server` em background, log em `apps/desktop/test-results/vox-dev/atlas-server.log`.
3. Aguarda `/ai/vox/health` responder 200.
4. Lança `tauri dev --features whisper-cpp` (Whisper.cpp real linkado).
5. Em Ctrl+C, encerra o atlas-server.

Recusa de iniciar se algo essencial está faltando — sem fallback silencioso.

Override knobs:

```sh
ATLAS_SERVER_PORT=8002   npm run vox:dev   # outro porto
ATLAS_SKIP_SERVER=1      npm run vox:dev   # já tem o server rodando
VITE_ATLAS_VOX_DEV=1     npm run vox:dev   # expõe debug fallback (developer mode)
```

Antes de qualquer release ou auditoria:

```sh
npm run vox:release-check --workspace=@atlas/desktop
```

---

## Sequência manual (legado · só se vox:dev quebrar)

> Estes 5 passos são o que `vox:dev` faz automaticamente. Use só se o
> orquestrador quebrar e você quiser isolar o problema.

```sh
# 1. Suba o atlas-server (se já estiver rodando, pule)
cd /Users/vitorepf/develop/Atlas/atlas-server
/opt/homebrew/bin/php artisan serve --port=8001

# 2. Em outro terminal · materialize as tabelas Vox (idempotente)
cd /Users/vitorepf/develop/Atlas/atlas-server
/opt/homebrew/bin/php artisan migrate

# 3. Aponte o Desktop para o atlas-server e exporte ATLAS_TOKEN
#    O ATLAS_TOKEN precisa ser EXATAMENTE igual ao de atlas-server/.env.
#    O valor não aparece em logs, manifest ou console do release check.
export VITE_ATLAS_SERVER_URL=http://127.0.0.1:8001
export ATLAS_TOKEN="$(grep ^ATLAS_TOKEN= ../atlas-server/.env | cut -d= -f2-)"

# 4. Posicione o modelo Whisper large-v3 (download manual; o release check NÃO baixa)
mkdir -p ~/.atlas/vox/models
# baixe ggml-large-v3.bin (~3 GB) de huggingface.co/ggerganov/whisper.cpp/tree/main
# e mova:  mv ~/Downloads/ggml-large-v3.bin ~/.atlas/vox/models/

# 5. Suba o Tauri com Whisper real linkado
cd /Users/vitorepf/develop/Atlas/atlas-desktop
npm run tauri:dev:vox --workspace=@atlas/desktop
```

Status canônicos:

- **PASS** → abra `npm run tauri:dev --workspace=@atlas/desktop` e use **Option+Space**.
- **WARN** → ainda dá pra usar; o release check listou exatamente o que falta.
- **FAIL** → algo essencial quebrou (build/test/runtime). Corrija antes.

---

## 0. Objetivo do teste

Validar a cadeia inteira (modelo → backend → desktop → hotkey → STT → Kernel → confirmação) com **zero** risco operacional:

- Ditar texto e ver ele aparecer.
- Polir um prompt e copiar.
- Compilar uma intenção e ler o resultado.
- Propor um comando shell **sem executar**.

Sem chamar provider em produção. Sem comando destrutivo. Sem dado sensível.

---

## 1. Pré-requisitos

| | requisito |
|---|---|
| OS | macOS (M1+) |
| PHP | 8.4+ (`/opt/homebrew/bin/php`) |
| Node | 20+ + `npm` |
| Rust | toolchain estável (instalado por `rustup`) |
| Repos | `atlas-server` e `atlas-desktop` lado a lado |
| Permissões macOS | Microphone + Accessibility (libera depois, passo 6) |

Instalação one-shot, na raiz do `atlas-desktop`:

```sh
npm install
```

---

## 2. Modelo Whisper

STT real é local via `whisper.cpp`. Sem o modelo, o overlay continua abrindo, mas `Ouvi` cai num fallback debug e o smoke retorna `warn`.

```sh
mkdir -p ~/.atlas/vox/models
curl -L \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin \
  -o ~/.atlas/vox/models/ggml-large-v3.bin
```

Arquivo final: `~/.atlas/vox/models/ggml-large-v3.bin` (~3,1 GB).

---

## 3. Subir backend

Em um terminal, na raiz do `atlas-server`:

```sh
cd /Users/vitorepf/develop/Atlas/atlas-server
/opt/homebrew/bin/php artisan serve --host=127.0.0.1 --port=8000
```

Deixe esse terminal rodando.

Endpoints que o desktop consome:

- `GET  /ai/vox/health`
- `GET  /ai/vox/readiness`
- `POST /ai/vox/intent`
- `POST /ai/vox/execute`
- `GET  /ai/vox/gate-v3`
- `GET  /ai/vox/metrics`
- `GET  /ai/vox/rivals/report`
- `POST /ai/vox/rivals/case`
- `GET  /ai/vox/dogfood/report`
- `POST /ai/vox/dogfood/session`

---

## 4. Subir desktop

Em outro terminal, na raiz do `atlas-desktop`:

```sh
cd /Users/vitorepf/develop/Atlas/atlas-desktop
export VITE_ATLAS_SERVER_URL=http://127.0.0.1:8000
npm run tauri:dev --workspace=@atlas/desktop
```

A primeira execução compila o Rust (`crates/atlas-tauri`) — leva alguns minutos.

---

## 5. Rodar smoke

Em um terceiro terminal:

```sh
cd /Users/vitorepf/develop/Atlas/atlas-desktop
VITE_ATLAS_SERVER_URL=http://127.0.0.1:8000 npm run vox:smoke --workspace=@atlas/desktop
```

Saída esperada:

- `✓ PASS` → tudo pronto.
- `⚠ WARN` → dá pra usar; falta peça honesta (modelo, env, etc).
- `✗ FAIL` → repo inconsistente; **não siga** — corrija o que o "Próximos passos" listou.

Relatório completo em `apps/desktop/test-results/vox-first-use-smoke/manifest.json` (schema `atlas.vox.first_use_smoke.v1`).

---

## 6. Permissões macOS

A primeira vez que o app pedir hotkey global ou microfone, libere em **System Settings → Privacy & Security**:

1. **Microphone** → habilite Atlas Code/Tauri.
2. **Accessibility** (ou **Input Monitoring**, depende do macOS) → adicione Atlas Code/Tauri.

Se o overlay mostrar banner `Atalho global pendente: libere Accessibility/Input Monitoring`, libere no Settings e **reinicie** o Tauri (Ctrl+C no terminal do passo 4, rode `npm run tauri:dev` de novo).

---

## Teste seguro recomendado

Use estas duas frases. Nenhuma delas executa nada, nem toca dado sensível.

Frase A (intent_compile):

> "Atlas, transforma isso em um prompt para o Codex investigar o VoxOverlay sem editar nada, só me dar diagnóstico."

Frase B (governed_execute · propose-only):

> "Atlas, gera o comando para listar arquivos modificados no git, mas não executa."

Frase B vai cair em `terminal_propose` no Kernel. O desktop **nunca** roda o comando — só te entrega o texto pra você copiar e decidir.

---

## 7. Primeiro teste · Dictation

1. Foque qualquer app texto (Notes, terminal, editor).
2. **Option+Space** → overlay abre, `Atlas ouvindo` aparece.
3. Fale: *"compras de mercado: pão, café, ovos."*
4. **Enter** (no overlay) ou **Option+Space** de novo → finaliza.
5. STT roda local. `Ouvi` mostra o texto.
6. Modo: **Dictation** (default R0).
7. **⌘+Enter** ou **Compilar intenção** → desktop copia/insere o texto literal.

Esperado: texto literal foi parar no clipboard (ou inserido no campo focado, dependendo da config).

---

## 8. Segundo teste · Prompt Polish

1. **Option+Space** → fale: *"escreve um prompt para o claude explicar arquitetura desse repo em 3 parágrafos."*
2. Finalize com **Enter**.
3. Modo: **Prompt Polish**.
4. **⌘+Enter** → Kernel devolve `compiled_prompt` limpo.
5. O overlay oferece **Copy compiled** / **Copy original**.

Esperado: prompt polido, com estrutura clara, sem ruído de "uhm, então".

---

## 9. Terceiro teste · Intent Compile

1. **Option+Space** → fale a **Frase A** (acima).
2. Finalize com **Enter**.
3. Modo: **Intent Compile**.
4. **⌘+Enter** → Kernel devolve `IntentPacket` com goal / constraints / risk_class / compiled_prompt.

Esperado: pacote estruturado. `risk_class` baixo (R0 ou R1). Nada é executado.

---

## 10. Quarto teste · Governed Execute seguro

1. **Option+Space** → fale a **Frase B** (acima).
2. Finalize com **Enter**.
3. Modo: **Governed Execute**.
4. **⌘+Enter** → Kernel devolve `confirmation_request`.
5. Overlay mostra:
   - texto do comando proposto (`git status` / `git diff --name-only` / similar).
   - botões `Executar com receipt` · `Cancelar` · `Editar intenção`.
6. Clique **Executar com receipt**.
7. Kernel grava o outcome com `metadata.command_executed=false`. Desktop **não roda** o comando — só te entrega a string.

### Regras de segurança (não relaxar no primeiro uso)

- **terminal_propose nunca executa** — só propõe. Você roda manualmente se quiser.
- **R4 exige literal** — se um teste cair em R4 (não deveria com a Frase B), só libera Executar quando você digitar exatamente o `literal_confirmation_text`. Sem typo, sem case-insensitive.
- **Não dite comandos destrutivos no primeiro uso** — `rm -rf`, `git push --force`, `drop database`, `sudo …` caem no hard-veto, mas evite testar o veto agora.
- **Não dite credenciais nem dados sensíveis** — STT é local, mas o transcript vai pro atlas-server.
- **Áudio cru não é persistido por default** — Edge processa em memória e descarta. Não habilite flag de persistência sem motivo.

### Eclipse (parada de emergência)

Em qualquer momento: pressione **Esc Esc** (dois Esc rápidos, atalho global) → sessão é abortada, marcada como rejeitada, evento `VOX_ACTION_BLOCKED` gravado.

---

## 11. Registrar dogfood/rivals

Depois de cada sessão que chega num estado terminal (compiled / executed / cancelled), o overlay mostra **dois mini-blocos** complementares:

**Bloco A · "Registrar uso real?"** (Wave V3.9 · closeout do diário)

- `Sucesso` · `Parcial` · `Falhou` · `Cancelado` · `Ignorar`.
- Checkbox `marcar regret` + nota curta (≤1000 chars) opcionais.
- Flags `used_hotkey` / `used_real_stt` / `used_governed_execute` / `eclipse_used` são auto-inferidas a partir do estado da sessão.
- Um clique grava no diário via `POST /ai/vox/dogfood/session`.

**Bloco B · "Como foi?"** (Wave 7.6 · rivals comparison)

- `Bom` · `Ruim` · `Comparar` · `Eclipse testado` · `Ignorar`.
- Um clique grava um rivals case via `POST /ai/vox/rivals/case`.

Os dois alimentam o V3 Gate por ângulos diferentes (uso real vs. comparação com baseline). Use um, outro, ou os dois.

Verificar agregados:

```sh
curl -s http://127.0.0.1:8000/ai/vox/dogfood/report | jq
curl -s http://127.0.0.1:8000/ai/vox/rivals/report | jq
curl -s http://127.0.0.1:8000/ai/vox/gate-v3 | jq '.status, .blockers'
```

---

## 12. Troubleshooting

| Sintoma | Causa provável | Ação |
|---|---|---|
| `Atalho global pendente` no overlay | macOS Accessibility/Input Monitoring negado | Libere no Settings → reinicie `npm run tauri:dev` |
| `STT real indisponível` + `Ouvi` vazio | Modelo Whisper ausente ou build sem `whisper-cpp` | Passo 2. Se modelo presente: `cargo build -p atlas-platform --features whisper-cpp` |
| `Kernel Vox ainda indisponível` em `Entendi` | atlas-server não rodando OU branch sem `/ai/vox/*` | Passo 3. `npm run vox:smoke` aponta se é 404 ou unreachable |
| Option+Space não dispara overlay, mas botão Vox abre | hotkey runtime sem permissão OS | Mesmo caminho do banner Accessibility |
| `Executar com receipt` disabled em R4 | literal não confere (typo / case) | Leia a frase do `literal_confirmation_text` e digite literal |
| "Como foi?" não aparece | Sessão ainda não chegou em estado terminal | Aguarde compilar. `idle`/`listening`/`transcribing` são transitórios |
| Tauri compila eternamente | Primeira compilação Rust é lenta | Aguarde. Builds seguintes são rápidos |
| `vox:smoke` reporta `backend_reachability warn` (categoria `backend_url_missing`) | `VITE_ATLAS_SERVER_URL` não exportado no terminal do smoke | `export VITE_ATLAS_SERVER_URL=http://127.0.0.1:8001` antes de rodar |
| `vox:smoke` reporta `backend_reachability warn` (categoria `backend_unreachable`) | URL exportada mas atlas-server não responde (timeout/connection refused) | Suba o atlas-server (passo 3 da sequência canônica) |
| `vox:smoke` reporta `backend_reachability warn` (categoria `backend_no_vox_routes`) | atlas-server responde mas todos `/ai/vox/*` retornam 404 | Faça checkout do branch com Vox V0/V3 (rota não publicada) |
| `vox:smoke` reporta `backend_reachability warn` (categoria `backend_auth_token_missing`) | `ATLAS_TOKEN` não exportado no shell do desktop | `export ATLAS_TOKEN="$(grep ^ATLAS_TOKEN= ../atlas-server/.env \| cut -d= -f2-)"` antes de rodar. O valor não aparece em logs. |
| `vox:smoke` reporta `backend_reachability warn` (categoria `backend_auth_token_invalid`) | `ATLAS_TOKEN` exportado, mas server rejeitou (valor diferente de `.env` ou server ainda com .env antigo) | Reinicie o `php artisan serve` no atlas-server depois de mudar `.env`; reexporte o `ATLAS_TOKEN` no shell do desktop com o valor canônico |
| `vox:smoke` reporta `whisper_model_file warn` (categoria `model_missing`) | `~/.atlas/vox/models/ggml-large-v3.bin` ausente | Passo 4 da sequência canônica (download manual) |
| `vox:smoke` reporta `whisper_model_file warn` (categoria `model_truncated`) | Arquivo <500 MB (download interrompido) | `rm ~/.atlas/vox/models/ggml-large-v3.bin` e re-baixe |
| Backend respondendo mas overlay V3 reclama de cert/pack | `atlas:vox:doctor` reportou warn/fail no backend | `cd ../../atlas-server && /opt/homebrew/bin/php artisan atlas:vox:doctor` |

Se nada disso explicar:

```sh
npm run vox:smoke --workspace=@atlas/desktop
```

Leia `Próximos passos:` no terminal. O smoke audita arquivos reais — ele não inventa pass.
