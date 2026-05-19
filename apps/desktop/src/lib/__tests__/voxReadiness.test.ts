/// <reference types="node" />
import assert from 'node:assert/strict'
import {
  adaptVoxKernelHealth,
  aggregate,
  type VoxKernelHealth,
  type VoxReadinessProbes,
} from '../voxReadiness'

/**
 * Wave 7.8 · readiness aggregator — focused pure-logic tests.
 *
 * The aggregator is deterministic over its `VoxReadinessProbes` input.
 * These tests pin the decision matrix (ready / partial / blocked /
 * unavailable) and the individual item statuses so a future refactor
 * can't silently flip a green check into a fake "pronto".
 */
const cases: Array<{ name: string; run: () => void }> = []
function test(name: string, run: () => void): void {
  cases.push({ name, run })
}

function healthyKernel(): VoxKernelHealth {
  return {
    schema: 'atlas.vox.health.v1',
    status: 'available',
    mode: 'dictation_polish_intent_and_governed_execute',
    voiceRealtimeStatus: 'paused_until_v6',
    supports: {
      dictation: true,
      promptPolish: true,
      intentCompile: true,
      governedExecute: true,
    },
    executors: {
      codex_cli: { available: true, reason: null },
      claude_cli: { available: true, reason: null },
    },
    kernelGuarantees: { rawAudioAccepted: false },
  }
}

function fullyHealthyProbes(): VoxReadinessProbes {
  return {
    bridgeMode: 'tauri',
    edge: {
      available: true,
      captureAvailable: true,
      hotkeyAvailable: true,
      activeSessionId: null,
      lastError: null,
      permissions: {
        microphone: 'granted',
        accessibility: 'granted',
        inputMonitoring: 'granted',
      },
      eclipseActive: false,
      defaultHotkey: 'Option+Space',
      pendingCapabilities: [],
    },
    stt: {
      modelId: 'whisper.cpp@large-v3',
      modelFilename: 'ggml-large-v3.bin',
      modelsDir: '/Users/x/.atlas/vox/models',
      modelPath: '/Users/x/.atlas/vox/models/ggml-large-v3.bin',
      modelFound: true,
      engineAvailable: true,
      nextAction: null,
    },
    hotkey: {
      available: true,
      platformSupported: true,
      defaultHotkey: 'Option+Space',
      secondaryHotkey: 'Cmd+Shift+Space',
      registeredHotkeys: ['Option+Space', 'Cmd+Shift+Space'],
      lastError: null,
      pendingCapabilities: [],
      escapeDoubleTapWindowMs: 500,
    },
    hotkeyProbeFailed: false,
    kernel: { ok: true, health: healthyKernel() },
  }
}

test('all-green probes yields aggregate status=ready and zero warnings/blocked', () => {
  const summary = aggregate(fullyHealthyProbes())
  assert.equal(summary.status, 'ready')
  assert.equal(summary.blocked, 0)
  assert.equal(summary.warnings, 0)
  assert.ok(summary.passed >= 10, `expected most items passed, got ${summary.passed}`)
})

test('missing Whisper model produces a blocked item with a concrete next action', () => {
  const probes = fullyHealthyProbes()
  probes.stt = {
    ...probes.stt!,
    modelFound: false,
    engineAvailable: false,
    nextAction: { code: 'model_missing', message: 'Baixe ggml-large-v3.bin em ~/.atlas/vox/models/' },
  }
  const summary = aggregate(probes)
  const model = summary.items.find((i) => i.id === 'whisper_model')!
  assert.equal(model.status, 'blocked')
  assert.match(model.detail, /ggml-large-v3/)
  assert.ok(model.nextAction && model.nextAction.length > 0)
  assert.equal(summary.status, 'blocked', 'any hard-blocked item must escalate aggregate')
})

test('hotkey not registered shows warning but does not block aggregate', () => {
  const probes = fullyHealthyProbes()
  probes.hotkey = {
    ...probes.hotkey!,
    available: false,
    registeredHotkeys: [],
    pendingCapabilities: ['global_hotkey_pending_permissions_or_platform_wiring'],
    lastError: 'register failed: Accessibility not granted',
  }
  if (probes.edge) probes.edge.hotkeyAvailable = false
  const summary = aggregate(probes)
  const hotkey = summary.items.find((i) => i.id === 'hotkey')!
  assert.equal(hotkey.status, 'warning')
  assert.ok(hotkey.nextAction !== null)
  assert.equal(summary.status, 'partial')
})

