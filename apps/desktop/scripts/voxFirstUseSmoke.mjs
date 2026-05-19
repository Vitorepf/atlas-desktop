#!/usr/bin/env node
/**
 * Atlas Vox · first-use smoke (Onda 7.8 / Claude W).
 *
 * Question this script tries to answer:
 *
 *     "Vitor consegue usar Atlas Vox AGORA?"
 *
 * What it does:
 *   1. Reads `apps/desktop/src/lib/bridge.ts` and confirms the canonical Vox
 *      APIs (edge / stt / kernel / hotkey / dogfood) are exported.
 *   2. Greps `crates/atlas-tauri/src/` for the Tauri command names the bridge
 *      expects to call (`vox_edge_*`, `vox_stt_*`).
 *   3. Greps `crates/atlas-tauri/src/commands_vox_hotkey.rs` for the runtime
 *      that drives Option+Space / Cmd+Shift+Space / Esc-Esc, and confirms
 *      every `vox://hotkey-*` event the bridge subscribes to is emitted from
 *      Rust.
 *   4. If `VITE_ATLAS_SERVER_URL` (or `ATLAS_SERVER_URL`) is set, probes the
 *      three Vox HTTP endpoints the overlay actually touches:
 *        `/ai/vox/health`, `/ai/vox/readiness` (best-effort), `/ai/vox/gate-v3`.
 *   5. Checks for the Whisper model at
 *        `~/.atlas/vox/models/ggml-large-v3.bin`.
 *   6. Writes a JSON report under
 *        `test-results/vox-first-use-smoke/manifest.json`
 *      following schema `atlas.vox.first_use_smoke.v1`.
 *
 * What it does NOT do:
 *   - Never opens the microphone.
 *   - Never runs a provider (Codex / Claude / Wispr / etc).
 *   - Never spawns a shell.
 *   - Never invents pass results. Missing model = `warn`, missing Tauri
 *     commands = `fail`, no backend URL = `warn`.
 *
 * Exit codes:
 *   0 → status=pass
 *   0 → status=warn  (Vitor can still use Vox; some piece is honestly absent)
 *   1 → status=fail  (something Vox needs is missing in this repo state)
 *
 * Usage:
 *   npm run vox:smoke --workspace=@atlas/desktop
 *   VITE_ATLAS_SERVER_URL=http://127.0.0.1:8000 npm run vox:smoke --workspace=@atlas/desktop
 */

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// ──────────────────────────────────────────────────────────────────────────
// Paths
// ──────────────────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const DESKTOP_APP_ROOT = resolve(__dirname, '..')
// apps/desktop -> .. -> apps -> .. -> atlas-desktop
const REPO_ROOT = resolve(DESKTOP_APP_ROOT, '..', '..')
const SERVER_DIR = resolve(REPO_ROOT, '..', 'atlas-server')
const BRIDGE_PATH = join(DESKTOP_APP_ROOT, 'src', 'lib', 'bridge.ts')
const RUST_TAURI_SRC = join(REPO_ROOT, 'crates', 'atlas-tauri', 'src')
const RUST_VOX_FILES = [
  join(RUST_TAURI_SRC, 'commands_vox.rs'),
  join(RUST_TAURI_SRC, 'commands_vox_edge.rs'),
  join(RUST_TAURI_SRC, 'commands_vox_hotkey.rs'),
  join(RUST_TAURI_SRC, 'lib.rs'),
]
const HOTKEY_RS = join(RUST_TAURI_SRC, 'commands_vox_hotkey.rs')
// Wave 6.5 split the runtime: `commands_vox_hotkey.rs` (Tauri commands +
// dispatcher) lives in the tauri crate; the actual OS-level chord binding
// (Option+Space → ToggleRecordingRequested) lives in the platform crate at
// `crates/atlas-platform/src/vox/hotkey.rs`. The smoke checks both because
// the absence of either piece breaks first use.
const PLATFORM_HOTKEY_RS = join(
  REPO_ROOT,
  'crates',
  'atlas-platform',
  'src',
  'vox',
  'hotkey.rs',
)
const MODEL_FILE = join(homedir(), '.atlas', 'vox', 'models', 'ggml-large-v3.bin')

