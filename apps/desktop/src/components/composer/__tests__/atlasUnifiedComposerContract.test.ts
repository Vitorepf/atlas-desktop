import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(new URL('../../../../', import.meta.url).pathname)

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), 'utf8')
}

const shared = read('src/components/composer/AtlasUnifiedComposer.tsx')
const atlasAiAdapter = read('src/surfaces/atlas-ai/components/AtlasAiComposer.tsx')
const codeAdapter = read('src/surfaces/code/stage/ComposerPanel.tsx')

assert.match(
  atlasAiAdapter,
  /AtlasUnifiedComposer/,
  'Atlas AI composer must render the canonical shared composer',
)

assert.match(
  codeAdapter,
  /AtlasUnifiedComposer/,
  'Code/Obra composer must render the canonical shared composer',
)

for (const [label, source] of [
  ['Atlas AI adapter', atlasAiAdapter],
  ['Code adapter', codeAdapter],
] as const) {
  assert.doesNotMatch(
    source,
    /className=.*atlas-ai-composer/,
    `${label} must not own composer chrome/classes directly`,
  )
  assert.doesNotMatch(
    source,
    /atlas-ai-send-btn|atlas-ai-textarea-v2|atlas-ai-composer-bar/,
    `${label} must not duplicate canonical composer internals`,
  )
}

assert.match(shared, /AtlasAiComposerMenu/, 'shared composer must own mode/provider menu rendering')
assert.match(shared, /PROVIDER_OPTIONS/, 'shared composer must expose the same provider choices everywhere')
assert.match(shared, /MODE_OPTIONS/, 'shared composer must expose the same mode choices everywhere')
assert.match(shared, /allowedModes/, 'shared composer must support surface-scoped mode catalogs')
assert.match(shared, /modeOptionOverrides/, 'shared composer must support surface-specific labels without forking UI')
assert.match(shared, /slashCommands/, 'shared composer must scope slash commands to the active surface')
assert.match(shared, /modeScopeBlocked/, 'shared composer must block out-of-scope mode payloads')
assert.match(shared, /taskScopeBlocked/, 'shared composer must block out-of-scope programming task payloads')
assert.match(shared, /uploadAllCanonical/, 'shared composer must own canonical rich-input upload')
assert.match(shared, /operator|provider|task|mode/i, 'shared composer must emit operator hints')
assert.doesNotMatch(shared, /Nova thread/, 'shared composer must not expose the removed + nova thread action')

assert.match(codeAdapter, /OBRA_ALLOWED_MODES/, 'Code/Obra must declare its own allowed mode scope')
assert.match(codeAdapter, /Auto \(Obra\/Forge\)/, 'Code/Obra auto mode must be labeled for its surface')
assert.doesNotMatch(
  codeAdapter,
  /finance|marketing|personal_development|cyber|automation/,
  'Code/Obra adapter must not opt into unrelated Atlas AI domains',
)

console.log('atlasUnifiedComposerContract ok')
