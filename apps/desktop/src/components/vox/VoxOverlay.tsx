/**
 * VoxOverlay V4 · cabine humana mínima para o Atlas Vox.
 *
 * V4 reorganiza a UX em torno de fluxo automático:
 *   - estado pronto: só o botão Gravar + dica "Option+Space".
 *   - estado ouvindo: pill "Atlas ouvindo".
 *   - estado transcrição pronta: dispara compile() automaticamente.
 *   - estado compiled: cabine "Atlas entendeu" + Confirmar / Trocar modo / Cancelar.
 *   - mode picker vira controle secundário, surgindo só quando o operador pede.
 *
 * Honestidade: nenhum receipt fake, nenhum transcript fake. Quando o
 * Auto Mode Router do backend não devolve sugestão, mostramos "modo sugerido
 * indisponível" — nunca inventamos decisão como se fosse do Kernel.
 */
import { useEffect, useRef, useState } from 'react'
import { isVoxTerminalProposal } from '../../lib/bridge'
import type { UseVoxOverlayResult, VoxOverlayState } from './useVoxOverlay'
import { VoxDogfoodPanel } from './VoxDogfoodPanel'
import { VoxGatePanel } from './VoxGatePanel'
import { VoxSessionCloseout } from './VoxSessionCloseout'
import { VoxReadinessPanel } from './VoxReadinessPanel'

/**
 * V3.10 (Claude AD) · explicit developer mode for the Vox overlay.
 * Build-time only: VITE_ATLAS_VOX_DEV=1 unlocks the manual debug-paste path.
 */
function detectVoxDevMode(): boolean {
  const envRaw = (import.meta.env.VITE_ATLAS_VOX_DEV ?? '').toString().toLowerCase()
  return envRaw === '1' || envRaw === 'true' || envRaw === 'yes'
}

const VOX_DEV_MODE = detectVoxDevMode()

interface VoxOverlayProps {
  controller: UseVoxOverlayResult
}

const STATE_LABEL: Record<VoxOverlayState, string> = {
  closed: 'fechado',
  idle: 'pronto',
  starting: 'iniciando…',
  listening: 'ouvindo',
  finishing: 'finalizando…',
  transcribing: 'transcrevendo…',
  transcript_ready: 'transcrição pronta',
  compiling: 'Atlas entendendo…',
  compiled: 'Atlas entendeu',
  awaiting_confirmation: 'aguardando confirmação',
  executing: 'executando…',
  executed: 'executado',
  blocked: 'bloqueado',
  cancelled: 'cancelado',
  eclipsed: 'modo seguro ativo',
  error: 'erro',
}

const MODE_LABEL: Record<
  import('./useVoxOverlay').UseVoxOverlayResult['selectedMode'],
  string
> = {
  dictation: 'Ditado',
  prompt_polish: 'Melhorar',
  intent_compile: 'Criar prompt',
  governed_execute: 'Executar',
}

const MODE_HINT: Record<
  import('./useVoxOverlay').UseVoxOverlayResult['selectedMode'],
  string
> = {
  dictation: 'transcreve sua fala como texto literal',
  prompt_polish: 'limpa e melhora o texto antes de inserir',
  intent_compile: 'transforma sua fala num prompt mais forte',
  governed_execute: 'revisa o risco antes de qualquer ação',
}

const PROVIDER_HINT_OPTIONS: ReadonlyArray<{
  value: import('./useVoxOverlay').UseVoxOverlayResult['providerHint']
  label: string
}> = [
  { value: 'auto', label: 'Automático' },
  { value: 'codex_cli', label: 'Codex' },
  { value: 'claude_cli', label: 'Claude' },
  { value: 'local', label: 'Local' },
]

const OUTPUT_FORMAT_OPTIONS: ReadonlyArray<{
  value: import('./useVoxOverlay').UseVoxOverlayResult['outputFormat']
  label: string
}> = [
  { value: 'auto', label: 'Automático' },
  { value: 'text', label: 'Texto' },
  { value: 'plan', label: 'Plano' },
  { value: 'diagnostic', label: 'Diagnóstico' },
  { value: 'diff', label: 'Alteração de código' },
  { value: 'notes', label: 'Notas' },
  { value: 'command_proposal', label: 'Comando proposto' },
]

const PROVIDER_HINT_LABEL: Record<string, string> = {
  auto: 'Automático',
  codex_cli: 'Codex',
  claude_cli: 'Claude',
  local: 'Local',
}

const OUTPUT_FORMAT_LABEL: Record<string, string> = {
  auto: 'Automático',
  text: 'Texto',
  plan: 'Plano',
  diagnostic: 'Diagnóstico',
  diff: 'Alteração de código',
  notes: 'Notas',
  command_proposal: 'Comando proposto',
}

const ACTION_LABEL: Record<string, string> = {
  execute: 'executar',
  edit: 'editar',
  edit_intent: 'editar intenção',
  save: 'salvar',
  save_as_note: 'salvar como nota',
  cancel: 'cancelar',
}

function labelFromMap(map: Record<string, string>, value: string | null | undefined): string {
  if (!value) return ''
  return map[value] ?? value
}

function userFriendlySttMessage(code: string, message: string): string {
  if (code === 'audio_input_invalid') {
    if (/microfone|rms=0|peak=0|active_ratio=0/i.test(message)) {
      return 'O Atlas não recebeu áudio do microfone. Libere o microfone para Atlas Code e grave de novo.'
    }
    return 'Não consegui ouvir sua fala com clareza. Fale um pouco mais perto do microfone e grave de novo.'
  }
  if (code === 'model_missing' || code === 'model_missing_or_engine_unavailable') {
    return 'O modelo de voz local não está pronto. Abra pelo comando Vox correto e tente de novo.'
  }
  if (code === 'engine_binding_pending') {
    return 'O Atlas Vox não foi aberto no modo correto de desktop. Feche esta janela e abra pelo comando Vox.'
  }
  return message || 'Não consegui transcrever essa gravação. Tente gravar de novo.'
}

/**
 * V4 · descreve em PT-BR o que o Atlas entendeu, a partir do modo selecionado
 * + (quando disponível) campos do kernel response. Curta e direta — vira a
 * linha "Atlas entendeu: …" na cabine de confirmação.
 */
