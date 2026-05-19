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
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  isVoxTerminalProposal,
  voxReplyPhraseForState,
  voxSettingsGet,
  voxSettingsUpdate,
  voxSpeakShort,
  type VoxShortPhraseKey,
  type VoxVoiceMode,
} from '../../lib/bridge'
import {
  composeSmartPreview,
  smartPreviewInputsFromKernel,
  VOX_SMART_PREVIEW_ACTION_LABEL,
  type VoxSmartPreviewViewModel,
} from '../../lib/voxSmartPreview'
import type { UseVoxOverlayResult, VoxOverlayState } from './useVoxOverlay'
import { VoxDogfoodPanel } from './VoxDogfoodPanel'
import { VoxGatePanel } from './VoxGatePanel'
import { VoxSessionCloseout } from './VoxSessionCloseout'
import { VoxAutoDogfoodChip } from './VoxAutoDogfoodChip'
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

/**
 * V6 · Reply Surface · texto curto mostrado na cabine "Atlas respondeu".
 * Sempre visível em texto; voz é opcional (voice_mode='short' liga `say`).
 * Whitelist canônica — espelha o Rust 1:1, sem fala arbitrária.
 */
const VOX_REPLY_PHRASE_TEXT: Record<VoxShortPhraseKey, string> = {
  understood: 'Entendi.',
  need_detail: 'Preciso de um detalhe.',
  blocked_safety: 'Bloqueei por segurança.',
  prompt_ready: 'Prompt pronto.',
}

interface VoxOverlayProps {
  controller: UseVoxOverlayResult
}

const STATE_LABEL: Record<VoxOverlayState, string> = {
  closed: 'Fechado',
  idle: 'Pronto',
  starting: 'Iniciando…',
  listening: 'Ouvindo',
  finishing: 'Finalizando…',
  transcribing: 'Transcrevendo…',
  transcript_ready: 'Revise o texto',
  compiling: 'Pensando…',
  compiled: 'Revise o texto',
  awaiting_confirmation: 'Confirme antes de executar',
  executing: 'Executando…',
  executed: 'Executado',
  blocked: 'Bloqueado',
  cancelled: 'Cancelado',
  eclipsed: 'Sessão encerrada',
  error: 'Erro',
}

/** V6-G · traduz `action_outcome` cru do Kernel pra PT-BR humano. */
const EXECUTION_OUTCOME_LABEL: Record<string, string> = {
  completed: 'Pronto',
  blocked: 'Bloqueado',
  failed: 'Algo deu errado',
  aborted: 'Interrompido',
  cancelled: 'Cancelado',
  pending: 'Em andamento…',
  unavailable: 'Indisponível agora',
}

function humanExecutionOutcome(outcome: string | null | undefined, status: string | null | undefined): string {
  const key = (outcome ?? status ?? '').toString().toLowerCase()
  return EXECUTION_OUTCOME_LABEL[key] ?? 'Concluído'
}

const MODE_LABEL: Record<
  import('./useVoxOverlay').UseVoxOverlayResult['selectedMode'],
  string
> = {
  auto: 'Automático',
  dictation: 'Ditado',
  prompt_polish: 'Melhorar',
  intent_compile: 'Criar prompt',
  governed_execute: 'Executar',
}

const MODE_HINT: Record<
  import('./useVoxOverlay').UseVoxOverlayResult['selectedMode'],
  string
