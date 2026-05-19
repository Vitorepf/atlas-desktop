/**
 * Atlas Rich Input · attachments hook.
 *
 * Canonical operator-input substrate shared by Atlas AI / Forge / Dev / mobile.
 * Centraliza:
 *   - lista de drafts (imagens, PDFs, texto, código, URLs)
 *   - addFiles, addUrl, addPasteImage, remove, clear
 *   - uploadAll → atlas.rich_input.payload.v1 canônico
 *
 * Atlas AI conversation surface importa este hook (não tem cópia local).
 * Re-export `useAtlasAiAttachments` permanece em `surfaces/atlas-ai/attachments/
 * useAtlasAiAttachments.ts` apontando para esta função.
 */
import { useCallback, useState } from 'react'
import { buildSourceManifestFromDrafts } from '@atlas/rich-input-canon'
import { chunkedUploadAsset } from './chunkedUploader'
import { processImage } from './imageProcessor'
import { processPdf } from './pdfProcessor'
import {
  ATLAS_RICH_INPUT_PAYLOAD_SCHEMA,
  ATTACHMENT_LIMITS,
  CODE_LANG_BY_EXT,
  detectLanguageFromFilename,
  SUPPORTED_IMAGE_MIME,
  SUPPORTED_PDF_MIME,
  SUPPORTED_TEXT_MIME_PREFIXES,
  type AtlasRichInputPayload,
  type AtlasRichInputTextBlockPayload,
  type AtlasRichInputUrlAttachmentPayload,
  type AttachmentDraft,
  type AttachmentKind,
  type CodeAttachment,
  type ImageAttachment,
  type PdfAttachment,
  type TextAttachment,
  type UrlAttachment,
} from './types'
import { classifyUrl, fetchUrlMetadata } from './urlDetector'

let _idSeq = 0
function nextId(prefix: string): string {
  _idSeq += 1
  return `${prefix}-${Date.now().toString(36)}-${_idSeq.toString(36)}`
}

function isImageMime(mime: string): boolean {
  return SUPPORTED_IMAGE_MIME.has(mime)
}

function isPdfMime(mime: string): boolean {
  return SUPPORTED_PDF_MIME.has(mime)
}

function isTextLike(mime: string, fileName: string): { text: boolean; code: boolean; lang: string | null } {
  const lang = detectLanguageFromFilename(fileName)
  if (lang) {
    if (lang === 'markdown' || lang === 'plaintext') {
      return { text: true, code: false, lang }
    }
    return { text: false, code: true, lang }
  }
  for (const prefix of SUPPORTED_TEXT_MIME_PREFIXES) {
    if (mime.startsWith(prefix)) return { text: true, code: false, lang: null }
  }
  return { text: false, code: false, lang: null }
}

function countByKind(drafts: AttachmentDraft[], kind: AttachmentKind): number {
  return drafts.reduce((acc, d) => acc + (d.kind === kind ? 1 : 0), 0)
}

async function readTextBlob(file: File, maxBytes: number): Promise<string> {
  const slice = file.size > maxBytes ? file.slice(0, maxBytes) : file
  return slice.text()
}

/**
 * Legacy UploadOutput shape kept for back-compat with Atlas AI callers that
 * import `UploadOutput` from the old path. It is a structural subset of
 * `AtlasRichInputPayload` minus `schema_version` + `source_manifest` +
 * `hashes` — those new fields land on the canonical payload returned by
 * `uploadAllCanonical`.
 */
export interface UploadOutput {
  uploaded_image_ids: string[]
  uploaded_document_ids: string[]
  url_attachments: AtlasRichInputUrlAttachmentPayload[]
  text_blocks: AtlasRichInputTextBlockPayload[]
}

