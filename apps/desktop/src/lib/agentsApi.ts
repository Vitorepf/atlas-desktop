// Atlas Agent Governance — the desktop's window into the autonomous fleet + the DESLIGAR controls. A small,
// isolated HTTP client for the server's /api/agents/* control plane: same base URL (VITE_ATLAS_SERVER_URL) and
// same X-Atlas-Token contract the main bridge uses, kept separate so this feature never has to touch the
// 9k-line bridge. Read calls never start/stop anything; the only writes turn agents OFF (no turn-ON, by design).

const ENV = ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {})
const HTTP_BASE = ENV.VITE_ATLAS_SERVER_URL ?? ''

export interface FleetAgent {
  key: string
  label: string
  account: string
  kind: string
  provider_spending: boolean
  desired: boolean
  authorized: boolean
  set_by: string | null
  set_at: string | null
  ttl_remaining_seconds: number | null
  budget_limit_usd: number | null
  target_ref: string | null
  reason: string | null
  status: 'running' | 'desired_dead' | 'off'
  alive: boolean
  pids: number[]
  uptime_seconds: number | null
  spent_usd: number
}

export interface FleetSnapshot {
  schema_version: string
  generated_at: string
  fleet_master: 'on' | 'off'
  active_count: number
  spending_accounts: string[]
  agents: FleetAgent[]
}

export interface AgentEvent {
  agent_key: string
  event: string
  at: string
  by: string | null
  account: string | null
  pid: number | null
  duration_seconds: number | null
  reason: string | null
  detail: Record<string, unknown> | null
}

export interface AgentHistoryResponse {
  schema_version: string
  events: AgentEvent[]
}

export class AgentsApiUnavailable extends Error {}

async function agentsFetch<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  if (!HTTP_BASE) {
    // Tauri/offline dev without an HTTP server URL — the fleet view degrades to "unknown" instead of crashing.
    throw new AgentsApiUnavailable('VITE_ATLAS_SERVER_URL not set')
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' }
  const token = ENV.VITE_ATLAS_TOKEN
  if (token) headers['X-Atlas-Token'] = token

  const response = await fetch(`${HTTP_BASE}${path}`, {
    method: init?.method ?? 'GET',
    headers,
    body: init?.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(20_000),
  })
  if (!response.ok) {
    throw new Error(`agents api ${response.status}: ${(await response.text()).slice(0, 160)}`)
  }
  return response.json() as Promise<T>
}

export const fetchAgentsActive = (): Promise<FleetSnapshot> => agentsFetch<FleetSnapshot>('/api/agents/active')
export const fetchAgentsStatus = (): Promise<FleetSnapshot> => agentsFetch<FleetSnapshot>('/api/agents/status')
export const fetchAgentsHistory = (limit = 60): Promise<AgentHistoryResponse> =>
  agentsFetch<AgentHistoryResponse>(`/api/agents/history?limit=${limit}`)
export const agentTurnOff = (key: string): Promise<unknown> =>
  agentsFetch(`/api/agents/${encodeURIComponent(key)}/off`, { method: 'POST', body: {} })
export const agentTurnOffAll = (): Promise<unknown> =>
  agentsFetch('/api/agents/off-all', { method: 'POST', body: {} })

export function humanDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '—'
  if (seconds < 60) return `${Math.floor(seconds)}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  return `${Math.floor(seconds / 3600)}h${Math.floor((seconds % 3600) / 60)}m`
}
