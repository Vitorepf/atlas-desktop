import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  nextWorkbenchFocusAfterClose,
  nextWorkbenchThreadSelection,
  pickWorkbenchRecordKeys,
  pruneWorkbenchScope,
  workbenchBaseForStageDrop,
  workbenchBaseForStageDropWithOpenThreadFallback,
} from '../workbenchSelection'

const surface = readFileSync(new URL('../AtlasAiSurface.tsx', import.meta.url), 'utf8')
const threadList = readFileSync(new URL('../components/AtlasAiThreadList.tsx', import.meta.url), 'utf8')
const unifiedComposer = readFileSync(new URL('../../../components/composer/AtlasUnifiedComposer.tsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../atlas-ai.css', import.meta.url), 'utf8')

test('AWIS Workbench · opening beside preserves the current conversation as the first pane', () => {
  const next = nextWorkbenchThreadSelection([], 'thread-a', 'thread-b')

  assert.deepEqual(next, {
    threadIds: ['thread-a', 'thread-b'],
    added: true,
    atLimit: false,
  })
})

test('AWIS Workbench · stage drop compares against the visible conversation when compare is closed', () => {
  const base = workbenchBaseForStageDrop(['stale-thread'], 'thread-a', false)
  const next = nextWorkbenchThreadSelection(base, 'thread-a', 'thread-b')

  assert.deepEqual(next, {
    threadIds: ['thread-a', 'thread-b'],
    added: true,
    atLimit: false,
  })
})

test('AWIS Workbench · stage drop falls back to the open single conversation if drag lost the anchor', () => {
  const base = workbenchBaseForStageDropWithOpenThreadFallback(['thread-a'], null, false)
  const next = nextWorkbenchThreadSelection(base, null, 'thread-b')

  assert.deepEqual(next, {
    threadIds: ['thread-a', 'thread-b'],
    added: true,
    atLimit: false,
  })
})

