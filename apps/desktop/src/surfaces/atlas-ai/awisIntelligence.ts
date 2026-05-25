import type { AtlasWorkspaceProfile } from '@atlas/domain'
import type { AtlasWorkspaceBrainSnapshot } from '../../lib/bridge'
import type {
  AwisWorkspaceArtifactLakeSummary,
  AwisWorkspaceArtifactReplayProjection,
  AwisWorkspaceAutomationProjection,
  AwisWorkspaceConfidenceProjection,
  AwisWorkspaceContextKernelProjection,
  AwisWorkspaceContinuityProjection,
  AwisWorkspaceEvolutionProjection,
  AwisWorkspaceHandoffProjection,
  AwisWorkspaceLearningProjection,
  AwisWorkspaceLivingGraphProjection,
  AwisWorkspaceMemorySnapshot,
  AwisWorkspaceNextSessionBrainProjection,
  AwisWorkspaceRelationProjection,
  AwisWorkspaceRetentionProjection,
  AwisWorkspaceSelfImprovementProjection,
  AwisWorkspaceSessionGoldProjection,
  AwisWorkspaceStartupOrchestrationProjection,
  AwisWorkspaceTopologyProjection,
} from './awisWorkspaceMemory'
import type { RuntimeReadinessStatus } from './runtimeReadinessView'

export interface AwisWorkspaceIntelligenceInput {
  profile: AtlasWorkspaceProfile | null
  threadCount: number
  spaceCount: number
  workbenchPaneCount: number
  hasStoredWorkbench: boolean
  historyHealthy: boolean
  runtimeStatus: RuntimeReadinessStatus
  serverHealth?: AwisServerHealthState | null
  learningLoop?: AwisLearningLoopState | null
  workspaceBrain?: AtlasWorkspaceBrainSnapshot | null
  workspaceMemory?: AwisWorkspaceMemorySnapshot | null
  workspaceLearning?: AwisWorkspaceLearningProjection | null
  workspaceSessionGold?: AwisWorkspaceSessionGoldProjection | null
  workspaceEvolution?: AwisWorkspaceEvolutionProjection | null
  workspaceRelations?: AwisWorkspaceRelationProjection | null
  workspaceTopology?: AwisWorkspaceTopologyProjection | null
  workspaceArtifactLake?: AwisWorkspaceArtifactLakeSummary | null
  workspaceArtifactReplay?: AwisWorkspaceArtifactReplayProjection | null
  workspaceContinuity?: AwisWorkspaceContinuityProjection | null
  workspaceAutomation?: AwisWorkspaceAutomationProjection | null
  workspaceConfidence?: AwisWorkspaceConfidenceProjection | null
  workspaceLivingGraph?: AwisWorkspaceLivingGraphProjection | null
  workspaceContextKernel?: AwisWorkspaceContextKernelProjection | null
  workspaceSelfImprovement?: AwisWorkspaceSelfImprovementProjection | null
  workspaceRetention?: AwisWorkspaceRetentionProjection | null
  workspaceStartupOrchestration?: AwisWorkspaceStartupOrchestrationProjection | null
  workspaceNextSessionBrain?: AwisWorkspaceNextSessionBrainProjection | null
  workspaceHandoffPack?: AwisWorkspaceHandoffProjection | null
  runtimeSnapshot?: AwisRuntimeSnapshotState | null
}

export interface AwisLearningLoopState {
  status: 'ready' | 'blocked' | 'loading' | 'unavailable'
  loopClosed: boolean
  action?: string | null
  learningScore?: number | null
  hash?: string | null
}

export interface AwisLiveSignal {
  label: string
  detail: string
  tone: 'ok' | 'warn' | 'muted'
}

export interface AwisServerHealthState {
  status: 'ready' | 'degraded' | 'loading' | 'unavailable'
  dbConnected?: boolean | null
  overallOk?: boolean | null
  storageOk?: boolean | null
  storageWritable?: boolean | null
  storagePath?: string | null
  detail?: string | null
}

