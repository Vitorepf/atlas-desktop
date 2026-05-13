/**
 * @atlas/domain · Cartography
 *
 * Tipos canônicos da Cartografia da verdade do Atlas. Espelham a resposta
 * do `/atlas-cartography/graph` (atlas-server). Read-only — a cartografia
 * nunca escreve, apenas lê do filesystem (repo + AtlasVault).
 */

export type GraphSource = 'repo' | 'vault' | 'mixed' | 'missing'

/**
 * Continente do AtlasVault — top-level (Atlas, Memória, Obras, Filosofia,
 * Forge, Gargalos). Cada continente carrega `count` peças catalogadas.
 */
export interface Continent {
  graphId: string
  name: string
  graphSource: GraphSource
  sourcePath: string
  missingSource: boolean
  count: number
  role: string | null
}

/**
 * Engrenagem do pipeline (Atlas AI Kernel · 17 etapas). Carrega a ficha 7
 * inteira: input/output/depends/unlocks/evidence/risks/next.
 */
export interface PipelineStep {
  graphId: string
  graphOrder: number
  name: string
  deck: string | null
  graphSource: GraphSource
  sourcePath: string
  missingSource: boolean
  role: string | null
  input: string | null
  output: string | null
  depends: string[]
  unblocks: string[]
  evidence: string | null
  risk: string | null
  next: string | null
  subs: Array<[string, string]>
  title: string | null
}

/**
 * Lateral de uma lane (Domain Plane, Capabilities, HKS, Evidence Loop, …).
 * Mostra peças que alimentam ou recebem do pipeline central.
 */
export interface LateralNode {
  graphId: string
  name: string
  deck: string | null
  graphSource: GraphSource
  sourcePath: string
  missingSource: boolean
  role: string | null
  input: string | null
  output: string | null
  depends: string[]
  unblocks: string[]
  evidence: string | null
  risk: string | null
  next: string | null
}

/**
 * Lane lateral · agrupa N LateralNodes. `side` indica posição relativa
 * ao pipeline (left/right).
 */
export interface Lane {
  graphId: string
  side: 'left' | 'right' | string
  head: string
  deck: string | null
  graphSource: GraphSource
  sourcePath: string
  missingSource: boolean
  role: string | null
  nodes: LateralNode[]
}

/**
 * Conexão (trail) entre 2 peças. `kind` define visual: sequence (reta),
 * feed (curva), feedback (curva tracejada de retorno).
 */
export interface Connection {
  from: string
  to: string
  kind: 'sequence' | 'feed' | 'feedback' | string
}

/**
 * Audit do graph: quantas peças canon foram encontradas vs missing,
 * quantos arquivos repo/vault foram indexados.
 */
export interface GraphAudit {
  found: number
  missing: number
  generatedAt: string | null
  repoIndexed: number
  vaultIndexed: number
}

/**
 * Resposta canônica de `/atlas-cartography/graph`.
 */
export interface CartographyGraph {
  audit: GraphAudit
  universe: Continent[]
  pipeline: PipelineStep[]
  lanes: Record<string, Lane>
  connections: Connection[]
}

/**
 * Mudança recente em um arquivo canon. Renderizada na timeline floater.
 * `secondsAgo` é incrementado client-side; o backend devolve o valor
 * inicial baseado em `time`.
 */
export interface RecentChange {
  graphId: string
  name: string
  time: string
  secondsAgo: number
  action: string
  author: string
  source: GraphSource
  path: string
}

/**
 * Conteúdo de um nota carregada via `/atlas-cartography/note/{id}`.
 * Cache lazy no client — só fetcha quando a peça é hovered/focused.
 */
export interface CartographyNote {
  graphId: string
  body: string
  source: GraphSource
  sourcePath: string
  modifiedAt: string | null
}

/**
 * Vista atual da cartografia. Representação de state machine.
 *
 * - universe : grid de continentes
 * - system   : sistemas dentro do continente atual
 * - flow     : Atlas AI Kernel Pipeline (a vista canônica)
 * - gear     : foco numa engrenagem (substitui cena · ESC volta)
 * - subflow  : drill final em subcomponentes
 */
export type CartographyView = 'universe' | 'system' | 'flow' | 'gear' | 'subflow'

/**
 * Atom unificado · qualquer peça do graph (pipeline | lateral | continent).
 * Indexado em `atomIndex` pra resolução O(1) de connections + breadcrumbs.
 */
export interface CartographyAtom {
  kind: 'pipeline' | 'lateral' | 'lane' | 'continent'
  graphId: string
  name: string
  deck: string | null
  graphSource: GraphSource
  sourcePath: string
  missingSource: boolean
  role: string | null
  graphOrder?: number
  input?: string | null
  output?: string | null
  depends?: string[]
  unblocks?: string[]
  evidence?: string | null
  risk?: string | null
  next?: string | null
  subs?: Array<[string, string]>
  regionId?: string
  regionHead?: string
}
