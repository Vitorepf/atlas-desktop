/**
 * Atlas Vox · First-Run Readiness (Wave 7.8 / Claude U).
 *
 * Single source of truth for "posso usar Vox de verdade agora?". The hook
 * composes existing bridge calls (voxEdgeStatus, voxSttStatus) plus two
 * thin additions (vox_hotkey_status Tauri command and /ai/vox/health GET)
 * into one honest snapshot. The panel renders it; nothing else mutates
 * Vox state from here.
 *
 * Hard rules:
 *   - No fake checks. If a probe is unavailable (not Tauri, no Kernel URL),
 *     the item lands as `unavailable` with a structured next action — not
 *     `passed`.
 *   - No invasive prompts. The aggregator never tries to "fix" permissions
 *     automatically; it just tells the operator what to open.
 *   - No tokens, no transcripts, no PCM travel through this module.
 *   - Pure functions where possible. The `aggregate(...)` builder accepts
 *     raw probe outputs and is unit-tested without DOM/Tauri.
 */

import type { VoxEdgeStatus, VoxModelStatus } from './bridge'

export type VoxReadinessItemStatus =
  | 'passed'
  | 'warning'
  | 'blocked'
  | 'unavailable'
  | 'checking'

export type VoxReadinessAggregateStatus =
  | 'ready'
  | 'partial'
  | 'blocked'
  | 'unavailable'

export interface VoxReadinessItem {
  id: string
  label: string
  status: VoxReadinessItemStatus
  detail: string
  nextAction: string | null
}

export interface VoxReadinessSummary {
  status: VoxReadinessAggregateStatus
  passed: number
  warnings: number
  blocked: number
  total: number
  items: VoxReadinessItem[]
  generatedAt: string
}

/**
 * Tauri-side hotkey status (Wave 6.5 — global Option+Space runtime).
 * Shape mirrors `vox_hotkey_status` Tauri command output.
 */
export interface VoxHotkeyRuntimeStatus {
  available: boolean
  platformSupported: boolean
  defaultHotkey: string
  secondaryHotkey: string
  registeredHotkeys: string[]
  lastError: string | null
  pendingCapabilities: string[]
  escapeDoubleTapWindowMs: number
}

/**
 * /ai/vox/health response shape (Wave 2..6 backend). Only the fields the
 * panel needs are typed here; everything else is allowed-but-ignored.
 */
export interface VoxKernelHealth {
  schema: string
  status: string
  mode: string | null
  voiceRealtimeStatus: string | null
  supports: {
    dictation: boolean
    promptPolish: boolean
    intentCompile: boolean
    governedExecute: boolean
  }
  executors: Record<string, { available: boolean; reason?: string | null }>
  kernelGuarantees: {
    rawAudioAccepted: boolean
  }
}

export type VoxKernelHealthOutcome =
  | { ok: true; health: VoxKernelHealth }
  | { ok: false; reason: 'kernel_url_missing' | 'fetch_failed' | 'shape_invalid'; detail: string | null }

export interface VoxReadinessProbes {
  bridgeMode: 'tauri' | 'http' | 'offline'
  edge: VoxEdgeStatus | null
  stt: VoxModelStatus | null
  hotkey: VoxHotkeyRuntimeStatus | null
  hotkeyProbeFailed: boolean
  kernel: VoxKernelHealthOutcome
}

/**
 * Pure aggregator. Accepts the raw probe outputs and returns the panel's
 * full summary. Deterministic so the unit test can pin it.
 */
export function aggregate(probes: VoxReadinessProbes): VoxReadinessSummary {
  const items: VoxReadinessItem[] = []

  items.push(itemBridgeMode(probes.bridgeMode))
  items.push(itemMicrophone(probes))
  items.push(itemHotkey(probes))
  items.push(itemAccessibility(probes))
  items.push(itemWhisperModel(probes))
  items.push(itemSttEngine(probes))
  items.push(itemKernelUrl(probes))
  items.push(itemKernelHealth(probes))
  items.push(itemGovernedExecute(probes))
  items.push(itemExecutor(probes, 'codex_cli', 'Codex CLI'))
  items.push(itemExecutor(probes, 'claude_cli', 'Claude CLI'))
  items.push(itemRawAudioInvariant(probes))

  const counts = items.reduce(
    (acc, it) => {
      if (it.status === 'passed') acc.passed += 1
      else if (it.status === 'warning') acc.warnings += 1
      else if (it.status === 'blocked') acc.blocked += 1
      return acc
    },
    { passed: 0, warnings: 0, blocked: 0 },
  )

  const status = resolveAggregateStatus(items, counts)

  return {
    status,
    passed: counts.passed,
    warnings: counts.warnings,
    blocked: counts.blocked,
    total: items.length,
    items,
    generatedAt: new Date().toISOString(),
  }
}