> = {
  auto: 'o Atlas escolhe o modo certo pra você',
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

// V6-MIC-AIRPODS-FINAL · qualquer mensagem do Rust que vaze rms/peak/
// active_ratio/AudioInputInvalid é técnica demais para a UI principal.
// A UI principal mostra UMA frase humana; detalhes técnicos só no painel
// "Detalhes avançados".
const TECH_LEAK_PATTERN = /(rms|peak|active_ratio|AudioInputInvalid|audio_input_invalid|silent or unintelligible)/i

function userFriendlySttMessage(code: string, message: string): string {
  if (code === 'audio_input_invalid') {
    // V6-MIC-AIRPODS-FINAL · cobre os dois casos canônicos (capture vazia e
    // captura curta/baixo volume) com a mesma frase pedida no brief: foco em
    // ação concreta (escolher microfone certo no macOS), sem jargão técnico.
    return 'Não recebi áudio. Confira se o microfone certo está selecionado no macOS e tente de novo.'
  }
  if (code === 'model_missing' || code === 'model_missing_or_engine_unavailable') {
    return 'O modelo de voz local não está pronto. Abra pelo comando Vox correto e tente de novo.'
  }
  if (code === 'engine_binding_pending') {
    return 'O Atlas Vox não foi aberto no modo correto de desktop. Feche esta janela e abra pelo comando Vox.'
  }
  // Catch-all: nunca devolve string crua do Rust se ela vazar termos técnicos.
  if (message && TECH_LEAK_PATTERN.test(message)) {
    return 'Não recebi áudio. Confira se o microfone certo está selecionado no macOS e tente de novo.'
  }
  return message || 'Não consegui transcrever essa gravação. Tente gravar de novo.'
}

// V6 · humanização vive em módulo isolado (`voxOverlayHumanize.ts`) sem
// JSX nem `import.meta.env` para que possa ser testada sem Vite. Re-exportamos
// daqui para preservar compatibilidade com consumidores antigos.
export { humanizeOverlayError } from './voxOverlayHumanize'
import { humanizeOverlayError } from './voxOverlayHumanize'

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
  if (mode === 'auto') {
    return goal ? `Ainda decidindo · ${goal}` : 'Atlas escolhendo o melhor caminho'
  }
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
    clarificationDraft,
    interlocutorVisible,
    executionResult,
    canExecute,
    error,
    busy,
    phaseElapsedMs,
    sttSlow,
    close,
    start,
    finish,
    cancel,
    eclipse,
    setTranscriptDraft,
    setLiteralConfirmationDraft,
    setClarificationDraft,
    submitClarification,
    applyInterlocutorSuggestion,
    dismissInterlocutor,
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

  // V6.5-SMART-PREVIEW · view-model determinístico do bloco "Ouvi / Entendi /
  // Vou fazer". Memoizado pra evitar recomputar a cada tick de elapsed
  // (state mexe a cada 1 s durante transcribing/compiling/executing).
  const smartPreviewVm: VoxSmartPreviewViewModel = useMemo(
    () =>
      composeSmartPreview(
        smartPreviewInputsFromKernel(
          kernelResponse,
          kernelResponse?.suggestedMode ?? null,
          kernelResponse?.modeResolution === 'auto_router',
          transcriptDraft || transcript?.text || null,
        ),
      ),
    [
      kernelResponse,
      transcriptDraft,
      transcript,
    ],
  )

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
  // V6 · Reply Surface · preferência local + dedupe de fala.
  // `replyPhrase` é DERIVADO durante o render (não useState) para que SSR
  // renderize o card "Atlas respondeu" honestamente sem precisar rodar
  // useEffect. O `spokenRepliesRef` evita re-disparar `say` em re-renders.
  const [voiceMode, setVoiceMode] = useState<VoxVoiceMode>('off')
  const [voiceSettingsBusy, setVoiceSettingsBusy] = useState<boolean>(false)
  const spokenRepliesRef = useRef<Set<string>>(new Set())
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

  // V6 · carrega preferência local quando o overlay abre. Em browser/dev
  // devolve default conservador (off) e nunca grava no disco.
  useEffect(() => {
    if (state === 'closed') return
    let cancelled = false
    void (async () => {
      const settings = await voxSettingsGet()
      if (cancelled) return
      setVoiceMode(settings.voiceMode)
    })()
    return () => {
      cancelled = true
    }
  }, [state])


  const handleVoiceModeChange = async (next: VoxVoiceMode) => {
    if (next === voiceMode || voiceSettingsBusy) return
    setVoiceSettingsBusy(true)
    try {
      const updated = await voxSettingsUpdate(next)
      setVoiceMode(updated.voiceMode)
    } catch (e) {
      console.warn('[VoxOverlay] voxSettingsUpdate falhou', e)
    } finally {
      setVoiceSettingsBusy(false)
    }
  }

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
  // V6-ES-D · saídas garantidas em estados de espera (transcribing/compiling)
  // e no transcript_ready estático: o operador nunca fica sem botão. Em
  // transcribing/compiling a saída é "Parar tudo" (eclipse) — drop limpo na
  // Rust. Em transcript_ready, "Gravar de novo" reabre fresh sem fechar o
  // overlay (sempre disponível, não só quando confidence é baixa).
  const canExitWait =
    state === 'transcribing' || state === 'compiling'
  const canRerecordFromTranscript = state === 'transcript_ready'
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

  // V5-A · Symbiotic Interlocutor. Camada conversacional vinda do Kernel.
  // Renderizamos somente se vier do backend (parser devolve `null` quando o
  // Kernel é velho ou o payload está malformado) e somente quando o policy
  // decidiu intervir (`intervention !== 'none'`). `blocking` desabilita o
  // botão Confirmar — bloqueio só acontece em risco/política dura, nunca
  // em opinião.
  // V5-B · `interlocutorVisible` já fatora "intervention !== none" + dismissal
  // local do operador. `interlocutorBlocks` continua olhando blocking direto
  // do payload — bloqueio nunca é dismissível.
  const interlocutor = kernelResponse?.interlocutor ?? null
  const interlocutorActive = Boolean(interlocutorVisible && interlocutor)
  const interlocutorBlocks = Boolean(interlocutor?.blocking)
  const canConfirm =
    confirmPayload.trim() !== '' && !interlocutorBlocks
  const hasInterlocutorSuggestedEdit = Boolean(
    interlocutor
      && interlocutor.suggestedEdit
      && (interlocutor.intervention === 'suggest_better_prompt'
        || (interlocutor.intervention === 'disagree'
          && typeof interlocutor.suggestedEdit.safer_path === 'string'
          && (interlocutor.suggestedEdit.safer_path as string).trim() !== '')),
  )

  // V6 · Reply Surface · frase curta canônica derivada do estado atual.
  // Computada durante o render para que SSR renderize honestamente sem
  // depender de useEffect. Voz é disparada num side-effect separado.
  const replyPhrase: VoxShortPhraseKey | null = (() => {
    const isReplyState =
      state === 'compiled'
      || state === 'awaiting_confirmation'
      || state === 'executed'
      || state === 'blocked'
    if (!isReplyState || !kernelOk) return null
    return voxReplyPhraseForState({
      intervention: interlocutor ? interlocutor.intervention : null,
      blocking: Boolean(interlocutor?.blocking),
      // V6 · `selectedMode='auto'` é decisão pendente; o Reply Surface só
      // fala em cima dos 4 modos concretos (Wave 6.5 canon).
      mode: selectedMode === 'auto' ? null : selectedMode,
      hasCompiledPrompt: canInsertCompiled,
    })
  })()

  // V6 · side-effect de fala. (receipt, phrase) é único — `say` dispara
  // uma vez só por sessão. Cooldown global anti-flood vive no Rust. Falha
  // do `say` jamais quebra o fluxo (fire-and-forget).
  const replySpeakKey = replyPhrase
    ? `${
        kernelResponse?.receiptId
        ?? executionResult?.receiptId
        ?? confirmationRequest?.receiptId
        ?? session?.sessionId
        ?? 'vox-reply-no-receipt'
      }::${replyPhrase}`
    : ''
  useEffect(() => {
    if (!replyPhrase || voiceMode !== 'short') return
    if (replySpeakKey === '') return
    if (spokenRepliesRef.current.has(replySpeakKey)) return
    spokenRepliesRef.current.add(replySpeakKey)
    void voxSpeakShort(replyPhrase)
  }, [replyPhrase, replySpeakKey, voiceMode])

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
  // V6-ES-A · label da ação primária por estado.
  //   idle fresco              → "Começar"     (Vitor está abrindo o app)
  //   error                    → "Tentar novamente" (ensina o próximo passo)
  //   cancelled / eclipsed /
  //   executed / blocked       → "Gravar de novo" (já houve sessão útil)
  const primaryRecordLabel =
    state === 'error'
      ? 'Tentar novamente'
      : hasAnyResult || state === 'cancelled' || state === 'eclipsed'
        ? 'Gravar de novo'
        : 'Começar'

  // V6-ES-A · label da ação primária no estado "compiled". Depende do modo
  // efetivo: ditado/melhorar inserem texto direto no composer; criar prompt
  // envia o resultado curado para o Atlas. governed_execute usa fluxo R2+
  // próprio, então mantém "Confirmar" como label canônico.
  const confirmActionLabel: string = (() => {
    switch (selectedMode) {
      case 'dictation':
      case 'prompt_polish':
        return 'Inserir texto'
      case 'intent_compile':
        return 'Enviar ao Atlas'
      case 'governed_execute':
        return 'Confirmar'
      default:
        return 'Inserir texto'
    }
  })()

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
          <span className="vox-overlay-session" aria-live="polite">
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
        <div className="vox-listening">
          <div className="vox-listening-pill" role="status" aria-live="assertive">
            <span className="vox-listening-dot" aria-hidden="true" />
            <span className="vox-listening-label">Atlas ouvindo</span>
          </div>
          {/* V6-ES-A · ação primária explícita. O atalho continua no rodapé;
              o botão é o canal óbvio pro operador parar de falar. */}
          <button
            type="button"
            className="vox-btn-primary vox-listening-stop"
            onClick={() => void finish()}
            disabled={busy}
          >
            Finalizar
          </button>
          <p className="vox-listening-hint">
            Aperte <kbd className="vox-hotkey-hint-key">⌥ Space</kbd> ou <kbd className="vox-hotkey-hint-key">Enter</kbd> para finalizar
            <span aria-hidden="true"> · </span>
            <kbd className="vox-hotkey-hint-key">esc</kbd> cancela
          </p>
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
          {/* V6-UX-FINAL · sem listar enums técnicos como
              "accessibility, input_monitoring" — manda o operador
              direto pro caminho de Ajustes do macOS. */}
          O Atlas Vox precisa de permissões do macOS para começar. Abra
          {' '}<strong>Ajustes do Sistema → Privacidade e Segurança</strong>{' '}
          e libere microfone, acessibilidade e monitoramento de entrada
          para o Atlas Code.
        </div>
      ) : null}

      {sttEngineMessage ? (
        <div className="vox-overlay-banner vox-overlay-banner-info" hidden={!advancedOpen}>
          Motor de voz: {sttEngineMessage}
        </div>
      ) : null}

      {error ? (
        <div className="vox-overlay-banner vox-overlay-banner-error">
          {humanizeOverlayError(error)}
        </div>
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
            {/* V6-UX-FINAL · frase única, sóbrio. */}
            Aperte <kbd className="vox-hotkey-hint-key">⌥ Space</kbd> para começar ou parar
            <span className="vox-v4-record-hint-sep" aria-hidden="true">·</span>
            <kbd className="vox-hotkey-hint-key">esc</kbd> cancela
          </p>
          {/* V6-G · Recuperação infalível: pós-sessão (executed/blocked/
              cancelled/eclipsed/error), oferecer "Parar tudo" pra limpar
              estado local SEM atrapalhar o fluxo principal de gravar de novo. */}
          {hasAnyResult && !tauriUnavailable ? (
            <button
              type="button"
              className="vox-btn-ghost vox-btn-eclipse vox-v4-record-stop"
              onClick={() => void eclipse()}
              disabled={busy}
              title="Limpa a sessão atual e libera tudo pra começar do zero"
            >
              Parar tudo
            </button>
          ) : null}
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

      {/* V4 · "Texto ouvido". Aparece em transcribing/transcript_ready/
          compiling/compiled/awaiting_confirmation. */}
      {state === 'transcribing'
        || state === 'transcript_ready'
        || state === 'compiling'
        || state === 'compiled'
        || state === 'awaiting_confirmation' ? (
        <section className="vox-overlay-section">
          <h3 className="vox-overlay-section-title">Texto ouvido</h3>
          {state === 'transcribing' ? (
            <>
              <div className="vox-overlay-transcribing" role="status" aria-live="polite">
                <span className="vox-overlay-transcribing-dot" aria-hidden="true" />
                <span>
                  Transcrevendo localmente
                  {phaseElapsedMs >= 2000 ? `… ${Math.floor(phaseElapsedMs / 1000)}s` : '…'}
                </span>
              </div>
              {sttSlow ? (
                <p
                  className="vox-overlay-hint vox-overlay-hint-warn"
                  role="status"
                  aria-live="polite"
                >
                  Está demorando mais que o esperado. Se quiser, use “Parar tudo”
                  e grave uma fala mais curta.
                </p>
              ) : null}
            </>
          ) : null}

          {transcript ? (
            <>
              {/* V6-ES-B · aviso humano de baixa confiança. Não força nada:
                  só sugere regravar quando o sinal cru ficou fraco (áudio
                  fraco ou fala muito curta). Default conservador: aparece
                  apenas se confidence ∈ (0, 0.55]. */}
              {typeof transcript.confidence === 'number'
                && transcript.confidence > 0
                && transcript.confidence <= 0.55 ? (
                <p
                  className="vox-overlay-hint vox-overlay-hint-warn vox-overlay-lowconf-hint"
                  role="status"
                >
                  Ficou curto ou baixinho. Quer{' '}
                  <button
                    type="button"
                    className="vox-overlay-lowconf-link"
                    onClick={() => void start()}
                    disabled={busy || tauriUnavailable}
                  >
                    gravar de novo
                  </button>
                  ?
                </p>
              ) : null}
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
          <h3 className="vox-overlay-section-title">O Atlas está pensando</h3>
          <div className="vox-overlay-transcribing" role="status" aria-live="polite">
            <span className="vox-overlay-transcribing-dot" aria-hidden="true" />
            <span>Analisando o que você disse…</span>
          </div>
        </section>
      ) : null}

      {state === 'compiled' && kernelOk && kernelResponse ? (
        <section className="vox-overlay-section vox-v4-understanding">
          <h3 className="vox-overlay-section-title">O que o Atlas vai fazer</h3>
          {smartPreviewVm.kind !== 'fallback' ? (
            <SmartPreviewBlock
              vm={smartPreviewVm}
              clarificationDraft={clarificationDraft}
              setClarificationDraft={setClarificationDraft}
              onSubmitClarification={() => void submitClarification()}
              onRerecord={() => void start()}
              busy={busy}
            />
          ) : (
            <p className="vox-v4-understanding-line">
              {understandingLine ?? describeUnderstanding(selectedMode, kernelResponse, providerHint)}
            </p>
          )}

          {/* V6 · Atlas respondeu — texto curto canônico. Sempre visível.
              Voz só sai se voice_mode='short' (gate no Rust). */}
          {replyPhrase ? (
            <p
              className="vox-v4-reply"
              data-reply-phrase={replyPhrase}
              data-voice-mode={voiceMode}
              role="status"
              aria-live="polite"
            >
              <span className="vox-v4-reply-eyebrow">Atlas respondeu</span>
              <span className="vox-v4-reply-text">{VOX_REPLY_PHRASE_TEXT[replyPhrase]}</span>
              {voiceMode === 'short' ? (
                <span className="vox-v4-reply-voice-tag" aria-hidden="true">voz curta</span>
              ) : null}
            </p>
          ) : null}

          {/* V5-A · Symbiotic Interlocutor. Aparece somente quando o Kernel
              respondeu com intervention !== 'none'. Tom é PT-BR, útil e direto:
              clarify pergunta, caution adverte, disagree discorda (bloqueia
              Confirmar quando blocking=true), suggest_better_prompt convida
              a estruturar melhor o pedido. */}
          {interlocutorActive && interlocutor ? (
            <div
              className={`vox-v4-interlocutor vox-v4-interlocutor-${interlocutor.intervention}${
                interlocutor.blocking ? ' vox-v4-interlocutor-blocking' : ''
              }`}
              role={interlocutor.blocking ? 'alert' : 'note'}
              aria-live="polite"
            >
              <p className="vox-v4-interlocutor-eyebrow">
                {interlocutor.intervention === 'clarify'
                  ? 'Antes de seguir'
                  : 'Atlas respondeu'}
              </p>
              <p className="vox-v4-interlocutor-message">
                {interlocutor.messagePtBr}
              </p>
              {interlocutor.questionPtBr ? (
                <p className="vox-v4-interlocutor-question">
                  {interlocutor.questionPtBr}
                </p>
              ) : null}
              {interlocutor.blocking ? (
                <p className="vox-v4-interlocutor-blocking-note">
                  Ação bloqueada por política de segurança. Use
                  <strong> Editar intenção</strong> ou <strong>Cancelar</strong> para seguir.
                </p>
              ) : null}

              {/* V5-B · clarify: campo de resposta curta + botão Responder. */}
              {interlocutor.intervention === 'clarify' ? (
                <div className="vox-v4-interlocutor-clarify-form">
                  <label className="vox-v4-interlocutor-clarify-label">
                    <span className="vox-v4-interlocutor-clarify-label-text">
                      Sua resposta
                    </span>
                    <input
                      type="text"
                      className="vox-v4-interlocutor-clarify-input"
                      value={clarificationDraft}
                      onChange={(e) => setClarificationDraft(e.target.value)}
                      placeholder="Responda em poucas palavras"
                      maxLength={240}
                      autoComplete="off"
                      spellCheck={false}
                      disabled={busy}
                    />
                  </label>
                  <div className="vox-v4-interlocutor-actions">
                    <button
                      type="button"
                      className="vox-btn-secondary"
                      onClick={() => void submitClarification()}
                      disabled={busy || clarificationDraft.trim() === ''}
                      title="Anexa sua resposta à fala e pede para o Atlas avaliar de novo"
                    >
                      Responder
                    </button>
                  </div>
                </div>
              ) : null}

              {/* V5-B · caution: avisão sem botão extra; o Confirmar do bloco
                  principal serve de "continuar mesmo assim". */}
              {interlocutor.intervention === 'caution' ? (
                <div className="vox-v4-interlocutor-actions">
                  <button
                    type="button"
                    className="vox-btn-ghost"
                    onClick={() => dismissInterlocutor()}
                    disabled={busy}
                    title="Esconde este aviso. Você ainda revisou o risco antes de confirmar."
                  >
                    Continuar mesmo assim
                  </button>
                </div>
              ) : null}

              {/* V5-B · disagree: bloqueante → Editar intenção. Não bloqueante →
                  Usar caminho mais seguro + Manter original. */}
              {interlocutor.intervention === 'disagree' ? (
                <div className="vox-v4-interlocutor-actions">
                  {hasInterlocutorSuggestedEdit ? (
                    <button
                      type="button"
                      className="vox-btn-secondary"
                      onClick={() => applyInterlocutorSuggestion()}
                      disabled={busy}
                      title="Usa o caminho mais seguro como ponto de partida pra você revisar e gravar de novo"
                    >
                      Usar caminho mais seguro
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="vox-btn-secondary"
                    onClick={() => resetForRecompile()}
                    disabled={busy}
                    title="Volta para o texto ouvido para você editar a intenção"
                  >
                    Editar intenção
                  </button>
                  {!interlocutor.blocking ? (
                    <button
                      type="button"
                      className="vox-btn-ghost"
                      onClick={() => dismissInterlocutor()}
                      disabled={busy}
                      title="Mantém o pedido original e segue para Confirmar"
                    >
                      Manter original
                    </button>
                  ) : null}
                </div>
              ) : null}

              {/* V5-B · suggest_better_prompt: aplica o template estruturado OU
                  mantém o original. Nada bloqueante. */}
              {interlocutor.intervention === 'suggest_better_prompt' ? (
                <div className="vox-v4-interlocutor-actions">
                  {hasInterlocutorSuggestedEdit ? (
                    <button
                      type="button"
                      className="vox-btn-secondary"
                      onClick={() => applyInterlocutorSuggestion()}
                      disabled={busy}
                      title="Preenche o texto com uma estrutura: Objetivo / Contexto / Restrições / Critério de aceite"
                    >
                      Usar sugestão
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="vox-btn-ghost"
                    onClick={() => dismissInterlocutor()}
                    disabled={busy}
                    title="Mantém o pedido como está e segue para Confirmar"
                  >
                    Manter original
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

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
                {/* V6-UX-FINAL · copy sóbrio: "Ver prompt" / "Ver texto"
                    em vez de "Prompt poderoso/polido" (palavras de
                    marketing soavam exageradas para tom enterprise). */}
                {selectedMode === 'intent_compile' ? 'Ver prompt completo' : 'Ver texto completo'}
              </summary>
              <pre
                className="vox-overlay-compiled-prompt"
                aria-label={
                  selectedMode === 'intent_compile'
                    ? 'Prompt criado pelo Atlas'
                    : 'Texto melhorado pelo Atlas'
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
                      selectedMode === 'intent_compile' ? 'prompt' : 'texto',
                    )
                  }
                  disabled={!canInsertCompiled}
                >
                  {selectedMode === 'intent_compile' ? 'Copiar prompt' : 'Copiar texto'}
                </button>
              </div>
            </details>
          ) : polishMissing ? (
            <p className="vox-overlay-hint vox-overlay-hint-warn">
              {selectedMode === 'intent_compile'
                ? 'O Atlas ainda não devolveu o prompt para esta intenção.'
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
              title={
                interlocutorBlocks
                  ? 'Ação bloqueada: o Atlas detectou risco destrutivo. Troque o modo ou cancele.'
                  : confirmActionLabel === 'Enviar ao Atlas'
                    ? 'Envia o prompt preparado para o Atlas'
                    : 'Insere o texto no composer'
              }
            >
              {confirmActionLabel}
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
              title="Descarta o resultado e grava de novo"
            >
              Gravar de novo
            </button>
            {copyStatus ? (
              <span className="vox-overlay-flash" role="status">
                {copyStatus}
              </span>
            ) : null}
          </div>

          {/* Seletor de modo compacto · só aparece quando o operador pede.
              V6-VISUAL-POLISH-FINAL · 4 modos canônicos no segmented (sem
              "Automático", que é o default implícito) + link discreto
              "Voltar ao automático" quando o operador trancou um modo. */}
          {modeSwitcherOpen ? (
            <div className="vox-v4-mode-switcher" aria-label="Trocar modo do Atlas Vox">
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
              <p className="vox-v4-mode-switcher-hint">
                {MODE_HINT[selectedMode]}
                {selectedMode !== 'auto' ? (
                  <>
                    {' · '}
                    <button
                      type="button"
                      className="vox-v4-mode-switcher-reset"
                      onClick={() => handleSwitchMode('auto')}
                      disabled={busy}
                      title="Deixa o Atlas escolher o modo certo automaticamente"
                    >
                      voltar ao automático
                    </button>
                  </>
                ) : null}
              </p>
            </div>
          ) : null}
        </section>
      ) : state === 'compiled' && kernelResponse && kernelResponse.status === 'unavailable' ? (
        <section className="vox-overlay-section vox-v4-understanding">
          <h3 className="vox-overlay-section-title">O Atlas está pensando</h3>
          <p className="vox-overlay-hint vox-overlay-hint-warn">
            O Atlas está indisponível agora. Tente de novo em alguns instantes.
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
          <h3 className="vox-overlay-section-title">O Atlas está pensando</h3>
          <p className="vox-overlay-hint vox-overlay-hint-error">
            Não consegui montar a resposta dessa vez. Tente de novo.
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
                Confirme antes de executar · risco <span className={`vox-risk vox-risk-${risk}`}>{risk}</span>
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
              Resultado · {humanExecutionOutcome(executionResult.actionOutcome, executionResult.status)}
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
          <h3 className="vox-overlay-section-title">Diagnóstico técnico</h3>
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

      {/* V6-ES-D · saída garantida durante estados de espera. transcribing
          e compiling normalmente duram < 2 s, mas se travar o operador
          tem como sair pelo eclipse limpo. */}
      {canExitWait ? (
        <div className="vox-overlay-footer vox-v4-footer-controls">
          <button
            type="button"
            className="vox-btn-ghost vox-btn-eclipse"
            onClick={() => void eclipse()}
            disabled={busy || tauriUnavailable}
            title="Interrompe a operação atual e volta para o início"
          >
            Parar tudo
          </button>
        </div>
      ) : null}

      {/* V6-ES-D · transcript_ready transient: enquanto o compile automático
          dispara, o operador já pode trocar de gravação se o texto saiu
          torto. Botão discreto, não bloqueia o auto-compile. */}
      {canRerecordFromTranscript ? (
        <div className="vox-overlay-footer vox-v4-footer-controls">
          <button
            type="button"
            className="vox-btn-ghost"
            onClick={() => void start()}
            disabled={busy || tauriUnavailable}
            title="Descarta este texto e abre uma nova gravação"
          >
            Gravar de novo
          </button>
        </div>
      ) : null}

      {/* V6-E · chip do dogfood automático. Aparece em todo fim de sessão
          real (executed/blocked/cancelled/error). Não mostra formulário —
          só "Sessão registrada" + Funcionou bem / Marcar como ruim. */}
      <VoxAutoDogfoodChip autoDogfood={controller.autoDogfood} />

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
          mode={selectedMode === 'auto' ? 'intent_compile' : selectedMode}
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
          <span className="vox-overlay-dict-meta">diagnóstico, progresso e dicionário</span>
          <span className="vox-overlay-dict-chevron" aria-hidden="true">
            {advancedOpen ? '▾' : '▸'}
          </span>
        </button>
      </section>

      {advancedOpen ? (
        <>
          {/* V6 · Reply Surface · preferência local de voz. Default é
              "desligada" — o Atlas nunca fala sem o operador pedir. Quando
              "curta", apenas frases whitelistadas (≤ 30 chars cada) saem
              via macOS `say`, com cooldown anti-flood no Rust. */}
          <div className="vox-overlay-controls vox-overlay-voice-prefs" aria-label="Voz do Atlas Vox">
            <fieldset className="vox-voice-mode-group">
              <legend className="vox-voice-mode-legend">Voz</legend>
              <label className="vox-voice-mode-option">
                <input
                  type="radio"
                  name="vox-voice-mode"
                  value="off"
                  checked={voiceMode === 'off'}
                  disabled={voiceSettingsBusy}
                  onChange={() => void handleVoiceModeChange('off')}
                />
                <span>desligada</span>
              </label>
              <label className="vox-voice-mode-option">
                <input
                  type="radio"
                  name="vox-voice-mode"
                  value="short"
                  checked={voiceMode === 'short'}
                  disabled={voiceSettingsBusy}
                  onChange={() => void handleVoiceModeChange('short')}
                />
                <span>curta</span>
              </label>
              <p className="vox-voice-mode-hint">
                Texto sempre aparece. Voz curta fala só frases canônicas (≤ 30 chars).
              </p>
            </fieldset>
          </div>

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
              <span>Progresso</span>
              <span className="vox-overlay-dict-meta">uso real e comparativos</span>
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

// ─── V6.5 · SmartPreviewBlock ────────────────────────────────────────────
//
// Bloco "Ouvi / Entendi / Vou fazer" alimentado pelo view-model
// determinístico vindo de `composeSmartPreview()`. NUNCA expõe campos crus
// (schema, risk_class, confidence raw, receipt id, kernel). Estados:
//
//   - clarification        → pergunta + campo de resposta + "Gravar de novo".
//   - low_confidence       → aviso "Não tenho certeza" + sugere editar/regravar.
//   - blocked_destructive  → bloco de risco em PT-BR, sem botão Executar.
//   - ready                → triplet completo + safe_fallback discreto.
//
// O componente é puro: recebe callbacks já wirados pelo overlay (compile,
// rerecord, submitClarification). Não toca em nenhum estado novo.

interface SmartPreviewBlockProps {
  vm: VoxSmartPreviewViewModel
  clarificationDraft: string
  setClarificationDraft: (text: string) => void
  onSubmitClarification: () => void
  onRerecord: () => void
  busy: boolean
}

function SmartPreviewBlock({
  vm,
  clarificationDraft,
  setClarificationDraft,
  onSubmitClarification,
  onRerecord,
  busy,
}: SmartPreviewBlockProps) {
  // Eyebrow discreto pra quando o Auto Mode escolheu pelo operador.
  const modeHint = vm.modeSuggestionHint
  // Linhas opcionais: nem todo flow vem com triplet completo (clarification
  // omite `willDo`, R4 omite `willDo`, etc).
  const lines: Array<{ label: string; value: string }> = []
  if (vm.heard) lines.push({ label: 'Ouvi', value: vm.heard })
  if (vm.understood) lines.push({ label: 'Entendi', value: vm.understood })
  if (vm.willDo) lines.push({ label: 'Vou fazer', value: vm.willDo })

  return (
    <div
      className={`vox-smart-preview vox-smart-preview-${vm.kind}`}
      data-vox-smart-kind={vm.kind}
      data-vox-smart-destination={vm.destination ?? 'none'}
    >
      {modeHint ? (
        <p className="vox-smart-preview-eyebrow" aria-label="Modo escolhido pelo Atlas">
          {modeHint}
        </p>
      ) : null}

      {lines.length > 0 ? (
        <dl className="vox-smart-preview-triplet">
          {lines.map((line) => (
            <div key={line.label} className="vox-smart-preview-line">
              <dt className="vox-smart-preview-line-label">{line.label}</dt>
              <dd className="vox-smart-preview-line-value">{line.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {vm.kind === 'clarification' && vm.clarifyingQuestion ? (
        <div
          className="vox-smart-preview-clarification"
          role="region"
          aria-label="Pergunta antes de seguir"
        >
          <p className="vox-smart-preview-question">{vm.clarifyingQuestion}</p>
          <label className="vox-smart-preview-clarify-label">
            <span className="vox-smart-preview-clarify-label-text">Sua resposta</span>
            <input
              type="text"
              className="vox-smart-preview-clarify-input"
              value={clarificationDraft}
              onChange={(e) => setClarificationDraft(e.target.value)}
              placeholder="Responda em poucas palavras"
              maxLength={240}
              autoComplete="off"
              spellCheck={false}
              disabled={busy}
            />
          </label>
          <div className="vox-smart-preview-actions">
            <button
              type="button"
              className="vox-btn-secondary"
              onClick={onSubmitClarification}
              disabled={busy || clarificationDraft.trim() === ''}
              title="Anexa sua resposta à fala e pede pro Atlas pensar de novo"
            >
              {VOX_SMART_PREVIEW_ACTION_LABEL.answer_clarification}
            </button>
            <button
              type="button"
              className="vox-btn-ghost"
              onClick={onRerecord}
              disabled={busy}
            >
              {VOX_SMART_PREVIEW_ACTION_LABEL.rerecord}
            </button>
          </div>
        </div>
      ) : null}

      {vm.kind === 'low_confidence' && vm.lowConfidenceNote ? (
        <p
          className="vox-overlay-hint vox-overlay-hint-warn vox-smart-preview-low-conf"
          role="status"
        >
          {vm.lowConfidenceNote}
        </p>
      ) : null}

      {vm.kind === 'blocked_destructive' && vm.blockedReason ? (
        <p
          className="vox-overlay-hint vox-overlay-hint-error vox-smart-preview-block-reason"
          role="alert"
        >
          {vm.blockedReason}
        </p>
      ) : null}

      {vm.safeFallbackLabel ? (
        <p className="vox-smart-preview-safe-fallback" aria-label="Caminho seguro alternativo">
          Caminho seguro: {humanSafeFallback(vm.safeFallbackLabel)}.
        </p>
      ) : null}
    </div>
  )
}

/**
 * V6.5 · Humaniza o keyword `safe_fallback` que o backend envia (`copy_text`,
 * `ask_clarification`, `cancel`, `dictation`) — UI principal nunca mostra o
 * slug cru.
 */
function humanSafeFallback(keyword: string): string {
  switch (keyword) {
    case 'copy_text':
      return 'copiar o texto e seguir manualmente'
    case 'ask_clarification':
      return 'me peça pra reformular a fala'
    case 'cancel':
      return 'cancelar e tentar de novo'
    case 'dictation':
      return 'usar o texto como ditado'
    default:
      return keyword
  }
}
