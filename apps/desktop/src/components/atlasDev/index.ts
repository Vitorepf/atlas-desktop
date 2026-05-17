/**
 * Atlas Dev · Run/SSE barrel.
 *
 * Single import surface for downstream surfaces:
 *
 *   import { AtlasDevRunWorkbench, useAtlasDevRun } from '@/components/atlasDev'
 */

export { AtlasDevRunWorkbench } from './AtlasDevRunWorkbench'
export { DiffViewer } from './DiffViewer'
export { InlineIndicators } from './InlineIndicators'
export { PhaseProgress } from './PhaseProgress'
export { ReceiptCard } from './ReceiptCard'
export { RunPanel } from './RunPanel'
export { TestsPanel } from './TestsPanel'

export { useAtlasDevRun } from './useAtlasDevRun'
export type { AtlasDevRunController, AtlasDevRunSnapshot } from './useAtlasDevRun'

export {
  AtlasDevSseDecoder,
  decodeAtlasDevEvent,
  type ParsedAtlasDevSse,
  type RawSseEvent,
} from './sseParser'

export {
  cancelAtlasDevRun,
  fetchAtlasDevReadiness,
  fetchAtlasDevRunIndex,
  fetchAtlasDevRunStatus,
  runAtlasDev,
  streamAtlasDevRun,
  type StreamHandle,
  type StreamHandlers,
} from './api'

export type {
  AtlasDevReadinessCheck,
  AtlasDevReadinessResponse,
  AtlasDevCostSummary,
  AtlasDevEvidenceRef,
  AtlasDevGate,
  AtlasDevPhase,
  AtlasDevReceipt,
  AtlasDevRepairSummary,
  AtlasDevRunError,
  AtlasDevRunIndexEntry,
  AtlasDevRunIndexResponse,
  AtlasDevRunRequest,
  AtlasDevRunStatus,
  AtlasDevRunStatusResponse,
  AtlasDevSseEscalationEvent,
  AtlasDevSseEvent,
  AtlasDevSsePhaseEvent,
  AtlasDevSseReceiptEvent,
  AtlasDevSseRepairEvent,
  AtlasDevSseTestEvent,
  AtlasDevTestRun,
  CompletionState,
  PlanOnlyResult,
  ScopeGuardStatus,
  VerificationStatus,
} from './types'