const REPORT_DIR = join(DESKTOP_APP_ROOT, 'test-results', 'vox-first-use-smoke')
const REPORT_PATH = join(REPORT_DIR, 'manifest.json')

const TAURI_COMMANDS = [
  'vox_edge_status',
  'vox_edge_start_session',
  'vox_edge_finish_session',
  'vox_edge_cancel_session',
  'vox_edge_eclipse',
  'vox_stt_status',
  'vox_stt_transcribe_audio',
  'vox_stt_transcribe_debug_text',
]

const HOTKEY_EVENTS = [
  'vox://hotkey-toggle-recording',
  'vox://hotkey-open-overlay',
  'vox://hotkey-eclipse',
  'vox://hotkey-status-changed',
]

// Bridge-level APIs the overlay calls. We don't need every single export —
// just the ones whose absence would break first use.
const BRIDGE_EXPORTS = [
  'voxEdgeStatus',
  'voxEdgeStartSession',
  'voxEdgeFinishSession',
  'voxEdgeCancelSession',
  'voxEdgeEclipse',
  'voxSttStatus',
  'voxSttTranscribeDebugText',
  'voxKernelIntent',
  'voxKernelExecute',
  'subscribeVoxEdgeEvent',
  'voxRivalsCaseCreate',
  'voxGateV3Get',
]

const HTTP_BASE = (process.env.VITE_ATLAS_SERVER_URL || process.env.ATLAS_SERVER_URL || '').trim()

