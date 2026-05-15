/**
 * useBridge · loads cockpit data + exposes interactive actions.
 *
 * V2 (production-readiness ADR-0002):
 *   - listObras hits /atlas-code/works (normalised list)
 *   - selectObra hits /atlas-code/works/{id}/state (snapshot includes
 *     sessions, sdd, receipt, gates, evidence in one call)
 *   - sendIntent uses bridge.sendIntent → polls /atlas-code/threads/{id}
 *
 * CANON · Atlas Code usa somente dados reais ou estados vazios explícitos.
 *   Bridge failures NEVER fall back to invented data. They fall back to:
 *   - empty array (sessions, messages, gates, evidence)
 *   - null (obra, receipt) → components render "—" / "aguardando Kernel"
 *   - error string captured in `errors[]`
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { bridge, type BridgeMode } from '../lib/bridge'
import { useExecutionStore } from '../state/executionStore'
import type {
  AtlasCodeEnterpriseCertificationReport,
  AtlasCodeForgeCompletionClaim,
  AtlasCodeForgeFastPathRunStatus,
  AtlasCodeForgeReviewDecisionResponse,
  AtlasCodeForgeReviewPacket,
  AtlasCodeForgeWorkIntake,
  AtlasCodeForgeWorkIntakePayload,
  AtlasForgeContinuumCertificationSummary,
  AtlasForgeProviderCapacity,
  AtlasForgeProviderFailureMemory,
  AtlasForgeProviderFailureMemoryEvent,
  AtlasForgeProviderTopology,
  AtlasCodeForgeUxOrchestrator,
  AtlasCodeObraCommandCenter,
  AtlasForgeProviderDriverPlanPacket,
  AtlasForgeProviderDriverStatus,
  AtlasForgeProviderInvocationReceipt,
  AtlasForgeProviderInvocationSnapshot,
  AtlasForgeRuntimeDispatchPlan,
  AtlasSelfImprovementForgeActivationState,
  AtlasSelfImprovementGovernanceState,
  AtlasSelfImprovementActivationCockpit,
  AtlasSelfImprovementActivationCockpitFilters,
  AtlasSelfImprovementActivationDetail,
  AtlasSelfImprovementActivationAcceptPayload,
  AtlasSelfImprovementActivationRejectPayload,
  AtlasSelfImprovementActivationCreatePayload,
  AtlasSelfImprovementProposalBacklog,
  AtlasSelfImprovementProposalBacklogItem,
  AtlasSelfImprovementProposalBacklogFilters,
  AtlasSelfImprovementProposalCreatePayload,
  AtlasSelfImprovementProposalPrioritizePayload,
  AtlasSelfImprovementClosedLoop,
  AtlasSelfImprovementResultLedger,
  AtlasSelfImprovementResultEntry,
  AtlasSelfImprovementNextCycleRecommendation,
  AtlasSelfImprovementMeasureResultPayload,
  AtlasSelfImprovementTrustLedgerEntry,
  AtlasSelfConstructionSnapshot,
  CoreStatus,
  DecisionReceipt,
  Message,
  Obra,
  ProgrammingGovernanceSnapshot,
  QualityGate,
  SddStage,
  Session,
  WorkStateSnapshot,
} from '@atlas/domain'
import { browserCoreStatus, idlePipeline, noGates, noMessages, noSessions } from '../data/empty'

export interface BridgeSnapshot {
  mode: BridgeMode
  loading: boolean
  /** Errors captured during boot/actions (latest first). Visible in UI. */
  errors: string[]
  obra: Obra | null
  obras: Obra[]
  active: Session[]
  recent: Session[]
  messages: Message[]
  receipt: DecisionReceipt | null
  gates: QualityGate[]
  sdd: SddStage[]
  evidence: WorkStateSnapshot['evidence']
  forgeLiveExecution: WorkStateSnapshot['forgeLiveExecution']
  forgeLiveExecutionAsync: WorkStateSnapshot['forgeLiveExecutionAsync']
  forgeLiveExecutionHistory: WorkStateSnapshot['forgeLiveExecutionHistory']
  forgeTaskQueue: WorkStateSnapshot['forgeTaskQueue']
  forgeFastPath: WorkStateSnapshot['forgeFastPath']
  forgeFastPathStatus: AtlasCodeForgeFastPathRunStatus | null
  forgeReviewPacket: AtlasCodeForgeReviewPacket | null
  forgeCompletionClaim: AtlasCodeForgeCompletionClaim | null
  forgeWorkIntake: AtlasCodeForgeWorkIntake | null
  forgeProviderTopology: AtlasForgeProviderTopology | null
  forgeContinuumCertification: AtlasForgeContinuumCertificationSummary | null
  forgeProviderCapacity: AtlasForgeProviderCapacity | null
  forgeProviderFailureMemory: AtlasForgeProviderFailureMemory | null
  selfImprovementGovernance: AtlasSelfImprovementGovernanceState | null
  selfImprovementActivation: AtlasSelfImprovementForgeActivationState | null
  selfImprovementActivationCockpit: AtlasSelfImprovementActivationCockpit | null
  selfImprovementProposalBacklog: AtlasSelfImprovementProposalBacklog | null
  selfImprovementClosedLoop: AtlasSelfImprovementClosedLoop | null
  selfImprovementResultLedger: AtlasSelfImprovementResultLedger | null
  selfImprovementNextCycle: AtlasSelfImprovementNextCycleRecommendation | null
  forgeRuntimeDispatch: AtlasForgeRuntimeDispatchPlan | null
  forgeProviderDriverStatus: AtlasForgeProviderDriverStatus | null
  forgeProviderInvocation: AtlasForgeProviderInvocationSnapshot | null
  forgeProviderInvocationReceipt: AtlasForgeProviderInvocationReceipt | null
  forgeUxOrchestrator: AtlasCodeForgeUxOrchestrator | null
  obraCommandCenter: AtlasCodeObraCommandCenter | null
  forgeRunHistoryReplay: WorkStateSnapshot['forgeRunHistoryReplay']
  forgeReview: WorkStateSnapshot['forgeReview']
  forgeReviewHistory: WorkStateSnapshot['forgeReviewHistory']
  checkpoint: WorkStateSnapshot['checkpoint']
  atlasCodeEnterpriseCertification: AtlasCodeEnterpriseCertificationReport | null
  /**
   * Atlas Self-Construction OS · Agent Control Plane Certification snapshot.
   *
   * Read-only diagnostic projection. `null` when the backend has not exposed
   * the endpoint yet, when the fetch fails, or when offline — the panel
   * renders an honest empty state in every case. The desktop NEVER triggers
   * the runtime through this slot; refresh only re-queries the snapshot.
   */
  selfConstruction: AtlasSelfConstructionSnapshot | null
  /**
   * SCOR-1 Programming Governance snapshot (WorkItem, Spec, Plan, Tasks,
   * GateRuns, Reviews, EvidenceReceipts). `null` when the backend has not
   * persisted governance for the selected Obra — UI must render honest empty
   * states, never fabricated values.
   */
  programmingGovernance: ProgrammingGovernanceSnapshot | null
  core: CoreStatus
  /** True while a write action (createObra, sendIntent, etc.) is in flight. */
  busy: boolean
  /** Active threadId (from snapshot) so the composer/streamer knows where to send. */
  activeThreadId: string | null
}

