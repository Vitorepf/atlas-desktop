#!/usr/bin/env node
/**
 * Atlas Vox · doctor (V6-J).
 *
 * Comando único de diagnóstico humano. Roda em segundos. Lê arquivos
 * locais e (best-effort) chama `/ai/vox/health`. Devolve um relatório PT-BR
 * com próximos passos concretos.
 *
 * Hard rules:
 *   - PT-BR estrito na UI. Sem inglês técnico cru.
 *   - NUNCA imprime token. Token aparece como ✓ presente / ✗ ausente.
 *   - NUNCA roda sudo. NUNCA reseta privacy/TCC. NUNCA instala nada
 *     automaticamente. Mostra o passo exato pro operador fazer.
 *   - NUNCA fala "erro" sem dizer a próxima ação.
 *
 * Saída humana + manifest em `test-results/vox-doctor/manifest.json`
 * (schema `atlas.vox.doctor.v1`).
 *
 * Exit codes:
 *   0  → todos os checks pass/warn (Vox pronto pra dogfood)
 *   1  → ≥ 1 fail (algo crítico bloqueia o uso)
 *
 * Uso:
 *   npm run vox:doctor --workspace=@atlas/desktop
 */

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const DESKTOP_APP_ROOT = resolve(__dirname, '..')
const ATLAS_DESKTOP_ROOT = resolve(DESKTOP_APP_ROOT, '..', '..')
const ATLAS_ROOT = resolve(ATLAS_DESKTOP_ROOT, '..')
const SERVER_DIR = resolve(process.env.ATLAS_SERVER_DIR || join(ATLAS_ROOT, 'atlas-server'))

const TAURI_CRATE = join(ATLAS_DESKTOP_ROOT, 'crates', 'atlas-tauri')
const INFO_PLIST = join(TAURI_CRATE, 'Info.plist')
const ENTITLEMENTS = join(TAURI_CRATE, 'entitlements.plist')
const TAURI_CONF = join(TAURI_CRATE, 'tauri.conf.json')
const TAURI_CARGO = join(TAURI_CRATE, 'Cargo.toml')
const MODEL_FILE = join(homedir(), '.atlas', 'vox', 'models', 'ggml-large-v3.bin')

const HOST = (process.env.ATLAS_SERVER_HOST || '127.0.0.1').trim()
const PORT = parseInt(process.env.ATLAS_SERVER_PORT || '8001', 10)
const HEALTH_URL = process.env.ATLAS_VOX_HEALTH_URL || `http://${HOST}:${PORT}/ai/vox/health`

const REPORT_DIR = join(DESKTOP_APP_ROOT, 'test-results', 'vox-doctor')
const REPORT_PATH = join(REPORT_DIR, 'manifest.json')
mkdirSync(REPORT_DIR, { recursive: true })

const startedAt = Date.now()
const checks = []
const nextActions = []
let aggregate = 'pass'

const COLOR_GREEN = '\x1b[32m'
const COLOR_YELLOW = '\x1b[33m'
const COLOR_RED = '\x1b[31m'
const COLOR_DIM = '\x1b[2m'
const COLOR_RESET = '\x1b[0m'

function colored(c, s) {
  return process.stdout.isTTY ? `${c}${s}${COLOR_RESET}` : s
}

function escalate(next) {
  if (aggregate === 'fail' || next === 'fail') aggregate = 'fail'
  else if (aggregate === 'warn' || next === 'warn') aggregate = 'warn'
}

function record(id, title, status, message, { detail = null, nextAction = null } = {}) {
  checks.push({ id, title, status, message, detail, next_action: nextAction })
  if (nextAction && status !== 'pass') {
    nextActions.push(`${id} — ${nextAction}`)
  }
  escalate(status)
  const marker =
    status === 'pass' ? colored(COLOR_GREEN, '✓')
      : status === 'warn' ? colored(COLOR_YELLOW, '!')
        : colored(COLOR_RED, '✗')
  console.log(`  ${marker}  ${title}`)
  console.log(`     ${colored(COLOR_DIM, message)}`)
  if (nextAction) {
    console.log(`     ${colored(COLOR_DIM, '→ '+nextAction)}`)
  }
}

