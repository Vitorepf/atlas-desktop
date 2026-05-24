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
 * Node vindo do `semantic_graph`: e a camada fonte-real da Cartografia.
 * Diferente do canvas canonico, ele nasce diretamente dos frontmatters de
 * repo docs + AtlasVault, usando graph_parent/flows_to/depends_on/unlocks.
 */
export interface SemanticNode {
  graphId: string
  graphTitle: string
  graphWorld: string
  graphLayer: 'world' | 'system' | 'flow' | 'module' | 'gear' | 'subcomponent' | string | null
  graphKind: string | null
  graphParent: string | null
  graphStatus: string | null
  graphSource: GraphSource
  sourcePath: string
  summary: string | null
  dependsOn: string[]
  flowsTo: string[]
  unlocks: string[]
  governs: string[]
  riskLevel: string | null
  evidence: string[]
  nextActions: string[]
  mtime: number | null
}

/**
 * Grafo semantico real derivado dos arquivos. `hierarchy` responde pelo zoom
 * mundo → sistema → fluxo → modulo → engrenagem; `relations` desenha conexoes.
 */
export interface SemanticGraph {
  worlds: string[]
  nodes: SemanticNode[]
  hierarchy: Record<string, string[]>
  relations: Connection[]
}

/**
 * Path canônico ausente · usado pelo Audit Panel pra mostrar exatamente onde
 * o canon esperava um .md e o backend não encontrou.
 */
export interface BrokenPath {
  graphId: string
  name: string
  expectedPath: string
  graphKind: string
}

/**
 * Node do semantic graph que declara um parent inexistente. Informativo —
 * surfaces drift entre canon e filesystem real.
 */
export interface OrphanNode {
  graphId: string
  missingParent: string
}

/**
 * Audit completo do graph. Cobre saúde do canon (found vs missing), das fontes
 * (repo readable, vault readable), das relações (orphan_count) e do volume
 * (semantic_node_count, semantic_relation_count).
 */
export interface GraphAudit {
  found: number
  missing: number
  brokenPaths: BrokenPath[]
  orphanNodes: OrphanNode[]
  orphanCount: number
  semanticNodeCount: number
  semanticRelationCount: number
  generatedAt: string | null
  repoIndexed: number
  vaultIndexed: number
}

/**
 * Saúde por fonte canônica. Repo = engineering-knowledge-base; Vault =
 * AtlasVault Obsidian. Ambas precisam ser readable para a cartografia honrar
 * o canon "ler direto, sem intermediário".
 */
export interface SourceRootHealth {
  root: string
  readable: boolean
  indexedCount: number
  errors: string[]
}
export interface SourceHealth {
  repo: SourceRootHealth
  vault: SourceRootHealth
}

export interface CartographySources {
  repoDocsPath: string
  obsidianVaultPath: string
}

export interface CartographyHumanClarityDimension {
  id: string
  score: number
  evidence: string
}

export interface CartographyHumanClarity {
  schemaVersion: string
  status: string
  score: number
  targetScore: number
  grade: string
  dimensions: CartographyHumanClarityDimension[]
  invariants: Record<string, boolean>
}

export interface CartographyHumanClarityContract {
  humanClarity: CartographyHumanClarity | null
  writes: boolean
}

export interface CartographyRuntimeProjectionReplayItem {
  family: string
  status: string
  staleReason: string | null
  savedWorkspaceHash: string | null
  currentWorkspaceHash: string | null
  generatedAt: string | null
}

export interface CartographyRuntimeProjectionReplay {
  schemaVersion: string
  status: string
  staleCount: number
  missingCount: number
  staleFamilies: string[]
  missingFamilies: string[]
  items: CartographyRuntimeProjectionReplayItem[]
}

export interface CartographyArtifactGraphReplay {
  schemaVersion: string
  status: string
  stale: boolean
  reason: string | null
  snapshotId: string | null
  runtimeHash: string | null
  artifactIntelligenceHash: string | null
  graphHash: string | null
  capturedAt: string | null
}

export interface CartographyArtifactLakeReplayItem {
  artifactId: string
  artifactHash: string
  runtimeHash: string
  artifactType: string
  status: string
  consumer: string | null
  sourceHashCount: number
  qualityScore: number
  capturedAt: string | null
}

export interface CartographyArtifactLakeReplay {
  schemaVersion: string
  status: string
  reason: string | null
  artifactCount: number
  conversationFusionPackCount: number
  latestArtifacts: CartographyArtifactLakeReplayItem[]
  inspectEndpoint: string | null
  sourcePolicy: {
    rawConversationReturned: boolean
    fullMessageContentReturned: boolean
    workspaceScopeRequired: boolean
    hashesAreAuthoritative: boolean
  }
}

export interface CartographyWorkspaceScope {
  workspaceId: string | null
  workspaceHash: string | null
  runtimeProjectionReplay: CartographyRuntimeProjectionReplay | null
  artifactGraphReplay: CartographyArtifactGraphReplay | null
  artifactLakeReplay: CartographyArtifactLakeReplay | null
}

/**
 * Resposta canônica de `/atlas-cartography/graph`.
 * `checksum` é sha256 estável das superfícies canônicas (exclui generated_at)
 * pra permitir detecção de mudança sem diff do payload inteiro.
 */
export interface CartographyGraph {
  audit: GraphAudit
  sources: CartographySources
  sourceHealth: SourceHealth | null
  checksum: string | null
  universe: Continent[]
  pipeline: PipelineStep[]
  lanes: Record<string, Lane>
  connections: Connection[]
  semanticGraph: SemanticGraph | null
  humanClarityContract: CartographyHumanClarityContract | null
  workspaceScope: CartographyWorkspaceScope | null
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
  kind: 'pipeline' | 'lateral' | 'lane' | 'continent' | 'semantic'
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
  graphLayer?: string | null
  graphParent?: string | null
  flowsTo?: string[]
  governs?: string[]
}
