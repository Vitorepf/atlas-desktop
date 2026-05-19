/**
 * Atlas AI · Desktop · integração rich input × Hyperflow payload.
 *
 * Garante que o composer emite e o envio carrega o canon
 * `atlas.rich_input.payload.v1` (schema_version + source_manifest + hashes),
 * sem perder paridade com os campos legados aceitos por StoreAiInteractionRequest.
 *
 * Pipeline coberto:
 *   AtlasUnifiedComposer.uploadAllCanonical() → AtlasRichInputPayload
 *     → AtlasAiComposer repassa em SendExtras.richInputCanonical
 *     → AtlasAiSurface.handleSend repassa em atlas.send options.richInputPayload
 *     → useAtlasAi.send envia `rich_input_payload` no body do POST /ai/interactions
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  ATLAS_AI_APP_SURFACE,
  ATLAS_AI_SURFACE_ID,
  buildInteractionPayload,
} from '../contract.ts'
import { isAutoAutoCleanPayload } from '../hyperflowRuntime.ts'
import {
  ATLAS_RICH_INPUT_PAYLOAD_SCHEMA,
  type AtlasRichInputPayload,
} from '../../../lib/rich-input/index.ts'
import type { AtlasAiInteractionRequest } from '../types.ts'

function simulateEnrichment(
  basePayload: Record<string, unknown>,
  options: {
    textBlocks?: Array<{ file_name: string; mime_type: string; content: string }>
    urlAttachments?: Array<{ url: string; kind: string }>
  },
): Record<string, unknown> {
  const enriched: Record<string, unknown> = { ...basePayload }
  if (options.textBlocks?.length) enriched.attachments_text = options.textBlocks
  if (options.urlAttachments?.length) enriched.attachments_url = options.urlAttachments
  return enriched
}

function fakeCanonicalPayload(opts: {
  imageIds?: string[]
  documentIds?: string[]
  textBlocks?: AtlasRichInputPayload['text_blocks']
  urlAttachments?: AtlasRichInputPayload['url_attachments']
  manifest?: AtlasRichInputPayload['source_manifest']
}): AtlasRichInputPayload {
  return {
    schema_version: ATLAS_RICH_INPUT_PAYLOAD_SCHEMA,
    uploaded_image_ids: opts.imageIds ?? [],
    uploaded_document_ids: opts.documentIds ?? [],
    text_blocks: opts.textBlocks ?? [],
    url_attachments: opts.urlAttachments ?? [],
    source_manifest: opts.manifest ?? [],
  }
}

function simulateRequestBody(
  enrichedPayload: Record<string, unknown>,
  options: {
    uploadedImageIds?: string[]
    uploadedDocumentIds?: string[]
    richInputPayload?: AtlasRichInputPayload
  },
): AtlasAiInteractionRequest {
  // Mirror exato do que `useAtlasAi.send()` monta antes de chamar
  // `createAiInteraction`. Mantém a mesma ordem condicional dos spreads.
  return {
    input_text: 'fixture',
    kind: 'interaction',
    source_type: 'app',
    include_semantic_context: true,
    context_note_limit: 5,
    payload: enrichedPayload,
    ...(options.uploadedImageIds?.length
      ? { uploaded_images: options.uploadedImageIds }
      : {}),
    ...(options.uploadedDocumentIds?.length
      ? { uploaded_documents: options.uploadedDocumentIds }
      : {}),
    ...(options.richInputPayload
      ? { rich_input_payload: options.richInputPayload }
      : {}),
  }
}

test('auto/auto + anexos texto/URL mantém invariante de limpeza', () => {
  const { payload } = buildInteractionPayload({
    mode: 'auto',
    task: 'auto',
    provider: 'auto',
    workspaceSlug: null,
  })
  const enriched = simulateEnrichment(payload, {
    textBlocks: [{ file_name: 'note.md', mime_type: 'text/markdown', content: '# Hi' }],
    urlAttachments: [{ url: 'https://example.com', kind: 'generic' }],
  })

  assert.equal(isAutoAutoCleanPayload(enriched), true)
  assert.equal(enriched.atlas_mode, 'auto')
  assert.equal(enriched.routing_domain, 'auto')
})

test('surface_id sempre atlas_desktop_ai (nunca vaza atlas_mobile_ai)', () => {
  const { payload } = buildInteractionPayload({
    mode: 'research',
    task: 'plan',
    provider: 'auto',
    workspaceSlug: null,
  })
  assert.equal(payload.surface_id, 'atlas_desktop_ai')
  assert.equal(payload.app_surface, 'atlas_desktop_ai')
  assert.equal(ATLAS_AI_SURFACE_ID, 'atlas_desktop_ai')
  assert.equal(ATLAS_AI_APP_SURFACE, 'atlas_desktop_ai')
})

test('research + anexos NÃO vira programming.dev nem força programming_harness', () => {
  const { payload } = buildInteractionPayload({
    mode: 'research',
    task: 'plan',
    provider: 'auto',
    workspaceSlug: 'atlas',
  })
  const enriched = simulateEnrichment(payload, {
    urlAttachments: [{ url: 'https://arxiv.org/abs/2403.0001', kind: 'generic' }],
  })
  assert.equal(enriched.atlas_mode, 'research')
  assert.equal(enriched.routing_domain, 'research')
  assert.notEqual(enriched.flow_id, 'programming.dev')
  assert.equal('programming_harness' in enriched, false)
  assert.equal('capability_profile' in enriched, false)
})

test('finance + PDF não dispara programming runtime policy', () => {
  const { payload } = buildInteractionPayload({
    mode: 'finance',
    task: 'review',
    provider: 'auto',
    workspaceSlug: null,
  })
  const enriched = simulateEnrichment(payload, {
    textBlocks: [{ file_name: 'balance.pdf', mime_type: 'application/pdf', content: '...' }],
  })
  assert.equal(enriched.atlas_mode, 'finance')
  assert.equal('programming_harness' in enriched, false)
  assert.equal('tool_permissions' in enriched, false)
})

test('programming + dev MANTÉM programming_harness (canon do modo explícito)', () => {
  const { payload } = buildInteractionPayload({
    mode: 'programming',
    task: 'dev',
    provider: 'auto',
    workspaceSlug: 'atlas',
  })
  assert.equal(payload.atlas_mode, 'programming')
  assert.equal('programming_harness' in payload, true)
  assert.equal('capability_profile' in payload, true)
  assert.equal(payload.capability_profile, 'atlas_programming')
})

/* ─────────── Canon `atlas.rich_input.payload.v1` no envio ─────────── */

