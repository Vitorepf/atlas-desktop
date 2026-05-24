import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  buildInteractionPayload,
  defaultTaskForMode,
  flowIdForMode,
  isTaskAllowedForMode,
  MODE_OPTIONS,
  TASK_OPTIONS_AUTO,
  TASK_OPTIONS_PROGRAMMING,
} from '../contract.ts'

/**
 * Anti-regression: Atlas Desktop AI surface MUST behave as a Hyperflow client,
 * never as a hardcoded `programming.dev` workbench.
 *
 * If any of these assertions fails the Desktop has regressed to the legacy
 * behaviour where opening Atlas AI immediately framed everything as
 * `programming.dev` even when the operator wanted research, finance, marketing
 * or a generic conversation.
 */

test('auto is the canonical first mode option in the operator menu', () => {
  assert.equal(MODE_OPTIONS[0]?.value, 'auto')
  assert.equal(MODE_OPTIONS[0]?.label, 'Auto (Atlas Decide)')
  // `programming` must NOT be the first menu entry — Desktop AI is a multi-
  // domain surface, not a programming workbench.
  assert.notEqual(MODE_OPTIONS[0]?.value, 'programming')
})

test('finance, marketing and research are first-class operator modes', () => {
  const values = MODE_OPTIONS.map((m) => m.value)
  for (const required of ['auto', 'general', 'research', 'finance', 'marketing', 'programming'] as const) {
    assert.ok(
      values.includes(required as never),
      `MODE_OPTIONS must offer ${required} (Desktop is the multi-domain Hyperflow surface)`,
    )
  }
})

test('default task for auto mode is auto, not dev', () => {
  assert.equal(defaultTaskForMode('auto'), 'auto')
})

test('default task for programming mode is dev (explicit programming opt-in)', () => {
  assert.equal(defaultTaskForMode('programming'), 'dev')
})

test('flowIdForMode(auto, auto) returns auto — backend decides, not the surface', () => {
  assert.equal(flowIdForMode('auto', 'auto'), 'auto')
  assert.equal(flowIdForMode('auto', 'direct'), 'auto')
  assert.equal(flowIdForMode('auto', 'plan'), 'auto')
  assert.equal(flowIdForMode('auto', 'review'), 'auto')
})

test('flowIdForMode never returns programming.dev for non-programming modes', () => {
  for (const mode of ['auto', 'general', 'conversation', 'research', 'finance', 'marketing', 'strategy', 'personal_development', 'cyber', 'automation'] as const) {
    for (const task of ['auto', 'direct', 'plan', 'review'] as const) {
      const flowId = flowIdForMode(mode as never, task as never)
      assert.notEqual(
        flowId,
        'programming.dev',
        `flowIdForMode(${mode}, ${task}) must not regress to programming.dev`,
      )
    }
  }
})

test('flowIdForMode produces the canonical domain flow for each first-class mode', () => {
  assert.equal(flowIdForMode('research', 'direct'), 'research.investigate')
  assert.equal(flowIdForMode('finance', 'direct'), 'finance.analyze')
  assert.equal(flowIdForMode('marketing', 'direct'), 'marketing.plan')
  assert.equal(flowIdForMode('programming', 'dev'), 'programming.dev')
  assert.equal(flowIdForMode('programming', 'review'), 'programming.review')
  assert.equal(flowIdForMode('programming', 'debug'), 'programming.repair')
})

test('isTaskAllowedForMode blocks programming tasks under non-programming modes', () => {
  assert.equal(isTaskAllowedForMode('dev', 'research'), false)
  assert.equal(isTaskAllowedForMode('debug', 'finance'), false)
  assert.equal(isTaskAllowedForMode('dev', 'marketing'), false)
  // Conversely, programming mode must keep its operator-facing menu intact.
  assert.equal(isTaskAllowedForMode('dev', 'programming'), true)
  assert.equal(isTaskAllowedForMode('debug', 'programming'), true)
  assert.equal(isTaskAllowedForMode('review', 'programming'), true)
})