// V3.10 (Claude AF) · token-aware probes. The atlas-server gates `/ai/vox/*`
// with the `atlas.token` middleware: requests without `X-Atlas-Token: <value>`
// get 401. The smoke must mirror what the desktop does at runtime, otherwise
// a perfectly wired server looks "auth-broken" to release-check.
//
// We read but NEVER print or persist the token value. The manifest only
// records the boolean `token_present` (and the count of probes where the
// header was actually attached). Anyone reading the report can verify the
// smoke "tried" without ever seeing the secret.
function readAtlasTokenFromServerEnv() {
  try {
    const envPath = join(SERVER_DIR, '.env')
    if (!existsSync(envPath)) return ''
    const text = readFileSync(envPath, 'utf8')
    const match = text.match(/^ATLAS_TOKEN=(.*)$/m)
    if (!match) return ''
    return match[1].trim().replace(/^["']|["']$/g, '')
  } catch {
    return ''
  }
}

const ATLAS_TOKEN_RAW = process.env.ATLAS_TOKEN ?? readAtlasTokenFromServerEnv()
const ATLAS_TOKEN = typeof ATLAS_TOKEN_RAW === 'string' ? ATLAS_TOKEN_RAW.trim() : ''
const TOKEN_PRESENT = ATLAS_TOKEN !== ''

// ──────────────────────────────────────────────────────────────────────────
// Check book-keeping
// ──────────────────────────────────────────────────────────────────────────
const checks = []
const nextActions = []

/** Status priorities: fail > warn > pass. */
function escalate(current, candidate) {
  const rank = { pass: 0, warn: 1, fail: 2 }
  return rank[candidate] > rank[current] ? candidate : current
}

function record({ id, status, summary, detail = null, nextAction = null, category = null }) {
  // `category` is machine-readable so downstream tools (voxReleaseCheck)
  // can route human messages without re-parsing the `nextAction` string.
  // Stable values:
  //   backend_url_missing | backend_unreachable | backend_no_vox_routes
  //   model_missing | model_truncated
  //   doctor_warn | doctor_fail
  //   bridge_drift | tauri_commands_drift | hotkey_drift
  checks.push({ id, status, summary, detail, next_action: nextAction, category })
  if (nextAction) nextActions.push({ check_id: id, action: nextAction, category })
}

function relativizePath(p) {
  // Anchor printed paths to the repo root so diffs are stable across machines
  // and we don't leak `/Users/<name>/...` into the report.
  const home = homedir()
  if (p.startsWith(home)) return '~' + p.slice(home.length)
  return p
}

// ──────────────────────────────────────────────────────────────────────────
// Individual checks
// ──────────────────────────────────────────────────────────────────────────
function checkBridge() {
  if (!existsSync(BRIDGE_PATH)) {
    record({
      id: 'bridge_present',
      status: 'fail',
      summary: 'bridge.ts não encontrado em apps/desktop/src/lib/.',
      detail: { expected_path: relativizePath(BRIDGE_PATH) },
      nextAction:
        'Verifique se você está em atlas-desktop e que `npm install` foi rodado neste workspace.',
    })
    return null
  }
  const src = readFileSync(BRIDGE_PATH, 'utf8')
  const missing = BRIDGE_EXPORTS.filter((name) => {
    // Accept any of the canonical export forms TS allows here.
    const patterns = [
      `export async function ${name}`,
      `export function ${name}`,
      `export const ${name}`,
    ]
    return !patterns.some((p) => src.includes(p))
  })
  if (missing.length === 0) {
    record({
      id: 'bridge_present',
      status: 'pass',
      summary: `bridge.ts exporta as ${BRIDGE_EXPORTS.length} APIs Vox principais.`,
      detail: { path: relativizePath(BRIDGE_PATH), bytes: src.length },
    })
  } else {
    record({
      id: 'bridge_present',
      status: 'fail',
      summary: `bridge.ts não exporta: ${missing.join(', ')}.`,
      detail: { path: relativizePath(BRIDGE_PATH), missing },
      nextAction:
        'Confira o estado de apps/desktop/src/lib/bridge.ts — algum slice de Vox foi removido.',
    })
  }
  return src
}

function checkTauriCommands() {
  if (!existsSync(RUST_TAURI_SRC)) {
    record({
      id: 'tauri_commands',
      status: 'fail',
      summary: 'crates/atlas-tauri/src/ não encontrado a partir da raiz do repo.',
      detail: { expected_path: relativizePath(RUST_TAURI_SRC) },
      nextAction:
        'Verifique o layout do repo: o script assume scripts/ em apps/desktop/scripts e crates/ no atlas-desktop/.',
    })
    return null
  }
  const sources = RUST_VOX_FILES.filter(existsSync).map((p) => ({
    path: p,
    src: readFileSync(p, 'utf8'),
  }))
  if (sources.length === 0) {
    record({
      id: 'tauri_commands',
      status: 'fail',
      summary: 'Nenhum dos arquivos commands_vox*.rs / lib.rs foi encontrado.',
      nextAction:
        'A entrega Rust da Onda 6.6 (STT) e 6.5 (hotkey) parece estar fora — rode `git status` e checkout do branch certo.',
    })
    return null
  }
  const fullSrc = sources.map((s) => s.src).join('\n')
  const found = []
  const missing = []
  for (const cmd of TAURI_COMMANDS) {
    // The command exists if either (a) it's defined as `pub fn <cmd>` OR
    // (b) it's wired into a `tauri::generate_handler!` invocation. We look
    // for the function name as a token so we don't trip on substrings.
    const tokenRe = new RegExp(`\\b${cmd}\\b`)
    if (tokenRe.test(fullSrc)) found.push(cmd)
    else missing.push(cmd)
  }
  if (missing.length === 0) {
    record({
      id: 'tauri_commands',
      status: 'pass',
      summary: `Todos os ${TAURI_COMMANDS.length} comandos Tauri Vox aparecem nos fontes Rust.`,
      detail: {
        commands: found,
        sources: sources.map((s) => relativizePath(s.path)),
      },
    })
    return fullSrc
  }
  record({
    id: 'tauri_commands',
    status: 'fail',
    summary: `Comandos Tauri Vox ausentes: ${missing.join(', ')}.`,
    detail: { found, missing },
    nextAction:
      'Confirme que o branch atual inclui as ondas 1 (edge), 6.6 (STT real) e 6.5 (hotkey).',
  })
  return fullSrc
}

function checkHotkeyRuntime(bridgeSrc) {
  const tauriRsExists = existsSync(HOTKEY_RS)
  const platformRsExists = existsSync(PLATFORM_HOTKEY_RS)
  if (!tauriRsExists && !platformRsExists) {
    record({
      id: 'hotkey_runtime',
      status: 'fail',
      summary:
        'Nenhum dos dois arquivos de hotkey runtime foi encontrado (tauri+platform).',
      detail: {
        expected_tauri: relativizePath(HOTKEY_RS),
        expected_platform: relativizePath(PLATFORM_HOTKEY_RS),
      },
      nextAction:
        'A Onda 6.5 (hotkey runtime Rust) precisa estar em main. Sem ela, Option+Space não dispara overlay.',
    })
    return
  }
  const tauriSrc = tauriRsExists ? readFileSync(HOTKEY_RS, 'utf8') : ''
  const platformSrc = platformRsExists ? readFileSync(PLATFORM_HOTKEY_RS, 'utf8') : ''
  const combinedRust = `${tauriSrc}\n${platformSrc}`

  // The Tauri dispatcher emits the bridge-visible events; the platform crate
  // owns the actual OS binding. We accept either file as the source of the
  // event names, since either side declaring them is enough for the smoke.
  const missingInRust = HOTKEY_EVENTS.filter((e) => !combinedRust.includes(e))
  const missingInBridge = bridgeSrc
    ? HOTKEY_EVENTS.filter((e) => !bridgeSrc.includes(e))
    : HOTKEY_EVENTS.slice()

  // For Option+Space we look for either:
  //   - a human-readable mention in comments/strings ("Option+Space", etc.)
  //   - a real binding pattern (Modifiers::ALT + Code::Space) that proves the
  //     runtime actually requested the chord from the OS.
  const mentionsHuman = /Option\+Space|Alt\+Space|"Alt"\s*\+\s*"Space"|"Option"\s*\+\s*"Space"|alt\+space|option\+space/i.test(
    combinedRust,
  )
  const mentionsBinding =
    /Modifiers::ALT\b[\s\S]{0,80}?Code::Space/i.test(combinedRust)
    || /Modifiers::Option\b[\s\S]{0,80}?Code::Space/i.test(combinedRust)
  const mentionsOptionSpace = mentionsHuman || mentionsBinding

  if (missingInRust.length === 0 && missingInBridge.length === 0 && mentionsOptionSpace) {
    record({
      id: 'hotkey_runtime',
      status: 'pass',
      summary:
        'Runtime de hotkey Rust + assinatura no bridge cobrem todos os eventos esperados.',
      detail: {
        events: HOTKEY_EVENTS,
        mentions_option_space_human: mentionsHuman,
        mentions_option_space_binding: mentionsBinding,
        sources: [
          tauriRsExists ? relativizePath(HOTKEY_RS) : null,
          platformRsExists ? relativizePath(PLATFORM_HOTKEY_RS) : null,
        ].filter(Boolean),
      },
    })
    return
  }
  // Partial · still actionable, but call out exactly what's off.
  const issues = []
  if (missingInRust.length > 0) issues.push(`rust: eventos ${missingInRust.join(', ')}`)
  if (missingInBridge.length > 0) issues.push(`bridge: ${missingInBridge.join(', ')}`)
  if (!mentionsOptionSpace) issues.push('rust: nenhuma menção/binding de Option+Space')
  record({
    id: 'hotkey_runtime',
    status: missingInRust.length > 0 || missingInBridge.length > 0 ? 'fail' : 'warn',
    summary: `Hotkey runtime incompleto (${issues.join(' · ')}).`,
    detail: {
      missing_in_rust: missingInRust,
      missing_in_bridge: missingInBridge,
      mentions_option_space_human: mentionsHuman,
      mentions_option_space_binding: mentionsBinding,
    },
    nextAction:
      'Cheque commands_vox_hotkey.rs (Tauri) + crates/atlas-platform/src/vox/hotkey.rs (binding OS) e o useEffect que assina vox://hotkey-* em useVoxOverlay.ts.',
  })
}

async function probeEndpoint(base, path) {
  const url = base.replace(/\/+$/, '') + path
  // Mirror the desktop runtime: attach `X-Atlas-Token` when the operator
  // provided one. The value is NEVER printed, returned in the result, or
  // written to the manifest — we only record whether the header was sent.
  const headers = {}
  if (TOKEN_PRESENT) headers['X-Atlas-Token'] = ATLAS_TOKEN
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 4000)
    const res = await fetch(url, { method: 'GET', signal: controller.signal, headers })
    clearTimeout(timer)
    return {
      endpoint: path,
      http_status: res.status,
      auth_header_sent: TOKEN_PRESENT,
    }
  } catch (e) {
    // Distinguish ECONNREFUSED (server actually off) from generic abort/timeout
    // so the diagnosis can be specific.
    const msg = e instanceof Error ? e.message : String(e)
    const code = (e && typeof e === 'object' && 'code' in e ? e.code : null)
      ?? (e && typeof e === 'object' && 'cause' in e && e.cause && typeof e.cause === 'object' && 'code' in e.cause ? e.cause.code : null)
    return {
      endpoint: path,
      http_status: 'unreachable',
      error: msg,
      error_code: code ?? null,
      auth_header_sent: TOKEN_PRESENT,
    }
  }
}

