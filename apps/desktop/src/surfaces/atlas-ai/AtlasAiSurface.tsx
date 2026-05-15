/**
 * Atlas AI · Conversation Surface (Meta 6 v1).
 *
 * Tab top-level no Atlas Desktop. Uma única inteligência (Atlas AI) com modos
 * Geral, Operacional e Programação (Atlas Dev). Histórico vem de `ai_threads`;
 * envio passa por `/ai/interactions`. Não cria storage paralelo. Não exige
 * Obra. Programação exige Workspace.
 *
 * Canon:
 *   - docs/engineering-knowledge-base/atlas-ai-conversation-surface-and-atlas-dev-v1.md
 *   - docs/engineering-knowledge-base/atlas-code-multi-project-workspace-os.md
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AtlasWorkspaceProfile } from '@atlas/domain'
import type { Surface } from '../../hooks/useSurface'
import { ProjectScopeStrip } from '../../shared/projectProfile/ProjectScopeStrip'
import { AtlasAiComposer } from './components/AtlasAiComposer'
import { AtlasAiConversation } from './components/AtlasAiConversation'
import { AtlasAiContextPanel } from './components/AtlasAiContextPanel'
import { AtlasAiEmpty } from './components/AtlasAiEmpty'
import { AtlasAiPromotionPanel } from './components/AtlasAiPromotionPanel'
import { AtlasAiThreadList } from './components/AtlasAiThreadList'
import { useAtlasAi } from './useAtlasAi'
import './atlas-ai.css'

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
  activeWorkspace = null,
  defaultWorkspaceSlug = null,
  onRequestSurfaceChange,
  onOpenWorkspaceProfile,
}: AtlasAiSurfaceProps) {
  const atlas = useAtlasAi(activeWorkspaceSlug)
  const [composerDraft, setComposerDraft] = useState<string>('')
  const [promotionOpen, setPromotionOpen] = useState<boolean>(false)

  // Sincroniza workspace selecionado quando o topbar do shell muda.
  const { workspaceSlug, setWorkspaceSlug } = atlas
  useEffect(() => {
    if (activeWorkspaceSlug !== workspaceSlug) {
      setWorkspaceSlug(activeWorkspaceSlug)
    }
  }, [activeWorkspaceSlug, workspaceSlug, setWorkspaceSlug])

  const conversation = useMemo(
    () => ({
      detail: atlas.threadDetail,
      loading: atlas.threadDetailLoading,
      error: atlas.threadDetailError,
      pendingTrace: atlas.pendingTrace,
    }),
    [atlas.threadDetail, atlas.threadDetailLoading, atlas.threadDetailError, atlas.pendingTrace],
  )

  const handleSend = useCallback(
    async (options?: { newThread?: boolean }) => {
      const trace = await atlas.send(composerDraft, options)
      if (trace) {
        setComposerDraft('')
      }
    },
    [atlas, composerDraft],
  )

  if (atlas.mode === 'offline') {
    return (
      <main className="atlas-ai-surface">
        <AtlasAiEmpty
          headline="Atlas AI offline"
          detail="Atlas Desktop está sem ligação com o kernel. Nenhuma thread é inventada — a conversa volta quando o backend responder."
        />
      </main>
    )
  }

  return (
    <main className="atlas-ai-surface">
      <header className="atlas-ai-header">
        <div className="atlas-ai-header-title">
          <h1>Atlas AI</h1>
          <p className="atlas-ai-header-sub">
            Uma única inteligência. Geral, Operacional e Programação são modos do mesmo Atlas AI.
            {activeWorkspaceName ? ` Workspace: ${activeWorkspaceName}.` : ''}
          </p>
        </div>
        <div className="atlas-ai-header-meta">
          <ProjectScopeStrip
            active={activeWorkspace}
            activeSlug={activeWorkspaceSlug}
            defaultSlug={defaultWorkspaceSlug}
            surfaceLabel="Atlas AI"
            onOpenProfile={onOpenWorkspaceProfile}
          />
          <button
            type="button"
            className="atlas-ai-link"
            onClick={() => onRequestSurfaceChange?.('code')}
            title="Atlas Code: cabine para problemas ultra-hard"
          >
            promover para Forge →
          </button>
        </div>
      </header>

      <section className="atlas-ai-body">
        <aside className="atlas-ai-history-col">
          <AtlasAiThreadList
            threads={atlas.threads}
            loading={atlas.threadsLoading}
            error={atlas.threadsError}
            selectedId={atlas.selectedThreadId}
            modeFilter={atlas.modeFilter}
            onModeFilter={atlas.setModeFilter}
            onRefresh={atlas.refreshThreads}
            onSelect={atlas.selectThread}
            onNewThread={() => atlas.selectThread(null)}
          />
        </aside>

        <section className="atlas-ai-conversation-col">
          {atlas.selectedThreadId ? (
            <AtlasAiConversation
              loading={conversation.loading}
              detail={conversation.detail}
              error={conversation.error}
              pendingTrace={conversation.pendingTrace}
              onArchive={atlas.archiveSelectedThread}
              onPromote={() => setPromotionOpen(true)}
            />
          ) : (
            <AtlasAiEmpty
              headline="Nenhuma conversa selecionada"
              detail={
                atlas.threads.length === 0
                  ? 'Nenhuma thread Atlas AI neste workspace. Comece a digitar abaixo — o backend cria a thread no primeiro envio.'
                  : 'Escolha uma thread na coluna esquerda ou comece uma nova com o composer.'
              }
            />
          )}

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
            workspaceSlug={atlas.workspaceSlug}
            onSend={() => handleSend({ newThread: atlas.selectedThreadId === null })}
            onSendInNew={() => handleSend({ newThread: true })}
          />
        </section>

        <aside className="atlas-ai-context-col">
          <AtlasAiContextPanel
            workspaceSlug={atlas.workspaceSlug}
            workspaceName={activeWorkspaceName}
            thread={atlas.threadDetail}
            pendingTrace={atlas.pendingTrace}
            mode={atlas.composerMode}
            task={atlas.composerTask}
            provider={atlas.composerProvider}
          />
        </aside>
      </section>

      <AtlasAiPromotionPanel
        open={promotionOpen}
        threadId={atlas.selectedThreadId}
        workspaceSlug={atlas.workspaceSlug}
        onClose={() => setPromotionOpen(false)}
        onPromoted={() => {
          // Recarrega thread detail e a lista para refletir o link com a Obra/registro.
          if (atlas.selectedThreadId) atlas.selectThread(atlas.selectedThreadId)
          void atlas.refreshThreads()
        }}
      />
    </main>
  )
}
