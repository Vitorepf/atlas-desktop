import type { AtlasWorkspaceProfile } from '@atlas/domain'
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

  let score = 0
  if (hasProfile) score += 10
  if (hasFolder) score += 24
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
  score = Math.min(gaps.length > 0 ? 94 : 100, score)

  const capabilities: string[] = []
  if (hasFolder) capabilities.push('pasta real')
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
