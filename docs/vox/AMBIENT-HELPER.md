# Atlas Vox · Ambient Helper (V6-B)

> Onda V6-B. Helper macOS leve que captura `Option+Space` mesmo quando o
> Atlas Code está fechado e abre o app já ouvindo. **Não escuta áudio**,
> **não toca Kernel/provider**, **não toca terminal**. Apenas um trampolim
> auditável entre o hotkey global e o sinal canônico V6-A
> (`--vox-start-listening`).

---

## Visão em uma frase

`Option+Space` com Atlas Code aberto → hotkey in-process (Wave 6.5).
`Option+Space` com Atlas Code fechado → helper Ambient → `open -a Atlas\ Code.app --args --vox-start-listening` → app sobe e overlay já mostra "Atlas ouvindo".

---

## Componentes

| Componente | Caminho | Papel |
|---|---|---|
| Binário Rust | `crates/atlas-vox-ambient-helper/` | Loop polling 750 ms + `VoxHotkeyRuntime` (reaproveitado). Liga `Option+Space` quando Atlas Code não está rodando; desliga assim que o app aparece em `pgrep`. |
| LaunchAgent plist | `~/Library/LaunchAgents/com.atlas.vox.hotkey.plist` | Gerado pelo `voxAmbient.mjs install`. `KeepAlive=true` para que o launchd recupere o helper se ele morrer. |
| Script de instalação | `apps/desktop/scripts/voxAmbient.mjs` | Imprime o plist em modo padrão; só grava com `--yes`. `--dry-run` nunca muta nada. |
| Logs | `~/.atlas/vox/logs/ambient-helper.log` (helper) + `…stdout.log` / `…stderr.log` (launchd) | Apêndice via `tracing-appender`. Sem áudio, sem dados sensíveis. |

---

## Por que isso é seguro

- **Helper nunca pede microfone.** Áudio só existe dentro do `Atlas Code.app`. O helper não chama `cpal`, `whisper`, nada. Permissão de microfone segue exclusivamente do app principal.
- **Helper nunca chama o Kernel/provider.** Zero rede, zero HTTP, zero WebSocket. As únicas chamadas externas são `/usr/bin/pgrep -x "Atlas Code"` e `/usr/bin/open -a … --args --vox-start-listening`.
- **Cede o hotkey ao app aberto.** Quando `Atlas Code` vai pro `pgrep`, o helper chama `stop()` no `VoxHotkeyRuntime` e libera `Option+Space` para o runtime in-process (Wave 6.5). Sem contenção de hotkey no macOS.
- **Single-shot consume no boot.** O sinal `--vox-start-listening` é consumido uma vez pelo overlay V6-A. Reload do webview não rebloqueia o microfone (V6-A canon).
- **Sem `sudo`.** Tudo é user-scope: plist em `~/Library/LaunchAgents/`, logs em `~/.atlas/vox/logs/`.
- **Sem instalação automática.** `npm run vox:ambient:install` mostra o plist e exige `--yes` para gravar. Auditável por design.
- **Helper assinado pelo macOS via TCC do `pgrep`/`open`.** Não precisa de Accessibility/Input Monitoring extras além das que `Atlas Code` já pede para o hotkey runtime.

---

## Como instalar

1. Build do app assinado (precisa rust + cmake):
   ```sh
   cd atlas-desktop
   npm run tauri:build:vox --workspace=@atlas/desktop
   ```
   Confirma que `target/release/bundle/macos/Atlas Code.app` existe.

2. Build do helper:
   ```sh
   cargo build -p atlas-vox-ambient-helper --release
   ```
   Confirma que `target/release/atlas-vox-ambient-helper` existe.

3. Inspeciona o plist proposto (não grava nada):
   ```sh
   npm run vox:ambient:install --workspace=@atlas/desktop
   ```
   Saída: o XML completo, o caminho destino, e a instrução para confirmar.

4. Grava + carrega via launchctl:
   ```sh
   npm run vox:ambient:install --workspace=@atlas/desktop -- --yes
   ```

