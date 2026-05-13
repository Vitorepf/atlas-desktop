import { useEffect, useRef, useState } from 'react'
import type { BridgeMode } from '../lib/bridge'
import type { Surface } from '../hooks/useSurface'
import type { UseKernelStatusResult } from '../hooks/useKernelStatus'
import type { McpStatus } from '@atlas/domain'

interface TopBarProps {
  mode: BridgeMode
  loading: boolean
  errors: string[]
  surface: Surface
  onSurfaceChange: (s: Surface) => void
  kernel: UseKernelStatusResult
  mcp: McpStatus | null
}

interface SurfaceTab {
  id: Surface
  label: string
  shortcut: string
  sub: string
}

const SURFACES: SurfaceTab[] = [
  { id: 'cartografia', label: 'Cartografia', shortcut: '⌘1', sub: 'mapa da verdade canônica' },
  { id: 'code', label: 'Code', shortcut: '⌘2', sub: 'cabine de programação' },
]

const KERNEL_LABEL: Record<UseKernelStatusResult['status'], string> = {
  booting: 'Kernel iniciando…',
  ready: 'Kernel pronto',
  failed: 'Kernel falhou',
  unconfigured: 'Kernel não encontrado',
}

const KERNEL_TONE: Record<UseKernelStatusResult['status'], string> = {
  booting: 'kernel-booting',
  ready: 'kernel-ready',
  failed: 'kernel-failed',
  unconfigured: 'kernel-unconfigured',
}

/**
 * TopBar · brand + surface switcher + kernel status pill + MCP pill +
 * bridge badge. Click on the kernel pill opens a diagnostic dropdown
 * with `failure_code`, `repair_hint`, server/php paths, and a Retry button.
 */
export function TopBar({
  mode,
  loading,
  errors,
  surface,
  onSurfaceChange,
  kernel,
  mcp,
}: TopBarProps) {
  const bridgeTitle =
    errors.length > 0 ? `Bridge errors:\n${errors.join('\n')}` : `bridge dispatch: ${mode}`

  const [diagOpen, setDiagOpen] = useState(false)
  const diagRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!diagOpen) return
    function onClickOutside(e: MouseEvent) {
      if (diagRef.current && !diagRef.current.contains(e.target as Node)) {
        setDiagOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [diagOpen])

  const active = SURFACES.find((s) => s.id === surface) ?? SURFACES[0]!

  return (
    <header className="topbar">
      <div className="brand">
        <strong>Atlas · Desktop</strong>
        <span className="v">v0.2.7</span>
        <span className="sub">{active.sub}</span>
      </div>

      <nav className="surface-switcher" role="tablist" aria-label="Atlas surfaces">
        {SURFACES.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={surface === s.id}
            className={`surface-tab${surface === s.id ? ' on' : ''}`}
            onClick={() => onSurfaceChange(s.id)}
            title={`${s.label} · ${s.shortcut}`}
          >
            <span className="surface-tab-label">{s.label}</span>
            <span className="surface-tab-shortcut">{s.shortcut}</span>
          </button>
        ))}
      </nav>

      <div className="topbar-meta" ref={diagRef} style={{ position: 'relative' }}>
        <button
          type="button"
          className={`v kernel-pill ${KERNEL_TONE[kernel.status]}`}
          onClick={() => setDiagOpen((s) => !s)}
          title={`${kernel.message}${kernel.serverPath ? `\n${kernel.serverPath}` : ''}`}
          style={{ cursor: 'pointer', border: 'none', font: 'inherit' }}
        >
          <span className="kernel-dot" />
          {KERNEL_LABEL[kernel.status]}
          {kernel.queueRunning ? ' · worker' : ''}
        </button>

        <McpPill mcp={mcp} />

        <span
          className={`v bridge-mode bridge-mode-${mode}${errors.length > 0 ? ' bridge-mode-degraded' : ''}`}
          title={bridgeTitle}
        >
          bridge · {mode}
          {loading ? ' · loading' : ''}
          {errors.length > 0 ? ` · ${errors.length} offline` : ''}
        </span>
        <div className="folio">
          <span className="live" />
          atlas desktop · v0.2.7 · terminal-clean
        </div>

        {diagOpen && <KernelDiagnostic kernel={kernel} onClose={() => setDiagOpen(false)} />}
      </div>
    </header>
  )
}

