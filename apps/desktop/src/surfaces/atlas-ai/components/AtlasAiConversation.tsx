/**
 * Atlas AI · Conversation panel premium (Phase 1 baseline parity).
 *
 * Renderiza:
 *   - Mensagens markdown leve + syntax highlighting Shiki + tables + ✦ dividers
 *   - DecisionBadge / QualityBadge / OpenBrainBadge no bubble do Atlas
 *   - ToolReceipts inline (estilo Codex CLI condensed)
 *   - StreamingIndicator com ThinkingState (4-phase by elapsed) + LiveActivity
 *   - Optimistic user bubble (entre Enter e API responder)
 *   - ErrorBanner com retry
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { AtlasAiConfidenceBand } from './AtlasAiConfidenceBand'
import { AtlasAiDecisionBadge } from './AtlasAiDecisionBadge'
import { AtlasAiErrorBanner } from './AtlasAiErrorBanner'
import { AtlasAiLiveActivity } from './AtlasAiLiveActivity'
import { AtlasAiMessageActions } from './AtlasAiMessageActions'
import { AtlasAiMessageBody } from './AtlasAiMessageBody'
import { projectPresentation } from '../presentationContract'
import { AtlasAiResponseAudit } from './AtlasAiResponseAudit'
import { AtlasAiOpenBrainBadge } from './AtlasAiOpenBrainBadge'
import { AtlasAiPlanIndicators } from './AtlasAiPlanIndicators'
import { AtlasAiQualityBadge } from './AtlasAiQualityBadge'
import { AtlasAiReasoningDrawer } from './AtlasAiReasoningDrawer'
import { AtlasAiThinkingState } from './AtlasAiThinkingState'
import { AtlasAiToolReceipts } from './AtlasAiToolReceipts'
import { AtlasAiYouTubeSourceBadge } from './AtlasAiYouTubeSourceBadge'
import { modeLabel, modelLabel } from '../contract'
import { formatRelativeLong } from '../timeFormat'
import type { AiThreadDetail, AiThreadMessage, AiTrace, AtlasAiMode, AtlasDevPlanResult } from '../types'

interface PendingUserMessage {
  text: string
  attachmentCount: number
  startedAt: number
}

interface AtlasAiConversationProps {
  detail: AiThreadDetail | null
  loading: boolean
  error: string | null
  pendingTrace: AiTrace | null
  pendingUserMessage: PendingUserMessage | null
  /** Texto streaming via SSE — aparece token-by-token na bolha. */
  streamingText?: string
  sending: boolean
  onArchive: () => void
  onPromote?: () => void
  onCancel?: () => void
  onLoadOlder?: () => void
  hasOlderMessages?: boolean
  olderMessagesLoading?: boolean
  olderMessagesError?: string | null
  /** Atlas Dev plan-only result for the current run (Claude 17 slice). */
  atlasDevPlan?: AtlasDevPlanResult | null
}

function roleLabel(role: string): string {
  if (role === 'user' || role === 'operator') return 'você'
  if (role === 'assistant' || role === 'atlas') return 'Atlas AI'
  if (role === 'system') return 'sistema'
  return role
}

/** Apenas o último segmento de um caminho (privacy + visual quiet). */
function basename(pathOrSlug: string): string {
  const trimmed = pathOrSlug.trim()
  if (trimmed === '') return trimmed
  const segs = trimmed.split('/').filter((s) => s.length > 0)
  return segs[segs.length - 1] ?? trimmed
}

function projectName(pathOrSlug: string): string {
  const base = basename(pathOrSlug)
  if (base.length <= 1) return base.toUpperCase()
  return base.charAt(0).toUpperCase() + base.slice(1)
}

function messageCountLabel(count: number): string {
  const safeCount = Math.max(0, count)
  return `${safeCount.toLocaleString('pt-BR')} ${safeCount === 1 ? 'mensagem' : 'mensagens'}`
}

const CONVERSATION_MODES = new Set<AtlasAiMode>([
  'auto',
  'general',
  'conversation',
  'operational',
  'programming',
  'research',
  'finance',
  'marketing',
  'strategy',
  'personal_development',
  'cyber',
  'automation',
])