export interface BridgeActions {
  refresh: () => Promise<void>
  selectObra: (obraId: string) => Promise<void>
  createObra: (intent: string, objective: string) => Promise<Obra | null>
  sendIntent: (text: string) => Promise<void>
  runGate: (gateId: string) => Promise<void>
  signReceipt: () => Promise<void>
  applyDiff: (patchId: string) => Promise<void>
  runForgeLiveExecution: () => Promise<void>
  runForgeFastPath: (mode?: 'prepare_only' | 'execute_async' | 'execute_sync') => Promise<void>
  refreshForgeFastPathStatus: (runId?: string) => Promise<void>
  resumeForgeFastPath: (runId?: string) => Promise<void>
  refreshForgeReview: (runId?: string) => Promise<void>
  approveForgeReview: (runId?: string, payload?: { reviewer?: string; reason?: string }) => Promise<void>
  rejectForgeReview: (runId?: string, payload?: { reviewer?: string; reason?: string }) => Promise<void>
  rollbackForgeReview: (runId?: string, payload?: { reviewer?: string; reason?: string }) => Promise<void>
  refreshForgeWorkIntake: () => Promise<void>
  saveForgeWorkIntake: (payload: AtlasCodeForgeWorkIntakePayload) => Promise<void>
  refreshForgeProviderTopology: (options?: { simulateProviderFailure?: string; strategy?: string }) => Promise<void>
  refreshForgeContinuumCertification: (options?: { simulateProviderFailure?: string; strategy?: string; strict?: boolean }) => Promise<void>
  refreshForgeProviderCapacity: () => Promise<void>
  recordForgeProviderFailure: (payload: { provider: string; failureType: string; model?: string; role?: string; reason?: string }) => Promise<AtlasForgeProviderFailureMemoryEvent | null>
  refreshSelfImprovementGovernance: () => Promise<void>
  recordSelfImprovementTrustLedgerEntry: (payload: { outcome: string; proposalId?: string; reviewer?: string; reason?: string; area?: string }) => Promise<AtlasSelfImprovementTrustLedgerEntry | null>
  refreshSelfImprovementActivationCockpit: (filters?: AtlasSelfImprovementActivationCockpitFilters) => Promise<void>
  selectSelfImprovementActivation: (activationId: string | null) => Promise<void>
  createSelfImprovementForgeActivation: (payload: AtlasSelfImprovementActivationCreatePayload) => Promise<AtlasSelfImprovementActivationDetail | null>
  acceptSelfImprovementForgeActivation: (activationId: string, payload: AtlasSelfImprovementActivationAcceptPayload) => Promise<AtlasSelfImprovementActivationDetail | null>
  rejectSelfImprovementForgeActivation: (activationId: string, payload: AtlasSelfImprovementActivationRejectPayload) => Promise<AtlasSelfImprovementActivationDetail | null>
  refreshSelfImprovementProposalBacklog: (filters?: AtlasSelfImprovementProposalBacklogFilters) => Promise<void>
  createSelfImprovementProposal: (payload: AtlasSelfImprovementProposalCreatePayload) => Promise<AtlasSelfImprovementProposalBacklogItem | null>
  evaluateSelfImprovementProposal: (proposalId: string) => Promise<AtlasSelfImprovementProposalBacklogItem | null>
  prioritizeSelfImprovementProposal: (proposalId: string, payload?: AtlasSelfImprovementProposalPrioritizePayload) => Promise<AtlasSelfImprovementProposalBacklogItem | null>
  refreshSelfImprovementClosedLoop: (proposalId: string) => Promise<void>
  measureSelfImprovementResult: (proposalId: string, payload: AtlasSelfImprovementMeasureResultPayload) => Promise<AtlasSelfImprovementResultEntry | null>
  refreshSelfImprovementResultLedger: (filters?: { grade?: string; proposalId?: string }) => Promise<void>
  refreshSelfImprovementNextCycle: (opts?: { proposalId?: string; latest?: boolean }) => Promise<void>
  refreshForgeRuntimeDispatch: () => Promise<void>
  runForgeRuntimeDispatch: (options?: { role?: string; simulateProviderFailure?: string; createChildReceipt?: boolean; fastPathRunId?: string }) => Promise<void>
  refreshForgeProviderDrivers: () => Promise<void>
  planForgeProviderDriver: (options?: { role?: string; dispatchId?: string }) => Promise<AtlasForgeProviderDriverPlanPacket | null>
  runForgeProviderInvocation: (options?: { role?: string; mode?: 'dry_run' | 'execute'; dispatchId?: string; confirmProviderCall?: boolean; confirmBudget?: boolean; confirmRuntimeDispatch?: boolean; timeoutSeconds?: number }) => Promise<void>
  refreshForgeProviderInvocationLatest: () => Promise<void>
  refreshForgeUxOrchestrator: () => Promise<void>
  startForgeLiveExecutionAsync: () => Promise<void>
  refreshForgeLiveExecutionAsync: () => Promise<void>
  inspectForgeRunHistory: (historyId: string) => Promise<void>
  createProgrammingWorkItem: () => Promise<void>
  compileProgrammingWorkItemSpecPlan: () => Promise<void>
  reviewForgeRun: (decision?: 'approved' | 'rejected', comment?: string) => Promise<void>
  rollbackForgePromotion: (promotionId?: string, comment?: string) => Promise<void>
  createCheckpoint: () => Promise<void>
  runAtlasCodeEnterpriseCertification: () => Promise<void>
  /**
   * Re-query the Self-Construction Control Plane snapshot. Read-only —
   * never starts processes, never advances slices, never spends tokens.
   */
  refreshSelfConstruction: () => Promise<void>
}

const INITIAL: BridgeSnapshot = {
  mode: bridge.mode,
  loading: true,
  errors: [],
  obra: null,
  obras: [],
  active: noSessions,
  recent: noSessions,
  messages: noMessages,
  receipt: null,
  gates: noGates,
  sdd: idlePipeline,
  evidence: [],
  forgeLiveExecution: null,
  forgeLiveExecutionAsync: null,
  forgeLiveExecutionHistory: null,
  forgeTaskQueue: null,
  forgeFastPath: null,
  forgeFastPathStatus: null,
  forgeReviewPacket: null,
  forgeCompletionClaim: null,
  forgeWorkIntake: null,
  forgeProviderTopology: null,
  forgeContinuumCertification: null,
  forgeProviderCapacity: null,
  forgeProviderFailureMemory: null,
  selfImprovementGovernance: null,
  selfImprovementActivation: null,
  selfImprovementActivationCockpit: null,
  selfImprovementProposalBacklog: null,
  selfImprovementClosedLoop: null,
  selfImprovementResultLedger: null,
  selfImprovementNextCycle: null,
  forgeRuntimeDispatch: null,
  forgeProviderDriverStatus: null,
  forgeProviderInvocation: null,
  forgeProviderInvocationReceipt: null,
  forgeUxOrchestrator: null,
  obraCommandCenter: null,
  forgeRunHistoryReplay: null,
  forgeReview: null,
  forgeReviewHistory: null,
  checkpoint: null,
  atlasCodeEnterpriseCertification: null,
  selfConstruction: null,
  programmingGovernance: null,
  core: browserCoreStatus,
  busy: false,
  activeThreadId: null,
}