test('kernel offline marks /ai/vox/health as unavailable, not green', () => {
  const probes = fullyHealthyProbes()
  probes.kernel = {
    ok: false,
    reason: 'kernel_url_missing',
    detail: 'VITE_ATLAS_SERVER_URL não configurado.',
  }
  const summary = aggregate(probes)
  const kernelUrl = summary.items.find((i) => i.id === 'kernel_url')!
  assert.equal(kernelUrl.status, 'blocked')
  const health = summary.items.find((i) => i.id === 'kernel_health')!
  assert.equal(health.status, 'unavailable')
  // Aggregate is blocked because kernel_url_missing is hard.
  assert.equal(summary.status, 'blocked')
})

test('raw audio accepted=true triggers the safety blocker item', () => {
  const probes = fullyHealthyProbes()
  if (probes.kernel.ok) {
    probes.kernel.health.kernelGuarantees.rawAudioAccepted = true
  }
  const summary = aggregate(probes)
  const guard = summary.items.find((i) => i.id === 'raw_audio_invariant')!
  assert.equal(guard.status, 'blocked')
  assert.match(guard.detail, /raw_audio/)
  assert.equal(summary.status, 'blocked')
})

test('denied macOS permissions block the aggregate via permissions item', () => {
  const probes = fullyHealthyProbes()
  probes.edge = {
    ...probes.edge!,
    permissions: {
      microphone: 'denied',
      accessibility: 'granted',
      inputMonitoring: 'granted',
    },
  }
  const summary = aggregate(probes)
  const perms = summary.items.find((i) => i.id === 'permissions')!
  assert.equal(perms.status, 'blocked')
  assert.equal(summary.status, 'blocked')
})

test('browser mode (non-Tauri) reports tauri_runtime as warning and most items as unavailable', () => {
  const probes: VoxReadinessProbes = {
    bridgeMode: 'http',
    edge: null,
    stt: null,
    hotkey: null,
    hotkeyProbeFailed: false,
    kernel: { ok: true, health: healthyKernel() },
  }
  const summary = aggregate(probes)
  const runtime = summary.items.find((i) => i.id === 'tauri_runtime')!
  assert.equal(runtime.status, 'warning')
  const mic = summary.items.find((i) => i.id === 'microphone')!
  assert.equal(mic.status, 'unavailable')
  // Aggregate is partial (no blocks, just warnings + lots of unavailables).
  assert.notEqual(summary.status, 'ready')
  assert.notEqual(summary.status, 'unavailable')
})

test('offline mode (no Tauri, no Kernel URL) produces aggregate=blocked', () => {
  const probes: VoxReadinessProbes = {
    bridgeMode: 'offline',
    edge: null,
    stt: null,
    hotkey: null,
    hotkeyProbeFailed: false,
    kernel: { ok: false, reason: 'kernel_url_missing', detail: null },
  }
  const summary = aggregate(probes)
  assert.equal(summary.status, 'blocked')
})

test('adaptVoxKernelHealth tolerates snake_case PHP payload and missing executors', () => {
  const raw = {
    schema: 'atlas.vox.health.v1',
    status: 'available',
    mode: 'dictation_polish_intent_and_governed_execute',
    voice_realtime_status: 'paused_until_v6',
    supports: {
      dictation: true,
      prompt_polish: true,
      intent_compile: true,
      governed_execute: false,
    },
    executors: {
      codex_cli: { available: false, reason: 'codex_cli_unavailable' },
    },
    kernel_guarantees: { raw_audio_accepted: false },
  }
  const adapted = adaptVoxKernelHealth(raw)!
  assert.ok(adapted)
  assert.equal(adapted.supports.promptPolish, true)
  assert.equal(adapted.supports.governedExecute, false)
  assert.equal(adapted.voiceRealtimeStatus, 'paused_until_v6')
  assert.equal(adapted.executors.codex_cli!.available, false)
  assert.equal(adapted.kernelGuarantees.rawAudioAccepted, false)
})

test('adaptVoxKernelHealth defaults to false rather than assuming green', () => {
  const adapted = adaptVoxKernelHealth({ schema: 'x', status: 'available' })!
  assert.equal(adapted.supports.dictation, false)
  assert.equal(adapted.supports.governedExecute, false)
  assert.equal(adapted.kernelGuarantees.rawAudioAccepted, false)
})

let failed = 0
for (const c of cases) {
  try {
    c.run()
    console.log(`ok  · ${c.name}`)
  } catch (err) {
    failed += 1
    console.error(`FAIL · ${c.name}`)
    console.error(err)
  }
}
if (failed > 0) {
  console.error(`\n${failed} of ${cases.length} tests failed.`)
  process.exit(1)
}
console.log(`\nall ${cases.length} tests passed.`)
