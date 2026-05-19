/**
 * Atlas AI · message reactions row (Codex-grade).
 *
 * Linha discreta abaixo de cada mensagem do Atlas com 4 ações:
 *   - copiar conteúdo
 *   - 👍 / 👎 feedback
 *   - regenerar resposta (re-run trace)
 *
 * Reações são locais por enquanto (estado da view); botão regenerate
 * dispara callback pra surface. Visualmente igual Codex/Claude.ai mas
 * com paleta Atlas (slate + accent gold no hover).
 */
import { useCallback, useState } from 'react'

interface AtlasAiMessageActionsProps {
  content: string
  onRegenerate?: () => void
}

type Reaction = 'up' | 'down' | null

export function AtlasAiMessageActions({ content, onRegenerate }: AtlasAiMessageActionsProps) {
  const [copied, setCopied] = useState(false)
  const [reaction, setReaction] = useState<Reaction>(null)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      /* clipboard sandbox safe ignore */
    }
  }, [content])

  return (
    <div className="atlas-ai-msg-actions" role="toolbar" aria-label="Ações da mensagem">
      <button
        type="button"
        className={`atlas-ai-msg-actbtn${copied ? ' is-active' : ''}`}
        onClick={handleCopy}
        title="Copiar resposta"
        aria-label="Copiar resposta"
      >
        {copied ? (
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="3 8 7 12 13 4" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="4" y="4" width="9" height="10" rx="1.5" />
            <path d="M10 4V3a1.5 1.5 0 0 0-1.5-1.5h-4A1.5 1.5 0 0 0 3 3v9.5" />
          </svg>
        )}
      </button>

      <button
        type="button"
        className={`atlas-ai-msg-actbtn${reaction === 'up' ? ' is-active' : ''}`}
        onClick={() => setReaction((r) => (r === 'up' ? null : 'up'))}
        title="Resposta útil"
        aria-label="Resposta útil"
      >
        <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5.5 14V8M5.5 8 8.5 2c1 0 1.6.7 1.4 1.7L9.2 6.5h3.6c1 0 1.6.9 1.3 1.9l-1.5 4.6c-.2.7-.9 1-1.6 1H5.5Z" />
          <line x1="2" y1="8" x2="5.5" y2="8" />
          <line x1="2" y1="14" x2="5.5" y2="14" />
        </svg>
      </button>

      <button
        type="button"
        className={`atlas-ai-msg-actbtn${reaction === 'down' ? ' is-active' : ''}`}
        onClick={() => setReaction((r) => (r === 'down' ? null : 'down'))}
        title="Resposta ruim"
        aria-label="Resposta ruim"
      >
        <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10.5 2v6M10.5 8 7.5 14c-1 0-1.6-.7-1.4-1.7l.7-2.8H3.2c-1 0-1.6-.9-1.3-1.9l1.5-4.6c.2-.7.9-1 1.6-1H10.5Z" />
          <line x1="14" y1="8" x2="10.5" y2="8" />
          <line x1="14" y1="2" x2="10.5" y2="2" />
        </svg>
      </button>

      {onRegenerate ? (
        <button
          type="button"
          className="atlas-ai-msg-actbtn"
          onClick={onRegenerate}
          title="Refazer resposta"
          aria-label="Refazer resposta"
        >
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M13 8a5 5 0 1 1-1.46-3.54" />
            <polyline points="13 2 13 5 10 5" />
          </svg>
        </button>
      ) : null}
    </div>
  )
}
