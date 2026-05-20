import assert from 'node:assert/strict'
import test from 'node:test'
import { prepareAtlasAiSpeechText, speakAtlasAiText } from '../atlasAiVoiceReply'

test('Atlas AI voice reply removes markdown and code before local speech', () => {
  const spoken = prepareAtlasAiSpeechText(`
## Resposta

Aqui está o plano:

\`\`\`ts
console.log('não leia código inteiro')
\`\`\`

- **Faça primeiro** [isto](https://atlas.local).
`)

  assert.equal(
    spoken,
    'Resposta Aqui está o plano: trecho de código omitido. Faça primeiro isto.',
  )
})

test('Atlas AI voice reply caps long answers for conversational flow', () => {
  const spoken = prepareAtlasAiSpeechText('palavra '.repeat(400))
  assert.ok(spoken.length < 1900)
  assert.ok(spoken.endsWith('Resposta longa; deixei o restante em texto.'))
})

test('Atlas AI voice reply accepts a shorter cap for live voice mode', () => {
  const spoken = prepareAtlasAiSpeechText('palavra '.repeat(400), 720)
  assert.ok(spoken.length < 820)
  assert.ok(spoken.endsWith('Resposta longa; deixei o restante em texto.'))
})

test('Atlas AI voice reply never falls back to browser speech', async () => {
  let attemptedBrowserSpeech = false
  const previousWindow = globalThis.window

  ;(globalThis as unknown as { window: unknown }).window = {
    speechSynthesis: {
      cancel() {},
      getVoices() {
        return []
      },
      speak() {
        attemptedBrowserSpeech = true
      },
    },
  }

  try {
    assert.equal(await speakAtlasAiText('Entendi.'), false)
    assert.equal(attemptedBrowserSpeech, false)
  } finally {
    ;(globalThis as unknown as { window: unknown }).window = previousWindow
  }
})