5. Confere status:
   ```sh
   npm run vox:ambient:status --workspace=@atlas/desktop
   ```

---

## Como testar manualmente

Com o helper instalado e o `Atlas Code.app` presente:

1. Garante que o app está fechado:
   ```sh
   pkill -x "Atlas Code"
   ```
2. Pressiona **Option+Space** em qualquer aplicativo.
3. Esperado:
   - Em ~1 s, o `Atlas Code` abre no Dock.
   - O overlay Vox aparece com "Atlas ouvindo".
   - Você fala e o transcript chega no overlay normal.
4. Confere o log:
   ```sh
   tail -n 20 ~/.atlas/vox/logs/ambient-helper.log
   ```

Para validar que o helper cede o hotkey enquanto o app está aberto:

1. Com o app aberto, pressiona **Option+Space** — o hotkey in-process (Wave 6.5) responde, o overlay já aparece. O helper enxergou o app rodando e desregistrou o hotkey.
2. Fecha o app (`Cmd+Q`).
3. Em ~1 s, o helper detecta via `pgrep` e re-registra. Repete o teste.

---

## Como remover

```sh
# preview (não muta nada):
npm run vox:ambient:uninstall --workspace=@atlas/desktop -- --dry-run

# remoção real:
npm run vox:ambient:uninstall --workspace=@atlas/desktop

# preservar logs históricos:
npm run vox:ambient:uninstall --workspace=@atlas/desktop -- --keep-logs
```

O comando faz:
- `launchctl bootout` (`load -w` como fallback) para descarregar.
- `unlink` do plist.
- (Default) apaga `ambient-helper.log`/`stdout`/`stderr`.

---

## Anatomia do plist

```xml
<plist version="1.0">
<dict>
  <key>Label</key>             <string>com.atlas.vox.hotkey</string>
  <key>ProgramArguments</key>
  <array>
    <string>…/target/release/atlas-vox-ambient-helper</string>
  </array>
  <key>RunAtLoad</key>         <true/>
  <key>KeepAlive</key>         <true/>
  <key>EnvironmentVariables</key>
  <dict>
    <key>ATLAS_VOX_AMBIENT_BUNDLE</key>
    <string>…/target/release/bundle/macos/Atlas Code.app</string>
  </dict>
  <key>StandardOutPath</key>   <string>~/.atlas/vox/logs/ambient-helper.stdout.log</string>
  <key>StandardErrorPath</key> <string>~/.atlas/vox/logs/ambient-helper.stderr.log</string>
  <key>ProcessType</key>       <string>Adaptive</string>
</dict>
</plist>
```

`KeepAlive=true` mais `ProcessType=Adaptive` deixam o launchd reiniciar o helper se ele morrer (panic, OOM, kill manual). Sem `SessionType` para evitar amarra a uma única sessão `Aqua`.

---

## Testes automatizados

### Rust

```sh
cargo test -p atlas-vox-ambient-helper
```

6 testes verdes:

- `cli_bundle_arg_overrides_everything`
- `env_overrides_canonical_when_set`
- `whitespace_bundle_arg_is_ignored`
- `canonical_path_when_nothing_else`
- `first_bundle_arg_wins_over_second`
- `pgrep_smoke_does_not_panic_with_nonexistent_process`

Os testes cobrem o parser de bundle path (CLI vence env vence canonical) e o detector `pgrep` (no caso degenerado devolve `NotRunning` honesto).

### Scripts npm

```sh
npm run vox:ambient:install   --workspace=@atlas/desktop -- --dry-run
npm run vox:ambient:uninstall --workspace=@atlas/desktop -- --dry-run
npm run vox:ambient:status    --workspace=@atlas/desktop
```

Nenhum dos três muta o sistema. `status` é sempre exit 0; `install`/`uninstall` em dry-run também.

---

## Troubleshooting (PT-BR)