function normalizeConversationMode(value: unknown): AtlasAiMode {
  return typeof value === 'string' && CONVERSATION_MODES.has(value as AtlasAiMode)
    ? (value as AtlasAiMode)
    : 'general'
}

function findTraceForMessage(message: AiThreadMessage, lastTrace: AiTrace | null): AiTrace | null {
  if (!lastTrace) return null
  if (message.trace_id && message.trace_id === lastTrace.id) return lastTrace
  return null
}

function MessageBubble({
  message,
  trace,
}: {
  message: AiThreadMessage
  trace: AiTrace | null
}) {
  const tone = message.role === 'user' || message.role === 'operator' ? 'operator' : 'atlas'
  const isAtlas = tone === 'atlas'
  const rawContent = message.content ?? ''
  // Sanitização editorial: turnos do Atlas passam pelo PresentationContract,
  // que separa cabeçalhos técnicos crus (SOURCE_REFS, UNCERTAINTY, etc.) do
  // corpo. Mensagens do operador renderizam intactas. Metadata cai no painel.
  const presentation = useMemo(() => {
    if (!isAtlas) return null
    if (!rawContent) return null
    return projectPresentation(rawContent)
  }, [isAtlas, rawContent])
  const bodyContent = presentation?.body || rawContent || '(sem conteúdo)'
  return (
    <article className={`atlas-ai-message tone-${tone}`}>
      <header className="atlas-ai-message-header">
        <span className="atlas-ai-message-role">{roleLabel(message.role)}</span>
        <span className="atlas-ai-message-meta">
          {message.provider ? `${modelLabel(message.provider)} · ` : ''}
          {formatRelativeLong(message.created_at) || '—'}
        </span>
      </header>

      {isAtlas && trace?.atlas_decision?.confidence_score !== undefined ? (
        <AtlasAiConfidenceBand
          score={trace.atlas_decision.confidence_score}
          reason={trace.atlas_decision.reason}
        />
      ) : null}

      {isAtlas && trace ? (
        <div className="atlas-calmaria-hide">
          <AtlasAiDecisionBadge
            atlasDecision={trace.atlas_decision ?? null}
            routerDecision={trace.router_decision ?? null}
          />
        </div>
      ) : null}

      <AtlasAiMessageBody content={bodyContent} />

      {isAtlas && trace ? <AtlasAiYouTubeSourceBadge trace={trace} /> : null}

      {isAtlas && presentation && Object.keys(presentation.metadata.sections).length > 0 ? (
        <div className="atlas-calmaria-hide">
          <AtlasAiResponseAudit sections={presentation.metadata.sections} />
        </div>
      ) : null}

      {isAtlas && trace?.tool_events && trace.tool_events.length > 0 ? (
        <div className="atlas-calmaria-hide">
          <AtlasAiToolReceipts events={trace.tool_events} />
        </div>
      ) : null}

      {isAtlas && trace?.quality_evaluation ? (
        <div className="atlas-calmaria-hide">
          <AtlasAiQualityBadge evaluation={trace.quality_evaluation} />
        </div>
      ) : null}

      {isAtlas && trace ? (
        <div className="atlas-calmaria-hide">
          <AtlasAiOpenBrainBadge trace={trace} />
        </div>
      ) : null}

      {isAtlas && trace ? (
        <AtlasAiReasoningDrawer
          decision={trace.atlas_decision ?? null}
          toolEvents={trace.tool_events ?? null}
          metricSummary={trace.metric_summary ?? null}
          qualityEvaluation={trace.quality_evaluation ?? null}
          contextRefs={(trace.metadata?.context_refs as ReadonlyArray<unknown>) ?? null}
        />
      ) : null}

      {isAtlas && message.content ? (
        <AtlasAiMessageActions content={message.content} />
      ) : null}
    </article>
  )
}

