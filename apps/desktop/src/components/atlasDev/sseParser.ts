/**
 * Atlas Dev · SSE incremental parser.
 *
 * Pure. No DOM, no fetch — easy to unit-test with Node + assert.
 *
 * Per the W3C SSE spec, events are separated by a blank line; each event is
 * composed of `field: value` lines. We honour:
 *
 *   - `event:` (event name; default = "message")
 *   - `data:`  (event body; multiple data lines join with "\n")
 *   - `id:`    (last event id; surfaced for downstream resume)
 *   - `:`      (comment / keepalive — emitted as a keepalive event)
 *   - `retry:` (server-suggested reconnect delay; surfaced separately)
 *
 * Unknown fields are ignored — never invented.
 *
 * Atlas Dev contract: a canonical event is JSON in `data:` with at least a
 * `kind` discriminator (`phase`, `test_started`, `repair_planned`, etc.).
 */

import type { AtlasDevSseEvent } from './types'

export interface RawSseEvent {
  /** SSE `event:` field (default "message"). */
  event: string
  /** `data:` lines joined with "\n" (untrimmed besides the leading space). */
  data: string
  /** `id:` field if present. */
  id?: string
  /** True if the chunk was a comment / keepalive (no data lines emitted). */
  keepalive?: boolean
}

export interface ParsedAtlasDevSse {
  /** Decoded Atlas Dev events (validated `kind`). */
  events: AtlasDevSseEvent[]
  /** Raw events for the rare downstream consumer that needs them. */
  raw: RawSseEvent[]
  /** Optional `retry:` directive observed in this batch (ms). */
  retryMs?: number
}

export class AtlasDevSseDecoder {
  private buffer = ''

  private lastEventName = ''

  private lastDataLines: string[] = []

  private lastId: string | undefined

  private observedRetryMs: number | undefined

  /** True when the most-recent dispatched event was a `:` comment. */
  private commentOnly = true

  push(chunk: string): ParsedAtlasDevSse {
    this.buffer += chunk

    const events: AtlasDevSseEvent[] = []
    const raw: RawSseEvent[] = []

    // SSE separator is either "\n\n" or "\r\n\r\n".
    let separatorIndex: number
    while ((separatorIndex = this.findEventBoundary(this.buffer)) !== -1) {
      const eventChunk = this.buffer.slice(0, separatorIndex)
      // Move past the separator (\n\n or \r\n\r\n).
      this.buffer = this.buffer.slice(
        separatorIndex + (this.buffer.startsWith('\r\n', separatorIndex) ? 4 : 2),
      )

      const rawEvent = this.consumeEventChunk(eventChunk)
      if (!rawEvent) continue
      raw.push(rawEvent)

      const decoded = decodeAtlasDevEvent(rawEvent)
      if (decoded !== null) {
        events.push(decoded)
      }
    }

    const result: ParsedAtlasDevSse = { events, raw }
    if (this.observedRetryMs !== undefined) {
      result.retryMs = this.observedRetryMs
      this.observedRetryMs = undefined
    }

    return result
  }

  /** Drain any half-event left in the buffer (used on stream close). */
  flush(): ParsedAtlasDevSse {
    if (this.buffer.length === 0) return { events: [], raw: [] }
    const remainder = this.buffer
    this.buffer = ''
    const rawEvent = this.consumeEventChunk(remainder)
    if (!rawEvent) return { events: [], raw: [] }
    const decoded = decodeAtlasDevEvent(rawEvent)
    return { events: decoded ? [decoded] : [], raw: [rawEvent] }
  }

  private findEventBoundary(input: string): number {
    const lf = input.indexOf('\n\n')
    const crlf = input.indexOf('\r\n\r\n')
    if (lf === -1) return crlf
    if (crlf === -1) return lf
    return Math.min(lf, crlf)
  }

  private consumeEventChunk(chunk: string): RawSseEvent | null {
    this.lastEventName = ''
    this.lastDataLines = []
    this.lastId = undefined
    this.commentOnly = true

    const lines = chunk.split(/\r\n|\r|\n/)
    for (const rawLine of lines) {
      if (rawLine === '') continue
      // SSE comments start with ':' — surface them as keepalives, not data.
      if (rawLine.startsWith(':')) continue

      const colon = rawLine.indexOf(':')
      const field = colon === -1 ? rawLine : rawLine.slice(0, colon)
      // Per spec, exactly one optional space after the colon is stripped.
      let value = colon === -1 ? '' : rawLine.slice(colon + 1)
      if (value.startsWith(' ')) value = value.slice(1)

      switch (field) {
        case 'event':
          this.lastEventName = value
          this.commentOnly = false
          break
        case 'data':
          this.lastDataLines.push(value)
          this.commentOnly = false
          break
        case 'id':
          this.lastId = value
          this.commentOnly = false
          break
        case 'retry': {
          const parsed = Number.parseInt(value, 10)
          if (Number.isFinite(parsed) && parsed >= 0) {
            this.observedRetryMs = parsed
          }
          break
        }
        default:
          // Unknown field — ignore (per spec).
          break
      }
    }

    if (this.commentOnly && this.lastDataLines.length === 0) {
      // Pure keepalive / comment chunk.
      return {
        event: 'keepalive',
        data: '',
        keepalive: true,
      }
    }

    const ev: RawSseEvent = {
      event: this.lastEventName || 'message',
      data: this.lastDataLines.join('\n'),
    }
    if (this.lastId !== undefined) ev.id = this.lastId
    return ev
  }
}

const KNOWN_KINDS = new Set<AtlasDevSseEvent['kind']>([
  'phase',
  'test_started',
  'test_finished',
  'repair_planned',
  'repair_executing',
  'repair_finished',
  'escalation_triggered',
  'receipt',
  'keepalive',
  'stream_closed',
])

export function decodeAtlasDevEvent(raw: RawSseEvent): AtlasDevSseEvent | null {
  if (raw.keepalive) {
    return { kind: 'keepalive' }
  }

  if (raw.data === '') {
    // Atlas Dev `event:` names are advisory — without data we cannot decode.
    if (raw.event === 'keepalive') return { kind: 'keepalive' }
    return null
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw.data)
  } catch {
    return null
  }

  if (!parsed || typeof parsed !== 'object') return null

  const record = parsed as Record<string, unknown>
  const kindCandidate = typeof record.kind === 'string' ? record.kind : raw.event
  if (!kindCandidate || !KNOWN_KINDS.has(kindCandidate as AtlasDevSseEvent['kind'])) {
    return null
  }

  return { ...record, kind: kindCandidate } as AtlasDevSseEvent
}
