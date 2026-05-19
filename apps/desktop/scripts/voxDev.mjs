#!/usr/bin/env node
/**
 * Atlas Vox · enterprise dev orchestrator (Wave V3.10 / Claude AD).
 *
 * Single command to bring up a real, working Atlas Vox dev session on the
 * Mac. Replaces the previous ritual ("open 3 terminals, run php artisan
 * serve here, run npm run tauri:dev there…") with one entrypoint that:
 *
 *   1. Verifies preflight requirements (PHP path, cmake, Whisper model).
 *   2. Boots atlas-server as a background child (artisan serve on a fixed
 *      port), with its stdout/stderr captured to a logfile.
 *   3. Waits for /ai/vox/health to return 200 (honest readiness — no fake
 *      success on connect).
 *   4. Launches Tauri in dev mode with the `whisper-cpp` feature active,
 *      so the real Whisper.cpp binding is linked.
 *   5. On Ctrl+C or Tauri exit, gracefully tears down atlas-server.
 *
 * Honesty contract (per spec):
 *   - Never starts Tauri if a preflight item fails — refuses to ship a
 *     "kind of works" session.
 *   - Never masks atlas-server errors. If health doesn't go green within
 *     the timeout, prints the server log path and exits non-zero.
 *   - Never installs anything automatically. Missing cmake / model /
 *     atlas-server returns an actionable error, not a "try this curl".
 *
 * Override knobs (env):
 *   ATLAS_SERVER_HOST       (default: 127.0.0.1)
 *   ATLAS_SERVER_PORT       (default: 8001)
 *   ATLAS_SERVER_DIR        (default: ../../../atlas-server, relative to
 *                            atlas-desktop/apps/desktop)
 *   ATLAS_PHP_BIN           (default: /opt/homebrew/bin/php)
 *   ATLAS_SKIP_SERVER       (truthy: don't manage atlas-server lifecycle —
 *                            useful when Vitor already has it running)
 *   ATLAS_SKIP_PREFLIGHT    (truthy: skip preflight, dev-only override)
 *   VITE_ATLAS_VOX_DEV      (forwarded to Tauri/Vite if set; enables the
 *                            debug-transcript fallback in the overlay)
 *
 * Usage:
 *   npm run vox:dev --workspace=@atlas/desktop
 *   ATLAS_SKIP_SERVER=1 npm run vox:dev --workspace=@atlas/desktop
 */

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, statSync, writeFileSync, openSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const DESKTOP_APP_ROOT = resolve(__dirname, '..')
const REPO_ROOT = resolve(DESKTOP_APP_ROOT, '..', '..')
const ATLAS_ROOT = resolve(REPO_ROOT, '..')

const HOST = (process.env.ATLAS_SERVER_HOST || '127.0.0.1').trim()
const PORT = parseInt(process.env.ATLAS_SERVER_PORT || '8001', 10)
const SERVER_DIR = resolve(
  process.env.ATLAS_SERVER_DIR || join(ATLAS_ROOT, 'atlas-server'),
)
const PHP_BIN = process.env.ATLAS_PHP_BIN || '/opt/homebrew/bin/php'
const MODEL_FILE = join(homedir(), '.atlas', 'vox', 'models', 'ggml-large-v3.bin')
const MIN_MODEL_BYTES = 500 * 1024 * 1024 // ~500 MiB; large-v3 is ~3.1 GiB
const HEALTH_TIMEOUT_MS = 30_000
const HEALTH_POLL_INTERVAL_MS = 750

const SERVER_URL = `http://${HOST}:${PORT}`
const HEALTH_URL = `${SERVER_URL}/ai/vox/health`
const SKIP_SERVER = isTruthy(process.env.ATLAS_SKIP_SERVER)
const SKIP_PREFLIGHT = isTruthy(process.env.ATLAS_SKIP_PREFLIGHT)
const ATLAS_TOKEN = process.env.ATLAS_TOKEN || readAtlasTokenFromServerEnv()

const LOG_DIR = join(DESKTOP_APP_ROOT, 'test-results', 'vox-dev')
const SERVER_LOG = join(LOG_DIR, 'atlas-server.log')

function isTruthy(v) {
  if (!v) return false
  const s = String(v).toLowerCase()
  return s === '1' || s === 'true' || s === 'yes' || s === 'on'
}

function relHome(p) {
  const h = homedir()
  return p.startsWith(h) ? '~' + p.slice(h.length) : p
}

