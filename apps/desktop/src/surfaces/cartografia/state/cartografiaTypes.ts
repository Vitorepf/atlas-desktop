import type {
  CartographyAtom,
  CartographyGraph,
  CartographyNote,
  CartographyView,
  RecentChange,
} from '@atlas/domain'

export interface CartografiaState {
  loading: boolean
  errors: string[]
  graph: CartographyGraph | null
  recentChanges: RecentChange[]
  noteCache: Record<string, CartographyNote | null>
  atomIndex: Record<string, CartographyAtom>

  view: CartographyView
  continent: string
  systemParentId: string | null
  focusedId: string | null
  isolatedId: string | null
  hoverId: string | null
  searchQuery: string

  /** Reading mode (modo leitura sequencial pelo pipeline). */
  readingMode: boolean
  /** Indice (0-based) do passo do pipeline em foco durante reading mode. */
  readingFocusOrder?: number | null
  /** Densidade visual: comfortable cresce o ar; compact mantém canon atual. */
  density: 'comfortable' | 'compact'

  toggleReadingMode: () => void
  setReadingMode: (next: boolean) => void
  readingNext: () => void
  readingPrev: () => void
  setDensity: (next: 'comfortable' | 'compact') => void

  setView: (v: CartographyView) => void
  selectContinent: (id: string) => void
  enterNode: (graphId: string) => void
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
