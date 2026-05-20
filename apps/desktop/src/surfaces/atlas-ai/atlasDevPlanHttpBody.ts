import type { AtlasDevPlanRequest } from './types'
import { atlasComputeEffortForPayload, normalizeAtlasComputeEffort } from '../../lib/rich-input'

export function toAtlasDevPlanHttpBody(request: AtlasDevPlanRequest): Record<string, unknown> {
  const payload = request.payload && typeof request.payload === 'object' ? request.payload : {}
  const surfaceContext: Record<string, unknown> = {
    ...(typeof payload.surface_context === 'object' && payload.surface_context !== null
      ? (payload.surface_context as Record<string, unknown>)
      : {}),
  }
  const policyHints: Record<string, unknown> = {
    ...(typeof payload.policy_hints === 'object' && payload.policy_hints !== null
      ? (payload.policy_hints as Record<string, unknown>)
      : {}),
  }

  if (!surfaceContext.composer_mode) surfaceContext.composer_mode = 'programming'
  if (request.task) surfaceContext.composer_task = request.task
  if (request.provider) surfaceContext.provider_choice = request.provider
  if (request.compute_effort) surfaceContext.composer_compute_effort = normalizeAtlasComputeEffort(request.compute_effort)
  if (request.decision_mode) policyHints.decision_mode = request.decision_mode
  const requestedComputeEffort = atlasComputeEffortForPayload(request.compute_effort)
  if (requestedComputeEffort) {
    policyHints.compute_effort = requestedComputeEffort
    surfaceContext.compute_effort = requestedComputeEffort
  }

  return {
    ...payload,
    surface_id: request.surface_id ?? 'atlas_desktop_ai',
    workspace: request.workspace,
    raw_intent: request.input_text,
    thread_id: request.thread_id ?? null,
    policy_hints: policyHints,
    surface_context: surfaceContext,
  }
}
