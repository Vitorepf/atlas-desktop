/**
 * V6.5 · Smart Preview composer (Atlas Vox).
 *
 * Pure module. Converte um `VoxFlowDecision` (com possíveis fallbacks vindos
 * do payload legado V4/V5) em um view-model determinístico que o overlay
 * consome diretamente. Sem JSX, sem hooks, sem `import.meta.env` — só
 * dados → dados.
 *
 * Por que módulo separado:
 *   - testável sem React Test Renderer.
 *   - garante que a UI nunca vê `flow_decision` cru (jargão técnico fica
 *     contido aqui dentro).
 *   - se o backend ainda não publicou `flow_decision`, o composer devolve
 *     `kind: 'fallback'` com o triplet legado e o overlay segue funcionando
 *     com o `describeUnderstanding()` original.
 *
 * Hard rules (canon V6.5 desktop):
 *   - Nunca expor schema / risk_class cru / confidence cru / receipt / token
 *     na superfície principal. Esses campos viram strings PT-BR humanas.
 *   - "Modo sugerido: …" é hint discreto, nunca obrigatório.
 *   - Destrutivo (R4) NUNCA aparece com botão "Executar" — somente recuar.
 */
import type {
  VoxFlowConfidence,
  VoxFlowDecision,
  VoxFlowDestination,
  VoxKernelIntentResponse,
  VoxMode,
  VoxProviderHint,
  VoxRiskClass,
} from './bridge'

/** Tipo do bloco principal do preview. */
export type VoxSmartPreviewKind =
  | 'clarification' // backend pediu pergunta antes de seguir
  | 'low_confidence' // backend não tem certeza do destino
  | 'blocked_destructive' // R4 — destrutivo, sem Executar
  | 'ready' // tudo claro, pode prosseguir
  | 'fallback' // backend antigo sem flow_decision

/** Ação que o operador pode escolher. UI rende botões em PT-BR. */
export type VoxSmartPreviewAction =
  | 'answer_clarification'
  | 'edit_text'
  | 'rerecord'
  | 'cancel'
  | 'confirm'
  | 'copy'
  | 'insert'
  | 'save_as_note'

export interface VoxSmartPreviewViewModel {
  kind: VoxSmartPreviewKind
  /** Frase humanizada do "Ouvi: …". `null` quando não há transcript. */
  heard: string | null
  /** "Entendi: …" em PT-BR. */
  understood: string | null
  /** "Vou fazer: …" em PT-BR — sempre orientado pelo destino. */
  willDo: string | null
  /** Destino canônico (usado pra estilo/ícone). `null` se backend antigo. */
  destination: VoxFlowDestination | null
  /** Label PT-BR do destino ("para o Codex", "comando no terminal", etc.). */
  destinationLabel: string | null
  /** Pergunta curta quando `kind === 'clarification'`. */
  clarifyingQuestion: string | null
  /** Hint discreto "Modo sugerido: Criar prompt" — só quando Auto escolheu. */
  modeSuggestionHint: string | null
  /** Linha de aviso "Não tenho certeza..." quando confidence=low. */
  lowConfidenceNote: string | null
  /** Mensagem de bloqueio quando destrutivo. */
  blockedReason: string | null
  /** Fallback humano sugerido pelo backend (entra no botão "Salvar como nota"). */
  safeFallbackLabel: string | null
  /** Ações primárias em ordem de prioridade. UI rende botões nessa ordem. */
  primaryActions: VoxSmartPreviewAction[]
}

const DESTINATION_LABEL: Record<VoxFlowDestination, string> = {
  clipboard: 'no seu clipboard / campo focado',
  atlas: 'aqui no Atlas',
  codex: 'para o Codex',
  claude: 'para o Claude',
  terminal_proposal: 'como comando proposto (você decide se executa)',
  note: 'no Atlas Inbox',
  none: '',
}

const MODE_HINT: Record<VoxMode, string> = {
  dictation: 'Ditado',
  prompt_polish: 'Melhorar',
  intent_compile: 'Criar prompt',
  governed_execute: 'Executar',
}

const DEFAULT_LOW_CONFIDENCE_NOTE =
  'Não tenho certeza do que você quer fazer.'

const DEFAULT_BLOCKED_REASON =
  'Isso é uma ação destrutiva e irreversível. Preciso de confirmação explícita antes de qualquer passo.'

/** Argumentos pro composer — separa flow_decision dos sinais legados que
 *  ajudam quando o backend antigo não enviou tudo. */
