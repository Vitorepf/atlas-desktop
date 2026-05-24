import { useCallback, useRef, useState } from 'react'
import type { UseKernelStatusResult } from '../../hooks/useKernelStatus'
import { KERNEL_LABEL, KERNEL_TONE } from './kernelStatus'
import { explainKernelMessage, KernelDiagnostic } from './KernelDiagnostic'
import { useDismissablePopover } from './useDismissablePopover'

export function KernelPill({ kernel }: { kernel: UseKernelStatusResult }) {
  const [diagOpen, setDiagOpen] = useState(false)
  const diagRef = useRef<HTMLDivElement>(null)
  const closeDiag = useCallback(() => setDiagOpen(false), [])

  useDismissablePopover(diagOpen, diagRef, closeDiag)

  return (
    <div ref={diagRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className={`v kernel-pill ${KERNEL_TONE[kernel.status]}`}
        onClick={() => setDiagOpen((s) => !s)}
        title={`${explainKernelMessage(kernel.message)}${kernel.serverPath ? `\n${kernel.serverPath}` : ''}`}
        style={{ cursor: 'pointer', border: 'none', font: 'inherit' }}
      >
        <span className="kernel-dot" />
        {KERNEL_LABEL[kernel.status]}
        {kernel.queueRunning ? ' · fila ativa' : ''}
      </button>

      {diagOpen ? <KernelDiagnostic kernel={kernel} onClose={closeDiag} /> : null}
    </div>
  )
}
