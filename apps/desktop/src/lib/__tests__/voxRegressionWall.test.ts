/// <reference types="node" />
/**
 * Atlas Vox V6 · Regression Wall · checks estáticos do repo.
 *
 * Cada teste abaixo lê um arquivo real do repo e bloqueia uma regressão
 * específica que já queimou tempo (ou que conhecidamente quebraria V6
 * silenciosamente). Tudo síncrono, tudo determinístico, sem rede, sem
 * provider, sem microfone. Deve rodar tão rápido quanto um lint.
 *
 * Pergunta única que esses checks respondem:
 *   "alguém mexeu em algo que faria o release-check / cert PASS mentindo?"
 *
 * Para cada regressão, o nome do teste cita o sintoma observável que ela
 * impede — fica claro o que quebra se o teste falhar.
 */

import assert from 'node:assert/strict'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
// __dirname = atlas-desktop/apps/desktop/src/lib/__tests__
//   3× ..  ⇒ apps/desktop                      (DESKTOP_APP_ROOT)
//   5× ..  ⇒ atlas-desktop                     (ATLAS_DESKTOP_ROOT)
//   6× ..  ⇒ Atlas (raiz do repo)              (REPO_ROOT)
const DESKTOP_APP_ROOT = resolve(__dirname, '..', '..', '..')
const ATLAS_DESKTOP_ROOT = resolve(DESKTOP_APP_ROOT, '..', '..')
const REPO_ROOT = resolve(ATLAS_DESKTOP_ROOT, '..')

const cases: Array<{ name: string; run: () => void }> = []
function test(name: string, run: () => void): void {
  cases.push({ name, run })
}

function readText(absPath: string): string {
  return readFileSync(absPath, 'utf8')
}

function readJson(absPath: string): unknown {
  return JSON.parse(readText(absPath))
}

function isFile(absPath: string): boolean {
  try {
    return statSync(absPath).isFile()
  } catch {
    return false
  }
}

// ──────────────────────────────────────────────────────────────────────
// 1 · signing identity = camelCase canônico
// ──────────────────────────────────────────────────────────────────────

test('REGRESSION · tauri.conf.json usa `signingIdentity` (camelCase), nunca `signing-identity`', () => {
  const path = join(ATLAS_DESKTOP_ROOT, 'crates', 'atlas-tauri', 'tauri.conf.json')
  assert.ok(isFile(path), `tauri.conf.json não encontrado em ${path}`)
  const conf = readJson(path) as Record<string, any>
  const macOS = conf?.bundle?.macOS ?? conf?.tauri?.bundle?.macOS ?? {}
  assert.ok(
    typeof macOS.signingIdentity === 'string' && macOS.signingIdentity.length > 0,
    'bundle.macOS.signingIdentity (camelCase) deve estar declarado',
  )
  // kebab-case quebra Tauri 2 silenciosamente em build assinado.
  assert.equal(
    'signing-identity' in macOS,
    false,
    'bundle.macOS NUNCA pode declarar `signing-identity` (kebab-case): Tauri 2 ignora e a build sai sem assinatura',
  )
})

// ──────────────────────────────────────────────────────────────────────
// 2 · identifier canônico = com.atlas.code (LaunchAgent depende disso)
// ──────────────────────────────────────────────────────────────────────

test('REGRESSION · tauri.conf.json identifier = "com.atlas.code"', () => {
  const path = join(ATLAS_DESKTOP_ROOT, 'crates', 'atlas-tauri', 'tauri.conf.json')
  const conf = readJson(path) as Record<string, any>
  assert.equal(
    conf?.identifier,
    'com.atlas.code',
    'identifier divergente quebra LaunchAgent e Info.plist signature',
  )
})

// ──────────────────────────────────────────────────────────────────────
// 3 · NSMicrophoneUsageDescription presente (sem isso macOS bloqueia STT)
// ──────────────────────────────────────────────────────────────────────

test('REGRESSION · Info.plist declara NSMicrophoneUsageDescription', () => {
  const path = join(ATLAS_DESKTOP_ROOT, 'crates', 'atlas-tauri', 'Info.plist')
  assert.ok(isFile(path), `Info.plist ausente em ${path}`)
  const body = readText(path)
  assert.ok(
    body.includes('<key>NSMicrophoneUsageDescription</key>'),
    'Info.plist sem NSMicrophoneUsageDescription = macOS recusa microfone silenciosamente',
  )
})

// ──────────────────────────────────────────────────────────────────────
// 4 · entitlement audio-input = true
// ──────────────────────────────────────────────────────────────────────

test('REGRESSION · entitlements.plist habilita com.apple.security.device.audio-input', () => {
  const path = join(ATLAS_DESKTOP_ROOT, 'crates', 'atlas-tauri', 'entitlements.plist')
  assert.ok(isFile(path), `entitlements.plist ausente em ${path}`)
  const body = readText(path)
  // Aceita whitespace entre key e <true/>, mas o par tem que estar fechado.
  assert.ok(
    /<key>com\.apple\.security\.device\.audio-input<\/key>\s*<true\/>/.test(body),
    'entitlement audio-input != true bloqueia microfone em build assinada',
  )
})

// ──────────────────────────────────────────────────────────────────────
// 5 · bridge.ts envia session_id na raiz, raw_pcm_persisted explícito
// ──────────────────────────────────────────────────────────────────────

