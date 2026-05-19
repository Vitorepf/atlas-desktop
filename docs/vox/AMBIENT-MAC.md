# Atlas Vox · Ambient Mac (V6-A)

> Onda V6-A. Primeira pedra do "Option+Space abre Atlas Vox já ouvindo,
> mesmo quando o app não está focado". Esta onda entrega só a fundação
> segura — o LaunchAgent de verdade vem em V6-B, com confirmação explícita.

---

## O que existe hoje (V6-A)

1. **Sinal canônico de boot.** Ao subir, o `atlas-tauri` lê:
   - `--vox-start-listening` (linha de comando, com ou sem `=true`/`=false`)
   - `ATLAS_VOX_START_LISTENING=1` (variável de ambiente)

   `--vox-start-listening=false` na CLI vence o env (útil para desligar
   o ambient pontualmente sem mexer no helper).

2. **Estado single-shot.** O sinal é parseado por
   `vox_ambient_launch::detect_ambient_launch_request` (puro,
   determinístico, testado) e guardado num `VoxAmbientLaunchState`
   compartilhado. O frontend consome via o Tauri command
   `vox_ambient_consume_pending_launch` — segunda chamada já volta idle.
   Reload do webview NÃO rebloqueia o microfone.

3. **Evento `vox://ambient-launch-requested`.** Emitido uma vez no setup
   se o sinal estiver presente. Pure performance hint: o overlay sempre
   chama o comando explicitamente também, então o evento pode chegar antes
   ou depois sem mudar nada.

4. **Hook do overlay.** `useVoxOverlay` roda um `useEffect` no mount que
   consome o sinal. Se ativo:
   - abre overlay (`state=idle`);
   - dispara `start()`, que monta a sessão real via Mac Edge;
   - eventos `vox://session-started` levam o overlay para `listening`.

   Falha de permissão (microfone bloqueado) cai no banner humanizado
   (`humanizeOverlayError`) — não persiste áudio, não pede permissão de
   novo numa cascata.

5. **Script seguro de launch.**
   `apps/desktop/scripts/voxAmbientLaunch.mjs`
   - exige macOS;
   - exige `target/release/bundle/macos/Atlas Code.app` (mensagem PT-BR
     quando não existe);
   - usa `open -n -a "<bundle>" --args --vox-start-listening`;
   - suporta `--dry-run` (e `ATLAS_VOX_AMBIENT_DRY_RUN=1`) para validar
     que o caminho é o esperado **sem** abrir o app.

   Atalho:  `npm run vox:ambient-launch --workspace=@atlas/desktop`

---

## O que NÃO existe ainda (e por que)

- **LaunchAgent / login item / daemon.** Não instalamos nada invisível
  nesta onda. A próxima onda V6-B vai entregar um helper opcional, com
  comando explícito tipo `npm run vox:ambient-install-helper` e remoção
  com `vox:ambient-uninstall-helper`. Até lá, o usuário aciona o caminho
  ambient manualmente (ou via Shortcuts.app / Raycast / Alfred).

- **Hotkey global sem app aberto.** O hotkey runtime do Vox vive dentro
  do processo Tauri (Wave 6.5). Quando o app está fechado, não há nada
  escutando. V6-B é onde o helper resolve isso publicando um trampolim
  (`launchctl`/`SMAppService`) que sobe o `.app` com a flag canônica.

- **API paga, Voice Realtime, mobile.** Fora do escopo desta onda.

- **Auto-execução de terminal.** Nunca — Vox V6-A só inicia a sessão
  de microfone. Qualquer ação posterior segue o caminho normal (V3
  governed execute pede confirmação literal em R4).

---

## Privacidade e segurança

- O sinal só dispara `start()` — exatamente igual ao botão "Gravar"
  manual. Nenhum atalho ou efeito colateral novo.
- **Áudio cru não persiste** (canon Vox).
- **Sem `Full Disk Access`, sem screenshot, sem clipboard automático.**
- Microfone continua sob controle do macOS. Se o usuário não autorizou
  o `Atlas Code` em *Ajustes do Sistema · Microfone*, o overlay mostra
  mensagem PT-BR e fica parado.
