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
