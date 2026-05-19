#!/usr/bin/env node
/**
 * Atlas Vox · desktop release check (Onda V3.9 / Claude AB).
 *
 * One command that answers: "posso abrir o Atlas Desktop e usar o Vox agora?"
 *
 * What it does, in order:
 *   1. `vox:smoke`                    — first-use surface (bridge / Tauri
 *                                       commands / hotkey runtime / model
 *                                       presence).
 *   2. `vox:visual-smoke`             — SSR render of every Vox state + a
 *                                       global token / sensitive-path leak
 *                                       scan.
 *   3. Unit tests (tsx)               — voxReadiness + voxSetupAssistant.
 *   4. `cargo test -p atlas-platform vox` — Rust platform Vox suite,
 *      best-effort. Cargo absent / sandbox-blocked = warn, not fail.
 *   5. `cargo test -p atlas-tauri vox`    — Rust Tauri Vox commands,
 *      same warn-on-cargo-missing rule.
 *   6. `npm run build`                — production build.
 *
 * Then it parses the upstream smoke manifests (vox-first-use-smoke and
 * vox-visual-smoke), folds them into a single
 * `atlas.vox.desktop_release_check.v1` envelope, and writes the
 * manifest to:
 *
 *     apps/desktop/test-results/vox-release-check/manifest.json
 *
 * Hard rules:
 *   - Never opens the microphone, runs a provider, or spawns a real
 *     shell-out beyond the cargo/npm tooling listed above.
 *   - Never invents pass. If a step crashes unexpectedly, that's `fail`.
 *   - `model missing` is warn (Vitor can still use polish/debug paths).
 *   - `backend not configured` is warn (Vitor can still smoke locally).
 *   - `confirmation_token` leak in any visual smoke artefact is FAIL.
 *
 * Exit codes:
 *   0 → status='pass'  · everything green
 *   0 → status='warn'  · usable now, something honestly absent
 *   1 → status='fail'  · don't ship until fixed
 */

import { execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const RESULTS_DIR = join(ROOT, 'test-results', 'vox-release-check')
mkdirSync(RESULTS_DIR, { recursive: true })
const REPORT_PATH = join(RESULTS_DIR, 'manifest.json')

const FIRST_USE_MANIFEST = join(
  ROOT,
  'test-results',
  'vox-first-use-smoke',
  'manifest.json',
)
const VISUAL_MANIFEST = join(
  ROOT,
  'test-results',
  'vox-visual-smoke',
  'manifest.json',
)

const STARTED_AT = Date.now()
const checks = []
const artifacts = []
const nextActions = []

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

function escalate(current, next) {
  // pass < warn < fail
  if (current === 'fail' || next === 'fail') return 'fail'
  if (current === 'warn' || next === 'warn') return 'warn'
  return 'pass'
}

function tildify(p) {
  const home = process.env.HOME
  if (home && p && p.startsWith(home)) {
    return `~${p.slice(home.length)}`
  }
  return p
}

function addCheck(check) {
  checks.push({
    id: check.id,
    title: check.title,
    status: check.status,
    summary: check.summary ?? '',
    duration_ms: check.duration_ms ?? 0,
    detail: check.detail ?? null,
    next_action: check.next_action ?? null,
  })
  if (check.next_action) {
    nextActions.push({ check_id: check.id, action: check.next_action })
  }
}

function addArtifact(name, absPath, kind) {
  if (!existsSync(absPath)) return
  let size = 0
  try {
    size = readFileSync(absPath).length
  } catch {
    size = 0
  }
  artifacts.push({
    name,
    kind,
    path: tildify(absPath),
    bytes: size,
  })
}

function readJsonSafe(path) {
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

/**
 * Spawns a subprocess with a per-step timeout. Captures stdout/stderr so
 * we can attach the tail to the manifest if it failed. Returns
 * { code, signal, stdout, stderr, timedOut, durationMs }.
 *
 * We deliberately stream nothing live — the orchestrator prints its own
 * summary at the end. Each step's tail is preserved in the manifest for
 * post-mortem.
 */
function runStep(label, command, args, { cwd = ROOT, timeoutMs = 180_000, env = {} } = {}) {
  return new Promise((resolve) => {
    const startedAt = Date.now()
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      try {
        child.kill('SIGTERM')
        setTimeout(() => child.kill('SIGKILL'), 2_000).unref()
      } catch {
        /* ignore */
      }
    }, timeoutMs)
    child.stdout.on('data', (b) => {
      stdout += b.toString()
    })
    child.stderr.on('data', (b) => {
      stderr += b.toString()
    })
    child.on('error', (err) => {
      clearTimeout(timer)
      resolve({
        code: null,
        signal: null,
        stdout,
        stderr: `${stderr}\n[spawn error] ${err.message}`,
        timedOut,
        durationMs: Date.now() - startedAt,
        spawnError: err.code ?? err.message,
      })
    })
    child.on('close', (code, signal) => {
      clearTimeout(timer)
      resolve({
        code,
        signal,
        stdout,
        stderr,
        timedOut,
        durationMs: Date.now() - startedAt,
      })
    })
  })
}

function tail(s, lines = 12) {
  if (!s) return ''
  const arr = s.split('\n')
  return arr.slice(-lines).join('\n')
}

