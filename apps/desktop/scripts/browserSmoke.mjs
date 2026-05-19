/**
 * Atlas Dev Desktop · Real-browser visual smoke.
 *
 * Why this script exists:
 *   - The previous visual report (atlas-visual-report/manifest.json) only proved
 *     that Vite responded with a 200 on the HTML shell — its `screenshot` field
 *     was `skipped` with reason `playwright_dependency_not_installed`. The
 *     dumped HTML body was the static shell with an empty `<div id="root">`.
 *     That is not evidence the React app rendered.
 *   - We also already have a SSR-only smoke (`scripts/visualRender.mjs`) which
 *     proves the Atlas Dev *components* render, but does not exercise the real
 *     bundled JS, the real CSS pipeline, or anything a human eye would see.
 *
 * What this script does:
 *   1. Verifies a pre-built `dist/` exists (caller is responsible for
 *      `npm run build`).
 *   2. Starts a tiny static HTTP server over `dist/` on a free localhost port.
 *   3. Drives the operator's local Chrome (`/Applications/Google Chrome.app`)
 *      in headless mode to:
 *        - load `http://127.0.0.1:<port>/`,
 *        - capture a real PNG screenshot,
 *        - dump the post-React DOM,
 *        - capture browser stderr for console errors.
 *   4. Asserts the rendered DOM:
 *        - `#root` is non-empty;
 *        - contains the canonical Atlas shell marker
 *          (`class="atlas-shell …"`);
 *        - contains at least one stable React-rendered chunk
 *          (one of: TopBar, AtlasShell layout, surface markers);
 *        - never leaks `/Users/` or `/private/var/` paths;
 *        - never leaks a `confirmation_token` plaintext (the bundled JS only
 *          mints tokens at runtime from a backend, but this guards against
 *          accidental fixture leaks in the bundle).
 *   5. Writes a JSON manifest under
 *      `test-results/atlas-dev-browser/manifest.json` with the URL, screenshot
 *      path, DOM size, and pass/fail per assertion.
 *
 * Notes / constraints:
 *   - Zero new devDependencies. No Playwright, no Puppeteer. We invoke the
 *     local Chrome binary via `child_process.spawn`. If the binary is missing
 *     the script fails loud so CI / operators know.
 *   - The script never starts the Tauri shell. Atlas Dev Desktop is a
 *     React+Vite cockpit; Tauri is the production wrapper but is not required
 *     to prove the UI renders.
 *   - Backend (`atlas-server`) is NOT required. The shell boots in offline /
 *     no-token mode and we only assert the React shell mounts. UI-with-data
 *     evidence is the job of `scripts/visualRender.mjs` (SSR), which renders
 *     individual Atlas Dev panels against canonical redacted fixtures.
 */
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DIST = join(ROOT, 'dist')
const OUT_DIR = join(ROOT, 'test-results', 'atlas-dev-browser')
mkdirSync(OUT_DIR, { recursive: true })

const CHROME_BIN = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

// ─────────────────────────────────────────────────────────────────────────────
// Pre-flight
// ─────────────────────────────────────────────────────────────────────────────

if (!existsSync(DIST) || !existsSync(join(DIST, 'index.html'))) {
  fail(
    'dist_missing',
    `dist/index.html not found at ${DIST}. Run \`npm run build\` first.`,
  )
}
if (!existsSync(CHROME_BIN)) {
  fail(
    'chrome_missing',
    `Chrome binary not found at ${CHROME_BIN}. Install Google Chrome or wire a different headless binary into this script.`,
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tiny static server (no extra deps)
// ─────────────────────────────────────────────────────────────────────────────

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
}

const server = createServer((req, res) => {
  try {
    let urlPath = decodeURIComponent((req.url ?? '/').split('?')[0])
    if (urlPath === '/' || urlPath === '') urlPath = '/index.html'
    let filePath = join(DIST, urlPath)
    if (!filePath.startsWith(DIST)) {
      res.writeHead(403)
      res.end('forbidden')
      return
    }
    if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
      // SPA fallback — every unknown path falls back to index.html so client
      // routing has a chance to render. This is how a normal Vite preview
      // serves the app too.
      filePath = join(DIST, 'index.html')
    }
    const mime = MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-store' })
    createReadStream(filePath).pipe(res)
  } catch (cause) {
    res.writeHead(500)
    res.end(String(cause))
  }
})

await new Promise((resolve, reject) => {
  server.once('error', reject)
  // port=0 → free ephemeral port assigned by the OS.
  server.listen(0, '127.0.0.1', () => resolve())
})
const address = server.address()
if (!address || typeof address === 'string') {
  fail('server_no_address', 'static server failed to bind a port')
}
const baseUrl = `http://127.0.0.1:${address.port}`

