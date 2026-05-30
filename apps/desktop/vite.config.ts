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
      // Top-level shared canon (lives outside atlas-desktop so atlas-app
      // can depend on the same source). See packages/atlas-rich-input-canon.
      '@atlas/rich-input-canon': fileURLToPath(
        new URL('../../../packages/atlas-rich-input-canon/src/index.ts', import.meta.url),
      ),
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
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'react-vendor',
              test: /node_modules[\\/](react|react-dom)[\\/]/,
              priority: 30,
              minSize: 1,
            },
            {
              name: 'tauri-vendor',
              test: /node_modules[\\/]@tauri-apps[\\/]/,
              priority: 25,
              minSize: 1,
            },
          {
            name: 'atlas-domain-vendor',
            test: /packages[\\/](atlas-domain|atlas-ui|atlas-rich-input-canon)[\\/]/,
            priority: 20,
            minSize: 1,
          },
          {
            name: 'atlas-ai-awis',
            test: /apps[\\/]desktop[\\/]src[\\/]surfaces[\\/]atlas-ai[\\/](awisWorkspaceMemory|awisIntelligence|runtimeReadinessView|threadExport)\.ts$/,
            priority: 18,
            minSize: 1,
          },
        ],
      },
    },
    },
  },
}))
