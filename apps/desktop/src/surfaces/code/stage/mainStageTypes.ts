import type {
  AtlasCodeForgeUxOrchestrator,
  AtlasCodeObraCommandCenter,
  Message,
  Obra,
  ProgrammingGovernanceSnapshot,
  SddStage,
} from '@atlas/domain'

export type MainStageMode = 'forge'

export interface MainStageContext {
  stages: SddStage[]
  messages: Message[]
  receiptHash: string
  loading: boolean
  busy: boolean
  hasObra: boolean
  /**
   * SCOR-1 Programming Governance snapshot. `null` means the runtime has no
   * governed work item bound; Forge must show an honest empty state instead of
   * inventing draft content.
   */
  programmingGovernance: ProgrammingGovernanceSnapshot | null
  /**
   * Atlas Code Human Interface Upgrade v2 · centro da tela.
   *
   * Quando o centro estiver vazio, renderiza um resumo humano da Obra
   * (objetivo + estado + próximo passo + último blocker humano + safety)
   * usando esses dois campos. NUNCA inventa: se ambos null, mostra empty
   * state honesto.
   */
  obra: Obra | null
  forgeUxOrchestrator: AtlasCodeForgeUxOrchestrator | null
  /**
   * Atlas Code Obra Command Center v1 · read-model canônico do centro.
   *
   * Quando presente, é renderizado no centro como Command Center humano
   * (lifecycle 8 fases, decision inbox, progresso duplo, operational health,
   * trust summary). Quando null, o centro cai no resumo da v2 ou no empty
   * state honesto.
   */
  obraCommandCenter: AtlasCodeObraCommandCenter | null
  onSend: (text: string) => Promise<void>
}
