/**
 * GearScene · focus mode for a single piece (substitui a cena).
 *
 * Layout: header (eyebrow + title + lede + source meta), depende de (left
 * satellites), alimenta (right satellites), center card com ficha 7, footer
 * com ações (abrir, dive em subs, ver loop, voltar).
 */
import type { CartographyAtom } from '@atlas/domain'
import { toRoman } from '../layout'

interface GearSceneProps {
  atom: CartographyAtom
  atomIndex: Record<string, CartographyAtom>
  onSatellite: (graphId: string) => void
  onBack: () => void
  onSubflow: () => void
  onLoop: () => void
}

interface FichaField {
  label: string
  glyph: string
  val: string | null | undefined
  risk?: boolean
  next?: boolean
}

export function GearScene({
  atom,
  atomIndex,
  onSatellite,
  onBack,
  onSubflow,
  onLoop,
}: GearSceneProps) {
  const isPipeline = atom.kind === 'pipeline'
  const eyebrow = isPipeline
    ? `Atlas · AI Kernel · ${toRoman(atom.graphOrder ?? 0)}`
    : `Atlas · ${atom.regionHead ?? 'Lateral'}`

  const fields: FichaField[] = [
    { label: 'Entrada', glyph: '↑', val: atom.input },
    { label: 'Saída', glyph: '↓', val: atom.output },
    { label: 'Evidência', glyph: '☷', val: atom.evidence },
    { label: 'Gargalo', glyph: '△', val: atom.risk, risk: true },
    { label: 'Próxima ação', glyph: '✦', val: atom.next, next: true },
  ]

  const depends = (atom.depends ?? [])
    .map((id) => atomIndex[id])
    .filter((a): a is CartographyAtom => !!a)
  const unblocks = (atom.unblocks ?? [])
    .map((id) => atomIndex[id])
    .filter((a): a is CartographyAtom => !!a)

  return (
    <div className="gear-focus-stage" id="gear-focus-stage">
      <header className="focus-header">
        <div className="focus-eyebrow">{eyebrow}</div>
        <h2 className="focus-title">{atom.name}</h2>
        <p className="focus-lede">{atom.role || atom.deck || ''}</p>
        <div className="focus-side-meta">
          <span className={`meta-source-badge ${atom.graphSource}`}>{atom.graphSource}</span>
          <span>{atom.sourcePath}</span>
          <span>● sincronizado</span>
        </div>
      </header>

      <aside className="focus-side left">
        <div className="side-label">
          <span className="side-glyph">←</span>Depende de
        </div>
        {depends.length === 0 ? (
          <div className="empty-state">—</div>
        ) : (
          depends.map((a) => (
            <SatelliteButton key={a.graphId} atom={a} onClick={() => onSatellite(a.graphId)} />
          ))
        )}
      </aside>

      <aside className="focus-side right">
        <div className="side-label">
          <span className="side-glyph">→</span>Alimenta
        </div>
        {unblocks.length === 0 ? (
          <div className="empty-state">—</div>
        ) : (
          unblocks.map((a) => (
            <SatelliteButton key={a.graphId} atom={a} onClick={() => onSatellite(a.graphId)} />
          ))
        )}
      </aside>

      <div className="focus-center-card">
        <div className="center-fields">
          {fields.map((f) => {
            const val = f.val || '—'
            const cls = `field-row${f.risk && val !== '—' ? ' risk' : ''}${f.next ? ' next' : ''}`
            return (
              <div key={f.label} className={cls}>
                <span className="field-label">
                  <span className="fglyph">{f.glyph}</span>
                  {f.label}
                </span>
                <span className="field-value">{val}</span>
              </div>
            )
          })}
        </div>
      </div>

      <footer className="focus-footer">
        <button
          type="button"
          className="focus-action primary"
          onClick={() => alert(`Abrir no editor (read-only):\n${atom.sourcePath}`)}
        >
          ↗ Abrir arquivo no editor
        </button>
        {atom.subs && atom.subs.length > 0 ? (
          <button type="button" className="focus-action" onClick={onSubflow}>
            ↓ Ver subcomponentes
          </button>
        ) : null}
        <button type="button" className="focus-action" onClick={onLoop}>
          ↻ Ver loop de evidência
        </button>
        <button type="button" className="focus-action" onClick={onBack}>
          ← Voltar ao mapa
        </button>
      </footer>
    </div>
  )
}

function SatelliteButton({
  atom,
  onClick,
}: {
  atom: CartographyAtom
  onClick: () => void
}) {
  return (
    <button type="button" className="satellite" onClick={onClick}>
      <span className="s-name">{atom.name}</span>
      {atom.deck ? <span className="s-sub">{atom.deck}</span> : null}
      <span className="s-source">
        {atom.graphSource} · {atom.sourcePath || ''}
      </span>
    </button>
  )
}
