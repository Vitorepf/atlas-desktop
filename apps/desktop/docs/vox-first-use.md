# Atlas Vox V6 · primeira execução

Pré-requisitos e diagnóstico para a primeira vez que o Mac vai rodar o
Atlas Vox V6. Para uso diário, leia primeiro `vox-daily-use.md` — é mais
curto e cobre 90% do dia.

---

## 1. Pré-requisitos (uma única vez)

```sh
# Homebrew PHP + cmake (necessário para whisper.cpp)
brew install php cmake

# Modelo Whisper large-v3 (~3.1 GB, download manual — o Atlas NÃO baixa)
mkdir -p ~/.atlas/vox/models
# Baixe ggml-large-v3.bin de:
#   https://huggingface.co/ggerganov/whisper.cpp/tree/main
mv ~/Downloads/ggml-large-v3.bin ~/.atlas/vox/models/

# Migrations do atlas-server (idempotente)
cd /Users/vitorepf/develop/Atlas/atlas-server
/opt/homebrew/bin/php artisan migrate

# Dependências do desktop
cd /Users/vitorepf/develop/Atlas/atlas-desktop
npm install
```

Depois disso, o uso diário é `npm run vox:dev --workspace=@atlas/desktop`.

---

## 2. Como abrir

Caminho oficial — um comando:

```sh
cd /Users/vitorepf/develop/Atlas/atlas-desktop
npm run vox:dev --workspace=@atlas/desktop
```

O `vox:dev`:

1. Confere PHP, cmake, modelo Whisper, feature de voz no Cargo.
2. Sobe o `atlas-server` em background (log em
   `apps/desktop/test-results/vox-dev/atlas-server.log`).
3. Espera `/ai/vox/health` responder OK.
4. Abre o Atlas Code com `whisper-cpp` ativo.
5. Encerra o servidor no Ctrl+C.

---

## 3. Permissões do macOS

O macOS controla três permissões que afetam o Atlas Vox:

| Permissão | Para quê | Onde liberar |
|---|---|---|
| **Microfone** | Capturar fala | Ajustes do Sistema → Privacidade e Segurança → Microfone |
| **Acessibilidade** | Registrar o atalho ⌥ Espaço globalmente | Ajustes do Sistema → Privacidade e Segurança → Acessibilidade |
| **Monitoramento de Entrada** | Detectar ⌥ Espaço com outro app em foco | Ajustes do Sistema → Privacidade e Segurança → Monitoramento de Entrada |

As duas últimas só importam se você usa a camada Ambient (Option+Space
funciona mesmo com o Atlas Code fechado). Sem elas, o atalho funciona só
quando o Atlas Code está em foco. Detalhes em `docs/vox/AMBIENT-MAC.md`.

### Se o macOS pede microfone toda hora

O macOS guarda permissão por assinatura. Alternar entre
`npm run vox:dev` (assinatura dev) e o `Atlas Code.app` da build de
release (assinatura `Atlas Local Code Signing`) reseta a permissão e o
sistema pede de novo. Use sempre o mesmo caminho.

**Nunca** rode `sudo tccutil reset Microphone` — apaga a permissão de
todos os apps do Mac.

---

## 4. Diagnóstico

Comando único em PT-BR:

```sh
VITE_ATLAS_SERVER_URL=http://127.0.0.1:8001 npm run vox:doctor --workspace=@atlas/desktop
```

| Check | O que valida |
|---|---|
| `atlas_server_vivo` | `/ai/vox/health` respondeu OK |
| `desktop_server_url` | `VITE_ATLAS_SERVER_URL` está exportada |
| `atlas_token_presente` | Token disponível (shell ou `atlas-server/.env`). Valor **nunca** aparece em log |
| `modelo_whisper` | `~/.atlas/vox/models/ggml-large-v3.bin` no tamanho esperado |
| `build_whisper_cpp` | Feature `whisper-cpp` declarada no Cargo |
| `macos_info_plist` | `Info.plist` tem `NSMicrophoneUsageDescription` |
| `macos_entitlements` | `entitlements.plist` tem `audio-input = true` |
| `macos_signing` | `tauri.conf.json` declara identidade estável |
| `hotkey_option_space` | ⌥ Espaço registrado no runtime |

Cada falha vem com a próxima ação concreta. Estados:

- **PASS** — pode gravar.
- **WARN** — usável; revise.
- **FAIL** — corrige antes.

Relatório completo em `apps/desktop/test-results/vox-doctor/manifest.json`
(schema `atlas.vox.doctor.v1`, sem token, sem segredo).

---

## 5. Variáveis que importam

| Variável | Função | Default |
|---|---|---|
| `VITE_ATLAS_SERVER_URL` | Onde o desktop fala com o servidor | precisa ser definida |
| `ATLAS_SERVER_HOST` | Host do servidor que `vox:dev` sobe | `127.0.0.1` |
| `ATLAS_SERVER_PORT` | Porta do servidor que `vox:dev` sobe | `8001` |
| `ATLAS_PHP_BIN` | Binário do PHP que `vox:dev` usa | `/opt/homebrew/bin/php` |
| `ATLAS_TOKEN` | Token de acesso ao servidor | lido de `atlas-server/.env` se ausente |
| `ATLAS_SKIP_SERVER` | Para quando você já subiu o servidor em outro terminal | desligada |

O `ATLAS_TOKEN` nunca aparece em stdout, log ou relatório. O `vox:dev` lê
o valor e injeta nas requisições sem imprimir.

---

## 6. Veredito rápido

Uma linha para abrir:

```sh
cd /Users/vitorepf/develop/Atlas/atlas-desktop && npm run vox:dev --workspace=@atlas/desktop
```

Uma linha quando algo parecer estranho:

```sh
cd /Users/vitorepf/develop/Atlas/atlas-desktop && \
  VITE_ATLAS_SERVER_URL=http://127.0.0.1:8001 npm run vox:doctor --workspace=@atlas/desktop
```

Para o checklist final (doctor + release-check + v6-certify), volte para
`vox-daily-use.md` → seção "Checklist final · uso pronto".
