/**
 * V5-B · pure helpers do Atlas Vox Symbiotic Interlocutor.
 *
 * Estes helpers convertem o `interlocutor.suggested_edit` que o Kernel V5-A
 * devolve em texto editável que o operador pode revisar antes de recompilar.
 * Não há rede, não há LLM, não há clipboard — o Kernel é fonte de verdade do
 * que ele devolveu; o frontend só transforma honestamente.
 *
 * Honestidade:
 *   - Nunca inventa intervenção. Quando o Kernel devolve `suggested_edit=null`,
 *     `composeStructuredPromptTemplate` devolve `null` e a UI mostra apenas a
 *     mensagem original.
 *   - `composeInterlocutorReply` apenas ANEXA o esclarecimento ao transcript;
 *     nunca apaga o que o operador disse.
 */
import type { VoxInterlocutorDecision } from './bridge'

/**
 * Anexa a resposta do operador ao transcript original, preparando o texto que
 * será reenviado ao Kernel via `/ai/vox/intent`. O Kernel não tem campo
 * dedicado para `clarification_response`; o caminho honesto é enriquecer o
 * próprio transcript com o esclarecimento e deixar o Auto Mode Router +
 * Interlocutor reavaliarem com o novo contexto.
 */
export function composeInterlocutorReply(
  originalTranscript: string,
  operatorReply: string,
): string {
  const base = (originalTranscript ?? '').trimEnd()
  const reply = (operatorReply ?? '').trim()
  if (reply === '') return originalTranscript ?? ''
  if (base === '') return `Esclarecimento do operador: ${reply}`
  return `${base}\n\nEsclarecimento do operador: ${reply}`
}

/**
 * Monta um modelo de prompt estruturado a partir de `suggested_edit`:
 *   - `suggest_better_prompt` → seções (Objetivo / Contexto / Restrições /
 *     Critério de aceite) com hints PT-BR vindos do Kernel.
 *   - `disagree` com `safer_path` → texto reescrito com o caminho mais seguro.
 *
 * Devolve `null` quando o Kernel não enviou edição sugerida (nada para aplicar).
 */
export function composeStructuredPromptTemplate(
  decision: VoxInterlocutorDecision | null,
  originalTranscript: string,
): string | null {
  if (!decision) return null
  const edit = decision.suggestedEdit
  if (!edit) return null
  const safeOriginal = (originalTranscript ?? '').trim()

  if (decision.intervention === 'suggest_better_prompt') {
    const sectionsRaw = Array.isArray(edit.add_sections) ? edit.add_sections : []
    const sections = sectionsRaw
      .filter((s): s is string => typeof s === 'string' && s.trim() !== '')
      .map((s) => s.trim())
    const goalHint = typeof edit.goal_hint === 'string' ? edit.goal_hint.trim() : ''
    const constraintsHint =
      typeof edit.constraints_hint === 'string' ? edit.constraints_hint.trim() : ''
    const acceptanceHint =
      typeof edit.acceptance_hint === 'string' ? edit.acceptance_hint.trim() : ''
    if (sections.length === 0 && goalHint === '' && constraintsHint === '' && acceptanceHint === '') {
      return null
    }
    const lines: string[] = []
    if (safeOriginal !== '') {
      lines.push(`Pedido original: ${safeOriginal}`)
      lines.push('')
    }
    const expand = (heading: string, hint: string) => {
      const display = heading.charAt(0).toUpperCase() + heading.slice(1)
      lines.push(`${display}:`)
      lines.push(hint !== '' ? `  ${hint}` : '  ')
      lines.push('')
    }
    const known: Record<string, string> = {
      objetivo: goalHint || 'Descreva o que a IA deve fazer (um verbo + um alvo).',
      'objetivos': goalHint || 'Descreva o que a IA deve fazer (um verbo + um alvo).',
      contexto: 'Liste o que a IA precisa saber para acertar de primeira.',
      'restrições': constraintsHint || 'Liste o que NÃO deve mexer e o que DEVE preservar.',
      'restricoes': constraintsHint || 'Liste o que NÃO deve mexer e o que DEVE preservar.',
      'critério de aceite': acceptanceHint || 'Como você vai validar que ficou pronto.',
      'criterio de aceite': acceptanceHint || 'Como você vai validar que ficou pronto.',
    }
    const usedKeys = new Set<string>()
    for (const raw of sections) {
      const key = raw.toLowerCase()
      const hint = known[key] ?? ''
      expand(raw, hint)
      usedKeys.add(key)
    }
    if (sections.length === 0) {
      // Sem add_sections explícitas: monta o quarteto canon com os hints
      // crus do Kernel.
      expand('Objetivo', goalHint || 'Descreva o que a IA deve fazer (um verbo + um alvo).')
      expand('Contexto', 'Liste o que a IA precisa saber para acertar de primeira.')
      expand('Restrições', constraintsHint || 'Liste o que NÃO deve mexer e o que DEVE preservar.')
      expand(
        'Critério de aceite',
        acceptanceHint || 'Como você vai validar que ficou pronto.',
      )
    }
    return lines.join('\n').trimEnd()
  }

  if (decision.intervention === 'disagree') {
    const safer = typeof edit.safer_path === 'string' ? edit.safer_path.trim() : ''
    if (safer === '') return null
    if (safeOriginal === '') {
      return `Refazer o pedido seguindo o caminho mais seguro: ${safer}.`
    }
    return `${safeOriginal}\n\nAjuste sugerido pelo Atlas: ${safer}.`
  }

  return null
}

/**
 * Chave estável para "dismissar" uma intervenção localmente (operador clicou
 * em "Manter original" ou "Continuar mesmo assim"). Quando o Kernel devolver
 * uma decisão com a mesma chave de novo, a UI sabe que pode esconder.
 */
export function interlocutorDismissalKey(
  decision: VoxInterlocutorDecision | null,
  receiptId: string | null,
): string | null {
  if (!decision) return null
  if (decision.intervention === 'none') return null
  return [
    receiptId ?? 'no-receipt',
    decision.intervention,
    decision.reasonCode,
    decision.policyVersion,
  ].join('::')
}
