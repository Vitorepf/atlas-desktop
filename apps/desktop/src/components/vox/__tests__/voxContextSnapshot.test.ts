/// <reference types="node" />
import assert from 'node:assert/strict'
import {
  buildVoxContextSnapshot,
  isVoxContextSnapshotEmpty,
  truncateContextText,
  VOX_CONTEXT_SNAPSHOT_SCHEMA,
  VOX_CONTEXT_SURFACE,
  VOX_CONTEXT_TEXT_LIMIT,
} from '../voxContextSnapshot'

/**
 * Vox V4 · Context Snapshot — pure-logic tests.
 *
 * Cobrem:
 *   - schema/surface canon
 *   - normalização (trim + null em vazios + active_view fallback)
 *   - truncamento de textos longos (selection / terminal excerpt)
 *   - privacy invariants (raw_audio, full_screen, clipboard sempre `false`)
 *   - isVoxContextSnapshotEmpty
 *
 * Roda com: `npx tsx src/components/vox/__tests__/voxContextSnapshot.test.ts`
 */
const cases: Array<{ name: string; run: () => void }> = []
function test(name: string, run: () => void): void {
  cases.push({ name, run })
}

test('schema/surface canon ficam pinned', () => {
  const snap = buildVoxContextSnapshot({})
  assert.equal(snap.schema, VOX_CONTEXT_SNAPSHOT_SCHEMA)
  assert.equal(snap.schema, 'atlas.vox.context_snapshot.v1')
  assert.equal(snap.surface, VOX_CONTEXT_SURFACE)
  assert.equal(snap.surface, 'atlas_desktop')
})

test('input vazio devolve unknown/null honesto', () => {
  const snap = buildVoxContextSnapshot()
  assert.equal(snap.active_view.kind, 'unknown')
  assert.equal(snap.active_view.label, null)
  assert.equal(snap.workspace.root, null)
  assert.equal(snap.workspace.name, null)
  assert.equal(snap.selection.kind, 'none')
  assert.equal(snap.selection.text, null)
  assert.equal(snap.selection.truncated, false)
  assert.equal(snap.thread.id, null)
  assert.equal(snap.thread.title, null)
  assert.equal(snap.obra.id, null)
  assert.equal(snap.obra.title, null)
  assert.equal(snap.terminal.cwd, null)
  assert.equal(snap.terminal.last_output_excerpt, null)
  assert.equal(snap.terminal.available, false)
  assert.ok(isVoxContextSnapshotEmpty(snap))
})

test('privacy flags ficam sempre false (raw_audio / screen / clipboard)', () => {
  // Tenta forçar via inputs — não deve abrir caminho. As flags são pinned.
  const snap = buildVoxContextSnapshot({
    selectionText: 'oi',
    workspace: { root: '/x', name: 'x' },
    activeView: { kind: 'atlas_ai', label: 'A' },
    terminal: { cwd: '/c', lastOutputExcerpt: 'log', available: true },
  })
  assert.equal(snap.privacy.raw_audio_included, false)
  assert.equal(snap.privacy.full_screen_capture, false)
  assert.equal(snap.privacy.clipboard_read, false)
})

test('workspace + active_view atlas_ai resolvem labels normalizados', () => {
  const snap = buildVoxContextSnapshot({
    workspace: { root: '  /Users/vitor/develop/Atlas  ', name: '  Atlas  ' },
    activeView: { kind: 'atlas_ai', label: '  Atlas AI · thread X  ' },
  })
  assert.equal(snap.workspace.root, '/Users/vitor/develop/Atlas')
  assert.equal(snap.workspace.name, 'Atlas')
  assert.equal(snap.active_view.kind, 'atlas_ai')
  assert.equal(snap.active_view.label, 'Atlas AI · thread X')
  assert.equal(isVoxContextSnapshotEmpty(snap), false)
})

test('active_view kind desconhecido cai pra unknown', () => {
  const snap = buildVoxContextSnapshot({
    // @ts-expect-error · força input fora do union para garantir o fallback.
    activeView: { kind: 'cartografia', label: 'X' },
  })
  assert.equal(snap.active_view.kind, 'unknown')
  assert.equal(snap.active_view.label, 'X')
})

test('seleção curta vira selection.kind="text" sem truncar', () => {
  const snap = buildVoxContextSnapshot({ selectionText: 'esse trecho aqui' })
  assert.equal(snap.selection.kind, 'text')
  assert.equal(snap.selection.text, 'esse trecho aqui')
  assert.equal(snap.selection.truncated, false)
})

test('seleção vazia / só whitespace vira selection.kind="none"', () => {
  const a = buildVoxContextSnapshot({ selectionText: '' })
  const b = buildVoxContextSnapshot({ selectionText: '   \n\t  ' })
  const c = buildVoxContextSnapshot({ selectionText: null })
  for (const snap of [a, b, c]) {
    assert.equal(snap.selection.kind, 'none')
    assert.equal(snap.selection.text, null)
    assert.equal(snap.selection.truncated, false)
  }
})