async function checkBackend() {
  if (!HTTP_BASE) {
    record({
      id: 'backend_reachability',
      status: 'warn',
      summary: 'VITE_ATLAS_SERVER_URL não definido — não testei conectividade real.',
      nextAction:
        'Defina VITE_ATLAS_SERVER_URL (ou ATLAS_SERVER_URL) apontando para o atlas-server para validar /ai/vox/* end-to-end.',
      category: 'backend_url_missing',
    })
    return
  }
  const endpoints = ['/ai/vox/health', '/ai/vox/readiness', '/ai/vox/gate-v3']
  const results = []
  for (const ep of endpoints) {
    // Sequential is fine — 3 cheap GETs.
    // eslint-disable-next-line no-await-in-loop
    results.push(await probeEndpoint(HTTP_BASE, ep))
  }
  const numeric = results.filter((r) => typeof r.http_status === 'number')
  if (numeric.length === 0) {
    // No numeric response at all → server is off OR network blocks us.
    // Look for ECONNREFUSED in the error_code/error of any probe to make
    // the diagnosis specific: "server off" beats "server unreachable".
    const refused = results.some((r) =>
      r.error_code === 'ECONNREFUSED'
      || /ECONNREFUSED|connect ECONNREFUSED|connection refused/i.test(String(r.error ?? '')),
    )
    record({
      id: 'backend_reachability',
      status: 'warn',
      summary: refused
        ? `atlas-server recusou conexão em ${HTTP_BASE} — servidor provavelmente off.`
        : `atlas-server não respondeu em ${HTTP_BASE}.`,
      detail: { base_url: HTTP_BASE, endpoints: results, ecconnrefused: refused },
      nextAction: refused
        ? `Suba o atlas-server na porta correta: cd ../../atlas-server && /opt/homebrew/bin/php artisan serve --port=${new URL(HTTP_BASE).port || '8001'}`
        : 'Suba o atlas-server e confirme que VITE_ATLAS_SERVER_URL aponta para a porta certa.',
      category: 'backend_unreachable',
    })
    return
  }
  // 5xx anywhere → server is alive but Vox stack is broken.
  const has5xx = numeric.some((r) => r.http_status >= 500)
  if (has5xx) {
    record({
      id: 'backend_reachability',
      status: 'warn',
      summary: 'atlas-server respondeu com 5xx em pelo menos um endpoint Vox.',
      detail: { base_url: HTTP_BASE, endpoints: results },
      nextAction:
        'Investigue o atlas-server: `cd ../../atlas-server && tail -n 50 storage/logs/laravel.log`. Cinco-xx indica exceção no pipeline Vox.',
      category: 'backend_server_error',
    })
    return
  }
  const reachable = numeric.filter((r) => r.http_status < 500)
  const allUnavailable = reachable.every((r) => r.http_status === 404)
  if (allUnavailable) {
    record({
      id: 'backend_reachability',
      status: 'warn',
      summary: 'atlas-server responde, mas todos os endpoints Vox retornaram 404.',
      detail: { base_url: HTTP_BASE, endpoints: results },
      nextAction:
        'O atlas-server atual ainda não publicou /ai/vox/*. Faça checkout do branch com Vox V0/V3.',
      category: 'backend_no_vox_routes',
    })
    return
  }
  // V3.10 (Claude AE+AF) · distinguish three auth-related outcomes:
  //
  //   a) ATLAS_TOKEN absent       → 401/403 expected; warn + ask operator
  //                                  to export ATLAS_TOKEN.
  //   b) ATLAS_TOKEN present, but every endpoint STILL returns 401/403 →
  //                                  the value sent didn't match server's
  //                                  .env; warn + ask operator to align.
  //   c) ATLAS_TOKEN present and at least one endpoint replies 2xx →
  //                                  wiring + auth OK; pass.
  const allAuthGated = reachable.every((r) => r.http_status === 401 || r.http_status === 403)
  if (allAuthGated) {
    if (!TOKEN_PRESENT) {
      record({
        id: 'backend_reachability',
        status: 'warn',
        summary: `atlas-server vivo em ${HTTP_BASE}, mas todos os endpoints Vox exigem token (401/403 sem X-Atlas-Token).`,
        detail: {
          base_url: HTTP_BASE,
          endpoints: results,
          token_present: false,
          auth_header_sent: false,
        },
        nextAction:
          'Exporte ATLAS_TOKEN no shell do desktop com o MESMO valor de atlas-server/.env. Ex.: `export ATLAS_TOKEN=…` e re-rode o smoke. Nada do valor aparece em logs.',
        category: 'backend_auth_token_missing',
      })
      return
    }
    record({
      id: 'backend_reachability',
      status: 'warn',
      summary: `atlas-server vivo em ${HTTP_BASE}, mas o ATLAS_TOKEN exportado foi rejeitado (401/403 com X-Atlas-Token).`,
      detail: {
        base_url: HTTP_BASE,
        endpoints: results,
        token_present: true,
        auth_header_sent: true,
      },
      nextAction:
        'Confira se o ATLAS_TOKEN exportado no shell do desktop é IDÊNTICO ao de atlas-server/.env, e que o atlas-server foi reiniciado após mudar .env. Nada do valor aparece em logs.',
      category: 'backend_auth_token_invalid',
    })
    return
  }
  // At least one Vox endpoint replied 2xx — wiring + auth OK.
  record({
    id: 'backend_reachability',
    status: 'pass',
    summary: `atlas-server reconhece pelo menos um endpoint Vox em ${HTTP_BASE}.`,
    detail: {
      base_url: HTTP_BASE,
      endpoints: results,
      token_present: TOKEN_PRESENT,
      auth_header_sent: TOKEN_PRESENT,
    },
  })
}