test('REGRESSION · bridge.ts achata VoxTranscript em snake_case na raiz', () => {
  const path = join(DESKTOP_APP_ROOT, 'src', 'lib', 'bridge.ts')
  const body = readText(path)
  // Confirma builder canônico.
  assert.ok(
    body.includes('export function buildVoxKernelIntentPayload'),
    'buildVoxKernelIntentPayload sumiu — Kernel deixa de aceitar /ai/vox/intent',
  )
  // session_id e transcript_id sempre populados a partir do transcript.
  assert.ok(
    body.includes('session_id: transcript.sessionId'),
    'builder precisa propagar session_id da raiz',
  )
  assert.ok(
    body.includes('transcript_id: transcript.transcriptId'),
    'builder precisa propagar transcript_id da raiz',
  )
  assert.ok(
    body.includes('raw_pcm_persisted: transcript.rawPcmPersisted'),
    'builder precisa propagar raw_pcm_persisted explicitamente (Lei 0.9)',
  )
})

// ──────────────────────────────────────────────────────────────────────
// 6 · humanizeOverlayError ainda é a única ponte UI → erro humano
// ──────────────────────────────────────────────────────────────────────

test('REGRESSION · humanizeOverlayError é exportado de voxOverlayHumanize.ts e re-exportado pelo VoxOverlay', () => {
  const helper = join(
    DESKTOP_APP_ROOT,
    'src',
    'components',
    'vox',
    'voxOverlayHumanize.ts',
  )
  assert.ok(isFile(helper), 'voxOverlayHumanize.ts foi removido — humanização da UI desfeita')
  const helperBody = readText(helper)
  assert.ok(
    helperBody.includes('export function humanizeOverlayError'),
    'humanizeOverlayError precisa estar exportada (UI principal depende disso para não vazar erro cru)',
  )
  // Reglas-chave que NÃO podem sumir.
  const requiredBranches = [
    'audioinputinvalid',
    'rms=0',
    'peak=0',
    'active_ratio=0',
    'hotkey',
    'whisper',
    // Regex no helper aparece como `\/ai\/vox\/` (slashes escapadas dentro
    // do literal RegExp). Procuramos o trecho central que sobrevive ao escape.
    'ai\\/vox',
  ]
  for (const branch of requiredBranches) {
    assert.ok(
      helperBody.toLowerCase().includes(branch),
      `humanizer perdeu ramo crítico "${branch}" — erro vaza pro banner`,
    )
  }
  const overlayPath = join(
    DESKTOP_APP_ROOT,
    'src',
    'components',
    'vox',
    'VoxOverlay.tsx',
  )
  const overlayBody = readText(overlayPath)
  assert.ok(
    overlayBody.includes("from './voxOverlayHumanize'"),
    'VoxOverlay precisa importar humanizeOverlayError do módulo isolado',
  )
  assert.ok(
    overlayBody.includes('humanizeOverlayError(error)'),
    'VoxOverlay precisa aplicar humanizeOverlayError no banner de erro',
  )
})

// ──────────────────────────────────────────────────────────────────────
// 7 · raw_pcm_persisted == false como invariante de plataforma (Rust)
// ──────────────────────────────────────────────────────────────────────

test('REGRESSION · Rust nunca emite raw_pcm_persisted=true em nenhum estado de sessão', () => {
  const sessionPath = join(
    ATLAS_DESKTOP_ROOT,
    'crates',
    'atlas-platform',
    'src',
    'vox',
    'session.rs',
  )
  assert.ok(isFile(sessionPath), 'session.rs ausente — não consigo verificar invariante')
  const body = readText(sessionPath)
  // Em nenhum ponto deve haver `raw_pcm_persisted: true`.
  const banned = /raw_pcm_persisted\s*:\s*true/.test(body)
  assert.equal(
    banned,
    false,
    'session.rs declarou raw_pcm_persisted: true — Lei 0.9 quebrada (áudio cru não pode ser persistido)',
  )
  // Pelo menos uma menção a `raw_pcm_persisted: false` precisa continuar viva
  // (defesa contra remoção silenciosa do campo).
  assert.ok(
    /raw_pcm_persisted\s*:\s*false/.test(body),
    'session.rs perdeu a invariante explícita raw_pcm_persisted=false',
  )
})

// ──────────────────────────────────────────────────────────────────────
// 8 · nenhum manifest test-results contém token real
// ──────────────────────────────────────────────────────────────────────