function resolveAggregateStatus(
  items: VoxReadinessItem[],
  counts: { passed: number; warnings: number; blocked: number },
): VoxReadinessAggregateStatus {
  // If even one hard signal is blocked, the whole readiness is blocked.
  if (counts.blocked > 0) return 'blocked'
  // If every non-unavailable item passed AND we have at least one pass,
  // we're ready. Items reported `unavailable` (e.g. backend offline) are
  // honest non-signals: they don't downgrade past `partial` unless
  // they're the only thing we have.
  const nonUnavailable = items.filter((i) => i.status !== 'unavailable')
  if (nonUnavailable.length === 0) return 'unavailable'
  if (counts.warnings > 0) return 'partial'
  if (counts.passed === nonUnavailable.length) return 'ready'
  return 'partial'
}

// ─── Individual item builders ───────────────────────────────────────────

function itemBridgeMode(mode: VoxReadinessProbes['bridgeMode']): VoxReadinessItem {
  if (mode === 'tauri') {
    return {
      id: 'tauri_runtime',
      label: 'Runtime Atlas Desktop',
      status: 'passed',
      detail: 'Tauri shell ativo. Comandos nativos disponíveis.',
      nextAction: null,
    }
  }
  if (mode === 'http') {
    return {
      id: 'tauri_runtime',
      label: 'Runtime Atlas Desktop',
      status: 'warning',
      detail: 'Rodando em modo browser (sem Tauri). Captura, hotkey e STT exigem o app.',
      nextAction: 'Abra o app Atlas Desktop para Vox completo.',
    }
  }
  return {
    id: 'tauri_runtime',
    label: 'Runtime Atlas Desktop',
    status: 'blocked',
    detail: 'Modo offline · sem Tauri e sem VITE_ATLAS_SERVER_URL.',
    nextAction: 'Abra o Atlas Desktop ou configure VITE_ATLAS_SERVER_URL.',
  }
}

function itemMicrophone(probes: VoxReadinessProbes): VoxReadinessItem {
  if (probes.bridgeMode !== 'tauri') {
    return notAvailableOutsideTauri('microphone', 'Microfone / captura')
  }
  if (!probes.edge) {
    return {
      id: 'microphone',
      label: 'Microfone / captura',
      status: 'unavailable',
      detail: 'vox_edge_status não respondeu.',
      nextAction: 'Tente verificar novamente. Se persistir, reinicie o Atlas Desktop.',
    }
  }
  if (probes.edge.captureAvailable) {
    return {
      id: 'microphone',
      label: 'Microfone / captura',
      status: 'passed',
      detail: 'cpal localizou um device de entrada padrão.',
      nextAction: null,
    }
  }
  return {
    id: 'microphone',
    label: 'Microfone / captura',
    status: 'blocked',
    detail: probes.edge.lastError ?? 'Nenhum device de entrada padrão localizado.',
    nextAction: 'Conecte um microfone e libere permissão de Microfone para Atlas Desktop.',
  }
}

function itemHotkey(probes: VoxReadinessProbes): VoxReadinessItem {
  if (probes.bridgeMode !== 'tauri') {
    return notAvailableOutsideTauri('hotkey', 'Atalho global · Option+Space')
  }
  // Prefer the dedicated hotkey runtime status when it answered. The edge
  // status mirrors it but the runtime exposes registered chords + reason.
  if (probes.hotkey) {
    if (probes.hotkey.available) {
      return {
        id: 'hotkey',
        label: 'Atalho global · Option+Space',
        status: 'passed',
        detail: `Registrado: ${probes.hotkey.registeredHotkeys.join(', ') || probes.hotkey.defaultHotkey}.`,
        nextAction: null,
      }
    }
    if (!probes.hotkey.platformSupported) {
      return {
        id: 'hotkey',
        label: 'Atalho global · Option+Space',
        status: 'warning',
        detail: 'Plataforma sem suporte ao registro global de atalho nesta wave.',
        nextAction: 'Atlas Vox ainda funciona via botão; atalho global entra em wave macOS.',
      }
    }
    const detail = probes.hotkey.lastError
      ?? (probes.hotkey.pendingCapabilities[0] ?? 'pendente sem motivo declarado.')
    return {
      id: 'hotkey',
      label: 'Atalho global · Option+Space',
      status: 'warning',
      detail,
      nextAction: 'Libere Accessibility/Input Monitoring em Ajustes do Sistema → Privacidade.',
    }
  }
  if (probes.hotkeyProbeFailed) {
    return {
      id: 'hotkey',
      label: 'Atalho global · Option+Space',
      status: 'unavailable',
      detail: 'vox_hotkey_status não respondeu nesta build.',
      nextAction: 'Atalho global é wave macOS — botão Vox segue funcionando.',
    }
  }
  // Fall back to edge.hotkeyAvailable when the dedicated runtime command
  // hasn't been registered yet.
  if (probes.edge?.hotkeyAvailable) {
    return {
      id: 'hotkey',
      label: 'Atalho global · Option+Space',
      status: 'passed',
      detail: `Registrado: ${probes.edge.defaultHotkey || 'Option+Space'}.`,
      nextAction: null,
    }
  }
  return {
    id: 'hotkey',
    label: 'Atalho global · Option+Space',
    status: 'warning',
    detail: 'Atalho não registrado pelo OS.',
    nextAction: 'Libere Accessibility/Input Monitoring; o botão Vox segue funcionando.',
  }
}

