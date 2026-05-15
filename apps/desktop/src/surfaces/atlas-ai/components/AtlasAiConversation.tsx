/**
 * Atlas AI · Conversation panel premium.
 *
 * Mensagens renderizadas com markdown leve + syntax highlighting (Shiki).
 * Timestamps relativos pt-BR. Streaming indicator animado quando trace
 * está em queued/running. ErrorBanner com retry quando algo falha.
 */
import { AtlasAiErrorBanner } from './AtlasAiErrorBanner'
import { AtlasAiMessageBody } from './AtlasAiMessageBody'
import { AtlasAiStreamingIndicator } from './AtlasAiStreamingIndicator'
import { formatRelativeLong } from '../timeFormat'
import type { AiThreadDetail, AiThreadMessage, AiTrace } from '../types'

interface AtlasAiConversationProps {
  detail: AiThreadDetail | null
  loading: boolean
  error: string | null
  pendingTrace: AiTrace | null
  onArchive: () => void
  onPromote?: () => void
}

function roleLabel(role: string): string {
  if (role === 'user' || role === 'operator') return 'você'
  if (role === 'assistant' || role === 'atlas') return 'Atlas AI'
  if (role === 'system') return 'sistema'
  return role
}

function MessageBubble({ message }: { message: AiThreadMessage }) {
  const tone = message.role === 'user' || message.role === 'operator' ? 'operator' : 'atlas'
  return (
    <article className={`atlas-ai-message tone-${tone}`}>
      <header className="atlas-ai-message-header">
        <span className="atlas-ai-message-role">{roleLabel(message.role)}</span>
        <span className="atlas-ai-message-meta">
          {message.provider ? `${message.provider} · ` : ''}
          {formatRelativeLong(message.created_at) || '—'}
        </span>
      </header>
      <AtlasAiMessageBody content={message.content ?? '(sem conteúdo)'} />
    </article>
  )
}

export function AtlasAiConversation({
  detail,
  loading,
  error,
  pendingTrace,
  onArchive,
  onPromote,
}: AtlasAiConversationProps) {
  if (loading && detail === null) {
    return (
      <section className="atlas-ai-conversation" role="status">
        <p className="atlas-ai-empty-line">Carregando thread…</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="atlas-ai-conversation" role="alert">
        <AtlasAiErrorBanner message={error} />
      </section>
    )
  }

  if (!detail) {
    return (
      <section className="atlas-ai-conversation">
        <p className="atlas-ai-empty-line">Sem thread carregada.</p>
      </section>
    )
  }

  const messages = (detail.messages ?? []).slice().sort((a, b) => a.position - b.position)
  const meta = detail.metadata ?? {}
  const mode = typeof meta.atlas_focus === 'string' ? meta.atlas_focus : 'general'
  const isStreaming = !!pendingTrace && (pendingTrace.status === 'queued' || pendingTrace.status === 'running')

  return (
    <section className="atlas-ai-conversation" aria-live="polite">
      <header className="atlas-ai-conversation-header">
        <div>
          <h2>{detail.title?.trim() || '(sem título)'}</h2>
          <p className="atlas-ai-conversation-meta">
            <span>{mode}</span>
            {detail.workspace ? <span> · {detail.workspace}</span> : null}
            {detail.last_provider ? <span> · {detail.last_provider}</span> : null}
            <span> · {detail.message_count} msg</span>
          </p>
        </div>
        <div className="atlas-ai-conversation-actions">
          {onPromote ? (
            <button
              type="button"
              className="atlas-ai-link"
              onClick={onPromote}
              title="Avaliar promoção para Forge/Obra"
            >
              promover →
            </button>
          ) : null}
          <button
            type="button"
            className="atlas-ai-link atlas-ai-danger-link"
            onClick={onArchive}
            title="Arquivar thread"
          >
            arquivar
          </button>
        </div>
      </header>

      <div className="atlas-ai-messages">
        {messages.length === 0 && !isStreaming ? (
          <p className="atlas-ai-empty-line">
            Sem mensagens ainda. Envie a primeira pergunta no composer abaixo.
          </p>
        ) : null}

        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}

        {isStreaming && pendingTrace ? <AtlasAiStreamingIndicator trace={pendingTrace} /> : null}
      </div>
    </section>
  )
}
