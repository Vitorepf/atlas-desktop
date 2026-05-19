/**
 * VoxButton · microfone discreto no composer.
 *
 * Estilo: reusa a classe `.atlas-ai-icon-btn` para herdar tom (cc-text-muted),
 * focus-visible halo gold, hover sutil — fica visualmente integrado ao
 * composer existente. Marca estado ativo quando overlay está aberto ou em
 * captura.
 */
import type { VoxOverlayState } from './useVoxOverlay'

interface VoxButtonProps {
  state: VoxOverlayState
  onClick: () => void
  disabled?: boolean
}

function isActive(state: VoxOverlayState): boolean {
  return (
    state !== 'closed' &&
    state !== 'cancelled' &&
    state !== 'error'
  )
}

function tooltipFor(state: VoxOverlayState): string {
  switch (state) {
    case 'closed':
    case 'idle':
      return 'Vox · gravar'
    case 'starting':
      return 'Vox · iniciando sessão…'
    case 'listening':
      return 'Vox · ouvindo'
    case 'finishing':
      return 'Vox · finalizando…'
    case 'transcribing':
      return 'Vox · transcrevendo localmente'
    case 'transcript_ready':
      return 'Vox · transcrição pronta'
    case 'compiling':
      return 'Vox · compilando intenção'
    case 'compiled':
      return 'Vox · intenção compilada'
    case 'awaiting_confirmation':
      return 'Vox · aguardando confirmação humana'
    case 'executing':
      return 'Vox · executando'
    case 'executed':
      return 'Vox · executado'
    case 'blocked':
      return 'Vox · execução bloqueada'
    case 'cancelled':
      return 'Vox · sessão cancelada'
    case 'eclipsed':
      return 'Vox · modo seguro ativo'
    case 'error':
      return 'Vox · erro (clique para reabrir)'
  }
}

export function VoxButton({ state, onClick, disabled = false }: VoxButtonProps) {
  const active = isActive(state)
  const tooltip = tooltipFor(state)
  return (
    <button
      type="button"
      className={`atlas-ai-icon-btn vox-btn${active ? ' is-active' : ''}${state === 'listening' ? ' is-listening' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={tooltip}
      aria-pressed={active}
      title={tooltip}
    >
      <svg
        viewBox="0 0 18 18"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="6.5" y="2.5" width="5" height="9" rx="2.5" />
        <path d="M3.5 8.5a5.5 5.5 0 0 0 11 0" />
        <line x1="9" y1="14" x2="9" y2="16" />
        <line x1="6.5" y1="16" x2="11.5" y2="16" />
      </svg>
    </button>
  )
}