function describeUnderstanding(
  mode: import('./useVoxOverlay').UseVoxOverlayResult['selectedMode'],
  kernelResponse: import('./useVoxOverlay').UseVoxOverlayResult['kernelResponse'],
  providerHint: import('./useVoxOverlay').UseVoxOverlayResult['providerHint'],
): string {
  const provider = kernelResponse?.providerHint ?? providerHint
  const providerLabel = labelFromMap(PROVIDER_HINT_LABEL, provider)
  const goal =
    kernelResponse?.goal
    ?? kernelResponse?.previewWhatIUnderstood
    ?? kernelResponse?.intentText
    ?? null
  if (mode === 'dictation') {
    return 'Ditado para o composer'
  }
  if (mode === 'prompt_polish') {
    return goal ? `Melhorar texto · ${goal}` : 'Melhorar texto para o composer'
  }
  if (mode === 'intent_compile') {
    const dest = providerLabel && provider !== 'auto' ? providerLabel : 'Atlas'
    return goal ? `Criar prompt para ${dest} · ${goal}` : `Criar prompt para ${dest}`
  }
  // governed_execute
  return goal ? `Executar · ${goal}` : 'Executar com governança'
}

export function VoxOverlay({ controller }: VoxOverlayProps) {
  const {
    state,
    mode,
    selectedMode,
    setSelectedMode,
    providerHint,
    setProviderHint,
    outputFormat,
    setOutputFormat,
    edgeStatus,
    modelStatus,
    hotkeyStatus,
    dictionary,
    session,
    transcript,
    transcriptDraft,
    sttError,
    sttAvailable,
    kernelResponse,
    confirmationRequest,
    literalConfirmationDraft,
    executionResult,
    canExecute,
    error,
    busy,
    close,
    start,
    finish,
    cancel,
    eclipse,
    setTranscriptDraft,
    setLiteralConfirmationDraft,
    executeConfirmed,
    cancelExecution,
    resetForRecompile,
    applyDebugTranscript,
    compile,
    copyText,
    insertText,
    refreshDictionary,
    addDictionaryCorrection,
  } = controller

  const [debugRaw, setDebugRaw] = useState<string>('')
  const [copyStatus, setCopyStatus] = useState<string | null>(null)
  const [dictOpen, setDictOpen] = useState<boolean>(false)
  const [gateOpen, setGateOpen] = useState<boolean>(false)
  const [readinessOpen, setReadinessOpen] = useState<boolean>(false)
  const [advancedOpen, setAdvancedOpen] = useState<boolean>(false)
  // V4 · "Trocar modo" é controle secundário: aparece só quando o operador pede.
  const [modeSwitcherOpen, setModeSwitcherOpen] = useState<boolean>(false)
  const [dictVariant, setDictVariant] = useState<string>('')
  const [dictPreferred, setDictPreferred] = useState<string>('')
  const [dictFeedback, setDictFeedback] = useState<{
    kind: 'ok' | 'err'
    message: string
  } | null>(null)
  const [fallbackOpen, setFallbackOpen] = useState<boolean>(false)
  const panelRef = useRef<HTMLDivElement | null>(null)

  // V4 · evita disparar compile() repetidamente para a mesma combinação
  // (transcript_id, mode). Quando o operador troca o modo via "Trocar modo",
  // resetForRecompile zera kernelResponse → o useEffect detecta novo par e
  // dispara compile() de novo com o modo novo.
  const autoCompiledRef = useRef<Set<string>>(new Set())
  const compileKey =
    transcript && transcript.transcriptId
      ? `${transcript.transcriptId}::${selectedMode}`
      : ''

  // V4 · auto-compile: assim que existe transcript real (sem erro STT e sem
  // resposta do Kernel ainda), enviamos para /ai/vox/intent automaticamente.
  // O usuário cai direto na cabine "Atlas entendeu" sem precisar clicar em
  // "Compilar". Cada par (transcript, mode) só dispara uma vez.
  useEffect(() => {
    if (state !== 'transcript_ready') return
    if (!transcript) return
    if (transcriptDraft.trim() === '') return
    if (kernelResponse) return
    if (sttError) return
    if (busy) return
    if (!compileKey) return
    if (autoCompiledRef.current.has(compileKey)) return
    autoCompiledRef.current.add(compileKey)
    void compile()
  }, [
    state,
    transcript,
    transcriptDraft,
    kernelResponse,
    sttError,
    busy,
    compileKey,
    compile,
  ])

  // V4 · troca de modo na cabine de confirmação. resetForRecompile zera o
  // kernel response e leva o estado de volta a `transcript_ready`; o useEffect
  // acima reagirá ao novo `compileKey` e disparará compile() com o modo novo.
  const handleSwitchMode = (
    nextMode: import('./useVoxOverlay').UseVoxOverlayResult['selectedMode'],
  ) => {
    setModeSwitcherOpen(false)
    if (nextMode === selectedMode) return
    setSelectedMode(nextMode)
    if (
      state === 'compiled'
      || state === 'awaiting_confirmation'
      || state === 'blocked'
      || state === 'error'
    ) {
      resetForRecompile()
    }
  }

  // Atalhos de teclado dentro do painel:
  //   Enter (sem modificador) · finaliza a captura se estiver ouvindo.
  //   Cmd/Ctrl+Enter         · avança o passo seguro:
  //                              transcript_ready → compile()
  //                              awaiting_confirmation → executeConfirmed()
  //                              compiled → confirmar (inserir prompt/texto)
  //   Escape                 · cancela captura; senão fecha overlay.
  useEffect(() => {
    if (state === 'closed') return
    function onKey(e: KeyboardEvent) {
      const inPanel = panelRef.current?.contains(document.activeElement)
      if (!inPanel) return
      const target = document.activeElement
      const isInText =
        target instanceof HTMLInputElement
        || target instanceof HTMLTextAreaElement
      if (e.key === 'Escape') {
        e.preventDefault()
        if (state === 'listening') void cancel()
        else close()
        return
      }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        if (busy) return
        e.preventDefault()
        if (state === 'awaiting_confirmation') {
          if (canExecute) void executeConfirmed()
          return
        }
        if (state === 'transcript_ready' && transcript && transcriptDraft.trim() !== '') {
          void compile()
          return
        }
        if (state === 'compiled') {
          const cp = kernelResponse?.compiledPrompt ?? null
          const fallback = transcriptDraft || transcript?.text || ''
          const payload = (cp && cp.trim() !== '') ? cp : fallback
          if (payload && payload.trim() !== '') insertText(payload)
          return
        }
        return
      }
      if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        if (isInText) return
        if (state === 'listening') {
          e.preventDefault()
          void finish()
        }
        return
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    state,
    busy,
    canExecute,
    transcript,
    transcriptDraft,
    kernelResponse,
    close,
    cancel,
    finish,
    compile,
    executeConfirmed,
    insertText,
  ])

  useEffect(() => {
    if (!dictOpen) return
    if (dictionary) return
    void refreshDictionary()
  }, [dictOpen, dictionary, refreshDictionary])

  if (state === 'closed') return null

  const tauriUnavailable = mode === 'unavailable'
  const sttEngineMessage =
    modelStatus && !modelStatus.engineAvailable
      ? modelStatus.nextAction?.message ??
        'Motor de voz ainda não está disponível nesta versão.'
      : null

  const canStart =
    state === 'idle'
    || state === 'transcript_ready'
    || state === 'compiled'
    || state === 'executed'
    || state === 'blocked'
    || state === 'cancelled'
    || state === 'eclipsed'
    || state === 'error'
  const canCancelLive =
    state === 'listening' || state === 'starting' || state === 'finishing'
  const originalText = transcriptDraft || transcript?.text || ''
  const canInsertOriginal = originalText.trim() !== ''
  const compiledPrompt = kernelResponse?.compiledPrompt ?? null
  const canInsertCompiled = (compiledPrompt ?? '').trim() !== ''
  const hasAnyResult = Boolean(transcript || kernelResponse || executionResult || sttError)

  const kernelStatus = kernelResponse?.status ?? null
  const kernelOk = kernelStatus === 'ok'
  const polishMissing =
    (selectedMode === 'prompt_polish' || selectedMode === 'intent_compile') &&
    kernelOk &&
    (compiledPrompt === null || compiledPrompt.trim() === '')

  // V4 · sugestão automática do Auto Mode Router. `null` enquanto o backend
  // não publica `suggested_mode` em /ai/vox/intent — UI mostra honestamente
  // "modo sugerido indisponível" em vez de inventar decisão.
  const suggestedMode = kernelResponse?.suggestedMode ?? null
  const suggestedModeReason = kernelResponse?.suggestedModeReason ?? null
  const suggestionDiverges = Boolean(suggestedMode && suggestedMode !== selectedMode)
  const understandingLine = kernelOk && kernelResponse
    ? describeUnderstanding(selectedMode, kernelResponse, providerHint)
    : null

  // V4 · "Confirmar" faz a ação primária do modo: inserir o resultado no
  // composer. Se há compiled_prompt, usamos ele; senão caímos no texto
  // original (válido para Ditado).
  const confirmPayload = canInsertCompiled
    ? (compiledPrompt ?? '')
    : (canInsertOriginal ? originalText : '')
  const canConfirm = confirmPayload.trim() !== ''

  const flashCopy = (msg: string) => {
    setCopyStatus(msg)
    window.setTimeout(() => setCopyStatus(null), 2200)
  }

  const handleCopy = async (text: string, label: string) => {
    const r = await copyText(text)
    flashCopy(r.ok ? `${label} copiado` : `${label}: copia falhou (${r.error ?? '?'})`)
  }

  const handleConfirmCompiled = () => {
    if (!canConfirm) return
    insertText(confirmPayload)
    flashCopy('inserido no composer')
  }

  const handleAddCorrection = async () => {
    setDictFeedback(null)
    const result = await addDictionaryCorrection({
      variant: dictVariant,
      preferred: dictPreferred,
    })
    if (result.ok) {
      setDictVariant('')
      setDictPreferred('')
      setDictFeedback({
        kind: 'ok',
        message: `Dicionário atualizado (v${result.dictionary?.version ?? '?'})`,
      })
    } else {
      setDictFeedback({ kind: 'err', message: result.error ?? 'falha desconhecida' })
    }
    window.setTimeout(() => setDictFeedback(null), 3200)
  }

  const sampleTerms = dictionary
    ? Array.from(new Set(dictionary.entries.map((e) => e.preferred))).slice(0, 14)
    : []

  // V4 · em quais estados o fluxo principal é "gravar de novo" (idle + pós-sessão).
  const isIdleLike =
    state === 'idle'
    || state === 'cancelled'
    || state === 'eclipsed'
    || state === 'executed'
    || state === 'blocked'
    || state === 'error'
  const primaryRecordLabel = hasAnyResult ? 'Gravar de novo' : 'Gravar'

  return (
    <div
      ref={panelRef}
      className="vox-overlay"
      role="dialog"
      aria-label="Atlas Vox"
      aria-live="polite"
    >
      <header className="vox-overlay-header">
        <div className="vox-overlay-title">
          <span className="vox-overlay-eyebrow">Atlas Vox</span>
          <span className="vox-overlay-session" hidden={!advancedOpen}>
            {STATE_LABEL[state]}
          </span>
        </div>
        <button
          type="button"
          className="vox-overlay-close"
          onClick={close}
          aria-label="Fechar overlay Vox"
          title="Fechar (Esc)"
        >
          ✕
        </button>
      </header>

      {state === 'listening' ? (
        <div className="vox-listening-pill" role="status" aria-live="assertive">
          <span className="vox-listening-dot" aria-hidden="true" />
          <span className="vox-listening-label">Atlas ouvindo</span>
          <span className="vox-listening-hint">
            Enter ou Option+Space finaliza · Esc cancela
          </span>
        </div>
      ) : null}

      {hotkeyStatus && (!hotkeyStatus.registered || hotkeyStatus.missingPermissions.length > 0) ? (
        <div className="vox-overlay-banner vox-overlay-banner-warn">
          {hotkeyStatus.missingPermissions.length > 0
            ? `Atalho global pendente: libere ${hotkeyStatus.missingPermissions.join(' / ')} em Ajustes do Sistema > Privacidade e Segurança.`
            : hotkeyStatus.message ?? 'Atalho global pendente: libere Acessibilidade/Monitoramento de Entrada.'}
        </div>
      ) : null}

      {tauriUnavailable ? (
        <div className="vox-overlay-banner vox-overlay-banner-warn">
          Atlas Vox precisa ser aberto pelo app desktop para usar gravação real.
        </div>
      ) : edgeStatus && !edgeStatus.available ? (
        <div className="vox-overlay-banner vox-overlay-banner-warn">
          O controle local do Mac ainda não está totalmente disponível.
          {edgeStatus.pendingCapabilities.length > 0 ? (
            <> Pendências: {edgeStatus.pendingCapabilities.join(', ')}.</>
          ) : null}
        </div>
      ) : null}

      {sttEngineMessage ? (
        <div className="vox-overlay-banner vox-overlay-banner-info" hidden={!advancedOpen}>
          Motor de voz: {sttEngineMessage}
        </div>
      ) : null}

      {error ? (
        <div className="vox-overlay-banner vox-overlay-banner-error">{error}</div>
      ) : null}

      {/* V4 · Estado pronto. Único elemento dominante: Gravar.
          Nenhum mode selector visível por default. */}
      {isIdleLike ? (
        <div className="vox-v4-record-cta">
          <button
            type="button"
            className="vox-btn-primary vox-v4-record-btn"
            onClick={() => void start()}
            disabled={busy || !canStart || tauriUnavailable}
          >
            {primaryRecordLabel}
          </button>
          <p className="vox-v4-record-hint">
            <kbd className="vox-hotkey-hint-key">⌥ Space</kbd> grava / parar
            <span className="vox-v4-record-hint-sep" aria-hidden="true">·</span>
            <kbd className="vox-hotkey-hint-key">esc</kbd> cancela
          </p>
        </div>
      ) : null}

      {/* V4 · estados intermediários (starting/finishing). Discreto. */}
      {state === 'starting' || state === 'finishing' ? (
        <div className="vox-overlay-transcribing" role="status" aria-live="polite">
          <span className="vox-overlay-transcribing-dot" aria-hidden="true" />
          <span>
            {state === 'starting' ? 'Preparando o microfone…' : 'Finalizando gravação…'}
          </span>
        </div>
      ) : null}

      {/* V4 · Ouvi. Aparece em transcribing/transcript_ready/compiling/
          compiled/awaiting_confirmation. */}
      {state === 'transcribing'
        || state === 'transcript_ready'
        || state === 'compiling'
        || state === 'compiled'
        || state === 'awaiting_confirmation' ? (
        <section className="vox-overlay-section">
          <h3 className="vox-overlay-section-title">Ouvi</h3>
          {state === 'transcribing' ? (
            <div className="vox-overlay-transcribing" role="status" aria-live="polite">
              <span className="vox-overlay-transcribing-dot" aria-hidden="true" />
              <span>Transcrevendo localmente com Whisper…</span>
            </div>
          ) : null}

          {transcript ? (
            <>
              <textarea
                className="vox-overlay-transcript"
                value={transcriptDraft}
                onChange={(e) => setTranscriptDraft(e.target.value)}
                rows={3}
                spellCheck={false}
              />
              {transcript.postCorrections.length > 0 ? (
                <ul
                  className="vox-overlay-corrections"
                  aria-label="Correções aplicadas"
                  hidden={!advancedOpen}
                >
                  {transcript.postCorrections.map((c, i) => (
                    <li key={`${c.from}-${c.to}-${i}`}>
                      <span className="vox-overlay-correction-from">{c.from}</span>
                      {' → '}
                      <span className="vox-overlay-correction-to">{c.to}</span>
                      <span className="vox-overlay-correction-rule">· {c.rule}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="vox-overlay-transcript-meta" hidden={!advancedOpen}>
                motor: <code>{transcript.engine}</code>
                {' · '}
                idioma: <code>{transcript.language}</code>
                {typeof transcript.confidence === 'number' && transcript.confidence > 0 ? (
                  <> · confiança: <code>{transcript.confidence.toFixed(2)}</code></>
                ) : null}
                {transcript.latencyMs && transcript.latencyMs.total > 0 ? (
                  <> · latência: <code>{transcript.latencyMs.total}ms</code></>
                ) : null}
                {' · '}
                áudio salvo: <code>{transcript.rawPcmPersisted ? 'sim' : 'não'}</code>
              </div>
            </>
          ) : state === 'transcript_ready' && sttError ? (
            <>
              <p className="vox-overlay-hint vox-overlay-hint-warn">
                {userFriendlySttMessage(sttError.code, sttError.message)}
              </p>
              <button
                type="button"
                className="vox-btn-primary"
                onClick={() => void start()}
                disabled={busy || tauriUnavailable}
              >
                Gravar de novo
              </button>
              {VOX_DEV_MODE ? (
                <details className="vox-overlay-fallback" open>
                  <summary className="vox-overlay-fallback-summary">
                    Fallback debug (developer) · digitar a fala manualmente
                  </summary>
                  <textarea
                    className="vox-overlay-debug-input"
                    value={debugRaw}
                    onChange={(e) => setDebugRaw(e.target.value)}
                    rows={3}
                    placeholder="cole/digite o que você diria (modo debug)"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    className="vox-btn-secondary"
                    onClick={() => void applyDebugTranscript(debugRaw)}
                    disabled={busy || debugRaw.trim() === ''}
                  >
                    Aplicar dicionário (debug)
                  </button>
                </details>
              ) : null}
            </>
          ) : state === 'transcript_ready' ? (
            <>
              <p className="vox-overlay-hint">
                Sessão finalizada · sem fala detectada.
                {VOX_DEV_MODE
                  ? ' Use o fallback abaixo OU pressione Gravar de novo.'
                  : sttAvailable
                    ? ' Pressione Gravar de novo para tentar outra captura.'
                    : ' Verifique permissão de microfone e tente de novo.'}
              </p>
              {VOX_DEV_MODE ? (
                <details
                  className="vox-overlay-fallback"
                  open={fallbackOpen}
                  onToggle={(e) => setFallbackOpen(e.currentTarget.open)}
                >
                  <summary className="vox-overlay-fallback-summary">
                    Fallback debug (developer) · digitar a fala manualmente
                  </summary>
                  <textarea
                    className="vox-overlay-debug-input"
                    value={debugRaw}
                    onChange={(e) => setDebugRaw(e.target.value)}
                    rows={3}
                    placeholder="cole/digite o que você diria (modo debug)"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    className="vox-btn-secondary"
                    onClick={() => void applyDebugTranscript(debugRaw)}
                    disabled={busy || debugRaw.trim() === ''}
                  >
                    Aplicar dicionário (debug)
                  </button>
                </details>
              ) : null}
            </>
          ) : null}
        </section>
      ) : null}

      {/* V4 · cabine "Atlas entendeu" + Confirmar / Trocar modo / Cancelar.
          Aparece quando compile() retorna ok e ainda não estamos em fluxo
          de confirmação R2+ (que tem sua própria UI).  */}
      {state === 'compiling' ? (
        <section className="vox-overlay-section vox-v4-understanding">
          <h3 className="vox-overlay-section-title">Atlas entendendo</h3>
          <div className="vox-overlay-transcribing" role="status" aria-live="polite">
            <span className="vox-overlay-transcribing-dot" aria-hidden="true" />
            <span>Mandando para o Kernel Vox…</span>
          </div>
        </section>
      ) : null}

      {state === 'compiled' && kernelOk && kernelResponse ? (
        <section className="vox-overlay-section vox-v4-understanding">
          <h3 className="vox-overlay-section-title">Atlas entendeu</h3>
          <p className="vox-v4-understanding-line">
            {understandingLine ?? describeUnderstanding(selectedMode, kernelResponse, providerHint)}
          </p>

          {/* Sugestão do Auto Mode Router · só renderiza quando backend devolve
              `suggested_mode` diferente do modo atual. Quando o campo é null,
              mostramos um chip honesto "modo sugerido indisponível" em vez de
              inventar. */}
          {suggestionDiverges && suggestedMode ? (
            <p className="vox-v4-suggestion vox-v4-suggestion-active">
              Atlas sugere <strong>{MODE_LABEL[suggestedMode]}</strong>
              {suggestedModeReason ? ` · ${suggestedModeReason}` : null}
              <button
                type="button"
                className="vox-v4-suggestion-apply"
                onClick={() => handleSwitchMode(suggestedMode)}
                disabled={busy}
              >
                aplicar sugestão
              </button>
            </p>
          ) : (
            <p className="vox-v4-suggestion vox-v4-suggestion-idle" hidden={!advancedOpen}>
              modo sugerido indisponível · usando <strong>{MODE_LABEL[selectedMode]}</strong>
            </p>
          )}

          {/* Prompt detalhado · mostra preview do compiled_prompt logo abaixo,
              colapsado por default em Detalhes avançados (mantém o canon
              "sem cards dentro de cards" no fluxo principal). */}
          {canInsertCompiled ? (
            <details className="vox-v4-prompt-details" hidden={!canInsertCompiled}>
              <summary className="vox-v4-prompt-details-summary">
                {selectedMode === 'intent_compile' ? 'Prompt poderoso' : 'Prompt polido'}
              </summary>
              <pre
                className="vox-overlay-compiled-prompt"
                aria-label={
                  selectedMode === 'intent_compile'
                    ? 'Prompt poderoso criado pelo Atlas'
                    : 'Prompt polido pelo Atlas'
                }
              >
                {compiledPrompt}
              </pre>
              {kernelResponse.compiledPromptTemplate && advancedOpen ? (
                <div className="vox-overlay-transcript-meta">
                  modelo usado: <code>{kernelResponse.compiledPromptTemplate}</code>
                </div>
              ) : null}
              <div className="vox-overlay-compiled-actions">
                <button
                  type="button"
                  className="vox-btn-ghost"
                  onClick={() =>
                    void handleCopy(
                      compiledPrompt ?? '',
                      selectedMode === 'intent_compile' ? 'prompt poderoso' : 'prompt polido',
                    )
                  }
                  disabled={!canInsertCompiled}
                >
                  {selectedMode === 'intent_compile' ? 'Copiar poderoso' : 'Copiar polido'}
                </button>
              </div>
            </details>
          ) : polishMissing ? (
            <p className="vox-overlay-hint vox-overlay-hint-warn">
              {selectedMode === 'intent_compile'
                ? 'O Atlas ainda não devolveu o prompt poderoso para esta intenção.'
                : 'O Atlas ainda não devolveu o texto melhorado para esta intenção.'}
            </p>
          ) : null}

          {kernelResponse.constraints.length > 0 ? (
            <div className="vox-overlay-constraints" aria-label="Restrições detectadas">
              {kernelResponse.constraints.map((c, i) => (
                <span key={`${c}-${i}`} className="vox-overlay-constraint-chip">
                  {c}
                </span>
              ))}
            </div>
          ) : null}

          {kernelResponse.goal ? (
            <p className="vox-overlay-hint" hidden={!advancedOpen}>
              <span className="vox-overlay-meta-label">Objetivo · </span>
              {kernelResponse.goal}
            </p>
          ) : null}

          <div className="vox-overlay-meta-grid" hidden={!advancedOpen}>
            <span>
              modo <code>{MODE_LABEL[selectedMode]}</code>
            </span>
            <span>
              risco{' '}
              <code className={`vox-risk vox-risk-${kernelResponse.riskClass ?? kernelResponse.risk ?? 'R0'}`}>
                {kernelResponse.riskClass ?? kernelResponse.risk ?? 'R0'}
              </code>
            </span>
            {kernelResponse.providerHint ? (
              <span>
                destino <code>{labelFromMap(PROVIDER_HINT_LABEL, kernelResponse.providerHint)}</code>
              </span>
            ) : null}
            {kernelResponse.outputFormat ? (
              <span>
                formato <code>{labelFromMap(OUTPUT_FORMAT_LABEL, kernelResponse.outputFormat)}</code>
              </span>
            ) : null}
            {kernelResponse.executorHint ? (
              <span>
                executor <code>{kernelResponse.executorHint}</code>
              </span>
            ) : null}
            {kernelResponse.nextAction ? (
              <span>
                próxima ação <code>{kernelResponse.nextAction}</code>
              </span>
            ) : null}
          </div>

          {kernelResponse.riskReasoning ? (
            <p className="vox-overlay-hint" hidden={!advancedOpen}>
              <span className="vox-overlay-meta-label">Por quê · </span>
              {kernelResponse.riskReasoning}
            </p>
          ) : null}

          {/* V4 · Ações primárias: 3 botões claros, sem cards aninhados. */}
          <div className="vox-v4-actions">
            <button
              type="button"
              className="vox-btn-primary"
              onClick={handleConfirmCompiled}
              disabled={busy || !canConfirm}
              title="Insere o resultado no composer"
            >
              Confirmar
            </button>
            <button
              type="button"
              className="vox-btn-secondary"
              onClick={() => setModeSwitcherOpen((v) => !v)}
              disabled={busy}
              aria-expanded={modeSwitcherOpen}
            >
              Trocar modo
            </button>
            <button
              type="button"
              className="vox-btn-ghost"
              onClick={() => void start()}
              disabled={busy || tauriUnavailable}
              title="Descarta e grava de novo"
            >
              Cancelar
            </button>
            {copyStatus ? (
              <span className="vox-overlay-flash" role="status">
                {copyStatus}
              </span>
            ) : null}
          </div>

          {/* Seletor de modo compacto · só aparece quando o operador pede. */}
          {modeSwitcherOpen ? (
            <div className="vox-v4-mode-switcher" aria-label="Trocar modo do Atlas Vox">
              <p className="vox-v4-mode-switcher-hint">
                Atual: <strong>{MODE_LABEL[selectedMode]}</strong> · {MODE_HINT[selectedMode]}
              </p>
              <div className="vox-mode-seg" role="radiogroup" aria-label="Modo Vox">
                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedMode === 'dictation'}
                  className={`vox-mode-seg-btn${selectedMode === 'dictation' ? ' is-active' : ''}`}
                  onClick={() => handleSwitchMode('dictation')}
                  disabled={busy}
                  title={MODE_HINT.dictation}
                >
                  {MODE_LABEL.dictation}
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedMode === 'prompt_polish'}
                  className={`vox-mode-seg-btn${selectedMode === 'prompt_polish' ? ' is-active' : ''}`}
                  onClick={() => handleSwitchMode('prompt_polish')}
                  disabled={busy}
                  title={MODE_HINT.prompt_polish}
                >
                  {MODE_LABEL.prompt_polish}
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedMode === 'intent_compile'}
                  className={`vox-mode-seg-btn${selectedMode === 'intent_compile' ? ' is-active' : ''}`}
                  onClick={() => handleSwitchMode('intent_compile')}
                  disabled={busy}
                  title={MODE_HINT.intent_compile}
                >
                  {MODE_LABEL.intent_compile}
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedMode === 'governed_execute'}
                  className={`vox-mode-seg-btn${selectedMode === 'governed_execute' ? ' is-active' : ''}`}
                  onClick={() => handleSwitchMode('governed_execute')}
                  disabled={busy}
                  title={MODE_HINT.governed_execute}
                >
                  {MODE_LABEL.governed_execute}
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : state === 'compiled' && kernelResponse && kernelResponse.status === 'unavailable' ? (
        <section className="vox-overlay-section vox-v4-understanding">
          <h3 className="vox-overlay-section-title">Atlas entendendo</h3>
          <p className="vox-overlay-hint vox-overlay-hint-warn">
            Atlas Vox ainda indisponível.{' '}
            {kernelResponse.message ?? '/ai/vox/intent não respondeu.'}
          </p>
          <div className="vox-v4-actions">
            <button
              type="button"
              className="vox-btn-secondary"
              onClick={() => void compile()}
              disabled={busy}
            >
              Tentar de novo
            </button>
            <button
              type="button"
              className="vox-btn-ghost"
              onClick={() => void start()}
              disabled={busy || tauriUnavailable}
            >
              Cancelar
            </button>
          </div>
        </section>
      ) : state === 'compiled' && kernelResponse && kernelResponse.status === 'error' ? (
        <section className="vox-overlay-section vox-v4-understanding">
          <h3 className="vox-overlay-section-title">Atlas entendendo</h3>
          <p className="vox-overlay-hint vox-overlay-hint-error">
            Atlas Vox respondeu com erro: {kernelResponse.message ?? 'sem detalhes'}
          </p>
          <div className="vox-v4-actions">
            <button
              type="button"
              className="vox-btn-secondary"
              onClick={() => void compile()}
              disabled={busy}
            >
              Tentar de novo
            </button>
            <button
              type="button"
              className="vox-btn-ghost"
              onClick={() => void start()}
              disabled={busy || tauriUnavailable}
            >
              Cancelar
            </button>
          </div>
        </section>
      ) : null}

      {/* V3 Governed Execute · painel de confirmação preservado.
          Risco R2+ → o Atlas NUNCA executa sem confirmação explícita. */}
      {confirmationRequest ? (
        (() => {
          const cr = confirmationRequest
          const risk = cr.riskClass ?? 'R0'
          const isLiteral = cr.requiresLiteralConfirmation
          const expected = (cr.literalConfirmationText ?? '').trim()
          const literalOk =
            !isLiteral || (expected !== '' && literalConfirmationDraft.trim() === expected)
          const severityClass =
            risk === 'R4'
              ? 'vox-confirm-r4'
              : risk === 'R3'
                ? 'vox-confirm-r3'
                : risk === 'R2'
                  ? 'vox-confirm-r2'
                  : 'vox-confirm-low'
          return (
            <section
              className={`vox-overlay-section vox-confirm-panel ${severityClass}`}
              aria-label="Confirmação antes da execução"
            >
              <h3 className="vox-overlay-section-title">
                Confirmar execução · risco <span className={`vox-risk vox-risk-${risk}`}>{risk}</span>
              </h3>
              {cr.preview ? (
                <p className="vox-overlay-intent-text">{cr.preview}</p>
              ) : (
                <p className="vox-overlay-hint">
                  O Atlas não enviou uma prévia detalhada. Revise o prompt acima antes de seguir.
                </p>
              )}
              {risk === 'R4' ? (
                <p className="vox-overlay-hint vox-overlay-hint-error">
                  Ação de alto risco. Confirme digitando exatamente a frase pedida pelo Atlas.
                </p>
              ) : risk === 'R3' || risk === 'R2' ? (
                <p className="vox-overlay-hint vox-overlay-hint-warn">
                  Revise antes de seguir. O Atlas Desktop não executa nada sem sua confirmação.
                </p>
              ) : null}
              {isLiteral ? (
                <div className="vox-confirm-literal" aria-label="Confirmação literal">
                  <label className="vox-overlay-control">
                    <span>Digite literalmente para liberar Executar</span>
                    <input
                      type="text"
                      className="vox-overlay-debug-input vox-confirm-literal-input"
                      value={literalConfirmationDraft}
                      onChange={(e) => setLiteralConfirmationDraft(e.target.value)}
                      placeholder={expected || 'frase exigida pelo Atlas'}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                    />
                  </label>
                  {expected ? (
                    <p className="vox-overlay-hint">
                      Frase exigida:{' '}
                      <code className="vox-confirm-literal-expected">{expected}</code>
                    </p>
                  ) : (
                    <p className="vox-overlay-hint vox-overlay-hint-warn">
                      O Atlas pediu confirmação literal, mas não enviou a frase. Recrie a intenção.
                    </p>
                  )}
                </div>
              ) : null}
              {advancedOpen && cr.actionsAvailable.length > 0 ? (
                <div className="vox-overlay-meta-grid">
                  <span>
                    ações <code>{cr.actionsAvailable.map((a) => labelFromMap(ACTION_LABEL, a)).join(', ')}</code>
                  </span>
                </div>
              ) : null}
              {cr.expiresAt ? (
                <div className="vox-overlay-meta-grid">
                  <span>
                    expira em <code>{cr.expiresAt}</code>
                  </span>
                </div>
              ) : null}
              <div className="vox-overlay-compiled-actions">
                <button
                  type="button"
                  className="vox-btn-primary"
                  onClick={() => void executeConfirmed()}
                  disabled={!canExecute || !literalOk}
                  title={
                    isLiteral && !literalOk
                      ? 'Digite a frase exigida para liberar a execução'
                      : 'Confirma a execução no Atlas'
                  }
                >
                  Executar
                </button>
                <button
                  type="button"
                  className="vox-btn-ghost"
                  onClick={() => void cancelExecution()}
                  disabled={busy}
                  title="Cancela esta execução"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="vox-btn-secondary"
                  onClick={() => resetForRecompile()}
                  disabled={busy}
                  title="Volta para o texto ouvido para editar"
                >
                  Editar intenção
                </button>
              </div>
            </section>
          )
        })()
      ) : null}

      {/* V3 Governed Execute · resultado da execução */}
      {executionResult ? (() => {
        const terminalProposal = isVoxTerminalProposal(executionResult.desktopAction)
          ? executionResult.desktopAction
          : null
        return (
          <section className="vox-overlay-section" aria-label="Resultado da execução">
            <h3 className="vox-overlay-section-title">
              Resultado · {executionResult.actionOutcome ?? executionResult.status}
            </h3>
            {executionResult.status === 'unavailable' ? (
              <p className="vox-overlay-hint vox-overlay-hint-warn">
                {executionResult.message ?? 'Atlas Vox indisponível.'}
              </p>
            ) : executionResult.status === 'error' ? (
              <p className="vox-overlay-hint vox-overlay-hint-error">
                {executionResult.message ?? 'Erro no /ai/vox/execute.'}
              </p>
            ) : (
              <>
                {executionResult.message ? (
                  <p className="vox-overlay-intent-text">{executionResult.message}</p>
                ) : null}
                {terminalProposal ? (
                  <div className="vox-terminal-proposal" aria-label="Comando proposto">
                    <p className="vox-overlay-hint vox-overlay-hint-warn">
                      O Atlas não executou este comando. Copie e rode você mesmo no terminal,
                      se julgar seguro.
                    </p>
                    <pre className="vox-overlay-compiled-prompt vox-terminal-proposal-cmd">
                      {terminalProposal.proposedCommand}
                    </pre>
                    {terminalProposal.explanation ? (
                      <p className="vox-overlay-hint">{terminalProposal.explanation}</p>
                    ) : null}
                    <div className="vox-overlay-compiled-actions">
                      <button
                        type="button"
                        className="vox-btn-secondary"
                        onClick={() =>
                          void handleCopy(terminalProposal.proposedCommand, 'comando')
                        }
                        disabled={terminalProposal.proposedCommand.trim() === ''}
                      >
                        Copiar comando
                      </button>
                    </div>
                  </div>
                ) : null}
                {executionResult.output ? (
                  <>
                    <p className="vox-overlay-hint">
                      <span className="vox-overlay-meta-label">Saída</span>
                    </p>
                    <pre className="vox-overlay-compiled-prompt">{executionResult.output}</pre>
                    <div className="vox-overlay-compiled-actions">
                      <button
                        type="button"
                        className="vox-btn-ghost"
                        onClick={() => void handleCopy(executionResult.output ?? '', 'saída')}
                      >
                        Copiar saída
                      </button>
                    </div>
                  </>
                ) : null}
                {executionResult.stderr ? (
                  <>
                    <p className="vox-overlay-hint vox-overlay-hint-warn">
                      <span className="vox-overlay-meta-label">Erros</span>
                    </p>
                    <pre className="vox-overlay-compiled-prompt">{executionResult.stderr}</pre>
                  </>
                ) : null}
                {executionResult.events.length > 0 ? (
                  <ul
                    className="vox-overlay-corrections"
                    aria-label="Eventos reportados pelo Atlas"
                    hidden={!advancedOpen}
                  >
                    {executionResult.events.map((ev, i) => (
                      <li key={`${ev.id ?? ev.kind}-${i}`}>
                        <span className="vox-overlay-correction-rule">{ev.kind}</span>
                        {ev.message ? <> · {ev.message}</> : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <dl className="vox-overlay-receipt" hidden={!advancedOpen}>
                  {executionResult.receiptId ? (
                    <>
                      <dt>comprovante</dt>
                      <dd>
                        <code>{executionResult.receiptId}</code>
                      </dd>
                    </>
                  ) : null}
                  {executionResult.evidence ? (
                    <>
                      <dt>evidência</dt>
                      <dd>{executionResult.evidence}</dd>
                    </>
                  ) : null}
                </dl>
              </>
            )}
          </section>
        )
      })() : null}

      {/* Comprovante · só quando real */}
      {kernelOk && kernelResponse ? (
        <section className="vox-overlay-section" hidden={!advancedOpen}>
          <h3 className="vox-overlay-section-title">Comprovante</h3>
          <dl className="vox-overlay-receipt">
            {kernelResponse.receiptId ? (
              <>
                <dt>comprovante</dt>
                <dd><code>{kernelResponse.receiptId}</code></dd>
              </>
            ) : null}
            {kernelResponse.decisionId ? (
              <>
                <dt>decisão</dt>
                <dd><code>{kernelResponse.decisionId}</code></dd>
              </>
            ) : null}
            {kernelResponse.ledgerEventId ? (
              <>
                <dt>registro</dt>
                <dd><code>{kernelResponse.ledgerEventId}</code></dd>
              </>
            ) : null}
            {kernelResponse.evidencePromise ? (
              <>
                <dt>evidência</dt>
                <dd>{kernelResponse.evidencePromise}</dd>
              </>
            ) : null}
          </dl>
        </section>
      ) : null}

      {/* V4 · controles secundários ficam só no rodapé quando a sessão está
          viva. Não tomam espaço durante a UX automática. */}
      {canCancelLive ? (
        <div className="vox-overlay-footer vox-v4-footer-controls">
          <button
            type="button"
            className="vox-btn-ghost"
            onClick={() => void cancel()}
            disabled={busy}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="vox-btn-ghost vox-btn-eclipse"
            onClick={() => void eclipse()}
            disabled={busy || tauriUnavailable}
            title="Interrompe a sessão atual e limpa a captura"
          >
            Parar tudo
          </button>
        </div>
      ) : null}

      {/* Wave V3.9 · Session Closeout. Em "Detalhes avançados" para não poluir
          o fluxo principal. */}
      {advancedOpen && (state === 'compiled'
        || state === 'executed'
        || state === 'blocked'
        || state === 'cancelled')
      && (transcript || kernelResponse || executionResult) ? (
        <VoxSessionCloseout
          key={
            confirmationRequest?.receiptId
            ?? kernelResponse?.receiptId
            ?? executionResult?.receiptId
            ?? confirmationRequest?.intentId
            ?? session?.sessionId
            ?? 'closeout-no-session'
          }
          mode={selectedMode}
          voxSessionId={session?.sessionId ?? null}
          startedAt={session?.startedAt ?? null}
          durationMs={
            session?.durationMs !== undefined && session.durationMs > 0
              ? session.durationMs
              : null
          }
          inferredUsedHotkey={session?.source === 'mac_edge_hotkey'}
          inferredUsedRealStt={Boolean(
            transcript
            && /whisper/i.test(transcript.engine)
            && !/debug/i.test(transcript.engine),
          )}
          inferredUsedGovernedExecute={selectedMode === 'governed_execute'}
          inferredEclipseUsed={false}
        />
      ) : null}

      {advancedOpen && (state === 'compiled'
        || state === 'executed'
        || state === 'blocked'
        || state === 'cancelled')
      && (transcript || kernelResponse || executionResult) ? (
        <VoxDogfoodPanel
          key={
            confirmationRequest?.receiptId
            ?? kernelResponse?.receiptId
            ?? executionResult?.receiptId
            ?? confirmationRequest?.intentId
            ?? session?.sessionId
            ?? 'dogfood-no-session'
          }
          recentSessionId={session?.sessionId ?? null}
          recentIntentId={confirmationRequest?.intentId ?? null}
          recentReceiptId={
            confirmationRequest?.receiptId
            ?? kernelResponse?.receiptId
            ?? executionResult?.receiptId
            ?? null
          }
        />
      ) : null}

      {/* Toggle Detalhes avançados · sempre visível para abrir diagnóstico. */}
      <section className="vox-overlay-dictionary">
        <button
          type="button"
          className="vox-overlay-dict-toggle"
          onClick={() => setAdvancedOpen((v) => !v)}
          aria-expanded={advancedOpen}
        >
          <span>Detalhes avançados</span>
          <span className="vox-overlay-dict-meta">diagnóstico, métricas e dicionário</span>
          <span className="vox-overlay-dict-chevron" aria-hidden="true">
            {advancedOpen ? '▾' : '▸'}
          </span>
        </button>
      </section>

      {advancedOpen ? (
        <>
          {/* Provider / output controles vivem aqui em V4. */}
          {(selectedMode === 'intent_compile' || selectedMode === 'governed_execute') ? (
            <div className="vox-overlay-controls" aria-label="Configuração avançada do Vox">
              <label className="vox-overlay-control">
                <span>Destino</span>
                <select
                  value={providerHint}
                  onChange={(e) =>
                    setProviderHint(
                      e.target.value as import('./useVoxOverlay').UseVoxOverlayResult['providerHint'],
                    )
                  }
                  disabled={busy}
                >
                  {PROVIDER_HINT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="vox-overlay-control">
                <span>Formato</span>
                <select
                  value={outputFormat}
                  onChange={(e) =>
                    setOutputFormat(
                      e.target.value as import('./useVoxOverlay').UseVoxOverlayResult['outputFormat'],
                    )
                  }
                  disabled={busy}
                >
                  {OUTPUT_FORMAT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          <section className="vox-overlay-dictionary">
            <button
              type="button"
              className="vox-overlay-dict-toggle"
              onClick={() => setReadinessOpen((v) => !v)}
              aria-expanded={readinessOpen}
            >
              <span>Diagnóstico</span>
              <span className="vox-overlay-dict-meta">verificação de funcionamento</span>
              <span className="vox-overlay-dict-chevron" aria-hidden="true">
                {readinessOpen ? '▾' : '▸'}
              </span>
            </button>
            <VoxReadinessPanel open={readinessOpen} />
          </section>

          <section className="vox-overlay-dictionary">
            <button
              type="button"
              className="vox-overlay-dict-toggle"
              onClick={() => setGateOpen((v) => !v)}
              aria-expanded={gateOpen}
            >
              <span>Métricas V3</span>
              <span className="vox-overlay-dict-meta">uso real e comparações</span>
              <span className="vox-overlay-dict-chevron" aria-hidden="true">
                {gateOpen ? '▾' : '▸'}
              </span>
            </button>
            <VoxGatePanel
              open={gateOpen}
              recentSessionId={session?.sessionId ?? null}
              recentIntentId={confirmationRequest?.intentId ?? null}
              recentReceiptId={
                confirmationRequest?.receiptId ?? kernelResponse?.receiptId ?? null
              }
              rivalsCaptureAvailable={Boolean(transcript || kernelResponse || executionResult)}
            />
          </section>

          <section className="vox-overlay-dictionary">
            <button
              type="button"
              className="vox-overlay-dict-toggle"
              onClick={() => setDictOpen((v) => !v)}
              aria-expanded={dictOpen}
            >
              <span>Dicionário pessoal</span>
              {dictionary ? (
                <span className="vox-overlay-dict-meta">
                  v{dictionary.version} · {dictionary.entries.length} entradas · {dictionary.language}
                </span>
              ) : (
                <span className="vox-overlay-dict-meta">
                  {tauriUnavailable ? 'indisponível (Tauri)' : 'não carregado'}
                </span>
              )}
              <span className="vox-overlay-dict-chevron" aria-hidden="true">
                {dictOpen ? '▾' : '▸'}
              </span>
            </button>
            {dictOpen ? (
              <div className="vox-overlay-dict-body">
                {tauriUnavailable ? (
                  <p className="vox-overlay-hint vox-overlay-hint-warn">
                    Edição do dicionário exige o app desktop/Tauri.
                  </p>
                ) : !dictionary ? (
                  <p className="vox-overlay-hint">Carregando dicionário…</p>
                ) : (
                  <>
                    {sampleTerms.length > 0 ? (
                      <div className="vox-overlay-dict-chips" aria-label="Termos preferidos">
                        {sampleTerms.map((term) => (
                          <span key={term} className="vox-overlay-dict-chip">
                            {term}
                          </span>
                        ))}
                        {dictionary.entries.length > sampleTerms.length ? (
                          <span className="vox-overlay-dict-chip-more">
                            +{dictionary.entries.length - sampleTerms.length}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="vox-overlay-dict-form">
                      <label className="vox-overlay-dict-field">
                        <span>Variante ouvida</span>
                        <input
                          type="text"
                          value={dictVariant}
                          onChange={(e) => setDictVariant(e.target.value)}
                          placeholder="ex.: live kit"
                          maxLength={80}
                          spellCheck={false}
                        />
                      </label>
                      <label className="vox-overlay-dict-field">
                        <span>Termo correto</span>
                        <input
                          type="text"
                          value={dictPreferred}
                          onChange={(e) => setDictPreferred(e.target.value)}
                          placeholder="ex.: LiveKit"
                          maxLength={80}
                          spellCheck={false}
                        />
                      </label>
                      <button
                        type="button"
                        className="vox-btn-secondary"
                        onClick={() => void handleAddCorrection()}
                        disabled={
                          busy || dictVariant.trim() === '' || dictPreferred.trim() === ''
                        }
                      >
                        Adicionar correção
                      </button>
                    </div>
                    {dictFeedback ? (
                      <p
                        className={`vox-overlay-hint ${
                          dictFeedback.kind === 'ok'
                            ? 'vox-overlay-hint-warn'
                            : 'vox-overlay-hint-error'
                        }`}
                        role="status"
                      >
                        {dictFeedback.message}
                      </p>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  )
}
