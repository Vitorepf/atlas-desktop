# Atlas Vox V6 — release note

Última verificação: 2026-05-19. Mac · local-first · sem API paga.

---

## 1. Status

**Pronto para uso diário.** Bateria final fechou verde em todas as camadas:

| Camada | Comando | Resultado |
|---|---|---|
| Backend cert | `php artisan atlas:vox:v6-certify --json` | **PASS · 32/32 · 0 warn · 0 fail** |
| Backend doctor | `php artisan atlas:vox:doctor --json` | health/readiness/metrics = pass; rivals/dogfood = warn (depende de uso real) |
| Backend dogfood | `php artisan atlas:vox:dogfood-summary --json` | `ready_for_daily_use = true`, `raw_audio_persisted_count = 0` |
| Desktop doctor | `npm run vox:doctor` | **PASS · 11/11** |
| Desktop release-check | `npm run vox:release-check` | **PASS · 15/15 · 27/27 visual smokes · 0 leaks** |
| Desktop v6-certify | `npm run vox:v6-certify` | **"Sim. Atlas Vox V6 está pronto."** |
| LaunchAgent Ambient | `npm run vox:ambient:status` | plist instalado + launchctl carregado · mic + entitlement ✓ |

Verdict humano do servidor: *"Atlas Vox V6 pronto para dogfood real. Use bastante antes de pensar em V7."*

---

## 2. Como abrir

Em um terminal, dentro de `atlas-desktop`:

```sh
cd /Users/vitorepf/develop/Atlas/atlas-desktop
VITE_ATLAS_SERVER_URL=http://127.0.0.1:8001 npm run vox:dev --workspace=@atlas/desktop
```

Esse comando sobe o `atlas-server` local (porta 8001), abre o Atlas Code com a voz pronta e encerra tudo limpo no `Ctrl+C`.

**Caminho Ambient (app fechado).** O LaunchAgent já está instalado e carregado neste Mac:

- Pressione **⌥ Espaço** com o Atlas Code fechado → o helper abre o Atlas Code já ouvindo.
- Status: `npm run vox:ambient:status --workspace=@atlas/desktop`.
- Helper binário: `target/release/atlas-vox-ambient-helper`.
- Bundle alvo: `target/release/bundle/macos/Atlas Code.app` (identifier `com.atlas.code`, signed `Atlas Local Code Signing`).

---

## 3. Como usar

1. Pressione **⌥ Espaço** em qualquer janela.
2. Fale.
3. Pressione **⌥ Espaço** de novo (ou **Enter**) para finalizar.
4. Revise o texto e clique no botão primário verde.

| Tecla | Comportamento |
|---|---|
| **⌥ Espaço** | Abre / grava / finaliza, conforme o estado |
| **Enter** | Finaliza quando o painel está "Atlas ouvindo" |
| **Esc** | Cancela a gravação ou fecha o painel |
| **Parar tudo** | Encerra qualquer sessão presa e libera o microfone |

---

## 4. Modos

O Atlas escolhe sozinho (modo automático). Você pode trocar manualmente em **Trocar modo** dentro do painel de revisão.

| Modo | O que faz |
|---|---|
| **Ditado** | Sua fala vira texto literal no campo ativo |
| **Melhorar** | Limpa, organiza e melhora o texto antes de inserir |
| **Criar prompt** | Transforma sua fala num prompt forte para Codex / Claude |
| **Executar** | Ação governada — confirmação humana sempre antes de qualquer efeito |

Em **Executar**, ações destrutivas (rm -rf, drop database, git push --force, deploy, apagar tudo) caem em **R4** e exigem que você digite uma frase literal para liberar. O Atlas **nunca** roda nada sozinho.

---

## 5. AirPods e microfone

O Atlas Vox **sempre usa a entrada de áudio selecionada no macOS**. Não há configuração separada por dispositivo.

- **Ajustes do Sistema → Som → Entrada** e clique no dispositivo que quer (AirPods, MacBook, Yeti, Loopback — todos funcionam igual).
- Se acabou de conectar os AirPods e a primeira gravação saiu vazia, o macOS provavelmente ainda está no built-in. Confira a entrada antes de apertar ⌥ Espaço de novo.
- Se aparecer **"Não recebi áudio. Confira se o microfone certo está selecionado no macOS e tente de novo."**: vá em **Som → Entrada**, fale e confirme que a barra de nível se mexe. Se mexe lá, vai mexer aqui.

**Permissão repetida do macOS** quase sempre é causada por alternar entre o dev build (`npm run tauri:dev`) e o release `.app`. Para evitar: rode `npm run tauri:build:vox` uma vez, use sempre o mesmo `Atlas Code.app` assinado pro dia a dia.

Detalhes completos: `apps/desktop/docs/vox-daily-use.md`.

---

## 6. Segurança

Invariantes verificadas pelo cert e pelos smokes:

