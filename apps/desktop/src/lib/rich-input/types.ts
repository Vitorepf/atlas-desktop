/**
 * Atlas Unified Rich Input Runtime · canonical types.
 *
 * The Atlas Rich Input capability owns the operator-input substrate shared by
 *   - Atlas AI conversation surface
 *   - Atlas Forge / Obras intake (future)
 *   - Atlas Dev composer (future)
 *   - Atlas mobile (future)
 *
 * Five attachment families (image / pdf / text / code / url) flow through the
 * same 4-state machine (`pending → processing → ready → uploading → uploaded`
 * or `error`). The shared layer never embeds itself into one surface — every
 * caller gets the same hook + types + processors and ships its own UI.
 *
 * NEVER inline base64 (cap 20MB / 8 imgs / 4 docs no backend). Drafts stay
 * local until the operator confirms, then chunkedUploadAsset uploads each one
 * and returns the canonical `uploaded_id` consumed by AtlasAi/Forge/Dev
 * interaction payloads.
 *
 * Schema canon for the final outbound payload: see `AtlasRichInputPayload`.
 */

export type AttachmentKind = 'image' | 'pdf' | 'text' | 'code' | 'url'

export type AttachmentStatus =
  | 'pending'
  | 'processing'
  | 'ready'
  | 'uploading'
  | 'uploaded'
  | 'error'

export interface AttachmentBase {
  id: string
  kind: AttachmentKind
  status: AttachmentStatus
  fileName: string
  /** bytes — para imagem é após compressão; para url é 0 */
  size: number
  mimeType: string
  createdAt: number
  error: string | null
  progress: number // 0..1
  uploadedId: string | null
}

export interface ImageAttachment extends AttachmentBase {
  kind: 'image'
  previewDataUrl: string
  blob: Blob
  width: number
  height: number
  originalSize: number
  source: 'paste' | 'drop' | 'picker' | 'camera'
}

export interface PdfAttachment extends AttachmentBase {
  kind: 'pdf'
  blob: Blob
  pageCount: number
  thumbnailDataUrl: string | null
  extractedText: string
  textLength: number
  source: 'drop' | 'picker'
}

export interface TextAttachment extends AttachmentBase {
  kind: 'text'
  blob: Blob
  content: string
  language: string | null
  source: 'drop' | 'picker' | 'paste'
}

export interface CodeAttachment extends AttachmentBase {
  kind: 'code'
  blob: Blob
  content: string
  language: string
  source: 'drop' | 'picker' | 'paste'
}

export interface UrlAttachment extends AttachmentBase {
  kind: 'url'
  url: string
  urlKind: 'youtube' | 'vimeo' | 'github' | 'generic'
  title: string | null
  thumbnailUrl: string | null
  author: string | null
  durationSec: number | null
  refId: string | null
  source: 'paste' | 'manual'
}

export type AttachmentDraft =
  | ImageAttachment
  | PdfAttachment
  | TextAttachment
  | CodeAttachment
  | UrlAttachment

/** Limites alinhados com backend (AiInteractionController). */
export const ATTACHMENT_LIMITS = {
  maxImages: 8,
  maxPdfs: 4,
  maxTextFiles: 8,
  maxUrls: 16,
  maxImageBytes: 20 * 1024 * 1024,
  maxPdfBytes: 20 * 1024 * 1024,
  maxTextBytes: 4 * 1024 * 1024,
  maxTextPreviewChars: 200_000,
  maxImageDimension: 2048,
  imageJpegQuality: 0.86,
  imageWebpQuality: 0.86,
  chunkSize: 1.5 * 1024 * 1024,
} as const

export const SUPPORTED_IMAGE_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
])

export const SUPPORTED_PDF_MIME = new Set(['application/pdf'])

export const SUPPORTED_TEXT_MIME_PREFIXES = ['text/', 'application/json', 'application/xml']