export interface VoxSmartPreviewInputs {
  flowDecision: VoxFlowDecision | null
  /** Modo efetivo escolhido pelo Atlas (vem de `kernelResponse.suggestedMode`
   *  ou da seleção manual). */
  effectiveMode: VoxMode | null
  /** True quando o operador deixou em Auto e o backend escolheu por ele.
   *  Quando true, surface mostra "Modo sugerido: …" discreto. */
  modeWasAutoPicked: boolean
  /** Provider hint, quando o backend antigo enviou ao invés de
   *  `flow_decision.destination`. */
  providerHint: VoxProviderHint | null
  /** Executor hint legado (`terminal_propose`, `note`, ...). */
  executorHint: string | null
  /** Risk class do payload legado, fallback quando flowDecision é null. */
  legacyRiskClass: VoxRiskClass | null
  /** Triplet legado vindo do `preview` antigo. */
  legacyWhatIHeard: string | null
  legacyWhatIUnderstood: string | null
  legacyWhatIWillDo: string | null
  /** Transcript editado pelo operador — fonte canônica do "Ouvi". */
  transcriptDraft: string | null
}

/**
 * Constrói o view-model determinístico do preview inteligente.
 *
 * Ordem de precedência:
 *   1. `flowDecision.needsClarification`  → `clarification`.
 *   2. `flowDecision.riskClass === 'R4'`  → `blocked_destructive`.
 *   3. `flowDecision.confidence === 'low'` → `low_confidence`.
 *   4. `flowDecision` presente             → `ready`.
 *   5. Sem flowDecision                    → `fallback`.
 */
export function composeSmartPreview(
  inputs: VoxSmartPreviewInputs,
): VoxSmartPreviewViewModel {
  const fd = inputs.flowDecision

  const heard = fd?.whatIHeard ?? inputs.legacyWhatIHeard ?? inputs.transcriptDraft ?? null

  const modeSuggestionHint =
    inputs.modeWasAutoPicked && inputs.effectiveMode
      ? `Modo sugerido: ${MODE_HINT[inputs.effectiveMode]}`
      : null

  // Backend antigo: degrada graciosamente.
  if (!fd) {
    return {
      kind: 'fallback',
      heard,
      understood: inputs.legacyWhatIUnderstood,
      willDo: inputs.legacyWhatIWillDo,
      destination: legacyDestinationFrom(inputs),
      destinationLabel: legacyDestinationLabelFrom(inputs),
      clarifyingQuestion: null,
      modeSuggestionHint,
      lowConfidenceNote: null,
      blockedReason: legacyBlockedReason(inputs),
      safeFallbackLabel: null,
      primaryActions: legacyPrimaryActions(inputs),
    }
  }

  // (1) Clarificação tem prioridade absoluta.
  if (fd.needsClarification) {
    return {
      kind: 'clarification',
      heard,
      understood: fd.whatIUnderstood,
      willDo: null, // ainda não vai fazer nada
      destination: fd.destination,
      destinationLabel: destinationLabel(fd.destination),
      clarifyingQuestion:
        fd.clarifyingQuestion?.trim() || 'Pode me dizer um pouco mais sobre o que você quer?',
      modeSuggestionHint,
      lowConfidenceNote: null,
      blockedReason: null,
      safeFallbackLabel: fd.safeFallback,
      primaryActions: ['answer_clarification', 'rerecord', 'cancel'],
    }
  }

  // (2) Destrutivo bloqueado.
  if (fd.riskClass === 'R4') {
    return {
      kind: 'blocked_destructive',
      heard,
      understood: fd.whatIUnderstood,
      willDo: null,
      destination: fd.destination,
      destinationLabel: destinationLabel(fd.destination),
      clarifyingQuestion: null,
      modeSuggestionHint,
      lowConfidenceNote: null,
      blockedReason: fd.whyThisFlow?.trim() || DEFAULT_BLOCKED_REASON,
      safeFallbackLabel: fd.safeFallback,
      primaryActions: ['edit_text', 'save_as_note', 'cancel'],
    }
  }

  // (3) Confiança baixa.
  if (fd.confidence === 'low') {
    return {
      kind: 'low_confidence',
      heard,
      understood: fd.whatIUnderstood,
      willDo: null,
      destination: fd.destination,
      destinationLabel: destinationLabel(fd.destination),
      clarifyingQuestion: null,
      modeSuggestionHint,
      lowConfidenceNote: DEFAULT_LOW_CONFIDENCE_NOTE,
      blockedReason: null,
      safeFallbackLabel: fd.safeFallback,
      primaryActions: ['edit_text', 'rerecord', 'cancel'],
    }
  }

  // (4) Pronto. Ações dependem do destino.
  return {
    kind: 'ready',
    heard,
    understood: fd.whatIUnderstood,
    willDo: fd.whatIWillDo ?? defaultWillDoFor(fd.destination),
    destination: fd.destination,
    destinationLabel: destinationLabel(fd.destination),
    clarifyingQuestion: null,
    modeSuggestionHint,
    lowConfidenceNote: null,
    blockedReason: null,
    safeFallbackLabel: fd.safeFallback,
    primaryActions: primaryActionsFor(fd, inputs),
  }
}

function destinationLabel(dest: VoxFlowDestination | null): string | null {
  return dest ? DESTINATION_LABEL[dest] : null
}

