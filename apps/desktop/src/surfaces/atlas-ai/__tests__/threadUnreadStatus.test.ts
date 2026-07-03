/**
 * Guards the unread (gold dot) semantics after the false-gold bug (03/07/2026):
 * the operator saw already-viewed threads glowing because their persisted
 * seenAt was lost (localStorage seen-map frozen since May) and the old code
 * treated an ABSENT seen record as unread (`?? 0`). Absence must mean SEEN.
 *
 * Run: npx tsx --test src/surfaces/atlas-ai/__tests__/threadUnreadStatus.test.ts
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isThreadUnread } from '../components/AtlasAiThreadList'

test('absent seen record = SEEN (never gold) — the operator-reported false-gold', () => {
  // A real, old thread with genuine activity but NO persisted seenAt.
  assert.equal(isThreadUnread(Date.parse('2026-06-11T14:47:41Z'), undefined), false)
})

test('seen-then-newer-activity = UNREAD (the one true gold case)', () => {
  const seenAt = Date.parse('2026-06-11T14:00:00Z')
  const newer = Date.parse('2026-06-11T15:00:00Z')
  assert.equal(isThreadUnread(newer, seenAt), true)
})

test('seen at or after latest activity = SEEN', () => {
  const activity = Date.parse('2026-06-11T14:47:41Z')
  assert.equal(isThreadUnread(activity, activity), false)
  assert.equal(isThreadUnread(activity, activity + 1), false)
})

test('a thread with no activity timestamp never glows', () => {
  assert.equal(isThreadUnread(0, undefined), false)
  assert.equal(isThreadUnread(0, 123), false)
})