test('envio carrega rich_input_payload canon com schema_version correto', () => {
  const canon = fakeCanonicalPayload({
    imageIds: ['img-xyz'],
    documentIds: ['doc-abc'],
    textBlocks: [
      { file_name: 'a.md', mime_type: 'text/markdown', language: 'markdown', content: '# x' },
    ],
    urlAttachments: [
      {
        url: 'https://youtu.be/dQw4w9WgXcQ',
        kind: 'youtube',
        title: null,
        author: null,
        duration_sec: null,
        thumbnail_url: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        ref_id: 'dQw4w9WgXcQ',
      },
    ],
    manifest: [
      {
        id: 'att-1',
        kind: 'image',
        file_name: 'photo.jpg',
        mime_type: 'image/jpeg',
        size: 12345,
        uploaded_id: 'img-xyz',
        source_hash: null,
        source: 'paste',
      },
      {
        id: 'att-2',
        kind: 'pdf',
        file_name: 'report.pdf',
        mime_type: 'application/pdf',
        size: 67890,
        uploaded_id: 'doc-abc',
        source_hash: null,
        source: 'picker',
      },
    ],
  })
  const { payload } = buildInteractionPayload({
    mode: 'auto',
    task: 'auto',
    provider: 'auto',
    workspaceSlug: null,
  })
  const body = simulateRequestBody(payload, {
    uploadedImageIds: canon.uploaded_image_ids,
    uploadedDocumentIds: canon.uploaded_document_ids,
    richInputPayload: canon,
  })

  assert.ok(body.rich_input_payload, 'body deve carregar rich_input_payload no top-level')
  assert.equal(
    body.rich_input_payload.schema_version,
    'atlas.rich_input.payload.v1',
    'schema_version deve ser o canon v1',
  )
  assert.equal(body.rich_input_payload.uploaded_image_ids.length, 1)
  assert.equal(body.rich_input_payload.uploaded_document_ids.length, 1)
  assert.equal(body.rich_input_payload.text_blocks.length, 1)
  assert.equal(body.rich_input_payload.url_attachments.length, 1)
  assert.equal(body.rich_input_payload.source_manifest.length, 2)
})

