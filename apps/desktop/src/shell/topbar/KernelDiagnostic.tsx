import type { UseKernelStatusResult } from '../../hooks/useKernelStatus'

interface KernelDiagnosticProps {
  kernel: UseKernelStatusResult
  onClose: () => void
}

export function KernelDiagnostic({ kernel, onClose }: KernelDiagnosticProps) {
  const status = `${kernelStatusLabel(kernel.status)}${kernel.queueRunning ? ' · fila ativa' : ''}`
  const message = explainKernelMessage(kernel.message)
  const failure = kernel.failureCode ? kernelFailureLabel(kernel.failureCode) : null
  const repairHint = kernel.repairHint ? explainKernelRepairHint(kernel.repairHint) : null

  return (
    <div className="kernel-diagnostic">
      <div className="kernel-diagnostic-head">
        <strong>Serviço local do Atlas</strong>
        <button
          type="button"
          onClick={onClose}
          className="kernel-diagnostic-close"
        >
          ✕
        </button>
      </div>

      <DiagRow k="Estado" v={status} />
      {message ? <DiagRow k="Mensagem" v={message} /> : null}
      {failure ? <DiagRow k="Falha" v={failure} tone="rec" /> : null}
      {repairHint ? (
        <DiagRow k="Como resolver" v={repairHint} tone="moss" wrap />
      ) : null}
      {kernel.serverPath ? <DiagRow k="Serviço" v={kernel.serverPath} /> : null}
      {kernel.phpPath ? <DiagRow k="PHP" v={kernel.phpPath} /> : null}
      <DiagRow k="Endereço local" v={`${kernel.url}:${kernel.port}`} />

      <KernelTail title="Erros recentes" tone="rec" lines={kernel.stderrTail} />
      <KernelTail title="Eventos recentes" tone="ink" lines={kernel.stdoutTail} />

      <button
        type="button"
        onClick={() => void kernel.retry()}
        disabled={kernel.retrying}
        className="kernel-diagnostic-retry"
      >
        {kernel.retrying ? 'verificando...' : 'verificar novamente'}
      </button>
    </div>
  )
}

function kernelStatusLabel(status: UseKernelStatusResult['status']): string {
  if (status === 'ready') return 'Pronto'
  if (status === 'booting') return 'Iniciando'
  if (status === 'failed') return 'Atenção'
  if (status === 'unconfigured') return 'Sem configuração'
  return status
}

export function explainKernelMessage(message: string): string {
  const value = message.trim()
  if (!value) return ''
  const lower = value.toLowerCase()
  if (lower.includes('atlas server configured') || lower.includes('http env')) {
    return 'Serviço local conectado por configuração externa.'
  }
  if (lower.includes('bridge offline') || lower.includes('no atlas server')) {
    return 'Serviço local indisponível. Abra o Atlas Code ou configure o endereço local.'
  }
  if (lower.includes('retry failed')) {
    return 'Não consegui verificar o serviço local agora.'
  }
  return value
}

function kernelFailureLabel(code: string): string {
  const value = code.trim()
  if (!value) return ''
  if (value === 'no_bridge') return 'Serviço não encontrado'
  if (value === 'retry_failed') return 'Verificação falhou'
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function explainKernelRepairHint(hint: string): string {
  const value = hint.trim()
  if (!value) return ''
  const lower = value.toLowerCase()
  if (lower.includes('vite_atlas_server_url') || lower.includes('atlas code .app')) {
    return 'Abra o aplicativo Atlas Code ou configure o endereço do serviço local.'
  }
  if (lower.includes('stderr')) {
    return 'Confira os erros recentes e tente verificar novamente.'
  }
  return value
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
