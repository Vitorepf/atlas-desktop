/**
 * Atlas AI · Conversation Surface (rails-based, 12h premium workbench).
 *
 * Layout idêntico ao Atlas Code:
 *   row 1: topbar (shell global)
 *   row 2: header-bar (3 cols full-width)
 *   row 3: left-rail │ stage │ right-rail
 *
 * Rails fixos com drag-resize e collapse via store persistente. Stage
 * central respira (hero + conversation + composer integrados em coluna
 * de altura plena).
 *
 * Canon:
 *   - docs/engineering-knowledge-base/atlas-ai-conversation-surface-and-atlas-dev-v1.md
 *   - docs/engineering-knowledge-base/atlas-code-multi-project-workspace-os.md
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AtlasWorkspaceProfile } from '@atlas/domain'
import type { Surface } from '../../hooks/useSurface'
// ProjectScopeStrip removido do Atlas AI: era redundante (info já vive
// no WorkspacePill do topbar). Para abrir Project Profile, mantemos um
// link compacto "ver perfil" se necessário no futuro.
import { useAtlasAiLayoutStore } from '../../state/atlasAiLayoutStore'
import { AtlasAiComposer } from './components/AtlasAiComposer'
import { AtlasAiConversation } from './components/AtlasAiConversation'
import { AtlasAiEmpty } from './components/AtlasAiEmpty'
import { AtlasAiHero } from './components/AtlasAiHero'
import { AtlasAiPromotionPanel } from './components/AtlasAiPromotionPanel'
import { AtlasAiSidePanel } from './components/AtlasAiSidePanel'
import { AtlasAiThreadContextMenu, type ContextMenuPos } from './components/AtlasAiThreadContextMenu'
import { AtlasAiThreadList } from './components/AtlasAiThreadList'
import { useAtlasAiColumnSizing } from './layout/useAtlasAiColumnSizing'
import { serializeThreadAsMarkdown } from './threadExport'
import { useAtlasAi } from './useAtlasAi'
import { useCalmaria } from './useCalmaria'
import type { AiThreadSummary } from './types'
import './atlas-ai.css'

const PINNED_STORAGE = 'atlas-desktop:atlas-ai-pinned-threads'

function loadPinned(): Set<string> {
  try {
    const raw = sessionStorage.getItem(PINNED_STORAGE)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as unknown
    if (Array.isArray(arr)) return new Set(arr.filter((x): x is string => typeof x === 'string'))
  } catch {
    /* ignore */
  }
  return new Set()
}

function savePinned(ids: Set<string>) {
  try {
    sessionStorage.setItem(PINNED_STORAGE, JSON.stringify(Array.from(ids)))
  } catch {
    /* ignore */
  }
}

interface AtlasAiSurfaceProps {
  activeWorkspaceSlug?: string | null
  activeWorkspaceName?: string | null
  activeWorkspace?: AtlasWorkspaceProfile | null
  defaultWorkspaceSlug?: string | null
  onRequestSurfaceChange?: (surface: Surface) => void
  onOpenWorkspaceProfile?: () => void
}

