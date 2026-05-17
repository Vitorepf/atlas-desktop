/**
 * Atlas Dev · Visual smoke runner.
 *
 * Spins up an in-process Vite dev server in SSR mode, loads each Atlas Dev
 * panel module through `ssrLoadModule` (Vite handles JSX + TS + CSS modules
 * transparently), renders to static HTML with `react-dom/server`, then runs
 * a small set of operator-facing assertions and writes each fragment to
 * `apps/desktop/test-results/atlas-dev-visual/` as a snapshot HTML file.
 *
 * Why this script instead of Playwright / Vitest:
 *   - Zero new devDependencies. Vite + React + react-dom/server are already
 *     installed by the desktop workspace.
 *   - Deterministic. No browser, no Tauri shell, no display server.
 *   - Produces real HTML evidence the operator can open in any browser, plus
 *     pass/fail output suitable for CI.
 *
 * Usage:
 *   node ./scripts/visualRender.mjs
 *
 * The Vite server is torn down before exit; the script does NOT leave a
 * background process behind.
 */
import { createServer } from 'vite'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SNAPSHOT_DIR = join(ROOT, 'test-results', 'atlas-dev-visual')
mkdirSync(SNAPSHOT_DIR, { recursive: true })

// Full-surface SSR smoke needs the Atlas AI hook to choose HTTP mode instead
// of the honest offline fallback. No network request runs during SSR (effects
// do not execute), but this proves the integrated Desktop surface mounts.
process.env.VITE_ATLAS_SERVER_URL ||= 'http://127.0.0.1:65535'
globalThis.window ??= {
  addEventListener() {},
  removeEventListener() {},
  setTimeout,
  clearTimeout,
}
Object.defineProperty(globalThis, 'navigator', {
  value: {
    platform: 'MacIntel',
    clipboard: { writeText: async () => {} },
  },
  configurable: true,
})
globalThis.sessionStorage ??= {
  getItem() {
    return null
  },
  setItem() {},
  removeItem() {},
}
globalThis.document ??= {
  querySelector() {
    return null
  },
  activeElement: null,
}

const vite = await createServer({
  root: ROOT,
  // We never serve HTTP — middleware mode is the lightest way to get the
  // module graph + transforms + ssrLoadModule.
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'silent',
})

const failures = []
const cases = []

function test(name, fn) {
  cases.push({ name, fn })
}

function makeController(status, overrides = {}) {
  return {
    status,
    phases: [],
    currentPhase: null,
    receipt: overrides.receipt ?? null,
    tests: [],
    repairAttempts: 0,
    escalation: null,
    error: overrides.error ?? null,
    usingRestFallback: overrides.usingRestFallback ?? false,
    execute: async () => {},
    cancel: () => {},
    reset: () => {},
  }
}

