/**
 * SubflowScene · grid de subcomponentes da peça em foco.
 *
 * É o drill mais profundo: pega `atom.subs` (pares [name, meta]) e mostra
 * num grid editorial. Botão volta pra GearScene.
 */
import type { CartographyAtom } from '@atlas/domain'

interface SubflowSceneProps {
  atom: CartographyAtom
  onBackToGear: () => void
}

export function SubflowScene({ atom, onBackToGear }: SubflowSceneProps) {
  const subs = atom.subs ?? []
  return (
    <div className="subflow-stage" id="subflow-stage">
      <header className="subflow-head">
        <span className="sh-roman">
          {atom.graphOrder ?? 0} · subfluxo
        </span>
        <div className="sh-title">{atom.name} · Subcomponentes</div>
        <div className="sh-sub">
          {atom.role || atom.deck || ''} · {subs.length} subcomponentes catalogados.
        </div>
      </header>

      {subs.length === 0 ? (
        <div className="empty-state" style={{ textAlign: 'center', padding: 32 }}>
          Nenhum subcomponente catalogado ainda.
        </div>
      ) : (
        <div className="subflow-grid">
          {subs.map(([name, meta]) => (
            <div className="subcomp" key={name}>
              <span className="sc-name">{name}</span>
              <span className="sc-meta">{meta}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <button type="button" className="focus-action" onClick={onBackToGear}>
          ← Voltar à engrenagem
        </button>
      </div>
    </div>
  )
}
