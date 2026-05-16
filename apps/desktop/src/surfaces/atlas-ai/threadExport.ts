/**
 * Atlas AI · thread export utils.
 *
 * Serializa uma thread (com mensagens) num markdown denso e auditável
 * que carrega TODO o contexto: workspace, modo, provider, mensagens com
 * timestamps + role + provider. Cole em outro Atlas para continuar
 * a conversa de onde parou.
 */
import { formatRelativeLong } from './timeFormat'
import type { AiThreadDetail, AiThreadMessage } from './types'

function roleLabel(role: string): string {
  if (role === 'user' || role === 'operator') return 'Você'
  if (role === 'assistant' || role === 'atlas') return 'Atlas AI'
  if (role === 'system') return 'Sistema'
  return role
}

export function serializeThreadAsMarkdown(thread: AiThreadDetail): string {
  const meta = thread.metadata ?? {}
  const focus = typeof meta.atlas_focus === 'string' ? meta.atlas_focus : 'general'
  const task = typeof meta.routing_task === 'string' ? meta.routing_task : null
  const workflow = typeof meta.atlas_workflow_mode === 'string' ? meta.atlas_workflow_mode : null

  const head = [
    '# Atlas AI Thread Export',
    '',
    `**Título:** ${thread.title?.trim() || '(sem título)'}`,
    `**Thread ID:** \`${thread.id}\``,
    `**Workspace:** ${thread.workspace ?? '—'}`,
    `**Modo:** ${focus}`,
    task ? `**Tarefa:** ${task}` : null,
    workflow ? `**Workflow:** ${workflow}` : null,
    `**Status:** ${thread.status}`,
    `**Mensagens:** ${thread.message_count}`,
    thread.last_provider ? `**Último provider:** \`${thread.last_provider}\`` : null,
    thread.created_at ? `**Criada:** ${thread.created_at}` : null,
    thread.updated_at ? `**Atualizada:** ${thread.updated_at}` : null,
    '',
    '---',
    '',
  ]
    .filter(Boolean)
    .join('\n')

  const messages = (thread.messages ?? []).slice().sort((a, b) => a.position - b.position)
  const body = messages.length === 0
    ? '_(sem mensagens)_\n'
    : messages.map(messageToMarkdown).join('\n\n')

  return head + body
}

function messageToMarkdown(m: AiThreadMessage): string {
  const role = roleLabel(m.role)
  const stamp = formatRelativeLong(m.created_at) || (m.created_at ?? '—')
  const provider = m.provider ? ` · \`${m.provider}\`` : ''
  const headline = `## ${role} · ${stamp}${provider}`
  const content = (m.content ?? '').trim() || '_(sem conteúdo)_'
  return `${headline}\n\n${content}`
}
