/// <reference types="node" />
import assert from 'node:assert/strict'
import {
  deriveItemActions,
  deriveUsageTiers,
  isReadyForFirstUse,
  type VoxReadinessItem,
  type VoxReadinessSummary,
  type VoxSetupCapabilities,
} from '../voxReadiness'

/**
 * Wave 7.9 · Setup Assistant — pure-logic tests.
 *
 * The assistant derives its actions and usage tiers from the same
 * readiness snapshot the panel renders. These tests pin the mapping so
 * a future refactor can't silently turn a blocker into a fake green or
 * promote a tier that isn't actually ready.
 */
const cases: Array<{ name: string; run: () => void }> = []
function test(name: string, run: () => void): void {
  cases.push({ name, run })
}

function item(
  id: string,
  status: VoxReadinessItem['status'],
  overrides: Partial<VoxReadinessItem> = {},
): VoxReadinessItem {
  return {
    id,
    label: overrides.label ?? id,
    status,
    detail: overrides.detail ?? '',
    nextAction: overrides.nextAction ?? null,
    ...overrides,
  }
}

function summary(items: VoxReadinessItem[]): VoxReadinessSummary {
  const counts = items.reduce(
    (acc, i) => {
      if (i.status === 'passed') acc.passed++
      else if (i.status === 'warning') acc.warnings++
      else if (i.status === 'blocked') acc.blocked++
      return acc
    },
    { passed: 0, warnings: 0, blocked: 0 },
  )
  const status: VoxReadinessSummary['status'] = counts.blocked
    ? 'blocked'
    : counts.warnings
      ? 'partial'
      : items.length
        ? 'ready'
        : 'unavailable'
  return {
    status,
    passed: counts.passed,
    warnings: counts.warnings,
    blocked: counts.blocked,
    total: items.length,
    items,
    generatedAt: '2026-05-20T00:00:00Z',
  }
}

const macCapabilities: VoxSetupCapabilities = {
  canOpenSystemSettings: true,
  canCopyToClipboard: true,
}

const browserCapabilities: VoxSetupCapabilities = {
  canOpenSystemSettings: false,
  canCopyToClipboard: false,
}

// ─── deriveItemActions ──────────────────────────────────────────────────

test('passed items produce zero actions', () => {
  const actions = deriveItemActions(item('microphone', 'passed'), macCapabilities)
  assert.equal(actions.length, 0)
})

test('checking items produce zero actions', () => {
  const actions = deriveItemActions(item('microphone', 'checking'), macCapabilities)
  assert.equal(actions.length, 0)
})

test('blocked microphone on macOS surfaces an open_system_settings action', () => {
  const actions = deriveItemActions(item('microphone', 'blocked'), macCapabilities)
  const openAction = actions.find((a) => a.kind === 'open_system_settings')
  assert.ok(openAction, 'expected an open_system_settings action')
  assert.equal(openAction!.target, 'microphone')
  // refresh button is always added at the end
  assert.equal(actions[actions.length - 1]!.kind, 'refresh')
})

test('blocked microphone in browser falls back to instruction-only', () => {
  const actions = deriveItemActions(item('microphone', 'blocked'), browserCapabilities)
  assert.ok(actions.every((a) => a.kind !== 'open_system_settings'))
  const instruction = actions.find((a) => a.kind === 'instruction')
  assert.ok(instruction)
  assert.ok(instruction!.detail.toLowerCase().includes('microfone'))
})

test('permissions item exposes three open_system_settings buttons on macOS', () => {
  const actions = deriveItemActions(item('permissions', 'blocked'), macCapabilities)
  const opens = actions.filter((a) => a.kind === 'open_system_settings')
  const targets = opens.map((a) => (a as { target: string }).target)
  assert.deepEqual(
    targets.sort(),
    ['accessibility', 'input_monitoring', 'microphone'],
  )
})

test('whisper_model warning yields a copy_text action with the canonical path', () => {
  const actions = deriveItemActions(
    item('whisper_model', 'blocked', {
      detail:
        'Coloque ggml-large-v3.bin em /Users/vitor/.atlas/vox/models/ggml-large-v3.bin',
    }),
    macCapabilities,
  )
  const copy = actions.find((a) => a.kind === 'copy_text')
  assert.ok(copy, 'expected a copy_text action')
  assert.match((copy as { text: string }).text, /ggml-large-v3\.bin$/)
})

test('whisper_model copy_text defaults to canonical path when detail is empty', () => {
  const actions = deriveItemActions(item('whisper_model', 'blocked'), macCapabilities)
  const copy = actions.find((a) => a.kind === 'copy_text')!
  assert.equal((copy as { text: string }).text, '~/.atlas/vox/models/ggml-large-v3.bin')
})

test('kernel_url blocker provides a copy_text env hint and an instruction', () => {
  const actions = deriveItemActions(item('kernel_url', 'blocked'), macCapabilities)
  const copy = actions.find((a) => a.kind === 'copy_text')!
  assert.ok((copy as { text: string }).text.includes('VITE_ATLAS_SERVER_URL'))
  assert.ok(actions.some((a) => a.kind === 'instruction'))
})

test('hotkey warning surfaces accessibility + input_monitoring quick-links', () => {
  const actions = deriveItemActions(item('hotkey', 'warning'), macCapabilities)
  const targets = actions
    .filter((a) => a.kind === 'open_system_settings')
    .map((a) => (a as { target: string }).target)
    .sort()
  assert.deepEqual(targets, ['accessibility', 'input_monitoring'])
})

