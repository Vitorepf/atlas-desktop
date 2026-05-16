import type { AtlasDevPlanRequest } from './types'

export function toAtlasDevPlanHttpBody(request: AtlasDevPlanRequest): Record<string, unknown> {
  const payload = request.payload && typeof request.payload === 'object' ? request.payload : {}
  const surfaceContext: Record<string, unknown> = {
    ...(typeof payload.surface_context === 'object' && payload.surface_context !== null
      ? (payload.surface_context as Record<string, unknown>)
      : {}),
  }

  if (request.task) surfaceContext.composer_task = request.task
  if (request.provider) surfaceContext.provider_choice = request.provider
  if (request.decision_mode) {
    surfaceContext.policy_hints = {
      ...(typeof surfaceContext.policy_hints === 'object' && surfaceContext.policy_hints !== null
        ? (surfaceContext.policy_hints as Record<string, unknown>)
        : {}),
      decision_mode: request.decision_mode,
    }
  }

  return {
    ...payload,
    surface_id: request.surface_id ?? 'atlas_desktop_ai',
    workspace: request.workspace,
    raw_intent: request.input_text,
    thread_id: request.thread_id ?? null,
    surface_context: surfaceContext,
  }
}
