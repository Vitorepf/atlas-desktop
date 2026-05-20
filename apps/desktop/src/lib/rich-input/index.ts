/**
 * Atlas Unified Rich Input Runtime · public barrel.
 *
 * Capability compartilhada: Atlas AI, Forge/Obras, Dev e (futuro) mobile
 * importam aqui. NÃO usar copy-paste local.
 *
 * Schema canon do payload outbound: `atlas.rich_input.payload.v1`
 * (ver `AtlasRichInputPayload` em `./types`).
 */
export * from './types'
export * from './urlDetector'
export * from './imageProcessor'
export * from './pdfProcessor'
export * from './chunkedUploader'
export * from './useAtlasRichInputAttachments'
export * from './metrics'
export {
  ATLAS_COMPUTE_EFFORT_OPTIONS,
  atlasComputeEffortForPayload,
  labelAtlasComputeEffortShort,
  normalizeAtlasComputeEffort,
  type AtlasComputeEffortChoice,
  type AtlasComputeEffortLevel,
} from '@atlas/rich-input-canon'
