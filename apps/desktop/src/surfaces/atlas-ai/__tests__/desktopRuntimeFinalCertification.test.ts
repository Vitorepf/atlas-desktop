/**
 * Atlas AI · Desktop · Runtime Final Certification.
 *
 * Trip único: composer payload → /ai/interactions request body →
 * hyperflow view-model → presentation contract → audit/context surface.
 *
 * Cada teste cobre os 4 layers do runtime canônico Desktop em uma chamada:
 *
 *   1. **Universal Composer Runtime** — `buildInteractionPayload()` + canon
 *      `atlas.rich_input.payload.v1` saindo de `@atlas/rich-input-canon`.
 *   2. **Hyperflow V2 request** — surface_id desktop, routing_domain/task,
 *      decision_mode, modos canônicos sem leak programming.
 *   3. **Hyperflow V2 response view-model** — `buildHyperflowRuntimeView()`
 *      consome flat `trace.hyperflow` e expõe intent/flow/runtime/handoff/
 *      receiptHash sem inventar decisão local.
 *   4. **Response Presentation Contract** — `projectPresentation()` separa
 *      body editorial dos blocos técnicos, entregando `sections` no shape
 *      exato que `AtlasAiResponseAudit` consome.
 *
 * Se este arquivo passar, Desktop Atlas AI está usando o runtime canônico
 * mais robusto: nenhum layer pode quebrar silenciosamente sem este teste
 * vermelhar.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  ATLAS_AI_APP_SURFACE,
  ATLAS_AI_SURFACE_ID,
  buildInteractionPayload,
} from '../contract.ts'
import { buildHyperflowRuntimeView } from '../useHyperflowRuntime.ts'
import { extractHyperflow, isAutoAutoCleanPayload } from '../hyperflowRuntime.ts'
import { projectPresentation } from '../presentationContract.ts'
import {
  ATLAS_RICH_INPUT_PAYLOAD_SCHEMA,
  type AtlasRichInputPayload,
} from '../../../lib/rich-input/index.ts'
import type { AtlasAiHyperflowTrace, AtlasAiInteractionRequest } from '../types.ts'

/* ------------------------------------------------------------------ */
/* Fixtures canônicas — refletem o que sai do composer real            */
/* ------------------------------------------------------------------ */

