/**
 * Atlas AI · streaming indicator.
 *
 * Três pontos animados em fase quando o trace está em `queued` ou `running`.
 * Acompanhado por label honesto do estado atual + provider.
 */
import type { AiTrace } from '../types'

interface AtlasAiStreamingIndicatorProps {
  trace: AiTrace
}

export function AtlasAiStreamingIndicator({ trace }: AtlasAiStreamingIndicatorProps) {
  const isRunning = trace.status === 'queued' || trace.status === 'running'
  return (
    <article
      className={`atlas-ai-message tone-atlas atlas-ai-message-streaming${isRunning ? ' is-running' : ''}`}
      aria-live="polite"
    >
      <header className="atlas-ai-message-header">
        <span className="atlas-ai-message-role">Atlas AI</span>
        <span className="atlas-ai-message-meta">
          trace · {trace.status}
          {trace.provider ? ` · ${trace.provider}` : ''}
        </span>
      </header>
      <div className="atlas-ai-streaming-row">
        <span className="atlas-ai-streaming-dots" aria-hidden="true">
          <span /><span /><span />
        </span>
        <span className="atlas-ai-streaming-label">
          {trace.status === 'queued' ? 'na fila …' : 'processando resposta — Atlas pensa antes de falar'}
        </span>
      </div>
    </article>
  )
}
