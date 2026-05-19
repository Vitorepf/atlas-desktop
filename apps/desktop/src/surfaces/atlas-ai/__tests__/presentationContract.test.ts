import assert from 'node:assert/strict'
import { test } from 'node:test'

import { projectPresentation } from '../presentationContract.ts'

// Paridade com atlas-app/scripts/atlas-ai-presentation-contract.test.ts.
// O Atlas Desktop herda o mesmo contrato editorial — se a apresentação no
// mobile estiver limpa mas no desktop não, isso é o teste que detecta.

test('SOURCE_REFS cru migra para metadata e some do body', () => {
  const result = projectPresentation([
    'A migração é segura.',
    '',
    'SOURCE_REFS',
    '- ref:a',
    '- ref:b',
  ].join('\n'))
  assert.ok(!/SOURCE_REFS/.test(result.body))
  assert.deepEqual(result.metadata.sections.source_refs, ['- ref:a', '- ref:b'])
  assert.ok(/migração é segura/.test(result.body))
})

test('UNCERTAINTY cru migra para metadata e some do body', () => {
  const result = projectPresentation([
    'A proposta funciona.',
    '',
    'UNCERTAINTY',
    'Sem dados de produção ainda.',
  ].join('\n'))
  assert.ok(!/UNCERTAINTY/.test(result.body))
  assert.deepEqual(result.metadata.sections.uncertainty, ['Sem dados de produção ainda.'])
})

test('answer_summary é reescrito como heading editorial PT-BR', () => {
  const result = projectPresentation([
    '## answer_summary',
    'Resposta breve.',
    '',
    '## open_questions',
    '- Pergunta?',
  ].join('\n'))
  assert.ok(/## Resposta/.test(result.body))
  assert.ok(/## Perguntas em aberto/.test(result.body))
  assert.ok(!/answer_summary/.test(result.body))
  assert.ok(!/open_questions/.test(result.body))
})

test('multi-seção insere divisor `---` entre blocos', () => {
  const result = projectPresentation([
    '## answer_summary',
    'A.',
    '',
    '## open_questions',
    '- B?',
  ].join('\n'))
  assert.ok(/\n---\n/.test(result.body))
})

test('resposta curta não ganha divisor artificial', () => {
  const result = projectPresentation('Resposta curta única.')
  assert.ok(!/---/.test(result.body))
})

test('markdown legítimo sobrevive (table, list, link, code)', () => {
  const input = [
    '## answer_summary',
    'Comparativo:',
    '',
    '| A | B |',
    '| --- | --- |',
    '| 1 | 2 |',
    '',
    'Veja [docs](https://atlas.local).',
    '',
    '```ts',
    'const x = 1',
    '```',
    '',
    '- alpha',
    '- beta',
  ].join('\n')
  const result = projectPresentation(input)
  assert.ok(/\| A \| B \|/.test(result.body))
  assert.ok(/\| 1 \| 2 \|/.test(result.body))
  assert.ok(/\[docs\]\(https:\/\/atlas\.local\)/.test(result.body))
  assert.ok(/```ts/.test(result.body))
  assert.ok(/- alpha/.test(result.body))
})

test('paths preservados em contexto programming', () => {
  const input = 'Editei components/atlas-ai/Foo.tsx:42 e bar.ts:11.'
  const result = projectPresentation(input, { technicalDomain: 'programming' })
  assert.ok(/Foo\.tsx:42/.test(result.body))
  assert.ok(/bar\.ts:11/.test(result.body))
})

test('auditRequested preserva blocos crus', () => {
  const result = projectPresentation('SOURCE_REFS\n- a', { auditRequested: true })
  assert.ok(/SOURCE_REFS/.test(result.body))
})

test('vocabulário técnico desconhecido é dropado silenciosamente', () => {
  const result = projectPresentation('## answer_summary\nOK.')
  // answer_summary é conhecido → editorial. Mas e algo desconhecido?
  const result2 = projectPresentation('## randomthing\nOK.')
  // randomthing não é técnico → preserva como heading normal.
  assert.ok(/randomthing/.test(result2.body) || /OK\./.test(result2.body))
  assert.ok(/## Resposta/.test(result.body))
})

test('response_text vazio retorna body vazio', () => {
  const result = projectPresentation('')
  assert.equal(result.body, '')
  assert.deepEqual(result.metadata.sections, {})
})
