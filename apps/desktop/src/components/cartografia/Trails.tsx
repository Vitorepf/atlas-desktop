/**
 * Trails · SVG paths drawn between atoms in the flow scene.
 *
 * Three kinds:
 * - sequence : straight line between consecutive pipeline steps (with arrowhead)
 * - feed     : Bézier curve from a lateral lane node to a pipeline step
 * - feedback : dashed Bézier from evidence loop back to atlas-decide (the canonical
 *              loop visualisation)
 *
 * Coords are computed by reading DOM rects of the rendered atoms (which carry
 * `id="atom-{graph_id}"`). This runs on every layout change via ResizeObserver
 * + MutationObserver.
 */
import { useEffect, useRef, useState } from 'react'
import type { Connection } from '@atlas/domain'

interface TrailsProps {
  worldElement: HTMLDivElement | null
  connections: Connection[]
  isolatedId: string | null
}

interface ResolvedPath {
  key: string
  d: string
  kind: Connection['kind']
  active: boolean
  fromId: string
  toId: string
}

export function Trails({ worldElement, connections, isolatedId }: TrailsProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [paths, setPaths] = useState<ResolvedPath[]>([])

  useEffect(() => {
    if (!worldElement) return

    function recompute() {
      if (!worldElement) return
      const out: ResolvedPath[] = []
      for (const c of connections) {
        const fromKey = `atom-${c.from}`
        const toKey = `atom-${c.to}`
        const fromEl = worldElement.querySelector<HTMLElement>(`#${cssId(fromKey)}`)
        const toEl = worldElement.querySelector<HTMLElement>(`#${cssId(toKey)}`)
        if (!fromEl || !toEl) continue
        const fr = rectOf(fromEl)
        const tr = rectOf(toEl)
        let d = ''
        if (c.kind === 'sequence') {
          d = `M ${fr.cx} ${fr.b} L ${tr.cx} ${tr.t}`
        } else if (c.kind === 'feedback') {
          const sx = fr.r
          const sy = fr.cy
          const ex = tr.r
          const ey = tr.cy
          d = `M ${sx} ${sy} C ${sx + 100} ${sy + 30}, ${ex + 220} ${ey - 30}, ${ex} ${ey}`
        } else {
          // feed (curva lateral)
          const fromLeft = fr.cx < tr.cx
          const sx = fromLeft ? fr.r : fr.l
          const sy = fr.cy
          const ex = fromLeft ? tr.l : tr.r
          const ey = tr.cy
          const dx = Math.abs(ex - sx)
          const cp1x = sx + (fromLeft ? dx * 0.5 : -dx * 0.5)
          const cp2x = ex + (fromLeft ? -dx * 0.5 : dx * 0.5)
          d = `M ${sx} ${sy} C ${cp1x} ${sy}, ${cp2x} ${ey}, ${ex} ${ey}`
        }
        const involvesIsolated =
          isolatedId != null && (c.from === isolatedId || c.to === isolatedId)
        out.push({
          key: `${c.from}->${c.to}-${c.kind}`,
          d,
          kind: c.kind,
          active: involvesIsolated,
          fromId: c.from,
          toId: c.to,
        })
      }
      setPaths(out)
    }

    recompute()

    const ro = new ResizeObserver(() => recompute())
    ro.observe(worldElement)
    const mo = new MutationObserver(() => recompute())
    mo.observe(worldElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    })

    return () => {
      ro.disconnect()
      mo.disconnect()
    }
  }, [worldElement, connections, isolatedId])

  return (
    <svg
      ref={svgRef}
      className="world-svg"
      viewBox="0 0 1800 1380"
      preserveAspectRatio="none"
    >
      <defs>
        <marker
          id="trail-tip"
          viewBox="0 0 8 8"
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto"
        >
          <path d="M 0 0 L 8 4 L 0 8 Z" fill="currentColor" />
        </marker>
      </defs>
      {paths.map((p) => (
        <path
          key={p.key}
          d={p.d}
          className={`trail${p.kind === 'feedback' ? ' dashed' : ''}${p.active ? ' path-active' : ''}`}
          markerEnd={p.kind === 'feedback' ? undefined : 'url(#trail-tip)'}
        />
      ))}
    </svg>
  )
}

function cssId(id: string): string {
  // graph_ids podem conter ‘.’ e ‘-’; só ‘.’ precisa ser escapado em querySelector
  return id.replace(/\./g, '\\.')
}

function rectOf(el: HTMLElement) {
  return {
    l: el.offsetLeft,
    r: el.offsetLeft + el.offsetWidth,
    t: el.offsetTop,
    b: el.offsetTop + el.offsetHeight,
    cx: el.offsetLeft + el.offsetWidth / 2,
    cy: el.offsetTop + el.offsetHeight / 2,
  }
}