function checkWhisperModel() {
  if (!existsSync(MODEL_FILE)) {
    record({
      id: 'whisper_model_file',
      status: 'warn',
      summary: `Modelo Whisper ausente em ${relativizePath(MODEL_FILE)}.`,
      detail: { expected_path: relativizePath(MODEL_FILE) },
      nextAction:
        'Baixe ggml-large-v3.bin (≈3.1 GB) de huggingface.co/ggerganov/whisper.cpp/tree/main e coloque em ~/.atlas/vox/models/. Sem ele, STT real fica em fallback debug.',
      category: 'model_missing',
    })
    return
  }
  let bytes = 0
  try {
    bytes = statSync(MODEL_FILE).size
  } catch {
    /* statSync errored after existsSync said true · race; treat as warn */
  }
  // Sanity floor: ggml-large-v3.bin is ~3 GB. Anything < 500 MB is almost
  // certainly a truncated download or a placeholder file.
  const MIN_BYTES = 500 * 1024 * 1024
  if (bytes < MIN_BYTES) {
    record({
      id: 'whisper_model_file',
      status: 'warn',
      summary: `Modelo Whisper presente mas suspeito (${bytes} bytes < 500 MB).`,
      detail: { expected_path: relativizePath(MODEL_FILE), bytes },
      nextAction:
        'Refaça o download de ggml-large-v3.bin (~3 GB). O arquivo atual parece truncado.',
      category: 'model_truncated',
    })
    return
  }
  record({
    id: 'whisper_model_file',
    status: 'pass',
    summary: `Modelo Whisper presente em ${relativizePath(MODEL_FILE)}.`,
    detail: { path: relativizePath(MODEL_FILE), bytes },
  })
}

