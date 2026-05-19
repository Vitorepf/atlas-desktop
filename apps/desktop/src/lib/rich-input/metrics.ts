/**
 * Atlas Rich Input · metrics + summary helpers (desktop re-export from canon).
 *
 * Implementation lives in `packages/atlas-rich-input-canon`. The canon
 * exposes both singular kind keys (`image`, `pdf`, `text`, `code`, `url`)
 * AND plural aliases (`images`, `pdfs`, `urls`) + `total`, so historic
 * desktop call sites that read `summary.images` / `summary.total` keep
 * working. New code should prefer the singular keys (more granular —
 * separates `code` from `text`).
 */
export type {
  RichInputDraftSummary,
  RichInputDraftSummaryDisplay,
} from '@atlas/rich-input-canon'
export {
  estimateRichInputTokens,
  summarizeRichInputDrafts,
  formatRichInputSummary,
} from '@atlas/rich-input-canon'

/** @deprecated alias kept for any existing desktop import. Use
 *  `RichInputDraftSummary` from the canon (`@atlas/rich-input-canon`). */
export type { RichInputDraftSummary as AtlasRichInputDraftSummary } from '@atlas/rich-input-canon'
