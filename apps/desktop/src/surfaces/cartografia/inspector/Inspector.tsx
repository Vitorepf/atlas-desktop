/**
 * Inspector · left-rail editorial · sempre presente.
 *
 * Renderiza:
 * - source line (badge repo|vault + path + status / "atualizado há Xs")
 * - kind eyebrow + title + lede
 * - ficha 7 (entrada/saída/depende/alimenta/evidência/gargalo/próxima ação)
 * - markdown viewer do .md real (lazy-loaded via loadNoteFor)
 * - actions list (read-only · open/copy/reveal source actions)
 * - tags
 *
 * Quando nada está hover/foco, mostra default "Atlas AI Kernel Pipeline".
 * Quando uma peça está sob hover/isolate/focus, mostra a ficha dela.
 */
import type { CartographyAtom, CartographyGraph, CartographyNote, CartographySources, RecentChange } from '@atlas/domain'
import { DefaultInspector } from './DefaultInspector'
import { InspectorFileContent } from './InspectorFileContent'
import {
  CollapsedInspectorRail,
  InspectorResizeToolbar,
} from './InspectorResizeControls'
import { Ficha } from './Ficha'
import { RecentChangesDock } from './RecentChangesDock'
import { buildFichaFields } from './buildFichaFields'
import { InspectorHeader } from './InspectorHeader'
import { InspectorActions, InspectorFitSection, InspectorTags } from './InspectorSections'
import { inspectorTags } from './inspectorModel'
import { useInspectorNote } from './useInspectorNote'

interface InspectorProps {
  /** atom do hover/isolate/focus, ou null pra default */
  atom: CartographyAtom | null
  recent: RecentChange | null
  noteCache: Record<string, CartographyNote | null>
  loadNoteFor: (graphId: string) => Promise<CartographyNote | null>
  sourceRoots: CartographySources | null
  graph: CartographyGraph | null
  recentChanges: RecentChange[]
  atomIndex: Record<string, CartographyAtom>
  onPickRecent: (graphId: string) => void
  collapsed: boolean
  width: number
  minWidth: number
  maxWidth: number
  onToggleCollapsed: () => void
  onNudgeWidth: (delta: number) => void
  onResetWidth: () => void
}

export function Inspector({
  atom,
  recent,
  noteCache,
  loadNoteFor,
  sourceRoots,
  graph,
  recentChanges,
  atomIndex,
  onPickRecent,
  collapsed,
  width,
  minWidth,
  maxWidth,
  onToggleCollapsed,
  onNudgeWidth,
  onResetWidth,
}: InspectorProps) {
  const note = useInspectorNote({ atom, noteCache, loadNoteFor })

  if (!atom) {
    return (
      <DefaultInspector
        graph={graph}
        recentChanges={recentChanges}
        atomIndex={atomIndex}
        onPickRecent={onPickRecent}
        collapsed={collapsed}
        width={width}
        minWidth={minWidth}
        maxWidth={maxWidth}
        onToggleCollapsed={onToggleCollapsed}
        onNudgeWidth={onNudgeWidth}
        onResetWidth={onResetWidth}
      />
    )
  }

  const fields = buildFichaFields(atom)
  const tags = inspectorTags(atom)

  return (
    <aside className={`cart-inspector${collapsed ? ' is-collapsed' : ''}`}>
      <InspectorResizeToolbar
        collapsed={collapsed}
        width={width}
        minWidth={minWidth}
        maxWidth={maxWidth}
        onToggleCollapsed={onToggleCollapsed}
        onNudgeWidth={onNudgeWidth}
        onResetWidth={onResetWidth}
      />
      {collapsed ? (
        <CollapsedInspectorRail onToggleCollapsed={onToggleCollapsed} />
      ) : (
        <div className="ins-content" aria-hidden={collapsed}>
          <InspectorHeader atom={atom} recent={recent} />

          <div className="ins-body">
            <Ficha fields={fields} />
            <InspectorFitSection atom={atom} />
            <InspectorFileContent atom={atom} note={note} recent={recent} />
            <InspectorActions atom={atom} note={note} sourceRoots={sourceRoots} />
            <InspectorTags tags={tags} />
          </div>

          <RecentChangesDock
            collapsed={collapsed}
            changes={recentChanges}
            atomIndex={atomIndex}
            onPickRecent={onPickRecent}
          />
        </div>
      )}
    </aside>
  )
}