test('AWIS Workbench · stage drop cannot be collapsed by the drag follow-up click', () => {
  assert.match(
    surface,
    /const stageDropSelectGuardRef = useRef<\{ threadId: string; until: number \} \| null>\(null\)/,
    'Stage drops need a short guard against the browser click that can fire after drag release.',
  )
  assert.match(
    surface,
    /const handleSelectThread = useCallback\([\s\S]*const stageDropGuard = stageDropSelectGuardRef\.current[\s\S]*if \(stageDropGuard\) \{[\s\S]*if \(stageDropGuard\.until > Date\.now\(\)\) return[\s\S]*setWorkbenchActive\(false\)/,
    'Any follow-up click fired by the browser after stage drop must not immediately close the side-by-side comparison.',
  )
  assert.match(
    surface,
    /handleAddThreadToWorkbench\(threadId, \{ anchorThreadId, guardFollowupSelect: true \}\)/,
    'The central stage drop path must arm the click guard before opening comparison panes.',
  )
  assert.match(
    threadList,
    /const clearThreadDragState = useCallback\(\(options\?: \{ notifyEnd\?: boolean \}\) => \{[\s\S]*pointerFusionStartRef\.current = null[\s\S]*setDraggingThreadTitle\(null\)[\s\S]*setPointerFusionThread\(null\)[\s\S]*onStageDragActive\?\.\(false\)[\s\S]*if \(options\?\.notifyEnd !== false\) onThreadDragEnd\?\.\(\)[\s\S]*\}, \[onStageDragActive, onThreadDragEnd\]\)/,
    'Drag cleanup must remove visual preview state without clearing the pending click suppression.',
  )
  assert.doesNotMatch(
    threadList,
    /const clearThreadDragState = useCallback\(\(\) => \{[\s\S]*suppressClickThreadIdRef\.current = null[\s\S]*\}, \[onStageDragActive\]\)/,
    'Clearing drag visuals must not re-enable the final click that collapses the comparison into one conversation.',
  )
})

test('AWIS Workbench · stage drop carries the already-open conversation as compare anchor', () => {
  assert.match(
    surface,
    /const handleSelectThread = useCallback\([\s\S]*if \(availableWorkspaceThreadIds\.has\(id\)\) \{[\s\S]*stageCompareAnchorIdRef\.current = id[\s\S]*lastStageCompareAnchorRef\.current = id[\s\S]*setWorkbenchThreadIds\(\[id\]\)/,
    'Opening a normal conversation must synchronously freeze it as the compare anchor before its detail request finishes.',
  )
  assert.match(
    threadList,
    /const anchorThreadId = stageCompareAnchorId && stageCompareAnchorId !== thread\.id \? stageCompareAnchorId : null[\s\S]*nativeDragAnchorRef\.current = anchorThreadId[\s\S]*event\.dataTransfer\.setData\('application\/x-atlas-ai-visible-thread-id', anchorThreadId\)/,
    'Dragging a row must carry the conversation that was open before drag started.',
  )
  assert.match(
    surface,
    /const anchorThreadId = threadId \? resolveStageDropAnchorThreadId\(threadId, dragAnchorThreadIdFromEvent\(event\)\) : null[\s\S]*handleAddThreadToWorkbench\(threadId, \{ anchorThreadId, guardFollowupSelect: true \}\)/,
    'Dropping into the center must resolve a stable anchor so it compares instead of replacing the visible conversation.',
  )
  assert.match(
    surface,
    /workbenchBaseForStageDropWithOpenThreadFallback\(scopedWorkbenchThreadIds, visibleThreadId, workbenchActiveRef\.current\)/,
    'If browser drag churn loses the explicit anchor, the hidden one-pane Workbench state must still become the compare base.',
  )
  assert.match(
    threadList,
    /const droppedInsideStageBounds = Boolean\([\s\S]*stageRect[\s\S]*event\.clientX >= stageRect\.left[\s\S]*event\.clientY <= stageRect\.bottom[\s\S]*const droppedOnStage = stageDropActive \|\| Boolean\(target\?\.closest\('\.atlas-ai-stage'\)\) \|\| droppedInsideStageBounds[\s\S]*if \(droppedOnStage\) \{[\s\S]*onOpenInStage\?\.\(thread\.id, nativeDragAnchorRef\.current\)/,
    'Native dragend must use the frozen drag-start anchor and still open comparison if Tauri/WebKit loses the final drop event or elementFromPoint misses the stage.',
  )
  assert.match(
    threadList,
    /prev\.onOpenInStage === next\.onOpenInStage &&[\s\S]*prev\.onDragThreadStart === next\.onDragThreadStart &&[\s\S]*prev\.stageCompareAnchorId === next\.stageCompareAnchorId &&[\s\S]*prev\.stageDropActive === next\.stageDropActive/,
    'Memoized thread rows must refresh drag/drop handlers and fallback state when the center stage becomes the active drop target.',
  )
  assert.match(
    surface,
    /options\?\.anchorThreadId[\s\S]*options\.anchorThreadId !== id[\s\S]*availableWorkspaceThreadIds\.has\(options\.anchorThreadId\)[\s\S]*\? options\.anchorThreadId[\s\S]*: selectedVisibleThreadId/,
    'The Workbench must prefer the drag anchor over any selection churn caused by drag release.',
  )
  assert.match(
    surface,
    /const resolveStageDropAnchorThreadId = useCallback\(\(threadId: string, eventAnchorThreadId\?: string \| null\) => \{[\s\S]*eventAnchorThreadId[\s\S]*stageDragSessionSnapshotRef\.current\?\.anchorThreadId[\s\S]*stageDragSessionAnchorRef\.current[\s\S]*stageCompareAnchorIdRef\.current[\s\S]*threadDetailIdRef\.current[\s\S]*previousStageCompareAnchorRef\.current[\s\S]*lastStageCompareAnchorRef\.current[\s\S]*selectedThreadIdRef\.current[\s\S]*id !== threadId[\s\S]*availableWorkspaceThreadIds\.has\(id\)/,
    'The stage drop path must repair missing drag MIME anchors from the visible conversation and drag-start snapshot.',
  )
  assert.match(
    surface,
    /const workbenchActiveRef = useRef<boolean>\(false\)[\s\S]*const workbenchThreadIdsRef = useRef<string\[\]>\(\[\]\)[\s\S]*workbenchThreadIdsRef\.current = workbenchThreadIds/,
    'The stage-drop opener must use live Workbench refs so memoized rows cannot keep a stale one-pane base.',
  )
  assert.match(
    surface,
    /const stageCompareAnchorIdRef = useRef<string \| null>\(null\)[\s\S]*if \(stageCompareAnchorId\) stageCompareAnchorIdRef\.current = stageCompareAnchorId/,
    'The Surface must keep the last rendered stage conversation as a stable compare anchor across drag/drop churn.',
  )
})

test('AWIS Workbench · stage drop recovers the previous conversation if drag churn selects the dragged row', () => {
  assert.match(
    surface,
    /const previousStageCompareAnchorRef = useRef<string \| null>\(null\)/,
    'The Surface must remember the previous visible conversation as a fallback compare anchor.',
  )
  assert.match(
    surface,
    /stageCompareAnchorIdRef\.current[\s\S]*stageCompareAnchorIdRef\.current !== id[\s\S]*threadDetailIdRef\.current && threadDetailIdRef\.current !== id[\s\S]*previousStageCompareAnchorRef\.current[\s\S]*previousStageCompareAnchorRef\.current !== id[\s\S]*selectedThreadIdRef\.current &&[\s\S]*selectedThreadIdRef\.current !== id/,
    'Dropping a dragged row must not let that same row become the only Workbench pane.',
  )
})

test('AWIS Workbench · pointer drag to stage also compares against the open conversation', () => {
  assert.match(
    threadList,
    /const stageAnchorId =[\s\S]*stageCompareAnchorId && stageCompareAnchorId !== thread\.id[\s\S]*\? stageCompareAnchorId[\s\S]*: selectedId && selectedId !== thread\.id[\s\S]*\? selectedId[\s\S]*: null[\s\S]*stageAnchorId: stageAnchorId && stageAnchorId !== thread\.id \? stageAnchorId : null/,
    'The custom pointer drag engine must capture the visible conversation before the drag can churn selection.',
  )
  assert.match(
    surface,
    /const stageCompareAnchorId = useMemo\(\(\) => \{[\s\S]*atlas\.threadDetail\?\.id[\s\S]*workbenchFocusedThreadId[\s\S]*workbenchThreadIds\[0\][\s\S]*lastStageCompareAnchorRef\.current[\s\S]*previousStageCompareAnchorRef\.current[\s\S]*atlas\.selectedThreadId[\s\S]*availableWorkspaceThreadIds\.has\(id\)/,
    'The Surface must pass the actually visible stage conversation, not only the sidebar selected id, as the compare anchor.',
  )
  assert.match(
    surface,
    /<AtlasAiThreadList[\s\S]*selectedId=\{atlas\.selectedThreadId\}[\s\S]*stageCompareAnchorId=\{stageCompareAnchorId\}/,
    'The thread list must receive the explicit stage compare anchor for pointer and native drags.',
  )
  assert.match(
    surface,
    /<AtlasAiThreadList[\s\S]*stageDropActive=\{stageThreadDropActive\}/,
    'The thread list must know when the central stage is the active native drop target.',
  )
  assert.match(
    threadList,
    /const stageAtPoint = \(x: number, y: number\) => \{[\s\S]*document\.elementFromPoint\(x, y\)\?\.closest<HTMLElement>\('\.atlas-ai-stage'\)[\s\S]*const rect = stage\.getBoundingClientRect\(\)[\s\S]*x >= rect\.left[\s\S]*y <= rect\.bottom[\s\S]*onOpenInStage\?\.\(pointerFusionThread\.id, pointerFusionThread\.stageAnchorId\)/,
    'Dropping a pointer-dragged conversation in the center must pass the captured anchor and use stage geometry if elementFromPoint misses.',
  )
  assert.match(
    threadList,
    /if \(active\) \{[\s\S]*event\.preventDefault\(\)[\s\S]*event\.stopPropagation\(\)[\s\S]*suppressNextThreadClick\(pointerFusionThread\.id\)[\s\S]*onOpenInStage\?\.\(pointerFusionThread\.id, pointerFusionThread\.stageAnchorId\)/,
    'Pointer release after a center drop must cancel the residual row click that would reopen only the dragged conversation.',
  )
})

test('AWIS Workbench · visible stage conversation outranks sidebar selection during drag compare', () => {
  assert.match(
    surface,
    /const stageCompareAnchorId = useMemo\(\(\) => \{[\s\S]*const candidates = \[\s*atlas\.threadDetail\?\.id,\s*workbenchFocusedThreadId,\s*workbenchThreadIds\[0\],\s*lastStageCompareAnchorRef\.current,\s*previousStageCompareAnchorRef\.current,\s*atlas\.selectedThreadId,\s*\]/,
    'The visible stage thread must be captured before selectedThreadId, because drag/click churn can select the dragged row.',
  )
  assert.match(
    surface,
    /const selectedVisibleThreadId =\s*dragSessionSnapshotAnchor[\s\S]*\? dragSessionSnapshotAnchor[\s\S]*stageDragSessionAnchorRef\.current[\s\S]*\? stageDragSessionAnchorRef\.current[\s\S]*stageCompareAnchorIdRef\.current[\s\S]*\? stageCompareAnchorIdRef\.current[\s\S]*threadDetailIdRef\.current[\s\S]*\? threadDetailIdRef\.current[\s\S]*workbenchFocusedThreadIdRef\.current[\s\S]*workbenchThreadIdsRef\.current\[0\][\s\S]*previousStageCompareAnchorRef\.current[\s\S]*lastStageCompareAnchorRef\.current[\s\S]*selectedThreadIdRef\.current/,
    'Stage drops must recover the drag-start snapshot and rendered conversation before using sidebar selection as a fallback.',
  )
})

test('AWIS Workbench · stage drag session freezes the compare anchor before UI churn', () => {
  assert.match(
    surface,
    /const stageDragSessionAnchorRef = useRef<string \| null>\(null\)/,
    'The Surface needs a per-drag anchor so stage drops do not depend on selection after release.',
  )
  assert.match(
    surface,
    /const stageDragSessionSnapshotRef = useRef<\{[\s\S]*anchorThreadId: string \| null[\s\S]*threadIds: string\[\][\s\S]*selectedThreadId: string \| null[\s\S]*\} \| null>\(null\)/,
    'The Surface needs a drag-start snapshot so a center drop can still compare after selection/workbench churn.',
  )
  assert.match(
    surface,
    /const handleThreadDragStart = useCallback\([\s\S]*draggedThreadId\?: string \| null[\s\S]*const canUseAnchor[\s\S]*id !== draggedThreadId[\s\S]*lastStageCompareAnchorRef\.current[\s\S]*previousStageCompareAnchorRef\.current[\s\S]*stageDragSessionAnchorRef\.current = canUseAnchor\(anchorThreadId\) \? anchorThreadId : fallbackAnchor[\s\S]*stageDragSessionSnapshotRef\.current = \{[\s\S]*anchorThreadId: stageDragSessionAnchorRef\.current/,
    'Starting a thread drag must freeze the currently open conversation as the compare anchor and never use the dragged row itself.',
  )
  assert.match(
    surface,
    /<AtlasAiThreadList[\s\S]*onThreadDragStart=\{handleThreadDragStart\}[\s\S]*onThreadDragEnd=\{handleThreadDragEnd\}/,
    'The thread list must report drag lifecycle to the Surface so the compare anchor survives native and pointer drags.',
  )
  assert.match(
    threadList,
    /onThreadDragStart\?\.\(stageAnchorId && stageAnchorId !== thread\.id \? stageAnchorId : null, thread\.id\)/,
    'Pointer drag must freeze the stage anchor before the dragged row can become selected.',
  )
  assert.match(
    threadList,
    /const anchorThreadId = stageCompareAnchorId && stageCompareAnchorId !== thread\.id \? stageCompareAnchorId : null[\s\S]*onDragThreadStart\?\.\(title, anchorThreadId, thread\.id\)/,
    'Native drag must carry the same frozen compare anchor as pointer drag.',
  )
})

test('AWIS Workbench · center drop repairs drag churn that selected the dragged row first', () => {
  assert.match(
    surface,
    /const currentWasDraggedRowOnly = scopedWorkbenchThreadIds\.length === 1 && scopedWorkbenchThreadIds\[0\] === id[\s\S]*const stageDropWasAlreadyComparing = workbenchActiveRef\.current \|\| \(scopedWorkbenchThreadIds\.length > 0 && !currentWasDraggedRowOnly\)/,
    'A center drop must not treat the dragged row as the existing compare base when release churn selected it first.',
  )
  assert.match(
    surface,
    /const stageCompareBaseThreadIds =[\s\S]*visibleThreadId && !baseThreadIds\.includes\(visibleThreadId\)[\s\S]*\? Array\.from\(new Set\(\[visibleThreadId, \.\.\.baseThreadIds\.filter\(\(threadId\) => threadId !== id\)\]\)\)[\s\S]*: baseThreadIds/,
    'The visible conversation must be restored as the first compare pane before adding the dropped conversation.',
  )
})

test('AWIS Workbench · center release fallback compares when WebKit loses the drop event', () => {
  assert.match(
    surface,
    /const stageDraggedThreadIdRef = useRef<string \| null>\(null\)[\s\S]*const stageDropHandledAtRef = useRef<number>\(0\)[\s\S]*const stageThreadDropActiveRef = useRef<boolean>\(false\)/,
    'The Surface must remember the dragged conversation, dedupe recovered center drops, and keep synchronous center-drop state.',
  )
  assert.match(
    surface,
    /stageDraggedThreadIdRef\.current = draggedThreadId \?\? null/,
    'Drag start must freeze the dragged thread before release/drop churn can select it.',
  )
  assert.match(
    surface,
    /const recoverStageDrop = \(event: MouseEvent \| PointerEvent \| globalThis\.DragEvent\) => \{[\s\S]*const draggedThreadId = stageDraggedThreadIdRef\.current[\s\S]*const stageWasActive = stageThreadDropActiveRef\.current[\s\S]*if \(!stageWasActive && !pointIsInsideStage\(event\.clientX, event\.clientY\)\) return[\s\S]*resolveStageDropAnchorThreadId\(draggedThreadId\)[\s\S]*handleAddThreadToWorkbench\(draggedThreadId, \{ anchorThreadId, guardFollowupSelect: true \}\)[\s\S]*window\.addEventListener\('pointerup', recoverStageDrop, true\)[\s\S]*window\.addEventListener\('dragend', recoverStageDrop, true\)/,
    'Pointer/native release must recover comparison even if WebKit loses the drop event or reports broken final coordinates.',
  )
})

test('AWIS Workbench · center drop never degrades into only the dragged conversation', () => {
  assert.match(
    surface,
    /if \(next\.threadIds\.length === 1 && next\.threadIds\[0\] === id\) \{[\s\S]*const rescueBaseThreadIds = Array\.from\(new Set\(\[[\s\S]*visibleThreadId,[\s\S]*\.\.\.dragSessionBaseThreadIds,[\s\S]*\.\.\.workbenchThreadIdsRef\.current,[\s\S]*stageDragSessionAnchorRef\.current,[\s\S]*stageCompareAnchorIdRef\.current,[\s\S]*threadDetailIdRef\.current,[\s\S]*previousStageCompareAnchorRef\.current,[\s\S]*lastStageCompareAnchorRef\.current,[\s\S]*selectedThreadIdRef\.current[\s\S]*next = nextWorkbenchThreadSelection\(rescueBaseThreadIds, rescueBaseThreadIds\[0\] \?\? null, id\)/,
    'A stage drop must rescue any known open conversation if event churn would otherwise leave only the dragged thread open.',
  )
  assert.match(
    surface,
    /workbenchActiveRef\.current = false[\s\S]*setWorkbenchActive\(false\)[\s\S]*workbenchThreadIdsRef\.current = \[id\][\s\S]*workbenchFocusedThreadIdRef\.current = id/,
    'Selecting a normal conversation must synchronously update Workbench refs before a fast drag can start.',
  )
  assert.match(
    surface,
    /workbenchActiveRef\.current = true[\s\S]*setWorkbenchActive\(true\)[\s\S]*workbenchThreadIdsRef\.current = next\.threadIds[\s\S]*workbenchFocusedThreadIdRef\.current = id/,
    'Opening comparison from a stage drop must synchronously update live refs used by recovery handlers.',
  )
})

test('AWIS Workbench · lost center drop click is recovered as comparison', () => {
  assert.match(
    surface,
    /interface StageDropCompareIntent \{[\s\S]*threadId: string[\s\S]*anchorThreadId: string \| null[\s\S]*until: number[\s\S]*\}/,
    'The Surface must remember a provider-safe compare intent while a dragged conversation is over the center.',
  )
  assert.match(
    surface,
    /if \(active && stageDraggedThreadIdRef\.current\) \{[\s\S]*stageDropCompareIntentRef\.current = \{[\s\S]*threadId: draggedThreadId,[\s\S]*anchorThreadId,[\s\S]*until: Date\.now\(\) \+ 1600/,
    'Center hover must arm a short-lived intent so WebKit/Tauri can recover if the final drop event is lost.',
  )
  assert.match(
    surface,
    /const stageDropIntent = stageDropCompareIntentRef\.current[\s\S]*if \(stageDropIntent\?\.threadId === id\) \{[\s\S]*setStageDropRecoveryRequest\(stageDropIntent\)[\s\S]*return[\s\S]*\}/,
    'The residual row click after a center drag must be converted into a compare recovery instead of opening one conversation.',
  )
  assert.match(
    surface,
    /if \(!stageDropRecoveryRequest\) return[\s\S]*handleAddThreadToWorkbench\(stageDropRecoveryRequest\.threadId, \{[\s\S]*resolveStageDropAnchorThreadId\([\s\S]*stageDropRecoveryRequest\.anchorThreadId[\s\S]*guardFollowupSelect: true/,
    'Recovered center drops must use the same Workbench opener and anchor repair path as a normal stage drop.',
  )
})

test('AWIS Workbench · active compare keeps current panes during stage drop', () => {
  const base = workbenchBaseForStageDrop(['thread-a', 'thread-c'], 'thread-a', true)
  const next = nextWorkbenchThreadSelection(base, 'thread-a', 'thread-b')

  assert.deepEqual(next.threadIds, ['thread-a', 'thread-c', 'thread-b'])
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

test('AWIS Workbench · pane close control follows macOS upper-left placement', () => {
  assert.match(
    css,
    /\.atlas-ai-workbench-close\s*\{[\s\S]*top:\s*10px;[\s\S]*left:\s*10px;[\s\S]*\}/,
    'Workbench pane close control must live in the upper-left corner like a macOS window.',
  )
  assert.match(
    css,
    /\.atlas-ai-workbench-pane \.atlas-ai-conversation-header\s*\{[\s\S]*padding-left:\s*52px;[\s\S]*padding-right:\s*12px;[\s\S]*\}/,
    'The pane header needs left padding so the close control never overlaps the conversation title.',
  )
  assert.match(
    css,
    /\.atlas-shell\.surface-atlas_ai \.atlas-ai-workbench-close,[\s\S]*\.atlas-shell\.surface-atlas-ai \.atlas-ai-workbench-close\s*\{[\s\S]*left:\s*12px;[\s\S]*right:\s*auto;[\s\S]*\}/,
    'Premium surface overrides must keep the Workbench close control pinned to the upper-left.',
  )
  assert.match(
    css,
    /\.atlas-shell\.surface-atlas_ai \.atlas-ai-workbench-pane \.atlas-ai-conversation-header,[\s\S]*\.atlas-shell\.surface-atlas-ai \.atlas-ai-workbench-pane \.atlas-ai-conversation-header\s*\{[\s\S]*padding:\s*14px 16px 16px 52px;[\s\S]*\}/,
    'Premium surface overrides must reserve title space for the upper-left close control.',
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
  assert.match(surface, /const WORKBENCH_DETAIL_TIMEOUT_MS = 8_000/)
  assert.match(
    surface,
    /if \(workbenchThreadIds\.length === 0\) return[\s\S]*threadSummaryAsDetail\(workbenchThreadSummariesById\.get\(threadId\)\)[\s\S]*window\.setTimeout\(\(\) => \{[\s\S]*loading: false[\s\S]*atlas\.fetchThreadDetail\(threadId\)[\s\S]*detail: detail \?\? fallback[\s\S]*\.catch\(\(\) => \{[\s\S]*detail: fallbackDetail[\s\S]*loading: false/,
    'Workbench panes must use local summary fallback plus a timeout so one slow or failed backend detail fetch never leaves a pane stuck loading.',
  )
  assert.match(
    surface,
    /threadId === atlas\.selectedThreadId[\s\S]*\? atlas\.threadDetail \?\? cached\.detail[\s\S]*\? atlas\.threadDetailLoading && !cached\.detail[\s\S]*\? atlas\.threadDetailError \?\? cached\.error/,
    'A focused single-pane Workbench must keep using the pane cache while the global selected detail refreshes.',
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
    /const handleOpenSpace = useCallback\([\s\S]*const scoped = unique\.filter\(\(threadId\) => availableWorkspaceThreadIds\.has\(threadId\)\)[\s\S]*setWorkspaceLock\(\{ slug: targetSlug, name: targetName, path: targetPath \}\)[\s\S]*setWorkbenchThreadIds\(next\)/,
    'Opening a visible Space from another project must move AWIS to that project before opening panes.',
  )
  assert.match(
    surface,
    /showWorkbenchNotice\('Abrindo o projeto deste Space\.'\)/,
    'Cross-project Space open must explain that AWIS is switching project context.',
  )
  assert.match(
    surface,
    /const handleAddThreadToWorkbench = useCallback\([\s\S]*if \(!availableWorkspaceThreadIds\.has\(id\)\)[\s\S]*Abra o projeto desta conversa para comparar sessões[\s\S]*const dragSessionSnapshot = stageDragSessionSnapshotRef\.current[\s\S]*const selectedVisibleThreadId =[\s\S]*stageCompareAnchorIdRef\.current[\s\S]*threadDetailIdRef\.current[\s\S]*previousStageCompareAnchorRef\.current[\s\S]*lastStageCompareAnchorRef\.current[\s\S]*selectedThreadIdRef\.current[\s\S]*const visibleThreadId =[\s\S]*options\?\.anchorThreadId[\s\S]*const dragSessionBaseThreadIds = Array\.from\(new Set\([\s\S]*setWorkbenchThreadIds\(\(currentThreadIds\) => \{[\s\S]*currentThreadIds\.filter\(\(threadId\) => availableWorkspaceThreadIds\.has\(threadId\)\)[\s\S]*const currentWasDraggedRowOnly = scopedWorkbenchThreadIds\.length === 1 && scopedWorkbenchThreadIds\[0\] === id[\s\S]*const stageDropWasAlreadyComparing = workbenchActiveRef\.current \|\| \(scopedWorkbenchThreadIds\.length > 0 && !currentWasDraggedRowOnly\)[\s\S]*workbenchBaseForStageDropWithOpenThreadFallback\([\s\S]*stageDropWasAlreadyComparing[\s\S]*const stageCompareBaseThreadIds =[\s\S]*nextWorkbenchThreadSelection\(durableBaseThreadIds, visibleThreadId, id\)/,
    'Dragging or opening a loose conversation into the Workbench must use the latest scoped panes so a stage drop compares instead of opening a single conversation.',
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