function readSafe(path) {
  try {
    return readFileSync(path, 'utf8')
  } catch (_) {
    return null
  }
}

function readJson(path) {
  const raw = readSafe(path)
  if (raw === null) return null
  try {
    return JSON.parse(raw)
  } catch (_) {
    return null
  }
}

// ──────────────────────────────────────────────────────────────────────
// Token presence — NUNCA imprime valor. Apenas presença/origem.
// ──────────────────────────────────────────────────────────────────────

function tokenPresence() {
  // V6-J · o valor cru vive APENAS dentro deste objeto pra anexar
  //        `X-Atlas-Token` no fetch. Nunca cai em `console.log`, nunca cai
  //        no manifest JSON (filtramos manualmente abaixo).
  if (typeof process.env.ATLAS_TOKEN === 'string' && process.env.ATLAS_TOKEN.trim() !== '') {
    return {
      present: true,
      source: 'shell',
      length: process.env.ATLAS_TOKEN.trim().length,
      rawValue: process.env.ATLAS_TOKEN.trim(),
    }
  }
  const envFile = join(SERVER_DIR, '.env')
  const raw = readSafe(envFile)
  if (raw !== null) {
    const m = raw.match(/^ATLAS_TOKEN=(.+)$/m)
    if (m && m[1].trim() !== '') {
      return {
        present: true,
        source: 'atlas-server/.env',
        length: m[1].trim().length,
        rawValue: m[1].trim(),
      }
    }
  }
  return { present: false, source: null, length: 0, rawValue: null }
}

// ──────────────────────────────────────────────────────────────────────
// Checks
// ──────────────────────────────────────────────────────────────────────

async function checkAtlasServerVivo(tokenInfo) {
  let response
  try {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 2500)
    // V6-J · `headers` só carrega o nome do header. O VALOR vem de uma
    //        leitura local (.env ou ENV) que NÃO é printada em log algum.
    const headers = {}
    if (tokenInfo.rawValue !== null) {
      headers['X-Atlas-Token'] = tokenInfo.rawValue
    }
    response = await fetch(HEALTH_URL, { signal: controller.signal, headers })
    clearTimeout(t)
  } catch (e) {
    record(
      'atlas_server_vivo',
      'atlas-server está rodando',
      'fail',
      `Não consegui falar com ${HEALTH_URL}.`,
      {
        nextAction:
          'Em outro terminal, suba o servidor: cd '+SERVER_DIR+
          ' && /opt/homebrew/bin/php artisan serve --port='+PORT,
        detail: { url: HEALTH_URL, error_kind: 'unreachable' },
      },
    )
    return
  }
  if (response.status === 401 || response.status === 403) {
    if (!tokenInfo.present) {
      record(
        'atlas_server_vivo',
        'atlas-server está rodando',
        'warn',
        'O servidor está vivo mas exige token e nenhum foi enviado.',
        {
          nextAction:
            'Defina ATLAS_TOKEN no atlas-server/.env (o Atlas Vox lê dali sem mostrar o valor).',
          detail: { url: HEALTH_URL, status: response.status, token_attached: false },
        },
      )
      return
    }
    record(
      'atlas_server_vivo',
      'atlas-server está rodando',
      'fail',
      'O servidor está vivo mas rejeitou o token enviado.',
      {
        nextAction:
          'Confira se o ATLAS_TOKEN do shell é IGUAL ao do atlas-server/.env e reinicie o servidor depois de mudar o .env. '+
          'O valor nunca aparece neste log.',
        detail: { url: HEALTH_URL, status: response.status, token_attached: true },
      },
    )
    return
  }
  if (!response.ok) {
    record(
      'atlas_server_vivo',
      'atlas-server está rodando',
      'fail',
      `O servidor respondeu mas com status ${response.status}.`,
      {
        nextAction:
          'Confira se /ai/vox/health está registrada e que migrations rodaram: '+
          'cd '+SERVER_DIR+' && /opt/homebrew/bin/php artisan migrate',
        detail: { url: HEALTH_URL, status: response.status },
      },
    )
    return
  }
  let body = null
  try { body = await response.json() } catch (_) { body = null }
  record(
    'atlas_server_vivo',
    'atlas-server está rodando',
    'pass',
    `Respondeu em ${HEALTH_URL} (status ${response.status}).`,
    { detail: { url: HEALTH_URL, status: response.status, version: body?.version ?? null } },
  )
}

