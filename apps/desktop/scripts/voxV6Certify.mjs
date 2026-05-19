#!/usr/bin/env node
/**
 * Atlas Vox V6 · companion helper para `php artisan atlas:vox:v6-certify`.
 *
 * Pergunta única: o que rodar do lado desktop ANTES de pedir a cert oficial?
 *
 * O que faz, em ordem:
 *   1. Roda `npm run vox:release-check` (que por sua vez roda build, smoke
 *      e visual-smoke). Isso regrava os manifests usados pela artisan cert.
 *   2. Localiza o atlas-server irmão e roda
 *      `php artisan atlas:vox:v6-certify --json`.
 *   3. Combina os dois resultados num envelope
 *      `atlas.vox.v6_desktop_companion.v1` e grava em
 *      `apps/desktop/test-results/vox-v6-certify/manifest.json`.
 *
 * Hard rules:
 *   - Nunca chama API paga.
 *   - Nunca grava áudio.
 *   - Nunca executa shell arbitrário — apenas `npm`, `node` e
 *     `php artisan atlas:vox:v6-certify` (read-only).
 *   - Comando principal documentado continua sendo a artisan cert; este
 *     script é só conveniência pra ter um caminho único do desktop.
 *
 * Exit codes:
 *   0  → status='pass'
 *   0  → status='warn' (artisan não-strict)
 *   1  → status='fail' OU artisan strict + warn
 */

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DESKTOP_ROOT = resolve(__dirname, '..')
// atlas-desktop é o root da workspace npm (`@atlas/desktop`).
const ATLAS_DESKTOP_ROOT = resolve(DESKTOP_ROOT, '..', '..')
const REPO_ROOT = resolve(ATLAS_DESKTOP_ROOT, '..')
const SERVER_ROOT = join(REPO_ROOT, 'atlas-server')
const OUT_DIR = join(DESKTOP_ROOT, 'test-results', 'vox-v6-certify')
mkdirSync(OUT_DIR, { recursive: true })
const OUT_PATH = join(OUT_DIR, 'manifest.json')

const STARTED_AT = Date.now()
const steps = []
let aggregate = 'pass'

function escalate(next) {
  if (aggregate === 'fail' || next === 'fail') aggregate = 'fail'
  else if (aggregate === 'warn' || next === 'warn') aggregate = 'warn'
}

function step(id, title, fn) {
  const startedAt = Date.now()
  let result
  try {
    result = fn() ?? { status: 'pass', summary: '' }
  } catch (e) {
    result = {
      status: 'fail',
      summary: `Step explodiu: ${e?.message ?? e}`,
      detail: { error: String(e?.message ?? e) },
    }
  }
  result.id = id
  result.title = title
  result.duration_ms = Date.now() - startedAt
  steps.push(result)
  escalate(result.status)
  const marker =
    result.status === 'pass' ? '·' : result.status === 'warn' ? '!' : '✖'
  console.log(`  ${marker} [${result.status}] ${id} — ${result.summary}`)
}

function runNpm(scriptName) {
  const result = spawnSync(
    'npm',
    ['run', '--silent', scriptName, '--workspace=@atlas/desktop'],
    { cwd: ATLAS_DESKTOP_ROOT, stdio: 'pipe', encoding: 'utf8' },
  )
  return result
}

step('vox_release_check', 'vox:release-check (build + smoke + visual-smoke)', () => {
  const res = runNpm('vox:release-check')
  const code = res.status
  const manifestPath = join(
    DESKTOP_ROOT,
    'test-results',
    'vox-release-check',
    'manifest.json',
  )
  let manifest = null
  if (existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    } catch (_) {
      manifest = null
    }
  }
  const declaredStatus =
    typeof manifest?.status === 'string' ? manifest.status : null
  let status
  if (code === 0 && declaredStatus === 'pass') status = 'pass'
  else if (code === 0 && declaredStatus === 'warn') status = 'warn'
  else if (code === 0 && declaredStatus === null) status = 'warn'
  else status = 'fail'
  return {
    status,
    summary:
      declaredStatus !== null
        ? `manifest=${declaredStatus} · ${manifest?.totals?.pass ?? 0} pass / ${manifest?.totals?.warn ?? 0} warn / ${manifest?.totals?.fail ?? 0} fail`
        : `exit=${code}`,
    detail: {
      exit: code,
      manifest_path: existsSync(manifestPath)
        ? manifestPath.replace(process.env.HOME ?? '', '~')
        : null,
      manifest_status: declaredStatus,
      totals: manifest?.totals ?? null,
    },
  }
})