try {
  const { RunPanel } = await vite.ssrLoadModule('/src/components/atlasDev/RunPanel.tsx')
  const { ReadinessGate } = await vite.ssrLoadModule('/src/components/atlasDev/ReadinessGate.tsx')
  const { ReceiptCard } = await vite.ssrLoadModule('/src/components/atlasDev/ReceiptCard.tsx')
  const { AtlasAiSurface } = await vite.ssrLoadModule('/src/surfaces/atlas-ai/AtlasAiSurface.tsx')
  const { AtlasAiPlanPanel } = await vite.ssrLoadModule(
    '/src/surfaces/atlas-ai/components/AtlasAiPlanPanel.tsx',
  )
  const { postAtlasDevPlan } = await vite.ssrLoadModule('/src/surfaces/atlas-ai/client.ts')
  const { cancelAtlasDevRun, runAtlasDev, streamAtlasDevRun, fetchAtlasDevRunStatus } = await vite.ssrLoadModule(
    '/src/components/atlasDev/api.ts',
  )

  const validPlan = {
    run_id: 'dev-1700000000000-abcd1234',
    task_contract_hash: 'task-hash-redacted',
    confirmation_token: 'PLAINTEXT_TOKEN_SHOULD_NOT_LEAK',
    confirmation_expires_at: new Date(Date.now() + 4 * 60_000).toISOString(),
    routing_decision: 'atlas_dev_fast_path',
  }

  const readyPlan = {
    run_id: 'dev-1700000000001-abcd1234',
    status: 'ready',
    surface_id: 'atlas_desktop_ai',
    workspace: 'atlas',
    routing_decision: 'atlas_dev_fast_path',
    confirmation_token: 'ANOTHER_PLAINTEXT_TOKEN_SHOULD_NOT_LEAK',
    confirmation_expires_at: new Date(Date.now() + 4 * 60_000).toISOString(),
    task_contract_hash: 'plan-ready-task-hash',
    mini_spec: {
      goal: 'Corrigir o teste falhando em FooServiceTest::test_resolve_workspace',
      non_goals: ['mexer em rotas', 'tocar em migrations'],
      allowed_files: ['app/Services/Foo/FooService.php', 'tests/Unit/Services/Foo/FooServiceTest.php'],
      forbidden_files: ['vendor/*', 'node_modules/*'],
      acceptance_criteria: [
        'FooServiceTest passa',
        { id: '2', description: 'Nenhum arquivo fora de allowed_files muda' },
      ],
      mini_spec_hash: 'mini-hash',
    },
    task_contract: {
      allowed_files: ['app/Services/Foo/FooService.php'],
      forbidden_files: ['vendor/*'],
      validation_commands: ['php artisan test --filter=FooServiceTest'],
      escalation_on: ['scope_guard_violation'],
      task_contract_hash: 'plan-ready-task-hash',
    },
    stop_conditions: ['patch_applied', 'tests_green'],
    escalation_conditions: ['blocking_ambiguity'],
  }

  /* --------- Integrated Atlas AI surface --------- */

  test('AtlasAiSurface · integrated Desktop surface mounts in HTTP mode', () => {
    const html = renderToStaticMarkup(
      createElement(AtlasAiSurface, {
        activeWorkspaceSlug: 'atlas',
        activeWorkspaceName: 'Atlas',
        defaultWorkspaceSlug: 'atlas',
      }),
    )
    writeFileSync(join(SNAPSHOT_DIR, 'atlas-ai-surface-integrated.html'), html)
    assert(html.length > 5000, 'integrated surface rendered suspiciously small shell')
    assert(html.includes('atlas-ai-header-bar'), 'Atlas AI header bar missing')
    assert(html.includes('Atlas AI'), 'Atlas AI title missing')
    assert(html.includes('Conversas Atlas AI'), 'left rail aria-label missing')
    assert(html.includes('Contexto Atlas AI'), 'right rail aria-label missing')
    assert(html.includes('Contexto'), 'Contexto tab missing')
    assert(html.includes('Plano'), 'Plano tab missing')
    assert(html.includes('atlas-ai-composer'), 'composer did not mount')
    assert(!html.includes('Atlas AI offline'), 'surface fell back to offline mode')
    assert(!html.includes('<div id="root"></div>'), 'only Vite shell rendered')
  })

  /* --------- RunPanel --------- */

  test('ReadinessGate · passed runtime unlocks operator run path', () => {
    const html = renderToStaticMarkup(
      createElement(ReadinessGate, {
        initialReadiness: {
          schema_version: 'atlas.dev.readiness.v1',
          status: 'passed',
          strict: true,
          provider_safe: true,
          summary: { passed: 9, warnings: 0, failed: 0 },
          checks: [
            {
              id: 'provider.runtime',
              status: 'passed',
              severity: 'blocker',
              message: 'Provider runtime is configured for Atlas Dev runs.',
            },
          ],
        },
      }),
    )
    writeFileSync(join(SNAPSHOT_DIR, 'readinessgate-passed.html'), html)
    assert(html.includes('Readiness operacional'), 'readiness header missing')
    assert(html.includes('passed · 9 ok · 0 bloqueios'), 'passed summary missing')
    assert(html.includes('Runtime pronto'), 'ready copy missing')
    assert(!html.includes('/Users/'), 'absolute path leaked in passed readiness')
  })

  test('ReadinessGate · blocked runtime exposes blockers before Run', () => {
    const html = renderToStaticMarkup(
      createElement(ReadinessGate, {
        initialReadiness: {
          schema_version: 'atlas.dev.readiness.v1',
          status: 'blocked',
          strict: true,
          provider_safe: true,
          summary: { passed: 7, warnings: 0, failed: 2 },
          checks: [
            {
              id: 'config.desktop_enabled',
              status: 'failed',
              severity: 'blocker',
              message: 'atlas_dev.efficient.desktop_enabled must be enabled for Desktop-ready Atlas Dev.',
            },
            {
              id: 'security.app_key',
              status: 'failed',
              severity: 'blocker',
              message: 'APP_KEY must provide at least 32 bytes for confirmation_token HMAC.',
            },
          ],
        },
      }),
    )
    writeFileSync(join(SNAPSHOT_DIR, 'readinessgate-blocked.html'), html)
    assert(html.includes('blocked · 7 ok · 2 bloqueios'), 'blocked summary missing')
    assert(html.includes('config.desktop_enabled'), 'desktop blocker missing')
    assert(html.includes('security.app_key'), 'APP_KEY blocker missing')
    assert(html.includes('Run fica bloqueado'), 'blocked run copy missing')
    assert(!html.includes('/private/var/'), 'absolute path leaked in blocked readiness')
  })

  test('RunPanel · awaiting_confirmation', () => {
    const html = renderToStaticMarkup(
      createElement(RunPanel, {
        plan: validPlan,
        controller: makeController('awaiting_confirmation'),
      }),
    )
    writeFileSync(join(SNAPSHOT_DIR, 'runpanel-awaiting.html'), html)
    assert(html.includes('Atlas Dev · executar plano'), 'panel header missing')
    assert(html.includes('executar com confirmação'), 'CTA copy missing')
    assert(html.includes('expira em'), 'token expiry hint missing')
    assert(!html.includes('PLAINTEXT_TOKEN_SHOULD_NOT_LEAK'), 'token leaked into HTML')
  })

  test('RunPanel · idle no plan shows empty + disabled CTA', () => {
    const html = renderToStaticMarkup(
      createElement(RunPanel, { plan: null, controller: makeController('idle') }),
    )
    writeFileSync(join(SNAPSHOT_DIR, 'runpanel-idle.html'), html)
    assert(html.includes('Aguardando um plano'), 'empty-state copy missing')
    assert(html.includes('disabled'), 'execute button must be disabled')
  })

  test('RunPanel · routing != fast_path shows non-runnable banner', () => {
    const blockedPlan = { ...validPlan, routing_decision: 'forge_promotion_preview' }
    const html = renderToStaticMarkup(
      createElement(RunPanel, {
        plan: blockedPlan,
        controller: makeController('awaiting_confirmation'),
      }),
    )
    writeFileSync(join(SNAPSHOT_DIR, 'runpanel-non-runnable.html'), html)
    assert(
      html.includes('não pode ser executado'),
      'non-runnable plan must show explanation banner',
    )
  })

  test('RunPanel · invalid_token error shows replan hint', () => {
    const html = renderToStaticMarkup(
      createElement(RunPanel, {
        plan: validPlan,
        controller: makeController('failed', {
          error: {
            kind: 'invalid_token',
            message: 'Token de confirmação inválido, expirado ou já utilizado.',
            requires_replan: true,
          },
        }),
      }),
    )
    writeFileSync(join(SNAPSHOT_DIR, 'runpanel-expired-token.html'), html)
    assert(html.includes('Token de confirmação inválido'), 'expired-token message missing')
    assert(html.includes('Gere um novo plano'), 'replan instruction missing')
  })

  test('RunPanel · expired confirmation token disables Run before backend reject', () => {
    const html = renderToStaticMarkup(
      createElement(RunPanel, {
        plan: {
          ...validPlan,
          confirmation_expires_at: new Date(Date.now() - 30_000).toISOString(),
        },
        controller: makeController('awaiting_confirmation'),
      }),
    )
    writeFileSync(join(SNAPSHOT_DIR, 'runpanel-expired-client-block.html'), html)
    assert(html.includes('expirado'), 'expired token hint missing')
    assert(html.includes('Token de confirmação expirado'), 'client-side expired-token banner missing')
    assert(html.includes('disabled'), 'execute button must be disabled for expired token')
    assert(!html.includes('PLAINTEXT_TOKEN_SHOULD_NOT_LEAK'), 'token leaked into expired-token HTML')
  })

  test('RunPanel · running exposes operator cancellation', () => {
    const html = renderToStaticMarkup(
      createElement(RunPanel, {
        plan: validPlan,
        controller: makeController('running'),
      }),
    )
    writeFileSync(join(SNAPSHOT_DIR, 'runpanel-running-cancel.html'), html)
    assert(html.includes('executando…'), 'running state must show executing CTA copy')
    assert(html.includes('cancelar'), 'running state must expose cancel action')
    assert(!html.includes('PLAINTEXT_TOKEN_SHOULD_NOT_LEAK'), 'token leaked into running HTML')
  })

  /* --------- AtlasAiPlanPanel --------- */

  test('PlanPanel · loading state', () => {
    const html = renderToStaticMarkup(
      createElement(AtlasAiPlanPanel, {
        thread: null,
        pendingTrace: null,
        mode: 'programming',
        atlasDevPlan: null,
        atlasDevPlanLoading: true,
      }),
    )
    writeFileSync(join(SNAPSHOT_DIR, 'planpanel-loading.html'), html)
    assert(html.includes('consultando plano'), 'loading copy missing')
  })

  test('PlanPanel · unavailable (503/404)', () => {
    const html = renderToStaticMarkup(
      createElement(AtlasAiPlanPanel, {
        thread: null,
        pendingTrace: null,
        mode: 'programming',
        atlasDevPlan: null,
        atlasDevPlanUnavailable: true,
      }),
    )
    writeFileSync(join(SNAPSHOT_DIR, 'planpanel-unavailable.html'), html)
    assert(html.includes('plan-only endpoint ainda não disponível'), 'unavailable copy missing')
    assert(html.includes('fluxo legado em uso'), 'legacy-fallback hint missing')
  })

  test('PlanPanel · error state surfaces backend message', () => {
    const html = renderToStaticMarkup(
      createElement(AtlasAiPlanPanel, {
        thread: null,
        pendingTrace: null,
        mode: 'programming',
        atlasDevPlan: null,
        atlasDevPlanError: 'Atlas AI · http 422: validation failed (foo)',
      }),
    )
    writeFileSync(join(SNAPSHOT_DIR, 'planpanel-error.html'), html)
    assert(html.includes('http 422'), 'error message must reach the panel')
  })

  test('PlanPanel · ready plan + RunPanel mount + no leaks', () => {
    const html = renderToStaticMarkup(
      createElement(AtlasAiPlanPanel, {
        thread: null,
        pendingTrace: null,
        mode: 'programming',
        atlasDevPlan: readyPlan,
      }),
    )
    writeFileSync(join(SNAPSHOT_DIR, 'planpanel-ready.html'), html)
    assert(html.includes('Objetivo'), 'Objetivo header missing')
    assert(html.includes('Corrigir o teste falhando'), 'goal text missing')
    assert(html.includes('Allowed files'), 'allowed-files header missing')
    assert(html.includes('Forbidden files'), 'forbidden-files header missing')
    assert(html.includes('Critérios de aceitação'), 'acceptance header missing')
    assert(html.includes('Plan-only'), 'footnote missing')
    assert(html.includes('Atlas Dev · executar plano'), 'RunPanel must mount when fast_path')
    assert(!html.includes('ANOTHER_PLAINTEXT_TOKEN_SHOULD_NOT_LEAK'), 'token leaked via runPlan')
    assert(!html.includes('/Users/'), 'absolute /Users/ path leaked')
    assert(!html.includes('/private/var/'), 'absolute /private/var/ path leaked')
  })

  test('Desktop contract · Plan → Run → Stream → Show smoke', async () => {
    const token = 'VISUAL_CONFIRMATION_TOKEN_SHOULD_NOT_LEAK'
    const runId = 'dev-visual-contract-001'
    const taskContractHash = 'tc-hash-visual'
    const receipt = {
      run_id: runId,
      task_contract_hash: taskContractHash,
      completion: { status: 'passed', honesty_flags: [], residual_risks: [] },
      scope_guard_status: 'passed',
      verification_status: 'passed',
      changed_files: ['atlas-server/app/Services/Foo/FooService.php'],
      receipt_hash: 'sha256:visualreceipt',
      receipt_path:
        '/Users/operator/dev/Atlas/storage/atlas-dev/receipts/dev-visual-contract-001/verification_receipt.json',
    }
    const planPayload = {
      data: {
        kind: 'plan_only',
        run_id: runId,
        surface_id: 'atlas_desktop_ai',
        workspace_label: 'atlas-server',
        workspace_hash: 'workspace-hash-visual',
        routing: {
          kind: 'atlas_dev_fast_path',
          reasons: [],
          blockers: [],
          is_executable: true,
        },
        status: 'ready',
        task_kind: 'patch',
        risk_level: 'R2',
        hashes: { task_contract: taskContractHash },
        confirmation: {
          token,
          expires_at: Math.floor(Date.now() / 1000) + 300,
          task_contract_hash: taskContractHash,
        },
        mini_spec: {
          goal: 'Corrigir FooService',
          non_goals: ['não tocar migrations'],
          allowed_files: ['atlas-server/app/Services/Foo/FooService.php'],
          forbidden_files: ['vendor/*'],
          acceptance_criteria: ['teste passa'],
        },
        task_contract: {
          allowed_files: ['atlas-server/app/Services/Foo/FooService.php'],
          forbidden_files: ['vendor/*'],
          validation_commands: ['php artisan test --filter=FooServiceTest'],
          task_contract_hash: taskContractHash,
        },
        persisted_artifact_refs: {
          compact_sdd: `receipts/${runId}/compact_sdd.json`,
        },
        prompt_sendable: true,
      },
    }
    const calls = []
    const originalFetch = globalThis.fetch

    globalThis.fetch = async (input, init = {}) => {
      const url = String(input)
      calls.push({ url, method: init.method ?? 'GET' })

      if (url.endsWith('/ai/interactions/atlas-dev/plan')) {
        const body = JSON.parse(String(init.body ?? '{}'))
        assert(body.surface_id === 'atlas_desktop_ai', 'Plan body surface_id mismatch')
        assert(body.raw_intent === 'Corrigir FooService', 'Plan body raw_intent mismatch')
        assert(body.workspace === 'atlas-server', 'Plan body workspace mismatch')
        assert(
          body.surface_context?.composer_mode === 'programming',
          'Plan body composer_mode mismatch',
        )
        assert(!Object.hasOwn(body, 'input_text'), 'Plan body leaked legacy input_text')
        return jsonResponse(planPayload)
      }

      if (url.endsWith('/ai/interactions/atlas-dev/run')) {
        const body = JSON.parse(String(init.body ?? '{}'))
        assert(body.run_id === runId, 'Run body run_id mismatch')
        assert(body.operator_confirmed === true, 'Run body missing human confirmation')
        assert(body.confirmation_token === token, 'Run body confirmation token mismatch')
        assert(body.task_contract_hash === taskContractHash, 'Run body task_contract_hash mismatch')
        return jsonResponse({ data: { ok: true, run_id: runId } })
      }

      if (url.endsWith(`/ai/interactions/atlas-dev/runs/${runId}/stream`)) {
        const encoder = new TextEncoder()
        const sse = [
          sseEvent('phase', { kind: 'phase', phase: 'queued', at: '2026-05-16T20:00:00Z' }),
          sseEvent('phase', {
            kind: 'phase',
            phase: 'verifying',
            at: '2026-05-16T20:00:01Z',
          }),
          sseEvent('receipt', { kind: 'receipt', receipt }),
          sseEvent('stream_closed', {
            kind: 'stream_closed',
            reason: 'snapshot_complete',
            fallback: 'poll_rest_show_endpoint',
          }),
        ].join('')
        return new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(encoder.encode(sse))
              controller.close()
            },
          }),
          { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
        )
      }

      if (url.endsWith(`/ai/interactions/atlas-dev/runs/${runId}`)) {
        return jsonResponse({
          data: {
            run_id: runId,
            state: 'complete',
            completion_state: 'passed',
            receipt,
            persisted_artifact_refs: {
              verification_receipt: `receipts/${runId}/verification_receipt.json`,
            },
          },
        })
      }

      throw new Error(`unexpected fetch: ${url}`)
    }

    try {
      const plan = await postAtlasDevPlan({
        input_text: 'Corrigir FooService',
        workspace: 'atlas-server',
        task: 'dev',
        provider: 'auto',
        decision_mode: 'atlas_decide',
      })
      assert(plan.run_id === runId, 'normalised plan run_id mismatch')
      assert(plan.confirmation_token === token, 'normalised plan token mismatch')
      assert(plan.task_contract_hash === taskContractHash, 'normalised task_contract_hash mismatch')

      const planHtml = renderToStaticMarkup(
        createElement(AtlasAiPlanPanel, {
          thread: null,
          pendingTrace: null,
          mode: 'programming',
          atlasDevPlan: plan,
        }),
      )
      writeFileSync(join(SNAPSHOT_DIR, 'desktop-flow-plan.html'), planHtml)
      assert(planHtml.includes('Corrigir FooService'), 'operational plan goal missing')
      assert(planHtml.includes('teste passa'), 'operational plan acceptance criterion missing')
      assert(planHtml.includes('Atlas Dev · executar plano'), 'operational RunPanel missing')
      assertNoSensitiveLeak(planHtml, token, 'plan HTML')

      const start = await runAtlasDev({
        run_id: plan.run_id,
        task_contract_hash: plan.task_contract_hash,
        confirmation_token: plan.confirmation_token,
        operator_confirmed: true,
      })
      assert(start.ok === true && start.run_id === runId, 'run start normalisation mismatch')

      const events = []
      await new Promise((resolve, reject) => {
        streamAtlasDevRun(runId, {
          onEvent: (event) => events.push(event),
          onError: reject,
          onClose: resolve,
        })
      })
      assert(events.some((event) => event.kind === 'phase' && event.phase === 'verifying'), 'SSE verifying phase missing')
      assert(events.some((event) => event.kind === 'receipt'), 'SSE receipt missing')
      assert(
        events.some(
          (event) =>
            event.kind === 'stream_closed' &&
            event.reason === 'snapshot_complete' &&
            event.fallback === 'poll_rest_show_endpoint',
        ),
        'SSE stream_closed fallback event missing',
      )

      const status = await fetchAtlasDevRunStatus(runId)
      assert(status.state === 'complete', 'REST show state mismatch')
      assert(status.receipt?.completion?.status === 'passed', 'REST show receipt mismatch')

      const receiptHtml = renderToStaticMarkup(createElement(ReceiptCard, { receipt: status.receipt }))
      writeFileSync(join(SNAPSHOT_DIR, 'desktop-flow-receipt.html'), receiptHtml)
      assert(receiptHtml.includes('passed'), 'operational receipt status missing')
      assert(receiptHtml.includes('sha256:visualreceipt'), 'operational receipt hash missing')
      assert(receiptHtml.includes('FooService.php'), 'operational changed file missing')
      assertNoSensitiveLeak(receiptHtml, token, 'receipt HTML')

      assert(
        calls.map((call) => call.method).join(' ') === 'POST POST GET GET',
        `unexpected Desktop flow call order: ${JSON.stringify(calls)}`,
      )
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('Desktop contract · cancel accepted run uses canonical endpoint', async () => {
    const runId = 'dev-visual-cancel-001'
    const calls = []
    const originalFetch = globalThis.fetch

    globalThis.fetch = async (input, init = {}) => {
      const url = String(input)
      calls.push({ url, method: init.method ?? 'GET', body: init.body ? JSON.parse(String(init.body)) : null })

      if (url.endsWith(`/ai/interactions/atlas-dev/runs/${runId}/cancel`)) {
        assert(init.method === 'POST', 'cancel must be POST')
        assert(calls.at(-1).body.reason === 'operator_cancelled_from_desktop', 'cancel reason mismatch')
        return jsonResponse({
          data: {
            ok: true,
            run_id: runId,
            state: 'complete',
            completion_state: 'cancelled',
            persisted_artifact_refs: {
              run_cancellation: `receipts/${runId}/run_cancellation.json`,
            },
          },
        })
      }

      if (url.endsWith(`/ai/interactions/atlas-dev/runs/${runId}`)) {
        return jsonResponse({
          data: {
            run_id: runId,
            state: 'complete',
            completion_state: 'cancelled',
            task_contract_hash: 'cancel-task-contract-hash',
            run_execution: { status: 'cancelled' },
            persisted_artifact_refs: {
              run_cancellation: `receipts/${runId}/run_cancellation.json`,
            },
          },
        })
      }

      throw new Error(`unexpected fetch: ${url}`)
    }

    try {
      await cancelAtlasDevRun(runId, 'operator_cancelled_from_desktop')
      const status = await fetchAtlasDevRunStatus(runId)
      assert(status.state === 'complete', 'cancel REST status must be complete')
      assert(status.receipt?.completion?.status === 'cancelled', 'cancel completion mismatch')
      assert(
        status.phases?.some((entry) => entry.phase === 'complete'),
        'cancel artifact must normalise to terminal phase',
      )
      assert(
        calls.map((call) => call.method).join(' ') === 'POST GET',
        `unexpected cancel flow call order: ${JSON.stringify(calls)}`,
      )
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('PlanPanel · blocked plan renders operator-readable card', () => {
    const html = renderToStaticMarkup(
      createElement(AtlasAiPlanPanel, {
        thread: null,
        pendingTrace: null,
        mode: 'programming',
        atlasDevPlan: {
          run_id: 'dev-1700000000002-bbbb',
          status: 'blocked',
          blocked: {
            code: 'INTENT_CLARITY_BLOCKING',
            message: 'Faltam detalhes — qual arquivo você quer alterar?',
            question: 'Pode citar o caminho do arquivo alvo?',
          },
        },
      }),
    )
    writeFileSync(join(SNAPSHOT_DIR, 'planpanel-blocked.html'), html)
    assert(html.includes('Plano bloqueado'), 'blocked header missing')
    assert(html.includes('Faltam detalhes'), 'blocked.message missing')
    assert(html.includes('Pode citar o caminho'), 'blocked.question missing')
  })

  test('PlanPanel · forge_promotion_preview banner', () => {
    const html = renderToStaticMarkup(
      createElement(AtlasAiPlanPanel, {
        thread: null,
        pendingTrace: null,
        mode: 'programming',
        atlasDevPlan: {
          run_id: 'dev-1700000000003-cccc',
          status: 'forge_promotion_preview',
          forge_promotion_preview: {
            reason: 'Mudança multi-sistema detectada',
            target: 'forge_obra_candidate',
            recommended_action: 'Promover para Forge antes de qualquer patch',
          },
        },
      }),
    )
    writeFileSync(join(SNAPSHOT_DIR, 'planpanel-forge.html'), html)
    assert(html.includes('Promoção para Forge'), 'Forge banner header missing')
    assert(html.includes('Mudança multi-sistema'), 'forge reason missing')
    assert(html.includes('NÃO foi criada automaticamente'), 'safety footnote missing')
  })

  /* --------- ReceiptCard --------- */

  test('ReceiptCard · passed receipt redacts receipt_path', () => {
    const html = renderToStaticMarkup(
      createElement(ReceiptCard, {
        receipt: {
          run_id: 'dev-1700000000004-dddd',
          task_contract_hash: 'tc-hash',
          completion: { status: 'passed', honesty_flags: [], residual_risks: [] },
          scope_guard_status: 'passed',
          verification_status: 'passed',
          changed_files: ['app/Services/Foo/FooService.php'],
          receipt_hash: 'sha256:abcd1234',
          receipt_path:
            '/Users/operator/dev/Atlas/storage/atlas-dev/receipts/dev-xyz/verification_receipt.json',
        },
      }),
    )
    writeFileSync(join(SNAPSHOT_DIR, 'receiptcard-passed.html'), html)
    assert(html.includes('Receipt'), 'Receipt header missing')
    assert(html.includes('passed'), 'completion state missing')
    assert(html.includes('sha256:abcd1234'), 'receipt_hash must be visible')
    assert(html.includes('app/Services/Foo/FooService.php'), 'changed_files must render')
    assert(!html.includes('/Users/operator'), 'absolute receipt_path leaked into UI')
  })

  test('ReceiptCard · empty receipt renders honest empty-state', () => {
    const html = renderToStaticMarkup(createElement(ReceiptCard, { receipt: null }))
    writeFileSync(join(SNAPSHOT_DIR, 'receiptcard-empty.html'), html)
    assert(html.includes('Sem receipt ainda'), 'empty-state copy missing')
  })

  /* --------- cross-cutting: forbidden vocabulary --------- */

  test('cross-cutting · zero Rivals/benchmark vocabulary in any fragment', () => {
    const fragments = [
      renderToStaticMarkup(
        createElement(RunPanel, {
          plan: validPlan,
          controller: makeController('awaiting_confirmation'),
        }),
      ),
      renderToStaticMarkup(
        createElement(AtlasAiPlanPanel, {
          thread: null,
          pendingTrace: null,
          mode: 'programming',
          atlasDevPlan: readyPlan,
        }),
      ),
      renderToStaticMarkup(createElement(ReceiptCard, { receipt: null })),
      renderToStaticMarkup(
        createElement(AtlasAiSurface, {
          activeWorkspaceSlug: 'atlas',
          activeWorkspaceName: 'Atlas',
          defaultWorkspaceSlug: 'atlas',
        }),
      ),
    ].join('\n')

    for (const banned of ['rivals', 'benchmark', 'matchup', 'battery']) {
      assert(!fragments.toLowerCase().includes(banned), `banned word "${banned}" found in UI`)
    }
  })

  for (const { name, fn } of cases) {
    try {
      await fn()
      process.stdout.write(`  ✓ ${name}\n`)
    } catch (cause) {
      failures.push({ name, cause })
      process.stdout.write(`  ✗ ${name}\n    ${cause.message}\n`)
    }
  }

  process.stdout.write(`\n${cases.length - failures.length}/${cases.length} passed\n`)
  process.stdout.write(`HTML snapshots: ${SNAPSHOT_DIR}\n`)
} finally {
  await vite.close()
}

if (failures.length > 0) process.exit(1)

function assert(cond, message) {
  if (!cond) throw new Error(message)
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function sseEvent(event, data) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

function assertNoSensitiveLeak(html, token, label) {
  assert(!html.includes(token), `${label} leaked confirmation token`)
  assert(!html.includes('/Users/'), `${label} leaked /Users path`)
  assert(!html.includes('/private/var/'), `${label} leaked /private/var path`)
  assert(!html.includes('/var/folders/'), `${label} leaked /var/folders path`)
}