test('auto-mode interaction payload sends auto/auto routing hints and zero programming runtime policy', () => {
  const { payload } = buildInteractionPayload({
    mode: 'auto',
    task: 'auto',
    provider: 'auto',
    workspaceSlug: null,
  })

  assert.equal(payload.atlas_mode, 'auto')
  assert.equal(payload.routing_domain, 'auto')
  assert.equal(payload.routing_task, 'auto')
  assert.equal(payload.flow_id, 'auto')
  assert.equal(payload.domain_id, 'auto')
  assert.equal(payload.decision_mode, 'atlas_decide')
  assert.equal(payload.surface_id, 'atlas_desktop_ai')
  assert.equal(payload.app_surface, 'atlas_desktop_ai')

  // No programming policy keys may leak when mode is `auto`. The seven keys
  // below are the ones legacy `programming.dev` code wrote into the payload —
  // a regression that re-enables them is what this test exists to detect.
  for (const forbiddenKey of [
    'capability_profile',
    'engineering_run_id',
    'engineering_run',
    'auto_test',
    'force_harness',
    'atlas_programming',
    'permission_policy',
  ]) {
    assert.ok(
      !(forbiddenKey in payload),
      `auto mode must NOT inject ${forbiddenKey} (regression to programming.dev runtime)`,
    )
  }
})

test('programming-mode interaction payload preserves runtime policy for explicit programming requests', () => {
  const { payload } = buildInteractionPayload({
    mode: 'programming',
    task: 'dev',
    provider: 'auto',
    workspaceSlug: '/repo/atlas',
  })

  assert.equal(payload.atlas_mode, 'programming')
  assert.equal(payload.flow_id, 'programming.dev')
  assert.equal(payload.domain_id, 'programming')
  // workspaceSlug DOES surface for backwards compat with the Atlas Dev path.
  assert.equal(payload.workspace, '/repo/atlas')
  // Programming runtime keys must be present ONLY in programming mode.
  assert.ok('capability_profile' in payload)
})

test('research-mode interaction payload routes via routing_domain=research and never leaks programming policy', () => {
  const { payload } = buildInteractionPayload({
    mode: 'research',
    task: 'direct',
    provider: 'auto',
    workspaceSlug: '/repo/atlas',
  })

  assert.equal(payload.atlas_mode, 'research')
  assert.equal(payload.routing_domain, 'research')
  assert.equal(payload.flow_id, 'research.investigate')
  assert.equal(payload.domain_id, 'research')
  assert.ok(!('capability_profile' in payload), 'research must NOT inject programming runtime policy')
})

test('finance and marketing modes route to their own domain flows and never leak programming policy', () => {
  const finance = buildInteractionPayload({
    mode: 'finance',
    task: 'direct',
    provider: 'auto',
    workspaceSlug: null,
  })
  assert.equal(finance.payload.routing_domain, 'finance')
  assert.equal(finance.payload.flow_id, 'finance.analyze')
  assert.equal(finance.payload.domain_id, 'finance')
  assert.ok(!('capability_profile' in finance.payload))

  const marketing = buildInteractionPayload({
    mode: 'marketing',
    task: 'direct',
    provider: 'auto',
    workspaceSlug: null,
  })
  assert.equal(marketing.payload.routing_domain, 'marketing')
  assert.equal(marketing.payload.flow_id, 'marketing.plan')
  assert.equal(marketing.payload.domain_id, 'marketing')
  assert.ok(!('capability_profile' in marketing.payload))
})

test('TASK_OPTIONS expose programming-specific tasks ONLY under programming mode', () => {
  const autoValues = TASK_OPTIONS_AUTO.map((t) => t.value)
  assert.deepEqual(autoValues, ['auto', 'direct', 'plan', 'review'])
  assert.ok(!autoValues.includes('dev' as never), 'auto-mode menu must not expose `dev` task')
  assert.ok(!autoValues.includes('debug' as never), 'auto-mode menu must not expose `debug` task')

  const programmingValues = TASK_OPTIONS_PROGRAMMING.map((t) => t.value)
  assert.deepEqual(programmingValues, ['dev', 'debug', 'review', 'plan'])
})

test('explicit operator provider override flows through, otherwise atlas_decide carries the choice', () => {
  const autoProvider = buildInteractionPayload({
    mode: 'auto',
    task: 'auto',
    provider: 'auto',
    workspaceSlug: null,
  })
  assert.equal(autoProvider.payload.decision_mode, 'atlas_decide')
  assert.ok(!('requested_provider' in autoProvider.payload))

  const claudeProvider = buildInteractionPayload({
    mode: 'auto',
    task: 'auto',
    provider: 'claude_cli',
    workspaceSlug: null,
  })
  assert.equal(claudeProvider.payload.decision_mode, 'manual_override')
  assert.equal(claudeProvider.payload.requested_provider, 'claude_cli')
})

test('handles missing workspace gracefully — no programming-mode regression when workspaceSlug is null', () => {
  const { payload } = buildInteractionPayload({
    mode: 'auto',
    task: 'auto',
    provider: 'auto',
    workspaceSlug: null,
  })
  assert.ok(payload.workspace === undefined, 'workspace must be omitted (not forced) when null in auto mode')
})
