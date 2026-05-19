# Atlas Vox · Desktop release check

A pergunta única que esse comando responde:

> **Posso abrir o Atlas Desktop e usar o Vox agora?**

Comando:

```bash
npm run vox:release-check --workspace=@atlas/desktop
```

Saída: relatório `atlas.vox.desktop_release_check.v1` em
`apps/desktop/test-results/vox-release-check/manifest.json`.

## O que ele roda, em ordem

1. **`vox:smoke`** — first-use surface (bridge / Tauri commands / hotkey
   runtime / modelo Whisper). Reusa o manifesto upstream
   `test-results/vox-first-use-smoke/manifest.json` para decidir
   pass/warn/fail.
2. **`vox:visual-smoke`** — SSR render de cada estado canônico do Vox
   Overlay + varredura de leak de token/path. Reusa o manifesto
   `test-results/vox-visual-smoke/manifest.json` e o
   `totals.pass/warn/fail`.
3. **`leak rescan`** — defesa em profundidade: re-lê os fragmentos HTML
   produzidos pelo visual smoke e busca padrões proibidos
   (`confirmation_token`, `atlas_token`, `Bearer ...`, `sk-...`). Falha
   stop-the-line se qualquer um aparecer.
4. **`npx tsx voxReadiness.test.ts`** — unit do agregador de readiness.
5. **`npx tsx voxSetupAssistant.test.ts`** — unit do mapeamento
   blocker → ação concreta.
6. **`cargo test -p atlas-platform --lib vox`** — backend nativo do
   Vox (sessão, captura, hotkey, STT, benchmark). `cargo` ausente do
   PATH = **warn**, não fail.
7. **`cargo test -p atlas-tauri --lib vox`** — comandos Tauri Vox
   (edge / hotkey / setup allowlist / transcribe). Mesma regra de warn.
8. **`npm run build`** — `tsc -b && vite build`. **Fail** se quebrar.

## Estados

| status | exit | quando |
|---|---|---|
| `pass` | 0  | tudo verde |
| `warn` | 0  | usável agora, algum item honestamente ausente (cargo absent, modelo Whisper ausente, backend não configurado, hotkey pendente, executor CLI faltando) |
| `fail` | 1  | algo essencial quebrou (build, visual smoke, leak de token, comando Tauri Vox ausente) |
| crash  | 2  | o próprio orquestrador travou — manifesto registra `crashed: true` |

## Categorias de warn (machine-readable)

O `vox:smoke` agora marca cada warning com uma `category` estável. O
release-check lê a categoria e produz uma frase + bloco "Para usar agora"
específicos — sem ambiguidade entre causas que parecem o mesmo "warn".

| categoria | quando aparece | como remediar |
|---|---|---|
| `backend_url_missing` | `VITE_ATLAS_SERVER_URL` / `ATLAS_SERVER_URL` não exportados | `export VITE_ATLAS_SERVER_URL=http://127.0.0.1:8001` |
| `backend_unreachable` | URL exportada, mas atlas-server não respondeu (timeout/connection refused) | Suba o atlas-server: `cd ../../atlas-server && /opt/homebrew/bin/php artisan serve --port=8001` |
| `backend_no_vox_routes` | atlas-server respondeu, mas todos `/ai/vox/*` retornaram 404 | Faça checkout do branch com Vox V0/V3 (a rota não está publicada) |
| `model_missing` | `~/.atlas/vox/models/ggml-large-v3.bin` ausente | `mkdir -p ~/.atlas/vox/models` e baixe ggml-large-v3.bin (~3 GB) de huggingface.co/ggerganov/whisper.cpp. O release check NÃO baixa automaticamente. |
| `model_truncated` | Arquivo presente mas <500 MB (provavelmente download interrompido) | `rm ~/.atlas/vox/models/ggml-large-v3.bin` e re-baixe. |
| `doctor_warn` / `doctor_fail` | `atlas:vox:doctor` reportou warn/fail no backend | `cd ../../atlas-server && /opt/homebrew/bin/php artisan atlas:vox:doctor` |

Cada categoria pode coexistir com as outras no mesmo run; o release-check
imprime todas as remediations, sem agregar.

## Bloco "Para usar agora" (sempre presente)

Toda execução termina com uma sequência canônica de 5 passos para sair
de zero até "Vox funcionando no MacBook":

```
Para usar agora (Mac · local-first · sem API paga):
  1. Suba o atlas-server (se já estiver rodando, pule)
     cd ../../atlas-server && /opt/homebrew/bin/php artisan serve --port=8001
  2. Materialize as tabelas Vox (idempotente)
     cd ../../atlas-server && /opt/homebrew/bin/php artisan migrate
  3. Aponte o Desktop para o atlas-server
     export VITE_ATLAS_SERVER_URL=http://127.0.0.1:8001
  4. Posicione o modelo Whisper large-v3 (download manual; o release check NÃO baixa)
     ~/.atlas/vox/models/ggml-large-v3.bin
  5. Re-rode o release check
     npm run vox:release-check --workspace=@atlas/desktop
```

Quando o smoke flagra categorias específicas, elas aparecem logo abaixo
do bloco como "Nessa rodada, o smoke flagou especificamente: …" com
comandos exatos para copiar.

Quando tudo está verde, o bloco vira uma única linha pedindo
`npm run tauri:dev --workspace=@atlas/desktop`.

## Regras (alinhadas com a Onda V3.9)

- **Sem microfone real.** Nenhum step abre device de áudio.
- **Sem provider.** Nenhum step chama Codex/Claude/OpenAI/Wispr.
- **Sem terminal por voz.** Apenas tooling de dev (`npm`, `npx tsx`,
  `cargo`) é executado.
- **Modelo Whisper ausente é warn** — fluxo de polish/debug ainda funciona.
- **Backend ausente é warn** — smoke local cobre o desktop.
- **Token vazado em fragmento HTML é FAIL** — não rode `tauri build`.

## Onde mexer

- O orquestrador vive em `apps/desktop/scripts/voxReleaseCheck.mjs`.
- O manifesto canônico é
  `apps/desktop/test-results/vox-release-check/manifest.json`.
- Sub-smokes:
  `apps/desktop/scripts/voxFirstUseSmoke.mjs`,
  `apps/desktop/scripts/voxVisualSmoke.mjs`.
- Unit tests:
  `apps/desktop/src/lib/__tests__/voxReadiness.test.ts`,
  `apps/desktop/src/lib/__tests__/voxSetupAssistant.test.ts`.
- Allowlist Rust:
  `crates/atlas-tauri/src/commands_vox_setup.rs`.

## Como Vitor lê o resultado

1. Roda o comando.
2. Olha o banner (✓ PASS / ⚠ WARN / ✗ FAIL).
3. Lê os itens; cada linha tem `id`, duração e resumo.
4. Se houver "Próximos passos", são ações concretas em PT-BR.
5. O manifesto JSON serve para audit/CI; o resumo no terminal serve
   para decisão imediata.