export function AtlasAiSurface({
  activeWorkspaceSlug = null,
  activeWorkspaceName = null,
  // activeWorkspace + defaultWorkspaceSlug + onOpenWorkspaceProfile foram
  // usados pelo ProjectScopeStrip que removemos da header bar (redundância
  // com o WorkspacePill global do topbar). Props mantidos no contrato pra
  // surface ainda receber tudo via SurfaceHost, mesmo que não usemos agora.
  activeWorkspace: _activeWorkspace = null,
  defaultWorkspaceSlug: _defaultWorkspaceSlug = null,
  onRequestSurfaceChange: _onRequestSurfaceChange,
  onOpenWorkspaceProfile: _onOpenWorkspaceProfile,
}: AtlasAiSurfaceProps) {
  const atlas = useAtlasAi(activeWorkspaceSlug)
  const { calmaria, toggle: toggleCalmaria } = useCalmaria()
  const [composerDraft, setComposerDraft] = useState<string>('')
  const [promotionOpen, setPromotionOpen] = useState<boolean>(false)
  const [retrying, setRetrying] = useState<boolean>(false)
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => loadPinned())
  const [ctxMenu, setCtxMenu] = useState<{ thread: AiThreadSummary; pos: ContextMenuPos } | null>(null)

  // Layout rails (drag-resize + collapse persist)
  const { setLeftResizeNode, setRightResizeNode } = useAtlasAiColumnSizing()
  const leftCollapsed = useAtlasAiLayoutStore((s) => s.leftCollapsed)
  const rightCollapsed = useAtlasAiLayoutStore((s) => s.rightCollapsed)
  const toggleLeft = useAtlasAiLayoutStore((s) => s.toggleLeftCollapsed)
  const toggleRight = useAtlasAiLayoutStore((s) => s.toggleRightCollapsed)

  // Sincroniza workspace selecionado quando o topbar do shell muda.
  const { workspaceSlug, setWorkspaceSlug } = atlas
  useEffect(() => {
    if (activeWorkspaceSlug !== workspaceSlug) {
      setWorkspaceSlug(activeWorkspaceSlug)
    }
  }, [activeWorkspaceSlug, workspaceSlug, setWorkspaceSlug])

  // Esc cancela streaming em curso (Codex CLI canon "esc to interrupt").
  const { cancelPending, sending, pendingTrace } = atlas
  useEffect(() => {
    const isStreaming =
      sending ||
      (pendingTrace !== null &&
        (pendingTrace.status === 'queued' ||
          pendingTrace.status === 'running' ||
          pendingTrace.status === 'processing'))
    if (!isStreaming) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Não cancela se estiver focado em algum input (deixa o operador
        // limpar texto do composer com Esc também). Cancel só quando o
        // foco está em algo não-text-editable.
        const ae = document.activeElement
        const isEditable =
          ae instanceof HTMLElement &&
          (ae.tagName === 'TEXTAREA' || ae.tagName === 'INPUT' || ae.isContentEditable)
        if (isEditable) return
        e.preventDefault()
        cancelPending()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sending, pendingTrace, cancelPending])

  const conversation = useMemo(
    () => ({
      detail: atlas.threadDetail,
      loading: atlas.threadDetailLoading,
      error: atlas.threadDetailError,
      pendingTrace: atlas.pendingTrace,
      pendingUserMessage: atlas.pendingUserMessage,
      sending: atlas.sending,
    }),
    [
      atlas.threadDetail,
      atlas.threadDetailLoading,
      atlas.threadDetailError,
      atlas.pendingTrace,
      atlas.pendingUserMessage,
      atlas.sending,
    ],
  )

  const handleSend = useCallback(
    async (options?: {
      newThread?: boolean
      attachments?: {
        uploaded_image_ids: string[]
        uploaded_document_ids: string[]
        text_blocks: Array<{
          file_name: string
          mime_type: string
          language: string | null
          content: string
          page_count?: number
        }>
        url_attachments: Array<{
          url: string
          kind: string
          title: string | null
          author: string | null
          duration_sec: number | null
          thumbnail_url: string | null
          ref_id: string | null
        }>
      }
    }) => {
      // Clear sincrônico: a textarea esvazia IMEDIATAMENTE para o operador
      // ver que o gesto foi capturado. Se a chamada falhar restauramos o
      // texto pra ele poder editar e tentar de novo sem retypear.
      const sendingText = composerDraft
      setComposerDraft('')
      const trace = await atlas.send(sendingText, {
        newThread: options?.newThread,
        uploadedImageIds: options?.attachments?.uploaded_image_ids,
        uploadedDocumentIds: options?.attachments?.uploaded_document_ids,
        textBlocks: options?.attachments?.text_blocks,
        urlAttachments: options?.attachments?.url_attachments,
      })
      if (!trace && sendingText.trim() !== '') {
        setComposerDraft(sendingText)
      }
    },
    [atlas, composerDraft],
  )

  const handleUseChip = useCallback((text: string) => {
    setComposerDraft(text)
    window.setTimeout(() => {
      const ta = document.querySelector<HTMLTextAreaElement>('.atlas-ai-textarea')
      if (ta) {
        ta.focus()
        ta.setSelectionRange(ta.value.length, ta.value.length)
      }
    }, 60)
  }, [])

  const handleRetryThreads = useCallback(async () => {
    setRetrying(true)
    try {
      await atlas.refreshThreads()
    } finally {
      setRetrying(false)
    }
  }, [atlas])

  const togglePin = useCallback((id: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      savePinned(next)
      return next
    })
  }, [])

  const handleThreadContextMenu = useCallback(
    (thread: AiThreadSummary, ev: React.MouseEvent) => {
      setCtxMenu({ thread, pos: { x: ev.clientX, y: ev.clientY } })
    },
    [],
  )

  const handleCopyContext = useCallback(
    async (threadId: string) => {
      const detail = await atlas.fetchThreadDetail(threadId)
      if (!detail) {
        await navigator.clipboard.writeText(`Atlas AI thread ${threadId} · backend indisponível para export.`).catch(() => {})
        return
      }
      const md = serializeThreadAsMarkdown(detail)
      try {
        await navigator.clipboard.writeText(md)
      } catch {
        /* clipboard sandbox safe ignore */
      }
    },
    [atlas],
  )

  const handleRename = useCallback(
    (thread: AiThreadSummary) => {
      const proposed = window.prompt('Renomear thread', thread.title?.trim() || '')
      if (proposed === null) return
      const trimmed = proposed.trim()
      if (trimmed === '' || trimmed === thread.title) return
      void atlas.renameThread(thread.id, trimmed)
    },
    [atlas],
  )

  const handleDelete = useCallback(
    (thread: AiThreadSummary) => {
      const ok = window.confirm(
        `Encerrar a thread "${thread.title?.trim() || '(sem título)'}" permanentemente?\n\nA conversa fica preservada com status=closed mas não aparece mais nas listas ativas.`,
      )
      if (!ok) return
      void atlas.closeThread(thread.id)
    },
    [atlas],
  )

  if (atlas.mode === 'offline') {
    return (
      <main className="atlas-ai-surface atlas-ai-stage atlas-ai-stage-fallback">
        <AtlasAiEmpty
          headline="Atlas AI offline"
          detail="Atlas Desktop está sem ligação com o kernel. Nenhuma thread é inventada — a conversa volta quando o backend responder."
        />
      </main>
    )
  }

  // Hero some no instante que o usuário envia (mesmo antes do createAiThread
  // retornar) — assim o operador vê a bolha otimista + indicator imediato.
  const isHero = atlas.selectedThreadId === null && atlas.pendingUserMessage === null

  return (
    <>
      {/* HEADER BAR — full-width acima dos rails (igual ObraBar do Code) */}
      <header className="atlas-ai-header-bar">
        <div className="atlas-ai-header-bar-start">
          <button
            type="button"
            className="atlas-ai-rail-toggle"
            onClick={toggleLeft}
            aria-pressed={!leftCollapsed}
            title={leftCollapsed ? 'Mostrar conversas (⌥⌘B)' : 'Esconder conversas (⌥⌘B)'}
            aria-label="Alternar lateral de conversas"
          >
            <svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2.5" y="3.5" width="13" height="11" rx="1.5" />
              <line x1="7" y1="3.5" x2="7" y2="14.5" />
            </svg>
          </button>
          <div className="atlas-ai-header-bar-title">
            <h1>Atlas AI</h1>
            {activeWorkspaceName ? (
              <p className="atlas-ai-header-bar-sub">
                workspace · <span className="atlas-ai-header-bar-sub-name">{activeWorkspaceName}</span>
              </p>
            ) : (
              <p className="atlas-ai-header-bar-sub">uma única inteligência</p>
            )}
          </div>
        </div>
        <div className="atlas-ai-header-bar-meta">
          <button
            type="button"
            className={`atlas-ai-link atlas-ai-calmaria-toggle${calmaria ? ' is-active' : ''}`}
            onClick={toggleCalmaria}
            title={calmaria ? 'Calmaria ON · só texto + composer · Cmd+Shift+. alterna' : 'Calmaria · esconde badges/receipts/decisões · Cmd+Shift+. ativa'}
            aria-pressed={calmaria}
            aria-label="Alternar Calmaria mode"
          >
            <svg
              viewBox="0 0 14 14"
              width="11"
              height="11"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="atlas-ai-calmaria-glyph"
            >
              <circle cx="7" cy="7" r="5.4" />
              <path d="M9.2 3 A4.4 4.4 0 0 0 9.2 11" fill="currentColor" stroke="none" opacity="0.85" />
            </svg>
            calmaria{calmaria ? <span className="atlas-ai-calmaria-on"> · ativa</span> : null}
          </button>
          <button
            type="button"
            className="atlas-ai-rail-toggle atlas-ai-rail-toggle-right"
            onClick={toggleRight}
            aria-pressed={!rightCollapsed}
            title={rightCollapsed ? 'Mostrar painel lateral (⌥⌘P)' : 'Esconder painel lateral (⌥⌘P)'}
            aria-label="Alternar painel lateral"
          >
            <svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2.5" y="3.5" width="13" height="11" rx="1.5" />
              <line x1="11" y1="3.5" x2="11" y2="14.5" />
            </svg>
          </button>
        </div>
      </header>

      {/* LEFT RAIL — Conversas */}
      <aside className="atlas-ai-rail atlas-ai-rail-left" aria-label="Conversas Atlas AI">
        <AtlasAiThreadList
          threads={atlas.threads}
          loading={atlas.threadsLoading}
          error={atlas.threadsError}
          retrying={retrying}
          selectedId={atlas.selectedThreadId}
          modeFilter={atlas.modeFilter}
          onModeFilter={atlas.setModeFilter}
          onRefresh={handleRetryThreads}
          onSelect={atlas.selectThread}
          onNewThread={() => atlas.selectThread(null)}
          pinnedIds={pinnedIds}
          onContextMenu={handleThreadContextMenu}
        />
      </aside>

      {/* RESIZER LEFT */}
      <div
        ref={setLeftResizeNode}
        aria-label="Redimensionar lateral de conversas"
        className="atlas-ai-column-resizer atlas-ai-column-resizer-left"
        role="separator"
      />

      {/* STAGE central — hero ou conversation + composer integrado */}
      <main className={`atlas-ai-stage${isHero ? ' is-hero' : ''}`}>
        <div className="atlas-ai-stage-scroll">
          {isHero ? (
            <AtlasAiHero
              mode={atlas.composerMode}
              workspaceName={activeWorkspaceName}
              threadCount={atlas.threads.length}
              onUseChip={handleUseChip}
            />
          ) : (
            <AtlasAiConversation
              loading={conversation.loading}
              detail={conversation.detail}
              error={conversation.error}
              pendingTrace={conversation.pendingTrace}
              pendingUserMessage={conversation.pendingUserMessage}
              sending={conversation.sending}
              onArchive={atlas.archiveSelectedThread}
              onPromote={() => setPromotionOpen(true)}
              onCancel={atlas.cancelPending}
            />
          )}
        </div>

        <div className="atlas-ai-stage-composer">
          <AtlasAiComposer
            draft={composerDraft}
            onChange={setComposerDraft}
            mode={atlas.composerMode}
            onModeChange={atlas.setComposerMode}
            task={atlas.composerTask}
            onTaskChange={atlas.setComposerTask}
            provider={atlas.composerProvider}
            onProviderChange={atlas.setComposerProvider}
            sending={atlas.sending}
            sendError={atlas.sendError}
            workspaceSlug={atlas.workspaceSlug ?? atlas.threadDetail?.workspace ?? null}
            onSend={(extras) =>
              handleSend({
                newThread: extras?.newThread ?? atlas.selectedThreadId === null,
                attachments: extras?.attachments,
              })
            }
            onSendInNew={(extras) =>
              handleSend({ newThread: true, attachments: extras?.attachments })
            }
          />
        </div>
      </main>

      {/* RESIZER RIGHT */}
      <div
        ref={setRightResizeNode}
        aria-label="Redimensionar painel lateral"
        className="atlas-ai-column-resizer atlas-ai-column-resizer-right"
        role="separator"
      />

      {/* RIGHT RAIL — Contexto / Plano */}
      <aside className="atlas-ai-rail atlas-ai-rail-right" aria-label="Contexto Atlas AI">
        <AtlasAiSidePanel
          workspaceSlug={atlas.workspaceSlug}
          workspaceName={activeWorkspaceName}
          thread={atlas.threadDetail}
          pendingTrace={atlas.pendingTrace}
          mode={atlas.composerMode}
          task={atlas.composerTask}
          provider={atlas.composerProvider}
        />
      </aside>

      <AtlasAiPromotionPanel
        open={promotionOpen}
        threadId={atlas.selectedThreadId}
        workspaceSlug={atlas.workspaceSlug}
        onClose={() => setPromotionOpen(false)}
        onPromoted={() => {
          if (atlas.selectedThreadId) atlas.selectThread(atlas.selectedThreadId)
          void atlas.refreshThreads()
        }}
      />

      {ctxMenu ? (
        <AtlasAiThreadContextMenu
          pos={ctxMenu.pos}
          threadTitle={ctxMenu.thread.title?.trim() || '(sem título)'}
          actions={{
            isPinned: pinnedIds.has(ctxMenu.thread.id),
            onPin: () => togglePin(ctxMenu.thread.id),
            onRename: () => handleRename(ctxMenu.thread),
            onArchive: () => void atlas.archiveThread(ctxMenu.thread.id),
            onCopyId: () => {
              void navigator.clipboard.writeText(ctxMenu.thread.id).catch(() => {})
            },
            onCopyContext: () => handleCopyContext(ctxMenu.thread.id),
            onDelete: () => handleDelete(ctxMenu.thread),
          }}
          onClose={() => setCtxMenu(null)}
        />
      ) : null}
    </>
  )
}