test('action mapper never emits an arbitrary URL field', () => {
  const ids = [
    'microphone',
    'permissions',
    'hotkey',
    'whisper_model',
    'stt_engine',
    'kernel_url',
    'kernel_health',
    'governed_execute',
    'executor_codex_cli',
    'executor_claude_cli',
    'raw_audio_invariant',
    'tauri_runtime',
  ] as const
  for (const id of ids) {
    const actions = deriveItemActions(item(id, 'blocked'), macCapabilities)
    for (const a of actions) {
      if (a.kind === 'open_system_settings') {
        const target: string = a.target
        assert.ok(
          ['microphone', 'accessibility', 'input_monitoring'].includes(target),
          `open_system_settings.target must be in allowlist, got ${target}`,
        )
      }
      // No `url` field exists on any action variant — the open type uses
      // a `target` string instead, so the renderer can't pass arbitrary
      // URLs into Tauri. Explicit assertion:
      const obj = a as unknown as Record<string, unknown>
      assert.ok(!('url' in obj), `action.kind=${a.kind} leaked a 'url' field`)
    }
  }
})

// ─── deriveUsageTiers ──────────────────────────────────────────────────

const FULLY_READY: VoxReadinessItem[] = [
  item('tauri_runtime', 'passed'),
  item('microphone', 'passed'),
  item('hotkey', 'passed'),
  item('permissions', 'passed'),
  item('whisper_model', 'passed'),
  item('stt_engine', 'passed'),
  item('kernel_url', 'passed'),
  item('kernel_health', 'passed'),
  item('governed_execute', 'passed'),
  item('executor_codex_cli', 'passed'),
  item('executor_claude_cli', 'passed'),
  item('raw_audio_invariant', 'passed'),
]

test('null summary returns shells with anyTierAvailable=false', () => {
  const result = deriveUsageTiers(null)
  assert.equal(result.anyTierAvailable, false)
  assert.equal(result.tiers.length, 4)
  assert.ok(result.tiers.every((t) => !t.available))
})

test('fully-ready summary marks all four tiers available', () => {
  const result = deriveUsageTiers(summary(FULLY_READY))
  assert.equal(result.anyTierAvailable, true)
  for (const tier of result.tiers) {
    assert.ok(tier.available, `tier ${tier.mode} should be available`)
  }
})

test('blocked microphone blocks every tier', () => {
  const items = FULLY_READY.map((i) =>
    i.id === 'microphone' ? { ...i, status: 'blocked' as const } : i,
  )
  const result = deriveUsageTiers(summary(items))
  for (const tier of result.tiers) {
    assert.equal(tier.available, false, `tier ${tier.mode} must be unavailable`)
    assert.ok(tier.blockerIds.includes('microphone'))
  }
})

test('kernel warning blocks polish/compile/governed but leaves dictation available', () => {
  const items = FULLY_READY.map((i) =>
    i.id === 'kernel_url' ? { ...i, status: 'warning' as const } : i,
  )
  const result = deriveUsageTiers(summary(items))
  const byMode = Object.fromEntries(result.tiers.map((t) => [t.mode, t] as const))
  assert.equal(byMode.dictation!.available, true)
  assert.equal(byMode.prompt_polish!.available, false)
  assert.equal(byMode.intent_compile!.available, false)
  assert.equal(byMode.governed_execute!.available, false)
})

test('raw_audio invariant blocked stops everything except dictation availability calc', () => {
  // dictation does not depend on raw_audio_invariant per derive logic;
  // the higher tiers do. This test pins that boundary.
  const items = FULLY_READY.map((i) =>
    i.id === 'raw_audio_invariant' ? { ...i, status: 'blocked' as const } : i,
  )
  const result = deriveUsageTiers(summary(items))
  const byMode = Object.fromEntries(result.tiers.map((t) => [t.mode, t] as const))
  assert.equal(byMode.prompt_polish!.available, false)
  assert.equal(byMode.intent_compile!.available, false)
  assert.equal(byMode.governed_execute!.available, false)
  assert.ok(byMode.governed_execute!.blockerIds.includes('raw_audio_invariant'))
})

test('governed_execute requires at least one executor passed', () => {
  // Strip executors → governed must be unavailable.
  const items = FULLY_READY.map((i) => {
    if (i.id === 'executor_codex_cli' || i.id === 'executor_claude_cli') {
      return { ...i, status: 'warning' as const }
    }
    return i
  })
  const result = deriveUsageTiers(summary(items))
  const governed = result.tiers.find((t) => t.mode === 'governed_execute')!
  assert.equal(governed.available, false)
  assert.ok(governed.blockerIds.includes('executor'))
})

// ─── isReadyForFirstUse ────────────────────────────────────────────────

test('null summary not ready', () => {
  const r = isReadyForFirstUse(null)
  assert.equal(r.ready, false)
})

test('raw_audio blocked is a stop-the-line for first use', () => {
  const items = FULLY_READY.map((i) =>
    i.id === 'raw_audio_invariant' ? { ...i, status: 'blocked' as const } : i,
  )
  const r = isReadyForFirstUse(summary(items))
  assert.equal(r.ready, false)
  assert.match(r.reasoning, /raw_audio|Stop-the-line/i)
})

test('microphone blocked is not ready, regardless of kernel health', () => {
  const items = FULLY_READY.map((i) =>
    i.id === 'microphone' ? { ...i, status: 'blocked' as const } : i,
  )
  const r = isReadyForFirstUse(summary(items))
  assert.equal(r.ready, false)
  assert.match(r.reasoning, /Microfone/i)
})

test('only hotkey missing keeps first-use ready', () => {
  // Hotkey is intentionally a warning — operator can still use the
  // button. The headline must still flip to "ready".
  const items = FULLY_READY.map((i) =>
    i.id === 'hotkey' ? { ...i, status: 'warning' as const } : i,
  )
  const r = isReadyForFirstUse(summary(items))
  assert.equal(r.ready, true)
})

// ─── runner ────────────────────────────────────────────────────────────

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