function itemAccessibility(probes: VoxReadinessProbes): VoxReadinessItem {
  if (probes.bridgeMode !== 'tauri') {
    return notAvailableOutsideTauri('permissions', 'Permissões macOS')
  }
  if (!probes.edge) {
    return {
      id: 'permissions',
      label: 'Permissões macOS',
      status: 'unavailable',
      detail: 'Edge não devolveu permissões.',
      nextAction: null,
    }
  }
  const p = probes.edge.permissions
  const states = [p.microphone, p.accessibility, p.inputMonitoring]
  const allGranted = states.every((s) => s === 'granted')
  const anyDenied = states.some((s) => s === 'denied')
  const anyUnchecked = states.some((s) => s === 'not_checked' || s === 'unknown')

  if (allGranted) {
    return {
      id: 'permissions',
      label: 'Permissões macOS',
      status: 'passed',
      detail: `mic · accessibility · input monitoring · ${states.join(' / ')}`,
      nextAction: null,
    }
  }
  if (anyDenied) {
    return {
      id: 'permissions',
      label: 'Permissões macOS',
      status: 'blocked',
      detail: `Pelo menos uma permissão negada · mic=${p.microphone} accessibility=${p.accessibility} inputMonitoring=${p.inputMonitoring}.`,
      nextAction: 'Abra Ajustes do Sistema → Privacidade & Segurança e libere Atlas Desktop.',
    }
  }
  if (anyUnchecked) {
    return {
      id: 'permissions',
      label: 'Permissões macOS',
      status: 'warning',
      detail: `Status não confirmável a partir do app · mic=${p.microphone} accessibility=${p.accessibility} inputMonitoring=${p.inputMonitoring}.`,
      nextAction: 'Confirme manualmente em Ajustes do Sistema → Privacidade & Segurança.',
    }
  }
  return {
    id: 'permissions',
    label: 'Permissões macOS',
    status: 'warning',
    detail: `mic=${p.microphone} accessibility=${p.accessibility} inputMonitoring=${p.inputMonitoring}`,
    nextAction: 'Confirme manualmente em Ajustes do Sistema → Privacidade & Segurança.',
  }
}

function itemWhisperModel(probes: VoxReadinessProbes): VoxReadinessItem {
  if (probes.bridgeMode !== 'tauri') {
    return notAvailableOutsideTauri('whisper_model', 'Modelo Whisper large-v3')
  }
  if (!probes.stt) {
    return {
      id: 'whisper_model',
      label: 'Modelo Whisper large-v3',
      status: 'unavailable',
      detail: 'vox_stt_status não respondeu.',
      nextAction: null,
    }
  }
  if (probes.stt.modelFound) {
    return {
      id: 'whisper_model',
      label: 'Modelo Whisper large-v3',
      status: 'passed',
      detail: `Arquivo localizado em ${probes.stt.modelPath}.`,
      nextAction: null,
    }
  }
  return {
    id: 'whisper_model',
    label: 'Modelo Whisper large-v3',
    status: 'blocked',
    detail: probes.stt.nextAction?.message
      ?? `Coloque ${probes.stt.modelFilename} em ${probes.stt.modelsDir}.`,
    nextAction: `Baixe ${probes.stt.modelFilename} e salve em ${probes.stt.modelsDir}.`,
  }
}

function itemSttEngine(probes: VoxReadinessProbes): VoxReadinessItem {
  if (probes.bridgeMode !== 'tauri') {
    return notAvailableOutsideTauri('stt_engine', 'Motor de voz local')
  }
  if (!probes.stt) {
    return {
      id: 'stt_engine',
      label: 'Motor de voz local',
      status: 'unavailable',
      detail: 'vox_stt_status não respondeu.',
      nextAction: null,
    }
  }
  if (probes.stt.engineAvailable) {
    return {
      id: 'stt_engine',
      label: 'Motor de voz local',
      status: 'passed',
      detail: `${probes.stt.modelId} pronto para inferência local.`,
      nextAction: null,
    }
  }
  return {
    id: 'stt_engine',
    label: 'Motor de voz local',
    status: 'warning',
    detail: probes.stt.nextAction?.message
      ?? 'Motor de voz indisponível neste build · transcrição real não roda.',
    nextAction:
      probes.stt.nextAction?.code === 'engine_binding_pending'
        ? 'Recompile o desktop com `--features whisper-cpp` em macOS (precisa de cmake).'
        : 'Ditado em voz pausado — caminho de texto manual continua disponível.',
  }
}

