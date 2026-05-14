/**
 * Premium safety strip · 5 sinais críticos sempre visíveis, em tom semântico
 * compacto. Provider externo, tokens, completion, review gate, external rivals.
 */
export function SafetyStrip({
  externalProviderCall,
  providerTokensSpent,
  completionClaimPromoted,
  reviewGatePreserved,
  externalRivalsStatus,
}: {
  externalProviderCall: boolean
  providerTokensSpent: number | string | boolean
  completionClaimPromoted: boolean
  reviewGatePreserved: boolean
  externalRivalsStatus: string
}) {
  type Tone = 'success' | 'danger' | 'info' | 'neutral'
  const items: Array<{ label: string; value: string; tone: Tone }> = [
    {
      label: 'Provider externo',
      value: externalProviderCall ? 'sim' : 'não',
      tone: externalProviderCall ? 'danger' : 'success',
    },
    {
      label: 'Tokens',
      value: String(providerTokensSpent),
      tone: providerTokensSpent && providerTokensSpent !== 0 && providerTokensSpent !== '0' ? 'info' : 'success',
    },
    {
      label: 'Completion',
      value: completionClaimPromoted ? 'promovido' : 'não promovido',
      tone: completionClaimPromoted ? 'danger' : 'success',
    },
    {
      label: 'Review gate',
      value: reviewGatePreserved ? 'preservado' : 'AUSENTE',
      tone: reviewGatePreserved ? 'success' : 'danger',
    },
    {
      label: 'External rivals',
      value: externalRivalsStatus,
      tone: 'info',
    },
  ]

  const colorFor = (tone: Tone) =>
    tone === 'success'
      ? 'var(--cc-success-fg)'
      : tone === 'danger'
        ? 'var(--cc-danger-fg)'
        : tone === 'info'
          ? 'var(--cc-info-fg)'
          : 'var(--cc-text)'

  return (
    <section
      aria-label="Safety strip"
      style={{
        display: 'flex',
        gap: 16,
        flexWrap: 'wrap',
        padding: '10px 14px',
        background: 'var(--cc-surface-sunken)',
        border: '1px solid var(--cc-border-soft)',
        borderRadius: 'var(--cc-radius-sm)',
        fontFamily: 'var(--cc-font-mono)',
        fontSize: 11,
        color: 'var(--cc-text-muted)',
        letterSpacing: 'var(--cc-tracking-data)',
      }}
    >
      {items.map((it) => (
        <span key={it.label} style={{ display: 'inline-flex', gap: 4, alignItems: 'baseline' }}>
          <span style={{ color: 'var(--cc-text-faint)' }}>{it.label}:</span>
          <strong style={{ color: colorFor(it.tone), fontWeight: 600 }}>{it.value}</strong>
        </span>
      ))}
    </section>
  )
}