function OptimisticUserBubble({ message }: { message: PendingUserMessage }) {
  return (
    <article
      className="atlas-ai-message tone-operator atlas-ai-message-optimistic"
      aria-live="polite"
    >
      <header className="atlas-ai-message-header">
        <span className="atlas-ai-message-role">você</span>
        <span className="atlas-ai-message-meta">enviando agora…</span>
      </header>
      <div className="atlas-ai-message-body atlas-ai-message-optimistic-body">
        {message.text ? <p>{message.text}</p> : null}
        {message.attachmentCount > 0 ? (
          <p className="atlas-ai-message-optimistic-attchip">
            {message.attachmentCount} anexo{message.attachmentCount === 1 ? '' : 's'} acompanhando
          </p>
        ) : null}
        {!message.text && message.attachmentCount === 0 ? (
          <p className="atlas-ai-message-optimistic-attchip">(somente anexos)</p>
        ) : null}
      </div>
    </article>
  )
}

/**
 * Streaming bubble · EDITORIAL QUIET.
 *
 * Durante streaming a IA mostra UMA coisa: pensando há quanto tempo.
 * Plus, opcionalmente, atividade CONCRETA (Lendo arquivo X, Executando Y).
 * NADA de chips/badges/decision/openbrain durante streaming — eles aparecem
 * APÓS a resposta final, sob a mensagem do Atlas.
 *
 * Sem box decorativo. Sem header pesado. Espaço pra respirar.
 */
function StreamingBubble({
  trace,
  startedAtMs,
  sending,
  streamingText,
  onCancel,
}: {
  trace: AiTrace | null
  startedAtMs: number
  sending: boolean
  streamingText?: string
  onCancel?: () => void
}) {
  const status = trace?.status ?? null
  const forcedLabel = !trace ? 'enviando para o Atlas' : null
  const hasLiveTool =
    !!(trace?.tool_events && trace.tool_events.length > 0) ||
    trace?.job?.status === 'awaiting_user_choice' ||
    !!(trace?.jobs && trace.jobs.some((j) => j.status === 'awaiting_user_choice'))
  const hasStreamingText = !!streamingText && streamingText.length > 0

  return (
    <article
      className="atlas-ai-message tone-atlas atlas-ai-message-streaming-quiet"
      aria-live="polite"
      aria-busy={sending || status === 'running' || status === 'processing' || status === 'queued'}
    >
      <div className="atlas-ai-streaming-row-top">
        <AtlasAiThinkingState
          startedAtMs={startedAtMs}
          provider={trace?.provider}
          forcedLabel={forcedLabel}
        />
        {onCancel ? (
          <button
            type="button"
            className="atlas-ai-streaming-cancel"
            onClick={onCancel}
            title="Interromper · esc"
            aria-label="Interromper resposta"
          >
            <svg viewBox="0 0 12 12" width="9" height="9" fill="currentColor" stroke="none" aria-hidden="true">
              <rect x="2" y="2" width="8" height="8" rx="1" />
            </svg>
            <span>interromper</span>
          </button>
        ) : null}
      </div>

      {/* Streaming text aparece token-by-token via SSE — Claude.ai/Cursor school. */}
      {hasStreamingText ? (
        <div className="atlas-ai-message-body atlas-ai-streaming-text" aria-live="polite">
          <AtlasAiMessageBody content={projectPresentation(streamingText ?? '').body || (streamingText ?? '')} />
          <span className="atlas-ai-streaming-caret" aria-hidden="true" />
        </div>
      ) : null}

      {hasLiveTool ? (
        <AtlasAiLiveActivity
          toolEvents={trace?.tool_events ?? null}
          streamEvents={trace?.stream_events ?? null}
          job={trace?.job ?? null}
          jobs={trace?.jobs ?? null}
        />
      ) : null}
    </article>
  )
}