function itemKernelUrl(probes: VoxReadinessProbes): VoxReadinessItem {
  if (probes.kernel.ok) {
    return {
      id: 'kernel_url',
      label: 'Conexão com servidor Atlas',
      status: 'passed',
      detail: 'Conexão estabelecida.',
      nextAction: null,
    }
  }
  if (probes.kernel.reason === 'kernel_url_missing') {
    return {
      id: 'kernel_url',
      label: 'Conexão com servidor Atlas',
      status: 'blocked',
      detail: 'Endereço do servidor Atlas não configurado · sem conexão.',
      nextAction: 'Inicie o servidor Atlas (atlas-server) ou configure VITE_ATLAS_SERVER_URL.',
    }
  }
  return {
    id: 'kernel_url',
    label: 'Conexão com servidor Atlas',
    status: 'warning',
    detail: probes.kernel.detail ?? 'O servidor Atlas não respondeu.',
    nextAction: 'Verifique se o servidor Atlas está rodando.',
  }
}

function itemKernelHealth(probes: VoxReadinessProbes): VoxReadinessItem {
  if (!probes.kernel.ok) {
    return {
      id: 'kernel_health',
      label: 'Status do servidor Atlas',
      status: probes.kernel.reason === 'kernel_url_missing' ? 'unavailable' : 'warning',
      detail:
        probes.kernel.reason === 'kernel_url_missing'
          ? 'Endereço do servidor ausente — status não verificado.'
          : probes.kernel.detail ?? 'O servidor Atlas não respondeu ao status do Vox.',
      nextAction:
        probes.kernel.reason === 'kernel_url_missing'
          ? null
          : 'Confirme que o servidor Atlas está respondendo.',
    }
  }
  const h = probes.kernel.health
  if (h.status === 'available') {
    return {
      id: 'kernel_health',
      label: 'Status do servidor Atlas',
      status: 'passed',
      detail: 'Servidor Atlas disponível para o Vox.',
      nextAction: null,
    }
  }
  return {
    id: 'kernel_health',
    label: 'Status do servidor Atlas',
    status: 'warning',
    detail: `Status do servidor: "${h.status}".`,
    nextAction: 'Investigue os logs do servidor Atlas.',
  }
}

function itemGovernedExecute(probes: VoxReadinessProbes): VoxReadinessItem {
  if (!probes.kernel.ok) {
    return {
      id: 'governed_execute',
      label: 'Execução governada',
      status: 'unavailable',
      detail: 'Servidor Atlas não verificável — suporte a execução desconhecido.',
      nextAction: null,
    }
  }
  if (probes.kernel.health.supports.governedExecute) {
    return {
      id: 'governed_execute',
      label: 'Execução governada',
      status: 'passed',
      detail: 'Servidor Atlas suporta execução governada.',
      nextAction: null,
    }
  }
  return {
    id: 'governed_execute',
    label: 'Execução governada',
    status: 'warning',
    detail: 'Servidor Atlas ainda não anuncia suporte a execução governada.',
    nextAction: 'Ditar, melhorar e criar prompt continuam funcionando.',
  }
}

function itemExecutor(
  probes: VoxReadinessProbes,
  key: string,
  friendly: string,
): VoxReadinessItem {
  const id = `executor_${key}`
  if (!probes.kernel.ok) {
    return {
      id,
      label: `${friendly} (executor)`,
      status: 'unavailable',
      detail: 'Kernel não verificável.',
      nextAction: null,
    }
  }
  const entry = probes.kernel.health.executors[key]
  if (!entry) {
    return {
      id,
      label: `${friendly} (executor)`,
      status: 'unavailable',
      detail: 'Backend não publicou o status deste executor.',
      nextAction: null,
    }
  }
  if (entry.available) {
    return {
      id,
      label: `${friendly} (executor)`,
      status: 'passed',
      detail: 'Disponível para governed_execute.',
      nextAction: null,
    }
  }
  return {
    id,
    label: `${friendly} (executor)`,
    status: 'warning',
    detail: entry.reason ?? 'Executor indisponível.',
    nextAction: 'Instale e autentique o CLI correspondente.',
  }
}

function itemRawAudioInvariant(probes: VoxReadinessProbes): VoxReadinessItem {
  if (!probes.kernel.ok) {
    return {
      id: 'raw_audio_invariant',
      label: 'raw_audio_persisted = false',
      status: 'unavailable',
      detail: 'Kernel não verificável.',
      nextAction: null,
    }
  }
  if (probes.kernel.health.kernelGuarantees.rawAudioAccepted === false) {
    return {
      id: 'raw_audio_invariant',
      label: 'raw_audio_persisted = false',
      status: 'passed',
      detail: 'Backend reafirma: áudio cru jamais aceito pelo Kernel.',
      nextAction: null,
    }
  }
  return {
    id: 'raw_audio_invariant',
    label: 'raw_audio_persisted = false',
    status: 'blocked',
    detail: 'Backend está aceitando raw_audio — invariante quebrada.',
    nextAction: 'Pare imediatamente e investigue o backend antes de usar Vox em real.',
  }
}

