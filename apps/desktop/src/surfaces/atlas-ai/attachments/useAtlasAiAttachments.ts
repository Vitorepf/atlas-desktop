/**
 * Atlas AI attachments — back-compat shim.
 *
 * Canonical location: `src/lib/rich-input/useAtlasRichInputAttachments.ts`
 * (Atlas Unified Rich Input Runtime). Atlas AI conversation surface continua
 * importando `useAtlasAiAttachments` deste path; chamada e referência apontam
 * para a função compartilhada — não é cópia local.
 *
 * Novos callers (Forge/Obras, Atlas Dev, mobile) devem importar diretamente
 * de `@/lib/rich-input` (`useAtlasRichInputAttachments`).
 */
export {
  useAtlasRichInputAttachments as useAtlasAiAttachments,
} from '../../../lib/rich-input/useAtlasRichInputAttachments'
export type {
  AtlasRichInputAttachmentsApi as AtlasAiAttachmentsApi,
  UploadOutput,
} from '../../../lib/rich-input/useAtlasRichInputAttachments'
