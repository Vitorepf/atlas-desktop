/**
 * Atlas AI · ErrorBanner premium.
 *
 * Banner inline com ícone + texto + retry button. Substitui o
 * `<p class="atlas-ai-error-line">` apático por um bloco operacional
 * (canon Apple Pro: erro visível mas não dramático).
 */

interface AtlasAiErrorBannerProps {
  message: string
  onRetry?: () => void | Promise<void>
  retrying?: boolean
  retryLabel?: string
}

function explainAtlasAiError(message: string): { summary: string; detail: string | null } {
  const compact = message.replace(/\s+/g, ' ').trim()
  const lower = compact.toLowerCase()

  if (
    lower.includes('offline') ||
    lower.includes('serviço local indisponível') ||
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('load failed')
  ) {
    return {
      summary: 'Serviço local indisponível. Suas conversas e Spaces voltam quando o Atlas responder.',
      detail: compact,
    }
  }

  if (
    lower.includes('http 500') ||
    lower.includes('respondeu 500') ||
    lower.includes('internal server error')
  ) {
    return {
      summary: 'Serviço local instável. O AWIS preservou o estado da tela; tente novamente em instantes.',
      detail: compact,
    }
  }

  if (lower.includes('http 404') || lower.includes('rota /ai/threads')) {
    return {
      summary: 'Histórico do Atlas AI indisponível neste serviço local.',
      detail: compact,
    }
  }

  return { summary: compact, detail: null }
}

export function AtlasAiErrorBanner({
  message,
  onRetry,
  retrying = false,
  retryLabel = 'tentar de novo',
}: AtlasAiErrorBannerProps) {
  const explained = explainAtlasAiError(message)

  return (
    <div
      className="atlas-ai-error-banner"
      role="alert"
      title={explained.detail ? explained.summary : undefined}
    >
      <svg
        className="atlas-ai-error-icon"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="8" cy="8" r="6.5" />
        <line x1="8" y1="5" x2="8" y2="9" />
        <circle cx="8" cy="11.5" r="0.6" fill="currentColor" />
      </svg>
      <span className="atlas-ai-error-text">{explained.summary}</span>
      {onRetry ? (
        <button
          type="button"
          className="atlas-ai-error-retry"
          onClick={() => void onRetry()}
          disabled={retrying}
        >
          {retrying ? 'tentando…' : retryLabel}
        </button>
      ) : null}
    </div>
  )
}
