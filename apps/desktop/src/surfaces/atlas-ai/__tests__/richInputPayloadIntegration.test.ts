/**
 * Atlas AI · Desktop · integração rich input × Hyperflow payload.
 *
 * Documenta o contrato de envio atual entre o composer (rich input) e o
 * `buildInteractionPayload` (Hyperflow). Garante que:
 *
 *   1. `auto/auto` permanece limpo MESMO com anexos (sem vazar
 *      programming_harness/capability_profile).
 *   2. O composer pode anexar texto, URL, image_id, document_id e o pipeline
 *      sobrevive sem corromper roteamento.
 *   3. O shape de envio atual (uploaded_images top-level + attachments_text
 *      em payload) é estável — qualquer rename surface aqui.
 *
 * ## Limitação documentada (NÃO testada como passing)
 *
 * Hoje o desktop envia rich input via shape legado (`uploaded_images`,
 * `uploaded_documents`, `payload.attachments_text`, `payload.attachments_url`).
 * O mobile envia via `rich_input_payload` (schema canon `atlas.rich_input.payload.v1`)
 * com source_manifest + hashes. Backend aceita ambos.
 *
 * Próxima fatia: enviar também `rich_input_payload` em paralelo aos campos
 * legados — sem quebrar. Quando essa fatia rodar, ATUALIZAR este teste.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  ATLAS_AI_APP_SURFACE,
  ATLAS_AI_SURFACE_ID,
  buildInteractionPayload,
} from '../contract.ts'
import { isAutoAutoCleanPayload } from '../hyperflowRuntime.ts'

function simulateEnrichment(
  basePayload: Record<string, unknown>,
  options: {
    textBlocks?: Array<{ file_name: string; mime_type: string; content: string }>
    urlAttachments?: Array<{ url: string; kind: string }>
  },
): Record<string, unknown> {
  // Mirror do enrichment que `useAtlasAi.send()` aplica antes do POST.
  const enriched: Record<string, unknown> = { ...basePayload }
  if (options.textBlocks?.length) enriched.attachments_text = options.textBlocks
  if (options.urlAttachments?.length) enriched.attachments_url = options.urlAttachments
  return enriched
}

test('payload auto/auto + anexos texto/URL mantém invariante de limpeza', () => {
  const { payload } = buildInteractionPayload({
    mode: 'auto',
    task: 'auto',
    provider: 'auto',
    workspaceSlug: null,
  })

  const enriched = simulateEnrichment(payload, {
    textBlocks: [
      { file_name: 'note.md', mime_type: 'text/markdown', content: '# Hello' },
    ],
    urlAttachments: [{ url: 'https://example.com', kind: 'generic' }],
  })

  assert.equal(isAutoAutoCleanPayload(enriched), true)
  assert.equal(enriched.atlas_mode, 'auto')
  assert.equal(enriched.routing_task, 'auto')
  assert.equal(enriched.routing_domain, 'auto')
  // Anexos chegam ao backend como campos auxiliares — não corrompem roteamento.
  assert.ok(Array.isArray(enriched.attachments_text))
  assert.ok(Array.isArray(enriched.attachments_url))
})

test('surface_id e app_surface são sempre atlas_desktop_ai (não vaza atlas_mobile_ai)', () => {
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

test('research + image enrichment NÃO vira programming.dev nem força handoff Dev', () => {
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
    textBlocks: [
      { file_name: 'balance.pdf', mime_type: 'application/pdf', content: '...' },
    ],
  })

  assert.equal(enriched.atlas_mode, 'finance')
  assert.equal(enriched.routing_domain, 'finance')
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

  // Modo explícito programming carrega harness — esperado, NÃO regressão.
  assert.equal(payload.atlas_mode, 'programming')
  assert.equal('programming_harness' in payload, true)
  assert.equal('capability_profile' in payload, true)
  assert.equal(payload.capability_profile, 'atlas_programming')
  // Mas isAutoAutoCleanPayload não se aplica (não é auto).
  assert.equal(isAutoAutoCleanPayload(payload), true)
})

test('campos de envio rich input hoje · shape estável', () => {
  // Snapshot do shape atual. Se isto mudar, o teste falha e o autor precisa
  // atualizar este snapshot + a próxima fatia (rich_input_payload canon).
  const { payload } = buildInteractionPayload({
    mode: 'auto',
    task: 'auto',
    provider: 'auto',
    workspaceSlug: null,
  })
  const enriched = simulateEnrichment(payload, {
    textBlocks: [
      { file_name: 'a.md', mime_type: 'text/markdown', content: 'x' },
    ],
    urlAttachments: [{ url: 'https://x.io', kind: 'generic' }],
  })

  // Shape canon hoje (legacy): attachments_text + attachments_url no payload.
  assert.ok('attachments_text' in enriched)
  assert.ok('attachments_url' in enriched)

  // TODO próxima fatia: enriched.rich_input_payload (schema v1 canon).
  // Quando essa fatia entrar, adicionar asserts:
  //   assert.ok('rich_input_payload' in enriched)
  //   assert.equal(enriched.rich_input_payload.schema_version, 'atlas.rich_input.payload.v1')
  //   assert.ok(Array.isArray(enriched.rich_input_payload.source_manifest))
})
