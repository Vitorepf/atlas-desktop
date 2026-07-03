/**
 * LAYOUT GUARD — static viewport units are FORBIDDEN in the desktop renderer.
 *
 * Root cause frozen here (03/07/2026): no WKWebView do Tauri, `100vh`/`100vw`
 * congelam após resize/troca de display — o `.atlas-shell` ficava mais curto
 * que a janela e o canvas branco do WebView aparecia como uma faixa "quebrada"
 * no rodapé (screenshot do operador). O shell usa a cadeia `100%`
 * (html/body/#root); overlays/modais usam `100dvh`/`100dvw` (dinâmicos,
 * re-calculados pelo WebKit). Qualquer `100vh`/`100vw` novo reintroduz a
 * quebra — este guard falha o build antes de ela chegar na tela.
 *
 * Run: npx tsx src/shell/__tests__/layoutViewportUnits.test.ts
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import assert from 'node:assert'

const SRC = join(import.meta.dirname, '..', '..')
const STATIC_VIEWPORT = /\b100vh\b|\b100vw\b/

const offenders: string[] = []

function walk(dir: string): void {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      if (entry === 'node_modules' || entry === '__tests__') continue
      walk(path)
      continue
    }
    if (!/\.(css|tsx|ts)$/.test(entry)) continue
    const lines = readFileSync(path, 'utf8').split('\n')
    lines.forEach((line, i) => {
      if (STATIC_VIEWPORT.test(line)) {
        offenders.push(`${path.replace(SRC + '/', '')}:${i + 1}: ${line.trim()}`)
      }
    })
  }
}

walk(SRC)

assert.deepStrictEqual(
  offenders,
  [],
  'Static viewport units found (use the 100% chain for the shell, 100dvh/100dvw for overlays):\n' +
    offenders.join('\n'),
)

console.log('layout guard OK — zero static viewport units in desktop src')
