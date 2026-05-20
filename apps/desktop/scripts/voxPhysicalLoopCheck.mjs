#!/usr/bin/env node
/**
 * Atlas Voice · physical loop check.
 *
 * This command does not fake microphone/audio validation. It guides the
 * operator through the real 3-turn loop and writes an auditable manifest.
 */

import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const resultsDir = join(root, 'test-results', 'vox-physical-loop-check')
const manifestPath = join(resultsDir, 'manifest.json')
mkdirSync(resultsDir, { recursive: true })

function run(command, args) {
  return spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: 'pipe',
    env: { ...process.env },
  })
}

function yes(value) {
  return ['s', 'sim', 'y', 'yes'].includes(value.trim().toLowerCase())
}

function no(value) {
  return ['n', 'nao', 'não', 'no'].includes(value.trim().toLowerCase())
}

async function askYesNo(rl, question) {
  while (true) {
    const answer = await rl.question(`${question} [s/n] `)
    if (yes(answer)) return true
    if (no(answer)) return false
    output.write('Responda com s ou n.\n')
  }
}

const startedAt = Date.now()
const generatedAt = new Date().toISOString()

output.write('Atlas Voice · validação física de 3 turnos\n')
output.write('──────────────────────────────────────────\n\n')
output.write('Antes de responder, use o app real em /Applications/Atlas Code.app.\n')
output.write('Fluxo esperado: falar → envio automático → resposta por voz → volta a ouvir.\n\n')

const automated = run('npm', ['run', 'vox:voice-loop-check', '--workspace=@atlas/desktop'])
const automatedStatus = automated.status === 0 ? 'pass' : 'fail'
output.write(`Pré-check automatizado: ${automatedStatus.toUpperCase()}\n\n`)

const rl = createInterface({ input, output })
const turns = []

for (let index = 1; index <= 3; index += 1) {
  output.write(`Turno ${index}\n`)
  if (index === 1) {
    output.write('1. Acione Atlas Voice uma única vez.\n')
    output.write('2. Fale uma frase com uma pausa natural no meio.\n')
    output.write('3. Pare de falar e espere a resposta em voz.\n')
    output.write('4. Verifique se ele ficou pronto para o próximo turno.\n')
  } else {
    output.write('1. Não aperte nenhum botão e não reabra nada.\n')
    output.write('2. Fale a próxima frase com uma pausa natural quando ele voltar a ouvir.\n')
    output.write('3. Pare de falar e espere a resposta em voz.\n')
    output.write('4. Verifique se o ciclo continuou sem intervenção manual.\n')
  }

  const heard = await askYesNo(rl, 'Ele captou sua fala corretamente?')
  const waited = await askYesNo(rl, 'Ele esperou você terminar, sem cortar na primeira pausa?')
  const sent = await askYesNo(rl, 'Ele enviou automaticamente sem você apertar enviar?')
  const replied = await askYesNo(rl, 'Ele respondeu em voz pelo ElevenLabs?')
  const rearmed = index < 3
    ? await askYesNo(rl, 'Ele voltou a ouvir sem fechar/reabrir nada?')
    : await askYesNo(rl, 'O terceiro turno terminou sem travar a conversa?')

  turns.push({
    turn: index,
    manual_intervention_allowed: index === 1,
    heard,
    waited,
    sent,
    replied,
    rearmed,
    status: heard && waited && sent && replied && rearmed ? 'pass' : 'fail',
  })

  output.write('\n')
}

const allTurnsPassed = turns.every((turn) => turn.status === 'pass')
const status = automatedStatus === 'pass' && allTurnsPassed ? 'pass' : 'fail'
const note = await rl.question('Observação opcional sobre latência/qualidade: ')
rl.close()

const manifest = {
  schema: 'atlas.voice.physical_loop_check.v1',
  status,
  generated_at: generatedAt,
  duration_ms: Date.now() - startedAt,
  automated_precheck: {
    status: automatedStatus,
    command: 'npm run vox:voice-loop-check --workspace=@atlas/desktop',
  },
  physical_validation: {
    required_turns: 3,
    turns,
    all_turns_passed: allTurnsPassed,
    operator_note: note.trim(),
  },
  completion_signal: status === 'pass'
    ? 'physical_3_turn_voice_loop_confirmed'
    : 'physical_3_turn_voice_loop_failed_or_incomplete',
}

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

if (status === 'pass') {
  output.write('Resultado: PASS físico. O ciclo de 3 turnos foi confirmado.\n')
} else {
  output.write('Resultado: FAIL físico. Não feche o goal; corrija o ponto que falhou.\n')
  process.exitCode = 1
}

output.write(`manifest: ${manifestPath}\n`)