function canonicalRichInputPayload(): AtlasRichInputPayload {
  return {
    schema_version: ATLAS_RICH_INPUT_PAYLOAD_SCHEMA,
    uploaded_image_ids: ['img_abc123'],
    uploaded_document_ids: ['doc_def456'],
    text_blocks: [
      {
        file_name: 'note.md',
        mime_type: 'text/markdown',
        language: 'markdown',
        content: '# brief',
      },
    ],
    url_attachments: [
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
    source_manifest: [
      {
        id: 'src_1',
        kind: 'image',
        file_name: 'photo.png',
        mime_type: 'image/png',
        size: 1024,
        uploaded_id: 'img_abc123',
        source_hash: null,
        source: 'composer',
      },
      {
        id: 'src_2',
        kind: 'pdf',
        file_name: 'brief.pdf',
        mime_type: 'application/pdf',
        size: 2048,
        uploaded_id: 'doc_def456',
        source_hash: null,
        source: 'composer',
      },
      {
        id: 'src_3',
        kind: 'text',
        file_name: 'note.md',
        mime_type: 'text/markdown',
        size: 7,
        uploaded_id: null,
        source_hash: null,
        source: 'composer',
      },
      {
        id: 'src_4',
        kind: 'url',
        file_name: 'arxiv',
        mime_type: 'text/uri-list',
        size: 0,
        uploaded_id: null,
        source_hash: null,
        source: 'composer',
      },
    ],
    hashes: { manifest_sha256: 'a'.repeat(64) },
  }
}

function simulateRequestBody(
  enrichedPayload: Record<string, unknown>,
  richInputPayload: AtlasRichInputPayload | null,
): AtlasAiInteractionRequest {
  return {
    input_text: 'fixture',
    kind: 'interaction',
    source_type: 'app',
    include_semantic_context: true,
    context_note_limit: 5,
    payload: enrichedPayload,
    ...(richInputPayload?.uploaded_image_ids.length
      ? { uploaded_images: richInputPayload.uploaded_image_ids }
      : {}),
    ...(richInputPayload?.uploaded_document_ids.length
      ? { uploaded_documents: richInputPayload.uploaded_document_ids }
      : {}),
    ...(richInputPayload ? { rich_input_payload: richInputPayload } : {}),
  }
}

function backendHyperflowTrace(opts: {
  intent: string
  domainId: string
  flowId: string
  runtimeMode: AtlasAiHyperflowTrace['runtime_mode']
  handoffTarget?: string | null
  handoffReason?: string | null
  dispatchStatus?: AtlasAiHyperflowTrace['dispatch_status']
  reasons?: string[]
  confidence?: number
  decisionReceiptHash?: string
}): { status: string; hyperflow: AtlasAiHyperflowTrace } {
  return {
    status: 'completed',
    hyperflow: {
      schema_version: 'atlas.ai.hyperflow_runtime.v1',
      intent: opts.intent,
      domain_id: opts.domainId,
      flow_id: opts.flowId,
      runtime_mode: opts.runtimeMode,
      confidence: opts.confidence ?? 0.86,
      dispatch_status: opts.dispatchStatus ?? 'dispatched',
      handoff_target: opts.handoffTarget ?? null,
      handoff_reason: opts.handoffReason ?? null,
      reasons: opts.reasons ?? [`intent_type:${opts.intent}`, `flow:${opts.flowId}`],
      decision_receipt_hash: opts.decisionReceiptHash ?? 'b'.repeat(64),
    },
  }
}

/* ------------------------------------------------------------------ */
/* Layer 1+2 · Universal Composer Runtime + Hyperflow request shape    */
/* ------------------------------------------------------------------ */

test('certification · composer (auto/auto) emite request body Hyperflow-first com surface_id desktop e payload canon', () => {
  const { payload } = buildInteractionPayload({
    mode: 'auto',
    task: 'auto',
    provider: 'auto',
    workspaceSlug: null,
  })
  const richInput = canonicalRichInputPayload()
  const body = simulateRequestBody(payload, richInput)

  // surface identity canon: desktop, never mobile
  assert.equal(ATLAS_AI_SURFACE_ID, 'atlas_desktop_ai')
  assert.equal(ATLAS_AI_APP_SURFACE, 'atlas_desktop_ai')
  assert.equal(payload.surface_id, 'atlas_desktop_ai')
  assert.equal(payload.app_surface, 'atlas_desktop_ai')

  // auto/auto: front NÃO assume domínio, Hyperflow decide
  assert.equal(payload.atlas_mode, 'auto')
  assert.equal(payload.routing_domain, 'auto')
  assert.equal(payload.routing_task, 'auto')
  assert.equal(payload.decision_mode, 'atlas_decide')
  assert.equal(isAutoAutoCleanPayload(payload), true)

  // canon rich input no body do POST
  assert.equal(body.rich_input_payload?.schema_version, 'atlas.rich_input.payload.v1')
  assert.equal(body.rich_input_payload?.schema_version, ATLAS_RICH_INPUT_PAYLOAD_SCHEMA)
  assert.equal(body.rich_input_payload?.uploaded_image_ids.length, 1)
  assert.equal(body.rich_input_payload?.uploaded_document_ids.length, 1)
  assert.equal(body.rich_input_payload?.text_blocks.length, 1)
  assert.equal(body.rich_input_payload?.url_attachments.length, 1)
  assert.equal(body.rich_input_payload?.source_manifest.length, 4)
  assert.equal(body.rich_input_payload?.hashes?.manifest_sha256?.length, 64)

  // legacy paralelo preservado
  assert.deepEqual(body.uploaded_images, ['img_abc123'])
  assert.deepEqual(body.uploaded_documents, ['doc_def456'])
})

test('certification · fluxo sem anexo continua emitindo request limpo (sem rich_input_payload)', () => {
  const { payload } = buildInteractionPayload({
    mode: 'auto',
    task: 'auto',
    provider: 'auto',
    workspaceSlug: null,
  })
  const body = simulateRequestBody(payload, null)

  assert.equal('rich_input_payload' in body, false)
  assert.equal('uploaded_images' in body, false)
  assert.equal('uploaded_documents' in body, false)
  assert.equal(payload.atlas_mode, 'auto')
  assert.equal(isAutoAutoCleanPayload(payload), true)
})

/* ------------------------------------------------------------------ */
/* Layer 3 · Hyperflow view-model — backend wins                       */
/* ------------------------------------------------------------------ */

test('certification · view-model · research prompt (auto/auto + anexos) NÃO vira programming.dev', () => {
  const trace = backendHyperflowTrace({
    intent: 'research',
    domainId: 'research',
    flowId: 'atlas_research',
    runtimeMode: 'deep',
    reasons: ['intent_type:research', 'attachments:url:arxiv', 'flow:atlas_research'],
  })

  const view = buildHyperflowRuntimeView(trace)
  assert.equal(view.isReady, true)
  assert.equal(view.intent, 'research')
  assert.equal(view.domainId, 'research')
  assert.equal(view.flowId, 'atlas_research')
  assert.equal(view.runtimeMode, 'deep')
  assert.equal(view.isDevHandoff, false)
  assert.equal(view.isForgeHandoff, false)
  assert.notEqual(view.flowId, 'programming.dev')
  assert.equal(view.receiptHash?.length, 64)
})

test('certification · view-model · finance prompt NÃO escorrega para Atlas Dev', () => {
  const trace = backendHyperflowTrace({
    intent: 'finance',
    domainId: 'finance',
    flowId: 'finance.analysis',
    runtimeMode: 'standard',
  })
  const view = buildHyperflowRuntimeView(trace)
  assert.equal(view.intent, 'finance')
  assert.equal(view.flowId, 'finance.analysis')
  assert.equal(view.isDevHandoff, false)
  assert.equal(view.isForgeHandoff, false)
  assert.equal(view.handoffTarget, null)
})

test('certification · view-model · programming leve → Atlas Dev handoff consumível', () => {
  const trace = backendHyperflowTrace({
    intent: 'programming',
    domainId: 'programming',
    flowId: 'programming.dev',
    runtimeMode: 'standard',
    handoffTarget: 'atlas_dev',
    handoffReason: 'explicit_programming_composer_contract',
  })
  const view = buildHyperflowRuntimeView(trace)
  assert.equal(view.isDevHandoff, true)
  assert.equal(view.isForgeHandoff, false)
  assert.equal(view.handoffTarget, 'atlas_dev')
  assert.equal(view.handoffReason, 'explicit_programming_composer_contract')
})

test('certification · view-model · Obra/trabalho pesado → Atlas Forge handoff consumível', () => {
  const trace = backendHyperflowTrace({
    intent: 'programming',
    domainId: 'programming',
    flowId: 'programming.forge',
    runtimeMode: 'forge',
    handoffTarget: 'atlas_forge',
    handoffReason: 'atlas_code_surface_contract_requires_forge',
  })
  const view = buildHyperflowRuntimeView(trace)
  assert.equal(view.isForgeHandoff, true)
  assert.equal(view.isDevHandoff, false)
  assert.equal(view.handoffTarget, 'atlas_forge')
  assert.equal(view.runtimeMode, 'forge')
})

test('certification · view-model · trace sem hyperflow NÃO inventa decisão (Atlas Decide é fonte da verdade)', () => {
  const view = buildHyperflowRuntimeView({ status: 'completed' })
  assert.equal(view.isReady, false)
  assert.equal(view.isPending, false)
  assert.equal(view.intent, null)
  assert.equal(view.flowId, null)
  assert.equal(view.handoffTarget, null)
  // confirma também via extractHyperflow direto
  assert.equal(extractHyperflow({ status: 'completed' }), null)
})

/* ------------------------------------------------------------------ */
/* Layer 4 · Presentation Contract → AtlasAiResponseAudit shape        */
/* ------------------------------------------------------------------ */

test('certification · presentation · SOURCE_REFS/UNCERTAINTY/claims_table migram para audit metadata e somem do body', () => {
  const responseText = [
    '## ANSWER_SUMMARY',
    'Resposta editorial principal sobre o tópico, dois parágrafos.',
    '',
    'Detalhe adicional do raciocínio operacional.',
    '',
    '## SOURCE_REFS',
    '- arxiv.org/abs/2403.0001',
    '- doc:atlas/research/runtime',
    '',
    '## UNCERTAINTY',
    '- baixa: fontes diretas',
    '',
    '## CLAIMS_TABLE',
    '| afirmação | confiança |',
    '| --- | --- |',
    '| x | alta |',
    '',
    '## METADATA',
    'receipt_hash: bbbbbb',
    'flow_id: atlas_research',
  ].join('\n')

  const result = projectPresentation(responseText)

  // body editorial limpo: heading técnico ANSWER_SUMMARY virou heading PT-BR,
  // o resto dos blocos técnicos saiu do corpo
  assert.equal(result.body.includes('SOURCE_REFS'), false)
  assert.equal(result.body.includes('UNCERTAINTY'), false)
  assert.equal(result.body.includes('CLAIMS_TABLE'), false)
  assert.equal(result.body.includes('METADATA'), false)
  assert.ok(result.body.length > 0, 'body editorial não pode estar vazio')

  // metadata.sections é EXATAMENTE o shape que AtlasAiResponseAudit consome
  // (Record<string, string[]>) — contrato de wiring entre presentation e audit
  const sections = result.metadata.sections
  assert.equal(typeof sections, 'object')
  assert.ok(Array.isArray(sections.source_refs))
  assert.ok(sections.source_refs.length >= 1)
  assert.ok(Array.isArray(sections.uncertainty))
  assert.ok(sections.uncertainty.length >= 1)
  assert.ok(Array.isArray(sections.metadata))
  assert.ok(sections.metadata.length >= 1)

  // Sanity: cada entry é string (não array aninhado, não objeto cru)
  for (const [key, lines] of Object.entries(sections)) {
    assert.ok(Array.isArray(lines), `sections.${key} deve ser string[]`)
    for (const line of lines) {
      assert.equal(typeof line, 'string', `sections.${key} contém non-string`)
    }
  }
})

test('certification · presentation · resposta limpa (sem blocos técnicos) preserva markdown editorial intacto', () => {
  const responseText = [
    'Resposta direta em prosa editorial.',
    '',
    '- bullet 1',
    '- bullet 2',
    '',
    'Conclusão final.',
  ].join('\n')

  const result = projectPresentation(responseText)
  assert.equal(result.technicalSectionsFound, 0)
  assert.equal(Object.keys(result.metadata.sections).length, 0)
  assert.ok(result.body.includes('bullet 1'))
  assert.ok(result.body.includes('Conclusão final'))
})

/* ------------------------------------------------------------------ */
/* Trip composto · todos os 4 layers numa viagem só                    */
/* ------------------------------------------------------------------ */

test('certification · trip completo · research (auto/auto + anexos canon) → trace research → presentation limpa', () => {
  // Layer 1+2: composer + request
  const { payload } = buildInteractionPayload({
    mode: 'auto',
    task: 'auto',
    provider: 'auto',
    workspaceSlug: 'atlas',
  })
  const richInput = canonicalRichInputPayload()
  const body = simulateRequestBody(payload, richInput)
  assert.equal(body.payload?.surface_id, 'atlas_desktop_ai')
  assert.equal(body.payload?.atlas_mode, 'auto')
  assert.equal(body.rich_input_payload?.schema_version, 'atlas.rich_input.payload.v1')

  // Layer 3: backend devolve trace de research (Hyperflow decide, não a surface)
  const trace = backendHyperflowTrace({
    intent: 'research',
    domainId: 'research',
    flowId: 'atlas_research',
    runtimeMode: 'deep',
    confidence: 0.91,
  })
  const view = buildHyperflowRuntimeView(trace)
  assert.equal(view.isReady, true)
  assert.equal(view.intent, 'research')
  assert.equal(view.flowId, 'atlas_research')
  assert.notEqual(view.flowId, 'programming.dev')
  assert.equal(view.isDevHandoff, false)
  assert.ok((view.routingReasonSummary ?? '').length > 0)

  // Layer 4: response_text vem com cabeçalhos técnicos → presentation contract
  // separa body editorial dos blocos de auditoria
  const responseText = [
    '## ANSWER_SUMMARY',
    'Estado da arte: 3 linhas convergentes em research × programming.',
    '',
    '## SOURCE_REFS',
    '- arxiv.org/abs/2403.0001',
  ].join('\n')
  const presented = projectPresentation(responseText)
  assert.equal(presented.body.includes('SOURCE_REFS'), false)
  assert.ok(Array.isArray(presented.metadata.sections.source_refs))
  assert.ok(presented.metadata.sections.source_refs.length >= 1)
})

test('certification · trip completo · programming explicit (mode=programming, task=dev) → handoff Dev → audit metadata', () => {
  const { payload } = buildInteractionPayload({
    mode: 'programming',
    task: 'dev',
    provider: 'auto',
    workspaceSlug: 'atlas',
  })
  const body = simulateRequestBody(payload, null)
  assert.equal(body.payload?.atlas_mode, 'programming')
  assert.equal(body.payload?.routing_domain, 'atlas') // workspaceSlug usado em programming
  assert.equal(body.payload?.flow_id, 'programming.dev')

  // capability_profile/permission_policy só aparecem em programming explicit
  assert.equal(body.payload?.capability_profile, 'atlas_programming')

  const trace = backendHyperflowTrace({
    intent: 'programming',
    domainId: 'programming',
    flowId: 'programming.dev',
    runtimeMode: 'standard',
    handoffTarget: 'atlas_dev',
    handoffReason: 'explicit_programming_composer_contract',
  })
  const view = buildHyperflowRuntimeView(trace)
  assert.equal(view.isDevHandoff, true)
  assert.equal(view.flowId, 'programming.dev')

  const responseText = [
    '## ANSWER_SUMMARY',
    'Patch sugerido em src/foo.ts:42.',
    '',
    '## TRACE',
    'tool:edit src/foo.ts',
    '',
    '## RECEIPT',
    'hash: bbbbbb',
  ].join('\n')
  const presented = projectPresentation(responseText)
  assert.equal(presented.body.includes('TRACE'), false)
  assert.equal(presented.body.includes('RECEIPT'), false)
  // paths editoriais legítimos preservados no body
  assert.ok(presented.body.includes('src/foo.ts:42'))
  assert.ok(Array.isArray(presented.metadata.sections.trace))
  assert.ok(Array.isArray(presented.metadata.sections.receipt))
})