function defaultWillDoFor(dest: VoxFlowDestination | null): string {
  switch (dest) {
    case 'codex':
      return 'Vou preparar o pedido para o Codex e devolver pra você revisar.'
    case 'claude':
      return 'Vou preparar o pedido para o Claude e devolver pra você revisar.'
    case 'terminal_proposal':
      return 'Vou propor um comando. Você decide se executa — eu não aperto Enter.'
    case 'clipboard':
      return 'Vou colocar o resultado no clipboard ou inserir no campo focado.'
    case 'note':
      return 'Vou salvar isso como nota no Atlas Inbox.'
    case 'atlas':
      return 'Vou responder direto aqui no Atlas.'
    case 'none':
    case null:
    default:
      return 'Vou preparar a resposta e te devolver para revisar.'
  }
}

function primaryActionsFor(
  fd: VoxFlowDecision,
  _inputs: VoxSmartPreviewInputs,
): VoxSmartPreviewAction[] {
  switch (fd.destination) {
    case 'terminal_proposal':
      // Nunca executa direto — operador copia/insere e roda fora.
      return ['copy', 'insert', 'cancel']
    case 'codex':
    case 'claude':
      // Operador confirma envio (governed_execute path lá no Kernel).
      return ['confirm', 'edit_text', 'cancel']
    case 'clipboard':
      return ['insert', 'copy', 'cancel']
    case 'note':
      return ['save_as_note', 'cancel']
    case 'atlas':
      return ['copy', 'cancel']
    case 'none':
    case null:
    default:
      return ['confirm', 'edit_text', 'cancel']
  }
}

// ── Fallback helpers para backend antigo (sem flow_decision) ────────────

function legacyDestinationFrom(inputs: VoxSmartPreviewInputs): VoxFlowDestination | null {
  if (inputs.providerHint === 'codex_cli') return 'codex'
  if (inputs.providerHint === 'claude_cli') return 'claude'
  if (inputs.executorHint === 'terminal_propose' || inputs.executorHint === 'shell') {
    return 'terminal_proposal'
  }
  if (inputs.executorHint === 'note') return 'note'
  if (inputs.effectiveMode === 'dictation' || inputs.effectiveMode === 'prompt_polish') {
    return 'clipboard'
  }
  return null
}

function legacyDestinationLabelFrom(inputs: VoxSmartPreviewInputs): string | null {
  const dest = legacyDestinationFrom(inputs)
  return dest ? DESTINATION_LABEL[dest] : null
}

function legacyBlockedReason(inputs: VoxSmartPreviewInputs): string | null {
  return inputs.legacyRiskClass === 'R4' ? DEFAULT_BLOCKED_REASON : null
}

function legacyPrimaryActions(inputs: VoxSmartPreviewInputs): VoxSmartPreviewAction[] {
  if (inputs.legacyRiskClass === 'R4') return ['edit_text', 'save_as_note', 'cancel']
  const dest = legacyDestinationFrom(inputs)
  switch (dest) {
    case 'terminal_proposal':
      return ['copy', 'insert', 'cancel']
    case 'codex':
    case 'claude':
      return ['confirm', 'edit_text', 'cancel']
    case 'clipboard':
      return ['insert', 'copy', 'cancel']
    case 'note':
      return ['save_as_note', 'cancel']
    case 'atlas':
      return ['copy', 'cancel']
    case 'none':
    case null:
    default:
      return ['confirm', 'edit_text', 'cancel']
  }
}

/** Conveniência: extrai os inputs de um `kernelResponse` típico. */
export function smartPreviewInputsFromKernel(
  kernelResponse: VoxKernelIntentResponse | null,
  effectiveMode: VoxMode | null,
  modeWasAutoPicked: boolean,
  transcriptDraft: string | null,
): VoxSmartPreviewInputs {
  return {
    flowDecision: kernelResponse?.flowDecision ?? null,
    effectiveMode,
    modeWasAutoPicked,
    providerHint: kernelResponse?.providerHint ?? null,
    executorHint: kernelResponse?.executorHint ?? null,
    legacyRiskClass: kernelResponse?.riskClass ?? null,
    legacyWhatIHeard: kernelResponse?.previewWhatIHeard ?? null,
    legacyWhatIUnderstood: kernelResponse?.previewWhatIUnderstood ?? null,
    legacyWhatIWillDo: kernelResponse?.previewWhatIWillDo ?? null,
    transcriptDraft,
  }
}

/** Label PT-BR humano para cada ação — pra UI mapear botões. */
export const VOX_SMART_PREVIEW_ACTION_LABEL: Record<VoxSmartPreviewAction, string> = {
  answer_clarification: 'Responder',
  edit_text: 'Editar texto',
  rerecord: 'Gravar de novo',
  cancel: 'Cancelar',
  confirm: 'Confirmar',
  copy: 'Copiar',
  insert: 'Inserir',
  save_as_note: 'Salvar como nota',
}

export type { VoxFlowConfidence, VoxFlowDecision, VoxFlowDestination }
