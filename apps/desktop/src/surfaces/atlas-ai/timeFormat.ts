/**
 * Atlas AI · helpers de tempo relativo (pt-BR).
 *
 * `formatRelativeShort`  → "agora", "5min", "3h", "2d", "15/05" (sidebar)
 * `formatRelativeLong`   → "agora", "há 5 minutos", "há 3 horas", "ontem 14:32",
 *                         "15/05 14:32" (mensagens)
 *
 * Falha gracefully retornando '' para datas inválidas.
 */

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatRelativeShort(value: string | null | undefined): string {
  const d = toDate(value)
  if (!d) return ''
  const diffSec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000))
  if (diffSec < 45) return 'agora'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)}d`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export function formatRelativeLong(value: string | null | undefined): string {
  const d = toDate(value)
  if (!d) return ''
  const diffSec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000))
  if (diffSec < 45) return 'agora'
  if (diffSec < 3600) {
    const m = Math.floor(diffSec / 60)
    return `há ${m} ${m === 1 ? 'minuto' : 'minutos'}`
  }
  if (diffSec < 86400) {
    const h = Math.floor(diffSec / 3600)
    return `há ${h} ${h === 1 ? 'hora' : 'horas'}`
  }
  if (diffSec < 86400 * 2) {
    return `ontem ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
  }
  if (diffSec < 86400 * 7) {
    const days = Math.floor(diffSec / 86400)
    return `há ${days} dias`
  }
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export type TimeGroupKey = 'today' | 'yesterday' | 'this_week' | 'older'

export function groupKeyFor(value: string | null | undefined): TimeGroupKey {
  const d = toDate(value)
  if (!d) return 'older'
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfYesterday = startOfToday - 86_400_000
  const startOfWeekAgo = startOfToday - 86_400_000 * 7
  const t = d.getTime()
  if (t >= startOfToday) return 'today'
  if (t >= startOfYesterday) return 'yesterday'
  if (t >= startOfWeekAgo) return 'this_week'
  return 'older'
}

export const TIME_GROUP_LABEL: Record<TimeGroupKey, string> = {
  today: 'Hoje',
  yesterday: 'Ontem',
  this_week: 'Esta semana',
  older: 'Mais antigas',
}
