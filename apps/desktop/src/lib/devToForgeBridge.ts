/**
 * Atlas Code · Dev-to-Forge Promotion bridge (Meta 8).
 *
 * Canon:
 *   - docs/engineering-knowledge-base/atlas-ai-conversation-surface-and-atlas-dev-v1.md
 *   - docs/engineering-knowledge-base/atlas-code-programming-obras-operating-system.md
 *
 * HTTP-only for v1. Tauri parity will follow when AtlasAiSurface needs the
 * Promote button locally. In HTTP/offline mode the bridge degrades to null
 * honestly and the caller renders a "promotion endpoint unavailable" state.
 */
import type {
  AtlasCodePromotionCandidate,
  AtlasCodePromotionPayloadOverrides,
  AtlasCodePromotionPreview,
  AtlasCodePromotionSignalReport,
  AtlasCodePromotionTarget,
} from '@atlas/domain'

type FetchJson = <T>(path: string, init?: { method?: string; body?: unknown }) => Promise<T>

export interface DevToForgeBridge {
  previewPromotion: (
    threadId: string,
    workspaceSlug?: string | null
  ) => Promise<AtlasCodePromotionPreview | null>
  promoteThread: (
    threadId: string,
    target: AtlasCodePromotionTarget,
    options?: {
      workspaceSlug?: string | null
      overrides?: AtlasCodePromotionPayloadOverrides
    }
  ) => Promise<AtlasCodePromotionCandidate | null>
  listCandidates: (workspaceSlug?: string | null) => Promise<AtlasCodePromotionCandidate[]>
  showCandidate: (candidateId: string) => Promise<AtlasCodePromotionCandidate | null>
  dismissCandidate: (
    candidateId: string,
    reason?: string
  ) => Promise<AtlasCodePromotionCandidate | null>
}

export function createDevToForgeBridge(fetchJson: FetchJson | null): DevToForgeBridge {
  const wrap = async <T>(label: string, fn: () => Promise<T>): Promise<T | null> => {
    if (!fetchJson) return null
    try {
      return await fn()
    } catch (e) {
      console.warn(`[devToForgeBridge] ${label}`, e)
      return null
    }
  }

  return {
    async previewPromotion(threadId, workspaceSlug) {
      return wrap('previewPromotion', async () => {
        const qs = workspaceSlug ? `?workspace=${encodeURIComponent(workspaceSlug)}` : ''
        const raw = await fetchJson!<{ preview: unknown }>(
          `/atlas-code/dev-to-forge/threads/${encodeURIComponent(threadId)}/promotion-preview${qs}`
        )
        return adaptPreview(raw.preview)
      })
    },

    async promoteThread(threadId, target, options = {}) {
      return wrap('promoteThread', async () => {
        const body: Record<string, unknown> = { promotion_target: target }
        if (options.workspaceSlug) body.workspace_slug = options.workspaceSlug
        if (options.overrides) body.overrides = camelToSnakeOverrides(options.overrides)
        const raw = await fetchJson!<{ candidate: unknown }>(
          `/atlas-code/dev-to-forge/threads/${encodeURIComponent(threadId)}/promote`,
          { method: 'POST', body }
        )
        return adaptCandidate(raw.candidate)
      })
    },

    async listCandidates(workspaceSlug) {
      if (!fetchJson) return []
      try {
        const qs = workspaceSlug ? `?workspace=${encodeURIComponent(workspaceSlug)}` : ''
        const raw = await fetchJson<{ data?: unknown[] }>(
          `/atlas-code/dev-to-forge/candidates${qs}`
        )
        return (raw.data ?? [])
          .map((item) => adaptCandidate(item))
          .filter((c): c is AtlasCodePromotionCandidate => c !== null)
      } catch (e) {
        console.warn('[devToForgeBridge] listCandidates', e)
        return []
      }
    },

    async showCandidate(candidateId) {
      return wrap('showCandidate', async () => {
        const raw = await fetchJson!<{ candidate: unknown }>(
          `/atlas-code/dev-to-forge/candidates/${encodeURIComponent(candidateId)}`
        )
        return adaptCandidate(raw.candidate)
      })
    },

    async dismissCandidate(candidateId, reason) {
      return wrap('dismissCandidate', async () => {
        const body: Record<string, unknown> = {}
        if (reason !== undefined) body.reason = reason
        const raw = await fetchJson!<{ candidate: unknown }>(
          `/atlas-code/dev-to-forge/candidates/${encodeURIComponent(candidateId)}/dismiss`,
          { method: 'POST', body }
        )
        return adaptCandidate(raw.candidate)
      })
    },
  }
}