function McpPill({ mcp }: { mcp: McpStatus | null }) {
  if (!mcp) {
    return (
      <span className="v mcp-pill mcp-unknown" title="MCP status indisponível">
        MCP · ?
      </span>
    )
  }
  const tone =
    mcp.status === 'active' ? 'mcp-active' : mcp.status === 'degraded' ? 'mcp-degraded' : 'mcp-disabled'
  const label =
    mcp.status === 'active' ? `MCP · ${mcp.toolsCount} tools`
    : mcp.status === 'degraded' ? 'MCP · degradado'
    : 'MCP · off'
  const title =
    `${mcp.server} · ${mcp.protocolVersion}\n` +
    `${mcp.toolsCount} tools · ${mcp.docsIndexed} docs · ${mcp.symbolsIndexed} symbols\n` +
    (mcp.lastCall ? `last call: ${mcp.lastCall.tool} (${mcp.lastCall.durationMs}ms)` : 'no recent calls')
  return (
    <span className={`v mcp-pill ${tone}`} title={title}>
      {label}
    </span>
  )
}

function KernelDiagnostic({
  kernel,
  onClose,
}: {
  kernel: UseKernelStatusResult
  onClose: () => void
}) {
  return (
    <div
      style={{
        position: 'absolute',
        right: 0,
        top: '110%',
        zIndex: 1000,
        width: 460,
        background: 'var(--cream-deep)',
        border: '1px solid var(--bronze-soft)',
        borderRadius: 4,
        padding: '14px 16px',
        boxShadow: '0 8px 24px rgba(26,23,20,0.10)',
        fontFamily: 'var(--mono)',
        fontSize: 11,
        color: 'var(--ink)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <strong style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 16 }}>
          Kernel diagnostic
        </strong>
        <button
          type="button"
          onClick={onClose}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--ink3)',
          }}
        >
          ✕
        </button>
      </div>

      <DiagRow k="status" v={`${kernel.status}${kernel.queueRunning ? ' · worker' : ''}`} />
      {kernel.message && <DiagRow k="message" v={kernel.message} />}
      {kernel.failureCode && <DiagRow k="failure_code" v={kernel.failureCode} tone="rec" />}
      {kernel.repairHint && (
        <DiagRow k="repair_hint" v={kernel.repairHint} tone="moss" wrap />
      )}
      {kernel.serverPath && <DiagRow k="server_path" v={kernel.serverPath} />}
      {kernel.phpPath && <DiagRow k="php_path" v={kernel.phpPath} />}
      <DiagRow k="url" v={`${kernel.url}:${kernel.port}`} />

      {kernel.stderrTail.length > 0 && (
        <details style={{ marginTop: 10 }}>
          <summary style={{ cursor: 'pointer', color: 'var(--rec-red)' }}>
            stderr_tail · últimas {kernel.stderrTail.length} linhas
          </summary>
          <pre
            style={{
              marginTop: 6,
              padding: 8,
              background: 'var(--ink)',
              color: 'var(--cream)',
              fontSize: 10,
              maxHeight: 180,
              overflow: 'auto',
              borderRadius: 2,
            }}
          >
            {kernel.stderrTail.join('\n')}
          </pre>
        </details>
      )}
      {kernel.stdoutTail.length > 0 && (
        <details style={{ marginTop: 8 }}>
          <summary style={{ cursor: 'pointer', color: 'var(--ink3)' }}>
            stdout_tail · últimas {kernel.stdoutTail.length} linhas
          </summary>
          <pre
            style={{
              marginTop: 6,
              padding: 8,
              background: 'var(--ink)',
              color: 'var(--cream)',
              fontSize: 10,
              maxHeight: 180,
              overflow: 'auto',
              borderRadius: 2,
            }}
          >
            {kernel.stdoutTail.join('\n')}
          </pre>
        </details>
      )}

      <button
        type="button"
        onClick={() => void kernel.retry()}
        disabled={kernel.retrying}
        style={{
          marginTop: 12,
          width: '100%',
          padding: '8px 12px',
          background: 'var(--ink)',
          color: 'var(--cream)',
          border: '1px solid var(--ink)',
          borderRadius: 2,
          fontFamily: 'var(--mono)',
          fontSize: 10,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          cursor: kernel.retrying ? 'wait' : 'pointer',
        }}
      >
        {kernel.retrying ? 'tentando…' : '↻ tentar novamente'}
      </button>
    </div>
  )
}

function DiagRow({
  k,
  v,
  tone,
  wrap = false,
}: {
  k: string
  v: string
  tone?: 'rec' | 'moss'
  wrap?: boolean
}) {
  const color = tone === 'rec' ? 'var(--rec-red)' : tone === 'moss' ? 'var(--moss)' : 'var(--ink)'
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '120px 1fr',
        gap: 8,
        padding: '4px 0',
        borderBottom: '1px solid var(--hair-soft)',
        alignItems: 'baseline',
      }}
    >
      <span
        style={{
          fontSize: 8.5,
          letterSpacing: '1.3px',
          color: 'var(--bronze)',
          textTransform: 'uppercase',
        }}
      >
        {k}
      </span>
      <span
        style={{
          fontSize: 10.5,
          color,
          wordBreak: wrap ? 'break-word' : 'break-all',
        }}
      >
        {v}
      </span>
    </div>
  )
}