export interface AwisRuntimeSnapshotState {
  status: 'ready' | 'blocked' | 'loading' | 'unavailable'
  persisted: boolean
  snapshotHash?: string | null
  brainHash?: string | null
  projectionCount?: number | null
}

export interface AwisWorkspaceIntelligence {
  score: number
  level: 'context' | 'ready' | 'power' | 'command'
  label: string
  summary: string
  capabilities: string[]
  gaps: string[]
  nextActions: string[]
  liveSignal: AwisLiveSignal
}

function hasCommands(profile: AtlasWorkspaceProfile | null): boolean {
  if (!profile) return false
  return Object.keys(profile.commands ?? {}).length > 0
    || profile.testCommands.length > 0
    || profile.buildCommands.length > 0
    || Boolean(profile.devServerCommand)
}

function learningMaturityLabel(maturity: AwisWorkspaceLearningProjection['maturity'] | undefined): string {
  if (maturity === 'battle_tested') return 'validado'
  if (maturity === 'stable') return 'estável'
  if (maturity === 'learning') return 'em aprendizado'
  return 'novo'
}

function automationModeLabel(mode: AwisWorkspaceAutomationProjection['mode'] | undefined): string {
  if (mode === 'optimize') return 'otimizando'
  if (mode === 'maintain') return 'mantendo'
  return 'observando'
}

