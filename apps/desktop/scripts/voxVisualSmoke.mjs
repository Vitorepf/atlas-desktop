#!/usr/bin/env node
/**
 * Atlas Vox · visual / contract smoke (Onda 7.9 / Claude Y).
 *
 * Question this script answers:
 *
 *     "O Vox Overlay renderiza honestamente em cada estado canônico,
 *      sem vazar token e sem UI quebrada?"
 *
 * Strategy:
 *   - Boot Vite in SSR/middleware mode (same pattern as visualRender.mjs).
 *   - For each canonical Vox state (closed/listening/transcribing/
 *     transcript_ready/prompt_polish_compiled/intent_compile_compiled/
 *     awaiting_confirmation_r4), build a fully-typed fake
 *     `UseVoxOverlayResult` and renderToStaticMarkup the real VoxOverlay
 *     component.
 *   - Also render VoxButton, VoxGatePanel, VoxReadinessPanel, and the
 *     optional VoxDogfoodPanel.
 *   - Run hard assertions against each fragment + a global cross-cutting
 *     scan for token / sensitive-path leaks.
 *   - Write every fragment + a manifest under
 *     `test-results/vox-visual-smoke/`.
 *
 * What it does NOT do:
 *   - Never opens a microphone or audio device.
 *   - Never spawns a provider CLI (Codex / Claude / Wispr / etc).
 *   - Never calls Tauri or a real backend.
 *   - Never invents pass results. Missing component = fail. Failed
 *     render = fail. Token leak = fail. Sensitive path leak (other than
 *     the documented allowlist) = fail.
 *
 * Exit codes:
 *   0 → status='pass'  · everything green
 *   0 → status='warn'  · optional component absent (e.g. VoxDogfoodPanel)
 *                        OR readiness backend unreachable
 *   1 → status='fail'  · hard contract broken
 *
 * Usage:
 *   npm run vox:visual-smoke --workspace=@atlas/desktop
 */

import { createServer } from 'vite'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// ──────────────────────────────────────────────────────────────────────────
// Paths + SSR globals
// ──────────────────────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SNAPSHOT_DIR = join(ROOT, 'test-results', 'vox-visual-smoke')
mkdirSync(SNAPSHOT_DIR, { recursive: true })

// Force the bridge into 'http' mode so kernel calls would resolve via fetch
// instead of throwing VoxBridgeUnavailable. The SSR render does not call
// useEffect, so no actual network request fires — but the export-time
// MODE/HTTP_BASE constants need to be set.
process.env.VITE_ATLAS_SERVER_URL ||= 'http://127.0.0.1:65535'

// Minimal DOM/Window shim — SSR components only touch them via guarded
// optional chains, but Vite's React plugin pulls in code that probes them.
globalThis.window ??= {
  addEventListener() {},
  removeEventListener() {},
  setTimeout,
  clearTimeout,
  matchMedia: () => ({ matches: false, addListener() {}, removeListener() {} }),
}
Object.defineProperty(globalThis, 'navigator', {
  value: {
    platform: 'MacIntel',
    clipboard: { writeText: async () => {} },
  },
  configurable: true,
})
globalThis.sessionStorage ??= {
  getItem() { return null },
  setItem() {},
  removeItem() {},
}
globalThis.document ??= {
  querySelector() { return null },
  activeElement: null,
  addEventListener() {},
  removeEventListener() {},
}

// ──────────────────────────────────────────────────────────────────────────
// Token / sensitive path canaries
// ──────────────────────────────────────────────────────────────────────────

/** Plaintext sentinel we plant in every fake controller's confirmation_token
 *  so we can grep the resulting HTML and detect any accidental render. */
const TOKEN_CANARY = 'PLAINTEXT_VOX_TOKEN_MUST_NEVER_LEAK_INTO_HTML'

/** Paths that ARE allowed to appear in honest UI strings (e.g. the
 *  "place Whisper model here" hint). Anything else absolute under /Users
 *  or /home is a leak. */
const ALLOWED_PATH_FRAGMENTS = [
  '~/.atlas/vox/models/ggml-large-v3.bin',
  '~/.atlas/vox/',
]

// ──────────────────────────────────────────────────────────────────────────
// Vite SSR bootstrap
// ──────────────────────────────────────────────────────────────────────────

const vite = await createServer({
  root: ROOT,
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'silent',
})

// ──────────────────────────────────────────────────────────────────────────
// Fake controller factories
// ──────────────────────────────────────────────────────────────────────────

function noopAsync() { return Promise.resolve() }
function noop() {}

function makeBaseController(state, overrides = {}) {
  const baseTranscript = overrides.transcript === null
    ? null
    : (overrides.transcript ?? {
      schema: 'atlas.vox.transcript.v1',
      sessionId: 'sess-fake-0001',
      transcriptId: 'tr-fake-0001',
      audioHandle: 'audio-fake-0001',
      language: 'pt-BR',
      engine: 'whisper.cpp@large-v3',
      engineInvocationId: 'inv-fake-0001',
      text: 'manda o Codex investigar esse módulo do voice sem mexer',
      textRaw: 'manda o codex investigar esse modulo do voice sem mexer',
      confidence: 0.91,
      words: [],
      personalDictionaryApplied: ['Codex'],
      postCorrections: [
        { from: 'codex', to: 'Codex', rule: 'personal_dictionary' },
      ],
      latencyMs: {
        captureToSttStart: 12,
        sttProcessing: 480,
        correctionPass: 4,
        total: 496,
      },
      rawPcmPersisted: false,
      eclipseCheck: 'passed',
      createdAt: '2026-05-18T20:00:00Z',
    })

  return {
    state,
    mode: 'tauri',
    selectedMode: overrides.selectedMode ?? 'dictation',
    setSelectedMode: noop,
    providerHint: overrides.providerHint ?? 'auto',
    setProviderHint: noop,
    outputFormat: overrides.outputFormat ?? 'auto',
    setOutputFormat: noop,
    edgeStatus: {
      available: true,
      captureAvailable: true,
      hotkeyAvailable: true,
      activeSessionId: null,
      lastError: null,
      permissions: {
        microphone: 'authorized',
        accessibility: 'authorized',
        inputMonitoring: 'authorized',
      },
      eclipseActive: false,
      defaultHotkey: 'Option+Space',
      pendingCapabilities: [],
    },
    modelStatus: overrides.modelStatus ?? {
      modelId: 'whisper.cpp@large-v3',
      modelFilename: 'ggml-large-v3.bin',
      modelsDir: '~/.atlas/vox/models',
      modelPath: '~/.atlas/vox/models/ggml-large-v3.bin',
      modelFound: true,
      engineAvailable: true,
      nextAction: null,
    },
    hotkeyStatus: null,
    dictionary: null,
    session: overrides.session ?? {
      sessionId: 'sess-fake-0001',
      startedAt: '2026-05-18T20:00:00Z',
      source: 'desktop_overlay',
      modeRequested: overrides.selectedMode ?? 'dictation',
      language: 'pt-BR',
      audioHandle: 'audio-fake-0001',
      rawPcmPersisted: false,
      state: 'ready_for_stt',
      durationMs: 1800,
      sampleRate: 16000,
      channels: 1,
    },
    transcript: baseTranscript,
    transcriptDraft: overrides.transcriptDraft ?? (baseTranscript?.text ?? ''),
    sttError: overrides.sttError ?? null,
    sttAvailable: overrides.sttAvailable ?? true,
    kernelResponse: overrides.kernelResponse ?? null,
    confirmationRequest: overrides.confirmationRequest ?? null,
    literalConfirmationDraft: overrides.literalConfirmationDraft ?? '',
    // V5-B · Symbiotic Interlocutor fields.
    clarificationDraft: overrides.clarificationDraft ?? '',
    interlocutorDismissed: overrides.interlocutorDismissed ?? false,
    interlocutorVisible:
      overrides.interlocutorVisible
      ?? Boolean(
        overrides.kernelResponse
          && overrides.kernelResponse.interlocutor
          && overrides.kernelResponse.interlocutor.intervention !== 'none',
      ),
    executionResult: overrides.executionResult ?? null,
    canExecute: overrides.canExecute ?? false,
    error: null,
    busy: false,
    // actions
    open: noop,
    toggleRecording: noopAsync,
    close: noop,
    start: noopAsync,
    finish: noopAsync,
    cancel: noopAsync,
    eclipse: noopAsync,
    setTranscriptDraft: noop,
    applyDebugTranscript: noopAsync,
    setLiteralConfirmationDraft: noop,
    setClarificationDraft: noop,
    submitClarification: noopAsync,
    applyInterlocutorSuggestion: noop,
    dismissInterlocutor: noop,
    executeConfirmed: noopAsync,
    cancelExecution: noopAsync,
    resetForRecompile: noop,
    compile: noopAsync,
    copyTranscript: async () => ({ ok: true }),
    insertIntoComposer: noop,
    copyText: async () => ({ ok: true }),
    insertText: noop,
    refreshDictionary: async () => null,
    addDictionaryCorrection: async () => ({ ok: true }),
  }
}

