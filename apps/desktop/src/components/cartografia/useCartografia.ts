/**
 * useCartografia · loads + maintains live state for the cartography surface.
 *
 * - Loads /atlas-cartography/graph + /recent-changes on mount
 * - Polls every 5s to pick up filesystem changes (canon)
 * - Lazily fetches /note/{graphId} when the user hovers/focuses a piece
 * - Exposes view state machine (universe → system → flow → gear → subflow)
 *
 * CANON: read-only. Never writes. Backend cache absorbs filesystem reads.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { bridge } from '../../lib/bridge'
import type {
  CartographyAtom,
  CartographyGraph,
  CartographyNote,
  CartographyView,
  RecentChange,
} from '@atlas/domain'

const POLL_INTERVAL_MS = 5000
const TICK_INTERVAL_MS = 1000

export interface CartografiaState {
  loading: boolean
  errors: string[]
  graph: CartographyGraph | null
  recentChanges: RecentChange[]
  noteCache: Record<string, CartographyNote | null>
  atomIndex: Record<string, CartographyAtom>

  view: CartographyView
  continent: string
  focusedId: string | null
  isolatedId: string | null
  hoverId: string | null
  searchQuery: string

  setView: (v: CartographyView) => void
  selectContinent: (id: string) => void
  enterIsolate: (graphId: string) => void
  exitIsolate: () => void
  enterGear: (graphId: string) => void
  exitGear: () => void
  enterSubflow: () => void
  setHover: (graphId: string | null) => void
  setSearch: (q: string) => void
  loadNoteFor: (graphId: string) => Promise<CartographyNote | null>
  refreshRecent: () => Promise<void>
}

export function useCartografia(): CartografiaState {
  const [graph, setGraph] = useState<CartographyGraph | null>(null)
  const [recent, setRecent] = useState<RecentChange[]>([])
  const [noteCache, setNoteCache] = useState<Record<string, CartographyNote | null>>({})
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState<string[]>([])

  const [view, setViewState] = useState<CartographyView>('flow')
  const [continent, setContinent] = useState<string>('atlas')
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [isolatedId, setIsolatedId] = useState<string | null>(null)
  const [hoverId, setHover] = useState<string | null>(null)
  const [searchQuery, setSearch] = useState<string>('')

  const cancelledRef = useRef(false)

  // ──────────────────────────────────────────────────────────────────────
  // Atom index — O(1) resolution of any graph_id

  const atomIndex = useMemo<Record<string, CartographyAtom>>(() => {
    const idx: Record<string, CartographyAtom> = {}
    if (!graph) return idx
    // Defensive: a shape badly adapted (or zero pieces returned) shouldn't
    // crash the whole surface. Treat missing collections as empty.
    const pipeline = Array.isArray(graph.pipeline) ? graph.pipeline : []
    const lanes = graph.lanes && typeof graph.lanes === 'object' ? graph.lanes : {}
    const universe = Array.isArray(graph.universe) ? graph.universe : []

    for (const p of pipeline) {
      idx[p.graphId] = {
        kind: 'pipeline',
        graphId: p.graphId,
        name: p.name,
        deck: p.deck,
        graphSource: p.graphSource,
        sourcePath: p.sourcePath,
        missingSource: p.missingSource,
        role: p.role,
        graphOrder: p.graphOrder,
        input: p.input,
        output: p.output,
        depends: p.depends,
        unblocks: p.unblocks,
        evidence: p.evidence,
        risk: p.risk,
        next: p.next,
        subs: p.subs,
      }
    }
    for (const lane of Object.values(lanes)) {
      if (!lane?.graphId) continue
      idx[lane.graphId] = {
        kind: 'lane',
        graphId: lane.graphId,
        name: lane.head,
        deck: lane.deck,
        graphSource: lane.graphSource,
        sourcePath: lane.sourcePath,
        missingSource: lane.missingSource,
        role: lane.role,
      }
      for (const node of lane.nodes ?? []) {
        idx[node.graphId] = {
          kind: 'lateral',
          graphId: node.graphId,
          name: node.name,
          deck: node.deck,
          graphSource: node.graphSource,
          sourcePath: node.sourcePath,
          missingSource: node.missingSource,
          role: node.role,
          input: node.input,
          output: node.output,
          depends: node.depends,
          unblocks: node.unblocks,
          evidence: node.evidence,
          risk: node.risk,
          next: node.next,
          regionId: lane.graphId,
          regionHead: lane.head,
        }
      }
    }
    for (const c of universe) {
      if (!idx[c.graphId]) {
        idx[c.graphId] = {
          kind: 'continent',
          graphId: c.graphId,
          name: c.name,
          deck: null,
          graphSource: c.graphSource,
          sourcePath: c.sourcePath,
          missingSource: c.missingSource,
          role: c.role,
        }
      }
    }
    return idx
  }, [graph])

  // ──────────────────────────────────────────────────────────────────────
  // Initial load + polling

  const refreshGraph = useCallback(async () => {
    try {
      const g = await bridge.loadCartographyGraph()
      if (cancelledRef.current) return
      if (g) setGraph(g)
      else setErrors((e) => ['cartography graph offline', ...e].slice(0, 8))
    } catch (e) {
      if (!cancelledRef.current)
        setErrors((es) => [`graph · ${String(e)}`, ...es].slice(0, 8))
    }
  }, [])

  const refreshRecent = useCallback(async () => {
    try {
      const c = await bridge.loadCartographyRecentChanges()
      if (cancelledRef.current) return
      setRecent(c)
    } catch {
      /* ignore — recent is best-effort */
    }
  }, [])

  useEffect(() => {
    cancelledRef.current = false
    void Promise.all([refreshGraph(), refreshRecent()]).finally(() => {
      if (!cancelledRef.current) setLoading(false)
    })

    const pollId = setInterval(() => {
      void refreshGraph()
      void refreshRecent()
    }, POLL_INTERVAL_MS)

    // local tick: bump secondsAgo client-side every 1s so badges update
    const tickId = setInterval(() => {
      setRecent((arr) =>
        arr.map((c) => ({ ...c, secondsAgo: c.secondsAgo + Math.floor(TICK_INTERVAL_MS / 1000) }))
      )
    }, TICK_INTERVAL_MS)

    return () => {
      cancelledRef.current = true
      clearInterval(pollId)
      clearInterval(tickId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ──────────────────────────────────────────────────────────────────────
  // Lazy note fetch

  const loadNoteFor = useCallback(
    async (graphId: string): Promise<CartographyNote | null> => {
      if (graphId in noteCache) return noteCache[graphId] ?? null
      try {
        const note = await bridge.loadCartographyNote(graphId)
        setNoteCache((c) => ({ ...c, [graphId]: note }))
        return note
      } catch {
        setNoteCache((c) => ({ ...c, [graphId]: null }))
        return null
      }
    },
    [noteCache]
  )

  // ──────────────────────────────────────────────────────────────────────
  // Navigation

  const setView = useCallback((v: CartographyView) => {
    setViewState(v)
    if (v === 'flow' || v === 'universe' || v === 'system') {
      setFocusedId(null)
    }
  }, [])

  const selectContinent = useCallback((id: string) => {
    setContinent(id)
    setFocusedId(null)
    setIsolatedId(null)
    // Atlas continent has the canonical kernel pipeline; outros mostram system grid.
    setViewState(id === 'atlas' ? 'flow' : 'system')
  }, [])

  const enterIsolate = useCallback((graphId: string) => {
    setIsolatedId(graphId)
  }, [])
  const exitIsolate = useCallback(() => setIsolatedId(null), [])

  const enterGear = useCallback(
    (graphId: string) => {
      setFocusedId(graphId)
      setIsolatedId(null)
      setViewState('gear')
      void loadNoteFor(graphId)
    },
    [loadNoteFor]
  )
  const exitGear = useCallback(() => {
    setFocusedId(null)
    setViewState('flow')
  }, [])

  const enterSubflow = useCallback(() => setViewState('subflow'), [])

  // ESC handling for view stack
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (view === 'subflow') setViewState('gear')
      else if (view === 'gear') exitGear()
      else if (isolatedId) exitIsolate()
      else if (view === 'universe' || view === 'system') setViewState('flow')
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [view, isolatedId, exitGear, exitIsolate])

  return {
    loading,
    errors,
    graph,
    recentChanges: recent,
    noteCache,
    atomIndex,

    view,
    continent,
    focusedId,
    isolatedId,
    hoverId,
    searchQuery,

    setView,
    selectContinent,
    enterIsolate,
    exitIsolate,
    enterGear,
    exitGear,
    enterSubflow,
    setHover,
    setSearch,
    loadNoteFor,
    refreshRecent,
  }
}