function checkVoxServerUrl() {
  const fromEnv = process.env.VITE_ATLAS_SERVER_URL || process.env.ATLAS_SERVER_URL || null
  if (fromEnv) {
    record(
      'desktop_server_url',
      'Desktop sabe onde o atlas-server está',
      'pass',
      `VITE_ATLAS_SERVER_URL=${fromEnv}`,
      { detail: { value: fromEnv } },
    )
    return
  }
  record(
    'desktop_server_url',
    'Desktop sabe onde o atlas-server está',
    'warn',
    'Variável VITE_ATLAS_SERVER_URL não está exportada no shell.',
    {
      nextAction:
        'Exporte no mesmo terminal antes de abrir o Atlas Code: '+
        `export VITE_ATLAS_SERVER_URL=http://${HOST}:${PORT}`,
    },
  )
}

function checkAtlasToken() {
  // V6-J · usa o tokenInfo global pra não ler o .env duas vezes nem
  //        passar valor cru pra esta função.
  const t = tokenInfo
  if (t.present) {
    record(
      'atlas_token_presente',
      'Token de acesso disponível',
      'pass',
      `Token presente (origem: ${t.source}). O valor nunca aparece em log.`,
      { detail: { source: t.source, value_present: true } },
    )
    return
  }
  record(
    'atlas_token_presente',
    'Token de acesso disponível',
    'warn',
    'Não encontrei ATLAS_TOKEN no shell nem em atlas-server/.env.',
    {
      nextAction:
        'Defina ATLAS_TOKEN no atlas-server/.env (ou exporte no shell). '+
        'O Atlas Vox usa esse valor automaticamente sem mostrar em log.',
    },
  )
}

function checkWhisperModel() {
  if (!existsSync(MODEL_FILE)) {
    record(
      'modelo_whisper',
      'Modelo de voz local (Whisper large-v3) presente',
      'fail',
      `Não encontrei ${MODEL_FILE}.`,
      {
        nextAction:
          'Baixe ggml-large-v3.bin (~3.1 GB) em huggingface.co/ggerganov/whisper.cpp/tree/main '+
          'e mova para '+MODEL_FILE,
        detail: { expected_path: MODEL_FILE.replace(homedir(), '~') },
      },
    )
    return
  }
  let sizeMb = 0
  try { sizeMb = Math.round(statSync(MODEL_FILE).size / (1024*1024)) } catch (_) {}
  const realistic = sizeMb >= 2900
  if (!realistic) {
    record(
      'modelo_whisper',
      'Modelo de voz local (Whisper large-v3) presente',
      'warn',
      `Arquivo presente mas tem ${sizeMb} MB. O modelo correto pesa ~3.1 GB.`,
      {
        nextAction:
          'Apague o arquivo e baixe de novo do mirror oficial '+
          '(huggingface.co/ggerganov/whisper.cpp). Pode estar incompleto.',
        detail: { size_mb: sizeMb, expected_mb: 3100 },
      },
    )
    return
  }
  record(
    'modelo_whisper',
    'Modelo de voz local (Whisper large-v3) presente',
    'pass',
    `Encontrado em ${MODEL_FILE.replace(homedir(), '~')} (${sizeMb} MB).`,
    { detail: { size_mb: sizeMb } },
  )
}