/** V5-B · canonical Symbiotic Interlocutor payload shaped like
 *  `atlas.vox.interlocutor_decision.v1`. Mirrors the camelCase form the
 *  bridge parser produces; UI code reads camelCase fields. */
function makeInterlocutor({
  intervention,
  blocking = false,
  messagePtBr,
  questionPtBr = '',
  reasonCode = 'none',
  suggestedEdit = null,
}) {
  return {
    schema: 'atlas.vox.interlocutor_decision.v1',
    intervention,
    messagePtBr,
    questionPtBr,
    blocking,
    reasonCode,
    suggestedEdit,
    policyVersion: '0.1.0',
  }
}

function makeKernelResponse(mode, compiledPrompt) {
  return {
    status: 'ok',
    receiptId: 'rcpt_vox_fake_0001',
    decisionId: 'dec_fake_0001',
    ledgerEventId: 'ldg_fake_0001',
    intentText: 'investigar o módulo de voice',
    risk: 'R0',
    nextAction: 'copy',
    message: null,
    compiledPrompt,
    compiledPromptTemplate: mode === 'intent_compile' ? 'codex.md@v3' : 'polisher@v1',
    preview: 'preview do Kernel para o operador',
    goal: mode === 'intent_compile' ? 'Investigar módulo Voice sem editar arquivos' : null,
    constraints: mode === 'intent_compile' ? ['não editar arquivos', 'não tocar no banco'] : [],
    providerHint: mode === 'intent_compile' ? 'codex_cli' : null,
    executorHint: mode === 'intent_compile' ? 'note' : null,
    outputFormat: mode === 'intent_compile' ? 'plan' : 'text',
    riskClass: 'R0',
    riskReasoning: 'leitura/análise sem efeito externo',
    evidencePromise: 'gravar VOX_TRANSCRIPT_READY + VOX_INTENT_COMPILED',
    previewWhatIHeard: 'manda o Codex investigar esse módulo',
    previewWhatIUnderstood: 'investigar módulo Voice em modo leitura',
    previewWhatIWillDo: 'devolver prompt compilado para copiar/inserir',
    actionsAvailable: ['copy_compiled_prompt', 'insert_compiled_prompt', 'cancel'],
    confirmationRequired: false,
    confirmationRequest: null,
    // V4 · Auto Mode + V5-A · Interlocutor. Defaults honestos: nada de
    // sugestão inventada e nenhuma intervenção. Scenarios sobrescrevem.
    suggestedMode: null,
    suggestedModeReason: null,
    autoModeDecision: null,
    modeResolution: null,
    interlocutor: null,
  }
}

