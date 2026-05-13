import type { Surface } from '../../hooks/useSurface'

export function BrandBlock({ surface }: { surface: Surface }) {
  const label = surface === 'cartografia' ? 'Cartografia' : 'Code'

  return (
    <div className="brand">
      <strong>Atlas · {label}</strong>
    </div>
  )
}