function readAtlasTokenFromServerEnv() {
  try {
    const envPath = join(SERVER_DIR, '.env')
    if (!existsSync(envPath)) return null
    const text = readFileSync(envPath, 'utf8')
    const match = text.match(/^ATLAS_TOKEN=(.*)$/m)
    if (!match) return null
    return match[1].trim().replace(/^["']|["']$/g, '') || null
  } catch {
    return null
  }
}

function logSection(title) {
  console.log(`\n\x1b[1m▶ ${title}\x1b[0m`)
}

function logOk(msg) {
  console.log(`  \x1b[32m✓\x1b[0m ${msg}`)
}

function logWarn(msg) {
  console.log(`  \x1b[33m⚠\x1b[0m ${msg}`)
}

function logFail(msg) {
  console.error(`  \x1b[31m✗\x1b[0m ${msg}`)
}

function logInfo(msg) {
  console.log(`  · ${msg}`)
}

function fail(msg, nextAction = null) {
  logFail(msg)
  if (nextAction) console.error(`    → ${nextAction}`)
  process.exit(1)
}

// ──────────────────────────────────────────────────────────────────────────
// Preflight · honest, refuses to proceed if a real piece is missing
// ──────────────────────────────────────────────────────────────────────────

async function whichBinary(bin) {
  return new Promise((resolveP) => {
    const p = spawn('/usr/bin/which', [bin], { stdio: ['ignore', 'pipe', 'ignore'] })
    let out = ''
    p.stdout.on('data', (chunk) => {
      out += chunk.toString()
    })
    p.on('close', (code) => {
      resolveP(code === 0 ? out.trim() : null)
    })
    p.on('error', () => resolveP(null))
  })
}

async function preflight() {
  logSection('Preflight')

  // 1. atlas-server directory exists (we may not manage it, but Tauri
  //    needs to know it's there for VITE_ATLAS_SERVER_URL to make sense).
  if (!existsSync(SERVER_DIR)) {
    fail(
      `atlas-server directory not found: ${SERVER_DIR}`,
      'Defina ATLAS_SERVER_DIR=/path/to/atlas-server OU coloque atlas-server ao lado de atlas-desktop.',
    )
  }
  logOk(`atlas-server: ${SERVER_DIR}`)
  if (ATLAS_TOKEN) {
    logOk(
      process.env.ATLAS_TOKEN
        ? 'Atlas token: carregado do ambiente'
        : 'Atlas token: carregado de atlas-server/.env',
    )
  } else {
    logWarn('Atlas token não encontrado no ambiente nem em atlas-server/.env')
  }

  // 2. PHP binary present (only when we'll manage the server).
  if (!SKIP_SERVER) {
    if (!existsSync(PHP_BIN)) {
      fail(
        `PHP binary não encontrado em ${PHP_BIN}`,
        'Instale Homebrew PHP: `brew install php` OU defina ATLAS_PHP_BIN=/caminho/para/php',
      )
    }
    logOk(`PHP: ${PHP_BIN}`)
  } else {
    logInfo(`ATLAS_SKIP_SERVER=1 · supondo que atlas-server já está rodando em ${SERVER_URL}`)
  }

  // 3. cmake present (whisper-rs build script needs it).
  const cmake = await whichBinary('cmake')
  if (!cmake) {
    fail(
      'cmake não encontrado no PATH — necessário para compilar whisper.cpp.',
      'brew install cmake',
    )
  }
  logOk(`cmake: ${cmake}`)

  // 4. Whisper model present and not truncated.
  if (!existsSync(MODEL_FILE)) {
    fail(
      `Modelo Whisper ausente em ${relHome(MODEL_FILE)}.`,
      'Baixe ggml-large-v3.bin (~3.1 GB) de huggingface.co/ggerganov/whisper.cpp/tree/main para ~/.atlas/vox/models/',
    )
  }
  let modelBytes = 0
  try {
    modelBytes = statSync(MODEL_FILE).size
  } catch (e) {
    fail(`Não consegui ler stat de ${relHome(MODEL_FILE)}: ${e.message}`)
  }
  if (modelBytes < MIN_MODEL_BYTES) {
    fail(
      `Modelo Whisper suspeitamente pequeno (${modelBytes} bytes < ${MIN_MODEL_BYTES}). Provavelmente truncado.`,
      'Refaça o download de ggml-large-v3.bin (~3.1 GB).',
    )
  }
  logOk(`Whisper model: ${relHome(MODEL_FILE)} (${(modelBytes / 1024 / 1024).toFixed(0)} MiB)`)

  // 5. Whisper-cpp feature wired in atlas-tauri/Cargo.toml.
  //    Read the file and look for the feature alias. Cheap static check —
  //    we don't try to run cargo metadata here (would slow down boot).
  const tauriCargoToml = resolve(REPO_ROOT, 'crates', 'atlas-tauri', 'Cargo.toml')
  if (!existsSync(tauriCargoToml)) {
    fail(`crates/atlas-tauri/Cargo.toml não encontrado em ${tauriCargoToml}`)
  }
  const { readFileSync } = await import('node:fs')
  const cargoText = readFileSync(tauriCargoToml, 'utf8')
  if (!/whisper-cpp\s*=\s*\[/.test(cargoText)
      || !/atlas-platform\/whisper-cpp/.test(cargoText)) {
    fail(
      'atlas-tauri/Cargo.toml não declara feature `whisper-cpp = ["atlas-platform/whisper-cpp"]`.',
      'Reaplique a edição da Wave V3.10 OU faça checkout do branch correto.',
    )
  }
  logOk('Cargo feature `whisper-cpp` wired into atlas-tauri')

  // 6. Logs dir
  mkdirSync(LOG_DIR, { recursive: true })
}

// ──────────────────────────────────────────────────────────────────────────
// atlas-server lifecycle
// ──────────────────────────────────────────────────────────────────────────

let serverChild = null
let teardownInProgress = false

function bootAtlasServer() {
  logSection('atlas-server')
  // Truncate previous log so the operator only sees this run's output.
  writeFileSync(SERVER_LOG, '', 'utf8')
  const logFd = openSync(SERVER_LOG, 'a')
  serverChild = spawn(
    PHP_BIN,
    ['artisan', 'serve', `--host=${HOST}`, `--port=${PORT}`],
    {
      cwd: SERVER_DIR,
      stdio: ['ignore', logFd, logFd],
      detached: false,
    },
  )
  serverChild.on('exit', (code, signal) => {
    if (teardownInProgress) return
    logFail(`atlas-server saiu inesperadamente (code=${code} signal=${signal}).`)
    logInfo(`Log: ${SERVER_LOG}`)
    process.exit(1)
  })
  logOk(`atlas-server iniciado · pid=${serverChild.pid} log=${SERVER_LOG}`)
}

async function waitForHealth() {
  logInfo(`aguardando ${HEALTH_URL} …`)
  const deadline = Date.now() + HEALTH_TIMEOUT_MS
  let lastError = null
  let lastStatus = null
  while (Date.now() < deadline) {
    try {
      const res = await fetch(HEALTH_URL, {
        method: 'GET',
        headers: ATLAS_TOKEN ? { 'X-Atlas-Token': ATLAS_TOKEN } : undefined,
      })
      // V3.10 Truth Check (Claude AE) · distinguish honest server states
      // up front so the operator sees the real diagnostic, not a generic
      // "server didn't come up".
      //   200/204 → ready
      //   401/403 → server is ALIVE but token is missing/invalid. The
      //             desktop will hit the same wall the moment it tries
      //             to compile an intent. Refuse to proceed; tell the
      //             operator to fix ATLAS_TOKEN.
      //   404     → server alive but Vox routes absent. Wrong branch.
      //   5xx     → server alive but Vox stack threw.
      if (res.status === 200 || res.status === 204) {
        logOk(`/ai/vox/health respondeu ${res.status}`)
        return
      }
      if (res.status === 401 || res.status === 403) {
        await teardown()
        fail(
          `atlas-server vivo em ${SERVER_URL}, mas /ai/vox/health respondeu ${res.status} sem X-Atlas-Token.`,
          'Confira ATLAS_TOKEN no atlas-server/.env. O vox:dev lê esse valor automaticamente e nunca imprime o segredo.',
        )
      }
      if (res.status === 404) {
        await teardown()
        fail(
          `atlas-server vivo em ${SERVER_URL}, mas /ai/vox/health retornou 404 (rota Vox ausente).`,
          'Faça checkout do branch do atlas-server que carrega /ai/vox/* (Wave V0-V3).',
        )
      }
      if (res.status >= 500) {
        await teardown()
        fail(
          `atlas-server respondeu ${res.status} em /ai/vox/health — exceção no pipeline Vox.`,
          `Inspecione: cd ../../atlas-server && tail -n 80 storage/logs/laravel.log`,
        )
      }
      // Other 4xx (uncommon) — keep polling but record so the final
      // timeout message is specific.
      lastStatus = res.status
      lastError = `http ${res.status}`
    } catch (e) {
      // Network-level error · keep polling. If it's ECONNREFUSED the
      // server is still booting (php artisan serve takes ~600ms to bind).
      const code = (e && typeof e === 'object' && 'code' in e ? e.code : null)
        ?? (e && typeof e === 'object' && 'cause' in e && e.cause && typeof e.cause === 'object' && 'code' in e.cause ? e.cause.code : null)
      lastError = `${e instanceof Error ? e.message : String(e)}${code ? ` (${code})` : ''}`
    }
    await new Promise((r) => setTimeout(r, HEALTH_POLL_INTERVAL_MS))
  }
  logFail(
    `atlas-server não ficou pronto em ${HEALTH_TIMEOUT_MS / 1000}s ` +
    `(último erro: ${lastError}, último status HTTP: ${lastStatus ?? 'n/a'}).`,
  )
  logInfo(`Log do servidor: ${SERVER_LOG}`)
  await teardown()
  process.exit(1)
}

async function healthReadyNow() {
  try {
    const res = await fetch(HEALTH_URL, {
      method: 'GET',
      headers: ATLAS_TOKEN ? { 'X-Atlas-Token': ATLAS_TOKEN } : undefined,
    })
    return res.status === 200 || res.status === 204
  } catch {
    return false
  }
}

function killServer() {
  if (!serverChild || serverChild.killed) return
  try {
    serverChild.kill('SIGTERM')
  } catch {
    /* already dead */
  }
}

async function teardown() {
  if (teardownInProgress) return
  teardownInProgress = true
  if (serverChild && !SKIP_SERVER) {
    logSection('Teardown')
    logInfo('stopping atlas-server …')
    killServer()
    // Best-effort wait for graceful exit.
    await new Promise((r) => setTimeout(r, 600))
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Tauri (the actual desktop)
// ──────────────────────────────────────────────────────────────────────────

function launchTauri() {
  logSection('Tauri (whisper-cpp on)')
  // tauri dev --features whisper-cpp · cd into the crate so tauri-cli
  // resolves the binary right.
  const env = {
    ...process.env,
    MACOSX_DEPLOYMENT_TARGET: '11.0',
    CMAKE_OSX_DEPLOYMENT_TARGET: '11.0',
    CFLAGS: mergeCompilerFlags(process.env.CFLAGS, '-mmacosx-version-min=11.0'),
    CXXFLAGS: mergeCompilerFlags(process.env.CXXFLAGS, '-mmacosx-version-min=11.0'),
    VITE_ATLAS_SERVER_URL: SERVER_URL,
    ...(ATLAS_TOKEN ? { ATLAS_TOKEN } : {}),
  }
  if (process.env.VITE_ATLAS_VOX_DEV) {
    logInfo(`VITE_ATLAS_VOX_DEV=${process.env.VITE_ATLAS_VOX_DEV} (debug fallback exposed in overlay)`)
  }
  logInfo(`VITE_ATLAS_SERVER_URL=${SERVER_URL}`)
  const tauriCli = resolve(DESKTOP_APP_ROOT, 'node_modules', '.bin', 'tauri')
  const tauriBin = existsSync(tauriCli) ? tauriCli : 'tauri'
  const child = spawn(
    tauriBin,
    ['dev', '--features', 'whisper-cpp'],
    {
      cwd: resolve(REPO_ROOT, 'crates', 'atlas-tauri'),
      stdio: 'inherit',
      env,
    },
  )
  child.on('exit', async (code, signal) => {
    logSection('Tauri saiu')
    logInfo(`exit code=${code} signal=${signal}`)
    await teardown()
    process.exit(code ?? 0)
  })
  child.on('error', async (e) => {
    logFail(`não consegui iniciar tauri-cli: ${e.message}`)
    logInfo('rode `npm install` em atlas-desktop antes do vox:dev.')
    await teardown()
    process.exit(1)
  })
  return child
}

function mergeCompilerFlags(existing, required) {
  const current = (existing ?? '').trim()
  if (!current) return required
  return current.includes(required) ? current : `${current} ${required}`
}

// ──────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\x1b[1mAtlas Vox · dev orchestrator (Wave V3.10)\x1b[0m')
  console.log(`server: ${SERVER_URL}    feature: whisper-cpp`)

  if (!SKIP_PREFLIGHT) {
    await preflight()
  } else {
    logSection('Preflight')
    logWarn('ATLAS_SKIP_PREFLIGHT=1 · pulando verificações.')
  }

  if (!SKIP_SERVER) {
    if (await healthReadyNow()) {
      logSection('atlas-server')
      logOk(`atlas-server já está rodando em ${SERVER_URL}`)
    } else {
      bootAtlasServer()
      await waitForHealth()
    }
  } else {
    logSection('atlas-server')
    logInfo(`pulando boot · supondo que ${SERVER_URL} já responde.`)
  }

  launchTauri()
}

// Graceful shutdown hooks
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sig, async () => {
    console.log('') // newline after the ^C glyph
    logInfo(`recebido ${sig} · encerrando.`)
    await teardown()
    process.exit(0)
  })
}
process.on('uncaughtException', async (e) => {
  logFail(`uncaught: ${e instanceof Error ? e.stack : String(e)}`)
  await teardown()
  process.exit(1)
})

main().catch(async (e) => {
  logFail(`fatal: ${e instanceof Error ? e.stack : String(e)}`)
  await teardown()
  process.exit(1)
})
