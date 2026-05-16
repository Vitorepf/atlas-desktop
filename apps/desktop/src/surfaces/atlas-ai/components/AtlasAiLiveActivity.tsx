/**
 * Atlas AI · Live Activity (current-step footer).
 *
 * Mostra a operação que a IA está fazendo AGORA no rodapé do bubble
 * streaming, estilo Codex CLI:
 *
 *   ▶ Executando php artisan atlas:self-construction --audit-status …
 *   📄 Lendo 2026-05-14-atlas-self-construction-os-handoff.md
 *   🔍 Pesquisando "AtlasContextPack"
 *   🔌 Chamando MCP atlas_memory_recall
 *   ⏳ Aguardando worker disponível
 *
 * Fonte (em ordem de prioridade):
 *   1. último AiToolEvent ainda sem `duration_ms` (in-progress)
 *   2. último AiStreamEvent com event_type relevante
 *   3. job.status === 'awaiting_user_choice' → "Aguardando você escolher"
 *   4. job.status === 'queued' → "na fila"
 *   5. fallback: ThinkingState
 */
import { useMemo } from 'react'
import { IconForToolKind, IconAtlasDiamond, IconPause, IconQuestion } from '../icons/AtlasAiIcons'
import type { AiJob, AiStreamEvent, AiToolEvent, AiToolKind } from '../types'

interface AtlasAiLiveActivityProps {
  toolEvents?: AiToolEvent[] | null
  streamEvents?: AiStreamEvent[] | null
  job?: AiJob | null
  jobs?: AiJob[] | null
}

interface ActivityFrame {
  icon: React.ReactNode
  label: string
  detail?: string
  tone: 'thinking' | 'running' | 'awaiting' | 'queued' | 'unknown'
}

function inferActivityFromTool(ev: AiToolEvent): ActivityFrame {
  const kind = (ev.kind ?? 'unknown') as AiToolKind
  const verb = ((): string => {
    switch (kind) {
      case 'read': return 'Lendo'
      case 'list':
      case 'glob': return 'Listando'
      case 'search': return 'Pesquisando'
      case 'grep': return 'Pesquisando padrão'
      case 'edit': return 'Editando'
      case 'write': return 'Escrevendo'
      case 'bash':
      case 'execute': return 'Executando'
      case 'mcp': return 'Chamando MCP'
      case 'web_fetch': return 'Buscando URL'
      case 'web_search': return 'Buscando na web'
      case 'git': return 'Operando git'
      case 'agent_dispatch': return 'Acionando subagente'
      case 'todo': return 'Atualizando TODO'
      case 'plan': return 'Montando plano'
      default: return 'Executando'
    }
  })()
  const input = ev.input_summary as Record<string, unknown> | null
  let detail: string | undefined
  if (input && typeof input === 'object') {
    const file = input.file_path ?? input.path ?? input.file
    const cmd = input.command
    const pattern = input.pattern ?? input.query
    if (typeof file === 'string') detail = file.split('/').pop() || file
    else if (typeof cmd === 'string') detail = cmd.length > 80 ? cmd.slice(0, 77) + '…' : cmd
    else if (typeof pattern === 'string') detail = `"${pattern.length > 40 ? pattern.slice(0, 37) + '…' : pattern}"`
  }
  return {
    icon: <IconForToolKind kind={kind} size={13} />,
    label: detail ? `${verb} ${detail}` : `${verb} ${ev.tool}`,
    tone: 'running',
  }
}

function inferActivityFromStream(ev: AiStreamEvent): ActivityFrame | null {
  const t = ev.event_type?.toLowerCase() ?? ''
  if (t === 'delta' || t === 'chunk' || t === 'token') {
    return {
      icon: <IconAtlasDiamond size={13} />,
      label: 'Atlas escrevendo resposta',
      tone: 'running',
    }
  }
  if (t === 'context_loaded' || t.includes('context')) {
    return {
      icon: <IconAtlasDiamond size={13} />,
      label: 'Carregando contexto',
      tone: 'thinking',
    }
  }
  if (t === 'tool_use' || t === 'tool_call') {
    const meta = ev.metadata as Record<string, unknown> | null
    const toolName = meta?.tool ?? meta?.name
    return {
      icon: <IconAtlasDiamond size={13} />,
      label: typeof toolName === 'string' ? `Preparando ferramenta · ${toolName}` : 'Preparando ferramenta',
      tone: 'running',
    }
  }
  if (t === 'lifecycle') {
    const meta = ev.metadata as Record<string, unknown> | null
    const checkpoint = meta?.checkpoint
    if (typeof checkpoint === 'string') {
      return {
        icon: <IconAtlasDiamond size={13} />,
        label: `Checkpoint · ${checkpoint}`,
        tone: 'thinking',
      }
    }
  }
  return null
}

export function AtlasAiLiveActivity({
  toolEvents,
  streamEvents,
  job,
  jobs,
}: AtlasAiLiveActivityProps) {
  const frame: ActivityFrame | null = useMemo(() => {
    const currentJob =
      job ?? jobs?.find((j) => j.status === 'processing' || j.status === 'queued' || j.status === 'awaiting_user_choice') ?? null

    if (currentJob?.status === 'awaiting_user_choice') {
      return {
        icon: <IconQuestion size={13} />,
        label: 'Atlas precisa que você escolha',
        tone: 'awaiting',
      }
    }

    if (toolEvents && toolEvents.length > 0) {
      const inProgress = [...toolEvents].reverse().find((ev) => ev.duration_ms === null)
      if (inProgress) return inferActivityFromTool(inProgress)
      const last = toolEvents[toolEvents.length - 1]
      if (last) return inferActivityFromTool(last)
    }

    if (streamEvents && streamEvents.length > 0) {
      const lastStream = streamEvents[streamEvents.length - 1]
      const fromStream = inferActivityFromStream(lastStream)
      if (fromStream) return fromStream
    }

    if (currentJob?.status === 'queued') {
      return {
        icon: <IconPause size={13} />,
        label: 'Aguardando worker disponível',
        tone: 'queued',
      }
    }

    if (currentJob?.status === 'processing') {
      return {
        icon: <IconAtlasDiamond size={13} />,
        label: 'Atlas processando',
        tone: 'thinking',
      }
    }

    return null
  }, [toolEvents, streamEvents, job, jobs])

  if (!frame) return null

  return (
    <div className={`atlas-ai-live-activity tone-${frame.tone}`} aria-live="polite">
      <span className="atlas-ai-live-activity-icon" aria-hidden="true">
        {frame.icon}
      </span>
      <span className="atlas-ai-live-activity-label">{frame.label}</span>
    </div>
  )
}