export const CODE_LANG_BY_EXT: Record<string, string> = {
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'jsx',
  mjs: 'javascript',
  cjs: 'javascript',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  go: 'go',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  h: 'c',
  cs: 'csharp',
  php: 'php',
  swift: 'swift',
  kt: 'kotlin',
  scala: 'scala',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  fish: 'bash',
  sql: 'sql',
  html: 'html',
  htm: 'html',
  xml: 'xml',
  css: 'css',
  scss: 'css',
  less: 'css',
  md: 'markdown',
  yml: 'yaml',
  yaml: 'yaml',
  toml: 'toml',
  json: 'json',
  jsonc: 'json',
  vue: 'vue',
  svelte: 'svelte',
  dart: 'dart',
  lua: 'lua',
  ex: 'elixir',
  exs: 'elixir',
  erl: 'erlang',
  elm: 'elm',
  hs: 'haskell',
  ml: 'ocaml',
  zig: 'zig',
  diff: 'diff',
  patch: 'diff',
  conf: 'ini',
  ini: 'ini',
  env: 'bash',
  dockerfile: 'docker',
}

export function detectLanguageFromFilename(name: string): string | null {
  const lower = name.toLowerCase()
  if (lower === 'dockerfile' || lower.endsWith('/dockerfile')) return 'docker'
  if (lower === 'makefile') return 'makefile'
  const ext = lower.split('.').pop() ?? ''
  return CODE_LANG_BY_EXT[ext] ?? null
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Canonical outbound payload contract: `atlas.rich_input.payload.v1`.    */
/* ──────────────────────────────────────────────────────────────────────── */

export const ATLAS_RICH_INPUT_PAYLOAD_SCHEMA = 'atlas.rich_input.payload.v1' as const

export interface AtlasRichInputUrlAttachmentPayload {
  url: string
  kind: string
  title: string | null
  author: string | null
  duration_sec: number | null
  thumbnail_url: string | null
  ref_id: string | null
}

export interface AtlasRichInputTextBlockPayload {
  file_name: string
  mime_type: string
  language: string | null
  content: string
  /** Anexamos page_count quando a fonte foi PDF — caller ignora se irrelevante. */
  page_count?: number
}

/**
 * Source manifest entry — describes each attached artifact in a typed shape
 * that any consumer (Atlas AI, Forge, Dev) can audit. The manifest is built
 * from the same drafts that produced uploaded_*_ids / text_blocks /
 * url_attachments, so it stays in lockstep with the outbound payload.
 */
export interface AtlasRichInputSourceManifestEntry {
  id: string
  kind: AttachmentKind
  file_name: string
  mime_type: string
  size: number
  uploaded_id: string | null
  /**
   * SHA-256 of the source bytes — present when the bridge already computed it
   * (chunkedUploader complete-response may carry it). Otherwise `null` and
   * downstream callers either compute it or treat the artifact as
   * non-verifiable. The field exists so future callers can route content-hash
   * checks through the payload without a schema bump.
   */
  source_hash: string | null
  source: string
}

/**
 * `atlas.rich_input.payload.v1` — the canonical outbound shape that every
 * Atlas surface emits when forwarding attachments + URLs to the backend.
 *
 * Today only `uploaded_image_ids`, `uploaded_document_ids`, `text_blocks` and
 * `url_attachments` are consumed by the backend. `source_manifest` + `hashes`
 * are forward-compatible additions: callers MAY populate them today, and
 * future Atlas surfaces (Forge intake, Atlas Dev workspace bundles) MUST.
 */
export interface AtlasRichInputPayload {
  schema_version: typeof ATLAS_RICH_INPUT_PAYLOAD_SCHEMA
  uploaded_image_ids: string[]
  uploaded_document_ids: string[]
  text_blocks: AtlasRichInputTextBlockPayload[]
  url_attachments: AtlasRichInputUrlAttachmentPayload[]
  source_manifest: AtlasRichInputSourceManifestEntry[]
  hashes?: {
    /** Hex sha256 covering the canonical serialization of the manifest. */
    manifest_sha256?: string
  }
}