export function useBridge(): BridgeSnapshot & BridgeActions {
  const [snap, setSnap] = useState<BridgeSnapshot>(INITIAL)
  const cancelRef = useRef(false)
  const errorBufRef = useRef<string[]>([])

  const pushError = useCallback((label: string, e: unknown) => {
    const msg = `${label} · ${e instanceof Error ? e.message : String(e)}`
    errorBufRef.current = [msg, ...errorBufRef.current].slice(0, 10)
    setSnap((s) => ({ ...s, errors: [...errorBufRef.current] }))
  }, [])

  const loadObrasAndCore = useCallback(async (): Promise<{
    core: CoreStatus
    obras: Obra[]
    gates: QualityGate[]
    certification: AtlasCodeEnterpriseCertificationReport | null
    selfConstruction: AtlasSelfConstructionSnapshot | null
  }> => {
    const [core, obrasRaw, certification, selfConstruction] = await Promise.all([
      bridge.coreStatus().catch((e: unknown) => {
        pushError('coreStatus', e)
        return browserCoreStatus
      }),
      bridge.listObras().catch((e: unknown) => {
        pushError('listObras', e)
        return [] as Obra[]
      }),
      bridge.getAtlasCodeEnterpriseCertification().catch((e: unknown) => {
        pushError('getAtlasCodeEnterpriseCertification', e)
        return null
      }),
      // Self-Construction OS · read-only diagnostic. Bridge already returns
      // null on missing endpoint, but we keep the explicit catch so a future
      // throwing variant cannot poison `refresh()`.
      bridge.getAtlasSelfConstruction().catch((e: unknown) => {
        pushError('getAtlasSelfConstruction', e)
        return null
      }),
    ])
    return { core, obras: obrasRaw, gates: noGates, certification, selfConstruction }
  }, [pushError])

  const loadObraDetail = useCallback(
    async (obra: Obra): Promise<Partial<BridgeSnapshot>> => {
      const state = await bridge.getWorkState(obra.id).catch((e: unknown) => {
        pushError('getWorkState', e)
        return null
      })
      if (!state) {
        return {
          active: noSessions,
          messages: noMessages,
          sdd: idlePipeline,
          evidence: [],
          forgeLiveExecution: null,
          forgeLiveExecutionAsync: null,
          forgeLiveExecutionHistory: null,
          forgeTaskQueue: null,
          forgeFastPath: null,
          forgeRunHistoryReplay: null,
          forgeReview: null,
          forgeReviewHistory: null,
          forgeReviewPacket: null,
          forgeCompletionClaim: null,
          forgeWorkIntake: null,
          forgeProviderTopology: null,
          forgeContinuumCertification: null,
          forgeRuntimeDispatch: null,
          forgeProviderDriverStatus: null,
          forgeProviderInvocation: null,
          forgeProviderInvocationReceipt: null,
          forgeUxOrchestrator: null,
          obraCommandCenter: null,
          selfImprovementGovernance: null,
          selfImprovementActivation: null,
          checkpoint: null,
          atlasCodeEnterpriseCertification: null,
          programmingGovernance: null,
          receipt: null,
          activeThreadId: null,
        }
      }
      const sessions: Session[] = state.sessions.map((s) => ({
        id: s.id,
        obraId: obra.id,
        threadId: s.id,
        title: s.title,
        status: s.status,
        turns: s.turns,
        durationMs: 0,
        origin: 'manual',
      }))
      return {
        active: sessions,
        messages: state.messages,
        sdd: state.sdd.steps.length > 0 ? state.sdd.steps : idlePipeline,
        gates: state.gates.length > 0 ? state.gates : snap.gates,
        evidence: state.evidence,
        forgeLiveExecution: state.forgeLiveExecution,
        forgeLiveExecutionAsync: state.forgeLiveExecutionAsync,
        forgeLiveExecutionHistory: state.forgeLiveExecutionHistory,
        forgeTaskQueue: state.forgeTaskQueue,
        forgeFastPath: state.forgeFastPath,
        forgeReview: state.forgeReview,
        forgeReviewHistory: state.forgeReviewHistory,
        forgeReviewPacket: state.forgeReviewPacket ?? null,
        forgeCompletionClaim: state.forgeCompletionClaim ?? null,
        forgeWorkIntake: state.forgeWorkIntake ?? null,
        forgeProviderTopology: state.forgeProviderTopology ?? null,
        forgeContinuumCertification: state.forgeContinuumCertification ?? null,
        forgeRuntimeDispatch: state.forgeRuntimeDispatch ?? null,
        forgeProviderDriverStatus: state.forgeProviderDriverStatus ?? null,
        forgeProviderInvocation: state.forgeProviderInvocation ?? null,
        forgeProviderInvocationReceipt: state.forgeProviderInvocationReceipt ?? null,
        forgeUxOrchestrator: state.forgeUxOrchestrator ?? null,
        obraCommandCenter: state.obraCommandCenter ?? null,
        selfImprovementGovernance: state.selfImprovementGovernance ?? null,
        selfImprovementActivation: state.selfImprovementActivation ?? null,
        checkpoint: state.checkpoint,
        atlasCodeEnterpriseCertification: state.atlasCodeEnterpriseCertification,
        programmingGovernance: state.programmingGovernance,
        receipt: state.receipt,
        activeThreadId: state.activeThreadId,
      }
    },
    [pushError, snap.gates]
  )

  const refresh = useCallback(async () => {
    setSnap((s) => ({ ...s, loading: true, busy: true }))
    const { core, obras, gates, certification, selfConstruction } = await loadObrasAndCore()
    const obra = obras[0] ?? null
    const detail = obra
      ? await loadObraDetail(obra)
      : {}
    if (cancelRef.current) return
    setSnap((s) => ({
      ...s,
      mode: bridge.mode,
      loading: false,
      busy: false,
      errors: [...errorBufRef.current],
      core,
      obras,
      obra,
      gates,
      ...detail,
      atlasCodeEnterpriseCertification: detail.atlasCodeEnterpriseCertification ?? certification,
      selfConstruction,
    }))
  }, [loadObrasAndCore, loadObraDetail])

  const refreshSelfConstruction = useCallback(async () => {
    setSnap((s) => ({ ...s, busy: true }))
    try {
      const next = await bridge.getAtlasSelfConstruction()
      if (!cancelRef.current) {
        setSnap((s) => ({
          ...s,
          selfConstruction: next,
          busy: false,
          errors: [...errorBufRef.current],
        }))
      }
    } catch (e) {
      pushError('refreshSelfConstruction', e)
      if (!cancelRef.current) {
        setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
      }
    }
  }, [pushError])

  const selectObra = useCallback(
    async (obraId: string) => {
      // Switching Obra during a live trace: drop the cockpit, the stream
      // belongs to the previous Obra and should not bleed into this one.
      useExecutionStore.getState().clearTrace()
      const fromState = snap.obras.find((o) => o.id === obraId)
      let resolved: Obra | null = fromState ?? null
      if (!resolved) {
        try {
          const fresh = await bridge.listObras()
          resolved = fresh.find((o) => o.id === obraId) ?? null
        } catch (e) {
          pushError('selectObra', e)
        }
      }
      if (!resolved) return
      setSnap((s) => ({ ...s, busy: true }))
      const detail = await loadObraDetail(resolved)
      if (cancelRef.current) return
      setSnap((s) => ({
        ...s,
        busy: false,
        obra: resolved,
        forgeRunHistoryReplay: null,
        ...detail,
        errors: [...errorBufRef.current],
      }))
    },
    [snap.obras, loadObraDetail, pushError]
  )

  const createObra = useCallback(
    async (intent: string, objective: string): Promise<Obra | null> => {
      setSnap((s) => ({ ...s, busy: true }))
      try {
        const created = await bridge.createObra(intent, objective)
        if (!created?.id) {
          pushError('createObra', new Error('server returned no obra'))
          setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
          return null
        }
        const detail = await loadObraDetail(created)
        if (cancelRef.current) return created
        setSnap((s) => ({
          ...s,
          busy: false,
          obra: created,
          obras: [created, ...s.obras.filter((o) => o.id !== created.id)],
          forgeRunHistoryReplay: null,
          ...detail,
          errors: [...errorBufRef.current],
        }))
        return created
      } catch (e) {
        pushError('createObra', e)
        setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
        return null
      }
    },
    [loadObraDetail, pushError]
  )

  const sendIntent = useCallback(
    async (text: string) => {
      const threadId = snap.activeThreadId ?? snap.active[0]?.threadId ?? null
      const obraId = snap.obra?.id
      setSnap((s) => ({ ...s, busy: true }))

      // Baseline so polling can detect a NEW assistant message instead of
      // mistaking an older atlas reply for the response we are waiting on.
      const baselineLength = snap.messages.length
      const baselineLastAssistantId =
        [...snap.messages].reverse().find((m) => m.role === 'atlas')?.id ?? null

      const optimisticId = `local-${Date.now()}`
      const optimistic: Message = {
        id: optimisticId,
        role: 'user',
        body: text,
        ts: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      }
      setSnap((s) => ({ ...s, messages: [...s.messages, optimistic] }))

      try {
        const res = await bridge.sendIntent(threadId, text, 'text', obraId)
        const newThreadId = res.threadId
        if (!newThreadId) {
          setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
          return
        }

        const hasNewAssistant = (fresh: Message[]) => {
          if (fresh.length <= baselineLength) return false
          const lastAtlas = [...fresh].reverse().find((m) => m.role === 'atlas')
          if (!lastAtlas) return false
          return lastAtlas.id !== baselineLastAssistantId
        }

        // Hand the trace off to the Live Cockpit store. The same SSE stream
        // feeds both: messages refresh (sendIntent) AND checkpoint banner
        // (executionStore.ingest). Single connection per trace.
        useExecutionStore.getState().setActiveTrace(res.traceId)

        // Try SSE first; if no events arrive in time, fall back to polling.
        let sseClosed = false
        let assistantSeen = false
        const unsubscribe = bridge.streamSession(res.traceId, (event) => {
          if (sseClosed) return
          useExecutionStore.getState().ingest(event)
          if (event.eventType === 'message' || event.eventType === 'assistant_message') {
            void (async () => {
              try {
                const fresh = await bridge.getSession(newThreadId)
                if (!cancelRef.current && fresh.length > 0) {
                  setSnap((s) => ({ ...s, messages: fresh }))
                  if (hasNewAssistant(fresh)) assistantSeen = true
                }
              } catch { /* ignore */ }
            })()
          }
        })

        // Polling fallback: persist until trace terminal OR new assistant
        // observed OR 60s cap. Trace status is cheap (single row read).
        const deadline = Date.now() + 60_000
        while (!cancelRef.current && !assistantSeen && Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 1500))
          if (cancelRef.current) {
            unsubscribe()
            return
          }
          try {
            const fresh = await bridge.getSession(newThreadId)
            if (fresh.length > 0) {
              setSnap((s) => ({ ...s, messages: fresh }))
              if (hasNewAssistant(fresh)) {
                assistantSeen = true
                break
              }
            }
          } catch {
            /* keep polling */
          }
        }
        sseClosed = true
        unsubscribe()

        if (obraId && snap.obra) {
          // Refresh snapshot so SDD pipeline + sessions reflect new turn.
          const detail = await loadObraDetail(snap.obra)
          if (!cancelRef.current) {
            setSnap((s) => ({ ...s, ...detail, busy: false, errors: [...errorBufRef.current] }))
          }
        } else if (!cancelRef.current) {
          setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
        }
      } catch (e) {
        pushError('sendIntent', e)
        useExecutionStore.getState().clearTrace()
        setSnap((s) => ({
          ...s,
          busy: false,
          messages: s.messages.filter((m) => m.id !== optimisticId),
          errors: [...errorBufRef.current],
        }))
      }
    },
    [snap.obra, snap.active, snap.activeThreadId, loadObraDetail, pushError]
  )

  const runGate = useCallback(
    async (gateId: string) => {
      setSnap((s) => ({ ...s, busy: true }))
      try {
        await bridge.runGate(gateId)
        await refresh()
      } catch (e) {
        pushError('runGate', e)
        setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
      }
    },
    [refresh, pushError]
  )

  const signReceipt = useCallback(async () => {
    if (!snap.receipt?.id) return
    setSnap((s) => ({ ...s, busy: true }))
    try {
      const ack = await bridge.signAndSubmit(snap.receipt.id)
      if (!ack.signatureValid) throw new Error('server rejected signature')
      // Refresh receipt to reflect signed state
      const refreshed = await bridge.getReceipt(snap.receipt.id)
      if (!cancelRef.current) {
        setSnap((s) => ({ ...s, busy: false, receipt: refreshed ?? s.receipt, errors: [...errorBufRef.current] }))
      }
    } catch (e) {
      pushError('signReceipt', e)
      setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
    }
  }, [snap.receipt, pushError])

  const runForgeLiveExecution = useCallback(async () => {
    if (!snap.obra?.id) {
      pushError('runForgeLiveExecution', new Error('obra_required'))
      return
    }
    setSnap((s) => ({ ...s, busy: true }))
    try {
      const result = await bridge.runForgeLiveExecution(snap.obra.id)
      const detail = await loadObraDetail(snap.obra)
      if (!cancelRef.current) {
        setSnap((s) => ({
          ...s,
          ...detail,
          forgeLiveExecution: detail.forgeLiveExecution ?? result ?? s.forgeLiveExecution,
          forgeRunHistoryReplay: null,
          busy: false,
          errors: [...errorBufRef.current],
        }))
      }
    } catch (e) {
      pushError('runForgeLiveExecution', e)
      setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
    }
  }, [snap.obra, loadObraDetail, pushError])

  const runForgeFastPath = useCallback(async (mode: 'prepare_only' | 'execute_async' | 'execute_sync' = 'execute_async') => {
    if (!snap.obra?.id) {
      pushError('runForgeFastPath', new Error('obra_required'))
      return
    }
    setSnap((s) => ({ ...s, busy: true }))
    try {
      const report = await bridge.runForgeFastPath(snap.obra.id, { mode })
      const detail = await loadObraDetail(snap.obra)
      let statusReport = null as Awaited<ReturnType<typeof bridge.getForgeFastPathStatus>> | null
      if (report.fastPathRunId) {
        try {
          statusReport = await bridge.getForgeFastPathStatus(snap.obra.id, report.fastPathRunId)
        } catch {
          /* status falha não bloqueia execução */
        }
      }
      if (!cancelRef.current) {
        setSnap((s) => ({
          ...s,
          ...detail,
          forgeFastPath: detail.forgeFastPath ?? report ?? s.forgeFastPath,
          forgeFastPathStatus: statusReport ?? s.forgeFastPathStatus ?? null,
          busy: false,
          errors: [...errorBufRef.current],
        }))
      }
    } catch (e) {
      pushError('runForgeFastPath', e)
      setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
    }
  }, [snap.obra, loadObraDetail, pushError])

  const refreshForgeFastPathStatus = useCallback(async (runId?: string) => {
    if (!snap.obra?.id) {
      pushError('refreshForgeFastPathStatus', new Error('obra_required'))
      return
    }
    const effectiveRunId = runId ?? snap.forgeFastPath?.fastPathRunId ?? snap.forgeFastPathStatus?.fastPathRunId ?? null
    if (!effectiveRunId) {
      pushError('refreshForgeFastPathStatus', new Error('fast_path_run_id_required'))
      return
    }
    setSnap((s) => ({ ...s, busy: true }))
    try {
      const statusReport = await bridge.getForgeFastPathStatus(snap.obra.id, effectiveRunId)
      if (!cancelRef.current) {
        setSnap((s) => ({
          ...s,
          forgeFastPathStatus: statusReport,
          busy: false,
          errors: [...errorBufRef.current],
        }))
      }
    } catch (e) {
      pushError('refreshForgeFastPathStatus', e)
      setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
    }
  }, [snap.obra, snap.forgeFastPath, snap.forgeFastPathStatus, pushError])

  const resumeForgeFastPath = useCallback(async (runId?: string) => {
    if (!snap.obra?.id) {
      pushError('resumeForgeFastPath', new Error('obra_required'))
      return
    }
    const effectiveRunId = runId ?? snap.forgeFastPath?.fastPathRunId ?? snap.forgeFastPathStatus?.fastPathRunId ?? null
    if (!effectiveRunId) {
      pushError('resumeForgeFastPath', new Error('fast_path_run_id_required'))
      return
    }
    setSnap((s) => ({ ...s, busy: true }))
    try {
      const statusReport = await bridge.resumeForgeFastPath(snap.obra.id, effectiveRunId)
      const detail = await loadObraDetail(snap.obra)
      if (!cancelRef.current) {
        setSnap((s) => ({
          ...s,
          ...detail,
          forgeFastPathStatus: statusReport,
          busy: false,
          errors: [...errorBufRef.current],
        }))
      }
    } catch (e) {
      pushError('resumeForgeFastPath', e)
      setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
    }
  }, [snap.obra, snap.forgeFastPath, snap.forgeFastPathStatus, loadObraDetail, pushError])

  const resolveReviewRunId = useCallback((runId?: string): string | null => {
    return (
      runId
      ?? snap.forgeFastPathStatus?.fastPathRunId
      ?? snap.forgeFastPath?.fastPathRunId
      ?? snap.forgeReviewPacket?.fastPathRunId
      ?? null
    )
  }, [snap.forgeFastPath, snap.forgeFastPathStatus, snap.forgeReviewPacket])

  const refreshForgeReview = useCallback(async (runId?: string) => {
    if (!snap.obra?.id) {
      pushError('refreshForgeReview', new Error('obra_required'))
      return
    }
    const effectiveRunId = resolveReviewRunId(runId)
    if (!effectiveRunId) {
      pushError('refreshForgeReview', new Error('fast_path_run_id_required'))
      return
    }
    setSnap((s) => ({ ...s, busy: true }))
    try {
      const packet = await bridge.getForgeReviewPacket(snap.obra.id, effectiveRunId)
      const detail = await loadObraDetail(snap.obra)
      let statusReport = null as Awaited<ReturnType<typeof bridge.getForgeFastPathStatus>> | null
      try {
        statusReport = await bridge.getForgeFastPathStatus(snap.obra.id, effectiveRunId)
      } catch {
        /* status falha não bloqueia refresh */
      }
      if (!cancelRef.current) {
        setSnap((s) => ({
          ...s,
          ...detail,
          forgeReviewPacket: packet ?? detail.forgeReviewPacket ?? null,
          forgeCompletionClaim: detail.forgeCompletionClaim ?? s.forgeCompletionClaim ?? null,
          forgeFastPathStatus: statusReport ?? s.forgeFastPathStatus ?? null,
          busy: false,
          errors: [...errorBufRef.current],
        }))
      }
    } catch (e) {
      pushError('refreshForgeReview', e)
      setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
    }
  }, [snap.obra, loadObraDetail, pushError, resolveReviewRunId])

  const decideForgeReview = useCallback(
    async (
      label: 'approveForgeReview' | 'rejectForgeReview' | 'rollbackForgeReview',
      fn: (obraId: string, runId: string, payload: { reviewer: string; reason: string }) => Promise<AtlasCodeForgeReviewDecisionResponse>,
      runId?: string,
      payload?: { reviewer?: string; reason?: string },
    ) => {
      if (!snap.obra?.id) {
        pushError(label, new Error('obra_required'))
        return
      }
      const effectiveRunId = resolveReviewRunId(runId)
      if (!effectiveRunId) {
        pushError(label, new Error('fast_path_run_id_required'))
        return
      }
      const reviewer = (payload?.reviewer ?? '').trim() || 'atlas-code-local-operator'
      const reason = (payload?.reason ?? '').trim() || `forge_review_${label}`
      setSnap((s) => ({ ...s, busy: true }))
      try {
        const decision = await fn(snap.obra.id, effectiveRunId, { reviewer, reason })
        const detail = await loadObraDetail(snap.obra)
        let statusReport = null as Awaited<ReturnType<typeof bridge.getForgeFastPathStatus>> | null
        try {
          statusReport = await bridge.getForgeFastPathStatus(snap.obra.id, effectiveRunId)
        } catch {
          /* status falha não bloqueia decisão */
        }
        if (!cancelRef.current) {
          setSnap((s) => ({
            ...s,
            ...detail,
            forgeReviewPacket: decision.reviewPacket ?? detail.forgeReviewPacket ?? s.forgeReviewPacket,
            forgeCompletionClaim:
              decision.completionClaim ?? detail.forgeCompletionClaim ?? s.forgeCompletionClaim,
            forgeFastPathStatus: statusReport ?? s.forgeFastPathStatus ?? null,
            busy: false,
            errors: [...errorBufRef.current],
          }))
        }
      } catch (e) {
        pushError(label, e)
        setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
      }
    },
    [snap.obra, loadObraDetail, pushError, resolveReviewRunId],
  )

  const approveForgeReview = useCallback(
    async (runId?: string, payload?: { reviewer?: string; reason?: string }) => {
      await decideForgeReview('approveForgeReview', bridge.approveForgeReview, runId, payload)
    },
    [decideForgeReview],
  )

  const rejectForgeReview = useCallback(
    async (runId?: string, payload?: { reviewer?: string; reason?: string }) => {
      await decideForgeReview('rejectForgeReview', bridge.rejectForgeReview, runId, payload)
    },
    [decideForgeReview],
  )

  const rollbackForgeReview = useCallback(
    async (runId?: string, payload?: { reviewer?: string; reason?: string }) => {
      await decideForgeReview('rollbackForgeReview', bridge.rollbackForgeReview, runId, payload)
    },
    [decideForgeReview],
  )

  const refreshForgeWorkIntake = useCallback(async () => {
    if (!snap.obra?.id) {
      pushError('refreshForgeWorkIntake', new Error('obra_required'))
      return
    }
    setSnap((s) => ({ ...s, busy: true }))
    try {
      const intake = await bridge.getForgeWorkIntake(snap.obra.id)
      if (!cancelRef.current) {
        setSnap((s) => ({ ...s, forgeWorkIntake: intake, busy: false, errors: [...errorBufRef.current] }))
      }
    } catch (e) {
      pushError('refreshForgeWorkIntake', e)
      setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
    }
  }, [snap.obra, pushError])

  const saveForgeWorkIntake = useCallback(
    async (payload: AtlasCodeForgeWorkIntakePayload) => {
      if (!snap.obra?.id) {
        pushError('saveForgeWorkIntake', new Error('obra_required'))
        return
      }
      setSnap((s) => ({ ...s, busy: true }))
      try {
        const intake = await bridge.saveForgeWorkIntake(snap.obra.id, payload)
        const detail = await loadObraDetail(snap.obra)
        if (!cancelRef.current) {
          setSnap((s) => ({
            ...s,
            ...detail,
            forgeWorkIntake: intake ?? detail.forgeWorkIntake ?? s.forgeWorkIntake,
            busy: false,
            errors: [...errorBufRef.current],
          }))
        }
      } catch (e) {
        pushError('saveForgeWorkIntake', e)
        setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
      }
    },
    [snap.obra, loadObraDetail, pushError],
  )

  const refreshForgeProviderTopology = useCallback(
    async (options?: { simulateProviderFailure?: string; strategy?: string }) => {
      if (!snap.obra?.id) {
        pushError('refreshForgeProviderTopology', new Error('obra_required'))
        return
      }
      setSnap((s) => ({ ...s, busy: true }))
      try {
        const topology = await bridge.getForgeProviderTopology(snap.obra.id, options ?? {})
        if (!cancelRef.current) {
          setSnap((s) => ({
            ...s,
            forgeProviderTopology: topology,
            busy: false,
            errors: [...errorBufRef.current],
          }))
        }
      } catch (e) {
        pushError('refreshForgeProviderTopology', e)
        setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
      }
    },
    [snap.obra, pushError],
  )

  const refreshForgeContinuumCertification = useCallback(
    async (options?: { simulateProviderFailure?: string; strategy?: string; strict?: boolean }) => {
      if (!snap.obra?.id) {
        pushError('refreshForgeContinuumCertification', new Error('obra_required'))
        return
      }
      setSnap((s) => ({ ...s, busy: true }))
      try {
        const cert = await bridge.getForgeContinuumCertification(snap.obra.id, options ?? {})
        if (!cancelRef.current) {
          setSnap((s) => ({
            ...s,
            forgeContinuumCertification: cert,
            busy: false,
            errors: [...errorBufRef.current],
          }))
        }
      } catch (e) {
        pushError('refreshForgeContinuumCertification', e)
        setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
      }
    },
    [snap.obra, pushError],
  )

  const refreshForgeProviderCapacity = useCallback(async () => {
    setSnap((s) => ({ ...s, busy: true }))
    try {
      const capacity = await bridge.getForgeProviderCapacity(snap.obra?.id ?? null)
      if (!cancelRef.current) {
        setSnap((s) => ({
          ...s,
          forgeProviderCapacity: capacity,
          busy: false,
          errors: [...errorBufRef.current],
        }))
      }
    } catch (e) {
      pushError('refreshForgeProviderCapacity', e)
      setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
    }
  }, [snap.obra, pushError])

  const recordForgeProviderFailure = useCallback(
    async (payload: { provider: string; failureType: string; model?: string; role?: string; reason?: string }) => {
      if (!snap.obra?.id) {
        pushError('recordForgeProviderFailure', new Error('obra_required'))
        return null
      }
      setSnap((s) => ({ ...s, busy: true }))
      try {
        const result = await bridge.recordForgeProviderFailure(snap.obra.id, payload)
        if (!cancelRef.current) {
          setSnap((s) => ({
            ...s,
            forgeProviderCapacity: result.capacity ?? s.forgeProviderCapacity,
            forgeProviderFailureMemory: result.memory ?? s.forgeProviderFailureMemory,
            busy: false,
            errors: [...errorBufRef.current],
          }))
        }
        return result.event
      } catch (e) {
        pushError('recordForgeProviderFailure', e)
        setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
        return null
      }
    },
    [snap.obra, pushError],
  )

  const refreshSelfImprovementGovernance = useCallback(async () => {
    setSnap((s) => ({ ...s, busy: true }))
    try {
      const obraId = snap.obra?.id ?? null
      const trustLedger = obraId ? await bridge.getSelfImprovementTrustLedger(obraId) : null
      const portfolio = await bridge.getSelfImprovementStrategyPortfolio()
      if (!cancelRef.current) {
        setSnap((s) => ({
          ...s,
          selfImprovementGovernance: {
            schemaVersion: 'atlas.self_improvement.governance_state.v1',
            trustLedger,
            strategyPortfolio: portfolio,
            commands: {},
            externalProviderCall: false,
            separatedFrom: 'external_rivals_certification',
          },
          busy: false,
          errors: [...errorBufRef.current],
        }))
      }
    } catch (e) {
      pushError('refreshSelfImprovementGovernance', e)
      setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
    }
  }, [snap.obra, pushError])

  const recordSelfImprovementTrustLedgerEntry = useCallback(
    async (payload: { outcome: string; proposalId?: string; reviewer?: string; reason?: string; area?: string }) => {
      if (!snap.obra?.id) {
        pushError('recordSelfImprovementTrustLedgerEntry', new Error('obra_required'))
        return null
      }
      setSnap((s) => ({ ...s, busy: true }))
      try {
        const entry = await bridge.recordSelfImprovementTrustLedgerEntry(snap.obra.id, payload)
        const trustLedger = await bridge.getSelfImprovementTrustLedger(snap.obra.id)
        if (!cancelRef.current) {
          setSnap((s) => ({
            ...s,
            selfImprovementGovernance: {
              schemaVersion: 'atlas.self_improvement.governance_state.v1',
              trustLedger,
              strategyPortfolio: s.selfImprovementGovernance?.strategyPortfolio ?? null,
              commands: s.selfImprovementGovernance?.commands ?? {},
              externalProviderCall: false,
              separatedFrom: 'external_rivals_certification',
            },
            busy: false,
            errors: [...errorBufRef.current],
          }))
        }
        return entry
      } catch (e) {
        pushError('recordSelfImprovementTrustLedgerEntry', e)
        setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
        return null
      }
    },
    [snap.obra, pushError],
  )

  const refreshSelfImprovementActivationCockpit = useCallback(
    async (filters?: AtlasSelfImprovementActivationCockpitFilters) => {
      setSnap((s) => ({ ...s, busy: true }))
      try {
        const cockpit = await bridge.listSelfImprovementForgeActivations(filters)
        if (!cancelRef.current) {
          setSnap((s) => ({
            ...s,
            selfImprovementActivationCockpit: cockpit,
            busy: false,
            errors: [...errorBufRef.current],
          }))
        }
      } catch (e) {
        pushError('refreshSelfImprovementActivationCockpit', e)
        setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
      }
    },
    [pushError],
  )

  const selectSelfImprovementActivation = useCallback(
    async (activationId: string | null) => {
      if (activationId === null) {
        // Drop selected_activation while preserving the list/counters.
        setSnap((s) => ({
          ...s,
          selfImprovementActivationCockpit: s.selfImprovementActivationCockpit
            ? { ...s.selfImprovementActivationCockpit, selectedActivation: null }
            : null,
        }))
        return
      }
      setSnap((s) => ({ ...s, busy: true }))
      try {
        const cockpit = await bridge.getSelfImprovementForgeActivation(activationId)
        if (!cancelRef.current) {
          setSnap((s) => ({
            ...s,
            selfImprovementActivationCockpit: cockpit,
            busy: false,
            errors: [...errorBufRef.current],
          }))
        }
      } catch (e) {
        pushError('selectSelfImprovementActivation', e)
        setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
      }
    },
    [pushError],
  )

  const createSelfImprovementForgeActivation = useCallback(
    async (payload: AtlasSelfImprovementActivationCreatePayload) => {
      setSnap((s) => ({ ...s, busy: true }))
      try {
        const detail = await bridge.createSelfImprovementForgeActivation(payload)
        // Refresh the cockpit list so the new activation shows up.
        const cockpit = await bridge.listSelfImprovementForgeActivations()
        if (!cancelRef.current) {
          setSnap((s) => ({
            ...s,
            selfImprovementActivationCockpit: cockpit
              ? { ...cockpit, selectedActivation: detail }
              : s.selfImprovementActivationCockpit,
            busy: false,
            errors: [...errorBufRef.current],
          }))
        }
        return detail
      } catch (e) {
        pushError('createSelfImprovementForgeActivation', e)
        setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
        return null
      }
    },
    [pushError],
  )

  const acceptSelfImprovementForgeActivation = useCallback(
    async (activationId: string, payload: AtlasSelfImprovementActivationAcceptPayload) => {
      setSnap((s) => ({ ...s, busy: true }))
      try {
        const detail = await bridge.acceptSelfImprovementForgeActivation(activationId, payload)
        const cockpit = await bridge.listSelfImprovementForgeActivations()
        if (!cancelRef.current) {
          setSnap((s) => ({
            ...s,
            selfImprovementActivationCockpit: cockpit
              ? { ...cockpit, selectedActivation: detail }
              : s.selfImprovementActivationCockpit,
            busy: false,
            errors: [...errorBufRef.current],
          }))
        }
        return detail
      } catch (e) {
        pushError('acceptSelfImprovementForgeActivation', e)
        setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
        return null
      }
    },
    [pushError],
  )

  const rejectSelfImprovementForgeActivation = useCallback(
    async (activationId: string, payload: AtlasSelfImprovementActivationRejectPayload) => {
      setSnap((s) => ({ ...s, busy: true }))
      try {
        const detail = await bridge.rejectSelfImprovementForgeActivation(activationId, payload)
        const cockpit = await bridge.listSelfImprovementForgeActivations()
        if (!cancelRef.current) {
          setSnap((s) => ({
            ...s,
            selfImprovementActivationCockpit: cockpit
              ? { ...cockpit, selectedActivation: detail }
              : s.selfImprovementActivationCockpit,
            busy: false,
            errors: [...errorBufRef.current],
          }))
        }
        return detail
      } catch (e) {
        pushError('rejectSelfImprovementForgeActivation', e)
        setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
        return null
      }
    },
    [pushError],
  )

  const refreshSelfImprovementProposalBacklog = useCallback(
    async (filters?: AtlasSelfImprovementProposalBacklogFilters) => {
      setSnap((s) => ({ ...s, busy: true }))
      try {
        const backlog = await bridge.listSelfImprovementProposalBacklog(filters)
        if (!cancelRef.current) {
          setSnap((s) => ({
            ...s,
            selfImprovementProposalBacklog: backlog,
            busy: false,
            errors: [...errorBufRef.current],
          }))
        }
      } catch (e) {
        pushError('refreshSelfImprovementProposalBacklog', e)
        setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
      }
    },
    [pushError],
  )

  const createSelfImprovementProposal = useCallback(
    async (payload: AtlasSelfImprovementProposalCreatePayload) => {
      setSnap((s) => ({ ...s, busy: true }))
      try {
        const item = await bridge.createSelfImprovementProposal(payload)
        const backlog = await bridge.listSelfImprovementProposalBacklog()
        if (!cancelRef.current) {
          setSnap((s) => ({
            ...s,
            selfImprovementProposalBacklog: backlog,
            busy: false,
            errors: [...errorBufRef.current],
          }))
        }
        return item
      } catch (e) {
        pushError('createSelfImprovementProposal', e)
        setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
        return null
      }
    },
    [pushError],
  )

  const evaluateSelfImprovementProposal = useCallback(
    async (proposalId: string) => {
      setSnap((s) => ({ ...s, busy: true }))
      try {
        const item = await bridge.evaluateSelfImprovementProposal(proposalId)
        const backlog = await bridge.listSelfImprovementProposalBacklog()
        if (!cancelRef.current) {
          setSnap((s) => ({
            ...s,
            selfImprovementProposalBacklog: backlog,
            busy: false,
            errors: [...errorBufRef.current],
          }))
        }
        return item
      } catch (e) {
        pushError('evaluateSelfImprovementProposal', e)
        setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
        return null
      }
    },
    [pushError],
  )

  const prioritizeSelfImprovementProposal = useCallback(
    async (proposalId: string, payload?: AtlasSelfImprovementProposalPrioritizePayload) => {
      setSnap((s) => ({ ...s, busy: true }))
      try {
        const item = await bridge.prioritizeSelfImprovementProposal(proposalId, payload)
        const backlog = await bridge.listSelfImprovementProposalBacklog()
        if (!cancelRef.current) {
          setSnap((s) => ({
            ...s,
            selfImprovementProposalBacklog: backlog,
            busy: false,
            errors: [...errorBufRef.current],
          }))
        }
        return item
      } catch (e) {
        pushError('prioritizeSelfImprovementProposal', e)
        setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
        return null
      }
    },
    [pushError],
  )

  const refreshSelfImprovementClosedLoop = useCallback(
    async (proposalId: string) => {
      setSnap((s) => ({ ...s, busy: true }))
      try {
        const loop = await bridge.getSelfImprovementClosedLoop(proposalId)
        if (!cancelRef.current) {
          setSnap((s) => ({
            ...s,
            selfImprovementClosedLoop: loop,
            busy: false,
            errors: [...errorBufRef.current],
          }))
        }
      } catch (e) {
        pushError('refreshSelfImprovementClosedLoop', e)
        setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
      }
    },
    [pushError],
  )

  const measureSelfImprovementResult = useCallback(
    async (proposalId: string, payload: AtlasSelfImprovementMeasureResultPayload) => {
      setSnap((s) => ({ ...s, busy: true }))
      try {
        const entry = await bridge.measureSelfImprovementResult(proposalId, payload)
        // Refresh ledger + closed loop for the proposal.
        const [ledger, loop] = await Promise.all([
          bridge.listSelfImprovementResultLedger(),
          bridge.getSelfImprovementClosedLoop(proposalId),
        ])
        if (!cancelRef.current) {
          setSnap((s) => ({
            ...s,
            selfImprovementResultLedger: ledger,
            selfImprovementClosedLoop: loop,
            busy: false,
            errors: [...errorBufRef.current],
          }))
        }
        return entry
      } catch (e) {
        pushError('measureSelfImprovementResult', e)
        setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
        return null
      }
    },
    [pushError],
  )

  const refreshSelfImprovementResultLedger = useCallback(
    async (filters?: { grade?: string; proposalId?: string }) => {
      setSnap((s) => ({ ...s, busy: true }))
      try {
        const ledger = await bridge.listSelfImprovementResultLedger(filters)
        if (!cancelRef.current) {
          setSnap((s) => ({
            ...s,
            selfImprovementResultLedger: ledger,
            busy: false,
            errors: [...errorBufRef.current],
          }))
        }
      } catch (e) {
        pushError('refreshSelfImprovementResultLedger', e)
        setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
      }
    },
    [pushError],
  )

  const refreshSelfImprovementNextCycle = useCallback(
    async (opts?: { proposalId?: string; latest?: boolean }) => {
      setSnap((s) => ({ ...s, busy: true }))
      try {
        const rec = await bridge.getSelfImprovementNextCycle(opts)
        if (!cancelRef.current) {
          setSnap((s) => ({
            ...s,
            selfImprovementNextCycle: rec,
            busy: false,
            errors: [...errorBufRef.current],
          }))
        }
      } catch (e) {
        pushError('refreshSelfImprovementNextCycle', e)
        setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
      }
    },
    [pushError],
  )

  const refreshForgeRuntimeDispatch = useCallback(async () => {
    if (!snap.obra?.id) {
      pushError('refreshForgeRuntimeDispatch', new Error('obra_required'))
      return
    }
    setSnap((s) => ({ ...s, busy: true }))
    try {
      const plan = await bridge.getForgeRuntimeDispatch(snap.obra.id)
      if (!cancelRef.current) {
        setSnap((s) => ({
          ...s,
          forgeRuntimeDispatch: plan,
          busy: false,
          errors: [...errorBufRef.current],
        }))
      }
    } catch (e) {
      pushError('refreshForgeRuntimeDispatch', e)
      setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
    }
  }, [snap.obra, pushError])

  const runForgeRuntimeDispatch = useCallback(
    async (options?: { role?: string; simulateProviderFailure?: string; createChildReceipt?: boolean; fastPathRunId?: string }) => {
      if (!snap.obra?.id) {
        pushError('runForgeRuntimeDispatch', new Error('obra_required'))
        return
      }
      setSnap((s) => ({ ...s, busy: true }))
      try {
        const plan = await bridge.runForgeRuntimeDispatch(snap.obra.id, options ?? {})
        if (!cancelRef.current) {
          setSnap((s) => ({
            ...s,
            forgeRuntimeDispatch: plan,
            busy: false,
            errors: [...errorBufRef.current],
          }))
        }
      } catch (e) {
        pushError('runForgeRuntimeDispatch', e)
        setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
      }
    },
    [snap.obra, pushError],
  )

  const refreshForgeProviderDrivers = useCallback(async () => {
    if (!snap.obra?.id) {
      pushError('refreshForgeProviderDrivers', new Error('obra_required'))
      return
    }
    try {
      const status = await bridge.getForgeProviderDrivers(snap.obra.id)
      if (!cancelRef.current) {
        setSnap((s) => ({ ...s, forgeProviderDriverStatus: status, errors: [...errorBufRef.current] }))
      }
    } catch (e) {
      pushError('refreshForgeProviderDrivers', e)
    }
  }, [snap.obra, pushError])

  const planForgeProviderDriver = useCallback(
    async (options?: { role?: string; dispatchId?: string }) => {
      if (!snap.obra?.id) {
        pushError('planForgeProviderDriver', new Error('obra_required'))
        return null
      }
      try {
        const packet = await bridge.planForgeProviderDriver(snap.obra.id, options ?? {})
        if (!cancelRef.current && packet) {
          setSnap((s) => ({
            ...s,
            forgeProviderInvocation:
              (packet.invocation as unknown as AtlasForgeProviderInvocationSnapshot) ?? s.forgeProviderInvocation,
            forgeProviderDriverStatus:
              (packet.driverStatus as unknown as AtlasForgeProviderDriverStatus) ?? s.forgeProviderDriverStatus,
          }))
        }
        return packet
      } catch (e) {
        pushError('planForgeProviderDriver', e)
        return null
      }
    },
    [snap.obra, pushError],
  )

  const runForgeProviderInvocation = useCallback(
    async (options?: { role?: string; mode?: 'dry_run' | 'execute'; dispatchId?: string; confirmProviderCall?: boolean; confirmBudget?: boolean; confirmRuntimeDispatch?: boolean; timeoutSeconds?: number }) => {
      if (!snap.obra?.id) {
        pushError('runForgeProviderInvocation', new Error('obra_required'))
        return
      }
      setSnap((s) => ({ ...s, busy: true }))
      try {
        const inv = await bridge.runForgeProviderInvocation(snap.obra.id, options ?? {})
        if (!cancelRef.current) {
          setSnap((s) => ({
            ...s,
            forgeProviderInvocation: inv,
            busy: false,
            errors: [...errorBufRef.current],
          }))
        }
      } catch (e) {
        pushError('runForgeProviderInvocation', e)
        setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
      }
    },
    [snap.obra, pushError],
  )

  const refreshForgeProviderInvocationLatest = useCallback(async () => {
    if (!snap.obra?.id) {
      pushError('refreshForgeProviderInvocationLatest', new Error('obra_required'))
      return
    }
    try {
      const latest = await bridge.getForgeProviderInvocationLatest(snap.obra.id)
      if (!cancelRef.current) {
        setSnap((s) => ({ ...s, forgeProviderInvocation: latest, errors: [...errorBufRef.current] }))
      }
    } catch (e) {
      pushError('refreshForgeProviderInvocationLatest', e)
    }
  }, [snap.obra, pushError])

  const refreshForgeUxOrchestrator = useCallback(async () => {
    if (!snap.obra?.id) {
      pushError('refreshForgeUxOrchestrator', new Error('obra_required'))
      return
    }
    try {
      const orchestrator = await bridge.getForgeUxOrchestrator(snap.obra.id)
      if (!cancelRef.current) {
        setSnap((s) => ({ ...s, forgeUxOrchestrator: orchestrator, errors: [...errorBufRef.current] }))
      }
    } catch (e) {
      pushError('refreshForgeUxOrchestrator', e)
    }
  }, [snap.obra, pushError])

  const createCheckpoint = useCallback(async () => {
    if (!snap.obra?.id) {
      pushError('createCheckpoint', new Error('obra_required'))
      return
    }
    setSnap((s) => ({ ...s, busy: true }))
    try {
      const checkpoint = await bridge.createCheckpoint(snap.obra.id, 'manual')
      const detail = await loadObraDetail(snap.obra)
      if (!cancelRef.current) {
        setSnap((s) => ({
          ...s,
          ...detail,
          checkpoint: detail.checkpoint ?? checkpoint ?? s.checkpoint,
          busy: false,
          errors: [...errorBufRef.current],
        }))
      }
    } catch (e) {
      pushError('createCheckpoint', e)
      setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
    }
  }, [snap.obra, loadObraDetail, pushError])

  const startForgeLiveExecutionAsync = useCallback(async () => {
    if (!snap.obra?.id) {
      pushError('startForgeLiveExecutionAsync', new Error('obra_required'))
      return
    }
    setSnap((s) => ({ ...s, busy: true }))
    try {
      const execution = await bridge.startForgeLiveExecutionAsync(snap.obra.id)
      const detail = await loadObraDetail(snap.obra)
      if (!cancelRef.current) {
        setSnap((s) => ({
          ...s,
          ...detail,
          forgeLiveExecutionAsync: detail.forgeLiveExecutionAsync ?? execution ?? s.forgeLiveExecutionAsync,
          busy: false,
          errors: [...errorBufRef.current],
        }))
      }
    } catch (e) {
      pushError('startForgeLiveExecutionAsync', e)
      setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
    }
  }, [snap.obra, loadObraDetail, pushError])

  const refreshForgeLiveExecutionAsync = useCallback(async () => {
    const obra = snap.obra
    const executionId = snap.forgeLiveExecutionAsync?.executionId
    if (!obra?.id || !executionId) return

    try {
      const result = await bridge.getForgeLiveExecutionAsync(obra.id, executionId)
      const detail = await loadObraDetail(obra)
      if (!cancelRef.current) {
        setSnap((s) => ({
          ...s,
          ...detail,
          forgeLiveExecutionAsync: detail.forgeLiveExecutionAsync ?? result.execution ?? s.forgeLiveExecutionAsync,
          forgeLiveExecution: detail.forgeLiveExecution ?? result.snapshot ?? s.forgeLiveExecution,
          errors: [...errorBufRef.current],
        }))
      }
    } catch (e) {
      pushError('refreshForgeLiveExecutionAsync', e)
      setSnap((s) => ({ ...s, errors: [...errorBufRef.current] }))
    }
  }, [snap.obra, snap.forgeLiveExecutionAsync, loadObraDetail, pushError])

  const reviewForgeRun = useCallback(async (decision: 'approved' | 'rejected' = 'approved', comment = 'local operator review') => {
    if (!snap.obra?.id) {
      pushError('reviewForgeRun', new Error('obra_required'))
      return
    }
    setSnap((s) => ({ ...s, busy: true }))
    try {
      const review = await bridge.reviewForgeRun(snap.obra.id, decision, comment)
      const detail = await loadObraDetail(snap.obra)
      if (!cancelRef.current) {
        setSnap((s) => ({
          ...s,
          ...detail,
          forgeReview: detail.forgeReview ?? review ?? s.forgeReview,
          busy: false,
          errors: [...errorBufRef.current],
        }))
      }
    } catch (e) {
      pushError('reviewForgeRun', e)
      setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
    }
  }, [snap.obra, loadObraDetail, pushError])

  const rollbackForgePromotion = useCallback(async (promotionId?: string, comment = 'operator rollback') => {
    if (!snap.obra?.id) {
      pushError('rollbackForgePromotion', new Error('obra_required'))
      return
    }
    const effectivePromotionId = promotionId ?? snap.forgeReview?.promotion?.promotionId ?? ''
    if (!effectivePromotionId) {
      pushError('rollbackForgePromotion', new Error('promotion_required'))
      return
    }
    setSnap((s) => ({ ...s, busy: true }))
    try {
      const review = await bridge.rollbackForgePromotion(snap.obra.id, effectivePromotionId, comment)
      const detail = await loadObraDetail(snap.obra)
      if (!cancelRef.current) {
        setSnap((s) => ({
          ...s,
          ...detail,
          forgeReview: detail.forgeReview ?? review ?? s.forgeReview,
          busy: false,
          errors: [...errorBufRef.current],
        }))
      }
    } catch (e) {
      pushError('rollbackForgePromotion', e)
      setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
    }
  }, [snap.obra, snap.forgeReview, loadObraDetail, pushError])

  const inspectForgeRunHistory = useCallback(async (historyId: string) => {
    if (!snap.obra?.id) {
      pushError('inspectForgeRunHistory', new Error('obra_required'))
      return
    }
    if (!historyId) {
      pushError('inspectForgeRunHistory', new Error('history_id_required'))
      return
    }
    setSnap((s) => ({ ...s, busy: true }))
    try {
      const replay = await bridge.getForgeRunHistoryReplay(snap.obra.id, historyId)
      if (!cancelRef.current) {
        setSnap((s) => ({
          ...s,
          forgeRunHistoryReplay: replay,
          busy: false,
          errors: [...errorBufRef.current],
        }))
      }
    } catch (e) {
      pushError('inspectForgeRunHistory', e)
      setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
    }
  }, [snap.obra, pushError])

  const createProgrammingWorkItem = useCallback(async () => {
    if (!snap.obra?.id) {
      pushError('createProgrammingWorkItem', new Error('obra_required'))
      return
    }
    setSnap((s) => ({ ...s, busy: true }))
    try {
      await bridge.createProgrammingWorkItem(snap.obra.id)
      const detail = await loadObraDetail(snap.obra)
      if (!cancelRef.current) {
        setSnap((s) => ({
          ...s,
          ...detail,
          busy: false,
          errors: [...errorBufRef.current],
        }))
      }
    } catch (e) {
      pushError('createProgrammingWorkItem', e)
      setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
    }
  }, [snap.obra, loadObraDetail, pushError])

  const compileProgrammingWorkItemSpecPlan = useCallback(async () => {
    const obra = snap.obra
    const workItemId = snap.forgeTaskQueue?.workItemId ?? snap.programmingGovernance?.workItem?.id ?? null
    if (!obra?.id) {
      pushError('compileProgrammingWorkItemSpecPlan', new Error('obra_required'))
      return
    }
    if (!workItemId) {
      pushError('compileProgrammingWorkItemSpecPlan', new Error('work_item_required'))
      return
    }
    setSnap((s) => ({ ...s, busy: true }))
    try {
      await bridge.compileProgrammingWorkItemSpecPlan(obra.id, workItemId)
      const detail = await loadObraDetail(obra)
      if (!cancelRef.current) {
        setSnap((s) => ({
          ...s,
          ...detail,
          busy: false,
          errors: [...errorBufRef.current],
        }))
      }
    } catch (e) {
      pushError('compileProgrammingWorkItemSpecPlan', e)
      setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
    }
  }, [snap.obra, snap.forgeTaskQueue, snap.programmingGovernance, loadObraDetail, pushError])

  const runAtlasCodeEnterpriseCertification = useCallback(async () => {
    setSnap((s) => ({ ...s, busy: true }))
    try {
      const report = await bridge.runAtlasCodeEnterpriseCertification()
      const detail = snap.obra ? await loadObraDetail(snap.obra) : {}
      if (!cancelRef.current) {
        setSnap((s) => ({
          ...s,
          ...detail,
          atlasCodeEnterpriseCertification: detail.atlasCodeEnterpriseCertification ?? report,
          busy: false,
          errors: [...errorBufRef.current],
        }))
      }
    } catch (e) {
      pushError('runAtlasCodeEnterpriseCertification', e)
      setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
    }
  }, [snap.obra, loadObraDetail, pushError])

  const applyDiff = useCallback(
    async (patchId: string) => {
      setSnap((s) => ({ ...s, busy: true }))
      try {
        await bridge.applyDiff(patchId, ['contract', 'tests', 'security_scan'])
        await refresh()
      } catch (e) {
        pushError('applyDiff', e)
        setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
      }
    },
    [refresh, pushError]
  )

  // Defesa em profundidade: se o último turno é do usuário, ainda há trace
  // em andamento. Após 3s sem resposta visível, força UM refetch da thread.
  // Cobre o caso em que SSE+polling falham simultaneamente (HMR, drop de
  // rede, app perde foreground durante a janela do polling).
  useEffect(() => {
    const threadId = snap.activeThreadId
    if (!threadId || snap.messages.length === 0) return
    const last = snap.messages[snap.messages.length - 1]
    if (!last || last.role !== 'user') return
    const handle = setTimeout(() => {
      if (cancelRef.current) return
      void (async () => {
        try {
          const fresh = await bridge.getSession(threadId)
          if (cancelRef.current || fresh.length === 0) return
          setSnap((s) => {
            if (s.activeThreadId !== threadId) return s
            if (fresh.length <= s.messages.length) return s
            return { ...s, messages: fresh }
          })
        } catch {
          /* silent · primary paths handle errors */
        }
      })()
    }, 3000)
    return () => clearTimeout(handle)
  }, [snap.activeThreadId, snap.messages])

  useEffect(() => {
    const status = snap.forgeLiveExecutionAsync?.status
    if (!snap.obra?.id || !snap.forgeLiveExecutionAsync?.executionId) return
    if (status !== 'queued' && status !== 'running') return

    const handle = setTimeout(() => {
      if (!cancelRef.current) void refreshForgeLiveExecutionAsync()
    }, 2500)

    return () => clearTimeout(handle)
  }, [
    snap.obra?.id,
    snap.forgeLiveExecutionAsync?.executionId,
    snap.forgeLiveExecutionAsync?.status,
    refreshForgeLiveExecutionAsync,
  ])

  useEffect(() => {
    cancelRef.current = false
    queueMicrotask(() => {
      if (!cancelRef.current) void refresh()
    })
    return () => {
      cancelRef.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    ...snap,
    refresh,
    selectObra,
    createObra,
    sendIntent,
    runGate,
    signReceipt,
    applyDiff,
    runForgeLiveExecution,
    runForgeFastPath,
    refreshForgeFastPathStatus,
    resumeForgeFastPath,
    refreshForgeReview,
    approveForgeReview,
    rejectForgeReview,
    rollbackForgeReview,
    refreshForgeWorkIntake,
    saveForgeWorkIntake,
    refreshForgeProviderTopology,
    refreshForgeContinuumCertification,
    refreshForgeProviderCapacity,
    recordForgeProviderFailure,
    refreshSelfImprovementGovernance,
    recordSelfImprovementTrustLedgerEntry,
    refreshSelfImprovementActivationCockpit,
    selectSelfImprovementActivation,
    createSelfImprovementForgeActivation,
    acceptSelfImprovementForgeActivation,
    rejectSelfImprovementForgeActivation,
    refreshSelfImprovementProposalBacklog,
    createSelfImprovementProposal,
    evaluateSelfImprovementProposal,
    prioritizeSelfImprovementProposal,
    refreshSelfImprovementClosedLoop,
    measureSelfImprovementResult,
    refreshSelfImprovementResultLedger,
    refreshSelfImprovementNextCycle,
    refreshForgeRuntimeDispatch,
    runForgeRuntimeDispatch,
    refreshForgeProviderDrivers,
    planForgeProviderDriver,
    runForgeProviderInvocation,
    refreshForgeProviderInvocationLatest,
    refreshForgeUxOrchestrator,
    startForgeLiveExecutionAsync,
    refreshForgeLiveExecutionAsync,
    inspectForgeRunHistory,
    createProgrammingWorkItem,
    compileProgrammingWorkItemSpecPlan,
    reviewForgeRun,
    rollbackForgePromotion,
    createCheckpoint,
    runAtlasCodeEnterpriseCertification,
    refreshSelfConstruction,
  }
}
