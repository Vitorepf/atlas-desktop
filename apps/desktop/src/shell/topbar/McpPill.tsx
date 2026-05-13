import type { McpStatus } from '@atlas/domain'

export function McpPill({ mcp }: { mcp: McpStatus | null }) {
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