test('seleção acima do limite é truncada com marker e flag', () => {
  const big = 'A'.repeat(2_400)
  const snap = buildVoxContextSnapshot({ selectionText: big, textLimit: 200 })
  assert.equal(snap.selection.kind, 'text')
  assert.equal(snap.selection.truncated, true)
  assert.ok(snap.selection.text!.includes('omitidos'))
  // truncated text deve ser menor do que o original (com folga pro marker).
  assert.ok(snap.selection.text!.length < big.length)
  assert.ok(snap.selection.text!.length <= 200 + 64)
  // Preserva o começo e o fim (helpful para o Kernel reconstruir contexto).
  assert.ok(snap.selection.text!.startsWith('A'))
  assert.ok(snap.selection.text!.endsWith('A'))
})

test('limite default é o canon VOX_CONTEXT_TEXT_LIMIT', () => {
  const text = 'B'.repeat(VOX_CONTEXT_TEXT_LIMIT)
  const exact = buildVoxContextSnapshot({ selectionText: text })
  assert.equal(exact.selection.truncated, false)
  assert.equal(exact.selection.text!.length, VOX_CONTEXT_TEXT_LIMIT)

  const over = 'B'.repeat(VOX_CONTEXT_TEXT_LIMIT + 50)
  const overSnap = buildVoxContextSnapshot({ selectionText: over })
  assert.equal(overSnap.selection.truncated, true)
})

test('truncateContextText rejeita limite degenerado', () => {
  // < 16 não devolve texto porque não cabe nem o marker.
  const r = truncateContextText('hello world', 5)
  assert.equal(r.text, null)
  assert.equal(r.truncated, false)
})

test('truncateContextText preserva texto que cabe', () => {
  const r = truncateContextText('curto', 100)
  assert.equal(r.text, 'curto')
  assert.equal(r.truncated, false)
})

test('thread/obra normalizam id e title', () => {
  const snap = buildVoxContextSnapshot({
    thread: { id: '  th_1  ', title: '  Refatoração X  ' },
    obra: { id: 'obra_42', title: '' },
  })
  assert.equal(snap.thread.id, 'th_1')
  assert.equal(snap.thread.title, 'Refatoração X')
  assert.equal(snap.obra.id, 'obra_42')
  assert.equal(snap.obra.title, null)
})

test('terminal monta cwd + truncamento de excerpt e available', () => {
  const big = 'log line\n'.repeat(400)
  const snap = buildVoxContextSnapshot({
    terminal: {
      cwd: '/Users/vitorepf/develop/Atlas',
      lastOutputExcerpt: big,
      available: true,
    },
    textLimit: 200,
  })
  assert.equal(snap.terminal.cwd, '/Users/vitorepf/develop/Atlas')
  assert.equal(snap.terminal.available, true)
  assert.ok(snap.terminal.last_output_excerpt)
  assert.ok(snap.terminal.last_output_excerpt!.length < big.length)
})

test('terminal indisponível: available=false e cwd null', () => {
  const snap = buildVoxContextSnapshot({
    terminal: { cwd: null, lastOutputExcerpt: null, available: false },
  })
  assert.equal(snap.terminal.cwd, null)
  assert.equal(snap.terminal.last_output_excerpt, null)
  assert.equal(snap.terminal.available, false)
})

test('isVoxContextSnapshotEmpty distingue snapshot útil', () => {
  const empty = buildVoxContextSnapshot()
  assert.equal(isVoxContextSnapshotEmpty(empty), true)

  const withWorkspace = buildVoxContextSnapshot({
    workspace: { root: '/x', name: null },
  })
  assert.equal(isVoxContextSnapshotEmpty(withWorkspace), false)

  const withSelection = buildVoxContextSnapshot({ selectionText: 'oi' })
  assert.equal(isVoxContextSnapshotEmpty(withSelection), false)

  const withThread = buildVoxContextSnapshot({ thread: { id: 't1', title: null } })
  assert.equal(isVoxContextSnapshotEmpty(withThread), false)

  const withTerminal = buildVoxContextSnapshot({
    terminal: { cwd: null, lastOutputExcerpt: null, available: true },
  })
  assert.equal(isVoxContextSnapshotEmpty(withTerminal), false)
})

// ─────────────────────────────────────────────────────────────────────────
// Runner
// ─────────────────────────────────────────────────────────────────────────
let failed = 0
for (const { name, run } of cases) {
  try {
    run()
    console.log(`  ok · ${name}`)
  } catch (e) {
    failed += 1
    console.error(`  FAIL · ${name}`)
    console.error(e)
  }
}
if (failed > 0) {
  console.error(`\n${failed} de ${cases.length} testes falharam.`)
  process.exit(1)
}
console.log(`\n${cases.length} testes ok (voxContextSnapshot).`)
