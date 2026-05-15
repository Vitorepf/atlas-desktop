import type { AiThreadDetail, AiThreadMessage, AiTrace } from '../types'

interface AtlasAiConversationProps {
  detail: AiThreadDetail | null
  loading: boolean
  error: string | null
  pendingTrace: AiTrace | null
  onArchive: () => void
  onPromote?: () => void
}

function formatTimestamp(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
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
          {formatTimestamp(message.created_at)}
        </span>
      </header>
      <pre className="atlas-ai-message-body">{message.content ?? '(sem conteúdo)'}</pre>
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
        <p className="atlas-ai-error-line">{error}</p>
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
        {messages.length === 0 ? (
          <p className="atlas-ai-empty-line">
            Sem mensagens ainda. Envie a primeira pergunta no composer abaixo.
          </p>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}

        {pendingTrace && (pendingTrace.status === 'queued' || pendingTrace.status === 'running') ? (
          <article className="atlas-ai-message tone-atlas atlas-ai-message-pending">
            <header className="atlas-ai-message-header">
              <span className="atlas-ai-message-role">Atlas AI</span>
              <span className="atlas-ai-message-meta">
                trace · {pendingTrace.status}
                {pendingTrace.provider ? ` · ${pendingTrace.provider}` : ''}
              </span>
            </header>
            <p className="atlas-ai-message-body atlas-ai-pending-line">
              processando resposta… (Atlas AI não promove nada para Obra automaticamente)
            </p>
          </article>
        ) : null}
      </div>
    </section>
  )
}