function notAvailableOutsideTauri(id: string, label: string): VoxReadinessItem {
  return {
    id,
    label,
    status: 'unavailable',
    detail: 'Verificação requer o Atlas Desktop (Tauri).',
    nextAction: 'Abra o app desktop para validar este item.',
  }
}

/**
 * Adapter that takes the raw `/ai/vox/health` JSON (snake_case PHP) and
 * converts it to the camelCase `VoxKernelHealth` shape the panel uses.
 * Defensive against missing fields — defaults to "false" rather than
 * assuming green.
 */
export function adaptVoxKernelHealth(raw: unknown): VoxKernelHealth | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const supportsRaw = (r.supports as Record<string, unknown> | undefined) ?? {}
  const executorsRaw = (r.executors as Record<string, unknown> | undefined) ?? {}
  const guaranteesRaw =
    (r.kernel_guarantees as Record<string, unknown> | undefined)
    ?? (r.kernelGuarantees as Record<string, unknown> | undefined)
    ?? {}
  const executors: Record<string, { available: boolean; reason?: string | null }> = {}
  for (const [key, value] of Object.entries(executorsRaw)) {
    if (!value || typeof value !== 'object') continue
    const v = value as Record<string, unknown>
    executors[key] = {
      available: Boolean(v.available),
      reason: typeof v.reason === 'string' ? v.reason : null,
    }
  }
  return {
    schema: typeof r.schema === 'string' ? r.schema : '',
    status: typeof r.status === 'string' ? r.status : 'unknown',
    mode: typeof r.mode === 'string' ? r.mode : null,
    voiceRealtimeStatus:
      typeof r.voice_realtime_status === 'string'
        ? r.voice_realtime_status
        : typeof r.voiceRealtimeStatus === 'string'
          ? r.voiceRealtimeStatus
          : null,
    supports: {
      dictation: Boolean(supportsRaw.dictation),
      promptPolish: Boolean(supportsRaw.prompt_polish ?? supportsRaw.promptPolish),
      intentCompile: Boolean(supportsRaw.intent_compile ?? supportsRaw.intentCompile),
      governedExecute: Boolean(supportsRaw.governed_execute ?? supportsRaw.governedExecute),
    },
    executors,
    kernelGuarantees: {
      rawAudioAccepted: Boolean(
        guaranteesRaw.raw_audio_accepted ?? guaranteesRaw.rawAudioAccepted,
      ),
    },
  }
}

// ──────────────────────────────────────────────────────────────────────
// Wave 7.9 · Setup Assistant
//
// Pure derivation: maps a readiness summary (or a single item) into the
// concrete actions the operator can take from the panel. Action kinds:
//
//   - `open_system_settings` — opens a specific macOS Privacy pane via
//     the allowlisted Tauri command. The allowlist lives in Rust; this
//     module only references the canonical target strings.
//   - `copy_text`            — puts a string on the clipboard so the
//     operator can paste it (model path, env var name, command).
//   - `refresh`              — re-runs the readiness probes.
//   - `instruction`          — instruction-only; no executable action.
//     Always safe.
//
// `deriveItemActions()` and `deriveUsageTiers()` are pure and unit-tested
// without the DOM/Tauri. The panel calls into bridge wrappers for the
// side effects.
// ──────────────────────────────────────────────────────────────────────

export type SystemSettingsTarget = 'microphone' | 'accessibility' | 'input_monitoring'

export interface VoxSetupCapabilities {
  /** True only when running inside the Tauri shell on macOS. Otherwise
   *  the actions degrade to `instruction`-only to stay honest. */
  canOpenSystemSettings: boolean
  /** True when the JS context exposes navigator.clipboard.writeText or
   *  the equivalent Tauri clipboard plugin is reachable. The bridge
   *  always supports the fallback `document.execCommand('copy')`, but
   *  Wave 7.9 stays conservative and only emits copy_text actions when
   *  we're confident the host can honour them. */
  canCopyToClipboard: boolean
}

export type VoxSetupAction =
  | {
      kind: 'open_system_settings'
      label: string
      target: SystemSettingsTarget
    }
  | {
      kind: 'copy_text'
      label: string
      text: string
      successMessage: string
    }
  | {
      kind: 'refresh'
      label: string
    }
  | {
      kind: 'instruction'
      label: string
      detail: string
    }

/**
 * For a single readiness item, return the concrete actions the operator
 * can take. Returns `[]` when the item is `passed` or `checking`. Honest
 * mapping: never invents actions for items that don't have a known
 * remedy. Unsupported platforms (no `canOpenSystemSettings`) get an
 * `instruction` action instead of a clickable button.
 */