| Sintoma | Diagnóstico | Solução |
|---|---|---|
| `npm run vox:ambient:install` falha com "binário do helper não encontrado" | `target/release/atlas-vox-ambient-helper` não existe | `cargo build -p atlas-vox-ambient-helper --release` |
| Option+Space com Atlas Code fechado não faz nada | Helper não está carregado | `npm run vox:ambient:status` → se `launchctl carregado: não`, refaça o install |
| Helper inicia mas o app não abre | Bundle path errado | Verifique `tail -f ~/.atlas/vox/logs/ambient-helper.log` — procure por "falha ao spawn" e revise `ATLAS_VOX_AMBIENT_BUNDLE` no plist |
| Hotkey conflita quando o app está aberto | Helper não cedeu o registro | Espere ~1 s (poll interval). Se persistir, abra o log e veja se `Transição: app fechado → app aberto` aparece. Se não, o helper pode estar travado — `launchctl kickstart -k gui/$(id -u)/com.atlas.vox.hotkey`. |
| Permissão de microfone é pedida toda vez | Você está abrindo um `.app` diferente toda hora | Garante que o bundle no plist é o mesmo que está em produção; ou consolide o helper apontando para `/Applications/Atlas Code.app` |

---

## Próximos passos não cobertos por V6-B

- **Mover bundle para `/Applications`.** Em produção, o plist deve apontar para `/Applications/Atlas Code.app`. O script atual usa o caminho de dev (`target/release/bundle/macos/`) porque é onde o build local termina. Quando houver pipeline de distribuição, basta passar `ATLAS_VOX_AMBIENT_BUNDLE` no environment do install.
- **Helper assinado independentemente.** Hoje o helper é um binário Cargo cru. Para distribuição final, ele deve receber o mesmo certificado de assinatura que o `Atlas Code.app`.
- **Telemetria de uso.** Quantas vezes o gatilho ambient disparou por dia. Hoje, só o `ambient-helper.log` registra; não há contador agregado.
- **Hotkey alternativos.** Em V6-B, a única combinação é `Option+Space` (canon Wave 6.5). Configuração custom fica para V7.

---

**Última revisão:** 2026-05-19
**Status:** V6-B entregue. Helper Rust + LaunchAgent + scripts npm + docs prontos.

---

## V6-D · fechamento da experiência ambient

A V6-D não cria features novas; ela fecha as bordas que faltavam para o
Vitor confiar no fluxo "Atlas fechado → Option+Space → Atlas ouvindo"
sem cair em corner cases sutis.

### Mudanças canônicas

1. **Anti-duplicação no helper.** O `spawn_atlas_code_listening` agora:
   - Re-checa `pgrep -x "Atlas Code"` **imediatamente** antes de invocar
     `/usr/bin/open` (fecha a janela de 750 ms do poll do loop principal).
   - **Nunca usa `-n`.** O `-n` força nova instância e duplica sessão. A
     decisão é por estado do app:
     - **App fechado** → `open -a <bundle> --args --vox-start-listening`.
       O Tauri ainda lê argv em `from_process()` (V6-A) — boot signal
       acaba consumido pelo overlay.
     - **App aberto** → `open -a <bundle>` (só foca). O hotkey in-process
       da Wave 6.5 vai tratar Option+Space como toggle.
   - Testes Rust em `cargo test -p atlas-vox-ambient-helper --release`
     cobrem ambos os ramos + regressão de `-n`.
2. **Anti-duplicação no overlay.** `useVoxOverlay.start()` ganhou um
   guard explícito: qualquer fase produtiva ativa (`starting`,
   `listening`, `finishing`, `transcribing`) ignora chamadas paralelas
   de `start()`. Ambient launch + hotkey global agora não conseguem
   abrir duas sessões na Rust.
3. **Diagnóstico expandido.** `npm run vox:ambient:status` audita:
   - `tauri.conf.json::identifier` bate com `com.atlas.code`;
   - `Info.plist` declara `NSMicrophoneUsageDescription`;
   - `entitlements.plist` declara `com.apple.security.device.audio-input`;
   - presença de helper Rust + bundle + plist + estado do `launchctl`.
   - Modo JSON via `--json` para consumo de scripts.
