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
import { useEffect, useMemo, useRef } from 'react'
import { AtlasAiConfidenceBand } from './AtlasAiConfidenceBand'
import { AtlasAiDecisionBadge } from './AtlasAiDecisionBadge'
import { AtlasAiErrorBanner } from './AtlasAiErrorBanner'
import { AtlasAiLiveActivity } from './AtlasAiLiveActivity'
import { AtlasAiMessageActions } from './AtlasAiMessageActions'
import { AtlasAiMessageBody } from './AtlasAiMessageBody'
import { AtlasAiOpenBrainBadge } from './AtlasAiOpenBrainBadge'
import { AtlasAiQualityBadge } from './AtlasAiQualityBadge'
import { AtlasAiReasoningDrawer } from './AtlasAiReasoningDrawer'
import { AtlasAiThinkingState } from './AtlasAiThinkingState'
import { AtlasAiToolReceipts } from './AtlasAiToolReceipts'
import { formatRelativeLong } from '../timeFormat'
import type { AiThreadDetail, AiThreadMessage, AiTrace } from '../types'

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
  sending: boolean
  onArchive: () => void
  onPromote?: () => void
}

function roleLabel(role: string): string {
  if (role === 'user' || role === 'operator') return 'você'
  if (role === 'assistant' || role === 'atlas') return 'Atlas AI'
  if (role === 'system') return 'sistema'
  return role
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
  return (
    <article className={`atlas-ai-message tone-${tone}`}>
      <header className="atlas-ai-message-header">
        <span className="atlas-ai-message-role">{roleLabel(message.role)}</span>
        <span className="atlas-ai-message-meta">
          {message.provider ? `${message.provider} · ` : ''}
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

      <AtlasAiMessageBody content={message.content ?? '(sem conteúdo)'} />

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
}: {
  trace: AiTrace | null
  startedAtMs: number
  sending: boolean
}) {
  const status = trace?.status ?? null
  const forcedLabel = !trace ? 'enviando para o Atlas' : null
  const hasLiveTool =
    !!(trace?.tool_events && trace.tool_events.length > 0) ||
    trace?.job?.status === 'awaiting_user_choice' ||
    !!(trace?.jobs && trace.jobs.some((j) => j.status === 'awaiting_user_choice'))

  return (
    <article
      className="atlas-ai-message tone-atlas atlas-ai-message-streaming-quiet"
      aria-live="polite"
      aria-busy={sending || status === 'running' || status === 'processing' || status === 'queued'}
    >
      <AtlasAiThinkingState
        startedAtMs={startedAtMs}
        provider={trace?.provider}
        forcedLabel={forcedLabel}
      />

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
  sending,
  onArchive,
  onPromote,
}: AtlasAiConversationProps) {
  // Auto-scroll para o fim quando mensagens chegam ou pending vira ativo.
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const messageCount = detail?.messages?.length ?? 0
  useEffect(() => {
    const node = messagesEndRef.current
    if (!node) return
    node.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messageCount, pendingUserMessage?.startedAt, pendingTrace?.status, sending])

  // Estamos no meio de criar uma thread nova? (sending true, sem detail ainda)
  const isCreatingThread = pendingUserMessage !== null && detail === null

  // Quando o sending começou — anchor para ThinkingState
  const streamingStartedAtMs = useMemo(
    () => pendingUserMessage?.startedAt ?? Date.now(),
    [pendingUserMessage?.startedAt],
  )

  if (loading && detail === null && !isCreatingThread) {
    return (
      <section className="atlas-ai-conversation" role="status">
        <p className="atlas-ai-empty-line">Carregando thread…</p>
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
        <p className="atlas-ai-empty-line">Sem thread carregada.</p>
      </section>
    )
  }

  const messages = detail
    ? (detail.messages ?? []).slice().sort((a, b) => a.position - b.position)
    : []
  const meta = detail?.metadata ?? {}
  const mode = typeof meta.atlas_focus === 'string' ? meta.atlas_focus : 'general'
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

  // Optimistic só aparece se ainda não vimos uma mensagem real do usuário
  // depois do startedAt (com 2s de tolerância pra clock skew).
  const showOptimistic =
    pendingUserMessage !== null &&
    !messages.some(
      (m) =>
        (m.role === 'user' || m.role === 'operator') &&
        m.created_at &&
        new Date(m.created_at).getTime() >= pendingUserMessage.startedAt - 2000,
    )

  return (
    <section className="atlas-ai-conversation" aria-live="polite">
      <header className="atlas-ai-conversation-header">
        <div>
          <h2>{detail?.title?.trim() || (isCreatingThread ? 'Nova conversa' : '(sem título)')}</h2>
          <p className="atlas-ai-conversation-meta">
            <span>{mode}</span>
            {detail?.workspace ? <span> · {detail.workspace}</span> : null}
            {detail?.last_provider ? <span> · {detail.last_provider}</span> : null}
            <span> · {detail?.message_count ?? (showOptimistic ? 1 : 0)} msg</span>
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
              promover →
            </button>
          ) : null}
          {detail ? (
            <button
              type="button"
              className="atlas-ai-link atlas-ai-danger-link"
              onClick={onArchive}
              title="Arquivar thread"
            >
              arquivar
            </button>
          ) : null}
        </div>
      </header>

      <div className="atlas-ai-messages">
        {messages.length === 0 && !showOptimistic && !showStreamingBubble ? (
          <p className="atlas-ai-empty-line">
            Sem mensagens ainda. Envie a primeira pergunta no composer abaixo.
          </p>
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
          />
        ) : null}

        <div ref={messagesEndRef} aria-hidden="true" />
      </div>
    </section>
  )
}
