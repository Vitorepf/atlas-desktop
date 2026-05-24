import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  nextWorkbenchFocusAfterClose,
  nextWorkbenchThreadSelection,
  pickWorkbenchRecordKeys,
  pruneWorkbenchScope,
} from '../workbenchSelection'

const surface = readFileSync(new URL('../AtlasAiSurface.tsx', import.meta.url), 'utf8')
const unifiedComposer = readFileSync(new URL('../../../components/composer/AtlasUnifiedComposer.tsx', import.meta.url), 'utf8')

test('AWIS Workbench · opening beside preserves the current conversation as the first pane', () => {
  const next = nextWorkbenchThreadSelection([], 'thread-a', 'thread-b')

  assert.deepEqual(next, {
    threadIds: ['thread-a', 'thread-b'],
    added: true,
    atLimit: false,
  })
})

test('AWIS Workbench · opening an existing pane focuses without duplicating it', () => {
  const next = nextWorkbenchThreadSelection(['thread-a', 'thread-b'], 'thread-a', 'thread-b')

  assert.deepEqual(next, {
    threadIds: ['thread-a', 'thread-b'],
    added: false,
    atLimit: false,
  })
})

test('AWIS Workbench · fifth pane is blocked without replacing visible work', () => {
  const current = ['thread-a', 'thread-b', 'thread-c', 'thread-d']
  const next = nextWorkbenchThreadSelection(current, 'thread-a', 'thread-e')

  assert.deepEqual(next, {
    threadIds: current,
    added: false,
    atLimit: true,
  })
})

test('AWIS Workbench · closing a middle pane keeps spatial focus on the next neighbor', () => {
  const nextFocus = nextWorkbenchFocusAfterClose(['thread-a', 'thread-b', 'thread-c'], 'thread-b')

  assert.equal(nextFocus, 'thread-c')
})

test('AWIS Workbench · closing the last pane focuses the previous neighbor', () => {
  const nextFocus = nextWorkbenchFocusAfterClose(['thread-a', 'thread-b', 'thread-c'], 'thread-c')

  assert.equal(nextFocus, 'thread-b')
})

test('AWIS Workbench · pane composer uses compact placeholder instead of the global long one', () => {
  assert.match(
    unifiedComposer,
    /placeholder\?: string[\s\S]*placeholder \?\? MODE_PLACEHOLDER\[mode\]/,
    'Unified composer must allow a compact placeholder override for dense surfaces.',
  )
  assert.match(
    surface,
    /className="atlas-ai-workbench-composer"[\s\S]*placeholder="Responder nesta sessão\.\.\."/,
    'Workbench panes must use a compact per-pane composer placeholder.',
  )
})

test('AWIS Workbench · live selected conversation detail refreshes the pane cache', () => {
  assert.match(
    surface,
    /const threadId = atlas\.threadDetail\?\.id[\s\S]*workbenchThreadIds\.includes\(threadId\)[\s\S]*setWorkbenchDetails[\s\S]*detail: atlas\.threadDetail[\s\S]*loading: false[\s\S]*error: null/,
    'Workbench must sync the live selected conversation detail into pane cache so panes do not show stale messages after sending.',
  )
})