export function evaluateAwisWorkspaceIntelligence(input: AwisWorkspaceIntelligenceInput): AwisWorkspaceIntelligence {
  const profile = input.profile
  const hasProfile = Boolean(profile)
  const hasFolder = profile?.workspacePathExists === true
  const executionAllowed = profile?.safety.executionAllowed === true
  const commandsReady = hasCommands(profile)
  const stackReady = Boolean(profile?.stackSummary.trim())
  const spacesReady = input.spaceCount > 0
  const workbenchReady = input.workbenchPaneCount > 1 || input.hasStoredWorkbench
  const historyHealthy = input.historyHealthy
  const runtimeReady = input.runtimeStatus === 'ready' || input.runtimeStatus === 'partial'
  const runtimeBlocked = input.runtimeStatus === 'blocked'
  const loopState = input.learningLoop ?? null
  const serverHealth = input.serverHealth ?? null
  const storageBroken = serverHealth?.storageOk === false || serverHealth?.storageWritable === false
  const serverReady = serverHealth?.status === 'ready'
  const serverDegraded = serverHealth?.status === 'degraded'
  const serverUnavailable = serverHealth?.status === 'unavailable'
  const liveLoopReady = loopState?.status === 'ready' && loopState.loopClosed
  const workspaceBrainRequested = hasFolder && Object.prototype.hasOwnProperty.call(input, 'workspaceBrain')
  const workspaceBrain = input.workspaceBrain ?? null
  const workspaceBrainReady = workspaceBrain?.status === 'ready' && workspaceBrain.filesSeen > 0
  const workspaceBrainFailed = workspaceBrain?.status === 'error'
  const workspaceBrainSignalsReady = workspaceBrainReady && (
    workspaceBrain.signals.length > 0
    || workspaceBrain.languages.length > 0
    || workspaceBrain.importantFiles.length > 0
  )
  const workspaceBrainCommandsReady = workspaceBrainReady && workspaceBrain.commands.length > 0
  const workspaceMemory = input.workspaceMemory ?? null
  const workspaceMemoryReady = Boolean(workspaceMemory && workspaceMemory.scanCount > 0)
  const workspaceMemoryLearning = Boolean(workspaceMemory && (
    workspaceMemory.scanCount > 1
    || workspaceMemory.stableSignals.length > 0
    || workspaceMemory.stableCommands.length > 0
  ))
  const workspaceTopology = input.workspaceTopology ?? null
  const workspaceTopologyReady = Boolean(workspaceTopology && workspaceTopology.components.length > 0)
  const workspaceOperationalMemoryReady = Boolean(workspaceMemory && workspaceMemory.interactionCount > 0)
  const workspaceLearning = input.workspaceLearning ?? null
  const workspaceLearningReady = Boolean(workspaceLearning && workspaceLearning.maturity !== 'new')
  const workspaceSessionGoldReady = Boolean(input.workspaceSessionGold && input.workspaceSessionGold.readiness_score >= 40)
  const workspaceStartupReady = Boolean(
    workspaceMemoryReady ||
    workspaceOperationalMemoryReady ||
    workspaceBrainReady ||
    workspaceTopologyReady ||
    workspaceLearningReady ||
    workspaceSessionGoldReady ||
    spacesReady,
  )
  const workspaceEvolution = input.workspaceEvolution ?? null
  const workspaceEvolutionReady = Boolean(workspaceEvolution && (
    workspaceEvolution.patterns.length > 0 ||
    workspaceEvolution.failure_signatures.length > 0
  ))
  const workspaceRelations = input.workspaceRelations ?? null
  const workspaceRelationsReady = Boolean(workspaceRelations && workspaceRelations.related_workspaces.length > 0)
  const workspaceArtifactLakeReady = Boolean(input.workspaceArtifactLake && input.workspaceArtifactLake.artifact_count > 0)
  const workspaceArtifactReplayReady = Boolean(input.workspaceArtifactReplay && input.workspaceArtifactReplay.artifact_count > 0)
  const workspaceContinuityReady = Boolean(input.workspaceContinuity && input.workspaceContinuity.readiness_score >= 40)
  const workspaceAutomationReady = Boolean(input.workspaceAutomation && input.workspaceAutomation.automation_score >= 40)
  const workspaceConfidenceReady = Boolean(input.workspaceConfidence && input.workspaceConfidence.confidence_score >= 40)
  const workspaceLivingGraphReady = Boolean(input.workspaceLivingGraph && input.workspaceLivingGraph.readiness_score >= 40)
  const workspaceContextKernelReady = Boolean(input.workspaceContextKernel && input.workspaceContextKernel.readiness_score >= 40)
  const workspaceSelfImprovementReady = Boolean(input.workspaceSelfImprovement && input.workspaceSelfImprovement.readiness_score >= 40)
  const workspaceRetentionReady = Boolean(input.workspaceRetention && input.workspaceRetention.readiness_score >= 40)
  const workspaceStartupOrchestrationReady = Boolean(input.workspaceStartupOrchestration && input.workspaceStartupOrchestration.readiness_score >= 40)
  const workspaceNextSessionBrainReady = input.workspaceNextSessionBrain?.status === 'ready'
  const workspaceHandoffPackReady = input.workspaceHandoffPack?.status === 'ready'
  const runtimeSnapshot = input.runtimeSnapshot ?? null
  const runtimeSnapshotReady = runtimeSnapshot?.status === 'ready' && runtimeSnapshot.persisted

  let score = 0
  if (hasProfile) score += 10
  if (hasFolder) score += 24
  if (workspaceBrainReady) score += 10
  if (workspaceTopologyReady) score += 4
  if (workspaceMemoryReady) score += 6
  if (workspaceOperationalMemoryReady) score += 5
  if (workspaceLearningReady) score += 4
  if (workspaceSessionGoldReady) score += 5
  if (workspaceStartupReady) score += 3
  if (workspaceEvolutionReady) score += 6
  if (workspaceRelationsReady) score += 4
  if (workspaceArtifactLakeReady) score += 4
  if (workspaceArtifactReplayReady) score += 5
  if (workspaceContinuityReady) score += 6
  if (workspaceAutomationReady) score += 5
  if (workspaceConfidenceReady) score += 5
  if (workspaceLivingGraphReady) score += 5
  if (workspaceContextKernelReady) score += 5
  if (workspaceSelfImprovementReady) score += 5
  if (workspaceRetentionReady) score += 4
  if (workspaceStartupOrchestrationReady) score += 4
  if (workspaceNextSessionBrainReady) score += 6
  if (workspaceHandoffPackReady) score += 4
  if (runtimeSnapshotReady) score += 8
  if (executionAllowed) score += 16
  if (commandsReady) score += 14
  if (stackReady) score += 10
  if (historyHealthy) score += 8
  if (input.threadCount > 0) score += 6
  if (spacesReady) score += 6
  if (workbenchReady) score += 4
  if (runtimeReady) score += 2
  if (serverReady) score += 6
  if (liveLoopReady) score += 8
  const gaps: string[] = []
  if (!hasProfile) gaps.push('criar projeto')
  if (!hasFolder) gaps.push('escolher pasta local')
  if (workspaceBrainRequested && !workspaceBrainReady) {
    gaps.push(workspaceBrainFailed ? 'recuperar mapa local' : 'mapear pasta local')
  }
  if (workspaceBrainReady && !workspaceMemoryReady) gaps.push('ativar memória local')
  if (workspaceBrainSignalsReady && !workspaceTopologyReady) gaps.push('entender componentes')
  if (hasFolder && !executionAllowed) gaps.push('liberar execução segura')
  if (!commandsReady) gaps.push('registrar comandos')
  if (!stackReady) gaps.push('resumir stack')
  if (!historyHealthy) gaps.push('histórico indisponível')
  if (runtimeBlocked) gaps.push('concluir certificação AWIS')
  if (!spacesReady && input.threadCount >= 2) gaps.push('criar Space')
  if (!workbenchReady && input.threadCount >= 2) gaps.push('comparar sessões')
  if (serverUnavailable) gaps.push('iniciar serviço local')
  if (serverDegraded) {
    gaps.push(
      serverHealth?.dbConnected === false
        ? 'recuperar histórico local'
        : storageBroken
          ? 'liberar armazenamento local'
          : 'revisar serviço local',
    )
  }
  if (loopState?.status === 'blocked') gaps.push('fechar loop AWIS')
  if (runtimeSnapshot?.status === 'blocked') gaps.push('recriar snapshot AWIS')
  if (input.workspaceNextSessionBrain && !workspaceNextSessionBrainReady) gaps.push('preparar partida inteligente')
  if (input.workspaceHandoffPack && !workspaceHandoffPackReady) gaps.push('completar handoff AWIS')
  score = Math.min(gaps.length > 0 ? 94 : 100, score)

  const capabilities: string[] = []
  if (hasFolder) capabilities.push('pasta real')
  if (workspaceBrainReady) capabilities.push('mapa local')
  if (workspaceTopologyReady) capabilities.push('topologia local')
  if (workspaceMemoryReady) capabilities.push('memória local')
  if (workspaceOperationalMemoryReady) capabilities.push('uso aprendido')
  if (workspaceLearningReady) capabilities.push(learningMaturityLabel(workspaceLearning?.maturity))
  if (workspaceSessionGoldReady) capabilities.push('ouro de sessão')
  if (workspaceStartupReady) capabilities.push('partida inteligente')
  if (workspaceEvolutionReady) capabilities.push('aprendizado entre projetos')
  if (workspaceRelationsReady) capabilities.push('relações locais')
  if (workspaceArtifactLakeReady) capabilities.push('Artifact Lake local')
  if (workspaceArtifactReplayReady) capabilities.push('replay de partida')
  if (workspaceContinuityReady) capabilities.push('continuidade viva')
  if (workspaceAutomationReady) capabilities.push(automationModeLabel(input.workspaceAutomation?.mode))
  if (workspaceConfidenceReady) capabilities.push('ranking de confiança')
  if (workspaceLivingGraphReady) capabilities.push('grafo vivo')
  if (workspaceContextKernelReady) capabilities.push('kernel de contexto')
  if (workspaceSelfImprovementReady) capabilities.push('autoevolução')
  if (workspaceRetentionReady) capabilities.push('retenção viva')
  if (workspaceStartupOrchestrationReady) capabilities.push('partida orquestrada')
  if (input.workspaceArtifactReplay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('playbook:'))) {
    capabilities.push('playbook de partida')
  }
  if (workspaceNextSessionBrainReady) capabilities.push('next-session brain')
  if (workspaceHandoffPackReady) capabilities.push('handoff seguro')
  if (runtimeSnapshotReady) capabilities.push('snapshot AWIS salvo')
  if (workspaceMemoryLearning) capabilities.push('aprendizado incremental')
  if (workspaceBrainSignalsReady) capabilities.push('stack detectada')
  if (workspaceBrainCommandsReady) capabilities.push('comandos inferidos')
  if (executionAllowed) capabilities.push('execução local')
  if (commandsReady) capabilities.push('comandos conhecidos')
  if (spacesReady) capabilities.push(`${input.spaceCount} Space${input.spaceCount === 1 ? '' : 's'}`)
  if (workbenchReady) capabilities.push('comparação retomável')
  if (runtimeReady) capabilities.push(`AWIS ${input.runtimeStatus === 'ready' ? 'pronto' : 'parcial'}`)
  if (serverReady) capabilities.push(storageBroken ? 'serviço local parcial' : 'serviço local pronto')
  if (liveLoopReady) capabilities.push('loop vivo')

  const nextActions = gaps.slice(0, 3)
  const level: AwisWorkspaceIntelligence['level'] =
    score >= 85 ? 'command' : score >= 65 ? 'power' : score >= 35 ? 'ready' : 'context'
  const label =
    level === 'command'
      ? 'Comando AWIS'
      : level === 'power'
        ? 'Projeto poderoso'
        : level === 'ready'
          ? 'Base pronta'
          : 'Contexto inicial'
  const summary =
    gaps.length === 0
      ? 'Projeto pronto para contexto, organização e execução local.'
      : `${gaps[0]} é o próximo salto de poder.`
  const liveSignal = liveSignalFor(loopState, serverHealth)

  return {
    score,
    level,
    label,
    summary,
    capabilities,
    gaps,
    nextActions,
    liveSignal,
  }
}

