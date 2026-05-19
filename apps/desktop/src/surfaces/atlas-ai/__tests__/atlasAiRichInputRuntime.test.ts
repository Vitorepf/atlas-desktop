import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import * as runtime from '../../../lib/rich-input/index.ts'
import {
  ATTACHMENT_LIMITS,
  chunkedUploadAsset,
  classifyUrl,
  extractUrls,
  fetchUrlMetadata,
  estimateRichInputTokens,
  processImage,
  processPdf,
  summarizeRichInputDrafts,
  useAtlasRichInputAttachments,
} from '../../../lib/rich-input/index.ts'

/**
 * Atlas Unified Rich Input Runtime · anti-regression suite.
 *
 * Locks down the single-capability contract so a future PR cannot:
 *   - introduce a parallel `attachments/` runtime inside another surface;
 *   - silently drift the public API of the rich-input barrel;
 *   - desync client-side limits from the backend caps (8 imgs, 4 PDFs, 20MB).
 *
 * Together with `atlasAiHyperflowContract.test.ts` this is what proves the
 * Atlas Desktop AI surface stays Hyperflow-first AND rich-input-unified.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DESKTOP_SRC = path.resolve(HERE, '../../..') // .../apps/desktop/src
test('canonical barrel exposes the agreed Atlas Unified Rich Input public API', () => {
  // Functions / hooks consumers depend on.
  assert.equal(typeof useAtlasRichInputAttachments, 'function')
  assert.equal(typeof chunkedUploadAsset, 'function')
  assert.equal(typeof processImage, 'function')
  assert.equal(typeof processPdf, 'function')
  assert.equal(typeof classifyUrl, 'function')
  assert.equal(typeof extractUrls, 'function')
  assert.equal(typeof fetchUrlMetadata, 'function')
  assert.equal(typeof estimateRichInputTokens, 'function')
  assert.equal(typeof summarizeRichInputDrafts, 'function')
})

test('barrel re-exports the canonical limits and mime sets', () => {
  for (const name of [
    'ATTACHMENT_LIMITS',
    'CODE_LANG_BY_EXT',
    'SUPPORTED_IMAGE_MIME',
    'SUPPORTED_PDF_MIME',
    'SUPPORTED_TEXT_MIME_PREFIXES',
    'detectLanguageFromFilename',
    'estimateRichInputTokens',
    'summarizeRichInputDrafts',
  ]) {
    assert.ok(name in runtime, `Atlas Rich Input barrel must expose ${name}`)
  }
})

test('token estimate is owned by the canonical rich-input runtime', () => {
  assert.equal(estimateRichInputTokens('', []), 0)
  assert.equal(estimateRichInputTokens('abcd', []), 1)
  assert.equal(summarizeRichInputDrafts([]).total, 0)

  // Canonical: AtlasUnifiedComposer is the shared composer (Atlas AI / Code /
  // Forge wrappers delegate to it). The token estimator lives there.
  const unifiedComposer = readFileSync(
    path.join(DESKTOP_SRC, 'components', 'composer', 'AtlasUnifiedComposer.tsx'),
    'utf-8',
  )
  const forgeControls = readFileSync(
    path.join(DESKTOP_SRC, 'surfaces', 'code', 'obra', 'RichInputControls.tsx'),
    'utf-8',
  )
  assert.match(unifiedComposer, /estimateRichInputTokens/, 'AtlasUnifiedComposer must use the shared token estimator')
  assert.match(forgeControls, /estimateRichInputTokens/, 'Forge controls must use the shared token estimator')
})

test('ATTACHMENT_LIMITS stay aligned with backend AiInteractionController caps', () => {
  // Backend caps live in StoreAiInteractionRequest rules:
  //   images: max 8, 20MB
  //   documents: max 4, 20MB
  // If the backend changes these, this test must change AT THE SAME TIME.
  assert.equal(ATTACHMENT_LIMITS.maxImages, 8, 'maxImages must match StoreAiInteractionRequest images.max:8')
  assert.equal(ATTACHMENT_LIMITS.maxPdfs, 4, 'maxPdfs must match StoreAiInteractionRequest documents.max:4')
  assert.equal(
    ATTACHMENT_LIMITS.maxImageBytes,
    20 * 1024 * 1024,
    'maxImageBytes must match images.*.max:20480 KB',
  )
  assert.equal(
    ATTACHMENT_LIMITS.maxPdfBytes,
    20 * 1024 * 1024,
    'maxPdfBytes must match documents.*.max:20480 KB',
  )
})

test('Atlas AI composer consumes the rich-input runtime by stable import path', () => {
  const composer = readFileSync(
    path.join(DESKTOP_SRC, 'surfaces', 'atlas-ai', 'components', 'AtlasAiComposer.tsx'),
    'utf-8',
  )
  assert.match(
    composer,
    /from '\.\.\/\.\.\/\.\.\/lib\/rich-input'/,
    'AtlasAiComposer must import the canonical shared rich-input runtime',
  )
})

test('no rival rich-input runtime exists inside another Desktop surface', () => {
  const surfacesRoot = path.join(DESKTOP_SRC, 'surfaces')
  const surfaces = readdirSync(surfacesRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)

  const offenders: string[] = []
  for (const surface of surfaces) {
    if (surface === 'atlas-ai') continue // canonical home
    const surfaceDir = path.join(surfacesRoot, surface)
    const innerAttachments = path.join(surfaceDir, 'attachments')
    try {
      const stat = statSync(innerAttachments)
      if (stat.isDirectory()) {
        offenders.push(`${surface}/attachments`)
      }
    } catch {
      // missing folder == compliant
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `Found surfaces with their own attachments/ runtime (must consume atlas-ai/attachments): ${offenders.join(', ')}`,
  )
})

test('any surface that uses rich-input processors must import from lib/rich-input', () => {
  // Walk every .ts/.tsx outside atlas-ai surface and the test files. If a
  // file declares its own image/pdf processor or chunkedUpload helper, this
  // test flips red — the rich input is duplicated.
  const offenders: string[] = []
  const guardKeys = [
    'processImage(',
    'processPdf(',
    'chunkedUploadAsset(',
    'classifyUrl(',
    'fetchUrlMetadata(',
  ]
  walkSurfaceFiles((file) => {
    if (file.includes('/surfaces/atlas-ai/')) return
    if (file.endsWith('.test.ts') || file.endsWith('.test.tsx')) return
    const content = readFileSync(file, 'utf-8')
    for (const key of guardKeys) {
      if (content.includes(key)) {
        // legit usage MUST import from lib/rich-input.
        const importsCanonical =
          content.includes("from '../lib/rich-input") ||
          content.includes("from '../../lib/rich-input") ||
          content.includes("from '../../../lib/rich-input") ||
          content.includes("from '../../../../lib/rich-input")
        if (!importsCanonical) {
          offenders.push(`${file}: uses ${key} without importing from lib/rich-input`)
        }
      }
    }
  })
  assert.deepEqual(
    offenders,
    [],
    `Found rich-input usage outside lib/rich-input not importing from the canonical barrel: ${offenders.join('\n')}`,
  )
})

test('Atlas Code bridge does not silently drop rich input on the Tauri path', () => {
  const bridge = readFileSync(path.join(DESKTOP_SRC, 'lib', 'bridge.ts'), 'utf-8')
  assert.match(
    bridge,
    /requireHttpRichInputBridge\('createObra', richInput\)/,
    'createObra must guard rich input before taking the text-only Tauri command path',
  )
  assert.match(
    bridge,
    /requireHttpRichInputBridge\('sendIntent', richInput\)/,
    'sendIntent must guard rich input before taking the text-only Tauri command path',
  )
  assert.match(
    bridge,
    /MODE === 'http' \|\| \(MODE === 'tauri' && richInput\)/,
    'rich input must use the HTTP bridge even when the shell is running in Tauri mode',
  )
  assert.doesNotMatch(
    bridge,
    /Attachments survive only on the\s+HTTP path|deliberately do NOT block creation/,
    'bridge must not document or preserve silent attachment loss',
  )
})

test('UploadOutput shape stays aligned with backend POST /ai/interactions field names', () => {
  // Build a fake hook return to lock the keys the backend expects. This is
  // a compile-time + runtime check: TypeScript guarantees the shape, and
  // the runtime assertion locks the keys so a backend rename surfaces here.
  const sample: import('../../../lib/rich-input/index.ts').UploadOutput = {
    uploaded_image_ids: ['img-1'],
    uploaded_document_ids: ['doc-1'],
    url_attachments: [
      {
        url: 'https://example.com',
        kind: 'generic',
        title: null,
        author: null,
        duration_sec: null,
        thumbnail_url: null,
        ref_id: null,
      },
    ],
    text_blocks: [
      {
        file_name: 'note.md',
        mime_type: 'text/markdown',
        language: 'markdown',
        content: '# hello',
      },
    ],
  }
  for (const key of ['uploaded_image_ids', 'uploaded_document_ids', 'url_attachments', 'text_blocks']) {
    assert.ok(key in sample, `UploadOutput must keep key ${key}`)
  }
  assert.ok(Array.isArray(sample.uploaded_image_ids))
  assert.ok(Array.isArray(sample.uploaded_document_ids))
})

test('url classifier preserves canon kinds expected by Atlas AI + Forge consumers', () => {
  // YouTube refIds are exactly 11 chars per the canon regex.
  assert.equal(classifyUrl('https://youtu.be/dQw4w9WgXcQ').kind, 'youtube')
  assert.equal(classifyUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ').kind, 'youtube')
  assert.equal(classifyUrl('https://vimeo.com/123456789').kind, 'vimeo')
  assert.equal(classifyUrl('https://github.com/atlas/atlas').kind, 'github')
  assert.equal(classifyUrl('https://example.com/x').kind, 'generic')
})

function walkSurfaceFiles(visit: (filePath: string) => void): void {
  const stack: string[] = [path.join(DESKTOP_SRC, 'surfaces'), path.join(DESKTOP_SRC, 'components')]
  while (stack.length) {
    const dir = stack.pop()
    if (!dir) break
    let entries: import('node:fs').Dirent[]
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === '__tests__' || entry.name === 'node_modules') continue
        stack.push(full)
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        visit(full)
      }
    }
  }
}
