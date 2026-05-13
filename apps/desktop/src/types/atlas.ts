/**
 * Re-exports from @atlas/domain.
 *
 * Local types live here only when they are app-specific (UI viewmodels) and
 * shouldn't escape into the shared domain package.
 */

export type {
  CoreStatus,
  DecisionReceipt,
  Message,
  Obra,
  Packet,
  QualityGate,
  SddStage,
  Session,
} from '@atlas/domain'