function commandExists(cmd) {
  try {
    execFileSync('command', ['-v', cmd], { stdio: 'ignore', shell: '/bin/sh' })
    return true
  } catch {
    try {
      execFileSync('which', [cmd], { stdio: 'ignore' })
      return true
    } catch {
      return false
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Step runners
// ──────────────────────────────────────────────────────────────────────────

async function stepVoxSmoke() {
  const result = await runStep('vox:smoke', 'npm', ['run', 'vox:smoke', '--silent'], {
    timeoutMs: 60_000,
  })
  addArtifact('vox-first-use-smoke-manifest', FIRST_USE_MANIFEST, 'manifest')
  const manifest = readJsonSafe(FIRST_USE_MANIFEST)

  if (result.spawnError) {
    addCheck({
      id: 'vox_smoke',
      title: 'vox:smoke · first-use surface',
      status: 'fail',
      summary: `npm não respondeu (${result.spawnError}).`,
      duration_ms: result.durationMs,
      detail: { stderr_tail: tail(result.stderr) },
      next_action: 'Verifique se `npm` está no PATH.',
    })
    return
  }
  if (result.timedOut) {
    addCheck({
      id: 'vox_smoke',
      title: 'vox:smoke · first-use surface',
      status: 'fail',
      summary: 'vox:smoke estourou o timeout (60s).',
      duration_ms: result.durationMs,
      detail: { stderr_tail: tail(result.stderr) },
      next_action: 'Rode `npm run vox:smoke` manualmente.',
    })
    return
  }
  // Prefer the upstream manifest's own status when available — its
  // semantics (warn for missing model / backend) are the canonical truth.
  let status = result.code === 0 ? 'pass' : 'fail'
  let summary = `exit ${result.code}`
  let categories = []
  if (manifest && typeof manifest.status === 'string') {
    status = manifest.status
    const passes = (manifest.checks ?? []).filter((c) => c.status === 'pass').length
    const warns = (manifest.checks ?? []).filter((c) => c.status === 'warn').length
    const fails = (manifest.checks ?? []).filter((c) => c.status === 'fail').length
    summary = `${passes} pass · ${warns} warn · ${fails} fail`
    // Collect category-tagged actions so the release-check can map each
    // upstream finding to a CANONICAL human message + ready-to-run
    // command. We preserve all of them (not just the first 2) so the
    // "Para usar agora" boot block stays accurate even when both
    // backend and model are missing.
    if (Array.isArray(manifest.next_actions)) {
      for (const a of manifest.next_actions) {
        categories.push({
          check_id: String(a.check_id ?? ''),
          category: String(a.category ?? 'other'),
          action: String(a.action ?? ''),
        })
      }
    }
  }
  // Convert categories into one release-check next_action per finding.
  // Each line is purpose-built so Vitor sees the exact command to run.
  const remediation = remediationFor(categories)
  addCheck({
    id: 'vox_smoke',
    title: 'vox:smoke · first-use surface',
    status,
    summary,
    duration_ms: result.durationMs,
    detail: {
      exit: result.code,
      manifest_path: tildify(FIRST_USE_MANIFEST),
      categories,
    },
    // Single string for the legacy `next_actions` list at the top; the
    // boot-sequence block at the end of `printSummary` carries the full
    // step-by-step commands.
    next_action:
      status === 'pass'
        ? null
        : remediation.headline ?? 'Veja o manifesto vox-first-use-smoke.',
  })
  // Stash the remediation for the boot-sequence renderer.
  bootSequence.firstUseRemediation = remediation
}

// ──────────────────────────────────────────────────────────────────────────
// Category → canonical remediation messages.
//
// Each category maps to (a) a short headline for the `next_actions` list
// and (b) a numbered step + exact shell command for the "Para usar agora"
// block printed at the end of the run. Keep the wording stable so Vitor
// can copy-paste verbatim.
// ──────────────────────────────────────────────────────────────────────────

const REMEDIATION_RECIPES = {
  backend_url_missing: {
    headline:
      'Backend URL ausente · exporte VITE_ATLAS_SERVER_URL apontando para o atlas-server.',
    bootSteps: [
      {
        title: 'Aponte o Desktop para o atlas-server',
        body: 'export VITE_ATLAS_SERVER_URL=http://127.0.0.1:8001',
      },
    ],
  },
  backend_unreachable: {
    headline:
      'Backend configurado mas não respondeu · suba o atlas-server.',
    bootSteps: [
      {
        title: 'Suba o atlas-server (porta 8001)',
        body: 'cd ../../atlas-server && /opt/homebrew/bin/php artisan serve --port=8001',
      },
    ],
  },
  backend_no_vox_routes: {
    headline:
      'atlas-server responde mas Vox não está publicado · troque para o branch que carrega /ai/vox/*.',
    bootSteps: [
      {
        title: 'Verifique o branch do atlas-server',
        body: 'cd ../../atlas-server && git log --oneline -5 -- app/Http/Controllers/AtlasAiVoxController.php',
      },
    ],
  },
  backend_auth_token_missing: {
    headline:
      'atlas-server vivo, mas endpoints Vox respondem 401/403 · exporte ATLAS_TOKEN no shell do desktop.',
    bootSteps: [
      {
        title: 'Configure ATLAS_TOKEN no atlas-server e exporte no desktop',
        body:
          '# 1) Defina/leia o token no atlas-server (.env):\ncd ../../atlas-server && grep ^ATLAS_TOKEN= .env || echo \'ATLAS_TOKEN=local-dev-token-32+caracteres\' >> .env\n# 2) Reinicie o atlas-server para carregar o .env\n# 3) Exporte o MESMO valor no shell que sobe o desktop (nada do valor aparece em logs):\nexport ATLAS_TOKEN=local-dev-token-32+caracteres',
      },
    ],
  },
  backend_auth_token_invalid: {
    headline:
      'ATLAS_TOKEN foi enviado mas o atlas-server rejeitou · alinhe o valor com atlas-server/.env e reinicie o server.',
    bootSteps: [
      {
        title: 'Sincronize ATLAS_TOKEN entre desktop e atlas-server',
        body:
          '# 1) Cheque o valor canônico em atlas-server/.env (não imprima em logs):\ncd ../../atlas-server && grep ^ATLAS_TOKEN= .env\n# 2) Reinicie o atlas-server para garantir que o .env vigente foi carregado:\n#    Ctrl+C no terminal do `php artisan serve` e suba de novo.\n# 3) No shell do desktop, exporte EXATAMENTE o mesmo valor:\nexport ATLAS_TOKEN=...',
      },
    ],
  },
  backend_server_error: {
    headline:
      'atlas-server respondeu 5xx · investigue logs antes de seguir.',
    bootSteps: [
      {
        title: 'Inspecione o log do Laravel',
        body: 'cd ../../atlas-server && tail -n 80 storage/logs/laravel.log',
      },
    ],
  },
  // V3.10 · removed `doctor_warn` / `doctor_fail` entries. They pointed at
  // `php artisan atlas:vox:doctor`, which doesn't exist in atlas-server.
  // Backend health is probed honestly via the live HTTP endpoints in the
  // `backend_*` remediation categories below.
  model_missing: {
    headline:
      'Modelo Whisper large-v3 ausente · coloque em ~/.atlas/vox/models/ggml-large-v3.bin (download manual, sem auto-download).',
    bootSteps: [
      {
        title: 'Posicione o modelo Whisper large-v3',
        body:
          'mkdir -p ~/.atlas/vox/models  # então baixe ggml-large-v3.bin (~3 GB) de huggingface.co/ggerganov/whisper.cpp\n# e mova:  mv ~/Downloads/ggml-large-v3.bin ~/.atlas/vox/models/',
      },
    ],
  },
  model_truncated: {
    headline:
      'Modelo Whisper presente mas truncado (<500 MB) · re-baixe ggml-large-v3.bin (~3 GB).',
    bootSteps: [
      {
        title: 'Re-baixe ggml-large-v3.bin (download truncado)',
        body:
          'rm ~/.atlas/vox/models/ggml-large-v3.bin\n# então baixe novamente de huggingface.co/ggerganov/whisper.cpp\n# e mova para ~/.atlas/vox/models/',
      },
    ],
  },
}

function remediationFor(categories) {
  // Build a short headline and the boot steps in a stable order. We
  // dedupe by category so the same recipe doesn't print twice when the
  // smoke surfaces the same condition from multiple checks.
  const seen = new Set()
  const headlines = []
  const steps = []
  for (const c of categories) {
    const recipe = REMEDIATION_RECIPES[c.category]
    if (!recipe || seen.has(c.category)) continue
    seen.add(c.category)
    if (recipe.headline) headlines.push(recipe.headline)
    for (const s of recipe.bootSteps) steps.push(s)
  }
  return {
    headline: headlines.length > 0 ? headlines.join(' / ') : null,
    bootSteps: steps,
  }
}

// Shared scratchpad the smoke step writes into and the printer reads.
// Plain object so we don't add yet another global helper.
const bootSequence = { firstUseRemediation: null }

async function stepVoxVisualSmoke() {
  const result = await runStep(
    'vox:visual-smoke',
    'npm',
    ['run', 'vox:visual-smoke', '--silent'],
    { timeoutMs: 120_000 },
  )
  addArtifact('vox-visual-smoke-manifest', VISUAL_MANIFEST, 'manifest')
  const manifest = readJsonSafe(VISUAL_MANIFEST)

  // Catalogue every HTML fragment so the release manifest carries a
  // pointer to the visual evidence.
  if (manifest && Array.isArray(manifest.artifacts)) {
    for (const art of manifest.artifacts) {
      if (typeof art.path === 'string') {
        addArtifact(`vox-visual-${art.name}`, join(ROOT, art.path), 'html_fragment')
      }
    }
  }

  if (result.spawnError) {
    addCheck({
      id: 'vox_visual_smoke',
      title: 'vox:visual-smoke · SSR render + leak scan',
      status: 'fail',
      summary: `npm não respondeu (${result.spawnError}).`,
      duration_ms: result.durationMs,
      detail: { stderr_tail: tail(result.stderr) },
      next_action: 'Verifique se `npm` está no PATH.',
    })
    return
  }
  if (result.timedOut) {
    addCheck({
      id: 'vox_visual_smoke',
      title: 'vox:visual-smoke · SSR render + leak scan',
      status: 'fail',
      summary: 'vox:visual-smoke estourou o timeout (120s).',
      duration_ms: result.durationMs,
      next_action: 'Rode `npm run vox:visual-smoke` manualmente.',
    })
    return
  }

  let status = result.code === 0 ? 'pass' : 'fail'
  let summary = `exit ${result.code}`
  if (manifest) {
    if (typeof manifest.status === 'string') status = manifest.status
    if (manifest.totals) {
      summary = `${manifest.totals.pass}/${manifest.totals.total} pass · ${manifest.totals.warn} warn · ${manifest.totals.fail} fail`
    }
  }

  addCheck({
    id: 'vox_visual_smoke',
    title: 'vox:visual-smoke · SSR render + leak scan',
    status,
    summary,
    duration_ms: result.durationMs,
    detail: { exit: result.code, manifest_path: tildify(VISUAL_MANIFEST) },
    next_action: status === 'pass' ? null : 'Inspecione test-results/vox-visual-smoke/manifest.json.',
  })
}

async function stepUnitTests() {
  // Run the two pure TS test files we shipped (Wave 7.8 + 7.9). tsx is
  // already in the dev deps used by other smoke scripts; we invoke it
  // via npx so missing-local-bin failure is honest.
  const targets = [
    { id: 'vox_readiness_tests', file: 'src/lib/__tests__/voxReadiness.test.ts' },
    { id: 'vox_setup_tests', file: 'src/lib/__tests__/voxSetupAssistant.test.ts' },
  ]
  for (const t of targets) {
    const abs = join(ROOT, t.file)
    if (!existsSync(abs)) {
      addCheck({
        id: t.id,
        title: `unit · ${t.file}`,
        status: 'fail',
        summary: 'arquivo de teste não encontrado.',
        next_action: `Restaure ${t.file} ou remova-o do release check.`,
      })
      continue
    }
    const result = await runStep('unit', 'npx', ['tsx', t.file], {
      timeoutMs: 60_000,
    })
    if (result.spawnError) {
      addCheck({
        id: t.id,
        title: `unit · ${t.file}`,
        status: 'fail',
        summary: `npx tsx falhou: ${result.spawnError}.`,
        duration_ms: result.durationMs,
        next_action: 'Verifique se `tsx` está disponível (`npx tsx --version`).',
      })
      continue
    }
    if (result.timedOut) {
      addCheck({
        id: t.id,
        title: `unit · ${t.file}`,
        status: 'fail',
        summary: 'unit test estourou o timeout (60s).',
        duration_ms: result.durationMs,
        next_action: `Rode \`npx tsx ${t.file}\` manualmente.`,
      })
      continue
    }
    addCheck({
      id: t.id,
      title: `unit · ${t.file}`,
      status: result.code === 0 ? 'pass' : 'fail',
      summary: result.code === 0
        ? (tail(result.stdout, 1).trim() || 'todos os testes passaram')
        : `exit ${result.code}`,
      duration_ms: result.durationMs,
      detail: { exit: result.code, stdout_tail: tail(result.stdout, 4) },
      next_action: result.code === 0 ? null : `Rode \`npx tsx ${t.file}\` para depurar.`,
    })
  }
}

async function stepCargo(crate) {
  const id = `cargo_${crate.replace('atlas-', '')}_vox`
  const title = `cargo test · ${crate} (filter=vox)`
  if (!commandExists('cargo')) {
    addCheck({
      id,
      title,
      status: 'warn',
      summary: 'cargo ausente no PATH — pulei (warn).',
      next_action: 'Instale a toolchain Rust (`rustup`) para validar o backend nativo.',
    })
    return
  }
  // Run from the workspace root (two directories up from apps/desktop).
  const workspaceRoot = join(ROOT, '..', '..')
  const result = await runStep(
    'cargo',
    'cargo',
    ['test', '-p', crate, '--lib', 'vox'],
    { cwd: workspaceRoot, timeoutMs: 600_000 },
  )
  if (result.spawnError) {
    addCheck({
      id,
      title,
      status: 'warn',
      summary: `cargo não respondeu (${result.spawnError}) — tratei como warn.`,
      duration_ms: result.durationMs,
      next_action: `Rode \`cargo test -p ${crate} vox\` manualmente.`,
    })
    return
  }
  if (result.timedOut) {
    addCheck({
      id,
      title,
      status: 'fail',
      summary: 'cargo test estourou o timeout (600s).',
      duration_ms: result.durationMs,
      detail: { stderr_tail: tail(result.stderr) },
      next_action: 'Rode o cargo test manualmente; build de release pode estar travada.',
    })
    return
  }
  addCheck({
    id,
    title,
    status: result.code === 0 ? 'pass' : 'fail',
    summary: result.code === 0 ? 'todos os vox tests verdes' : `exit ${result.code}`,
    duration_ms: result.durationMs,
    detail: {
      exit: result.code,
      stdout_tail: tail(result.stdout, 6),
      stderr_tail: tail(result.stderr, 6),
    },
    next_action:
      result.code === 0
        ? null
        : `Investigue o crash em \`cargo test -p ${crate} vox\`.`,
  })
}

async function stepBuild() {
  const result = await runStep('build', 'npm', ['run', 'build', '--silent'], {
    timeoutMs: 240_000,
  })
  if (result.spawnError) {
    addCheck({
      id: 'desktop_build',
      title: 'npm run build · production build',
      status: 'fail',
      summary: `npm não respondeu (${result.spawnError}).`,
      duration_ms: result.durationMs,
      next_action: 'Verifique se `npm` está no PATH.',
    })
    return
  }
  if (result.timedOut) {
    addCheck({
      id: 'desktop_build',
      title: 'npm run build · production build',
      status: 'fail',
      summary: 'build estourou o timeout (240s).',
      duration_ms: result.durationMs,
      detail: { stderr_tail: tail(result.stderr) },
      next_action: 'Rode `npm run build --workspace=@atlas/desktop` manualmente.',
    })
    return
  }
  addCheck({
    id: 'desktop_build',
    title: 'npm run build · production build',
    status: result.code === 0 ? 'pass' : 'fail',
    summary: result.code === 0 ? 'tsc -b && vite build verdes' : `exit ${result.code}`,
    duration_ms: result.durationMs,
    detail: {
      exit: result.code,
      stdout_tail: tail(result.stdout, 6),
      stderr_tail: tail(result.stderr, 6),
    },
    next_action: result.code === 0 ? null : 'Rode `npm run build --workspace=@atlas/desktop`.',
  })
}

// ──────────────────────────────────────────────────────────────────────────
// Defense-in-depth: re-scan visual artefacts for token leaks even after
// the upstream smoke "passed". Cheap and catches drift where the visual
// smoke is updated without keeping its leak rules current.
// ──────────────────────────────────────────────────────────────────────────

function stepLeakRescan() {
  const visualDir = join(ROOT, 'test-results', 'vox-visual-smoke')
  if (!existsSync(visualDir)) {
    addCheck({
      id: 'leak_rescan',
      title: 'leak rescan · visual fragments',
      status: 'warn',
      summary: 'vox-visual-smoke não rodou ainda.',
      next_action: 'Rode `npm run vox:visual-smoke` primeiro.',
    })
    return
  }
  // Tokens we never want to see in a fragment. The visual smoke already
  // checks for these but we re-run honestly — manifest may be stale.
  const FORBIDDEN_PATTERNS = [
    { pattern: /confirmation[_-]?token/i, label: 'confirmation_token' },
    { pattern: /atlas[_-]?token/i, label: 'atlas_token' },
    { pattern: /Bearer\s+[A-Za-z0-9._-]{16,}/, label: 'bearer_token' },
    { pattern: /sk-[A-Za-z0-9]{20,}/, label: 'openai_secret' },
  ]
  // The visual smoke documents the path allowlist that may appear in
  // fragments (own model path, dictionary path). Everything else is suspicious.
  let scanned = 0
  let leaks = []
  let manifestEntries
  try {
    manifestEntries = JSON.parse(readFileSync(VISUAL_MANIFEST, 'utf8')).artifacts ?? []
  } catch {
    manifestEntries = []
  }
  for (const entry of manifestEntries) {
    if (typeof entry.path !== 'string' || !entry.path.endsWith('.html')) continue
    const abs = join(ROOT, entry.path)
    if (!existsSync(abs)) continue
    scanned += 1
    let body
    try {
      body = readFileSync(abs, 'utf8')
    } catch {
      continue
    }
    for (const { pattern, label } of FORBIDDEN_PATTERNS) {
      if (pattern.test(body)) {
        leaks.push({ artifact: entry.name, label })
      }
    }
  }
  if (leaks.length === 0) {
    addCheck({
      id: 'leak_rescan',
      title: 'leak rescan · visual fragments',
      status: scanned === 0 ? 'warn' : 'pass',
      summary:
        scanned === 0
          ? 'nenhum fragmento HTML para varrer.'
          : `${scanned} fragmentos limpos · 0 leaks.`,
      next_action: scanned === 0 ? 'Rode `npm run vox:visual-smoke` antes do release check.' : null,
    })
  } else {
    addCheck({
      id: 'leak_rescan',
      title: 'leak rescan · visual fragments',
      status: 'fail',
      summary: `${leaks.length} leak(s) detectados em ${scanned} fragmentos.`,
      detail: { leaks },
      next_action:
        'STOP-THE-LINE · não rode `tauri build`. Reproduza o token vazado e remova a fonte antes do release.',
    })
  }
}

// ──────────────────────────────────────────────────────────────────────────
// V3.10 · Runtime readiness · honest, static checks for the pieces that
// the rest of the release suite couldn't see before:
//   - tauri_feature_wired   · whisper-cpp feature in atlas-tauri/Cargo.toml
//   - vox_dev_orchestrator  · npm run vox:dev + scripts/voxDev.mjs present
// These are STATIC checks — they don't compile/spawn anything heavy. Their
// job is to refuse PASS when the build configuration would silently ship
// a stub STT.
// ──────────────────────────────────────────────────────────────────────────

function stepRuntimeReadiness() {
  // ── tauri_feature_wired ────────────────────────────────────────────────
  const tauriCargoPath = join(
    ROOT,
    '..',
    '..',
    'crates',
    'atlas-tauri',
    'Cargo.toml',
  )
  if (!existsSync(tauriCargoPath)) {
    addCheck({
      id: 'tauri_feature_wired',
      title: 'runtime · whisper-cpp feature in atlas-tauri',
      status: 'fail',
      summary: `crates/atlas-tauri/Cargo.toml não encontrado em ${tildify(tauriCargoPath)}.`,
      next_action: 'Verifique se o layout do repo está correto e o crate atlas-tauri existe.',
    })
  } else {
    const cargoText = readFileSync(tauriCargoPath, 'utf8')
    const hasFeatureDecl = /whisper-cpp\s*=\s*\[/.test(cargoText)
    const forwardsToPlatform = /atlas-platform\/whisper-cpp/.test(cargoText)
    if (hasFeatureDecl && forwardsToPlatform) {
      addCheck({
        id: 'tauri_feature_wired',
        title: 'runtime · whisper-cpp feature in atlas-tauri',
        status: 'pass',
        summary: 'feature `whisper-cpp` declarada e encaminhada para atlas-platform.',
        detail: {
          cargo_toml: tildify(tauriCargoPath),
          forwards_to: 'atlas-platform/whisper-cpp',
        },
      })
    } else {
      addCheck({
        id: 'tauri_feature_wired',
        title: 'runtime · whisper-cpp feature in atlas-tauri',
        status: 'fail',
        summary: 'atlas-tauri/Cargo.toml não declara `whisper-cpp = ["atlas-platform/whisper-cpp"]`.',
        detail: {
          cargo_toml: tildify(tauriCargoPath),
          has_feature_decl: hasFeatureDecl,
          forwards_to_platform: forwardsToPlatform,
        },
        next_action:
          'Adicione `[features] whisper-cpp = ["atlas-platform/whisper-cpp"]` em crates/atlas-tauri/Cargo.toml — sem isso `npm run tauri:dev:vox` linka o stub.',
      })
    }
  }

  // ── vox_dev_orchestrator ───────────────────────────────────────────────
  // (cargo check whisper-cpp is its own step; see stepCargoCheckWhisperCpp.)
  const voxDevScript = join(ROOT, 'scripts', 'voxDev.mjs')
  const pkgJsonPath = join(ROOT, 'package.json')
  if (!existsSync(voxDevScript) || !existsSync(pkgJsonPath)) {
    addCheck({
      id: 'vox_dev_orchestrator',
      title: 'runtime · npm run vox:dev orchestrator',
      status: 'fail',
      summary: 'scripts/voxDev.mjs ou package.json ausentes.',
      next_action: 'Restore the V3.10 changes (Wave Enterprise Runtime Readiness).',
    })
  } else {
    let pkg
    try {
      pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'))
    } catch {
      pkg = null
    }
    const hasVoxDev = Boolean(pkg?.scripts?.['vox:dev'])
    const hasTauriVoxDev = Boolean(pkg?.scripts?.['tauri:dev:vox'])
    if (hasVoxDev && hasTauriVoxDev) {
      addCheck({
        id: 'vox_dev_orchestrator',
        title: 'runtime · npm run vox:dev orchestrator',
        status: 'pass',
        summary: 'scripts `vox:dev` + `tauri:dev:vox` wired in package.json.',
        detail: {
          orchestrator: tildify(voxDevScript),
          scripts: ['vox:dev', 'tauri:dev:vox', 'tauri:build:vox'],
        },
      })
    } else {
      addCheck({
        id: 'vox_dev_orchestrator',
        title: 'runtime · npm run vox:dev orchestrator',
        status: 'fail',
        summary: 'package.json não declara `vox:dev` e/ou `tauri:dev:vox`.',
        detail: { has_vox_dev: hasVoxDev, has_tauri_vox_dev: hasTauriVoxDev },
        next_action: 'Reaplique os scripts da Wave V3.10 em apps/desktop/package.json.',
      })
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────
// V3.10 Truth Check (Claude AE) · cargo check whisper-cpp.
//
// Static wiring checks are not enough: `whisper-cpp` feature can be wired
// in Cargo.toml AND still fail to compile when cmake is absent or the
// dependency tree drifts. This step runs an honest, non-destructive
// `cargo check -p atlas-tauri --features whisper-cpp` and decides:
//
//   - cargo absent on PATH               → warn (CI/sandbox)
//   - cmake missing (stderr signal)      → fail · blocker is `brew install cmake`
//   - cargo check OK                     → pass
//   - cargo check failure (other reason) → fail · stderr tail in detail
//
// We intentionally use `cargo check` (not `cargo build`) — it links no
// binary, but still drives the whisper-rs build script, which is what
// surfaces cmake/cmd-line failures. Cached after the first run.
// ──────────────────────────────────────────────────────────────────────────

async function stepCargoCheckWhisperCpp() {
  const id = 'cargo_check_whisper_cpp'
  const title = 'runtime · cargo check -p atlas-tauri --features whisper-cpp'

  if (!commandExists('cargo')) {
    addCheck({
      id,
      title,
      status: 'warn',
      summary: 'cargo ausente no PATH — pulei a verificação real de whisper-cpp.',
      next_action:
        'Instale a toolchain Rust (rustup) e re-rode. Sem isso, não dá pra provar que o runtime nativo compila.',
    })
    return
  }

  const workspaceRoot = join(ROOT, '..', '..')
  const result = await runStep(
    'cargo',
    'cargo',
    ['check', '-p', 'atlas-tauri', '--features', 'whisper-cpp'],
    { cwd: workspaceRoot, timeoutMs: 600_000 },
  )

  if (result.spawnError) {
    addCheck({
      id,
      title,
      status: 'warn',
      summary: `cargo não respondeu (${result.spawnError}) — tratei como warn.`,
      duration_ms: result.durationMs,
      next_action: 'Rode `cargo check -p atlas-tauri --features whisper-cpp` manualmente.',
    })
    return
  }
  if (result.timedOut) {
    addCheck({
      id,
      title,
      status: 'fail',
      summary: 'cargo check estourou o timeout (600s).',
      duration_ms: result.durationMs,
      detail: { stderr_tail: tail(result.stderr, 12) },
      next_action: 'Rode `cargo check -p atlas-tauri --features whisper-cpp` manualmente.',
    })
    return
  }
  if (result.code === 0) {
    addCheck({
      id,
      title,
      status: 'pass',
      summary: 'whisper-cpp compila — runtime nativo Vox pronto pra linkar.',
      duration_ms: result.durationMs,
      detail: {
        exit: result.code,
        // Avoid attaching the full stdout; it's verbose. Tail keeps audit
        // possible without bloating the manifest.
        stdout_tail: tail(result.stdout, 4),
      },
    })
    return
  }

  // Non-zero exit · diagnose by sniffing stderr for known signatures.
  const stderr = String(result.stderr ?? '')
  const stdout = String(result.stdout ?? '')
  const blob = `${stderr}\n${stdout}`

  // cmake hint heuristics — whisper-rs's build.rs / cmake-rs print these
  // signatures when the toolchain is missing. Observed in the wild
  // (V3.10 truth check run, 2026-05-18):
  //
  //   running: cd "…/whisper-rs-sys-…/out/build" && … "cmake" …
  //   thread 'main' panicked at cmake-0.1.58/src/lib.rs:1132:5:
  //   failed to execute command: No such file or directory (os error 2)
  //   is `cmake` not installed?
  //
  // Match the canonical strings cmake-rs emits, plus a few defensive
  // variants in case the wording changes upstream.
  const cmakeMissing =
    /is\s+`?cmake`?\s+not\s+installed\?/i.test(blob)
    || /failed to execute command:\s*No such file or directory[^\n]*\n[^\n]*cmake/i.test(blob)
    || /cmake[^\n]*not\s+found/i.test(blob)
    || /failed to execute command:\s*"?cmake"?/i.test(blob)
    || /Could not find `cmake`/i.test(blob)
    || /'cmake'.*command not found/i.test(blob)
    || /failed to run.*cmake/i.test(blob)
    // Defensive: any panic out of the `cmake-` crate during build script
    // is overwhelmingly a "cmake binary absent" symptom.
    || (/panicked at[^\n]*cmake-[\d.]+/i.test(blob) && /\(os error 2\)/i.test(blob))

  if (cmakeMissing) {
    addCheck({
      id,
      title,
      status: 'fail',
      summary: 'cmake ausente — whisper.cpp não compila.',
      duration_ms: result.durationMs,
      detail: {
        exit: result.code,
        stderr_tail: tail(stderr, 14),
        blocker: 'cmake_missing',
      },
      next_action:
        'brew install cmake  · em seguida re-rode `npm run vox:release-check --workspace=@atlas/desktop`.',
    })
    return
  }

  // Other compilation failure — surface stderr tail so the operator can
  // act on the concrete error without re-running cargo.
  addCheck({
    id,
    title,
    status: 'fail',
    summary: `cargo check com whisper-cpp falhou (exit ${result.code}).`,
    duration_ms: result.durationMs,
    detail: {
      exit: result.code,
      stderr_tail: tail(stderr, 18),
      stdout_tail: tail(stdout, 6),
    },
    next_action:
      'Rode `cargo check -p atlas-tauri --features whisper-cpp` manualmente e leia o stderr. STOP-THE-LINE até resolver — release check não pode prometer runtime pronto enquanto whisper.cpp não compila.',
  })
}

// ──────────────────────────────────────────────────────────────────────────
// Final report
// ──────────────────────────────────────────────────────────────────────────

function writeReport(status) {
  const totals = {
    total: checks.length,
    pass: checks.filter((c) => c.status === 'pass').length,
    warn: checks.filter((c) => c.status === 'warn').length,
    fail: checks.filter((c) => c.status === 'fail').length,
  }
  const report = {
    schema: 'atlas.vox.desktop_release_check.v1',
    status,
    generated_at: new Date().toISOString(),
    duration_ms: Date.now() - STARTED_AT,
    totals,
    checks,
    next_actions: nextActions,
    artifacts,
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      cwd: tildify(process.cwd()),
      cargo_available: commandExists('cargo'),
    },
  }
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2))
  return report
}

function printSummary(report) {
  const banner =
    report.status === 'pass' ? '✓ PASS' : report.status === 'warn' ? '⚠ WARN' : '✗ FAIL'
  console.log(`\nAtlas Vox · desktop release check · ${banner}`)
  console.log(`generated_at: ${report.generated_at}`)
  console.log(
    `duration:     ${(report.duration_ms / 1000).toFixed(1)}s · ` +
      `${report.totals.pass} pass · ${report.totals.warn} warn · ${report.totals.fail} fail`,
  )
  console.log('')
  for (const c of report.checks) {
    const tag = c.status === 'pass' ? '✓' : c.status === 'warn' ? '⚠' : '✗'
    const ms = `${(c.duration_ms / 1000).toFixed(1)}s`
    console.log(`  ${tag} ${c.title.padEnd(48)} ${ms.padStart(7)} · ${c.summary}`)
  }
  if (report.next_actions.length > 0) {
    console.log('\nPróximos passos:')
    for (const a of report.next_actions) {
      console.log(`  • [${a.check_id}] ${a.action}`)
    }
  }
  printBootSequence(report)
  console.log(`\nrelatório completo: ${relative(process.cwd(), REPORT_PATH)}`)
}

// ──────────────────────────────────────────────────────────────────────────
// Always-on boot sequence · canonical answer to "como uso AGORA?"
//
// Prints a 5-step recipe Vitor can copy-paste in the order it runs. Steps
// derived from the smoke remediation get folded in inline so a missing
// model or unset backend URL only shows up where it applies — the rest is
// the immovable canonical sequence: server up → migrations → env →
// model → re-run release check.
// ──────────────────────────────────────────────────────────────────────────

function printBootSequence(report) {
  const remediation = bootSequence.firstUseRemediation
  const allClear = (report?.status ?? 'pass') === 'pass'
  console.log('\nPara usar agora (Mac · local-first · sem API paga):')

  if (allClear) {
    console.log('  ✓ Tudo verde. Abra o Atlas Desktop e use Option+Space.')
    console.log('     `npm run vox:dev --workspace=@atlas/desktop`')
    return
  }

  // Numbered canonical sequence. Each step is either ALWAYS printed (the
  // immovable ones) or printed CONDITIONALLY based on what the smoke
  // remediation flagged. Order is intentional: a backend doesn't help
  // until the server is up; the model placement doesn't help until you
  // intend to use real STT.
  let step = 1

  // Step 1 · always print: server up (silent if Vitor already has it).
  console.log(`  ${step++}. Suba o atlas-server (se já estiver rodando, pule)`)
  console.log('     cd ../../atlas-server && /opt/homebrew/bin/php artisan serve --port=8001')

  // Step 2 · always print: migrations (idempotent in dev).
  console.log(`  ${step++}. Materialize as tabelas Vox (idempotente)`)
  console.log('     cd ../../atlas-server && /opt/homebrew/bin/php artisan migrate')

  // Step 3 · always print: export env (Vitor copies even if env was unset).
  console.log(`  ${step++}. Aponte o Desktop para o atlas-server`)
  console.log('     export VITE_ATLAS_SERVER_URL=http://127.0.0.1:8001')

  // Step 4 · always print: position model (manual download policy).
  console.log(`  ${step++}. Posicione o modelo Whisper large-v3 (download manual; o release check NÃO baixa)`)
  console.log('     ~/.atlas/vox/models/ggml-large-v3.bin')
  console.log('     # download em huggingface.co/ggerganov/whisper.cpp/tree/main')

  // Step 5 · re-run release check.
  console.log(`  ${step++}. Re-rode o release check`)
  console.log('     npm run vox:release-check --workspace=@atlas/desktop')

  // Footer · category-tagged remediation (if any) so Vitor sees the
  // SPECIFIC piece flagged this run.
  if (remediation && remediation.bootSteps.length > 0) {
    console.log('\n  Nessa rodada, o smoke flagou especificamente:')
    for (const s of remediation.bootSteps) {
      console.log(`    – ${s.title}`)
      for (const line of String(s.body).split('\n')) {
        console.log(`        ${line}`)
      }
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────

async function main() {
  // Run steps sequentially — they share resources (the build step is
  // heavy on CPU + filesystem, and the smoke steps reuse Vite). Parallel
  // execution would be hostile to a developer's laptop.
  await stepVoxSmoke()
  await stepVoxVisualSmoke()
  stepLeakRescan()
  await stepUnitTests()
  await stepCargo('atlas-platform')
  await stepCargo('atlas-tauri')
  // V3.10 (Claude AD) · enterprise runtime readiness. Static checks that
  // prove the Tauri build can actually link whisper.cpp and that the
  // `vox:dev` orchestrator is wired.
  stepRuntimeReadiness()
  // V3.10 Truth Check (Claude AE) · the static feature-wiring above is
  // not enough — a `whisper-cpp` feature can be declared AND still fail
  // to compile when cmake is absent. This step proves the runtime
  // actually compiles. Without it, release check could PASS while
  // `tauri dev --features whisper-cpp` errors out on the first launch.
  await stepCargoCheckWhisperCpp()
  await stepBuild()

  let overall = 'pass'
  for (const c of checks) overall = escalate(overall, c.status)
  if (checks.length === 0) overall = 'fail'

  const report = writeReport(overall)
  printSummary(report)
  process.exit(overall === 'fail' ? 1 : 0)
}

main().catch((e) => {
  console.error('voxReleaseCheck crashed:', e)
  writeFileSync(
    REPORT_PATH,
    JSON.stringify(
      {
        schema: 'atlas.vox.desktop_release_check.v1',
        status: 'fail',
        generated_at: new Date().toISOString(),
        crashed: true,
        message: e instanceof Error ? e.message : String(e),
        checks,
        artifacts,
        next_actions: [
          {
            check_id: 'orchestrator',
            action: 'O próprio voxReleaseCheck.mjs travou. Rode os steps individualmente para isolar.',
          },
        ],
      },
      null,
      2,
    ),
  )
  process.exit(2)
})
