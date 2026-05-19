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

  // 2. Listening exibe "Atlas ouvindo"
  runCheck('overlay_listening_shows_atlas_ouvindo', 'Estado listening exibe "Atlas ouvindo"', () => {
    const ctl = makeBaseController('listening', { transcript: null })
    const html = renderToStaticMarkup(createElement(VoxOverlay, { controller: ctl }))
    writeArtifact('overlay-listening', html)
    assertContains(html, 'Atlas ouvindo', 'label "Atlas ouvindo" presente')
    scanTokenLeak(html, 'overlay-listening')
    scanSensitivePathLeak(html, 'overlay-listening')
    return { artifact: 'overlay-listening.html' }
  })

  // 3. Transcribing exibe "Transcrevendo localmente com Whisper"
  runCheck('overlay_transcribing_shows_label', 'Estado transcribing exibe "Transcrevendo"', () => {
    const ctl = makeBaseController('transcribing', { transcript: null })
    const html = renderToStaticMarkup(createElement(VoxOverlay, { controller: ctl }))
    writeArtifact('overlay-transcribing', html)
    assertContains(html, 'Transcrevendo localmente com Whisper', 'banner transcribing presente')
    scanTokenLeak(html, 'overlay-transcribing')
    scanSensitivePathLeak(html, 'overlay-transcribing')
    return { artifact: 'overlay-transcribing.html' }
  })

  // 4. Transcript ready exibe seção "Ouvi" com o texto
  runCheck('overlay_transcript_ready_shows_ouvi', 'Transcript pronto mostra "Ouvi" + transcript', () => {
    const ctl = makeBaseController('transcript_ready')
    const html = renderToStaticMarkup(createElement(VoxOverlay, { controller: ctl }))
    writeArtifact('overlay-transcript-ready', html)
    assertContains(html, 'Ouvi', 'seção "Ouvi" presente')
    assertContains(html, 'manda o Codex investigar', 'transcript renderizado')
    scanTokenLeak(html, 'overlay-transcript-ready')
    scanSensitivePathLeak(html, 'overlay-transcript-ready')
    return { artifact: 'overlay-transcript-ready.html' }
  })

  // 5. Prompt Polish compilado mostra "Prompt polido" + compiled_prompt
  runCheck('overlay_prompt_polish_shows_compiled', 'Prompt Polish exibe "Prompt polido" com compiled_prompt', () => {
    const compiled = 'Por favor leia o módulo Voice/Vox em modo análise. Não edite arquivos.'
    const ctl = makeBaseController('compiled', {
      selectedMode: 'prompt_polish',
      kernelResponse: makeKernelResponse('prompt_polish', compiled),
    })
    const html = renderToStaticMarkup(createElement(VoxOverlay, { controller: ctl }))
    writeArtifact('overlay-prompt-polish', html)
    assertContains(html, 'Prompt polido', 'título "Prompt polido" presente')
    assertContains(html, compiled, 'compiled_prompt renderizado')
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
    assertContains(html, 'Prompt poderoso', 'título "Prompt poderoso" presente')
    assertContains(html, 'Investigar módulo Voice sem editar arquivos', 'goal renderizado')
    assertContains(html, 'não editar arquivos', 'constraint renderizada')
    assertContains(html, 'R0', 'classe de risco preservada no diagnóstico')
    assertContains(html, 'Codex', 'destino traduzido preservado no diagnóstico')
    assertContains(html, 'Plano', 'formato traduzido preservado no diagnóstico')
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