function liveSignalFor(loopState: AwisLearningLoopState | null, serverHealth: AwisServerHealthState | null): AwisLiveSignal {
  if (serverHealth?.status === 'loading') {
    return {
      label: 'verificando',
      detail: 'checando serviço local do Atlas',
      tone: 'muted',
    }
  }
  if (serverHealth?.status === 'unavailable') {
    return {
      label: 'serviço local',
      detail: 'indisponível neste Mac',
      tone: 'warn',
    }
  }
  if (serverHealth?.status === 'degraded') {
    if (serverHealth.storageOk === false || serverHealth.storageWritable === false) {
      return {
        label: 'armazenamento local',
        detail: 'sem escrita na pasta local do Atlas',
        tone: 'warn',
      }
    }
    return {
      label: 'serviço local',
      detail: serverHealth.dbConnected === false ? 'histórico local indisponível' : 'requer atenção',
      tone: 'warn',
    }
  }
  if (!loopState) {
    return {
      label: 'loop local',
      detail: 'inteligência calculada neste Mac',
      tone: 'muted',
    }
  }
  if (loopState.status === 'loading') {
    return {
      label: 'verificando',
      detail: 'certificação AWIS em andamento',
      tone: 'muted',
    }
  }
  if (loopState.status === 'ready' && loopState.loopClosed) {
    const score = typeof loopState.learningScore === 'number'
      ? ` · ${Math.round(loopState.learningScore * 100)}%`
      : ''
    return {
      label: 'loop vivo',
      detail: `${actionLabel(loopState.action)}${score}`,
      tone: 'ok',
    }
  }
  if (loopState.status === 'blocked') {
    return {
      label: 'loop incompleto',
      detail: 'falta evidência antes de executar com confiança',
      tone: 'warn',
    }
  }
  return {
    label: 'loop local',
    detail: 'AWIS local indisponível',
    tone: 'muted',
  }
}

function actionLabel(action?: string | null): string {
  switch (action) {
    case 'prepare_provider_safe_handoff':
      return 'handoff seguro pronto'
    case 'repair_workspace_contracts':
      return 'corrigir contrato do projeto'
    default:
      return action ? 'ação local registrada' : 'contexto aplicado'
  }
}
