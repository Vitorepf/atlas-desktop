/// <reference types="node" />
/**
 * Source-level guard because the Desktop workspace intentionally avoids a
 * React test runner dependency in this cluster. The Atlas Dev Run button must
 * remain gated by the strict readiness endpoint, not merely by Plan success.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const workbench = readFileSync(join(__dirname, '..', 'AtlasDevRunWorkbench.tsx'), 'utf8')
const gate = readFileSync(join(__dirname, '..', 'ReadinessGate.tsx'), 'utf8')
const runPanel = readFileSync(join(__dirname, '..', 'RunPanel.tsx'), 'utf8')

assert.ok(
  gate.includes("fetchAtlasDevReadiness({ strict: true })"),
  'ReadinessGate must call the strict backend readiness endpoint',
)
assert.ok(
  gate.includes('initialReadiness') && gate.includes('if (initialReadiness)'),
  'ReadinessGate must support deterministic visual/certification rendering without network effects',
)
assert.ok(
  gate.includes("readiness?.status === 'passed'") && gate.includes('readiness.provider_safe === true'),
  'ReadinessGate must require passed + provider_safe before allowing Run',
)
assert.ok(
  workbench.includes('<ReadinessGate onReadyChange={setReadinessReady} />'),
  'AtlasDevRunWorkbench must render ReadinessGate before RunPanel',
)
assert.ok(
  workbench.includes('disabled={disabled || !readinessReady}'),
  'RunPanel must stay disabled until readiness passes',
)
assert.ok(
  runPanel.includes('setInterval(() => setNowMs(Date.now()), 1000)'),
  'RunPanel must tick while a confirmation token can expire on screen',
)
assert.ok(
  runPanel.includes('isExpired(plan?.confirmation_expires_at ?? null, nowMs)'),
  'RunPanel must disable Run from live clock state, not only initial render',
)

process.stdout.write('  ✓ AtlasDevRunWorkbench gates Run behind strict readiness\n')
