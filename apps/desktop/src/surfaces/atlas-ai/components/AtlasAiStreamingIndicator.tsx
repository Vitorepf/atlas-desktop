/**
 * Atlas AI · streaming indicator.
 *
 * Três pontos animados em fase para qualquer estado "em curso":
 *   1. `sending` (sem trace ainda) — entre Enter e API responder
 *   2. trace `queued` — aguardando worker
 *   3. trace `running` — provider processando
 *
 * Cada estado tem label honesto pra o operador entender o que está rolando
 * (TDAH-friendly: nunca silêncio, sempre uma frase que descreve o momento).
 */
import type { AiTrace } from '../types'

interface AtlasAiStreamingIndicatorProps {
  trace: AiTrace | null
  sending: boolean
}

export function AtlasAiStreamingIndicator({ trace, sending }: AtlasAiStreamingIndicatorProps) {
  const status = trace?.status ?? null
  const isQueued = status === 'queued'
  // Backend usa `processing`; `running` mantido por compat com providers
  // que emitem outros nomes. Sem isso o indicator some no meio da execução.
  const isRunning = status === 'running' || status === 'processing'
  const isActive = sending || isQueued || isRunning

  const label = !trace
    ? 'enviando sua mensagem para o Atlas…'
    : isQueued
      ? 'na fila — Atlas vai começar em instantes'
      : isRunning
        ? 'Atlas está pensando — montando contexto e resposta'
        : `trace · ${status ?? '—'}`

  const meta = !trace
    ? 'preparando'
    : `trace · ${status ?? '—'}${trace.provider ? ` · ${trace.provider}` : ''}`

  return (
    <article
      className={`atlas-ai-message tone-atlas atlas-ai-message-streaming${isActive ? ' is-running' : ''}`}
      aria-live="polite"
      aria-busy={isActive}
    >
      <header className="atlas-ai-message-header">
        <span className="atlas-ai-message-role">Atlas AI</span>
        <span className="atlas-ai-message-meta">{meta}</span>
      </header>
      <div className="atlas-ai-streaming-row">
        <span className="atlas-ai-streaming-dots" aria-hidden="true">
          <span /><span /><span />
        </span>
        <span className="atlas-ai-streaming-label">{label}</span>
      </div>
    </article>
  )
}
