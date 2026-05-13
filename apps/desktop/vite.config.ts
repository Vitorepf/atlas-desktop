import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// Vite config tuned for the Tauri shell.
// `npm run dev`        → browser fallback on 5173 (works without Rust toolchain).
// `npm run tauri:dev`  → Tauri spawns this same dev server and points the WKWebView at it.
export default defineConfig(() => ({
  plugins: [react()],

  resolve: {
    alias: {
      '@atlas/domain': fileURLToPath(new URL('../../packages/atlas-domain/src/index.ts', import.meta.url)),
      '@atlas/ui': fileURLToPath(new URL('../../packages/atlas-ui/src/index.ts', import.meta.url)),
    },
  },

  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: process.env.TAURI_DEV_HOST ?? '127.0.0.1',
    hmr: process.env.TAURI_DEV_HOST
      ? { protocol: 'ws', host: process.env.TAURI_DEV_HOST, port: 1421 }
      : undefined,
    watch: { ignored: ['**/src-tauri/**', '**/crates/**', '**/target/**'] },
  },

  envPrefix: ['VITE_', 'TAURI_ENV_*'],

  build: {
    target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari14',
    minify: (process.env.TAURI_ENV_DEBUG ? false : 'oxc') as 'oxc' | false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
}))
