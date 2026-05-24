import type { UseKernelStatusResult } from '../../hooks/useKernelStatus'

export const KERNEL_LABEL: Record<UseKernelStatusResult['status'], string> = {
  booting: 'Serviço iniciando...',
  ready: 'Serviço pronto',
  failed: 'Serviço com atenção',
  unconfigured: 'Serviço indisponível',
}

export const KERNEL_TONE: Record<UseKernelStatusResult['status'], string> = {
  booting: 'kernel-booting',
  ready: 'kernel-ready',
  failed: 'kernel-failed',
  unconfigured: 'kernel-unconfigured',
}
