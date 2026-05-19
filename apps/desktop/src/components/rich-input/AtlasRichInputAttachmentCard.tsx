/**
 * Atlas Unified Rich Input Runtime · attachment card (canonical re-export).
 *
 * The visual tile that renders an `AttachmentDraft` lives in
 * `surfaces/atlas-ai/components/AtlasAiAttachmentCard.tsx` for historical
 * reasons (was born with Atlas AI). To honor the canonical-import principle
 * — every Atlas surface should reach for `components/rich-input/*` instead
 * of `surfaces/atlas-ai/components/*` — we expose the SAME component here.
 *
 * Future consumers (Forge intake, Atlas Dev composer, mobile) MUST import
 * from `@/components/rich-input/AtlasRichInputAttachmentCard`.
 */
export { AtlasAiAttachmentCard as AtlasRichInputAttachmentCard } from '../../surfaces/atlas-ai/components/AtlasAiAttachmentCard'
