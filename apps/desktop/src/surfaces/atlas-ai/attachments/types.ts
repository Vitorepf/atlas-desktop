/**
 * Atlas AI · Attachment types.
 *
 * Tipos canônicos do fluxo de attachments do Desktop. Cobrem 5 famílias:
 *   - image   (PNG, JPEG, WebP, GIF) — redimensionada/comprimida client-side
 *   - pdf     (application/pdf)        — texto extraído + thumbnail primeira página
 *   - text    (txt/md/csv/json/log)    — conteúdo lido inline
 *   - code    (extensão de linguagem)  — Shiki preview + envio como text
 *   - url     (YouTube/Vimeo/web)      — metadata oEmbed quando possível
 *
 * Cada attachment passa por 4 estados:
 *   pending → processing → ready → uploading → uploaded (ou error)
 *
 * NUNCA enviamos base64 inline (cap de 20MB / 8 imgs / 4 docs do backend
 * exige chunked upload). O draft fica local até o operator clicar enviar,
 * aí o uploader chunked sobe o asset e devolve um `uploaded_id` que vai
 * dentro do payload AtlasAiInteractionRequest.
 */

export type AttachmentKind = 'image' | 'pdf' | 'text' | 'code' | 'url'

export type AttachmentStatus =
  | 'pending'      // recém adicionado, ainda não processado
  | 'processing'   // resize, parse PDF, fetch oEmbed
  | 'ready'        // pronto para upload (preview disponível)
  | 'uploading'    // chunked upload em curso
  | 'uploaded'     // upload concluído, com `uploadedId`
  | 'error'        // falhou em alguma etapa

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
  /** preview data: URL para thumbnail no draft */
  previewDataUrl: string
  /** binary blob a enviar — pode ser compressed */
  blob: Blob
  width: number
  height: number
  /** se a compressão reduziu, mantemos o original-size para audit */
  originalSize: number
  source: 'paste' | 'drop' | 'picker' | 'camera'
}

export interface PdfAttachment extends AttachmentBase {
  kind: 'pdf'
  blob: Blob
  pageCount: number
  /** primeira página renderizada como data URL */
  thumbnailDataUrl: string | null
  /** texto extraído (pode ser parcial em PDFs gigantes) */
  extractedText: string
  /** ~ caracteres do texto extraído */
  textLength: number
  source: 'drop' | 'picker'
}

export interface TextAttachment extends AttachmentBase {
  kind: 'text'
  blob: Blob
  /** conteúdo textual completo (até MAX_TEXT_PREVIEW chars) */
  content: string
  /** linguagem detectada por extensão para syntax highlight no preview */
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
  /** URL completa */
  url: string
  /** tipo refinado: youtube | vimeo | github | generic */
  urlKind: 'youtube' | 'vimeo' | 'github' | 'generic'
  /** título do oEmbed quando disponível */
  title: string | null
  /** thumbnail do oEmbed (URL pública, não blob) */
  thumbnailUrl: string | null
  /** autor / canal */
  author: string | null
  /** duração para vídeo (segundos) */
  durationSec: number | null
  /** id parseado: videoId YouTube/Vimeo, repo slug GitHub */
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
  maxImageBytes: 20 * 1024 * 1024, // 20MB
  maxPdfBytes: 20 * 1024 * 1024,
  maxTextBytes: 4 * 1024 * 1024,   // 4MB de texto (proteção memória)
  maxTextPreviewChars: 200_000,
  maxImageDimension: 2048,         // px lado maior após resize
  imageJpegQuality: 0.86,
  imageWebpQuality: 0.86,
  chunkSize: 1.5 * 1024 * 1024,    // 1.5MB chunk upload
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

/** Mapeamento extensão → linguagem Shiki para code attachments. */
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
