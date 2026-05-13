import type { CartographyAtom } from '@atlas/domain'
import { toRoman } from './layout'
import { pipelineSymbol } from './atomModel'
import { AtomSourceLine } from './AtomSourceLine'

export function PipelineAtomContent({ atom }: { atom: CartographyAtom }) {
  return (
    <>
      <span className="a-num">{toRoman(atom.graphOrder ?? 0)}.</span>
      <span className="a-symbol" aria-hidden="true">{pipelineSymbol(atom.graphOrder ?? 0)}</span>
      <div className="a-body">
        <span className="a-name">{atom.name}</span>
        {atom.deck ? <span className="a-deck">{atom.deck}</span> : null}
        <AtomSourceLine atom={atom} />
        {atom.subs && atom.subs.length > 0 ? (
          <div className="a-subs">
            {atom.subs.map(([name, meta]) => (
              <div className="a-sub" key={name}>
                <span className="s-name">{name}</span>
                <span className="s-meta">{meta}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </>
  )
}

export function DefaultAtomContent({ atom }: { atom: CartographyAtom }) {
  return (
    <>
      <span className="a-name">{atom.name}</span>
      {atom.deck ? <span className="a-deck">{atom.deck}</span> : null}
      <AtomSourceLine atom={atom} />
    </>
  )
}