function makeR4ConfirmationRequest() {
  return {
    schema: 'atlas.vox.confirmation_request.v1',
    requestId: 'req_fake_r4_0001',
    sessionId: 'sess-fake-0001',
    intentId: 'intent_fake_r4',
    receiptId: 'rcpt_vox_fake_r4',
    riskClass: 'R4',
    // VoxOverlay reads `cr.preview` as a short STRING (the rich preview
    // triplet lives on `kernelResponse.previewWhatI{Heard,Understood,WillDo}`).
    preview: 'Deploy de produção solicitado — Acionar pipeline via Codex',
    actionsAvailable: ['execute', 'edit_intent', 'cancel'],
    ttlSeconds: 120,
    requiresLiteralConfirmation: true,
    literalConfirmationText: 'execute deploy',
    expiresAt: '2026-05-18T20:02:00Z',
    issuedAt: '2026-05-18T20:00:00Z',
    // CRITICAL · the canary token must NEVER appear in any rendered HTML.
    confirmationToken: TOKEN_CANARY,
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Check harness
// ──────────────────────────────────────────────────────────────────────────

const checks = []
const artifacts = []
let hasFail = false
let hasWarn = false

function record({ id, status, summary, detail = null, nextAction = null, artifact = null }) {
  if (status === 'fail') hasFail = true
  if (status === 'warn') hasWarn = true
  checks.push({ id, status, summary, detail, next_action: nextAction, artifact })
}

function writeArtifact(name, html) {
  const path = join(SNAPSHOT_DIR, `${name}.html`)
  writeFileSync(path, html)
  artifacts.push({ name, path: `test-results/vox-visual-smoke/${name}.html`, bytes: html.length })
  return path
}

function assertContains(html, needle, label) {
  if (!html.includes(needle)) {
    throw new Error(`expected HTML to contain ${JSON.stringify(needle)} (${label})`)
  }
}

function assertDoesNotContain(html, needle, label) {
  if (html.includes(needle)) {
    throw new Error(`HTML unexpectedly contains ${JSON.stringify(needle)} (${label})`)
  }
}

function scanTokenLeak(html, where) {
  if (html.includes(TOKEN_CANARY)) {
    throw new Error(`confirmation_token CANARY leaked into HTML at ${where}`)
  }
}

function scanSensitivePathLeak(html, where) {
  // Allowlist the documented "place the model here" hint, then look for any
  // OTHER absolute path under /Users/ or /home/ — those would mean a real
  // dev path baked into a snapshot.
  let scrubbed = html
  for (const allowed of ALLOWED_PATH_FRAGMENTS) {
    scrubbed = scrubbed.split(allowed).join('')
  }
  const usersMatch = scrubbed.match(/\/Users\/[a-zA-Z0-9_\-\/.]+/)
  if (usersMatch) {
    throw new Error(`sensitive absolute path leaked into HTML at ${where}: ${usersMatch[0]}`)
  }
  const homeMatch = scrubbed.match(/\/home\/[a-zA-Z0-9_\-\/.]+/)
  if (homeMatch) {
    throw new Error(`sensitive absolute path leaked into HTML at ${where}: ${homeMatch[0]}`)
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Load real components
// ──────────────────────────────────────────────────────────────────────────

let VoxOverlay, VoxButton, VoxGatePanel, VoxReadinessPanel, VoxDogfoodPanel = null

try {
  ;({ VoxOverlay } = await vite.ssrLoadModule('/src/components/vox/VoxOverlay.tsx'))
  ;({ VoxButton } = await vite.ssrLoadModule('/src/components/vox/VoxButton.tsx'))
  ;({ VoxGatePanel } = await vite.ssrLoadModule('/src/components/vox/VoxGatePanel.tsx'))
  ;({ VoxReadinessPanel } = await vite.ssrLoadModule('/src/components/vox/VoxReadinessPanel.tsx'))
} catch (e) {
  record({
    id: 'load_required_modules',
    status: 'fail',
    summary: 'Não foi possível carregar VoxOverlay/VoxButton/VoxGatePanel/VoxReadinessPanel via SSR',
    detail: { error: String(e?.message ?? e) },
    nextAction: 'Verificar imports / build do componente.',
  })
}

try {
  ;({ VoxDogfoodPanel } = await vite.ssrLoadModule('/src/components/vox/VoxDogfoodPanel.tsx'))
} catch {
  // Dogfood panel is optional — its absence becomes a warn check below.
}

// ──────────────────────────────────────────────────────────────────────────
// The actual checks
// ──────────────────────────────────────────────────────────────────────────

function runCheck(id, summary, fn, { hardFail = true } = {}) {
  try {
    const result = fn()
    if (result && typeof result === 'object' && 'status' in result) {
      record({ id, summary, ...result })
    } else {
      record({ id, status: 'pass', summary, detail: result ?? null })
    }
  } catch (e) {
    record({
      id,
      status: hardFail ? 'fail' : 'warn',
      summary,
      detail: { error: String(e?.message ?? e) },
      nextAction: hardFail ? 'Corrigir antes de continuar; smoke trava.' : 'Investigar quando puder.',
    })
  }
}

if (VoxOverlay && VoxButton && VoxGatePanel && VoxReadinessPanel) {
  // 1. Botão Vox renderiza com aria-label e título
  runCheck('overlay_closed_button_renders', 'VoxButton renderiza em estado closed', () => {
    const html = renderToStaticMarkup(createElement(VoxButton, {
      state: 'closed',
      onClick: noop,
    }))
    writeArtifact('vox-button-closed', html)
    assertContains(html, 'aria-label', 'aria-label presente')
    assertContains(html, 'Vox', 'tooltip Vox presente')
    scanTokenLeak(html, 'vox-button-closed')
    scanSensitivePathLeak(html, 'vox-button-closed')
    return { artifact: 'vox-button-closed.html' }
  })

  // 2. Listening exibe "Atlas ouvindo" + botão primário "Finalizar".
  runCheck('overlay_listening_shows_atlas_ouvindo', 'Estado listening exibe "Atlas ouvindo" + Finalizar', () => {
    const ctl = makeBaseController('listening', { transcript: null })
    const html = renderToStaticMarkup(createElement(VoxOverlay, { controller: ctl }))
    writeArtifact('overlay-listening', html)
    assertContains(html, 'Atlas ouvindo', 'label "Atlas ouvindo" presente')
    // V6-ES-A · primary CTA "Finalizar" sempre visível em listening.
    const finalizar = html.match(/<button[^>]*>Finalizar<\/button>/)
    if (!finalizar) throw new Error('botão primário "Finalizar" ausente em listening')
    if (/\bdisabled\b/.test(finalizar[0])) {
      throw new Error('listening sem busy: Finalizar não deveria estar disabled')
    }
    scanTokenLeak(html, 'overlay-listening')
    scanSensitivePathLeak(html, 'overlay-listening')
    return { artifact: 'overlay-listening.html' }
  })

  // 2b. Error state · ação primária precisa ser "Tentar novamente".
  runCheck('overlay_error_offers_tentar_novamente', 'Estado error oferece "Tentar novamente"', () => {
    const ctl = makeBaseController('error', { transcript: null })
    // Simula erro real: humanizeOverlayError consumiria a string, mas o
    // controller passa `error` direto. O atalho aqui é injetar via shim.
    ctl.error = 'O Atlas não recebeu áudio do microfone. Libere o microfone para Atlas Code em Ajustes do Sistema e grave de novo.'
    const html = renderToStaticMarkup(createElement(VoxOverlay, { controller: ctl }))
    writeArtifact('overlay-error', html)
    assertContains(html, 'O Atlas não recebeu áudio', 'mensagem de erro humanizada presente')
    // V6-ES-A · primary "Tentar novamente" presente.
    const retry = html.match(/<button[^>]*>Tentar novamente<\/button>/)
    if (!retry) throw new Error('botão primário "Tentar novamente" ausente em error')
    // Garante que NÃO ficou o label de início "Começar" em error.
    if (/>Começar<\/button>/.test(html)) {
      throw new Error('error não deveria mostrar "Começar"')
    }
    scanTokenLeak(html, 'overlay-error')
    scanSensitivePathLeak(html, 'overlay-error')
    return { artifact: 'overlay-error.html' }
  })

  // 2c. Idle fresh · ação primária precisa ser "Começar".
  runCheck('overlay_idle_fresh_shows_comecar', 'Idle fresh exibe "Começar" como primary', () => {
    const ctl = makeBaseController('idle', { transcript: null })
    // Garante "fresh" honesto — sem transcript, sem kernelResponse, sem
    // executionResult, sem sttError → hasAnyResult=false.
    const html = renderToStaticMarkup(createElement(VoxOverlay, { controller: ctl }))
    writeArtifact('overlay-idle-fresh', html)
    const start = html.match(/<button[^>]*>Começar<\/button>/)
    if (!start) throw new Error('botão primário "Começar" ausente em idle fresh')
    // Idle fresh não deve mostrar "Gravar de novo".
    if (/>Gravar de novo<\/button>/.test(html)) {
      throw new Error('idle fresh não deveria mostrar "Gravar de novo"')
    }
    scanTokenLeak(html, 'overlay-idle-fresh')
    scanSensitivePathLeak(html, 'overlay-idle-fresh')
    return { artifact: 'overlay-idle-fresh.html' }
  })

  // 3. Transcribing exibe "Transcrevendo localmente…" (sem citar Whisper na UI)
  runCheck('overlay_transcribing_shows_label', 'Estado transcribing exibe "Transcrevendo"', () => {
    const ctl = makeBaseController('transcribing', { transcript: null })
    const html = renderToStaticMarkup(createElement(VoxOverlay, { controller: ctl }))
    writeArtifact('overlay-transcribing', html)
    assertContains(html, 'Transcrevendo localmente', 'banner transcribing presente')
    scanTokenLeak(html, 'overlay-transcribing')
    scanSensitivePathLeak(html, 'overlay-transcribing')
    return { artifact: 'overlay-transcribing.html' }
  })

  // 4. Transcript ready exibe seção "Texto ouvido" com o transcript
  runCheck('overlay_transcript_ready_shows_ouvi', 'Transcript pronto mostra "Ouvi" + transcript', () => {
    const ctl = makeBaseController('transcript_ready')
    const html = renderToStaticMarkup(createElement(VoxOverlay, { controller: ctl }))
    writeArtifact('overlay-transcript-ready', html)
    assertContains(html, 'Texto ouvido', 'seção "Texto ouvido" presente')
    assertContains(html, 'manda o Codex investigar', 'transcript renderizado')
    scanTokenLeak(html, 'overlay-transcript-ready')
    scanSensitivePathLeak(html, 'overlay-transcript-ready')
    return { artifact: 'overlay-transcript-ready.html' }
  })

  // 5. Modo Melhorar compilado mostra "Ver texto completo" + compiled_prompt
  runCheck('overlay_prompt_polish_shows_compiled', 'Modo Melhorar exibe "Ver texto completo" com texto melhorado', () => {
    const compiled = 'Por favor leia o módulo Voice/Vox em modo análise. Não edite arquivos.'
    const ctl = makeBaseController('compiled', {
      selectedMode: 'prompt_polish',
      kernelResponse: makeKernelResponse('prompt_polish', compiled),
    })
    const html = renderToStaticMarkup(createElement(VoxOverlay, { controller: ctl }))
    writeArtifact('overlay-prompt-polish', html)
    assertContains(html, 'Ver texto completo', 'título "Ver texto completo" presente')
    assertContains(html, compiled, 'compiled_prompt renderizado')
    // V6-ES-A · em prompt_polish a ação primária precisa ser "Inserir texto".
    assertContains(html, 'Inserir texto', 'primary CTA "Inserir texto" presente em prompt_polish')
    assertDoesNotContain(html, '>Confirmar<', 'label estático "Confirmar" não deve aparecer em prompt_polish')
    scanTokenLeak(html, 'overlay-prompt-polish')
    scanSensitivePathLeak(html, 'overlay-prompt-polish')
    return { artifact: 'overlay-prompt-polish.html' }
  })

  // 6. Criar prompt mostra o resultado importante no fluxo principal; os
  // detalhes técnicos continuam presentes apenas no bloco avançado.
  runCheck('overlay_intent_compile_shows_rich_packet', 'Criar prompt exibe objetivo, restrições e prompt poderoso', () => {
    const compiled = 'Voce é o Codex. Investigue o módulo Voice/Vox sem editar.'
    const ctl = makeBaseController('compiled', {
      selectedMode: 'intent_compile',
      providerHint: 'codex_cli',
      outputFormat: 'plan',
      kernelResponse: makeKernelResponse('intent_compile', compiled),
    })
    const html = renderToStaticMarkup(createElement(VoxOverlay, { controller: ctl }))
    writeArtifact('overlay-intent-compile', html)
    assertContains(html, 'Ver prompt completo', 'título "Ver prompt completo" presente')
    assertContains(html, 'Investigar módulo Voice sem editar arquivos', 'goal renderizado')
    assertContains(html, 'não editar arquivos', 'constraint renderizada')
    assertContains(html, 'R0', 'classe de risco preservada no diagnóstico')
    assertContains(html, 'Codex', 'destino traduzido preservado no diagnóstico')
    assertContains(html, 'Plano', 'formato traduzido preservado no diagnóstico')
    // V6-ES-A · em intent_compile a ação primária precisa ser "Enviar ao Atlas".
    assertContains(html, 'Enviar ao Atlas', 'primary CTA "Enviar ao Atlas" presente em intent_compile')
    assertDoesNotContain(html, '>Confirmar<', 'label estático "Confirmar" não deve aparecer em intent_compile')
    scanTokenLeak(html, 'overlay-intent-compile')
    scanSensitivePathLeak(html, 'overlay-intent-compile')
    return { artifact: 'overlay-intent-compile.html' }
  })

  // 7. Governed Execute (R4) mostra confirmation UI + literal input
  runCheck('overlay_r4_requires_literal_confirmation', 'R4 exige confirmação literal e botão Executar bloqueado sem texto', () => {
    const compiled = 'Acionar pipeline de deploy.'
    const cr = makeR4ConfirmationRequest()
    const ctl = makeBaseController('awaiting_confirmation', {
      selectedMode: 'governed_execute',
      providerHint: 'codex_cli',
      kernelResponse: {
        ...makeKernelResponse('intent_compile', compiled),
        confirmationRequired: true,
        confirmationRequest: cr,
      },
      confirmationRequest: cr,
      literalConfirmationDraft: '',
      canExecute: true, // canExecute true MAS literal vazio → botão must stay disabled
    })
    const html = renderToStaticMarkup(createElement(VoxOverlay, { controller: ctl }))
    writeArtifact('overlay-r4-awaiting', html)
    assertContains(html, 'Digite literalmente para liberar Executar', 'instrução literal presente')
    assertContains(html, 'execute deploy', 'literal_confirmation_text renderizado como código')
    // O botão é literalmente "Executar". O overlay decide o
    // disabled via `!canExecute || !literalOk` — com canExecute=true e
    // literalConfirmationDraft='' (literalOk=false), o disabled DEVE estar
    // presente na tag <button> exata que envolve esse label.
    const executionButton = html.match(/<button[^>]*title="Digite a frase exigida para liberar a execução"[^>]*>Executar<\/button>/)
    if (!executionButton) throw new Error('botão "Executar" da confirmação R4 não encontrado')
    if (!/\bdisabled\b/.test(executionButton[0])) {
      throw new Error('R4 sem literal: botão "Executar" deveria estar disabled, mas não estava')
    }
    scanTokenLeak(html, 'overlay-r4-awaiting')
    scanSensitivePathLeak(html, 'overlay-r4-awaiting')
    return { artifact: 'overlay-r4-awaiting.html' }
  })

  // ──────────────────────────────────────────────────────────────────────
  // V5-B · Symbiotic Interlocutor scenarios
  //   Cada cenário verifica que (a) a UI mostra a mensagem em PT-BR vinda
  //   do Kernel, (b) os botões corretos aparecem, e (c) o gate em Confirmar
  //   reage ao `blocking` honestamente.
  // ──────────────────────────────────────────────────────────────────────

  // 7a. clarify · campo de resposta + botão Responder
  runCheck('overlay_interlocutor_clarify', 'V5 clarify mostra pergunta + input + botão Responder', () => {
    const compiled = 'Investigar isso aqui.'
    const kernel = makeKernelResponse('intent_compile', compiled)
    kernel.interlocutor = makeInterlocutor({
      intervention: 'clarify',
      messagePtBr: 'Você usou "isso aqui" e eu não tenho contexto suficiente para resolver isso sem perguntar.',
      questionPtBr: 'Você quer usar a obra atual, o arquivo aberto, ou um caminho específico?',
      reasonCode: 'ambiguous_reference',
      suggestedEdit: null,
    })
    const ctl = makeBaseController('compiled', {
      selectedMode: 'intent_compile',
      kernelResponse: kernel,
      clarificationDraft: '',
    })
    const html = renderToStaticMarkup(createElement(VoxOverlay, { controller: ctl }))
    writeArtifact('overlay-interlocutor-clarify', html)
    assertContains(html, 'Antes de seguir', 'eyebrow "Antes de seguir" presente em clarify')
    assertContains(html, 'isso aqui', 'mensagem do Kernel preservada')
    assertContains(html, 'obra atual', 'pergunta do Kernel preservada')
    assertContains(html, 'Sua resposta', 'label do input clarify presente')
    // O botão "Responder" deve existir; com clarificationDraft='' ele fica
    // disabled. O Confirmar do bloco principal continua habilitado (clarify
    // nunca é bloqueante).
    const responder = html.match(/<button[^>]*>Responder<\/button>/)
    if (!responder) throw new Error('botão Responder ausente em clarify')
    if (!/\bdisabled\b/.test(responder[0])) {
      throw new Error('Responder com clarificationDraft vazio deveria estar disabled')
    }
    const confirmar = html.match(/<button[^>]*>Enviar ao Atlas<\/button>/)
    if (!confirmar) throw new Error('botão primário "Enviar ao Atlas" ausente em clarify')
    if (/\bdisabled\b/.test(confirmar[0])) {
      throw new Error('clarify não-bloqueante: primary não deveria estar disabled')
    }
    scanTokenLeak(html, 'overlay-interlocutor-clarify')
    scanSensitivePathLeak(html, 'overlay-interlocutor-clarify')
    return { artifact: 'overlay-interlocutor-clarify.html' }
  })

  // 7b. caution · aviso + "Continuar mesmo assim"
  runCheck('overlay_interlocutor_caution', 'V5 caution mostra aviso + Continuar mesmo assim', () => {
    const compiled = 'Editar arquivo de configuração.'
    const kernel = makeKernelResponse('intent_compile', compiled)
    kernel.riskClass = 'R2'
    kernel.risk = 'R2'
    kernel.interlocutor = makeInterlocutor({
      intervention: 'caution',
      messagePtBr: 'Risco R2 — alteração local reversível. Confere se o caminho está certo antes de seguir.',
      reasonCode: 'destructive_risk',
    })
    const ctl = makeBaseController('compiled', {
      selectedMode: 'intent_compile',
      kernelResponse: kernel,
    })
    const html = renderToStaticMarkup(createElement(VoxOverlay, { controller: ctl }))
    writeArtifact('overlay-interlocutor-caution', html)
    assertContains(html, 'Atlas respondeu', 'eyebrow "Atlas respondeu" presente em caution')
    assertContains(html, 'Risco R2', 'mensagem do Kernel preservada')
    assertContains(html, 'Continuar mesmo assim', 'botão Continuar mesmo assim presente')
    // Confirmar continua habilitado (caution não bloqueia).
    const confirmar = html.match(/<button[^>]*>Enviar ao Atlas<\/button>/)
    if (!confirmar) throw new Error('botão primário "Enviar ao Atlas" ausente em caution')
    if (/\bdisabled\b/.test(confirmar[0])) {
      throw new Error('caution não bloqueante: primary não deveria estar disabled')
    }
    scanTokenLeak(html, 'overlay-interlocutor-caution')
    scanSensitivePathLeak(html, 'overlay-interlocutor-caution')
    return { artifact: 'overlay-interlocutor-caution.html' }
  })

  // 7c. disagree bloqueante · Confirmar trancado, Editar intenção visível
  runCheck('overlay_interlocutor_disagree_blocking', 'V5 disagree blocking trava Confirmar + Editar intenção', () => {
    const compiled = 'Rodar rm -rf no projeto inteiro.'
    const kernel = makeKernelResponse('intent_compile', compiled)
    kernel.riskClass = 'R4'
    kernel.risk = 'R4'
    kernel.interlocutor = makeInterlocutor({
      intervention: 'disagree',
      blocking: true,
      messagePtBr: 'Eu faria diferente por segurança. Detectei "rm -rf" e essa ação pode ser irreversível.',
      questionPtBr: 'Tem certeza absoluta? Caminho mais seguro: mover para uma pasta de quarentena antes de remover.',
      reasonCode: 'destructive_risk',
      suggestedEdit: {
        safer_path: 'mover para uma pasta de quarentena antes de remover',
        destructive_marker: 'rm_rf',
      },
    })
    const ctl = makeBaseController('compiled', {
      selectedMode: 'intent_compile',
      kernelResponse: kernel,
    })
    const html = renderToStaticMarkup(createElement(VoxOverlay, { controller: ctl }))
    writeArtifact('overlay-interlocutor-disagree-blocking', html)
    assertContains(html, 'rm -rf', 'mensagem do Kernel preservada')
    assertContains(html, 'Ação bloqueada por política de segurança', 'aviso de bloqueio presente')
    assertContains(html, 'Editar intenção', 'botão Editar intenção presente')
    assertContains(html, 'Usar caminho mais seguro', 'botão Usar caminho mais seguro presente')
    // V6-ES-A · primary precisa estar disabled em blocking (label dinâmico).
    const confirmar = html.match(/<button[^>]*>Enviar ao Atlas<\/button>/)
    if (!confirmar) throw new Error('botão primário "Enviar ao Atlas" ausente')
    if (!/\bdisabled\b/.test(confirmar[0])) {
      throw new Error('disagree blocking: primary deveria estar disabled')
    }
    // "Manter original" NÃO deve aparecer quando bloqueante.
    if (/>Manter original</.test(html)) {
      throw new Error('disagree blocking não deveria oferecer "Manter original"')
    }
    scanTokenLeak(html, 'overlay-interlocutor-disagree-blocking')
    scanSensitivePathLeak(html, 'overlay-interlocutor-disagree-blocking')
    return { artifact: 'overlay-interlocutor-disagree-blocking.html' }
  })

  // 7d. suggest_better_prompt · Usar sugestão + Manter original
  runCheck('overlay_interlocutor_suggest_better_prompt', 'V5 suggest_better_prompt oferece Usar sugestão + Manter original', () => {
    const compiled = 'Roda os testes.'
    const kernel = makeKernelResponse('intent_compile', compiled)
    kernel.interlocutor = makeInterlocutor({
      intervention: 'suggest_better_prompt',
      messagePtBr: 'O prompt ficou enxuto demais para a IA externa: sem objetivo claro e sem restrições.',
      questionPtBr: 'Quer que eu sugira uma estrutura com objetivo, contexto, restrições e critério de aceite antes de enviar?',
      reasonCode: 'weak_prompt',
      suggestedEdit: {
        add_sections: ['objetivo', 'contexto', 'restrições', 'critério de aceite'],
        goal_hint: 'Descrever o que a IA deve fazer (um verbo + um alvo).',
        constraints_hint: 'Listar o que NÃO deve mexer e o que DEVE preservar.',
        acceptance_hint: 'Como você vai validar que ficou pronto (build verde, teste passando, comportamento X).',
      },
    })
    const ctl = makeBaseController('compiled', {
      selectedMode: 'intent_compile',
      kernelResponse: kernel,
    })
    const html = renderToStaticMarkup(createElement(VoxOverlay, { controller: ctl }))
    writeArtifact('overlay-interlocutor-suggest-better-prompt', html)
    assertContains(html, 'prompt ficou enxuto', 'mensagem do Kernel preservada')
    assertContains(html, 'Usar sugestão', 'botão Usar sugestão presente')
    assertContains(html, 'Manter original', 'botão Manter original presente')
    // Não bloqueante: primary continua disponível.
    const confirmar = html.match(/<button[^>]*>Enviar ao Atlas<\/button>/)
    if (!confirmar) throw new Error('botão primário "Enviar ao Atlas" ausente')
    if (/\bdisabled\b/.test(confirmar[0])) {
      throw new Error('suggest_better_prompt não bloqueante: primary não deveria estar disabled')
    }
    scanTokenLeak(html, 'overlay-interlocutor-suggest-better-prompt')
    scanSensitivePathLeak(html, 'overlay-interlocutor-suggest-better-prompt')
    return { artifact: 'overlay-interlocutor-suggest-better-prompt.html' }
  })

  // 7e. intervention=none · nenhum bloco de interlocutor é renderizado.
  runCheck('overlay_interlocutor_none_hidden', 'V5 intervention=none não renderiza o card', () => {
    const compiled = 'Investigar módulo Voice.'
    const kernel = makeKernelResponse('intent_compile', compiled)
    kernel.interlocutor = makeInterlocutor({
      intervention: 'none',
      messagePtBr: '',
      questionPtBr: '',
    })
    const ctl = makeBaseController('compiled', {
      selectedMode: 'intent_compile',
      kernelResponse: kernel,
      interlocutorVisible: false,
    })
    const html = renderToStaticMarkup(createElement(VoxOverlay, { controller: ctl }))
    writeArtifact('overlay-interlocutor-none', html)
    if (/vox-v4-interlocutor[^"]*"/.test(html)) {
      throw new Error('intervention=none deveria esconder o card interlocutor')
    }
    scanTokenLeak(html, 'overlay-interlocutor-none')
    scanSensitivePathLeak(html, 'overlay-interlocutor-none')
    return { artifact: 'overlay-interlocutor-none.html' }
  })

  // V6 Reply Surface · "Atlas respondeu" no estado compiled.
  runCheck('overlay_v6_reply_prompt_ready', 'V6 reply card mostra "Prompt pronto." no compiled', () => {
    const compiled = 'Investigar módulo Voice em modo leitura.'
    const ctl = makeBaseController('compiled', {
      selectedMode: 'intent_compile',
      providerHint: 'codex_cli',
      kernelResponse: makeKernelResponse('intent_compile', compiled),
    })
    const html = renderToStaticMarkup(createElement(VoxOverlay, { controller: ctl }))
    writeArtifact('overlay-v6-reply-prompt-ready', html)
    assertContains(html, 'vox-v4-reply', 'classe do reply card presente')
    assertContains(html, 'Atlas respondeu', 'eyebrow Atlas respondeu visível')
    assertContains(html, 'Prompt pronto.', 'frase canônica visível')
    // voice tag NÃO aparece quando voice_mode='off' (default em SSR).
    if (html.includes('voz curta')) {
      throw new Error('voz curta tag não deveria aparecer em voice_mode=off default')
    }
    scanTokenLeak(html, 'overlay-v6-reply-prompt-ready')
    scanSensitivePathLeak(html, 'overlay-v6-reply-prompt-ready')
    return { artifact: 'overlay-v6-reply-prompt-ready.html' }
  })

  runCheck('overlay_v6_reply_blocked_safety', 'V6 reply card mostra "Bloqueei por segurança." em disagree blocking', () => {
    const compiled = 'Apagar tudo do diretório.'
    const kernel = makeKernelResponse('intent_compile', compiled)
    kernel.interlocutor = makeInterlocutor({
      intervention: 'disagree',
      blocking: true,
      messagePtBr: 'Eu faria diferente por segurança: arquivar primeiro.',
      questionPtBr: 'Confirma seguir mesmo assim?',
      reasonCode: 'destructive_risk',
    })
    const ctl = makeBaseController('compiled', {
      selectedMode: 'intent_compile',
      kernelResponse: kernel,
      interlocutorVisible: true,
    })
    const html = renderToStaticMarkup(createElement(VoxOverlay, { controller: ctl }))
    writeArtifact('overlay-v6-reply-blocked-safety', html)
    assertContains(html, 'Bloqueei por segurança.', 'reply canônica do blocking')
    assertContains(html, 'vox-v4-reply', 'card V6 presente')
    scanTokenLeak(html, 'overlay-v6-reply-blocked-safety')
    scanSensitivePathLeak(html, 'overlay-v6-reply-blocked-safety')
    return { artifact: 'overlay-v6-reply-blocked-safety.html' }
  })

  runCheck('overlay_v6_reply_need_detail', 'V6 reply card mostra "Preciso de um detalhe." em clarify', () => {
    const compiled = 'Olhar trecho.'
    const kernel = makeKernelResponse('intent_compile', compiled)
    kernel.interlocutor = makeInterlocutor({
      intervention: 'clarify',
      blocking: false,
      messagePtBr: 'Preciso de um detalhe antes de seguir.',
      questionPtBr: 'Você quis dizer o arquivo aberto ou outro?',
      reasonCode: 'ambiguous_reference',
    })
    const ctl = makeBaseController('compiled', {
      selectedMode: 'intent_compile',
      kernelResponse: kernel,
      interlocutorVisible: true,
    })
    const html = renderToStaticMarkup(createElement(VoxOverlay, { controller: ctl }))
    writeArtifact('overlay-v6-reply-need-detail', html)
    assertContains(html, 'Preciso de um detalhe.', 'reply canônica do clarify')
    return { artifact: 'overlay-v6-reply-need-detail.html' }
  })

  runCheck('overlay_v6_reply_suppressed_for_caution', 'V6 reply card NÃO aparece em caution (opinião pura)', () => {
    const compiled = 'Editar config local.'
    const kernel = makeKernelResponse('intent_compile', compiled)
    kernel.interlocutor = makeInterlocutor({
      intervention: 'caution',
      blocking: false,
      messagePtBr: 'Risco médio — alteração local reversível.',
      questionPtBr: '',
      reasonCode: 'destructive_risk',
    })
    const ctl = makeBaseController('compiled', {
      selectedMode: 'intent_compile',
      kernelResponse: kernel,
      interlocutorVisible: true,
    })
    const html = renderToStaticMarkup(createElement(VoxOverlay, { controller: ctl }))
    writeArtifact('overlay-v6-reply-suppressed-caution', html)
    if (/vox-v4-reply\b/.test(html)) {
      throw new Error('reply card V6 NÃO deveria aparecer em caution')
    }
    return { artifact: 'overlay-v6-reply-suppressed-caution.html' }
  })

  // 8. V3 Gate panel renderiza (apenas estrutura inicial; loadAll é async + sem rede em SSR)
  runCheck('gate_panel_renders_open', 'VoxGatePanel renderiza com open=true (loading inicial honesto)', () => {
    const html = renderToStaticMarkup(createElement(VoxGatePanel, { open: true }))
    writeArtifact('gate-panel-open', html)
    if (html.trim() === '') throw new Error('VoxGatePanel renderizou string vazia com open=true')
    scanTokenLeak(html, 'gate-panel-open')
    scanSensitivePathLeak(html, 'gate-panel-open')
    return { artifact: 'gate-panel-open.html', detail: { bytes: html.length } }
  })

  // 9. V3 Gate panel fechado retorna null (UX correta)
  runCheck('gate_panel_closed_returns_null', 'VoxGatePanel fechado não renderiza nada', () => {
    const html = renderToStaticMarkup(createElement(VoxGatePanel, { open: false }))
    if (html.trim() !== '') {
      throw new Error('VoxGatePanel fechado deveria retornar string vazia, mas renderizou conteúdo')
    }
  })

  // 10. Readiness panel renderiza com open=true e mostra cabeçalho
  runCheck('readiness_panel_renders', 'VoxReadinessPanel renderiza com open=true', () => {
    const html = renderToStaticMarkup(createElement(VoxReadinessPanel, { open: true }))
    writeArtifact('readiness-panel-open', html)
    if (html.trim() === '') throw new Error('VoxReadinessPanel renderizou string vazia')
    // Em SSR não há dados — o painel deve estar em estado loading/checking,
    // mas a estrutura precisa estar lá (heading container).
    assertContains(html, 'vox-readiness-panel', 'container do painel presente')
    scanTokenLeak(html, 'readiness-panel-open')
    scanSensitivePathLeak(html, 'readiness-panel-open')
    return { artifact: 'readiness-panel-open.html' }
  })

  // 11. Dogfood panel é OPCIONAL — warn se ausente, render se presente.
  if (VoxDogfoodPanel) {
    runCheck('dogfood_panel_renders', 'VoxDogfoodPanel renderiza isolado (open=true)', () => {
      let html
      try {
        html = renderToStaticMarkup(createElement(VoxDogfoodPanel, { open: true }))
      } catch (e) {
        // If the panel takes required props we can't synthesise, fall back
        // to closed render so we still validate the import.
        html = renderToStaticMarkup(createElement(VoxDogfoodPanel, { open: false }))
      }
      writeArtifact('dogfood-panel', html)
      scanTokenLeak(html, 'dogfood-panel')
      scanSensitivePathLeak(html, 'dogfood-panel')
      return { artifact: 'dogfood-panel.html', detail: { bytes: html.length } }
    }, { hardFail: false })
  } else {
    record({
      id: 'dogfood_panel_renders',
      status: 'warn',
      summary: 'VoxDogfoodPanel ausente — pulo opcional',
      detail: { reason: 'module not found via ssrLoadModule' },
      nextAction: 'Sem ação obrigatória; o painel é opcional.',
    })
  }

  // 12. Mensagens de unavailable / honestidade · readiness com estado vazio
  runCheck('readiness_panel_honest_when_no_backend', 'Readiness é honesto quando backend não responde', () => {
    const html = renderToStaticMarkup(createElement(VoxReadinessPanel, { open: true }))
    // Deve haver pelo menos uma indicação textual que reflete loading,
    // unavailable, ou estado inicial honesto (palavras do painel real).
    const indicators = [
      'verificando',
      'aguardando primeira verificação',
      'indisponível',
      'parcial',
      'pronto',
      'bloqueado',
    ]
    if (!indicators.some((needle) => html.includes(needle))) {
      throw new Error('readiness panel não comunica estado honesto (sem palavras-chave esperadas)')
    }
  })

  // 13. Overlay closed retorna string vazia (UX correta · não vaza nada)
  runCheck('overlay_closed_returns_empty', 'VoxOverlay com state=closed não renderiza HTML', () => {
    const ctl = makeBaseController('closed', { transcript: null })
    const html = renderToStaticMarkup(createElement(VoxOverlay, { controller: ctl }))
    if (html.trim() !== '') {
      throw new Error('overlay closed deveria retornar string vazia')
    }
  })

  // 14. Cross-cutting: nenhum dos artefatos contém o canary token.
  runCheck('global_no_token_leak_across_artifacts', 'Nenhum artefato gerado contém o canary de confirmation_token', () => {
    for (const art of artifacts) {
      const path = join(ROOT, art.path)
      const content = readArtifact(path)
      if (content.includes(TOKEN_CANARY)) {
        throw new Error(`TOKEN_CANARY encontrado em ${art.path}`)
      }
    }
  })

  // 15. V6-ES-D · anti-regressão de jargão técnico no fluxo principal.
  //
  // Para cada artefato de overlay (excluindo painéis Detalhes Avançados),
  // extraímos APENAS o texto realmente visível ao operador (descartando
  // tudo dentro de elementos `hidden=""`) e exigimos zero hits dos
  // termos proibidos. Esse check protege a sensação enterprise.
  runCheck('main_flow_has_no_forbidden_terms_visible', 'Fluxo principal não exibe jargão técnico ao operador (filtra hidden=""))', () => {
    const FORBIDDEN = [
      // V6-ES-D originais
      'Dictation',
      'Prompt Polish',
      'Intent Compile',
      'Governed Execute',
      'Readiness',
      'Rivals',
      'Dogfood',
      'rms=',
      'peak=',
      'active_ratio',
      'AudioInputInvalid',
      'vox session already active',
      'panicked at',
      '[object Object]',
      // V6-UX-FINAL · termos adicionais que jamais devem chegar ao operador
      // no fluxo principal. "Gate" e "Kernel" são técnicos demais para
      // overlay; "STT" é sigla; "receipt" é jargão jurídico/contábil
      // interno; "session id"/"bridge"/"422" expõem arquitetura.
      'Gate',
      'Kernel',
      'receipt',
      'STT',
      'session id',
      'session_id',
      'bridge',
      ' 422',
      'raw pcm',
    ]
    // Estados que representam o fluxo principal visível ao operador.
    // Painéis isolados (Gate/Readiness/Dogfood) ficam de fora porque só
    // aparecem dentro de "Detalhes avançados" no overlay real.
    const MAIN_FLOW_STATES = [
      'overlay-idle-fresh.html',
      'overlay-listening.html',
      'overlay-transcribing.html',
      'overlay-transcript-ready.html',
      'overlay-prompt-polish.html',
      'overlay-intent-compile.html',
      'overlay-r4-awaiting.html',
      'overlay-error.html',
      'overlay-v6-reply-prompt-ready.html',
      'overlay-v6-reply-blocked-safety.html',
      'overlay-v6-reply-need-detail.html',
      'overlay-interlocutor-clarify.html',
      'overlay-interlocutor-caution.html',
      'overlay-interlocutor-disagree-blocking.html',
      'overlay-interlocutor-suggest-better-prompt.html',
    ]
    const leaks = []
    for (const name of MAIN_FLOW_STATES) {
      const path = join(SNAPSHOT_DIR, name)
      let content
      try {
        content = readArtifact(path)
      } catch {
        continue
      }
      const visible = extractVisibleText(content)
      for (const term of FORBIDDEN) {
        if (visible.includes(term)) {
          leaks.push(`${name}: "${term}"`)
        }
      }
    }
    if (leaks.length > 0) {
      throw new Error(`Termos proibidos visíveis no fluxo principal:\n  - ${leaks.join('\n  - ')}`)
    }
  })

  // 16. V6-ES-D · cada estado principal tem ao menos uma saída clara
  //     (botão visível que tira o operador desse estado). "X" fechar conta
  //     porque é universal, mas exigimos PELO MENOS UM botão com texto.
  runCheck('every_main_state_has_an_exit_action', 'Cada estado principal tem ao menos uma ação/saída visível ao operador', () => {
    const MAIN_FLOW_STATES = [
      'overlay-idle-fresh.html',
      'overlay-listening.html',
      'overlay-transcribing.html',
      'overlay-transcript-ready.html',
      'overlay-prompt-polish.html',
      'overlay-intent-compile.html',
      'overlay-r4-awaiting.html',
      'overlay-error.html',
    ]
    const missing = []
    for (const name of MAIN_FLOW_STATES) {
      const path = join(SNAPSHOT_DIR, name)
      let content
      try {
        content = readArtifact(path)
      } catch {
        continue
      }
      // Conta botões com texto visível (exclui o "✕" fechar — esse é só
      // último recurso, não conta como ação UX primária do estado).
      const buttonMatches = [...content.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g)]
      const meaningful = buttonMatches.filter((m) => {
        const inner = m[1].replace(/<[^>]*>/g, '').trim()
        return inner.length > 1 && inner !== '✕'
      })
      if (meaningful.length === 0) {
        missing.push(name)
      }
    }
    if (missing.length > 0) {
      throw new Error(`Estados sem ação UX visível: ${missing.join(', ')}`)
    }
  })
}

/**
 * V6-ES-D · extrai texto realmente visível ao operador. Descarta tudo
 * dentro de elementos com atributo `hidden=""`/`hidden=hidden`. Usa um
 * parser simples por contagem de profundidade.
 */
function extractVisibleText(html) {
  const out = []
  let depthHidden = 0
  let i = 0
  while (i < html.length) {
    if (html[i] === '<') {
      const end = html.indexOf('>', i)
      if (end < 0) break
      const tagSrc = html.slice(i + 1, end)
      const isClose = tagSrc.startsWith('/')
      const isSelfClose = tagSrc.endsWith('/')
      if (isClose && depthHidden > 0) {
        depthHidden -= 1
      } else if (!isClose && !isSelfClose) {
        if (depthHidden > 0) {
          depthHidden += 1
        } else if (/\bhidden(?:=("|')?\1?|=hidden)?(?:\s|>|$)/.test(tagSrc)) {
          depthHidden = 1
        }
      }
      i = end + 1
    } else {
      const next = html.indexOf('<', i)
      const chunk = html.slice(i, next < 0 ? html.length : next)
      if (depthHidden === 0) {
        out.push(chunk)
      }
      i = next < 0 ? html.length : next
    }
  }
  return out.join('')
}

// Auxiliary: re-read artifact (exercises the on-disk file too).
function readArtifact(path) {
  return readFileSync(path, 'utf8')
}

// ──────────────────────────────────────────────────────────────────────────
// Manifest + teardown
// ──────────────────────────────────────────────────────────────────────────

await vite.close()

const status = hasFail ? 'fail' : (hasWarn ? 'warn' : 'pass')
const manifest = {
  schema: 'atlas.vox.visual_smoke.v1',
  status,
  generated_at: new Date().toISOString(),
  totals: {
    total: checks.length,
    pass: checks.filter((c) => c.status === 'pass').length,
    warn: checks.filter((c) => c.status === 'warn').length,
    fail: checks.filter((c) => c.status === 'fail').length,
  },
  checks,
  artifacts,
}

const manifestPath = join(SNAPSHOT_DIR, 'manifest.json')
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))

// Console summary
const head = `[vox:visual-smoke] status=${status}  pass=${manifest.totals.pass}  warn=${manifest.totals.warn}  fail=${manifest.totals.fail}`
console.log(head)
for (const c of checks) {
  const marker = c.status === 'pass' ? '·' : c.status === 'warn' ? '!' : '✖'
  console.log(`  ${marker} [${c.status}] ${c.id} — ${c.summary}`)
  if (c.status !== 'pass' && c.detail?.error) {
    console.log(`      ${c.detail.error}`)
  }
}
console.log(`[vox:visual-smoke] manifest: ${manifestPath}`)

process.exit(hasFail ? 1 : 0)
