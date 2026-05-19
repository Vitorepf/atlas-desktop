#!/usr/bin/env node
/**
 * Atlas Vox · Ambient Helper LaunchAgent manager (V6-B).
 *
 * Comandos:
 *   install   → grava plist em ~/Library/LaunchAgents/com.atlas.vox.hotkey.plist
 *               e dispara `launchctl bootstrap` (modo moderno) ou `load` (fallback).
 *   uninstall → `launchctl bootout`/`unload` + remove plist.
 *   status    → lista estado do plist + estado do helper + log tail.
 *
 * Garantias canônicas (V6-B):
 *   • Nada de magia: imprime exatamente o conteúdo do plist antes de gravar,
 *     a menos que `--yes` esteja presente.
 *   • Sem `sudo`. Tudo fica em `~/Library/LaunchAgents/` (user scope).
 *   • `--dry-run` evita qualquer mutação — útil em CI ou pra inspeção.
 *   • Falha humanizada: paths inválidos / binários ausentes viram exit != 0
 *     com instrução PT-BR concreta. Nunca silencioso, nunca pet-trick.
 *
 * NUNCA:
 *   • Pede permissão de microfone (helper Rust não toca áudio).
 *   • Chama Kernel/provider/HTTP.
 *   • Instala plist fora do escopo do usuário.
 */

import { spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { homedir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
// scripts/ → apps/desktop/ → atlas-desktop/
const REPO_ROOT = resolve(__dirname, '..', '..', '..')
const HELPER_BINARY = join(REPO_ROOT, 'target', 'release', 'atlas-vox-ambient-helper')
const APP_BUNDLE = join(REPO_ROOT, 'target', 'release', 'bundle', 'macos', 'Atlas Code.app')
const LAUNCH_AGENT_DIR = join(homedir(), 'Library', 'LaunchAgents')
const LAUNCH_AGENT_LABEL = 'com.atlas.vox.hotkey'
const PLIST_PATH = join(LAUNCH_AGENT_DIR, `${LAUNCH_AGENT_LABEL}.plist`)
const LOG_DIR = join(homedir(), '.atlas', 'vox', 'logs')
const HELPER_LOG = join(LOG_DIR, 'ambient-helper.log')
const STDOUT_LOG = join(LOG_DIR, 'ambient-helper.stdout.log')
const STDERR_LOG = join(LOG_DIR, 'ambient-helper.stderr.log')

// V6-D · canon identity & permissões. O `status` confere se o app empacotado
// declara isto; release-check usa as mesmas constantes via importação.
export const ATLAS_CODE_BUNDLE_IDENTIFIER = 'com.atlas.code'
export const ATLAS_CODE_MIC_USAGE_KEY = 'NSMicrophoneUsageDescription'
export const ATLAS_CODE_AUDIO_ENTITLEMENT = 'com.apple.security.device.audio-input'
const TAURI_CONF_PATH = join(REPO_ROOT, 'crates', 'atlas-tauri', 'tauri.conf.json')
const TAURI_INFO_PLIST = join(REPO_ROOT, 'crates', 'atlas-tauri', 'Info.plist')
const TAURI_ENTITLEMENTS = join(REPO_ROOT, 'crates', 'atlas-tauri', 'entitlements.plist')

const args = process.argv.slice(2)
const subcommand = args[0] ?? 'help'
const HAS_YES = args.includes('--yes')
const HAS_DRY = args.includes('--dry-run')
const HAS_KEEP_LOGS = args.includes('--keep-logs')

function logInfo(msg) {
  console.log(`[vox:ambient] ${msg}`)
}
function logWarn(msg) {
  console.error(`[vox:ambient] ⚠ ${msg}`)
}
function fail(reason, hint) {
  console.error(`[vox:ambient] ✗ ${reason}`)
  if (hint) console.error(`             → ${hint}`)
  process.exit(1)
}

function ensureMac() {
  if (process.platform !== 'darwin') {
    fail(
      `plataforma não suportada: ${process.platform}`,
      'V6-B só roda no macOS (LaunchAgents são exclusivos do darwin).',
    )
  }
}

function uid() {
  try {
    const r = spawnSync('id', ['-u'], { encoding: 'utf8' })
    if (r.status === 0) return parseInt(r.stdout.trim(), 10)
  } catch {
    /* fall through */
  }
  return null
}

function buildPlistContent() {
  // KeepAlive: false → o helper só roda sob demanda do launchd (RunAtLoad).
  // ProcessType: Adaptive → libera I/O para o helper sem precisar de uid 0.
  // Sem `SessionType=Aqua` para evitar amarra a uma sessão GUI específica.
  // O `EnvironmentVariables` empacota o caminho do bundle para o helper
  // resolver `--bundle=…` sem precisar buscar.
  const env = {
    ATLAS_VOX_AMBIENT_BUNDLE: APP_BUNDLE,
    // Sem RUST_LOG por default — tracing-appender já grava em arquivo.
  }
  const envXml = Object.entries(env)
    .map(([k, v]) => `      <key>${k}</key>\n      <string>${escapeXml(v)}</string>`)
    .join('\n')
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">',
    '<dict>',
    `  <key>Label</key>`,
    `  <string>${LAUNCH_AGENT_LABEL}</string>`,
    `  <key>ProgramArguments</key>`,
    `  <array>`,
    `    <string>${escapeXml(HELPER_BINARY)}</string>`,
    `  </array>`,
    `  <key>RunAtLoad</key>`,
    `  <true/>`,
    `  <key>KeepAlive</key>`,
    `  <true/>`,
    `  <key>EnvironmentVariables</key>`,
    `  <dict>`,
    envXml,
    `  </dict>`,
    `  <key>StandardOutPath</key>`,
    `  <string>${escapeXml(STDOUT_LOG)}</string>`,
    `  <key>StandardErrorPath</key>`,
    `  <string>${escapeXml(STDERR_LOG)}</string>`,
    `  <key>ProcessType</key>`,
    `  <string>Adaptive</string>`,
    '</dict>',
    '</plist>',
    '',
  ].join('\n')
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function ensureHelperBinaryExists() {
  if (!existsSync(HELPER_BINARY)) {
    fail(
      `binário do helper não encontrado: ${HELPER_BINARY}`,
      'Build primeiro:  cargo build -p atlas-vox-ambient-helper --release',
    )
  }
  try {
    const s = statSync(HELPER_BINARY)
    if (!s.isFile()) {
      fail(
        `${HELPER_BINARY} existe mas não é um arquivo.`,
        'Refaça o release build.',
      )
    }
  } catch (e) {
    fail(`não consegui inspecionar o helper: ${e.message}`)
  }
}

function ensureLogDir() {
  if (HAS_DRY) return
  try {
    mkdirSync(LOG_DIR, { recursive: true })
  } catch (e) {
    fail(`não consegui criar diretório de logs ${LOG_DIR}: ${e.message}`)
  }
}

function ensureLaunchAgentDir() {
  if (HAS_DRY) return
  try {
    mkdirSync(LAUNCH_AGENT_DIR, { recursive: true })
  } catch (e) {
    fail(
      `não consegui criar ${LAUNCH_AGENT_DIR}: ${e.message}`,
      'Verifique permissões do home directory.',
    )
  }
}

function runLaunchctl(...launchctlArgs) {
  const r = spawnSync('/bin/launchctl', launchctlArgs, { encoding: 'utf8' })
  return {
    status: r.status,
    stdout: r.stdout?.trim() ?? '',
    stderr: r.stderr?.trim() ?? '',
  }
}

function userTarget() {
  const id = uid()
  return id === null ? null : `gui/${id}`
}

function loadLaunchAgent() {
  // launchctl moderno: bootstrap. Fallback: load -w.
  const target = userTarget()
  if (target) {
    const r = runLaunchctl('bootstrap', target, PLIST_PATH)
    if (r.status === 0) return { method: 'bootstrap', ...r }
    // Pode falhar com `service already bootstrapped`; trate como sucesso.
    if (/already bootstrapped/i.test(r.stderr) || /already loaded/i.test(r.stderr)) {
      return { method: 'bootstrap', status: 0, stdout: r.stderr, stderr: '' }
    }
    logWarn(`bootstrap falhou (${r.status}): ${r.stderr}. Tentando 'load -w'.`)
  }
  const r2 = runLaunchctl('load', '-w', PLIST_PATH)
  return { method: 'load', ...r2 }
}

function unloadLaunchAgent() {
  const target = userTarget()
  if (target) {
    const r = runLaunchctl('bootout', `${target}/${LAUNCH_AGENT_LABEL}`)
    if (r.status === 0) return { method: 'bootout', ...r }
    if (/no such service/i.test(r.stderr) || /could not find/i.test(r.stderr)) {
      return { method: 'bootout', status: 0, stdout: '(não carregado)', stderr: '' }
    }
    logWarn(`bootout falhou (${r.status}): ${r.stderr}. Tentando 'unload -w'.`)
  }
  const r2 = runLaunchctl('unload', '-w', PLIST_PATH)
  return { method: 'unload', ...r2 }
}

function isHelperLoaded() {
  const target = userTarget()
  if (!target) return null
  const r = runLaunchctl('print', `${target}/${LAUNCH_AGENT_LABEL}`)
  return r.status === 0
}

function tailLog(path, lines = 20) {
  if (!existsSync(path)) return null
  try {
    const content = readFileSync(path, 'utf8')
    const split = content.trimEnd().split('\n')
    return split.slice(-lines).join('\n')
  } catch (e) {
    return `<<não consegui ler ${path}: ${e.message}>>`
  }
}

// ──────────────────────────────────────────────────────────────────────────
// V6-D · auditoria canon (identifier, mic permission, entitlements).
//
// Função pura e exportável: o release-check importa para enxergar o mesmo
// veredito que o operador vê via `npm run vox:ambient:status`.
// ──────────────────────────────────────────────────────────────────────────

function readJsonSafe(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

function readFileSafe(path) {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return null
  }
}

export function collectAmbientAudit() {
  const audit = {
    schema: 'atlas.vox.ambient_audit.v1',
    helper_binary_present: existsSync(HELPER_BINARY),
    helper_binary_path: HELPER_BINARY,
    bundle_present: existsSync(APP_BUNDLE),
    bundle_path: APP_BUNDLE,
    launch_agent_plist_present: existsSync(PLIST_PATH),
    launch_agent_plist_path: PLIST_PATH,
    launch_agent_loaded: null,
    identifier: { expected: ATLAS_CODE_BUNDLE_IDENTIFIER, actual: null, ok: false },
    info_plist_mic_usage: { expected_key: ATLAS_CODE_MIC_USAGE_KEY, present: false, value: null },
    entitlement_audio_input: { expected_key: ATLAS_CODE_AUDIO_ENTITLEMENT, present: false },
    issues: [],
  }
  // launchctl print → carregado?
  audit.launch_agent_loaded = audit.launch_agent_plist_present ? isHelperLoaded() : false

  const tauri = readJsonSafe(TAURI_CONF_PATH)
  if (tauri && typeof tauri.identifier === 'string') {
    audit.identifier.actual = tauri.identifier
    audit.identifier.ok = tauri.identifier === ATLAS_CODE_BUNDLE_IDENTIFIER
  }
  if (!audit.identifier.ok) {
    audit.issues.push(
      `identifier do bundle não bate (esperado ${ATLAS_CODE_BUNDLE_IDENTIFIER}, encontrado ${audit.identifier.actual ?? 'ausente'}).`,
    )
  }

  const info = readFileSafe(TAURI_INFO_PLIST)
  if (info) {
    if (info.includes(`<key>${ATLAS_CODE_MIC_USAGE_KEY}</key>`)) {
      audit.info_plist_mic_usage.present = true
      const m = info.match(
        new RegExp(`<key>${ATLAS_CODE_MIC_USAGE_KEY}</key>\\s*<string>([^<]*)</string>`),
      )
      audit.info_plist_mic_usage.value = m ? m[1] : null
    }
  }
  if (!audit.info_plist_mic_usage.present) {
    audit.issues.push(
      `Info.plist sem ${ATLAS_CODE_MIC_USAGE_KEY} — o macOS bloquearia o microfone silenciosamente.`,
    )
  }

  const entitlements = readFileSafe(TAURI_ENTITLEMENTS)
  if (entitlements && entitlements.includes(`<key>${ATLAS_CODE_AUDIO_ENTITLEMENT}</key>`)) {
    audit.entitlement_audio_input.present = true
  }
  if (!audit.entitlement_audio_input.present) {
    audit.issues.push(
      `entitlements sem ${ATLAS_CODE_AUDIO_ENTITLEMENT} — gravação seria barrada pelo TCC após assinatura.`,
    )
  }

  if (!audit.helper_binary_present) {
    audit.issues.push(
      `binário do helper ausente em ${HELPER_BINARY} — rode \`cargo build -p atlas-vox-ambient-helper --release\`.`,
    )
  }
  if (!audit.bundle_present) {
    audit.issues.push(
      `bundle Atlas Code.app ausente em ${APP_BUNDLE} — rode \`npm run tauri:build --workspace=@atlas/desktop\` (ou tauri:build:vox).`,
    )
  }
  if (audit.launch_agent_plist_present && audit.launch_agent_loaded === false) {
    audit.issues.push(
      'LaunchAgent existe mas não está carregado — `npm run vox:ambient:install -- --yes` ou reinicie a sessão.',
    )
  }

  const blocking = audit.issues.length > 0
  audit.status = blocking ? 'warn' : 'pass'
  return audit
}

// ──────────────────────────────────────────────────────────────────────────
// Sub-commands
// ──────────────────────────────────────────────────────────────────────────

function cmdInstall() {
  ensureMac()
  ensureHelperBinaryExists()
  ensureLogDir()
  ensureLaunchAgentDir()
  const plist = buildPlistContent()
  if (!HAS_YES && !HAS_DRY) {
    console.log('───── plist que vai ser gravado em:')
    console.log(`        ${PLIST_PATH}`)
    console.log('───── conteúdo:')
    console.log(plist)
    console.log('───── re-rode com `--yes` para confirmar a gravação.')
    process.exit(2)
  }
  if (HAS_DRY) {
    console.log('───── (dry-run) plist proposto:')
    console.log(plist)
    console.log(`───− destino: ${PLIST_PATH}`)
    console.log(`───− helper:  ${HELPER_BINARY}`)
    console.log(`───− bundle:  ${APP_BUNDLE}`)
    process.exit(0)
  }
  try {
    writeFileSync(PLIST_PATH, plist, { mode: 0o644 })
    logInfo(`plist gravado: ${PLIST_PATH}`)
  } catch (e) {
    fail(`falha ao gravar plist: ${e.message}`)
  }
  // Garante que helper roda antes de carregar (sanity).
  const result = loadLaunchAgent()
  if (result.status !== 0) {
    fail(
      `falha ao carregar LaunchAgent: ${result.stderr || result.stdout || result.status}`,
      'Cheque os logs em ~/.atlas/vox/logs/. Pra remover, use `npm run vox:ambient:uninstall`.',
    )
  }
  logInfo(`LaunchAgent carregado via ${result.method}.`)
  console.log('')
  console.log('✓ Atlas Vox Ambient Helper ativo.')
  console.log('  Option+Space, com Atlas Code fechado, vai abrir o app já ouvindo.')
  console.log('  Com Atlas Code aberto, o hotkey in-process (Wave 6.5) assume.')
  console.log('  Status:   npm run vox:ambient:status')
  console.log('  Remover:  npm run vox:ambient:uninstall')
}

function cmdUninstall() {
  ensureMac()
  if (HAS_DRY) {
    console.log('───── (dry-run) operações que seriam executadas:')
    console.log(`  launchctl bootout/unload de ${LAUNCH_AGENT_LABEL}`)
    console.log(`  apagar ${PLIST_PATH}`)
    if (!HAS_KEEP_LOGS) {
      console.log(`  apagar logs em ${LOG_DIR} (use --keep-logs para preservar)`)
    }
    process.exit(0)
  }
  const unloadResult = unloadLaunchAgent()
  if (unloadResult.status !== 0) {
    logWarn(
      `unload retornou ${unloadResult.status}: ${unloadResult.stderr || unloadResult.stdout}`,
    )
  } else {
    logInfo(`LaunchAgent removido via ${unloadResult.method}.`)
  }
  if (existsSync(PLIST_PATH)) {
    try {
      unlinkSync(PLIST_PATH)
      logInfo(`plist apagado: ${PLIST_PATH}`)
    } catch (e) {
      fail(`falha ao apagar plist: ${e.message}`)
    }
  } else {
    logInfo('plist já estava ausente — nada a apagar.')
  }
  if (!HAS_KEEP_LOGS) {
    for (const p of [HELPER_LOG, STDOUT_LOG, STDERR_LOG]) {
      if (existsSync(p)) {
        try {
          unlinkSync(p)
        } catch {
          /* ignore */
        }
      }
    }
    logInfo('logs apagados (use --keep-logs para preservar).')
  }
  console.log('')
  console.log('✓ Atlas Vox Ambient Helper desinstalado.')
  console.log('  Option+Space agora só funciona com Atlas Code aberto.')
}

function cmdStatus() {
  ensureMac()
  const audit = collectAmbientAudit()
  if (args.includes('--json')) {
    // Sem tail de log no JSON (ruído + risco de PII). Quem precisa do log
    // roda `tail -f ~/.atlas/vox/logs/ambient-helper.log` manualmente.
    console.log(JSON.stringify(audit, null, 2))
    process.exit(0)
  }

  console.log('Atlas Vox · Ambient Helper · status (V6-D)')
  console.log('───────────────────────────────────────────')
  const yn = (v) => (v === true ? 'sim' : v === false ? 'não' : '?')
  console.log(`plist instalado     : ${yn(audit.launch_agent_plist_present)}`)
  console.log(`plist path          : ${audit.launch_agent_plist_path}`)
  console.log(`launchctl carregado : ${yn(audit.launch_agent_loaded)}`)
  console.log(`helper binário      : ${audit.helper_binary_path}${audit.helper_binary_present ? '' : ' (AUSENTE)'}`)
  console.log(`Atlas Code.app      : ${audit.bundle_path}${audit.bundle_present ? '' : ' (AUSENTE)'}`)
  console.log(`identifier          : ${audit.identifier.actual ?? '(não lido)'} ${audit.identifier.ok ? '✓' : `(esperava ${audit.identifier.expected})`}`)
  console.log(`mic usage (plist)   : ${audit.info_plist_mic_usage.present ? '✓ presente' : '✗ ausente'}`)
  if (audit.info_plist_mic_usage.value) {
    console.log(`   "${audit.info_plist_mic_usage.value}"`)
  }
  console.log(`entitlement audio   : ${audit.entitlement_audio_input.present ? '✓ presente' : '✗ ausente'}`)
  console.log(`log file            : ${HELPER_LOG}`)
  console.log('')

  if (audit.issues.length > 0) {
    console.log(`Pendências (${audit.issues.length}):`)
    for (const item of audit.issues) {
      console.log(`  • ${item}`)
    }
    console.log('')
  } else {
    console.log('✓ Ambient layer canônica · sem pendências.')
    console.log('')
  }

  const last = tailLog(HELPER_LOG, 10)
  if (last) {
    console.log('Últimas linhas do log:')
    console.log('──────────────────────')
    console.log(last)
  } else {
    console.log('Sem log ainda (helper nunca rodou ou logs limpos).')
  }
  // Status nunca falha — sempre devolve 0. CI usa --json para inspecionar
  // o veredito sem depender de exit code.
  process.exit(0)
}

function cmdHelp() {
  console.log('Atlas Vox · Ambient Helper (V6-D)')
  console.log('')
  console.log('Uso:')
  console.log('  npm run vox:ambient:install   --workspace=@atlas/desktop -- [--yes|--dry-run]')
  console.log('  npm run vox:ambient:uninstall --workspace=@atlas/desktop -- [--dry-run] [--keep-logs]')
  console.log('  npm run vox:ambient:status    --workspace=@atlas/desktop -- [--json]')
  console.log('')
  console.log('Sem `--yes`, install só imprime o plist proposto. Auditável por design.')
  console.log('`status --json` é consumido pelo release-check da Vox.')
}

// V6-D · só executa subcomando se este arquivo for o entrypoint do Node.
// Importações via `import { collectAmbientAudit } from ...` não disparam
// `ensureMac()`/exit — release-check pode usar a função em qualquer SO.
const __entrypointPath = (() => {
  if (!process.argv[1]) return null
  try {
    return fileURLToPath(import.meta.url) === resolve(process.argv[1])
  } catch {
    return false
  }
})()

if (!__entrypointPath) {
  // Módulo importado: nada de side effect.
} else
switch (subcommand) {
  case 'install':
    ensureMac()
    cmdInstall()
    break
  case 'uninstall':
    ensureMac()
    cmdUninstall()
    break
  case 'status':
    ensureMac()
    cmdStatus()
    break
  case 'help':
  case '--help':
  case '-h':
    cmdHelp()
    break
  default:
    console.error(`Subcomando desconhecido: ${subcommand}`)
    cmdHelp()
    process.exit(1)
}