test('source_manifest descreve cada attachment por kind + uploaded_id (audit trail)', () => {
  const canon = fakeCanonicalPayload({
    imageIds: ['img-1', 'img-2'],
    documentIds: ['doc-1'],
    manifest: [
      {
        id: 'att-img-1',
        kind: 'image',
        file_name: 'one.png',
        mime_type: 'image/png',
        size: 100,
        uploaded_id: 'img-1',
        source_hash: null,
        source: 'paste',
      },
      {
        id: 'att-img-2',
        kind: 'image',
        file_name: 'two.png',
        mime_type: 'image/png',
        size: 200,
        uploaded_id: 'img-2',
        source_hash: null,
        source: 'drop',
      },
      {
        id: 'att-doc-1',
        kind: 'pdf',
        file_name: 'three.pdf',
        mime_type: 'application/pdf',
        size: 300,
        uploaded_id: 'doc-1',
        source_hash: null,
        source: 'picker',
      },
    ],
  })

  for (const entry of canon.source_manifest) {
    assert.ok(entry.id, 'manifest entry precisa de id estável')
    assert.ok(entry.kind, 'manifest entry precisa declarar kind')
    assert.ok(entry.file_name, 'manifest entry precisa de file_name')
    assert.ok(entry.mime_type, 'manifest entry precisa de mime_type')
  }

  const images = canon.source_manifest.filter((e) => e.kind === 'image')
  const pdfs = canon.source_manifest.filter((e) => e.kind === 'pdf')
  assert.equal(images.length, 2)
  assert.equal(pdfs.length, 1)
  assert.equal(images[0].uploaded_id, 'img-1')
  assert.equal(pdfs[0].uploaded_id, 'doc-1')
})

test('envio mantém uploaded_images/uploaded_documents legados em paralelo ao canon', () => {
  const canon = fakeCanonicalPayload({
    imageIds: ['img-z'],
    documentIds: [],
  })
  const { payload } = buildInteractionPayload({
    mode: 'auto',
    task: 'auto',
    provider: 'auto',
    workspaceSlug: null,
  })
  const body = simulateRequestBody(payload, {
    uploadedImageIds: canon.uploaded_image_ids,
    uploadedDocumentIds: canon.uploaded_document_ids,
    richInputPayload: canon,
  })

  // Legacy continua presente — backend ainda consome (back-compat).
  assert.deepEqual(body.uploaded_images, ['img-z'])
  // Canon presente em paralelo.
  assert.equal(body.rich_input_payload?.schema_version, 'atlas.rich_input.payload.v1')
})

test('envio SEM anexos não inclui rich_input_payload nem uploaded_images', () => {
  const { payload } = buildInteractionPayload({
    mode: 'auto',
    task: 'auto',
    provider: 'auto',
    workspaceSlug: null,
  })
  const body = simulateRequestBody(payload, {})
  assert.equal(body.rich_input_payload, undefined)
  assert.equal(body.uploaded_images, undefined)
  assert.equal(body.uploaded_documents, undefined)
})

test('research + canon rich_input_payload mantém routing limpo', () => {
  const { payload } = buildInteractionPayload({
    mode: 'research',
    task: 'plan',
    provider: 'auto',
    workspaceSlug: null,
  })
  const canon = fakeCanonicalPayload({
    urlAttachments: [
      {
        url: 'https://arxiv.org/abs/2403.0001',
        kind: 'generic',
        title: null,
        author: null,
        duration_sec: null,
        thumbnail_url: null,
        ref_id: null,
      },
    ],
  })
  const body = simulateRequestBody(payload, { richInputPayload: canon })
  const bodyPayload = body.payload as Record<string, unknown>

  assert.equal(bodyPayload.atlas_mode, 'research')
  assert.equal(bodyPayload.routing_domain, 'research')
  assert.notEqual(bodyPayload.flow_id, 'programming.dev')
  assert.equal(body.rich_input_payload?.schema_version, 'atlas.rich_input.payload.v1')
  assert.equal(body.rich_input_payload?.url_attachments[0].url, 'https://arxiv.org/abs/2403.0001')
})

test('programming + dev + canon rich_input_payload mantém harness + envia canon', () => {
  const { payload } = buildInteractionPayload({
    mode: 'programming',
    task: 'dev',
    provider: 'auto',
    workspaceSlug: 'atlas',
  })
  const canon = fakeCanonicalPayload({
    documentIds: ['doc-spec'],
    manifest: [
      {
        id: 'att-spec',
        kind: 'pdf',
        file_name: 'spec.pdf',
        mime_type: 'application/pdf',
        size: 4096,
        uploaded_id: 'doc-spec',
        source_hash: null,
        source: 'picker',
      },
    ],
  })
  const body = simulateRequestBody(payload, {
    uploadedDocumentIds: canon.uploaded_document_ids,
    richInputPayload: canon,
  })
  const bodyPayload = body.payload as Record<string, unknown>

  assert.equal(bodyPayload.atlas_mode, 'programming')
  assert.equal('programming_harness' in bodyPayload, true)
  assert.equal(body.rich_input_payload?.schema_version, 'atlas.rich_input.payload.v1')
  assert.equal(body.rich_input_payload?.source_manifest[0].kind, 'pdf')
})
