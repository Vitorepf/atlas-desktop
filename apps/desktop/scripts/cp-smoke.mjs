import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = '/Users/vitorepf/develop/Atlas/atlas-desktop/apps/desktop'

// Pretend we have an Atlas server (no actual request fires in SSR)
process.env.VITE_ATLAS_SERVER_URL ||= 'http://127.0.0.1:65535'
globalThis.window ??= { addEventListener() {}, removeEventListener() {}, setTimeout, clearTimeout, setInterval, clearInterval }
Object.defineProperty(globalThis, 'navigator', { value: { platform: 'MacIntel' }, configurable: true })

const vite = await createServer({
  root: ROOT,
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
})

let success = false
try {
  const mod = await vite.ssrLoadModule('/src/surfaces/control-plane/ControlPlaneSurface.tsx')
  const { ControlPlaneSurface } = mod
  if (typeof ControlPlaneSurface !== 'function') throw new Error('ControlPlaneSurface not exported as function')
  const html = renderToStaticMarkup(createElement(ControlPlaneSurface))
  if (!html.includes('cp-surface')) throw new Error('rendered HTML missing cp-surface class')
  // Loading state should appear (no useEffect runs in SSR)
  if (!html.includes('Reading control plane')) {
    console.error('Rendered HTML:', html.slice(0, 800))
    throw new Error('expected loading state in initial SSR render')
  }
  console.log('OK · control-plane SSR mounts loading state · html length=', html.length)
  success = true
} catch (e) {
  console.error('FAIL ·', e.message)
} finally {
  await vite.close()
}
process.exit(success ? 0 : 1)
