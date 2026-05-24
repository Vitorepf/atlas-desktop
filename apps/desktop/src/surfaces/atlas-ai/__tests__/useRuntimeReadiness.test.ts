/**
 * Atlas AI · Desktop · view-model `useRuntimeReadiness`.
 *
 * Testa a projeção canon que o ContextPanel consome — sem React renderer,
 * usando o builder puro `buildRuntimeReadinessView`.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { applyAwisOperationalHealth, buildRuntimeReadinessView } from '../runtimeReadinessView.ts'
import type { AtlasAiRuntimeReadiness } from '../types.ts'

const noopRefresh = (): void => {}

function readyPayload(): AtlasAiRuntimeReadiness {
  return {
    schema_version: 'atlas.ai.runtime_readiness.v1',
    status: 'ready',
    summary: { total: 11, passed: 11, partial: 0, failed: 0, critical_failed: 0, warn_failed: 0 },
    blockers: [],
    warnings: [],
    certification_hash: 'a'.repeat(64),
  }
}

function partialPayload(): AtlasAiRuntimeReadiness {
  return {
    schema_version: 'atlas.ai.runtime_readiness.v1',
    status: 'partial',
    summary: { total: 11, passed: 10, partial: 1, failed: 0, critical_failed: 0, warn_failed: 1 },
    blockers: [],
    warnings: ['control_plane_runtime'],
    certification_hash: 'b'.repeat(64),
  }
}

function blockedPayload(): AtlasAiRuntimeReadiness {
  return {
    schema_version: 'atlas.ai.runtime_readiness.v1',
    status: 'blocked',
    summary: { total: 11, passed: 7, partial: 1, failed: 3, critical_failed: 3, warn_failed: 1 },
    blockers: ['mission_foundation_readiness', 'router_runtime_readiness', 'follow_through_loop'],
    warnings: ['control_plane_runtime'],
    certification_hash: 'c'.repeat(64),
  }
}

test('view-model · payload null antes do load → status loading', () => {
  const view = buildRuntimeReadinessView(null, false, false, noopRefresh)
  assert.equal(view.status, 'loading')
  assert.equal(view.statusLabel, 'Verificando')
  assert.equal(view.isLoaded, false)
  assert.equal(view.criticalFailed, 0)
  assert.equal(view.blockers.length, 0)
})

test('view-model · payload null após load → status unavailable', () => {
  const view = buildRuntimeReadinessView(null, false, true, noopRefresh)
  assert.equal(view.status, 'unavailable')
  assert.equal(view.statusLabel, 'Indisponível')
  assert.equal(view.isLoaded, true)
})

test('view-model · ready projeta passed/warn=0 e label canônico', () => {
  const view = buildRuntimeReadinessView(readyPayload(), false, true, noopRefresh)
  assert.equal(view.status, 'ready')
  assert.equal(view.statusLabel, 'Pronto')
  assert.equal(view.criticalFailed, 0)
  assert.equal(view.warnFailed, 0)
  assert.equal(view.blockers.length, 0)
  assert.equal(view.warnings.length, 0)
  assert.equal(view.certificationHash?.length, 64)
})

test('view-model · AWIS operacional não mostra Pronto quando histórico local falha', () => {
  const ready = buildRuntimeReadinessView(readyPayload(), false, true, noopRefresh)
  const view = applyAwisOperationalHealth(ready, {
    historyHealthy: false,
    serverHealth: { status: 'degraded', dbConnected: false },
  })

  assert.equal(view.status, 'partial')
  assert.equal(view.statusLabel, 'Parcial')
  assert.equal(view.primaryBlocker, 'histórico local indisponível')
  assert.ok(view.warnings.includes('histórico local indisponível'))
  assert.ok(view.warnFailed >= 1)
})

test('view-model · AWIS operacional preserva certificação pendente e adiciona serviço local', () => {
  const blocked = buildRuntimeReadinessView(blockedPayload(), false, true, noopRefresh)
  const view = applyAwisOperationalHealth(blocked, {
    historyHealthy: true,
    serverHealth: { status: 'unavailable', dbConnected: null },
  })

  assert.equal(view.status, 'blocked')
  assert.equal(view.statusLabel, 'Certificação pendente')
  assert.equal(view.primaryBlocker, 'base operacional da missão')
  assert.ok(view.warnings.includes('serviço local indisponível'))
})

test('view-model · partial expõe warnings e label PT', () => {
  const view = buildRuntimeReadinessView(partialPayload(), false, true, noopRefresh)
  assert.equal(view.status, 'partial')
  assert.equal(view.statusLabel, 'Parcial')
  assert.equal(view.warnFailed, 1)
  assert.deepEqual(view.warnings, ['control_plane_runtime'])
  assert.equal(view.blockers.length, 0)
})

test('view-model · blocked expõe blockers + criticalFailed', () => {
  const view = buildRuntimeReadinessView(blockedPayload(), false, true, noopRefresh)
  assert.equal(view.status, 'blocked')
  assert.equal(view.statusLabel, 'Certificação pendente')
  assert.equal(view.criticalFailed, 3)
  assert.equal(view.blockers.length, 3)
  assert.ok(view.blockers.includes('mission_foundation_readiness'))
})

test('view-model · status desconhecido degrada para unavailable (defesa)', () => {
  const raw: AtlasAiRuntimeReadiness = {
    schema_version: 'atlas.ai.runtime_readiness.v1',
    status: 'martian-status-xyz',
  }
  const view = buildRuntimeReadinessView(raw, false, true, noopRefresh)
  assert.equal(view.status, 'unavailable', 'status canônico desconhecido NÃO pode poluir UI')
})

test('view-model · não vaza raw JSON na superfície pública', () => {
  // O contrato `RuntimeReadinessView` expõe campos tipados, não o objeto cru
  // direto na UI. `raw` está exposto para consumers avançados, mas a UI deve
  // consumir apenas os campos derivados (`status`, `statusLabel`, `blockers`,
  // `warnings`, `criticalFailed`, etc.).
  const view = buildRuntimeReadinessView(readyPayload(), false, true, noopRefresh)
  for (const key of ['status', 'statusLabel', 'isLoaded', 'isFetching', 'criticalFailed', 'warnFailed', 'blockers', 'warnings', 'certificationHash', 'refresh']) {
    assert.ok(key in view, `view-model deve expor ${key}`)
  }
})

test('view-model · refresh callback é exposto', () => {
  let called = false
  const view = buildRuntimeReadinessView(readyPayload(), false, true, () => {
    called = true
  })
  view.refresh()
  assert.equal(called, true)
})

/* ------------------------------------------------------------------ */
/* UX bundle (Runtime UX certification)                                */
/* ------------------------------------------------------------------ */