4. **release-check integrado.** `npm run vox:release-check` agora
   inclui um step `ambient-audit` que pega o mesmo veredito do
   `voxAmbient.mjs::collectAmbientAudit()`. Identifier ou mic ausentes
   viram `fail`; LaunchAgent não instalado é `warn` (Atlas continua
   utilizável com app aberto).

### Os quatro fluxos canônicos esperados

| # | Cenário | O que acontece |
|---|---------|----------------|
| 1 | **Atlas fechado** | Helper detecta Option+Space → spawn `open -a <bundle> --args --vox-start-listening` → Tauri lê o sinal em `from_process()` → `vox_ambient_consume_pending_launch` devolve `start_listening=true` no mount → overlay abre + `start()` dispara sessão Vox real. |
| 2 | **Atlas aberto em background** | Helper detectou o app via `pgrep` no último poll, então `Option+Space` é roteado pelo hotkey in-process (Wave 6.5). Não abre segunda janela, não duplica sessão. |
| 3 | **Atlas aberto e já ouvindo** | Hotkey in-process recebe Option+Space → `toggleRecording()` chama `finish()` porque `state==='listening'` (lógica V6.5). Sem nova sessão. |
| 4 | **Race window do poll** | Mesmo se o helper ainda tem Option+Space registrado por estar dentro do poll de 750 ms, o `spawn_atlas_code_listening` re-checa pgrep AGORA e cai no ramo "app aberto" → apenas foca, sem `-n`, sem `--args`. Bottom-line: uma instância só. |

### Comandos canônicos

```bash
# 1. Build do helper (uma vez, sem rede):
cargo build -p atlas-vox-ambient-helper --release

# 2. Build do app (gera o .app):
npm run tauri:build:vox --workspace=@atlas/desktop

# 3. Dry-run da instalação (imprime o plist sem gravar):
npm run vox:ambient:install --workspace=@atlas/desktop

# 4. Instalação final (grava + carrega via launchctl bootstrap):
npm run vox:ambient:install --workspace=@atlas/desktop -- --yes

# 5. Diagnóstico humano:
npm run vox:ambient:status --workspace=@atlas/desktop

# 6. Diagnóstico em JSON (consumido pelo release-check):
npm run vox:ambient:status --workspace=@atlas/desktop -- --json

# 7. Remoção (apaga plist + log):
npm run vox:ambient:uninstall --workspace=@atlas/desktop -- --keep-logs
```

### Permissões macOS — quando o sistema pede de novo

O macOS persiste a permissão de microfone por **identifier do bundle**
(`com.atlas.code`). Se a permissão sumir, é um destes:

- Você buildou o `Atlas Code.app` em outro caminho e abriu por lá. O
  identifier é o mesmo, mas o bundle path mudou — o macOS pode pedir de
  novo. Solução: mantenha um único bundle (idealmente em
  `/Applications/Atlas Code.app`) e ajuste `ATLAS_VOX_AMBIENT_BUNDLE` no
  plist do helper apontando para ele.
- A assinatura mudou. Se `signing-identity` em `tauri.conf.json` mudar
  entre builds, o macOS pode invalidar a permissão. O canon V6 mantém
  `Atlas Local Code Signing` estável.
- `NSMicrophoneUsageDescription` removida ou alterada de forma drástica.
  O `vox:ambient:status` flagga isso como `warn` (`mic usage (plist)
  ✗ ausente`).

Atlas **nunca** resetará TCC ou tentará reinstalar permissão sem
intervenção do usuário. Quando faltar, o overlay mostra o banner
humanizado do `humanizeOverlayError`.

### Logs e privacidade

- Tudo em `~/.atlas/vox/logs/` (texto puro, sem áudio).
- `ambient-helper.log` traz: registro/dispatch de hotkey, transições
  app aberto ↔ fechado, falhas de spawn. Sem transcript, sem áudio.
- `--keep-logs` no uninstall preserva o histórico para investigação.


