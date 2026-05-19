/**
 * Atlas AI · Desktop · Runtime Status Pill contract.
 *
 * Testa a LÓGICA do pill (label, gating de renderização) via funções puras
 * derivadas do view-model. NÃO renderiza JSX — o objetivo é provar:
 *
 *   1. Pill NÃO renderiza quando o runtime está `unavailable` (silent fail)
 *      → ready state não polui o composer/header.
 *   2. Pill NÃO renderiza no primeiro loading (antes do isLoaded).
 *   3. Label mostra blocker primário, NÃO mostra JSON bruto.
 *   4. Label mostra missão ativa quando readiness=ready + bundle presente.
 *   5. Approvals badge só aparece quando count > 0.
 *   6. Handoff Dev/Forge glyph reflete o backend, sem inventar.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { buildRuntimeReadinessView } from '../runtimeReadinessView.ts'
import type { AtlasAiRuntimeReadiness } from '../types.ts'

const noopRefresh = (): void => {}

/* Funções derivadas — espelham o que o componente renderiza, isoladas
   da lib React para teste sem renderer. */

function shouldRenderPill(view: ReturnType<typeof buildRuntimeReadinessView>): boolean {
  if (view.status === 'loading' && !view.isLoaded) return false
  if (view.status === 'unavailable') return false
  return true
}

function pillLabelFor(view: ReturnType<typeof buildRuntimeReadinessView>): string {
  if (view.status === 'loading') return 'verificando runtime…'
  if (view.status === 'unavailable') return 'runtime indisponível'
  if (view.status === 'blocked' && view.primaryBlocker) return `bloqueado · ${view.primaryBlocker}`
  if (view.status === 'partial' && view.primaryBlocker) return `parcial · ${view.primaryBlocker}`
  if (view.activeMission) return `missão · ${view.activeMission.title}`
  return 'Atlas pronto'
}

/* ------------------------------------------------------------------ */
/* Tests                                                               */
/* ------------------------------------------------------------------ */

test('pill · NÃO renderiza quando runtime unavailable (silent fail preserva composer)', () => {
  const view = buildRuntimeReadinessView(null, false, true, noopRefresh)
  assert.equal(view.status, 'unavailable')
  assert.equal(shouldRenderPill(view), false, 'unavailable não pode poluir o header')
})

test('pill · NÃO renderiza durante primeiro loading antes do isLoaded', () => {
  const view = buildRuntimeReadinessView(null, true, false, noopRefresh)
  assert.equal(view.status, 'loading')
  assert.equal(shouldRenderPill(view), false)
})

test('pill · renderiza quando ready (não polui, mostra "Atlas pronto" leve)', () => {
  const raw: AtlasAiRuntimeReadiness = {
    schema_version: 'atlas.ai.runtime_readiness.v1',
    status: 'ready',
    summary: { total: 11, passed: 11, partial: 0, failed: 0, critical_failed: 0, warn_failed: 0 },
    blockers: [],
    warnings: [],
    certification_hash: 'f'.repeat(64),
  }
  const view = buildRuntimeReadinessView(raw, false, true, noopRefresh)
  assert.equal(shouldRenderPill(view), true)
  assert.equal(pillLabelFor(view), 'Atlas pronto')
})

test('pill · label de blocked humaniza id snake_case (não vaza technical key crua)', () => {
  const raw: AtlasAiRuntimeReadiness = {
    schema_version: 'atlas.ai.runtime_readiness.v1',
    status: 'blocked',
    summary: { total: 11, passed: 8, partial: 0, failed: 3, critical_failed: 3, warn_failed: 0 },
    blockers: ['mission_foundation_readiness', 'router_runtime_readiness'],
    warnings: [],
    certification_hash: 'a'.repeat(64),
  }
  const view = buildRuntimeReadinessView(raw, false, true, noopRefresh)
  const label = pillLabelFor(view)
  assert.equal(label, 'bloqueado · mission foundation readiness')
  assert.ok(!label.includes('_'), 'label não pode conter snake_case técnico')
  assert.ok(!label.includes('{'), 'label não pode vazar JSON')
})