function bundlePayload(): AtlasAiRuntimeReadiness {
  return {
    schema_version: 'atlas.ai.runtime_readiness.v1',
    status: 'partial',
    summary: { total: 11, passed: 10, partial: 1, failed: 0, critical_failed: 0, warn_failed: 1 },
    blockers: [],
    warnings: ['control_plane_runtime'],
    certification_hash: 'd'.repeat(64),
    ux_bundle: {
      schema_version: 'atlas.ai.runtime_readiness.ux_bundle.v1',
      active_mission: {
        id: 'm-123',
        title: 'Atlas Vox V6',
        status: 'in_progress',
        mission_type: 'release',
        next_action: 'rodar voxV6Certify',
      },
      pending_approvals_count: 3,
      latest_handoff: {
        target: 'atlas_forge',
        reason: 'forge_handoff_after_obra_intake',
        status: 'dispatched',
        created_at: '2026-05-19T10:30:00+00:00',
      },
      assisted_execution: {
        schema_version: 'atlas.ai.assisted_execution.operational_ux.v1',
        status: 'ready',
        route_target: 'atlas_dev',
        flow_id: 'programming.dev',
        doctrine_gate_status: 'passed',
        selected_drivers: ['atdd', 'tdd', 'ux_driven', 'risk_driven'],
        context_memory_status: 'ready',
        context_must_keep_coverage: 1,
        areg_status: 'ready',
        areg_path: 'local_dev',
        outcome_feedback_status: 'recorded',
        aemor_feedback_status: 'ready_to_record',
        blockers: [],
        summary: 'Execucao assistida governada por AEDPDS, contexto, AREG e feedback AEMOR.',
        hash: 'f'.repeat(64),
      },
    },
  }
}