step('artisan_v6_certify', 'php artisan atlas:vox:v6-certify --json', () => {
  if (!existsSync(SERVER_ROOT)) {
    return {
      status: 'warn',
      summary: 'atlas-server não localizado ao lado de atlas-desktop — pulei artisan.',
      detail: { expected_at: SERVER_ROOT },
    }
  }
  const phpPath = process.env.ATLAS_PHP_BIN ?? '/opt/homebrew/bin/php'
  const res = spawnSync(
    phpPath,
    ['artisan', 'atlas:vox:v6-certify', '--json'],
    { cwd: SERVER_ROOT, stdio: 'pipe', encoding: 'utf8' },
  )
  if (res.status === null) {
    return {
      status: 'fail',
      summary: 'php artisan não pôde ser invocado (binário ausente?).',
      detail: { php_bin: phpPath, error: String(res.error ?? '') },
    }
  }
  let envelope = null
  try {
    envelope = JSON.parse(res.stdout)
  } catch (_) {
    envelope = null
  }
  const declared = envelope?.status ?? null
  let status
  if (declared === 'pass') status = 'pass'
  else if (declared === 'warn') status = 'warn'
  else status = 'fail'
  return {
    status,
    summary:
      envelope !== null
        ? `cert=${declared} · ${envelope?.summary?.totals?.pass ?? 0} pass / ${envelope?.summary?.totals?.warn ?? 0} warn / ${envelope?.summary?.totals?.fail ?? 0} fail`
        : `exit=${res.status} sem envelope JSON parseável`,
    detail: {
      exit: res.status,
      php_bin: phpPath,
      schema: envelope?.schema ?? null,
      cert_status: declared,
      v6_ready_for_dogfood: envelope?.v6_ready_for_dogfood ?? null,
      // V6-H · novos sinais derivados do envelope artisan. Tudo nullable
      // pra continuar funcionando com backends antigos.
      ready_for_daily_use: envelope?.ready_for_daily_use ?? null,
      v7_unlock_allowed: envelope?.v7_unlock_allowed ?? null,
      v7_would_unlock_if_doctrine_allowed:
        envelope?.v7_unlock_status?.would_unlock_if_doctrine_allowed ?? null,
      v7_blockers_pt_br: envelope?.v7_unlock_status?.blockers_pt_br ?? [],
      dogfood_headline_pt_br: envelope?.dogfood_summary?.headline_pt_br ?? null,
      dogfood_sentences_pt_br:
        envelope?.dogfood_summary?.sentences_pt_br ?? [],
      totals: envelope?.summary?.totals ?? null,
      next_actions: envelope?.next_actions ?? [],
    },
  }
})

const envelope = {
  schema: 'atlas.vox.v6_desktop_companion.v1',
  status: aggregate,
  generated_at: new Date().toISOString(),
  duration_ms: Date.now() - STARTED_AT,
  totals: steps.reduce(
    (acc, s) => {
      acc.total++
      acc[s.status] = (acc[s.status] ?? 0) + 1
      return acc
    },
    { total: 0, pass: 0, warn: 0, fail: 0 },
  ),
  steps,
  hint: 'Comando principal documentado: `php artisan atlas:vox:v6-certify --json`.',
}

writeFileSync(OUT_PATH, JSON.stringify(envelope, null, 2))

// V6-OBSERVABILITY-FINAL · resposta direta no topo. Em vez de um cabeçalho
// técnico "status=pass pass=X warn=Y fail=Z", abrimos respondendo à
// pergunta que importa pro operador: "Atlas Vox V6 está pronto?".
const directAnswer = envelope.status === 'pass'
  ? 'Sim. Atlas Vox V6 está pronto.'
  : envelope.status === 'warn'
    ? 'Pronto com ressalvas — revise os itens marcados antes de uso pesado.'
    : 'Ainda não — algo crítico bloqueou. Resolva os itens marcados.'
console.log('')
console.log('Atlas Vox V6 está pronto?')
console.log('')
console.log(`  ${directAnswer}`)
console.log('')
console.log('Etapas verificadas:')
for (const s of envelope.steps) {
  const marker = s.status === 'pass' ? '✓' : s.status === 'warn' ? '!' : '✖'
  const label = s.id === 'vox_release_check'
    ? 'Release check (build + smokes + muralha de regressão)'
    : s.id === 'artisan_v6_certify'
      ? 'Certificação oficial do servidor'
      : s.title
  console.log(`  ${marker}  ${label} — ${s.summary}`)
}
console.log('')
console.log(`Detalhes técnicos: ${OUT_PATH.replace(process.env.HOME ?? '', '~')}`)
console.log('Para o envelope completo do servidor: php artisan atlas:vox:v6-certify --json')

process.exit(envelope.status === 'fail' ? 1 : 0)
