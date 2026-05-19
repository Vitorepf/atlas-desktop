/**
 * Atlas AI attachments — back-compat shim.
 *
 * Canonical location: `src/lib/rich-input/types.ts` (Atlas Unified Rich Input
 * Runtime). This file exists so that pre-existing imports from
 * `surfaces/atlas-ai/attachments/types` keep working without touching every
 * caller. New callers should import from `@/lib/rich-input` directly.
 */
export * from '../../../lib/rich-input/types'
