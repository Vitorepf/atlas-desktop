import type { UseKernelStatusResult } from '../../hooks/useKernelStatus'

export const KERNEL_LABEL: Record<UseKernelStatusResult['status'], string> = {
  booting: 'Kernel iniciando...',
  ready: 'Kernel pronto',
  failed: 'Kernel falhou',
  unconfigured: 'Kernel não encontrado',
}

export const KERNEL_TONE: Record<UseKernelStatusResult['status'], string> = {
  booting: 'kernel-booting',
  ready: 'kernel-ready',
  failed: 'kernel-failed',
  unconfigured: 'kernel-unconfigured',
}

