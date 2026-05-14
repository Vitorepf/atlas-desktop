interface CartographyOverlayProps {
  loading: boolean
  offline: boolean
  errors: string[]
}

export function CartographyOverlay({ loading, offline, errors }: CartographyOverlayProps) {
  return (
    <div className="cart-overlay" role="status" aria-live="polite" aria-atomic="true">
      <div className="cart-overlay-card">
        {loading ? (
          <p style={{ fontSize: 16, fontStyle: 'italic', color: 'var(--ink2)' }}>
            Carregando filesystem canônico (repo + AtlasVault)…
          </p>
        ) : offline ? (
          <>
            <p style={{ fontSize: 17, fontStyle: 'italic', color: 'var(--ink2)' }}>
              Atlas Server offline.
            </p>
            <p
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                letterSpacing: 0.3,
                color: 'var(--ink3)',
                marginTop: 12,
              }}
            >
              php artisan serve --port=8001
            </p>
            {errors.length > 0 ? (
              <p
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 9.5,
                  color: 'var(--rec-red)',
                  marginTop: 14,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {errors[0]}
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  )
}
