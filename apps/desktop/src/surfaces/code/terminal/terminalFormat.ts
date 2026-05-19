export function compactPath(path: string): string {
  if (!path || path === '—') return '—'
  const parts = path.replace(/\/+$/, '').split('/').filter(Boolean)
  if (path === '/') return '/'
  if (parts.length <= 4) return path
  return `/${parts[0]}/…/${parts.slice(-3).join('/')}`
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.max(1, Math.round(ms))}ms`
  const total = Math.max(0, Math.floor(ms / 1000))
  if (total < 60) return `${total}s`
  const min = Math.floor(total / 60)
  const sec = total % 60
  if (min < 60) return `${min}m ${sec}s`
  const h = Math.floor(min / 60)
  return `${h}h ${min % 60}m`
}

export function terminalTabLabel(cwd: string | null | undefined, fallback: string): string {
  const tail = cwd ? cwd.replace(/\/+$/, '').split('/').pop() : null
  return tail && tail.length > 0 ? tail : fallback
}