// ─────────────────────────────────────────────────────────────────────────────
// Drive Chrome headless: screenshot + dump-dom
// ─────────────────────────────────────────────────────────────────────────────

const SCREENSHOT = join(OUT_DIR, 'root.png')
const DOM_DUMP = join(OUT_DIR, 'root.dom.html')
const STDERR_DUMP = join(OUT_DIR, 'root.stderr.log')

// Two separate runs to keep flags simple and outputs lossless:
//
//   (1) --screenshot writes a real PNG of the rendered viewport.
//   (2) --dump-dom prints the post-JS DOM to stdout for assertions.
//
// `--virtual-time-budget` advances Chrome's clock so React effects + the small
// number of synchronous network probes the app does on mount have time to
// settle before we capture.
const CHROME_FLAGS = [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--hide-scrollbars',
  '--window-size=1440,900',
  '--virtual-time-budget=8000',
  '--disable-features=Translate,MediaRouter,OptimizationHints,InterestFeedContentSuggestions',
  '--no-first-run',
  '--no-default-browser-check',
  // Best-effort console capture — Chrome's headless mode emits JS console
  // messages to stderr with `--enable-logging=stderr --v=1`. We redirect that
  // stream into a file so we can grep for "Uncaught"/"Error" after the run.
  '--enable-logging=stderr',
  '--v=1',
]

let screenshotBytes = 0
let screenshotErr = ''
try {
  await runChrome([...CHROME_FLAGS, `--screenshot=${SCREENSHOT}`, baseUrl], STDERR_DUMP)
  screenshotBytes = existsSync(SCREENSHOT) ? statSync(SCREENSHOT).size : 0
} catch (cause) {
  screenshotErr = String(cause?.message ?? cause)
}

let dumpedDom = ''
let domErr = ''
try {
  dumpedDom = await runChromeStdout([...CHROME_FLAGS, '--dump-dom', baseUrl])
  writeFileSync(DOM_DUMP, dumpedDom)
} catch (cause) {
  domErr = String(cause?.message ?? cause)
}

await new Promise((resolve) => server.close(() => resolve()))

// ─────────────────────────────────────────────────────────────────────────────
// Assertions
// ─────────────────────────────────────────────────────────────────────────────

const results = []
function check(name, cond, detail = '') {
  results.push({ name, ok: !!cond, detail: cond ? '' : detail })
}

// (a) screenshot exists and is non-trivial. A truly empty React app would still
// produce a PNG; a meaningful threshold (≥ 3 KB after PNG compression for a
// 1440×900 viewport) confirms there's actually content drawn.
check(
  'screenshot_written',
  screenshotBytes > 3 * 1024 && screenshotErr === '',
  `bytes=${screenshotBytes} err=${screenshotErr}`,
)

// (b) DOM dump exists and is bigger than the bare static shell. The shipped
// `dist/index.html` is ~1 KB; if React mounted, the dump is much bigger.
const shellBytes = statSync(join(DIST, 'index.html')).size
check(
  'dom_dump_bigger_than_shell',
  dumpedDom.length > shellBytes * 3 && domErr === '',
  `dom=${dumpedDom.length} shell=${shellBytes} err=${domErr}`,
)

// (c) `#root` is no longer empty post-render. We do not rely on a single
// selector — the canonical signature is the AtlasShell class on the root's
// child container.
const rootEmpty =
  dumpedDom.includes('<div id="root"></div>') ||
  dumpedDom.includes('<div id="root">\n</div>') ||
  dumpedDom.includes('<div id="root"> </div>')
check('root_not_empty', !rootEmpty, '#root is empty — React never mounted')

// (d) AtlasShell rendered.
check(
  'atlas_shell_rendered',
  dumpedDom.includes('class="atlas-shell ') ||
    dumpedDom.includes("class='atlas-shell "),
  'class="atlas-shell …" not found anywhere in the post-render DOM',
)