- `kernel_guarantees.terminal_execute = false` — Vox **nunca** roda shell direto.
- `kernel_guarantees.destructive_auto_execute = false` — R4 sempre confirma literal.
- `kernel_guarantees.raw_audio_accepted = false` + `raw_pcm_persisted = false` — áudio bruto **nunca** persiste no disco, em nenhum estado.
- `dogfood-summary.raw_audio_persisted_count = 0` — invariante mecânico.
- `confirmation_token` nunca aparece em manifest, log ou render HTML (canary `PLAINTEXT_VOX_TOKEN_MUST_NEVER_LEAK` testado em todos os snapshots).
- `ATLAS_TOKEN` nunca aparece em log — doctor mostra "✓ presente" sem nunca printar o valor.
- Hard-veto R4 (rm -rf · sudo · drop database · git push --force · curl|sh · deploy · apagar tudo) bloqueia execução mesmo com token válido.
- Reply Surface · `voice_mode=off` por padrão. Voz só sai com frases canônicas (≤ 30 chars) e cooldown anti-flood.
- Voice Realtime Surface: `voice_realtime_status = paused_until_v6` (intocado).

---

## 7. Checks finais

| Pergunta | Resposta |
|---|---|
| Atlas Vox V6 está pronto para uso diário? | **SIM** — server cert 32/32, desktop release 15/15, dogfood-summary `ready_for_daily_use = true` |
| V7 está bloqueado? | **SIM** — por design, via 5 critérios em `v7_blockers_pt_br` (sessões reais, dogfood, correções pessoais, marcador humano) |
| Sem API paga obrigatória? | **SIM** — `paid_api_required = false`, Whisper local |
| Sem áudio bruto persistido? | **SIM** — `raw_audio_persisted_count = 0` |
| Mobile / Voice Realtime fora desta fase? | **SIM** — `atlas-app/` intocado, Voice RT pausado até V6 estabilizar |

Reproduza a qualquer momento:

```sh
# Backend
cd /Users/vitorepf/develop/Atlas/atlas-server
php artisan atlas:vox:v6-certify --json
php artisan atlas:vox:doctor --json
php artisan atlas:vox:dogfood-summary --json

# Desktop
cd /Users/vitorepf/develop/Atlas/atlas-desktop
VITE_ATLAS_SERVER_URL=http://127.0.0.1:8001 npm run vox:doctor --workspace=@atlas/desktop
VITE_ATLAS_SERVER_URL=http://127.0.0.1:8001 npm run vox:release-check --workspace=@atlas/desktop
VITE_ATLAS_SERVER_URL=http://127.0.0.1:8001 npm run vox:v6-certify --workspace=@atlas/desktop
npm run vox:ambient:status --workspace=@atlas/desktop
```

---

## 8. O que fica congelado

Até haver uso real suficiente, **não toque**:

- **V7 / memória entre dias.** Bloqueada por design via critérios duros (≥ 100 sessões OU ≥ 30 dias com Vox aberto; ≥ 10 correções pessoais; dogfood real; marcador humano em `~/.atlas/vox/v7_unlock_approved.json`). Não construa nada de V7 antes de zerar os 5 blockers — `php artisan atlas:vox:dogfood-summary --json` lista exatamente o que falta.
- **`atlas-app/` (mobile).** Atlas Vox V6 é Mac/Desktop. Mobile é outro frame, outra cabine.
- **Voice Realtime Surface.** Pausado até V6 estabilizar em uso real (`voice_realtime_status = paused_until_v6`).
- **API paga / cloud STT / provider remoto obrigatório.** Whisper local é canon. Codex/Claude CLI só são chamados quando o operador pede explicitamente Executar.
- **Persistência de áudio bruto.** Invariante mecânico (`VoxTranscript.raw_pcm_persisted = false`). Não introduza buffer/cache de áudio em disco.

---

## 9. Próximos 7 dias

Plano de uso humano, não de implementação:

1. **Use bastante.** Abra `npm run vox:dev` toda manhã. Use ⌥ Espaço pra cada captura de pensamento, lembrete, ditado de email, prompt pro Codex.
2. **Marque cada sessão** ao terminar — chip "Funcionou bem" / "Marcar como ruim" aparece no fim. Isso alimenta `/ai/vox/dogfood/session` e é o que destrava V7 no futuro.
3. **Anote correções pessoais** — quando o Whisper transcrever errado um termo Atlas (LiveKit, Codex, Cartografia, …), abra **Detalhes avançados → Dicionário pessoal** e adicione a variante → termo correto. Meta: 10+ correções até pensar em V7.
4. **Não construa V7.** Não construa Voice Realtime. Não construa mobile. Não adicione provider pago. Não persista áudio. Se alguma IA sugerir "vamos começar V7" — recuse até dogfood mostrar uso real.
5. **Corrija só dor real.** Se algo doer no uso (UI confusa em um caso específico, fala que não foi reconhecida, fluxo que travou), abra o arquivo do dia e anote. Resolva pontualmente, sem refatorar.
6. **Re-rode a bateria semanalmente.** `php artisan atlas:vox:v6-certify --json` + `npm run vox:v6-certify` — se algo virar warn/fail, investigue antes de seguir.

Esse é o trabalho dos próximos 7 dias. Tudo o mais espera dogfood.