// ──────────────────────────────────────────────────────────────────────────
// Report writer
// ──────────────────────────────────────────────────────────────────────────
function writeReport(status) {
  mkdirSync(REPORT_DIR, { recursive: true })
  const report = {
    schema: 'atlas.vox.first_use_smoke.v1',
    status,
    generated_at: new Date().toISOString(),
    repo_root: relativizePath(REPO_ROOT),
    backend_url_present: HTTP_BASE !== '',
    backend_url_redacted: HTTP_BASE ? maskUrl(HTTP_BASE) : null,
    // Boolean only · we never persist the token value (Lei 0.75 hygiene).
    token_present: TOKEN_PRESENT,
    checks,
    next_actions: nextActions,
  }
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n', 'utf8')
  return report
}

function maskUrl(url) {
  // Strip credentials in `http://user:pwd@host` form and trim query/fragment.
  // We only show scheme + host + port so the report doesn't leak local tokens.
  try {
    const u = new URL(url)
    const portPart = u.port ? `:${u.port}` : ''
    return `${u.protocol}//${u.hostname}${portPart}`
  } catch {
    return '«url-malformada»'
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Pretty terminal output
// ──────────────────────────────────────────────────────────────────────────
function printSummary(report) {
  const banner = report.status === 'pass'
    ? '✓ PASS'
    : report.status === 'warn'
      ? '⚠ WARN'
      : '✗ FAIL'
  console.log(`\nAtlas Vox · first-use smoke · ${banner}`)
  console.log(`generated_at: ${report.generated_at}`)
  console.log(`backend_url:  ${report.backend_url_redacted ?? '«não definido»'}`)
  console.log('')
  for (const c of report.checks) {
    const tag = c.status === 'pass' ? '✓' : c.status === 'warn' ? '⚠' : '✗'
    console.log(`  ${tag} ${c.id} · ${c.summary}`)
  }
  if (report.next_actions.length > 0) {
    console.log('\nPróximos passos:')
    for (const a of report.next_actions) {
      console.log(`  • [${a.check_id}] ${a.action}`)
    }
  }
  console.log(`\nrelatório completo: ${relative(process.cwd(), REPORT_PATH)}`)
  const runbookPath = join(DESKTOP_APP_ROOT, 'docs', 'vox-first-use.md')
  if (existsSync(runbookPath)) {
    console.log(`próximo passo:    ${relative(process.cwd(), runbookPath)}`)
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────
async function main() {
  const bridgeSrc = checkBridge()
  checkTauriCommands()
  checkHotkeyRuntime(bridgeSrc)
  await checkBackend()
  checkWhisperModel()

  // Roll up the worst status. Pass beats nothing, warn beats pass, fail beats
  // both. An empty checks array would be a bug — guard with fail.
  let overall = 'pass'
  if (checks.length === 0) overall = 'fail'
  for (const c of checks) overall = escalate(overall, c.status)

  const report = writeReport(overall)
  printSummary(report)

  // fail blocks; warn passes (Vitor can still use Vox).
  process.exit(overall === 'fail' ? 1 : 0)
}

main().catch((e) => {
  console.error('voxFirstUseSmoke crashed:', e)
  process.exit(2)
})