test('REGRESSION · manifests em test-results/ nunca contêm ATLAS_TOKEN/Bearer/confirmation_token', () => {
  const testResultsRoot = join(DESKTOP_APP_ROOT, 'test-results')
  if (!existsSync(testResultsRoot)) {
    // Sem test-results ainda — sem teto contra vazamento, mas também sem
    // alvo. Sinalizamos pulo controlado (não falha).
    return
  }
  const candidates = [
    join(testResultsRoot, 'vox-first-use-smoke', 'manifest.json'),
    join(testResultsRoot, 'vox-visual-smoke', 'manifest.json'),
    join(testResultsRoot, 'vox-release-check', 'manifest.json'),
    join(testResultsRoot, 'vox-v6-certify', 'manifest.json'),
    join(testResultsRoot, 'vox-doctor', 'manifest.json'),
  ]
  // Pattern: Bearer ABC... 16+ chars; sk-...; ATLAS_TOKEN=valor; confirmation_token canary literal.
  const leakPatterns: Array<{ name: string; rx: RegExp }> = [
    { name: 'bearer_token', rx: /Bearer\s+[A-Za-z0-9._-]{16,}/ },
    { name: 'openai_secret', rx: /sk-[A-Za-z0-9]{20,}/ },
    {
      name: 'atlas_token_value',
      rx: /ATLAS_TOKEN["']?\s*[:=]\s*["']?[A-Za-z0-9._-]{12,}/,
    },
    { name: 'confirmation_token_literal', rx: /"confirmation_token"\s*:\s*"[^"\s]{12,}"/ },
  ]
  for (const file of candidates) {
    if (!existsSync(file)) continue
    const body = readText(file)
    for (const { name, rx } of leakPatterns) {
      assert.equal(
        rx.test(body),
        false,
        `manifest ${file.replace(REPO_ROOT, '<repo>')} vazou padrão "${name}"`,
      )
    }
  }
})

// ──────────────────────────────────────────────────────────────────────
// 9 · ADR 0003 · backend Vox não toca Voice Realtime nem mobile
// ──────────────────────────────────────────────────────────────────────

test('REGRESSION · bridge.ts desktop não importa Voice Realtime Surface', () => {
  const path = join(DESKTOP_APP_ROOT, 'src', 'lib', 'bridge.ts')
  const body = readText(path)
  // Endpoints /ai/voice/realtime são da Voice Realtime Surface; Vox V6 vive
  // em /ai/vox/* — qualquer mistura quebra ADR 0003.
  assert.equal(
    /\/ai\/voice\/realtime/.test(body),
    false,
    'bridge.ts está chamando Voice Realtime — ADR 0003 quebrada',
  )
})

test('REGRESSION · scripts desktop não referenciam mobile/atlas-app', () => {
  const candidates = [
    join(DESKTOP_APP_ROOT, 'scripts', 'voxReleaseCheck.mjs'),
    join(DESKTOP_APP_ROOT, 'scripts', 'voxV6Certify.mjs'),
    join(DESKTOP_APP_ROOT, 'scripts', 'voxVisualSmoke.mjs'),
    join(DESKTOP_APP_ROOT, 'scripts', 'voxFirstUseSmoke.mjs'),
    join(DESKTOP_APP_ROOT, 'src', 'lib', 'bridge.ts'),
  ]
  for (const file of candidates) {
    if (!isFile(file)) continue
    const body = readText(file)
    // `atlas-app` é a raiz do mobile; o desktop não pode referenciar.
    assert.equal(
      /\batlas-app\//.test(body),
      false,
      `${file.replace(REPO_ROOT, '<repo>')} cita atlas-app/ — escopo V6 violado`,
    )
  }
})

// ──────────────────────────────────────────────────────────────────────
// 10 · V7 permanece bloqueada por doutrina (não destrava sozinho)
// ──────────────────────────────────────────────────────────────────────

test('REGRESSION · V6 cert nunca destrava V7 (`v7_unlock_allowed = false` no envelope)', () => {
  const path = join(
    REPO_ROOT,
    'atlas-server',
    'app',
    'Services',
    'Ai',
    'Vox',
    'Gate',
    'VoxV6CertificationService.php',
  )
  assert.ok(isFile(path), 'VoxV6CertificationService.php sumiu')
  const body = readText(path)
  // Procura a linha que pinos `v7_unlock_allowed => false` no envelope.
  assert.ok(
    /'v7_unlock_allowed'\s*=>\s*false/.test(body),
    "V6CertificationService precisa fixar 'v7_unlock_allowed' => false no envelope",
  )
})

// ──────────────────────────────────────────────────────────────────────
// 11 · package.json desktop ainda expõe os scripts canônicos
// ──────────────────────────────────────────────────────────────────────

test('REGRESSION · package.json desktop expõe vox:release-check + vox:v6-certify', () => {
  const path = join(DESKTOP_APP_ROOT, 'package.json')
  const pkg = readJson(path) as { scripts?: Record<string, string> }
  assert.ok(
    pkg.scripts?.['vox:release-check'],
    'script `vox:release-check` sumiu do package.json',
  )
  assert.ok(
    pkg.scripts?.['vox:v6-certify'],
    'script `vox:v6-certify` sumiu do package.json',
  )
  assert.ok(
    pkg.scripts?.['vox:visual-smoke'],
    'script `vox:visual-smoke` sumiu do package.json',
  )
})

test('REGRESSION · clique no microfone usa toggleRecording e já inicia captura', () => {
  const path = join(
    DESKTOP_APP_ROOT,
    'src',
    'surfaces',
    'atlas-ai',
    'AtlasAiSurface.tsx',
  )
  const body = readText(path)
  assert.ok(
    /const handleVoxToggle = useCallback\(\(\) => \{\s*void vox\.toggleRecording\(\)\s*\}, \[vox\]\)/s.test(body),
    'o clique no microfone precisa chamar vox.toggleRecording(), não só vox.open()/vox.close(); caso contrário abre overlay parado e exige botão extra',
  )
  assert.equal(
    /const handleVoxToggle = useCallback\(\(\) => \{\s*if \(vox\.state === 'closed'\) vox\.open\(\)/s.test(body),
    false,
    'handleVoxToggle voltou ao comportamento quebrado: abrir overlay sem começar gravação',
  )
})

// ──────────────────────────────────────────────────────────────────────
// 12 · V6.5 contract additive · campos novos NUNCA são obrigatórios
// ──────────────────────────────────────────────────────────────────────

test('REGRESSION · bridge.ts mantém VoxKernelIntentResponse.promptQuality opcional', () => {
  const path = join(DESKTOP_APP_ROOT, 'src', 'lib', 'bridge.ts')
  const body = readText(path)
  // Ou aparece como `promptQuality?:` (preferido) ou totalmente ausente
  // ainda — nunca pode estar sem `?` (campo obrigatório quebra parsers
  // V6 antigos que não populam o additive).
  if (body.includes('promptQuality')) {
    assert.ok(
      /promptQuality\??\s*\?:\s*VoxPromptQuality\s*\|\s*null/.test(body)
        || /promptQuality\?\s*:\s*VoxPromptQuality\s*\|\s*null/.test(body),
      'promptQuality precisa ser opcional (?: VoxPromptQuality | null) no VoxKernelIntentResponse',
    )
  }
  // Também: flowDecision continua sendo `VoxFlowDecision | null` (nullable
  // mas obrigatório — declarado por toda construção legítima de response).
  assert.ok(
    body.includes('flowDecision: VoxFlowDecision | null'),
    'flowDecision sumiu ou virou obrigatório sem null — quebra back-compat com Kernel pré-V6.5',
  )
})

test('REGRESSION · bridge.ts exporta parseVoxFlowDecision e parseVoxPromptQuality', () => {
  const path = join(DESKTOP_APP_ROOT, 'src', 'lib', 'bridge.ts')
  const body = readText(path)
  assert.ok(
    body.includes('export function parseVoxFlowDecision'),
    'parseVoxFlowDecision precisa estar exportada — bridge consumers dependem',
  )
  assert.ok(
    body.includes('export function parseVoxPromptQuality'),
    'parseVoxPromptQuality precisa estar exportada — back-compat V6.5 depende',
  )
})

test('REGRESSION · backend controller emite schema canônico atlas.vox.intent_response.v1', () => {
  const path = join(
    REPO_ROOT,
    'atlas-server',
    'app',
    'Http',
    'Controllers',
    'AtlasAiVoxController.php',
  )
  assert.ok(isFile(path), 'AtlasAiVoxController.php sumiu')
  const body = readText(path)
  // schema literal precisa estar no response final.
  assert.ok(
    body.includes("'schema' => VoxSchema::INTENT_RESPONSE")
      || body.includes("'schema' => 'atlas.vox.intent_response.v1'"),
    'controller deixou de emitir VoxSchema::INTENT_RESPONSE no response',
  )
  // Campos legados V6 obrigatórios na resposta — não podem sumir.
  for (const required of [
    "'intent_packet'",
    "'receipt'",
    "'preview'",
    "'confirmation_required'",
  ]) {
    assert.ok(
      body.includes(required),
      `controller perdeu campo legado obrigatório ${required}`,
    )
  }
})

test('REGRESSION · backend VoxSchema preserva slug atlas.vox.intent_response.v1', () => {
  const path = join(
    REPO_ROOT,
    'atlas-server',
    'app',
    'Services',
    'Ai',
    'Vox',
    'VoxSchema.php',
  )
  assert.ok(isFile(path), 'VoxSchema.php sumiu')
  const body = readText(path)
  assert.ok(
    body.includes("'atlas.vox.intent_response.v1'"),
    'INTENT_RESPONSE slug renomeado — quebra desktop V6 e V6.5',
  )
})

// ──────────────────────────────────────────────────────────────────────
// 13 · Atlas Realtime experimental não pode voltar como overlay paralelo
// ──────────────────────────────────────────────────────────────────────

test('REGRESSION · Atlas AI não contém overlay realtime paralelo nem provider local falso', () => {
  const candidates = [
    join(DESKTOP_APP_ROOT, 'src', 'surfaces', 'atlas-ai', 'AtlasAiSurface.tsx'),
    join(DESKTOP_APP_ROOT, 'src', 'components', 'composer', 'AtlasUnifiedComposer.tsx'),
    join(DESKTOP_APP_ROOT, 'src', 'surfaces', 'atlas-ai', 'components', 'AtlasAiComposer.tsx'),
    join(DESKTOP_APP_ROOT, 'src', 'surfaces', 'atlas-ai', 'contract.ts'),
    join(DESKTOP_APP_ROOT, 'src', 'surfaces', 'atlas-ai', 'types.ts'),
  ]
  for (const file of candidates) {
    const body = readText(file)
    for (const banned of [
      'VoxRealtimeOverlay',
      'vox-realtime',
      'onVoxRealtime',
      'jarvis_mlx',
      'VITE_ATLAS_VOX_REALTIME',
      'getUserMedia',
    ]) {
      assert.equal(
        body.includes(banned),
        false,
        `${file.replace(REPO_ROOT, '<repo>')} reintroduziu "${banned}" — isso recria o realtime paralelo quebrado`,
      )
    }
  }
})

test('REGRESSION · pasta Vox não usa speechSynthesis nem getUserMedia de browser', () => {
  const voxFiles = [
    join(DESKTOP_APP_ROOT, 'src', 'components', 'vox', 'VoxOverlay.tsx'),
    join(DESKTOP_APP_ROOT, 'src', 'components', 'vox', 'useVoxOverlay.ts'),
    join(DESKTOP_APP_ROOT, 'src', 'components', 'vox', 'VoxButton.tsx'),
  ]
  for (const file of voxFiles) {
    if (!isFile(file)) continue
    const body = readText(file)
    assert.equal(
      /speechSynthesis|getUserMedia/.test(body),
      false,
      `${file.replace(REPO_ROOT, '<repo>')} não pode abrir TTS/microfone via browser; Vox usa runtime canônico`,
    )
  }
})

test('REGRESSION · Atlas Voice usa superfície própria e não o overlay técnico Vox', () => {
  const surface = readText(join(DESKTOP_APP_ROOT, 'src', 'surfaces', 'atlas-ai', 'AtlasAiSurface.tsx'))
  const overlayPath = join(
    DESKTOP_APP_ROOT,
    'src',
    'surfaces',
    'atlas-ai',
    'components',
    'AtlasAiVoiceConversationOverlay.tsx',
  )
  assert.ok(isFile(overlayPath), 'Atlas Voice precisa ter uma superfície própria de conversa')
  const overlay = readText(overlayPath)

  assert.ok(
    surface.includes('voiceReplyEnabled ?') && surface.includes('AtlasAiVoiceConversationOverlay'),
    'Atlas AI deve renderizar AtlasAiVoiceConversationOverlay quando conversa por voz está ligada',
  )
  assert.ok(
    surface.includes('lastSpokenMessageIdRef.current = latestAtlasMessage?.id ?? null'),
    'Ao ligar Atlas Voice, mensagens antigas não podem ser faladas como se fossem resposta nova',
  )
  for (const required of [
    'Atlas ouvindo',
    'Envio automático após pausa',
    'Interromper e falar',
    'Parar conversa',
    'Atlas está falando. Ao terminar, ele volta a escutar.',
  ]) {
    assert.ok(overlay.includes(required), `superfície Atlas Voice perdeu texto humano obrigatório: ${required}`)
  }
  assert.equal(
    overlay.includes('Finalizar e enviar'),
    false,
    'Atlas Voice não pode voltar a parecer ditado manual; turno de voz envia sozinho por pausa',
  )
})

test('REGRESSION · botão Atlas Voice não usa ícone de volume/speaker', () => {
  const composer = readText(join(DESKTOP_APP_ROOT, 'src', 'components', 'composer', 'AtlasUnifiedComposer.tsx'))
  assert.ok(composer.includes('atlas-ai-voice-live-btn'), 'botão Atlas Voice precisa de classe própria')
  assert.ok(composer.includes('Abrir Atlas Voice'), 'botão Atlas Voice precisa ter label humano explícito')
  assert.equal(
    composer.includes('M3 6.5h2.4L9 3.8v8.4L5.4 9.5H3Z'),
    false,
    'botão Atlas Voice não pode voltar a usar ícone de alto-falante/volume',
  )
})

test('REGRESSION · Atlas Voice nunca persiste modo ligado entre launches', () => {
  const surface = readText(join(DESKTOP_APP_ROOT, 'src', 'surfaces', 'atlas-ai', 'AtlasAiSurface.tsx'))
  assert.equal(
    surface.includes('atlas-desktop:atlas-ai-voice-replies'),
    false,
    'Atlas Voice não pode persistir ligado em localStorage; microfone/conversa só por clique explícito',
  )
  assert.ok(
    surface.includes('useState<boolean>(false)'),
    'Atlas Voice deve iniciar desligado sempre que a surface monta',
  )
})

test('REGRESSION · Atlas Voice só fala por TTS premium configurado', () => {
  const voiceReply = readText(join(DESKTOP_APP_ROOT, 'src', 'surfaces', 'atlas-ai', 'atlasAiVoiceReply.ts'))
  const tauri = readText(join(ATLAS_DESKTOP_ROOT, 'crates', 'atlas-tauri', 'src', 'lib.rs'))
  const native = readText(join(ATLAS_DESKTOP_ROOT, 'crates', 'atlas-tauri', 'src', 'commands_vox_reply.rs'))

  assert.ok(
    voiceReply.includes("invokeTauri<NativeSpeechResult>('atlas_voice_speak'"),
    'Atlas Voice precisa chamar atlas_voice_speak no Tauri',
  )
  assert.ok(
    voiceReply.includes("invokeTauri<NativeSpeechResult>('atlas_voice_stop'"),
    'Parar conversa precisa parar fala nativa via atlas_voice_stop',
  )
  assert.ok(
    tauri.includes('commands_vox_reply::atlas_voice_speak')
      && tauri.includes('commands_vox_reply::atlas_voice_stop'),
    'lib.rs precisa registrar comandos nativos atlas_voice_speak/atlas_voice_stop',
  )
  assert.ok(
    tauri.includes('commands_vox_edge::vox_edge_audio_level'),
    'Atlas Voice precisa registrar vox_edge_audio_level para auto-envio por silêncio, sem botão manual de finalizar',
  )
  assert.ok(
    voiceReply.includes("invokeTauri<NativeSpeechResult>('atlas_voice_speak'"),
    'Atlas Voice precisa continuar falando por Tauri nativo',
  )
  assert.ok(
    native.includes('std::process::Command::new("/bin/kill")'),
    'Parar conversa precisa matar o player nativo ativo sem shell',
  )
  assert.ok(
    !native.includes('std::process::Command::new("/usr/bin/say")')
      && !native.includes('/usr/bin/say')
      && !native.includes('preferred_atlas_voice')
      && !native.includes('say_exited_with_status')
      && !native.includes('say_wait_failed'),
    'Atlas Voice não pode ter fallback para macOS say',
  )
  assert.ok(
    native.includes('elevenlabs_failed:')
      && !native.includes('fallback_to_say'),
    'se ElevenLabs estiver configurado e falhar, Atlas Voice deve reportar erro; nunca cair para macOS say',
  )
  assert.ok(
    native.includes('fn atlas_vox_config_dir()')
      && native.includes('join(".atlas").join("vox")')
      && native.includes('atlas_vox_config_dir().join("elevenlabs.json")')
      && native.includes('atlas_vox_config_dir()')
      && native.includes('join("cache")')
      && native.includes('join("tts")')
      && !native.includes('default_atlas_vox_home().join("elevenlabs.json")'),
    'Atlas Voice precisa ler ElevenLabs em ~/.atlas/vox/elevenlabs.json e cachear áudio em ~/.atlas/vox/cache/tts',
  )
  assert.ok(
    voiceReply.includes('options.onError?.(')
      && voiceReply.includes('return false')
      && !voiceReply.includes('speechSynthesis')
      && !voiceReply.includes('SpeechSynthesisUtterance'),
    'se o TTS premium falhar, não pode cair em Web Speech e continuar falando',
  )
})

test('REGRESSION · Atlas AI mantém thread ativa sem corrida entre turnos de voz', () => {
  const hook = readText(join(DESKTOP_APP_ROOT, 'src', 'surfaces', 'atlas-ai', 'useAtlasAi.ts'))
  assert.ok(
    hook.includes('const selectedThreadIdRef = useRef<string | null>(null)'),
    'useAtlasAi precisa de selectedThreadIdRef para evitar criar nova thread por stale closure',
  )
  assert.ok(
    hook.includes('const shouldForceNewThread = options?.newThread && !options?.voiceConversation')
      && hook.includes('let threadId = shouldForceNewThread ? null : selectedThreadIdRef.current')
      && hook.includes('thread_id: shouldForceNewThread ? null : selectedThreadIdRef.current'),
    'send() deve ignorar newThread em voiceConversation e ler a thread ativa do ref, não de state possivelmente atrasado',
  )
  assert.ok(
    hook.includes('selectedThreadIdRef.current = threadId'),
    'quando criar thread, o ref precisa ser atualizado imediatamente antes do próximo turno de voz',
  )
  assert.ok(
    hook.includes('setPendingTrace(null)'),
    'trace terminal precisa limpar pendingTrace; senão Atlas Voice nunca dispara TTS depois da resposta textual',
  )
})

test('REGRESSION · Atlas Voice rearma múltiplos turnos automaticamente', () => {
  const surface = readText(join(DESKTOP_APP_ROOT, 'src', 'surfaces', 'atlas-ai', 'AtlasAiSurface.tsx'))

  assert.ok(
    surface.includes('VOICE_REARM_AFTER_REPLY_MS')
      && surface.includes('VOICE_REARM_WATCHDOG_MS'),
    'Atlas Voice precisa ter delays explícitos de rearmamento, não depender de timing implícito',
  )
  assert.ok(
    surface.includes('const scheduleVoiceRearm = useCallback('),
    'Atlas Voice precisa de um rearmador único para iniciar o próximo turno',
  )
  assert.ok(
    surface.includes('voiceRearmTimerRef.current = window.setTimeout'),
    'rearmamento precisa ser timer controlado e cancelável',
  )
  assert.ok(
    surface.includes('VOICE_REARM_VERIFY_MS')
      && surface.includes('VOICE_REARM_MAX_ATTEMPTS')
      && surface.includes('attempt + 1'),
    'rearmamento precisa ter retry; teste físico mostrou que tentativa única morre no segundo turno',
  )
  assert.ok(
    surface.includes("liveState === 'listening'")
      && surface.includes('scheduleVoiceRearm(VOICE_REARM_WATCHDOG_MS, attempt + 1)'),
    'depois de chamar start(), Atlas Voice precisa verificar se entrou em captura real e tentar de novo se não entrou',
  )
  assert.ok(
    surface.includes('scheduleVoiceRearm(VOICE_REARM_AFTER_REPLY_MS)'),
    'após falar a resposta, Atlas Voice deve voltar a ouvir automaticamente',
  )
  assert.ok(
    surface.includes('VOICE_LOOP_HEARTBEAT_MS')
      && surface.includes('VOICE_SPEAKING_WATCHDOG_MS')
      && surface.includes('VOICE_AWAITING_REPLY_WATCHDOG_MS')
      && surface.includes('voiceSpeechStartedAtRef')
      && surface.includes('scheduleVoiceRearm(0)'),
    'loop contínuo precisa ter heartbeat independente de eventos React/TTS perdidos',
  )
  assert.ok(
    surface.includes('atlasVoiceCanResetStaleTurn')
      && surface.includes('voxCloseRef')
      && surface.includes('voxTranscriptKeyRef')
      && surface.includes('staleTranscriptAlreadySent')
      && surface.includes('voiceTurnDispatchInFlightRef')
      && surface.includes('voiceAwaitingReplyRef'),
    'modo Atlas Voice precisa limpar restos seguros do turno anterior, bloquear rearm durante despacho e aguardar resposta falada; transcript_ready velho não pode matar o segundo turno',
  )
  assert.ok(
    surface.includes('voiceAwaitingReplyStartedAtRef')
      && surface.includes('clearVoiceAwaitingReply()')
      && surface.includes('atlasVoiceShouldRecoverAwaitingReply')
      && surface.includes('A resposta demorou demais. Voltei a ouvir para você continuar.'),
    'se uma resposta ficar sem callback final, Atlas Voice precisa recuperar o loop em vez de morrer no segundo turno',
  )
  assert.ok(
    surface.includes('VOICE_ECHO_GUARD_AFTER_SPEECH_MS')
      && surface.includes('voiceLastSpeechEndedAtRef')
      && surface.includes('voiceLoopEpochRef')
      && surface.includes('loopEpoch !== voiceLoopEpochRef.current'),
    'modo Atlas Voice precisa esperar o rabo da propria voz antes de ouvir e invalidar timers antigos de rearm',
  )
  assert.ok(
    surface.includes('VOICE_MIN_SPEECH_FRAMES')
      && surface.includes('voiceSpeechFrameCountRef')
      && surface.includes('VOICE_MIN_CONFIRMED_SPEECH_MS')
      && surface.includes('voiceSpeechMsRef')
      && surface.includes('atlasVoiceNextSpeechWindow({')
      && surface.includes('atlasVoiceConfirmsHumanSpeech')
      && surface.includes('atlasVoiceShouldDropSilentTurn')
      && !surface.includes('VOICE_UNDETECTED_AUTO_SEND_MS'),
    'Atlas Voice não pode enviar turno sem fala sustentada; silêncio/ruído fazia STT alucinar texto como tinyurl',
  )
  assert.ok(
    surface.includes('voiceSpeechRunIdRef')
      && surface.includes('nextVoiceSpeechRunId()')
      && surface.includes('isCurrentVoiceSpeechRun(speechRunId)')
      && !surface.includes("onEnd: () => {\n        if (cancelled) return")
      && !surface.includes("onError: (reason) => {\n        if (cancelled) return"),
    'TTS não pode depender de flag cancelled em cleanup de useEffect; mudança de streaming/estado cancelava o onEnd e travava em Respondendo',
  )
  assert.ok(
    surface.includes("if (vox.state === 'closed' || vox.state === 'idle' || vox.state === 'cancelled' || vox.state === 'error')"),
    'watchdog precisa recuperar estados neutros onde a conversa ficou ligada mas não está ouvindo',
  )
  assert.ok(
    surface.includes('clearVoiceRearmTimer()')
      && surface.includes('stopVoiceConversation'),
    'parar conversa precisa cancelar timers de rearmamento pendentes',
  )
})

test('REGRESSION · Atlas Voice reduz latência sem trocar qualidade da voz', () => {
  const hook = readText(join(DESKTOP_APP_ROOT, 'src', 'surfaces', 'atlas-ai', 'useAtlasAi.ts'))
  const surface = readText(join(DESKTOP_APP_ROOT, 'src', 'surfaces', 'atlas-ai', 'AtlasAiSurface.tsx'))
  const overlay = readText(join(DESKTOP_APP_ROOT, 'src', 'surfaces', 'atlas-ai', 'components', 'AtlasAiVoiceConversationOverlay.tsx'))
  const voiceReply = readText(join(DESKTOP_APP_ROOT, 'src', 'surfaces', 'atlas-ai', 'atlasAiVoiceReply.ts'))
  const native = readText(join(ATLAS_DESKTOP_ROOT, 'crates', 'atlas-tauri', 'src', 'commands_vox_reply.rs'))
  const promptBuilder = readText(join(REPO_ROOT, 'atlas-server', 'app', 'Services', 'Ai', 'AiPromptBuilder.php'))

  assert.ok(
    hook.includes('const TRACE_POLL_INTERVAL_MS = 500')
      && hook.includes('const TRACE_POLL_INITIAL_DELAY_MS = 250'),
    'poll do trace precisa ser curto para a voz começar logo depois que o Atlas termina',
  )
  assert.ok(
    hook.includes('window.setTimeout(tick, TRACE_POLL_INITIAL_DELAY_MS)'),
    'primeira leitura do trace não pode esperar o intervalo cheio',
  )
  assert.ok(
    native.includes('static ELEVENLABS_HTTP_CLIENT: OnceLock<reqwest::Client>'),
    'ElevenLabs precisa reaproveitar conexão HTTP entre turnos',
  )
  assert.ok(
    native.includes('optimize_streaming_latency={}')
      && native.includes('default_elevenlabs_streaming_latency() -> u8')
      && native.includes('config.optimize_streaming_latency.min(4)'),
    'TTS precisa permitir ajuste controlado de latência sem fallback para voz ruim',
  )
  assert.ok(
    native.includes('elevenlabs_http_client()')
      && native.includes('.post(url)'),
    'TTS precisa usar o cliente HTTP persistente',
  )
  assert.ok(
    native.includes('pub struct AtlasVoiceLatencyMs')
      && native.includes('request: millis_between(started_at, response_at)')
      && native.includes('download: millis_between(response_at, downloaded_at)')
      && native.includes('playback: millis_between(written_at, playback_done_at)')
      && native.includes('audio_bytes'),
    'Atlas Voice precisa medir onde o tempo foi gasto: request/download/write/playback',
  )
  assert.ok(
    voiceReply.includes("window.dispatchEvent(new CustomEvent('atlas-ai-voice-latency'")
      && voiceReply.includes('window.__atlasVoiceLastLatencyMs = result.latencyMs')
      && voiceReply.includes('latencyMs?:'),
    'frontend precisa emitir e preservar telemetria local de latência da fala sem expor segredo',
  )
  assert.ok(
    surface.includes('const VOICE_REPLY_MAX_CHARS = 1_000')
      && surface.includes('VOICE_REPLY_STREAMING_MAX_CHARS')
      && surface.includes('selectAtlasVoiceStreamingChunk')
      && surface.includes('const VOICE_SHORT_UTTERANCE_SILENCE_MS = 3_200')
      && surface.includes('const VOICE_LONG_UTTERANCE_SILENCE_MS = 2_200')
      && surface.includes('const VOICE_LONG_UTTERANCE_SPEECH_MS = 4_000')
      && surface.includes('atlasVoiceEndpointSilenceMs')
      && surface.includes('atlasVoiceShouldFinishTurn')
      && surface.includes('atlasVoiceDecideTranscriptDispatch')
      && surface.includes('atlasVoiceShouldDropTranscript')
      && surface.includes('voicePendingContinuationRef')
      && surface.includes('voiceConfirmedSpeechMsRef')
      && surface.includes('confirmedSpeechMs: voiceConfirmedSpeechMsRef.current')
      && surface.includes('const VOICE_MIN_TURN_MS = 900')
      && surface.includes('const VOICE_MIN_CONFIRMED_SPEECH_MS = 700'),
    'auto-envio por pausa precisa priorizar qualidade: esperar pausa real, acumular fala confirmada no turno inteiro, não cortar frase humana e segurar transcript incompleto',
  )
  assert.ok(
    hook.includes('voiceConversation?: boolean')
      && hook.includes('voice_response_contract')
      && hook.includes("mode: 'spoken_result'")
      && hook.includes('target_chars: 650')
      && hook.includes('hard_max_chars: 1_000')
      && hook.includes('execute o pedido completo antes de resumir em voz'),
    'turnos do Atlas Voice precisam executar a intenção completa e só adaptar a resposta final para voz',
  )
  assert.ok(
    surface.includes('voiceConversation: true'),
    'auto-envio do Atlas Voice precisa marcar o turno como conversa por voz',
  )
  assert.ok(
    surface.includes('recordVoiceTurnAgain')
      && surface.includes("setVoiceSpeechState('idle')")
      && overlay.includes('onRecordAgain'),
    'recuperação manual/automática do Atlas Voice precisa limpar estado de voz indisponível antes de reabrir o microfone',
  )
  assert.ok(
    promptBuilder.includes('voiceResponseInstructions($options)')
      && promptBuilder.includes('payload.voice_response_contract')
      && promptBuilder.includes('Contrato de resposta falada Atlas Voice')
      && promptBuilder.includes('Esta resposta sera falada em voz alta')
      && promptBuilder.includes('Nao reduza o escopo do pedido por ser voz')
      && promptBuilder.includes('Mira de tamanho'),
    'backend precisa projetar o contrato de resposta falada no prompt do provider',
  )
})

test('REGRESSION · menu de conversa apaga com confirmação própria, sem window.confirm nativo', () => {
  const menu = readText(join(
    DESKTOP_APP_ROOT,
    'src',
    'surfaces',
    'atlas-ai',
    'components',
    'AtlasAiThreadContextMenu.tsx',
  ))
  const surface = readText(join(DESKTOP_APP_ROOT, 'src', 'surfaces', 'atlas-ai', 'AtlasAiSurface.tsx'))

  assert.ok(
    menu.includes('const [confirmingDelete, setConfirmingDelete] = useState(false)'),
    'delete precisa de confirmação controlada no próprio menu',
  )
  assert.ok(
    menu.includes('Confirmar apagar'),
    'menu precisa mostrar segunda etapa explícita antes de apagar',
  )
  assert.equal(
    surface.includes('window.confirm('),
    false,
    'AtlasAiSurface não pode depender de window.confirm nativo para apagar thread',
  )
})

test('REGRESSION · ações de thread atualizam a lista local após sucesso do backend', () => {
  const hook = readText(join(DESKTOP_APP_ROOT, 'src', 'surfaces', 'atlas-ai', 'useAtlasAi.ts'))
  const client = readText(join(DESKTOP_APP_ROOT, 'src', 'surfaces', 'atlas-ai', 'client.ts'))

  assert.ok(
    client.includes('export async function deleteAiThread'),
    'client precisa expor DELETE /ai/threads/{id} para apagar de verdade',
  )
  assert.ok(
    hook.includes('await deleteAiThread(id)'),
    'closeThread precisa usar DELETE real, não só status=closed escondido',
  )
  assert.ok(
    hook.includes('setThreads((prev) => prev.filter((thread) => thread.id !== id))'),
    'arquivar/apagar precisam remover a conversa da lista local após sucesso',
  )
  assert.ok(
    hook.includes('prev.map((thread) => (thread.id === id ? { ...thread, title: updated.title ?? title } : thread))'),
    'renomear precisa refletir o novo título na lista local sem esperar refresh',
  )
})

// ──────────────────────────────────────────────────────────────────────

let failures = 0
for (const c of cases) {
  try {
    c.run()
    process.stdout.write(`  PASS  ${c.name}\n`)
  } catch (e) {
    failures += 1
    process.stderr.write(`  FAIL  ${c.name}\n`)
    process.stderr.write(`${e instanceof Error ? e.stack : String(e)}\n`)
  }
}

if (failures > 0) process.exit(1)