// (e) No fatal console errors / uncaught exceptions surfaced through Chrome's
// stderr. Chrome with `--enable-logging=stderr --v=1` produces noisy DevTools
// lines, and the offline Desktop bridge intentionally logs caught
// `TypeError: Failed to fetch` via `console.log` / `console.info` when the
// backend is absent. We only fail on two categories:
//
//   1. Lines Chrome itself tags as `[ERROR:CONSOLE` — these correspond to
//      real `console.error(...)` calls from the app code.
//   2. Lines containing `Uncaught ` — V8's prefix for un-handled exceptions.
//
// Anything tagged `[INFO:CONSOLE` or `[WARNING:CONSOLE` is considered
// best-effort diagnostic noise from offline boot probes and is ignored.
let stderrText = ''
if (existsSync(STDERR_DUMP)) {
  stderrText = readFileSync(STDERR_DUMP, 'utf8')
}
const consoleErrorLines = stderrText
  .split('\n')
  .filter((line) => /\[ERROR:CONSOLE|Uncaught /.test(line))
check(
  'no_console_errors',
  consoleErrorLines.length === 0,
  consoleErrorLines.slice(0, 5).join('\n'),
)

// (f) Provider-safe boundaries. Anything user-system-specific surfacing in the
// bundled DOM would be a contract violation — the canonical redactor emits
// `workspace_label` / `persisted_artifact_refs` / `persisted_receipt_refs`
// instead of absolute paths.
check(
  'no_absolute_users_path_leak',
  !dumpedDom.includes('/Users/') && !dumpedDom.includes('/private/var/'),
  'absolute filesystem path leaked into the post-render DOM',
)
check(
  'no_persisted_paths_key_leak',
  !dumpedDom.includes('persisted_artifact_paths') &&
    !dumpedDom.includes('persisted_receipt_paths'),
  'pre-redaction key (persisted_*_paths) leaked into the bundled DOM',
)
// Surrogate test: no obvious plaintext confirmation_token fixture in the
// build. Real tokens are only minted at runtime by the backend.
check(
  'no_confirmation_token_fixture_leak',
  !/PLAINTEXT_TOKEN_SHOULD_NOT_LEAK|ANOTHER_PLAINTEXT_TOKEN_SHOULD_NOT_LEAK/.test(dumpedDom),
  'fixture-only plaintext confirmation_token leaked into the production bundle',
)

// ─────────────────────────────────────────────────────────────────────────────
// Manifest + exit
// ─────────────────────────────────────────────────────────────────────────────

const passed = results.filter((r) => r.ok).length
const total = results.length

const manifest = {
  status: passed === total ? 'passed' : 'failed',
  url: baseUrl,
  artifacts: {
    screenshot: SCREENSHOT,
    dom_dump: DOM_DUMP,
    chrome_stderr: STDERR_DUMP,
  },
  sizes: {
    screenshot_bytes: screenshotBytes,
    dom_dump_bytes: dumpedDom.length,
    shell_bytes: shellBytes,
  },
  results,
  generated_at: new Date().toISOString(),
}
writeFileSync(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2))

for (const r of results) {
  process.stdout.write(`  ${r.ok ? '✓' : '✗'} ${r.name}${r.detail ? ` — ${r.detail}` : ''}\n`)
}
process.stdout.write(`\n${passed}/${total} passed\n`)
process.stdout.write(`Manifest:   ${join(OUT_DIR, 'manifest.json')}\n`)
process.stdout.write(`Screenshot: ${SCREENSHOT}\n`)
process.stdout.write(`DOM dump:   ${DOM_DUMP}\n`)

if (passed !== total) process.exit(1)

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fail(code, message) {
  process.stderr.write(`browserSmoke ${code}: ${message}\n`)
  process.exit(2)
}

async function runChrome(flags, stderrPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(CHROME_BIN, flags, { stdio: ['ignore', 'ignore', 'pipe'] })
    const stderrChunks = []
    child.stderr.on('data', (chunk) => stderrChunks.push(chunk))
    child.on('error', reject)
    child.on('close', (code) => {
      writeFileSync(stderrPath, Buffer.concat(stderrChunks))
      // Chrome returns non-zero in headless screenshot mode on some macOS
      // builds even though the PNG is fine; treat zero-byte output as the
      // real failure signal instead of the exit code.
      resolve({ code })
    })
    // Hard guard so a hung Chrome cannot stall CI.
    sleep(30_000).then(() => {
      if (!child.killed) child.kill('SIGKILL')
    })
  })
}

async function runChromeStdout(flags) {
  return new Promise((resolve, reject) => {
    const child = spawn(CHROME_BIN, flags, { stdio: ['ignore', 'pipe', 'pipe'] })
    const stdoutChunks = []
    child.stdout.on('data', (chunk) => stdoutChunks.push(chunk))
    child.on('error', reject)
    child.on('close', () => resolve(Buffer.concat(stdoutChunks).toString('utf8')))
    sleep(30_000).then(() => {
      if (!child.killed) child.kill('SIGKILL')
    })
  })
}
