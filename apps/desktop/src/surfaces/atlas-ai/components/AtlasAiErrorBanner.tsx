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

export function AtlasAiErrorBanner({
  message,
  onRetry,
  retrying = false,
  retryLabel = 'tentar de novo',
}: AtlasAiErrorBannerProps) {
  return (
    <div className="atlas-ai-error-banner" role="alert">
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
      <span className="atlas-ai-error-text">{message}</span>
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
