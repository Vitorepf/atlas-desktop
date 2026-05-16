/**
 * Atlas AI · Tool Receipts (Codex-style inline).
 *
 * Renderiza UM resumo condensado de todas as tool events do trace:
 *
 *   📂 Explorou 5 arquivos, 2 pesquisas e 1 listagem · 8 operações
 *   ▶ Executou 6 comandos · 2.4s total
 *   🔌 Chamou 3 MCP tools
 *   ⚠ 1 erro
 *
 * Clica para expandir e ver detalhe linha-a-linha. Padrão "collapsed" para
 * não poluir o bubble (TDAH-friendly: peso decrescente).
 */
import { useMemo, useState } from 'react'
import { IconForToolKind, IconAlert, pluralLabelForKind } from '../icons/AtlasAiIcons'
import type { AiToolEvent, AiToolKind } from '../types'

interface AtlasAiToolReceiptsProps {
  events: AiToolEvent[]
  defaultExpanded?: boolean
}

interface ReceiptGroup {
  kind: AiToolKind | string
  count: number
  label: string
  errored: number
}

function groupReceipts(events: AiToolEvent[]): ReceiptGroup[] {
  const buckets = new Map<string, { count: number; errored: number }>()
  for (const ev of events) {
    const kind = (ev.kind ?? 'unknown') as string
    const bucket = buckets.get(kind) ?? { count: 0, errored: 0 }
    bucket.count += 1
    if (ev.error || (ev.exit_code !== null && ev.exit_code !== 0)) bucket.errored += 1
    buckets.set(kind, bucket)
  }
  const order: Array<AiToolKind | string> = [
    'read', 'list', 'glob', 'search', 'grep', 'edit', 'write',
    'bash', 'execute', 'mcp', 'web_fetch', 'web_search', 'git',
    'agent_dispatch', 'todo', 'plan', 'unknown',
  ]
  const groups: ReceiptGroup[] = []
  for (const k of order) {
    const b = buckets.get(k)
    if (!b) continue
    groups.push({
      kind: k,
      count: b.count,
      errored: b.errored,
      label: pluralLabelForKind(k as AiToolKind, b.count),
    })
  }
  return groups
}

function formatTool(ev: AiToolEvent): string {
  const summaryInput = ev.input_summary
  if (summaryInput && typeof summaryInput === 'object') {
    const file = (summaryInput as Record<string, unknown>).file_path
      ?? (summaryInput as Record<string, unknown>).path
      ?? (summaryInput as Record<string, unknown>).file
    if (typeof file === 'string' && file.trim() !== '') {
      const base = file.split('/').pop() || file
      return `${ev.tool} · ${base}`
    }
    const cmd = (summaryInput as Record<string, unknown>).command
    if (typeof cmd === 'string') {
      return `${ev.tool} · ${cmd.length > 60 ? cmd.slice(0, 57) + '…' : cmd}`
    }
    const pattern = (summaryInput as Record<string, unknown>).pattern
      ?? (summaryInput as Record<string, unknown>).query
    if (typeof pattern === 'string') {
      return `${ev.tool} · "${pattern.length > 40 ? pattern.slice(0, 37) + '…' : pattern}"`
    }
  }
  return ev.tool
}

function formatDuration(ms: number | null): string | null {
  if (ms === null || ms < 0) return null
  if (ms < 1000) return `${ms}ms`
  const sec = ms / 1000
  if (sec < 60) return `${sec.toFixed(sec < 10 ? 1 : 0)}s`
  const min = Math.floor(sec / 60)
  const rest = Math.round(sec - min * 60)
  return `${min}m${rest}s`
}

export function AtlasAiToolReceipts({ events, defaultExpanded = false }: AtlasAiToolReceiptsProps) {
  const [expanded, setExpanded] = useState<boolean>(defaultExpanded)
  const groups = useMemo(() => groupReceipts(events), [events])
  const totalDuration = useMemo(
    () => events.reduce((acc, e) => acc + (e.duration_ms ?? 0), 0),
    [events],
  )
  const erroredTotal = useMemo(
    () => events.reduce((acc, e) => acc + ((e.error || (e.exit_code !== null && e.exit_code !== 0)) ? 1 : 0), 0),
    [events],
  )

  if (events.length === 0) return null

  return (
    <div className="atlas-ai-tool-receipts" aria-live="polite">
      <button
        type="button"
        className="atlas-ai-tool-receipts-summary"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label={expanded ? 'Colapsar receitas de ferramentas' : 'Expandir receitas de ferramentas'}
      >
        <span className="atlas-ai-tool-receipts-chips">
          {groups.map((g) => (
            <span key={g.kind} className={`atlas-ai-tool-chip${g.errored > 0 ? ' has-error' : ''}`}>
              <IconForToolKind kind={g.kind as AiToolKind} size={11} />
              <span>{g.label}</span>
            </span>
          ))}
        </span>
        <span className="atlas-ai-tool-receipts-meta">
          {totalDuration > 0 ? <span className="atlas-ai-tool-receipts-time">{formatDuration(totalDuration)}</span> : null}
          {erroredTotal > 0 ? (
            <span className="atlas-ai-tool-receipts-errors" title={`${erroredTotal} com erro`}>
              <IconAlert size={11} /> {erroredTotal}
            </span>
          ) : null}
          <span className="atlas-ai-tool-receipts-toggle" aria-hidden="true">
            {expanded ? '−' : '+'}
          </span>
        </span>
      </button>

      {expanded ? (
        <ol className="atlas-ai-tool-receipts-list">
          {events.map((ev) => {
            const errored = !!ev.error || (ev.exit_code !== null && ev.exit_code !== 0)
            return (
              <li key={ev.id} className={`atlas-ai-tool-receipts-row${errored ? ' has-error' : ''}`}>
                <span className="atlas-ai-tool-receipts-icon" aria-hidden="true">
                  <IconForToolKind kind={(ev.kind ?? 'unknown') as AiToolKind} size={11} />
                </span>
                <span className="atlas-ai-tool-receipts-name">{formatTool(ev)}</span>
                {ev.duration_ms !== null ? (
                  <span className="atlas-ai-tool-receipts-duration">{formatDuration(ev.duration_ms)}</span>
                ) : null}
                {errored ? (
                  <span className="atlas-ai-tool-receipts-errortext">
                    {ev.error ? ev.error.slice(0, 80) : `exit ${ev.exit_code}`}
                  </span>
                ) : null}
              </li>
            )
          })}
        </ol>
      ) : null}
    </div>
  )
}
