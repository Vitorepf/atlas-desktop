/**
 * Atlas AI · ThinkingState premium (4 phases by elapsed).
 *
 * Mirror do mobile (ThinkingState.tsx · atlas-app). Vozes em 4 fases:
 *   0–3s   → "na fila"
 *   3–15s  → "{provider} pensando"
 *   15–45s → "{provider} pensando há {N}s"
 *   45s+   → "{provider} ainda pensando — pode demorar"
 *
 * Diamante ✦ pulsa 1.0 ↔ 0.45 em 900ms continuamente. Fase muda 1x/segundo.
 *
 * Usado dentro do bubble streaming OU como standalone footer no sidepanel.
 */
import { useEffect, useState } from 'react'
import { IconAtlasDiamond } from '../icons/AtlasAiIcons'

interface AtlasAiThinkingStateProps {
  startedAtMs: number
  provider?: string | null
  /** Override do label final (ex.: "executando" / "na fila"). */
  forcedLabel?: string | null
}

function thinkingPhrase(elapsed: number, provider: string): string {
  if (elapsed < 3) return 'na fila'
  if (elapsed < 15) return `${provider} pensando`
  if (elapsed < 45) return `${provider} pensando há ${elapsed}s`
  return `${provider} ainda pensando — pode demorar`
}

function providerWord(raw: string | null | undefined): string {
  if (!raw) return 'atlas'
  const lc = raw.toLowerCase()
  if (lc.includes('claude_codex') || lc.includes('council') || lc.includes('conselho')) return 'conselho'
  if (lc.includes('claude')) return 'claude'
  if (lc.includes('codex') || lc.includes('gpt')) return 'codex'
  if (lc.includes('gemini')) return 'gemini'
  return 'atlas'
}

export function AtlasAiThinkingState({ startedAtMs, provider, forcedLabel }: AtlasAiThinkingStateProps) {
  const [elapsed, setElapsed] = useState<number>(() =>
    Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000)),
  )

  useEffect(() => {
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000)))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [startedAtMs])

  const subject = providerWord(provider)
  const label = forcedLabel ?? thinkingPhrase(elapsed, subject)

  return (
    <div className="atlas-ai-thinking-state" role="status" aria-live="polite">
      <span className="atlas-ai-thinking-diamond" aria-hidden="true">
        <IconAtlasDiamond size={16} />
      </span>
      <span className="atlas-ai-thinking-label">{label}</span>
    </div>
  )
}