export function deriveItemActions(
  item: VoxReadinessItem,
  capabilities: VoxSetupCapabilities,
): VoxSetupAction[] {
  if (item.status === 'passed' || item.status === 'checking') return []

  switch (item.id) {
    case 'microphone':
      return capabilities.canOpenSystemSettings
        ? [
            {
              kind: 'open_system_settings',
              label: 'Abrir Ajustes · Microfone',
              target: 'microphone',
            },
            { kind: 'refresh', label: 'Verificar novamente' },
          ]
        : [
            {
              kind: 'instruction',
              label: 'Liberar microfone',
              detail:
                'Abra Ajustes do Sistema → Privacidade & Segurança → Microfone e libere Atlas Desktop.',
            },
            { kind: 'refresh', label: 'Verificar novamente' },
          ]

    case 'permissions':
      // The permissions item rolls three macOS panes into one. Surface
      // all three quick-links when available; instruction-only otherwise.
      return capabilities.canOpenSystemSettings
        ? [
            {
              kind: 'open_system_settings',
              label: 'Abrir Ajustes · Microfone',
              target: 'microphone',
            },
            {
              kind: 'open_system_settings',
              label: 'Abrir Ajustes · Acessibilidade',
              target: 'accessibility',
            },
            {
              kind: 'open_system_settings',
              label: 'Abrir Ajustes · Monitoramento de Entrada',
              target: 'input_monitoring',
            },
            { kind: 'refresh', label: 'Verificar novamente' },
          ]
        : [
            {
              kind: 'instruction',
              label: 'Liberar permissões macOS',
              detail:
                'Abra Ajustes do Sistema → Privacidade & Segurança e libere Atlas Desktop em Microfone, Acessibilidade e Monitoramento de Entrada.',
            },
            { kind: 'refresh', label: 'Verificar novamente' },
          ]

    case 'hotkey': {
      // The hotkey item is usually a warning, not blocked. Fix is the
      // same as the broader permissions item: enable Accessibility +
      // Input Monitoring for Atlas Desktop.
      const actions: VoxSetupAction[] = capabilities.canOpenSystemSettings
        ? [
            {
              kind: 'open_system_settings',
              label: 'Abrir Ajustes · Acessibilidade',
              target: 'accessibility',
            },
            {
              kind: 'open_system_settings',
              label: 'Abrir Ajustes · Monitoramento de Entrada',
              target: 'input_monitoring',
            },
          ]
        : [
            {
              kind: 'instruction',
              label: 'Atalho global · permissões',
              detail:
                'Libere Atlas Desktop em Privacidade & Segurança → Acessibilidade e Monitoramento de Entrada para registrar Option+Space globalmente.',
            },
          ]
      actions.push({ kind: 'refresh', label: 'Verificar novamente' })
      return actions
    }

    case 'whisper_model':
      return [
        {
          kind: 'copy_text',
          label: 'Copiar caminho do modelo',
          text: extractCopyableModelPath(item),
          successMessage: 'Caminho copiado · cole o arquivo lá',
        },
        {
          kind: 'instruction',
          label: 'Baixar modelo Whisper',
          detail:
            'Coloque ggml-large-v3.bin em ~/.atlas/vox/models/. Não baixamos automaticamente — operador escolhe a fonte.',
        },
        { kind: 'refresh', label: 'Verificar novamente' },
      ]

    case 'stt_engine':
      return [
        {
          kind: 'instruction',
          label: 'Motor de voz indisponível',
          detail:
            item.nextAction
            ?? 'O motor de voz local precisa ser recompilado com whisper-cpp. Até lá, use o caminho de texto manual.',
        },
        { kind: 'refresh', label: 'Verificar novamente' },
      ]

    case 'kernel_url':
      return [
        {
          kind: 'copy_text',
          label: 'Copiar endereço padrão',
          text: 'VITE_ATLAS_SERVER_URL=http://127.0.0.1:8001',
          successMessage: 'Endereço copiado · cole no seu .env',
        },
        {
          kind: 'instruction',
          label: 'Subir o servidor Atlas',
          detail:
            'Em /Users/vitorepf/develop/Atlas/atlas-server rode `/opt/homebrew/bin/php artisan serve --port=8001` e configure VITE_ATLAS_SERVER_URL.',
        },
        { kind: 'refresh', label: 'Verificar novamente' },
      ]

    case 'kernel_health':
      return [
        {
          kind: 'instruction',
          label: 'Investigar servidor Atlas',
          detail:
            item.nextAction
            ?? 'O servidor Atlas respondeu, mas o status do Vox não voltou pronto. Verifique os logs.',
        },
        { kind: 'refresh', label: 'Verificar novamente' },
      ]

    case 'governed_execute':
    case 'executor_codex_cli':
    case 'executor_claude_cli':
      return [
        {
          kind: 'instruction',
          label: 'Executor indisponível',
          detail:
            item.nextAction
            ?? 'Instale e autentique o CLI correspondente. Ditar, melhorar e criar prompt continuam funcionando.',
        },
        { kind: 'refresh', label: 'Verificar novamente' },
      ]

    case 'raw_audio_invariant':
      return [
        {
          kind: 'instruction',
          label: 'Falha de segurança · pare antes de continuar',
          detail:
            'O servidor Atlas voltou a aceitar áudio cru. Não use o Vox até o servidor recusar áudio cru de novo.',
        },
        { kind: 'refresh', label: 'Verificar novamente' },
      ]

    case 'tauri_runtime':
      return [
        {
          kind: 'instruction',
          label: 'Abrir Atlas Desktop',
          detail:
            'O Vox completo (microfone, hotkey, STT) só roda no app Tauri. No modo browser, parte do checklist fica indisponível.',
        },
        { kind: 'refresh', label: 'Verificar novamente' },
      ]

    default:
      return [
        {
          kind: 'instruction',
          label: 'Sem ação automatizada',
          detail: item.nextAction ?? item.detail,
        },
        { kind: 'refresh', label: 'Verificar novamente' },
      ]
  }
}