// ────────────────────────────────────────────────────────────────────────
// Adapters — snake_case ↔ camelCase + honest fallbacks.

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}
function asNullableString(v: unknown): string | null {
  return typeof v === 'string' && v !== '' ? v : null
}
function asNumber(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}
function asBool(v: unknown, fallback = false): boolean {
  return typeof v === 'boolean' ? v : fallback
}
function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === 'string' && x.trim() !== '')
}

function asTarget(v: unknown): AtlasCodePromotionTarget {
  const s = asString(v, 'none')
  return s === 'quick_intervention' || s === 'obra_candidate' || s === 'forge_obra'
    ? s
    : 'none'
}

function adaptSignalReport(raw: unknown): AtlasCodePromotionSignalReport {
  if (!raw || typeof raw !== 'object') {
    return {
      schemaVersion: 'atlas.code.dev_to_forge.signal_report.v1',
      threadId: '',
      workspaceSlug: null,
      messageCount: 0,
      score: 0,
      reasons: [],
      recommendedTarget: 'none',
      signals: {},
      detectedFiles: [],
      detectedAt: '',
    }
  }
  const r = raw as Record<string, unknown>
  return {
    schemaVersion: asString(r.schema_version, 'atlas.code.dev_to_forge.signal_report.v1'),
    threadId: asString(r.thread_id),
    workspaceSlug: asNullableString(r.workspace_slug),
    messageCount: asNumber(r.message_count),
    score: asNumber(r.score),
    reasons: asStringArray(r.reasons),
    recommendedTarget: asTarget(r.recommended_target),
    signals: (r.signals ?? {}) as Record<string, unknown>,
    detectedFiles: asStringArray(r.detected_files),
    detectedAt: asString(r.detected_at),
  }
}

function adaptPreview(raw: unknown): AtlasCodePromotionPreview | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  return {
    schemaVersion: asString(r.schema_version, 'atlas.code.dev_to_forge.promotion_candidate.v1'),
    id: asNullableString(r.id),
    sourceThreadId: asString(r.source_thread_id),
    workspaceSlug: asString(r.workspace_slug, 'atlas'),
    workspaceName: asNullableString(r.workspace_name),
    workspaceProductionStatus: asNullableString(r.workspace_production_status),
    workspaceDefaultRisk: asNullableString(r.workspace_default_risk),
    workspacePath: asNullableString(r.workspace_path),
    title: asString(r.title),
    objective: asString(r.objective),
    contextSummary: asString(r.context_summary),
    knownFiles: asStringArray(r.known_files),
    risks: asStringArray(r.risks),
    openQuestions: asStringArray(r.open_questions),
    suggestedSuccessCriteria: asStringArray(r.suggested_success_criteria),
    suggestedNextStep: asString(r.suggested_next_step),
    promotionTarget: asTarget(r.promotion_target),
    signalReport: adaptSignalReport(r.signal_report),
    reasons: asStringArray(r.reasons),
    signals: (r.signals ?? {}) as Record<string, unknown>,
    messageCount: asNumber(r.message_count),
    previewOnly: asBool(r.preview_only, true),
    candidateStatus: asString(r.candidate_status, 'preview'),
    promotedObraId: asNullableString(r.promoted_obra_id),
    promotedAt: asNullableString(r.promoted_at),
    generatedAt: asString(r.generated_at),
  }
}

function adaptCandidate(raw: unknown): AtlasCodePromotionCandidate | null {
  const preview = adaptPreview(raw)
  if (preview === null) return null
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  return {
    ...preview,
    candidateStatus: asString(r.candidate_status, 'pending_decision') as
      | 'pending_decision'
      | 'promoted'
      | 'dismissed'
      | string,
    decidedAt: asNullableString(r.decided_at),
    decisionReason: asNullableString(r.decision_reason),
  }
}

function camelToSnakeOverrides(
  overrides: AtlasCodePromotionPayloadOverrides
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (overrides.title !== undefined) out.title = overrides.title
  if (overrides.objective !== undefined) out.objective = overrides.objective
  if (overrides.contextSummary !== undefined) out.context_summary = overrides.contextSummary
  if (overrides.knownFiles !== undefined) out.known_files = overrides.knownFiles
  if (overrides.risks !== undefined) out.risks = overrides.risks
  if (overrides.openQuestions !== undefined) out.open_questions = overrides.openQuestions
  if (overrides.suggestedSuccessCriteria !== undefined)
    out.suggested_success_criteria = overrides.suggestedSuccessCriteria
  if (overrides.suggestedNextStep !== undefined)
    out.suggested_next_step = overrides.suggestedNextStep
  return out
}
