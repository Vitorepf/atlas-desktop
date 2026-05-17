/// <reference types="node" />
/**
 * Regression guard for the Desktop run state machine.
 *
 * The operator can click cancel while POST /run is still in flight
 * (`submitting`). When the request later resolves, the hook must not resurrect
 * that cancelled run as `running` or reopen SSE/polling. We keep this as a
 * source-level guard because this workspace intentionally has no hook test
 * runner dependency.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(__dirname, '..', 'useAtlasDevRun.ts'), 'utf8')

const runCall = source.indexOf('await runAtlasDev({')
const successGuard = source.indexOf('if (finalizedRef.current) return', runCall)
const runningTransition = source.indexOf("status: 'running'", runCall)

assert.ok(runCall >= 0, 'useAtlasDevRun must await runAtlasDev inside execute()')
assert.ok(successGuard > runCall, 'execute() must check finalizedRef after runAtlasDev resolves')
assert.ok(
  successGuard < runningTransition,
  'execute() must abort before setting status=running when cancel finalized the run',
)

const catchBlock = source.indexOf('} catch (cause) {', runCall)
const catchGuard = source.indexOf('if (finalizedRef.current) return', catchBlock)
const failedTransition = source.indexOf("status: 'failed'", catchBlock)

assert.ok(catchBlock > runCall, 'execute() must handle runAtlasDev errors')
assert.ok(catchGuard > catchBlock, 'execute() catch block must respect cancellation finalization')
assert.ok(
  catchGuard < failedTransition,
  'execute() must not replace a cancelled submitting run with failed when /run rejects late',
)

process.stdout.write('  ✓ useAtlasDevRun guards late /run resolution after cancel\n')
