/**
 * Atlas AI · thread context menu (Codex-grade right-click).
 *
 * Ações disponíveis:
 *   ★ Fixar / Desfixar             (toggle local · persist sessionStorage)
 *   ✎ Renomear chat                (prompt + PATCH /ai/threads/{id})
 *   ⊟ Arquivar chat                (PATCH status=archived)
 *   ⎘ Copiar ID da sessão           (clipboard thread.id)
 *   ⤓ Copiar contexto completo (md) (fetch detail + serializa markdown)
 *   ⊠ Apagar permanentemente        (DELETE /ai/threads/{id}, confirmação em 2 cliques)
 *
 * "Copiar contexto completo" é o killer: traz workspace, modo, provider,
 * todas as mensagens com timestamps + role + provider, em markdown. Cole
 * isso em outro Atlas (mobile, outro Desktop, Forge) e ele tem todo o
 * contexto da conversa pronto para continuar.
 */
import { useEffect, useRef, useState } from 'react'

export interface ContextMenuPos {
  x: number
  y: number
}

export interface ThreadContextMenuActions {
  isPinned: boolean
  onPin: () => void
  onRename: () => void
  onArchive: () => void
  onCopyId: () => void
  onCopyContext: () => void | Promise<void>
  onDelete: () => void
}

interface AtlasAiThreadContextMenuProps {
  pos: ContextMenuPos
  threadTitle: string
  actions: ThreadContextMenuActions
  onClose: () => void
}

export function AtlasAiThreadContextMenu({
  pos,
  threadTitle,
  actions,
  onClose,
}: AtlasAiThreadContextMenuProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  // Clamp para dentro da viewport
  const left = Math.min(pos.x, window.innerWidth - 280)
  const top = Math.min(pos.y, window.innerHeight - 360)

  return (
    <div
      ref={ref}
      className="atlas-ai-ctxmenu"
      style={{ left, top }}
      role="menu"
      aria-label={`Ações para ${threadTitle}`}
    >
      <header className="atlas-ai-ctxmenu-head">
        <span className="atlas-ai-ctxmenu-head-eye">Thread</span>
        <span className="atlas-ai-ctxmenu-head-title">{threadTitle}</span>
      </header>

      <MenuItem
        icon="★"
        label={actions.isPinned ? 'Desfixar' : 'Fixar'}
        description={actions.isPinned ? 'Remove a thread do topo' : 'Mantém esta thread no topo da lista'}
        onClick={() => {
          actions.onPin()
          onClose()
        }}
      />
      <MenuItem
        icon="✎"
        label="Renomear"
        description="Edita o título da thread"
        onClick={() => {
          actions.onRename()
          onClose()
        }}
      />
      <MenuItem
        icon="⊟"
        label="Arquivar"
        description="Move para arquivadas, mantém o histórico"
        onClick={() => {
          actions.onArchive()
          onClose()
        }}
      />

      <hr className="atlas-ai-ctxmenu-sep" />

      <MenuItem
        icon="⎘"
        label="Copiar ID da sessão"
        description="Cola em outro Atlas para abrir esta thread"
        onClick={() => {
          actions.onCopyId()
          onClose()
        }}
      />
      <MenuItem
        icon="⤓"
        label="Copiar contexto completo (markdown)"
        description="Mensagens + metadata exportadas — cole em outro Atlas e ele tem tudo"
        accent
        onClick={() => {
          void actions.onCopyContext()
          onClose()
        }}
      />

      <hr className="atlas-ai-ctxmenu-sep" />

      <MenuItem
        icon={confirmingDelete ? '!' : '⊠'}
        label={confirmingDelete ? 'Confirmar apagar' : 'Apagar'}
        description={
          confirmingDelete
            ? 'Clique de novo para apagar a conversa e tirar da lista.'
            : 'Remove esta conversa permanentemente'
        }
        danger
        onClick={() => {
          if (!confirmingDelete) {
            setConfirmingDelete(true)
            return
          }
          actions.onDelete()
          onClose()
        }}
      />
    </div>
  )
}

interface MenuItemProps {
  icon: string
  label: string
  description: string
  onClick: () => void
  danger?: boolean
  accent?: boolean
}

function MenuItem({ icon, label, description, onClick, danger, accent }: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      className={`atlas-ai-ctxmenu-item${danger ? ' is-danger' : ''}${accent ? ' is-accent' : ''}`}
      onClick={onClick}
    >
      <span className="atlas-ai-ctxmenu-icon" aria-hidden="true">{icon}</span>
      <span className="atlas-ai-ctxmenu-text">
        <span className="atlas-ai-ctxmenu-label">{label}</span>
        <span className="atlas-ai-ctxmenu-desc">{description}</span>
      </span>
    </button>
  )
}
