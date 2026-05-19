import type { UseKernelStatusResult } from '../../hooks/useKernelStatus'

interface KernelDiagnosticProps {
  kernel: UseKernelStatusResult
  onClose: () => void
}

export function KernelDiagnostic({ kernel, onClose }: KernelDiagnosticProps) {
  return (
    <div className="kernel-diagnostic">
      <div className="kernel-diagnostic-head">
        <strong>Kernel diagnostic</strong>
        <button
          type="button"
          onClick={onClose}
          className="kernel-diagnostic-close"
        >
          ✕
        </button>
      </div>

      <DiagRow k="status" v={`${kernel.status}${kernel.queueRunning ? ' · worker' : ''}`} />
      {kernel.message ? <DiagRow k="message" v={kernel.message} /> : null}
      {kernel.failureCode ? <DiagRow k="failure_code" v={kernel.failureCode} tone="rec" /> : null}
      {kernel.repairHint ? (
        <DiagRow k="repair_hint" v={kernel.repairHint} tone="moss" wrap />
      ) : null}
      {kernel.serverPath ? <DiagRow k="server_path" v={kernel.serverPath} /> : null}
      {kernel.phpPath ? <DiagRow k="php_path" v={kernel.phpPath} /> : null}
      <DiagRow k="url" v={`${kernel.url}:${kernel.port}`} />

      <KernelTail title="stderr_tail" tone="rec" lines={kernel.stderrTail} />
      <KernelTail title="stdout_tail" tone="ink" lines={kernel.stdoutTail} />

      <button
        type="button"
        onClick={() => void kernel.retry()}
        disabled={kernel.retrying}
        className="kernel-diagnostic-retry"
      >
        {kernel.retrying ? 'tentando...' : '↻ tentar novamente'}
      </button>
    </div>
  )
}

function KernelTail({
  title,
  tone,
  lines,
}: {
  title: string
  tone: 'rec' | 'ink'
  lines: string[]
}) {
  if (lines.length === 0) return null
  return (
    <details className={`kernel-tail kernel-tail-${tone}`}>
      <summary>
        {title} · últimas {lines.length} linhas
      </summary>
      <pre>
        {lines.join('\n')}
      </pre>
    </details>
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
  return (
    <div className="kernel-diag-row">
      <span className="kernel-diag-key">
        {k}
      </span>
      <span
        className={`kernel-diag-value${tone ? ` kernel-diag-value-${tone}` : ''}${wrap ? ' is-wrapped' : ''}`}
      >
        {v}
      </span>
    </div>
  )
}