test('view-model · ux_bundle expõe activeMission/pendingApprovals/latestHandoff', () => {
  const view = buildRuntimeReadinessView(bundlePayload(), false, true, noopRefresh)
  assert.equal(view.activeMission?.id, 'm-123')
  assert.equal(view.activeMission?.title, 'Atlas Vox V6')
  assert.equal(view.activeMission?.status, 'in_progress')
  assert.equal(view.activeMission?.nextAction, 'rodar voxV6Certify')
  assert.equal(view.pendingApprovalsCount, 3)
  assert.equal(view.latestHandoff?.target, 'atlas_forge')
  assert.equal(view.latestHandoff?.isForge, true)
  assert.equal(view.latestHandoff?.isDev, false)
  assert.equal(view.assistedExecution?.doctrineGateStatus, 'passed')
  assert.deepEqual(Array.from(view.assistedExecution?.selectedDrivers ?? []), ['atdd', 'tdd', 'ux_driven', 'risk_driven'])
  assert.equal(view.assistedExecution?.aregPath, 'local_dev')
  assert.equal(view.assistedExecution?.aemorFeedbackStatus, 'ready_to_record')
})

test('view-model · bundle ausente → fields zerados (não inventa)', () => {
  const view = buildRuntimeReadinessView(readyPayload(), false, true, noopRefresh)
  assert.equal(view.activeMission, null)
  assert.equal(view.pendingApprovalsCount, 0)
  assert.equal(view.latestHandoff, null)
  assert.equal(view.assistedExecution, null)
})

test('view-model · primaryBlocker humaniza id snake_case do primeiro blocker', () => {
  const view = buildRuntimeReadinessView(blockedPayload(), false, true, noopRefresh)
  assert.equal(view.primaryBlocker, 'base operacional da missão')
})

test('view-model · primaryBlocker cai em warning se não houver blocker', () => {
  const view = buildRuntimeReadinessView(partialPayload(), false, true, noopRefresh)
  assert.equal(view.primaryBlocker, 'contexto e execução')
})

test('view-model · certificationHashShort tem 12 chars + ellipsis (display compacto)', () => {
  const view = buildRuntimeReadinessView(readyPayload(), false, true, noopRefresh)
  assert.equal(view.certificationHashShort?.length, 13)
  assert.ok(view.certificationHashShort?.endsWith('…'))
})

test('view-model · latestHandoff atlas_dev detecta isDev mas não isForge', () => {
  const raw: AtlasAiRuntimeReadiness = {
    schema_version: 'atlas.ai.runtime_readiness.v1',
    status: 'ready',
    summary: { total: 11, passed: 11, partial: 0, failed: 0, critical_failed: 0, warn_failed: 0 },
    blockers: [],
    warnings: [],
    certification_hash: 'e'.repeat(64),
    ux_bundle: {
      active_mission: null,
      pending_approvals_count: 0,
      latest_handoff: {
        target: 'atlas_dev',
        reason: 'explicit_programming_composer_contract',
        status: 'dispatched',
        created_at: '2026-05-19T11:00:00+00:00',
      },
    },
  }
  const view = buildRuntimeReadinessView(raw, false, true, noopRefresh)
  assert.equal(view.latestHandoff?.isDev, true)
  assert.equal(view.latestHandoff?.isForge, false)
})