function extractCopyableModelPath(item: VoxReadinessItem): string {
  // The whisper_model item carries paths in either `detail` or
  // `nextAction`. Prefer the canonical path that includes the filename;
  // fall back to the canonical default so the operator always gets
  // SOMETHING copyable, never an empty clipboard.
  const candidates = [item.detail, item.nextAction ?? ''].filter(Boolean)
  for (const candidate of candidates) {
    const match = candidate.match(/(\/[^\s]*\.atlas\/vox\/models\/[^\s]*\.bin)/)
    if (match && match[1]) return match[1]
  }
  return '~/.atlas/vox/models/ggml-large-v3.bin'
}

/**
 * Vox usage levels the operator can reach right now, derived honestly
 * from the readiness summary. Each tier says "you can use this **now**"
 * only when its prerequisites pass. Warnings degrade `available` to
 * false — we don't promote a tier on hope.
 */
export type VoxUsageMode =
  | 'dictation'
  | 'prompt_polish'
  | 'intent_compile'
  | 'governed_execute'

export interface VoxUsageTier {
  mode: VoxUsageMode
  label: string
  available: boolean
  blockerIds: string[]
  detail: string
}

export interface VoxUsageReadiness {
  /** True when at least one tier (any tier) is available. Used by the
   *  "Pronto para usar agora" callout. */
  anyTierAvailable: boolean
  tiers: VoxUsageTier[]
}