export interface AtlasRichInputAttachmentsApi {
  drafts: AttachmentDraft[]
  addFiles: (files: FileList | File[], source: 'drop' | 'picker' | 'paste' | 'camera') => Promise<void>
  addPasteImage: (file: File) => Promise<void>
  addUrl: (url: string, source?: 'paste' | 'manual') => Promise<void>
  remove: (id: string) => void
  clear: () => void
  /** Legacy outbound shape — Atlas AI still consumes this directly. */
  uploadAll: (signal?: AbortSignal) => Promise<UploadOutput>
  /** Canonical `atlas.rich_input.payload.v1` — preferred for new callers. */
  uploadAllCanonical: (signal?: AbortSignal) => Promise<AtlasRichInputPayload>
}

export function useAtlasRichInputAttachments(): AtlasRichInputAttachmentsApi {
  const [drafts, setDrafts] = useState<AttachmentDraft[]>([])

  const update = useCallback((id: string, patch: Partial<AttachmentDraft>) => {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? ({ ...d, ...patch } as AttachmentDraft) : d)),
    )
  }, [])

  const remove = useCallback((id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id))
  }, [])

  const clear = useCallback(() => {
    setDrafts([])
  }, [])

  const processOneFile = useCallback(
    async (file: File, source: 'drop' | 'picker' | 'paste' | 'camera') => {
      const id = nextId('att')
      const mime = file.type || 'application/octet-stream'

      let kind: AttachmentKind
      if (isImageMime(mime)) {
        if (file.size > ATTACHMENT_LIMITS.maxImageBytes) {
          throw new Error(`imagem ${file.name} excede ${Math.round(ATTACHMENT_LIMITS.maxImageBytes / 1024 / 1024)}MB`)
        }
        kind = 'image'
      } else if (isPdfMime(mime)) {
        if (file.size > ATTACHMENT_LIMITS.maxPdfBytes) {
          throw new Error(`PDF ${file.name} excede ${Math.round(ATTACHMENT_LIMITS.maxPdfBytes / 1024 / 1024)}MB`)
        }
        kind = 'pdf'
      } else {
        const det = isTextLike(mime, file.name)
        if (det.text || det.code) {
          if (file.size > ATTACHMENT_LIMITS.maxTextBytes) {
            throw new Error(`texto ${file.name} excede ${Math.round(ATTACHMENT_LIMITS.maxTextBytes / 1024 / 1024)}MB`)
          }
          kind = det.code ? 'code' : 'text'
        } else {
          throw new Error(`tipo não suportado: ${mime || 'desconhecido'}`)
        }
      }

      setDrafts((prev) => {
        const cnt = countByKind(prev, kind)
        const limit =
          kind === 'image'
            ? ATTACHMENT_LIMITS.maxImages
            : kind === 'pdf'
              ? ATTACHMENT_LIMITS.maxPdfs
              : ATTACHMENT_LIMITS.maxTextFiles
        if (cnt >= limit) {
          throw new Error(`limite de ${limit} ${kind}(s) atingido`)
        }
        return prev
      })

      const base = {
        id,
        kind,
        status: 'processing' as const,
        fileName: file.name,
        size: file.size,
        mimeType: mime,
        createdAt: Date.now(),
        error: null,
        progress: 0,
        uploadedId: null,
      }
      setDrafts((prev) => [
        ...prev,
        kind === 'image'
          ? ({
              ...base,
              kind: 'image',
              previewDataUrl: '',
              blob: file,
              width: 0,
              height: 0,
              originalSize: file.size,
              source: source === 'camera' ? 'camera' : source === 'paste' ? 'paste' : source === 'drop' ? 'drop' : 'picker',
            } as ImageAttachment)
          : kind === 'pdf'
            ? ({
                ...base,
                kind: 'pdf',
                blob: file,
                pageCount: 0,
                thumbnailDataUrl: null,
                extractedText: '',
                textLength: 0,
                source: source === 'drop' ? 'drop' : 'picker',
              } as PdfAttachment)
            : kind === 'code'
              ? ({
                  ...base,
                  kind: 'code',
                  blob: file,
                  content: '',
                  language: detectLanguageFromFilename(file.name) ?? 'plaintext',
                  source: source === 'drop' ? 'drop' : source === 'paste' ? 'paste' : 'picker',
                } as CodeAttachment)
              : ({
                  ...base,
                  kind: 'text',
                  blob: file,
                  content: '',
                  language: detectLanguageFromFilename(file.name),
                  source: source === 'drop' ? 'drop' : source === 'paste' ? 'paste' : 'picker',
                } as TextAttachment),
      ])

      try {
        if (kind === 'image') {
          const r = await processImage(file)
          update(id, {
            status: 'ready',
            previewDataUrl: r.dataUrl,
            blob: r.blob,
            width: r.width,
            height: r.height,
            originalSize: r.originalSize,
            mimeType: r.mimeType,
            size: r.blob.size,
          } as Partial<ImageAttachment>)
        } else if (kind === 'pdf') {
          const r = await processPdf(file)
          update(id, {
            status: 'ready',
            pageCount: r.pageCount,
            thumbnailDataUrl: r.thumbnailDataUrl,
            extractedText: r.extractedText,
            textLength: r.textLength,
          } as Partial<PdfAttachment>)
        } else {
          const txt = await readTextBlob(file, ATTACHMENT_LIMITS.maxTextBytes)
          const truncated = txt.slice(0, ATTACHMENT_LIMITS.maxTextPreviewChars)
          update(id, {
            status: 'ready',
            content: truncated,
          } as Partial<TextAttachment | CodeAttachment>)
        }
      } catch (e) {
        update(id, {
          status: 'error',
          error: e instanceof Error ? e.message : String(e),
        })
      }
    },
    [update],
  )

  const addFiles = useCallback(
    async (files: FileList | File[], source: 'drop' | 'picker' | 'paste' | 'camera') => {
      const arr = Array.from(files)
      for (const f of arr) {
        try {
          await processOneFile(f, source)
        } catch (e) {
          setDrafts((prev) => [
            ...prev,
            {
              id: nextId('err'),
              kind: 'text',
              status: 'error',
              fileName: f.name,
              size: f.size,
              mimeType: f.type || 'application/octet-stream',
              createdAt: Date.now(),
              error: e instanceof Error ? e.message : String(e),
              progress: 0,
              uploadedId: null,
              blob: f,
              content: '',
              language: null,
              source: source === 'drop' ? 'drop' : source === 'paste' ? 'paste' : 'picker',
            } as TextAttachment,
          ])
        }
      }
    },
    [processOneFile],
  )

  const addPasteImage = useCallback(
    async (file: File) => {
      await addFiles([file], 'paste')
    },
    [addFiles],
  )

  const addUrl = useCallback(
    async (url: string, source: 'paste' | 'manual' = 'manual') => {
      const detected = classifyUrl(url)
      const id = nextId('url')
      const baseUrl: UrlAttachment = {
        id,
        kind: 'url',
        status: 'processing',
        fileName: detected.url,
        size: 0,
        mimeType: 'text/url',
        createdAt: Date.now(),
        error: null,
        progress: 0,
        uploadedId: null,
        url: detected.url,
        urlKind: detected.kind,
        refId: detected.refId,
        title: null,
        author: null,
        thumbnailUrl: null,
        durationSec: null,
        source,
      }
      setDrafts((prev) => {
        if (prev.filter((d) => d.kind === 'url').length >= ATTACHMENT_LIMITS.maxUrls) {
          return prev
        }
        return [...prev, baseUrl]
      })
      try {
        const meta = await fetchUrlMetadata(detected)
        update(id, {
          status: 'ready',
          title: meta.title,
          author: meta.author,
          thumbnailUrl: meta.thumbnailUrl,
          durationSec: meta.durationSec,
        } as Partial<UrlAttachment>)
      } catch {
        update(id, { status: 'ready' } as Partial<UrlAttachment>)
      }
    },
    [update],
  )

  const uploadAll = useCallback(
    async (signal?: AbortSignal): Promise<UploadOutput> => {
      const ready = drafts.filter((d) => d.status === 'ready' || d.status === 'uploaded')
      const uploaded_image_ids: string[] = []
      const uploaded_document_ids: string[] = []
      const url_attachments: AtlasRichInputUrlAttachmentPayload[] = []
      const text_blocks: AtlasRichInputTextBlockPayload[] = []

      for (const d of ready) {
        if (d.kind === 'image') {
          if (d.status === 'uploaded' && d.uploadedId) {
            uploaded_image_ids.push(d.uploadedId)
            continue
          }
          update(d.id, { status: 'uploading', progress: 0 })
          try {
            const assetId = await chunkedUploadAsset({
              blob: d.blob,
              filename: d.fileName,
              mimeType: d.mimeType,
              kind: 'image',
              onProgress: (p) => update(d.id, { progress: p }),
              signal,
            })
            update(d.id, { status: 'uploaded', uploadedId: assetId, progress: 1 })
            uploaded_image_ids.push(assetId)
          } catch (e) {
            update(d.id, { status: 'error', error: e instanceof Error ? e.message : String(e) })
            throw e
          }
        } else if (d.kind === 'pdf') {
          if (d.status === 'uploaded' && d.uploadedId) {
            uploaded_document_ids.push(d.uploadedId)
          } else {
            update(d.id, { status: 'uploading', progress: 0 })
            try {
              const assetId = await chunkedUploadAsset({
                blob: d.blob,
                filename: d.fileName,
                mimeType: d.mimeType,
                kind: 'file',
                onProgress: (p) => update(d.id, { progress: p }),
                signal,
              })
              update(d.id, { status: 'uploaded', uploadedId: assetId, progress: 1 })
              uploaded_document_ids.push(assetId)
            } catch (e) {
              update(d.id, { status: 'error', error: e instanceof Error ? e.message : String(e) })
              throw e
            }
          }
          if (d.extractedText) {
            text_blocks.push({
              file_name: d.fileName,
              mime_type: d.mimeType,
              language: 'plaintext',
              content: d.extractedText,
              page_count: d.pageCount,
            })
          }
        } else if (d.kind === 'text' || d.kind === 'code') {
          text_blocks.push({
            file_name: d.fileName,
            mime_type: d.mimeType,
            language: d.language ?? CODE_LANG_BY_EXT[(d.fileName.split('.').pop() ?? '').toLowerCase()] ?? null,
            content: d.content,
          })
        } else if (d.kind === 'url') {
          url_attachments.push({
            url: d.url,
            kind: d.urlKind,
            title: d.title,
            author: d.author,
            duration_sec: d.durationSec,
            thumbnail_url: d.thumbnailUrl,
            ref_id: d.refId,
          })
        }
      }

      return { uploaded_image_ids, uploaded_document_ids, url_attachments, text_blocks }
    },
    [drafts, update],
  )

  const uploadAllCanonical = useCallback(
    async (signal?: AbortSignal): Promise<AtlasRichInputPayload> => {
      const legacy = await uploadAll(signal)
      // Manifest is built via the canon helper (single source of truth in
      // `@atlas/rich-input-canon`). Output is byte-identical to the historic
      // inline implementation — verified by the cross-platform contract test.
      return {
        schema_version: ATLAS_RICH_INPUT_PAYLOAD_SCHEMA,
        uploaded_image_ids: legacy.uploaded_image_ids,
        uploaded_document_ids: legacy.uploaded_document_ids,
        text_blocks: legacy.text_blocks,
        url_attachments: legacy.url_attachments,
        source_manifest: buildSourceManifestFromDrafts(drafts),
      }
    },
    [drafts, uploadAll],
  )

  return {
    drafts,
    addFiles,
    addPasteImage,
    addUrl,
    remove,
    clear,
    uploadAll,
    uploadAllCanonical,
  }
}