- O sinal **não** vaza para outros bridges/HTTP — `voxAmbientConsumePendingLaunch`
  só lê o estado in-process e retorna idle para qualquer máquina que
  não tenha lançado o app com a flag.

---

## Como testar manualmente (Mac)

### 1. Build assinado

```sh
cd atlas-desktop
npm run tauri:build:vox --workspace=@atlas/desktop
ls -la target/release/bundle/macos/
# deve listar "Atlas Code.app"
```

### 2. Dry-run do script

```sh
npm run vox:ambient-launch --workspace=@atlas/desktop -- --dry-run
# saída esperada:
#   [vox:ambient-launch] (dry-run) NÃO vou abrir o Atlas Code.
#   [vox:ambient-launch] bundle: …/Atlas Code.app
#   [vox:ambient-launch] flags : --vox-start-listening
```

### 3. Abrir já ouvindo

```sh
# fecha qualquer instância aberta primeiro
pkill -x "Atlas Code"

npm run vox:ambient-launch --workspace=@atlas/desktop
```

Resultado esperado:
- Atlas Code abre (Dock + janela).
- Em ~1 s o overlay Vox aparece com "Atlas ouvindo".
- O microfone capturando — você fala e o transcript chega normal.
- `pkill -x "Atlas Code"` derruba e o ciclo pode ser repetido.

### 4. Abrir sem ouvir (validar que default segue ok)

```sh
pkill -x "Atlas Code"
# bypass do sinal
open -n -a "$(pwd)/target/release/bundle/macos/Atlas Code.app"
```

O app deve abrir normal, overlay fechado, hotkey Option+Space disponível
no fluxo padrão (Wave 6.5 hotkey runtime).

### 5. Override CLI vencendo env

```sh
pkill -x "Atlas Code"
ATLAS_VOX_START_LISTENING=1 open -n \
  -a "$(pwd)/target/release/bundle/macos/Atlas Code.app" \
  --args --vox-start-listening=false
```

Esperado: app abre normal, **sem** ambient. Confirma que CLI domina env.

---

## Testes automatizados

### Rust (puros)

```sh
cargo test -p atlas-tauri --lib vox_ambient_launch
```

11 testes verdes:
- `no_signal_yields_idle`
- `cli_bare_flag_starts_listening`
- `cli_explicit_true_starts_listening` (vários valores truthy)
- `cli_explicit_false_overrides_env`
- `env_truthy_starts_listening`
- `env_falsy_stays_idle`
- `both_cli_and_env_reports_combined_source`
- `ignores_trailing_double_dash_flags`
- `consume_is_single_shot`
- `peek_does_not_consume`
- `snapshot_serializes_source_as_kebab_lower`

### TypeScript

`useVoxOverlay` continua coberto pelos smokes existentes
(`npm run vox:release-check`, `npm run vox:visual-smoke`). O effect
ambient é nulo no modo browser (`mode !== 'tauri'`) e os smokes rodam
em SSR, então não introduzem falsos positivos.

---

## Próximos passos (V6-B, ainda não implementado)

1. Helper de LaunchAgent opcional (`launchctl`/`SMAppService`):
   - Comando explícito: `npm run vox:ambient-install-helper`.
   - Pede confirmação no terminal antes de gravar plist em
     `~/Library/LaunchAgents/com.atlas.code.vox-ambient.plist`.
   - Plist invoca `open -na "Atlas Code.app" --args --vox-start-listening`
     com `KeepAlive=false` e `RunAtLoad=false`. O helper só responde a
     `launchctl kickstart`.
   - Atalho fica no Spotlight + Shortcuts.app + Raycast/Alfred — quem
     liga é o usuário, não o instalador.

2. Comando casado de remoção (`vox:ambient-uninstall-helper`) que apaga
   plist + `launchctl unload`.

3. Verificação no `vox:release-check`: se o helper estiver instalado,
   confirma que o caminho `Atlas Code.app` no plist bate com o bundle
   atual (não quebrar quando o usuário reinstalar).

4. Integrar à `Diagnóstico` do Vox no overlay: chip "Atalho ambient
   instalado: sim/não", botão "Instalar" / "Remover" abrindo um terminal
   readonly com instruções (zero shell oculto).

---

**Última revisão:** 2026-05-19
**Status:** V6-A entregue. V6-B aguarda decisão explícita do Vitor.