test('AWIS Workbench · pane detail load failures settle the pane instead of leaving hidden loading state', () => {
  assert.match(
    surface,
    /atlas\.fetchThreadDetail\(threadId\)[\s\S]*\.then\(\(detail\) => \{[\s\S]*\.catch\(\(\) => \{[\s\S]*loading: false[\s\S]*error: 'Não consegui carregar esta conversa\.'/,
    'Workbench panes must handle failed detail fetches locally so one backend 500 does not leave a pane stuck loading.',
  )
})

test('AWIS Workbench · pane archive is scoped to the pane conversation', () => {
  assert.match(
    surface,
    /onArchive=\{\(\) => \{[\s\S]*void atlas\.archiveThread\(threadId\)[\s\S]*closeWorkbenchPane\(threadId\)[\s\S]*\}\}/,
    'Archiving from a side-by-side pane must archive and close that pane thread, not the global selected conversation.',
  )
  const workbenchStart = surface.indexOf('className={`atlas-ai-workbench-grid')
  const workbenchEnd = surface.indexOf(') : (', workbenchStart)
  const workbenchBlock = surface.slice(workbenchStart, workbenchEnd)
  assert.ok(workbenchStart >= 0 && workbenchEnd > workbenchStart, 'Workbench render block must be present.')
  assert.doesNotMatch(
    workbenchBlock,
    /onArchive=\{atlas\.archiveSelectedThread\}/,
    'Workbench panes must not reuse the single-conversation archive handler.',
  )
})

test('AWIS Workbench · pane promote focuses the pane conversation before opening the flow', () => {
  assert.match(
    surface,
    /onPromote=\{\(\) => \{[\s\S]*focusWorkbenchPane\(threadId\)[\s\S]*setPromotionOpen\(true\)[\s\S]*\}\}/,
    'Promoting from a side-by-side pane must target that pane conversation, not the previously selected global conversation.',
  )
})

test('AWIS Workbench · keyboard focus selects the active pane conversation', () => {
  assert.match(
    surface,
    /const focusWorkbenchPane = useCallback\([\s\S]*setWorkbenchFocusedThreadId\(id\)[\s\S]*if \(id\) atlas\.selectThread\(id\)/,
    'Workbench pane focus must use one shared selector so pane actions stay scoped.',
  )
  assert.match(
    surface,
    /onMouseDown=\{\(\) => focusWorkbenchPane\(threadId\)\}[\s\S]*onFocusCapture=\{\(\) => focusWorkbenchPane\(threadId\)\}/,
    'Workbench panes must select their conversation for both pointer and keyboard focus.',
  )
  assert.match(
    surface,
    /async \(threadId: string, options\?: AtlasAiComposerSendExtras\) => \{[\s\S]*focusWorkbenchPane\(threadId\)[\s\S]*setWorkbenchPendingThreadId\(threadId\)/,
    'Sending from a pane composer must focus that pane before marking it pending.',
  )
})

test('AWIS Workbench · saved side-by-side sessions are scoped to the active project', () => {
  assert.match(
    surface,
    /const availableWorkspaceThreadIds = useMemo\([\s\S]*threadBelongsToWorkspace\(thread, activeWorkspaceScope\)[\s\S]*map\(\(thread\) => thread\.id\)/,
    'Workbench snapshots must derive available threads from the active AWIS project scope.',
  )
  assert.match(
    surface,
    /restoreWorkbenchSnapshot\(effectiveWorkspaceSlug, availableWorkspaceThreadIds\)/,
    'Workbench resume must ignore saved panes that do not belong to the active project.',
  )
  assert.match(
    surface,
    /const scopedThreadIds = workbenchThreadIds[\s\S]*filter\(\(threadId\) => availableWorkspaceThreadIds\.has\(threadId\)\)[\s\S]*saveWorkbenchSnapshot\(effectiveWorkspaceSlug, \{[\s\S]*threadIds: scopedThreadIds/,
    'Workbench persistence must not save cross-project panes under the current project slug.',
  )
  assert.match(
    surface,
    /const handleOpenSpace = useCallback\([\s\S]*const scoped = unique\.filter\(\(threadId\) => availableWorkspaceThreadIds\.has\(threadId\)\)[\s\S]*setWorkbenchThreadIds\(next\)/,
    'Opening a Space side-by-side must not admit sessions from another project.',
  )
  assert.match(
    surface,
    /const handleAddThreadToWorkbench = useCallback\([\s\S]*if \(!availableWorkspaceThreadIds\.has\(id\)\)[\s\S]*Abra o projeto desta conversa para comparar sessões[\s\S]*const scopedWorkbenchThreadIds = workbenchThreadIds\.filter\(\(threadId\) => availableWorkspaceThreadIds\.has\(threadId\)\)[\s\S]*nextWorkbenchThreadSelection\(scopedWorkbenchThreadIds, selectedThreadId, id\)/,
    'Dragging or opening a loose conversation into the Workbench must stay inside the active project scope.',
  )
})

test('AWIS Workbench · live panes are pruned when the active project scope changes', () => {
  const next = pruneWorkbenchScope({
    threadIds: ['thread-a', 'thread-b', 'thread-c', 'thread-b'],
    availableThreadIds: new Set(['thread-b', 'thread-c']),
    focusedThreadId: 'thread-a',
    pendingThreadId: 'thread-a',
    active: true,
  })

  assert.deepEqual(next, {
    threadIds: ['thread-b', 'thread-c'],
    focusedThreadId: 'thread-b',
    pendingThreadId: null,
    active: true,
    changed: true,
  })
  assert.deepEqual(
    pickWorkbenchRecordKeys({ 'thread-a': 'drop', 'thread-b': 'keep' }, new Set(next.threadIds)),
    { 'thread-b': 'keep' },
  )
  assert.match(
    surface,
    /pruneWorkbenchScope\(\{[\s\S]*threadIds: workbenchThreadIds[\s\S]*availableThreadIds: availableWorkspaceThreadIds[\s\S]*focusedThreadId: workbenchFocusedThreadId[\s\S]*pendingThreadId: workbenchPendingThreadId[\s\S]*active: workbenchActive/,
    'Workbench live state must use the shared pruning contract when project scope changes.',
  )
  assert.match(
    surface,
    /setWorkbenchThreadIds\(next\.threadIds\)[\s\S]*setWorkbenchDrafts\(\(prev\) => pickWorkbenchRecordKeys\(prev, scopedSet\)\)[\s\S]*setWorkbenchDetails\(\(prev\) => pickWorkbenchRecordKeys\(prev, scopedSet\)\)/,
    'Workbench live state must drop panes, drafts and cached details that no longer belong to the active project.',
  )
  assert.match(
    surface,
    /setWorkbenchPendingThreadId\(next\.pendingThreadId\)[\s\S]*setWorkbenchActive\(next\.active\)[\s\S]*setWorkbenchFocusedThreadId\(next\.focusedThreadId\)/,
    'Workbench must also clear pending state and deactivate when every pane leaves project scope.',
  )
  assert.match(
    surface,
    /if \(next\.focusedThreadId !== workbenchFocusedThreadId\) \{[\s\S]*atlas\.selectThread\(next\.focusedThreadId\)/,
    'Scope pruning must clear the selected conversation even when a single non-Workbench session leaves project scope.',
  )
})

test('AWIS Workbench · pruning deactivates when every pane leaves project scope', () => {
  const next = pruneWorkbenchScope({
    threadIds: ['thread-a'],
    availableThreadIds: new Set(['thread-b']),
    focusedThreadId: 'thread-a',
    pendingThreadId: 'thread-a',
    active: true,
  })

  assert.deepEqual(next, {
    threadIds: [],
    focusedThreadId: null,
    pendingThreadId: null,
    active: false,
    changed: true,
  })
})