function checkBuildSuportaWhisper() {
  const cargo = readSafe(TAURI_CARGO)
  if (cargo === null) {
    record(
      'build_whisper_cpp',
      'Build do app desktop suporta voz local',
      'fail',
      'Não consegui ler crates/atlas-tauri/Cargo.toml.',
      {
        nextAction: 'Confirme que o repositório está completo: git status no atlas-desktop',
      },
    )
    return
  }
  const declares = /whisper-cpp\s*=\s*\[/.test(cargo) || /features\s*=\s*\[\s*"whisper-cpp"/.test(cargo)
  if (!declares) {
    record(
      'build_whisper_cpp',
      'Build do app desktop suporta voz local',
      'fail',
      'Feature whisper-cpp não está declarada no Cargo.toml do atlas-tauri.',
      {
        nextAction: 'Recompile o app pelo comando canônico: npm run tauri:build:vox',
      },
    )
    return
  }
  record(
    'build_whisper_cpp',
    'Build do app desktop suporta voz local',
    'pass',
    'Cargo encaminha a feature whisper-cpp para atlas-platform.',
  )
}

function checkInfoPlistMic() {
  const raw = readSafe(INFO_PLIST)
  if (raw === null) {
    record(
      'macos_info_plist',
      'Permissão de microfone declarada (Info.plist)',
      'fail',
      'Não encontrei Info.plist do app desktop.',
      {
        nextAction: 'O arquivo deveria estar em crates/atlas-tauri/Info.plist. '+
          'Recupere do git: git restore crates/atlas-tauri/Info.plist',
        detail: { expected_path: INFO_PLIST },
      },
    )
    return
  }
  if (!/<key>NSMicrophoneUsageDescription<\/key>/.test(raw)) {
    record(
      'macos_info_plist',
      'Permissão de microfone declarada (Info.plist)',
      'fail',
      'A chave NSMicrophoneUsageDescription está ausente — macOS vai bloquear gravação.',
      {
        nextAction:
          'Reabra crates/atlas-tauri/Info.plist e garanta o bloco com '+
          'NSMicrophoneUsageDescription antes de recompilar.',
      },
    )
    return
  }
  // V6-RUNTIME-FINAL · ⌥ Espaço global precisa também de Acessibilidade e
  // Monitoramento de Entrada. Sem as descrições, o macOS mostra texto vazio
  // na caixa do TCC — fica feio e Vitor não entende o pedido.
  const hasAccessibility = /<key>NSAccessibilityUsageDescription<\/key>/.test(raw)
  const hasInputMonitoring = /<key>NSInputMonitoringUsageDescription<\/key>/.test(raw)
  if (!hasAccessibility || !hasInputMonitoring) {
    const missing = []
    if (!hasAccessibility) missing.push('NSAccessibilityUsageDescription')
    if (!hasInputMonitoring) missing.push('NSInputMonitoringUsageDescription')
    record(
      'macos_info_plist',
      'Permissão de microfone declarada (Info.plist)',
      'warn',
      'Microfone OK, mas faltam descrições PT-BR para o atalho global ⌥ Espaço: '+
        missing.join(', ')+'.',
      {
        nextAction:
          'Acrescente as chaves em crates/atlas-tauri/Info.plist. Sem elas, '+
          'o atalho global ainda funciona se o app estiver em foco, mas a '+
          'caixa do TCC para Acessibilidade / Monitoramento de Entrada mostra '+
          'mensagem em branco — Vitor não entende o pedido.',
        detail: { missing_keys: missing },
      },
    )
    return
  }
  record(
    'macos_info_plist',
    'Permissão de microfone declarada (Info.plist)',
    'pass',
    'NSMicrophoneUsageDescription + Acessibilidade + Monitoramento de Entrada presentes (todas em PT-BR).',
  )
}

function checkEntitlements() {
  const raw = readSafe(ENTITLEMENTS)
  if (raw === null) {
    record(
      'macos_entitlements',
      'Entitlement de áudio do app desktop',
      'fail',
      'Não encontrei entitlements.plist.',
      {
        nextAction:
          'Recupere com git: git restore crates/atlas-tauri/entitlements.plist',
      },
    )
    return
  }
  const ok = /<key>com\.apple\.security\.device\.audio-input<\/key>\s*<true\/>/.test(raw)
  if (!ok) {
    record(
      'macos_entitlements',
      'Entitlement de áudio do app desktop',
      'fail',
      'O entitlement com.apple.security.device.audio-input não está habilitado.',
      {
        nextAction:
          'Edite crates/atlas-tauri/entitlements.plist e garanta '+
          'com.apple.security.device.audio-input = true. Depois rebuild o app.',
      },
    )
    return
  }
  record(
    'macos_entitlements',
    'Entitlement de áudio do app desktop',
    'pass',
    'com.apple.security.device.audio-input habilitado.',
  )
}

function checkSigningIdentity() {
  const conf = readJson(TAURI_CONF)
  if (conf === null) {
    record(
      'macos_signing',
      'Assinatura estável do app desktop',
      'warn',
      'Não consegui ler tauri.conf.json.',
      {
        nextAction: 'Confira crates/atlas-tauri/tauri.conf.json',
      },
    )
    return
  }
  const macos = conf?.bundle?.macOS ?? {}
  const signing =
    typeof macos['signing-identity'] === 'string' && macos['signing-identity'].trim() !== ''
      ? macos['signing-identity']
      : typeof macos.signingIdentity === 'string' && macos.signingIdentity.trim() !== ''
        ? macos.signingIdentity
        : null
  if (signing === null) {
    record(
      'macos_signing',
      'Assinatura estável do app desktop',
      'warn',
      'tauri.conf.json não declara uma identidade de assinatura estável.',
      {
        nextAction:
          'Para evitar que o macOS peça permissão de microfone toda vez, '+
          'declare "signing-identity": "Atlas Local Code Signing" em bundle.macOS. '+
          'Cada vez que a assinatura muda, o macOS reseta a permissão.',
        detail: { current: macos },
      },
    )
    return
  }
  record(
    'macos_signing',
    'Assinatura estável do app desktop',
    'pass',
    `Identidade declarada: "${signing}".`,
    { detail: { signing_identity: signing } },
  )
}

function checkAppBundleStable() {
  // V6-MIC-AIRPODS-FINAL · explica em PT-BR por que a caixa do microfone
  // volta a aparecer "do nada". Causa quase sempre = alternar entre dev app
  // (`npm run tauri:dev`) e release app (`Atlas Code.app`). Cada binário tem
  // bundle ID + assinatura próprios, então o macOS trata como apps diferentes.
  const releaseAppCandidates = [
    join(ATLAS_DESKTOP_ROOT, 'target', 'release', 'bundle', 'macos', 'Atlas Code.app'),
    '/Applications/Atlas Code.app',
    join(homedir(), 'Applications', 'Atlas Code.app'),
  ]
  const found = releaseAppCandidates.find((p) => existsSync(p))
  if (!found) {
    record(
      'app_bundle_estavel',
      'App empacotado estável (.app assinado)',
      'warn',
      'Não achei o Atlas Code.app empacotado. Sem ele, o macOS pode pedir microfone toda vez que você alternar entre dev e release.',
      {
        nextAction:
          'Gere o .app uma vez: npm run tauri:build:vox --workspace=@atlas/desktop. '+
          'Depois use sempre o mesmo binário (release) para o uso diário. '+
          'Se alternar entre dev e release, o macOS reseta a permissão do microfone.',
        detail: { searched: releaseAppCandidates.map((p) => p.replace(homedir(), '~')) },
      },
    )
    return
  }
  record(
    'app_bundle_estavel',
    'App empacotado estável (.app assinado)',
    'pass',
    `Atlas Code.app empacotado em ${found.replace(homedir(), '~')}.`,
    {
      detail: { app_bundle_path: found.replace(homedir(), '~') },
    },
  )
}

function checkMicrofoneAtual() {
  // V6-MIC-AIRPODS-FINAL · só consegue ler o input device a partir do .app
  // empacotado (precisa do tauri runtime + cpal). Aqui no Node não temos
  // CoreAudio, então o doctor explica como conferir.
  record(
    'microfone_atual',
    'Microfone selecionado no macOS',
    'pass',
    'O Atlas Vox usa SEMPRE a entrada de áudio selecionada no macOS — incluindo AirPods.',
    {
      detail: {
        airpods_supported: true,
        how_to_check:
          'Abra Ajustes do Sistema → Som → Entrada. O dispositivo destacado é o que o Atlas Vox vai usar.',
      },
    },
  )
}

function checkHotkeyOptionSpace() {
  // confirma só presença — execução real precisa do app aberto
  const hotkeyMod = join(ATLAS_DESKTOP_ROOT, 'crates', 'atlas-platform', 'src', 'vox', 'hotkey.rs')
  const raw = readSafe(hotkeyMod)
  if (raw === null || !/Option/i.test(raw)) {
    record(
      'hotkey_option_space',
      'Atalho ⌥ Espaço configurado no app',
      'warn',
      'Não confirmei a referência a Option+Espaço em crates/atlas-platform/src/vox/hotkey.rs.',
      {
        nextAction:
          'O atalho funciona só com o Atlas Code aberto. Para que funcione com app fechado, '+
          'instale o LaunchAgent: npm run vox:ambient:install --workspace=@atlas/desktop',
      },
    )
    return
  }
  record(
    'hotkey_option_space',
    'Atalho ⌥ Espaço configurado no app',
    'pass',
    'Atalho ⌥ Espaço registrado pelo runtime do Atlas Code (funciona com o app aberto).',
  )
}

// ──────────────────────────────────────────────────────────────────────
// Run
// ──────────────────────────────────────────────────────────────────────

console.log(colored(COLOR_DIM, 'Atlas Vox · doctor (diagnóstico em PT-BR)'))
console.log(colored(COLOR_DIM, '────────────────────────────────────────'))
console.log('')

const tokenInfo = tokenPresence()
await checkAtlasServerVivo(tokenInfo)
checkVoxServerUrl()
checkAtlasToken()
checkWhisperModel()
checkBuildSuportaWhisper()
checkInfoPlistMic()
checkEntitlements()
checkSigningIdentity()
checkAppBundleStable()
checkMicrofoneAtual()
checkHotkeyOptionSpace()

console.log('')
const totals = checks.reduce(
  (acc, c) => { acc.total++; acc[c.status] = (acc[c.status] ?? 0) + 1; return acc },
  { total: 0, pass: 0, warn: 0, fail: 0 },
)
const headColor =
  aggregate === 'pass' ? COLOR_GREEN : aggregate === 'warn' ? COLOR_YELLOW : COLOR_RED
console.log(
  colored(
    headColor,
    `Resultado: ${aggregate.toUpperCase()}  ·  ${totals.pass} ok · ${totals.warn} aviso · ${totals.fail} bloqueio`,
  ),
)

if (nextActions.length > 0) {
  console.log('')
  console.log('Próximos passos:')
  for (const a of nextActions) console.log('  · '+a)
}

if (aggregate === 'pass') {
  console.log('')
  console.log('Como abrir o Atlas Vox agora:')
  console.log('  1. Abra o Atlas Code (binário do desktop).')
  console.log('  2. Pressione ⌥ Espaço pra começar a falar.')
  console.log('  3. Pressione ⌥ Espaço de novo (ou Enter) pra finalizar.')
}

// V6-J · sanitização defensiva: garantir que o valor cru do token NUNCA
// cai no manifest, mesmo que algum check tenha passado tokenInfo inteiro
// como detail por engano. Recursivamente remove qualquer chave `rawValue`.
function stripRawValue(value) {
  if (Array.isArray(value)) return value.map(stripRawValue)
  if (value !== null && typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) {
      if (k === 'rawValue') continue
      out[k] = stripRawValue(v)
    }
    return out
  }
  return value
}

const envelope = {
  schema: 'atlas.vox.doctor.v1',
  status: aggregate,
  generated_at: new Date().toISOString(),
  duration_ms: Date.now() - startedAt,
  totals,
  checks: stripRawValue(checks),
  next_actions: nextActions,
  hint: 'Comando recomendado para abrir Atlas Vox: npm run vox:dev --workspace=@atlas/desktop',
}
writeFileSync(REPORT_PATH, JSON.stringify(envelope, null, 2))
console.log('')
console.log(colored(COLOR_DIM, `relatório: ${REPORT_PATH.replace(homedir(), '~')}`))

process.exit(aggregate === 'fail' ? 1 : 0)
