/**
 * V5-B · contract tests for the Symbiotic Interlocutor frontend helpers.
 *
 * O policy V5-A vive no backend (atlas-server). Aqui só validamos que os
 * helpers do desktop transformam HONESTAMENTE o `suggested_edit` em texto
 * editável pelo operador. Nada de mock de Kernel.
 */
import { strict as assert } from 'node:assert'
import test from 'node:test'

import {
  composeInterlocutorReply,
  composeStructuredPromptTemplate,
  interlocutorDismissalKey,
} from '../voxInterlocutor'

const baseDecision = {
  schema: 'atlas.vox.interlocutor_decision.v1' as const,
  intervention: 'none' as const,
  messagePtBr: '',
  questionPtBr: '',
  blocking: false,
  reasonCode: 'none' as const,
  suggestedEdit: null,
  policyVersion: '0.1.0',
}

test('composeInterlocutorReply anexa a resposta ao transcript original', () => {
  const out = composeInterlocutorReply(
    'roda os testes daquele projeto',
    'aqui no atlas-server',
  )
  assert.equal(
    out,
    'roda os testes daquele projeto\n\nEsclarecimento do operador: aqui no atlas-server',
  )
})

test('composeInterlocutorReply ignora resposta em branco', () => {
  assert.equal(composeInterlocutorReply('texto base', '   '), 'texto base')
  assert.equal(composeInterlocutorReply('texto base', ''), 'texto base')
})

test('composeInterlocutorReply lida com transcript vazio', () => {
  assert.equal(
    composeInterlocutorReply('', 'na obra atual'),
    'Esclarecimento do operador: na obra atual',
  )
})

test('composeStructuredPromptTemplate devolve null quando suggested_edit é null', () => {
  const decision = {
    ...baseDecision,
    intervention: 'suggest_better_prompt' as const,
    messagePtBr: 'prompt fraco',
    suggestedEdit: null,
  }
  assert.equal(composeStructuredPromptTemplate(decision, 'qualquer'), null)
})

test('composeStructuredPromptTemplate gera template canon a partir de add_sections', () => {
  const decision = {
    ...baseDecision,
    intervention: 'suggest_better_prompt' as const,
    messagePtBr: 'prompt fraco',
    suggestedEdit: {
      add_sections: ['objetivo', 'contexto', 'restrições', 'critério de aceite'],
      goal_hint: 'Descrever o que a IA deve fazer.',
      constraints_hint: 'Listar o que NÃO deve mexer.',
      acceptance_hint: 'Validar com build verde.',
    },
  }
  const tmpl = composeStructuredPromptTemplate(decision, 'arruma esse bug')
  assert.ok(tmpl, 'template não pode ser nulo quando há add_sections')
  assert.match(tmpl!, /Pedido original: arruma esse bug/)
  assert.match(tmpl!, /objetivo:/i)
  assert.match(tmpl!, /Descrever o que a IA deve fazer/)
  assert.match(tmpl!, /restrições:/i)
  assert.match(tmpl!, /Listar o que NÃO deve mexer/)
  assert.match(tmpl!, /Validar com build verde/)
})

test('composeStructuredPromptTemplate gera template default sem add_sections', () => {
  const decision = {
    ...baseDecision,
    intervention: 'suggest_better_prompt' as const,
    messagePtBr: 'prompt fraco',
    suggestedEdit: {
      goal_hint: 'Investigar módulo X.',
    },
  }
  const tmpl = composeStructuredPromptTemplate(decision, 'roda isso')
  assert.ok(tmpl)
  assert.match(tmpl!, /Objetivo:/)
  assert.match(tmpl!, /Investigar módulo X/)
  assert.match(tmpl!, /Restrições:/)
  assert.match(tmpl!, /Critério de aceite:/)
})

test('composeStructuredPromptTemplate disagree reescreve com safer_path', () => {
  const decision = {
    ...baseDecision,
    intervention: 'disagree' as const,
    messagePtBr: 'tem rm -rf',
    suggestedEdit: {
      safer_path: 'mover para uma pasta de quarentena antes de remover',
      destructive_marker: 'rm_rf',
    },
  }
  const out = composeStructuredPromptTemplate(decision, 'limpa esse diretório com rm -rf')
  assert.ok(out)
  assert.match(out!, /Ajuste sugerido pelo Atlas: mover para uma pasta de quarentena/)
})

test('composeStructuredPromptTemplate disagree sem safer_path devolve null', () => {
  const decision = {
    ...baseDecision,
    intervention: 'disagree' as const,
    suggestedEdit: { destructive_marker: 'rm_rf' },
  }
  assert.equal(composeStructuredPromptTemplate(decision, 'qualquer'), null)
})

test('composeStructuredPromptTemplate ignora outras intervenções', () => {
  for (const intervention of ['clarify', 'caution', 'none'] as const) {
    const decision = {
      ...baseDecision,
      intervention,
      suggestedEdit: { safer_path: 'qualquer coisa' },
    }
    assert.equal(
      composeStructuredPromptTemplate(decision, 'texto'),
      null,
      `intervention=${intervention} não deve gerar template`,
    )
  }
})

test('interlocutorDismissalKey devolve null quando não há intervenção real', () => {
  assert.equal(interlocutorDismissalKey(null, 'rcpt_1'), null)
  const none = { ...baseDecision }
  assert.equal(interlocutorDismissalKey(none, 'rcpt_1'), null)
})

test('interlocutorDismissalKey gera chave estável por receipt+intervenção+versão', () => {
  const decision = {
    ...baseDecision,
    intervention: 'caution' as const,
    reasonCode: 'destructive_risk' as const,
    policyVersion: '0.1.0',
  }
  const a = interlocutorDismissalKey(decision, 'rcpt_x')
  const b = interlocutorDismissalKey(decision, 'rcpt_x')
  assert.equal(a, b)
  const c = interlocutorDismissalKey(decision, 'rcpt_y')
  assert.notEqual(a, c)
})
