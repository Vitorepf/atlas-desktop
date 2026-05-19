#!/usr/bin/env node
/**
 * Atlas Vox · Ambient Launch (V6-A).
 *
 * Abre o app assinado `Atlas Code.app` já pedindo que o Vox abra ouvindo.
 *
 *   - Em produção (Mac): usa `target/release/bundle/macos/Atlas Code.app`.
 *     Spotlight, LaunchAgent ou `open -a` levam o mesmo binário, mas esta
 *     versão CLI passa explicitamente `--vox-start-listening` para o caso
 *     em que o usuário tem aliases ou helpers locais.
 *   - Em dev (sem .app construído): mostra mensagem humana e instrui rodar
 *     `npm run tauri:build:vox`. Nunca chuta caminho aleatório.
 *
 * Segurança:
 *   - Não instala LaunchAgent, plist, helper invisível ou daemon. Esta
 *     onda só prova o fluxo manual. A próxima onda V6-B trata helper.
 *   - O argumento `--vox-start-listening` é o único sinal — o app valida
 *     em Rust via `vox_ambient_launch::detect_ambient_launch_request`.
 *   - Falha em silêncio NUNCA: erros viram exit code != 0 + mensagem PT-BR.
 */

import { spawn } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
// scripts/ → apps/desktop/ → repo root = ../../../../
const REPO_ROOT = resolve(__dirname, '..', '..', '..')
// Tauri 2 bundles ficam em <workspace>/target/release/bundle/macos/.
// `--workspaces=true` no Cargo aponta para `atlas-desktop/target`.
const APP_BUNDLE = join(
  REPO_ROOT,
  'target',
  'release',
  'bundle',
  'macos',
  'Atlas Code.app',
)

function humanFail(reason, hint) {
  console.error(`[vox:ambient-launch] ✗ ${reason}`)
  if (hint) console.error(`                   → ${hint}`)
  process.exit(1)
}

function ensureMac() {
  if (process.platform !== 'darwin') {
    humanFail(
      `plataforma não suportada: ${process.platform}`,
      'V6-A só roda no macOS por enquanto. Linux/Windows entram em onda futura.',
    )
  }
}

function ensureBundleExists() {
  if (!existsSync(APP_BUNDLE)) {
    humanFail(
      `não encontrei "${APP_BUNDLE}".`,
      'Construa o app primeiro:  npm run tauri:build:vox  (precisa rust + cmake)',
    )
  }
  try {
    const s = statSync(APP_BUNDLE)
    if (!s.isDirectory()) {
      humanFail(
        `"${APP_BUNDLE}" existe mas não é o bundle .app esperado.`,
        'Rode `npm run tauri:build:vox` para reconstruir.',
      )
    }
  } catch (e) {
    humanFail(
      `não consegui inspecionar o bundle (${e.message}).`,
      'Confirme as permissões da pasta `target/release/bundle/macos`.',
    )
  }
}

function readForward() {
  // Pass-through extra args: se o operador rodar
  //   node voxAmbientLaunch.mjs --vox-start-listening=false
  // o flag chega ao app e desliga a gravação ambient. Útil para validar
  // que o app sobe normal sem ambient.
  const passthrough = process.argv
    .slice(2)
    .filter((a) => a.length > 0 && a !== '--dry-run')
  // Sem args explícitos, default = ligar.
  return passthrough.length > 0 ? passthrough : ['--vox-start-listening']
}

function dryRunRequested() {
  return process.argv.includes('--dry-run')
    || process.env.ATLAS_VOX_AMBIENT_DRY_RUN === '1'
}

function launch() {
  const args = readForward()
  if (dryRunRequested()) {
    console.log('[vox:ambient-launch] (dry-run) NÃO vou abrir o Atlas Code.')
    console.log(`[vox:ambient-launch] bundle: ${APP_BUNDLE}`)
    console.log(`[vox:ambient-launch] flags : ${args.join(' ')}`)
    process.exit(0)
  }
  // `open -n` força nova instância (não traz uma janela já existente).
  // `--args` separa o que vai para o app vs. para o /usr/bin/open.
  // `-W` esperaria o app fechar; NÃO usamos — queremos retornar imediatamente.
  const child = spawn(
    'open',
    ['-n', '-a', APP_BUNDLE, '--args', ...args],
    { stdio: 'inherit' },
  )
  child.on('error', (err) => {
    humanFail(
      `falha ao invocar /usr/bin/open: ${err.message}`,
      'Confirme se /usr/bin/open existe e está executável.',
    )
  })
  child.on('exit', (code, signal) => {
    if (code === 0) {
      console.log(
        '[vox:ambient-launch] ✓ pedi para o Atlas Code abrir já ouvindo. '
        + 'Aguarde o overlay aparecer. Se o microfone estiver bloqueado, '
        + 'o overlay mostra mensagem em PT-BR.',
      )
      console.log(`[vox:ambient-launch] bundle: ${APP_BUNDLE}`)
      console.log(`[vox:ambient-launch] flags : ${args.join(' ')}`)
      process.exit(0)
    }
    if (signal) {
      humanFail(`open finalizou via sinal ${signal}.`)
    } else {
      humanFail(`open retornou exit=${code ?? '?'}.`)
    }
  })
}

ensureMac()
ensureBundleExists()
launch()