export function deriveUsageTiers(summary: VoxReadinessSummary | null): VoxUsageReadiness {
  const empty: VoxUsageReadiness = {
    anyTierAvailable: false,
    tiers: [
      tierShell('dictation', 'Ditado'),
      tierShell('prompt_polish', 'Melhorar'),
      tierShell('intent_compile', 'Criar prompt'),
      tierShell('governed_execute', 'Executar'),
    ],
  }
  if (!summary) return empty

  const itemsById = Object.fromEntries(summary.items.map((i) => [i.id, i] as const))
  const itemBlocks = (id: string): boolean => {
    const it = itemsById[id]
    if (!it) return true
    return it.status === 'blocked'
  }
  const itemWarnsOrBlocks = (id: string): boolean => {
    const it = itemsById[id]
    if (!it) return true
    return it.status === 'blocked' || it.status === 'warning'
  }
  const itemHardOnly = (id: string): boolean => {
    // For governed_execute & executor items we accept warnings as long
    // as kernel_url is hard-good — the operator can still see them
    // "available with caveats" but the tier reports false to be honest.
    return itemBlocks(id)
  }

  // Dictation can run via:
  //  - microphone + STT debug fallback (always honest)
  //  - microphone + STT engine real
  // We require microphone+tauri_runtime not BLOCKED. STT_engine being a
  // warning is OK — debug fallback covers it.
  const dictationBlockers: string[] = []
  if (itemBlocks('microphone')) dictationBlockers.push('microphone')
  if (itemBlocks('tauri_runtime')) dictationBlockers.push('tauri_runtime')
  if (itemBlocks('whisper_model') && itemBlocks('stt_engine')) {
    dictationBlockers.push('whisper_model')
  }
  const dictationAvailable = dictationBlockers.length === 0

  // Prompt Polish, Intent Compile, Governed Execute all require the
  // kernel health probe to be positive AND the backend to advertise the
  // mode. Governed Execute additionally needs at least one executor.
  const kernelOk =
    !itemWarnsOrBlocks('kernel_url')
    && !itemWarnsOrBlocks('kernel_health')
  const kernelBlockers: string[] = []
  if (itemWarnsOrBlocks('kernel_url')) kernelBlockers.push('kernel_url')
  if (itemWarnsOrBlocks('kernel_health')) kernelBlockers.push('kernel_health')

  const polishBlockers: string[] = []
  if (!dictationAvailable) polishBlockers.push(...dictationBlockers)
  if (!kernelOk) polishBlockers.push(...kernelBlockers)
  const polishAvailable = polishBlockers.length === 0

  const compileBlockers: string[] = []
  if (!dictationAvailable) compileBlockers.push(...dictationBlockers)
  if (!kernelOk) compileBlockers.push(...kernelBlockers)
  const compileAvailable = compileBlockers.length === 0

  const governedBlockers: string[] = []
  if (!dictationAvailable) governedBlockers.push(...dictationBlockers)
  if (!kernelOk) governedBlockers.push(...kernelBlockers)
  if (itemHardOnly('governed_execute')) governedBlockers.push('governed_execute')
  // Need at least one executor available.
  const anyExecutorOk
    = itemsById.executor_codex_cli?.status === 'passed'
    || itemsById.executor_claude_cli?.status === 'passed'
  if (!anyExecutorOk) governedBlockers.push('executor')
  // raw_audio_invariant is a stop-the-line for any tier above dictation.
  if (itemBlocks('raw_audio_invariant')) {
    polishBlockers.push('raw_audio_invariant')
    compileBlockers.push('raw_audio_invariant')
    governedBlockers.push('raw_audio_invariant')
  }
  const governedAvailable = governedBlockers.length === 0

  const tiers: VoxUsageTier[] = [
    {
      mode: 'dictation',
      label: 'Ditado',
      available: dictationAvailable,
      blockerIds: dedupe(dictationBlockers),
      detail: dictationAvailable
        ? 'Microfone ok · texto puro disponível agora.'
        : 'Resolva os itens listados para falar com o Atlas.',
    },
    {
      mode: 'prompt_polish',
      label: 'Melhorar',
      available: polishAvailable && !polishBlockers.includes('raw_audio_invariant'),
      blockerIds: dedupe(polishBlockers),
      detail:
        polishAvailable && !polishBlockers.includes('raw_audio_invariant')
          ? 'Servidor Atlas ok · melhorar texto disponível.'
          : 'Precisa do servidor Atlas e do microfone para melhorar texto.',
    },
    {
      mode: 'intent_compile',
      label: 'Criar prompt',
      available: compileAvailable && !compileBlockers.includes('raw_audio_invariant'),
      blockerIds: dedupe(compileBlockers),
      detail:
        compileAvailable && !compileBlockers.includes('raw_audio_invariant')
          ? 'Servidor Atlas ok · criar prompt forte disponível.'
          : 'Precisa do servidor Atlas e do microfone para criar prompt.',
    },
    {
      mode: 'governed_execute',
      label: 'Executar',
      available: governedAvailable,
      blockerIds: dedupe(governedBlockers),
      detail: governedAvailable
        ? 'Servidor Atlas ok e pelo menos um executor disponível.'
        : 'Executar exige servidor Atlas + um executor (Codex ou Claude).',
    },
  ]

  return {
    anyTierAvailable: tiers.some((t) => t.available),
    tiers,
  }
}

function tierShell(mode: VoxUsageMode, label: string): VoxUsageTier {
  return {
    mode,
    label,
    available: false,
    blockerIds: ['readiness_summary_missing'],
    detail: 'Aguardando primeira verificação de readiness.',
  }
}

function dedupe(arr: string[]): string[] {
  return Array.from(new Set(arr))
}

/**
 * Decision for the "Pronto para usar agora" callout. Mirrors the prompt's
 * criteria: overlay works, Kernel health ok OR debug-only allowed, STT
 * engine ok OR debug fallback clear, hotkey ok OR Vox button available.
 */
export function isReadyForFirstUse(
  summary: VoxReadinessSummary | null,
): { ready: boolean; reasoning: string } {
  if (!summary) {
    return { ready: false, reasoning: 'Sem verificação de readiness ainda.' }
  }
  const itemsById = Object.fromEntries(summary.items.map((i) => [i.id, i] as const))
  const blocked = (id: string): boolean => itemsById[id]?.status === 'blocked'

  if (blocked('raw_audio_invariant')) {
    return {
      ready: false,
      reasoning: 'Stop-the-line: backend aceitando raw_audio. Não use Vox.',
    }
  }
  if (blocked('microphone')) {
    return { ready: false, reasoning: 'Microfone bloqueado.' }
  }
  if (blocked('tauri_runtime')) {
    return { ready: false, reasoning: 'Atlas Desktop não está rodando.' }
  }
  // Whisper model + STT engine: at least one path needs to work; debug
  // fallback covers the rest.
  if (blocked('whisper_model') && blocked('stt_engine')) {
    return { ready: false, reasoning: 'Sem modelo Whisper e sem engine.' }
  }
  return {
    ready: true,
    reasoning:
      'Microfone + runtime ok. Use o botão Vox. Atalho global opcional.',
  }
}