export function AtlasAiConversation({
  detail,
  loading,
  error,
  pendingTrace,
  pendingUserMessage,
  streamingText,
  sending,
  onArchive,
  onPromote,
  onCancel,
  onLoadOlder,
  hasOlderMessages = false,
  olderMessagesLoading = false,
  olderMessagesError = null,
  atlasDevPlan,
}: AtlasAiConversationProps) {
  // Auto-scroll para o fim quando mensagens chegam ou pending vira ativo.
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const messagesScrollRef = useRef<HTMLDivElement | null>(null)
  const olderLoadAnchorRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null)
  const latestMessageKey = useMemo(() => {
    const latest = (detail?.messages ?? []).reduce<AiThreadMessage | null>((current, message) => {
      if (!current) return message
      return message.position > current.position ? message : current
    }, null)
    return latest ? `${latest.id}:${latest.position}` : null
  }, [detail?.messages])
  useEffect(() => {
    const node = messagesEndRef.current
    if (!node) return
    node.scrollIntoView({ behavior: 'auto', block: 'end' })
  }, [latestMessageKey, pendingUserMessage?.startedAt, pendingTrace?.status, sending])

  useEffect(() => {
    if (olderMessagesLoading) return
    const anchor = olderLoadAnchorRef.current
    const node = messagesScrollRef.current
    if (!anchor || !node) return
    const delta = node.scrollHeight - anchor.scrollHeight
    node.scrollTop = anchor.scrollTop + delta
    olderLoadAnchorRef.current = null
  }, [detail?.messages?.length, olderMessagesLoading])

  const loadOlderWithAnchor = () => {
    const node = messagesScrollRef.current
    if (node) {
      olderLoadAnchorRef.current = {
        scrollHeight: node.scrollHeight,
        scrollTop: node.scrollTop,
      }
    }
    onLoadOlder?.()
  }

  const handleMessagesScroll = () => {
    const node = messagesScrollRef.current
    if (!node || !onLoadOlder || !hasOlderMessages || olderMessagesLoading) return
    if (node.scrollTop <= 80) loadOlderWithAnchor()
  }

  // Estamos no meio de criar uma thread nova? (sending true, sem detail ainda)
  const isCreatingThread = pendingUserMessage !== null && detail === null
  const [fallbackStartedAtMs] = useState(() => Date.now())

  // Quando o sending começou — anchor para ThinkingState
  const streamingStartedAtMs = useMemo(
    () => pendingUserMessage?.startedAt ?? fallbackStartedAtMs,
    [pendingUserMessage?.startedAt, fallbackStartedAtMs],
  )

  if (loading && detail === null && !isCreatingThread) {
    return (
      <section className="atlas-ai-conversation" role="status">
        <p className="atlas-ai-empty-line">carregando conversa…</p>
      </section>
    )
  }

  if (error && !isCreatingThread) {
    return (
      <section className="atlas-ai-conversation" role="alert">
        <AtlasAiErrorBanner message={error} />
      </section>
    )
  }

  // Render padrão: temos detail OU temos pendingUserMessage (thread nova
  // em criação — mostra optimistic bubble + indicator imediatamente).
  if (!detail && !pendingUserMessage) {
    return (
      <section className="atlas-ai-conversation">
        <p className="atlas-ai-empty-line">nenhuma conversa aberta</p>
      </section>
    )
  }

  const messages = detail
    ? (detail.messages ?? []).slice().sort((a, b) => a.position - b.position)
    : []
  const meta = detail?.metadata ?? {}
  const mode = normalizeConversationMode(meta.atlas_focus)
  // Cobre `running`, `processing` (status real do backend) e `queued`.
  // Antes só checava 'running'/'queued' — quando backend passa pra 'processing'
  // (90% do tempo da execução) o indicator desaparecia silenciosamente.
  const isStreaming =
    !!pendingTrace &&
    (pendingTrace.status === 'queued' ||
      pendingTrace.status === 'running' ||
      pendingTrace.status === 'processing')
  const showStreamingBubble = sending || isStreaming
  const lastTrace = detail?.last_trace ?? null

  // Optimistic aparece SÓ enquanto sending=true (entre Enter e API retornar
   // o pendingTrace). Quando pendingTrace existe, o backend já gravou a
   // mensagem real e o polling vai trazer ela rápido — mostrar optimistic
   // junto com a real cria duplicação visual de "VOCÊ".
   // Caso edge: se já há mensagem real do usuário >= startedAt, também esconde.
  const showOptimistic =
    pendingUserMessage !== null &&
    pendingTrace === null &&
    !messages.some(
      (m) =>
        (m.role === 'user' || m.role === 'operator') &&
        m.created_at &&
        new Date(m.created_at).getTime() >= pendingUserMessage.startedAt - 2000,
    )
  const messagesLoading = loading && messages.length === 0 && !showOptimistic && !showStreamingBubble

  return (
    <section className="atlas-ai-conversation" aria-live="polite">
      <header className="atlas-ai-conversation-header">
        <div>
          <h2>{detail?.title?.trim() || (isCreatingThread ? 'Nova conversa' : '(sem título)')}</h2>
          <p className="atlas-ai-conversation-meta">
            <span className="atlas-ai-conversation-meta-mode">{modeLabel(mode)}</span>
            {detail?.workspace ? (
              <span className="atlas-ai-conversation-meta-sep" aria-hidden="true"> · </span>
            ) : null}
            {detail?.workspace ? (
              <span className="atlas-ai-conversation-meta-workspace" title={detail.workspace}>
                projeto {projectName(detail.workspace)}
              </span>
            ) : null}
            {detail?.last_provider ? (
              <span className="atlas-ai-conversation-meta-sep" aria-hidden="true"> · </span>
            ) : null}
            {detail?.last_provider ? (
              <span className="atlas-ai-conversation-meta-provider">{modelLabel(detail.last_provider)}</span>
            ) : null}
            <span className="atlas-ai-conversation-meta-sep" aria-hidden="true"> · </span>
            <span className="atlas-ai-conversation-meta-count">
              {messageCountLabel(detail?.message_count ?? (showOptimistic ? 1 : 0))}
            </span>
          </p>
        </div>
        <div className="atlas-ai-conversation-actions">
          {onPromote && detail ? (
            <button
              type="button"
              className="atlas-ai-link"
              onClick={onPromote}
              title="Avaliar promoção para Forge/Obra"
            >
              promover <span className="atlas-ai-link-arrow" aria-hidden="true">→</span>
            </button>
          ) : null}
          {detail ? (
            <button
              type="button"
              className="atlas-ai-link atlas-ai-danger-link"
              onClick={onArchive}
              title="Arquivar conversa"
            >
              arquivar
            </button>
          ) : null}
        </div>
      </header>

      <div className="atlas-ai-messages" ref={messagesScrollRef} onScroll={handleMessagesScroll}>
        {hasOlderMessages || olderMessagesLoading || olderMessagesError ? (
          <div className="atlas-ai-history-loader">
            {olderMessagesError ? (
              <button type="button" onClick={loadOlderWithAnchor}>
                carregar histórico
              </button>
            ) : olderMessagesLoading ? (
              <span>carregando histórico…</span>
            ) : (
              <button type="button" onClick={loadOlderWithAnchor}>
                ver mensagens anteriores
              </button>
            )}
          </div>
        ) : null}

        {messagesLoading ? (
          <p className="atlas-ai-empty-line">carregando conversa…</p>
        ) : null}

        {messages.length === 0 && !messagesLoading && !showOptimistic && !showStreamingBubble ? (
          <p className="atlas-ai-empty-line">primeira pergunta — escreva abaixo</p>
        ) : null}

        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            trace={findTraceForMessage(m, lastTrace)}
          />
        ))}

        {showOptimistic && pendingUserMessage ? (
          <OptimisticUserBubble message={pendingUserMessage} />
        ) : null}

        {showStreamingBubble ? (
          <StreamingBubble
            trace={pendingTrace}
            startedAtMs={streamingStartedAtMs}
            sending={sending}
            streamingText={streamingText}
            onCancel={onCancel}
          />
        ) : null}

        {atlasDevPlan ? <AtlasAiPlanIndicators plan={atlasDevPlan} /> : null}

        <div ref={messagesEndRef} aria-hidden="true" />
      </div>
    </section>
  )
}