test('pill · label expõe missão ativa quando bundle presente e status ready', () => {
  const raw: AtlasAiRuntimeReadiness = {
    schema_version: 'atlas.ai.runtime_readiness.v1',
    status: 'ready',
    summary: { total: 11, passed: 11, partial: 0, failed: 0, critical_failed: 0, warn_failed: 0 },
    blockers: [],
    warnings: [],
    certification_hash: 'b'.repeat(64),
    ux_bundle: {
      active_mission: {
        id: 'm-1',
        title: 'Vox V6 release',
        status: 'in_progress',
        mission_type: 'release',
        next_action: null,
      },
      pending_approvals_count: 0,
      latest_handoff: null,
    },
  }
  const view = buildRuntimeReadinessView(raw, false, true, noopRefresh)
  assert.equal(pillLabelFor(view), 'missão · Vox V6 release')
})

test('pill · approvals badge só aparece quando count > 0', () => {
  const zero = buildRuntimeReadinessView(
    {
      status: 'ready',
      summary: { total: 11, passed: 11, partial: 0, failed: 0, critical_failed: 0, warn_failed: 0 },
      blockers: [], warnings: [],
      certification_hash: 'c'.repeat(64),
      ux_bundle: { active_mission: null, pending_approvals_count: 0, latest_handoff: null },
    },
    false, true, noopRefresh,
  )
  assert.equal(zero.pendingApprovalsCount, 0)

  const three = buildRuntimeReadinessView(
    {
      status: 'partial',
      summary: { total: 11, passed: 10, partial: 1, failed: 0, critical_failed: 0, warn_failed: 1 },
      blockers: [], warnings: ['control_plane_runtime'],
      certification_hash: 'd'.repeat(64),
      ux_bundle: { active_mission: null, pending_approvals_count: 3, latest_handoff: null },
    },
    false, true, noopRefresh,
  )
  assert.equal(three.pendingApprovalsCount, 3)
})

test('pill · handoff glyph reflete backend (dev vs forge) sem inventar', () => {
  const forge = buildRuntimeReadinessView(
    {
      status: 'ready',
      summary: { total: 11, passed: 11, partial: 0, failed: 0, critical_failed: 0, warn_failed: 0 },
      blockers: [], warnings: [],
      certification_hash: 'e'.repeat(64),
      ux_bundle: {
        active_mission: null, pending_approvals_count: 0,
        latest_handoff: { target: 'atlas_forge', reason: '...', status: 'dispatched', created_at: null },
      },
    },
    false, true, noopRefresh,
  )
  assert.equal(forge.latestHandoff?.isForge, true)
  assert.equal(forge.latestHandoff?.isDev, false)

  const dev = buildRuntimeReadinessView(
    {
      status: 'ready',
      summary: { total: 11, passed: 11, partial: 0, failed: 0, critical_failed: 0, warn_failed: 0 },
      blockers: [], warnings: [],
      certification_hash: 'f'.repeat(64),
      ux_bundle: {
        active_mission: null, pending_approvals_count: 0,
        latest_handoff: { target: 'atlas_dev', reason: '...', status: 'dispatched', created_at: null },
      },
    },
    false, true, noopRefresh,
  )
  assert.equal(dev.latestHandoff?.isDev, true)
  assert.equal(dev.latestHandoff?.isForge, false)
})

test('pill · view-model NÃO expõe o objeto cru do backend no label/handoff', () => {
  const raw: AtlasAiRuntimeReadiness = {
    schema_version: 'atlas.ai.runtime_readiness.v1',
    status: 'partial',
    summary: { total: 11, passed: 10, partial: 1, failed: 0, critical_failed: 0, warn_failed: 1 },
    blockers: [],
    warnings: ['control_plane_runtime'],
    certification_hash: 'a'.repeat(64),
    ux_bundle: {
      active_mission: { id: 'm-1', title: 'X', status: 's', mission_type: 't', next_action: 'n' },
      pending_approvals_count: 2,
      latest_handoff: { target: 'atlas_forge', reason: 'r', status: 's', created_at: null },
    },
  }
  const view = buildRuntimeReadinessView(raw, false, true, noopRefresh)
  // O label é sempre string canônica, nunca o objeto.
  assert.equal(typeof pillLabelFor(view), 'string')
  // Campos derivados são tipados, não passam o objeto raw direto.
  assert.equal(typeof view.activeMission?.title, 'string')
  assert.equal(typeof view.latestHandoff?.target, 'string')
  assert.equal(typeof view.pendingApprovalsCount, 'number')
})
