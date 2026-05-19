/**
 * Atlas AI · Open Brain Badge (editorial quiet — v2).
 *
 * UMA linha italic serif, sem box, sem mono. Drop refs/hash/avisos para
 * o ReasoningDrawer — aqui fica só o status:
 *
 *   open brain · usado          (tone-good)
 *   open brain · parcial        (tone-partial)
 *   open brain · bloqueado      (tone-bad — bronze italic, NÃO vermelho)
 *
 * Suprimido quando status === 'skipped' ou nenhum sinal.
 */
import type { AiTrace } from '../types'

interface AtlasAiOpenBrainBadgeProps {
  trace: AiTrace | null
}

function extractStatus(trace: AiTrace | null): string | null {
  if (!trace) return null
  const metaInjection = trace.metadata?.open_brain_injection
  if (!metaInjection || typeof metaInjection !== 'object') return null
  const status = (metaInjection as Record<string, unknown>).status
  return typeof status === 'string' ? status : null
}

function statusLabel(status: string): string {
  if (status === 'injected') return 'usado'
  if (status === 'degraded') return 'parcial'
  if (status === 'failed_open') return 'falhou aberto'
  if (status === 'failed_closed') return 'bloqueado'
  if (status === 'skipped') return 'ignorado'
  return status
}

function tone(status: string): 'good' | 'partial' | 'bad' | 'mute' {
  if (status === 'injected') return 'good'
  if (status === 'degraded') return 'partial'
  if (status === 'failed_open' || status === 'failed_closed') return 'bad'
  return 'mute'
}

export function AtlasAiOpenBrainBadge({ trace }: AtlasAiOpenBrainBadgeProps) {
  const status = extractStatus(trace)
  if (!status || status === 'skipped') return null
  return (
    <p className={`atlas-ai-openbrain-line tone-${tone(status)}`}>
      open brain · {statusLabel(status)}
    </p>
  )
}
