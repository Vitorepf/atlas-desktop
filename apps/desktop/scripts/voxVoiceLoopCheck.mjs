#!/usr/bin/env node
/**
 * Atlas Voice · loop check.
 *
 * Verifica as garantias automatizáveis do ciclo:
 *   falar -> envio automático -> resposta por voz -> rearmar -> repetir.
 *
 * Limite honesto: este script não abre microfone nem prova áudio físico.
 * O teste físico de 3 turnos continua sendo a última evidência necessária.
 */

import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const appPath = '/Applications/Atlas Code.app'
const binPath = `${appPath}/Contents/MacOS/atlas-tauri`
const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const resultsDir = join(root, 'test-results', 'vox-voice-loop-check')
const manifestPath = join(resultsDir, 'manifest.json')
mkdirSync(resultsDir, { recursive: true })
const startedAt = Date.now()
const checks = []

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd ?? process.cwd(),
    encoding: 'utf8',
    stdio: options.stdio ?? 'pipe',
    env: { ...process.env, ...(options.env ?? {}) },
  })
}

function pass(label) {
  checks.push({ label, status: 'pass' })
  process.stdout.write(`✓ ${label}\n`)
}

function fail(label, detail = '') {
  checks.push({ label, status: 'fail', detail })
  process.stderr.write(`✗ ${label}${detail ? `\n  ${detail}` : ''}\n`)
  process.exitCode = 1
}

function checkCommand(label, command, args) {
  const result = run(command, args)
  if (result.status === 0) {
    pass(label)
    return
  }
  fail(label, (result.stderr || result.stdout || '').trim().slice(-1200))
}

process.stdout.write('Atlas Voice · loop check\n\n')

checkCommand('regressão cobre 3 turnos consecutivos', 'npm', [
  'run',
  'vox:regression-wall',
  '--workspace=@atlas/desktop',
])

if (!existsSync(appPath)) {
  fail('Atlas Code.app instalado', `${appPath} não existe`)
} else {
  pass('Atlas Code.app instalado')
}

if (!existsSync(binPath)) {
  fail('binário Tauri instalado', `${binPath} não existe`)
} else {
  pass('binário Tauri instalado')
}

if (existsSync(appPath)) {
  const codeSign = run('codesign', ['--verify', '--deep', '--strict', '--verbose=2', appPath])
  if (codeSign.status === 0) {
    pass('assinatura do app válida')
  } else {
    fail('assinatura do app válida', (codeSign.stderr || codeSign.stdout || '').trim())
  }
}

if (existsSync(binPath)) {
  const strings = execFileSync('strings', [binPath], { encoding: 'utf8' })
  const banned = /\/usr\/bin\/say|speechSynthesis|SpeechSynthesisUtterance|preferred_atlas_voice/i
  if (banned.test(strings)) {
    fail('sem fallback ruim de voz', 'binário contém referência a say/WebSpeech/fallback antigo')
  } else {
    pass('sem fallback ruim de voz')
  }
  if (strings.includes('elevenlabs')) {
    pass('ElevenLabs presente no runtime instalado')
  } else {
    fail('ElevenLabs presente no runtime instalado')
  }
}

process.stdout.write('\n')
if (process.exitCode) {
  process.stderr.write('Resultado: FAIL. Corrija os itens acima antes de testar fisicamente.\n')
} else {
  process.stdout.write('Resultado: PASS automatizado.\n')
  process.stdout.write('Pendente por definição: teste físico de 3 turnos com microfone e áudio reais.\n')
}

const status = process.exitCode ? 'fail' : 'pass'
writeFileSync(
  manifestPath,
  `${JSON.stringify({
    schema: 'atlas.voice.loop_check.v1',
    status,
    generated_at: new Date().toISOString(),
    duration_ms: Date.now() - startedAt,
    checks,
    installed_app: appPath,
    binary: binPath,
    automated_coverage: [
      'three_turn_regression',
      'deterministic_three_turn_loop_simulation',
      'natural_pause_endpointing_guard',
      'stale_transcript_cleanup_guard',
      'installed_app_presence',
      'codesign',
      'bad_voice_fallback_scan',
      'elevenlabs_runtime_presence',
    ],
    physical_validation_required: {
      required: true,
      reason: 'microphone_and_real_audio_loop_cannot_be_proven_by_static_or_headless_checks',
      checklist: [
        'turn_1_speak_wait_voice_reply',
        'turn_2_speak_after_voice_reply_without_clicking_or_reopening',
        'turn_3_speak_after_voice_reply_without_clicking_or_reopening',
        'natural_pause_inside_sentence_does_not_auto_send',
      ],
    },
  }, null, 2)}\n`,
)
process.stdout.write(`manifest: ${manifestPath}\n`)
