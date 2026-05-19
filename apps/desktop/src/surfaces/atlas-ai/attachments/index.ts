/**
 * Atlas Unified Rich Input Runtime · back-compat public barrel.
 *
 * The CANONICAL home for the rich-input capability is
 * `src/lib/rich-input/` (Atlas Unified Rich Input Runtime). This barrel and
 * the sibling files in this directory are thin re-export shims so Atlas AI
 * callers that historically imported from
 * `surfaces/atlas-ai/attachments/*` keep working with zero churn.
 *
 * New callers (Atlas Code/Forge, Atlas Dev composer, future mobile parity)
 * SHOULD import from `@/lib/rich-input` directly. Importing from this
 * barrel is acceptable because the function/constant references are
 * identical (proven by `richInputCanonicalIdentity.test.ts`).
 *
 * Hard rules enforced by `atlasAiRichInputRuntime.test.ts`:
 *
 *   1. No surface other than `atlas-ai` carries its own `attachments/`
 *      folder — that would split the capability and re-create the
 *      per-surface duplication the runtime exists to prevent.
 *   2. The capability stays Hyperflow-neutral: callers may choose how to
 *      use the uploaded ids (`/ai/interactions`, `/works/{project}/...`,
 *      etc.) but never re-implement the chunked uploader, image processor,
 *      PDF parser or URL classifier.
 *   3. `ATTACHMENT_LIMITS` is the single source of truth for client-side
 *      caps; backend enforcement lives in `AiInteractionController` and
 *      must stay aligned (the test pins exact numbers).
 *   4. New rich-input families land in `lib/rich-input/` first — never
 *      inside a surface.
 *
 * Out of scope:
 *   - provider invocation;
 *   - benchmark / rivals;
 *   - TEOS continuity packs (orthogonal).
 */

export {
  ATTACHMENT_LIMITS,
  CODE_LANG_BY_EXT,
  detectLanguageFromFilename,
  SUPPORTED_IMAGE_MIME,
  SUPPORTED_PDF_MIME,
  SUPPORTED_TEXT_MIME_PREFIXES,
} from './types'

export type {
  AttachmentBase,
  AttachmentDraft,
  AttachmentKind,
  AttachmentStatus,
  CodeAttachment,
  ImageAttachment,
  PdfAttachment,
  TextAttachment,
  UrlAttachment,
} from './types'

export { chunkedUploadAsset } from './chunkedUploader'
export type { ChunkedUploadOptions, UploadKind } from './chunkedUploader'

export { processImage } from './imageProcessor'
export type { ProcessedImage } from './imageProcessor'

export { processPdf } from './pdfProcessor'
export type { ProcessedPdf } from './pdfProcessor'

export {
  classifyUrl,
  extractUrls,
  fetchUrlMetadata,
} from './urlDetector'
export type { DetectedUrl, DetectedUrlKind, UrlMetadata } from './urlDetector'

export { useAtlasAiAttachments } from './useAtlasAiAttachments'
export type { UploadOutput } from './useAtlasAiAttachments'
