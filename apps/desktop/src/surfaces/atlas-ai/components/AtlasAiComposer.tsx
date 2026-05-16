/**
 * Atlas AI · Composer (Claude.ai / Codex grade).
 *
 * Layout minimal Apple Pro:
 *
 *   ┌────────────────────────────────────────────────────────────┐
 *   │ [attachments strip horizontal, opcional]                    │
 *   │                                                             │
 *   │  textarea grande, respirável                                │
 *   │                                                             │
 *   │                                                             │
 *   ├────────────────────────────────────────────────────────────┤
 *   │ 📎 ⏷Programação · Dev   ⏷Auto (Atlas Decide)   ~0  →  Enviar │
 *   └────────────────────────────────────────────────────────────┘
 *
 * Diferenças vs versão antiga:
 *   - Controls Modo/Tarefa/Provider colapsados em 2 pills clicáveis
 *     (popover Apple-class) — não dominam o composer
 *   - Warning de workspace SÓ aparece quando tenta enviar (não pré-emptivo)
 *   - Textarea ganha todo o espaço vertical
 *   - Slash menu inline quando digitar `/`
 *   - Botão "anexar" vira icon-only com tooltip
 *   - Token count discreto antes do enviar
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MODE_OPTIONS, PROVIDER_OPTIONS, taskOptionsForMode } from '../contract'
import { useAtlasAiAttachments, type UploadOutput } from '../attachments/useAtlasAiAttachments'
import { extractUrls } from '../attachments/urlDetector'
import { AtlasAiAttachmentCard } from './AtlasAiAttachmentCard'
import { AtlasAiComposerMenu } from './AtlasAiComposerMenu'
import type { AtlasAiMode, AtlasAiProviderChoice, AtlasAiTask } from '../types'

interface AtlasAiComposerProps {
  draft: string
  onChange: (next: string) => void
  mode: AtlasAiMode
  onModeChange: (mode: AtlasAiMode) => void
  task: AtlasAiTask
  onTaskChange: (task: AtlasAiTask) => void
  provider: AtlasAiProviderChoice
  onProviderChange: (provider: AtlasAiProviderChoice) => void
  workspaceSlug: string | null
  sending: boolean
  sendError: string | null
  onSend: (extras?: { newThread?: boolean; attachments?: UploadOutput }) => Promise<void> | void
  onSendInNew: (extras?: { attachments?: UploadOutput }) => Promise<void> | void
  /** Altura max da textarea (vinda do useComposerSize via AtlasAiSurface).
   * Quando muda, textarea re-calcula altura imediatamente — drag responsivo. */
  textareaMaxPx?: number
}

const MIN_TEXTAREA_PX = 32
const MAX_TEXTAREA_PX_DEFAULT = 360

/**
 * Resolve max-height ALVO da textarea. Prioriza --composer-textarea-max
 * (CSS var seteada pelo useComposerSize.startDrag) — assim o drag handle
 * altera a altura tanto da resposta vazia (min-height) quanto do crescimento
 * automático com conteúdo. Fallback: constante default 360.
 *
 * BÔNUS: quando user faz drag, o min-height vira o próprio max (textarea
 * "cresce" instantaneamente, mesmo vazia), igual o user esperava.
 */
function readComposerTextareaMax(el: HTMLElement | null): number {
  if (!el) return MAX_TEXTAREA_PX_DEFAULT
  const wrap = el.closest('.atlas-ai-composer-wrap') as HTMLElement | null
  const target = wrap ?? document.documentElement
  const raw = getComputedStyle(target).getPropertyValue('--composer-textarea-max').trim()
  if (!raw) return MAX_TEXTAREA_PX_DEFAULT
  const parsed = parseFloat(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : MAX_TEXTAREA_PX_DEFAULT
}

function estimateTokens(text: string, attachments: UploadOutput | null): number {
  let tokens = text === '' ? 0 : Math.max(1, Math.round(text.length / 4))
  if (attachments) {
    tokens += attachments.uploaded_image_ids.length * 1200
    attachments.text_blocks.forEach((b) => {
      tokens += Math.max(1, Math.round(b.content.length / 4))
    })
    attachments.url_attachments.forEach(() => {
      tokens += 100
    })
  }
  return tokens
}

const SLASH_COMMANDS: Array<{ command: string; label: string; description: string }> = [
  { command: '/dev', label: 'Modo Programação', description: 'troca para Atlas Dev (programação)' },
  { command: '/ops', label: 'Modo Operacional', description: 'troca para Atlas Ops (operacional)' },
  { command: '/general', label: 'Modo Geral', description: 'troca para Atlas AI Geral' },
  { command: '/clear', label: 'Limpar', description: 'limpa o texto e os anexos' },
  { command: '/files', label: 'Anexar arquivos', description: 'abre o seletor de arquivos' },
]

const MODE_DESC: Record<AtlasAiMode, string> = {
  general: 'pesquisa, ideia, dúvida — sem exigir Workspace',
  operational: 'diagnóstico, próxima ação, risco operacional',
  programming: 'bug, debug, feature, review · exige Workspace',
}

export function AtlasAiComposer({
  draft,
  onChange,
  mode,
  onModeChange,
  task,
  onTaskChange,
  provider,
  onProviderChange,
  workspaceSlug,
  sending,
  sendError,
  onSend,
  onSendInNew,
  textareaMaxPx,
}: AtlasAiComposerProps) {
  const tasks = taskOptionsForMode(mode)
  const att = useAtlasAiAttachments()
  const [dragActive, setDragActive] = useState(false)
  const [showWorkspaceWarning, setShowWorkspaceWarning] = useState(false)
  const taRef = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const composerRef = useRef<HTMLDivElement | null>(null)

  const programmingMissingWorkspace = mode === 'programming' && !workspaceSlug
  const slashOpen = draft.startsWith('/') && draft.length <= 12
  const hasErroredAttachments = att.drafts.some((d) => d.status === 'error')
  const hasUnreadyAttachments = att.drafts.some(
    (d) => d.status === 'processing' || d.status === 'uploading',
  )
  const canSend =
    !sending &&
    !hasUnreadyAttachments &&
    (draft.trim().length > 0 || att.drafts.some((d) => d.status === 'ready' || d.status === 'uploaded'))

  // URL detector — sugere converter URL no texto em anexo rico
  const detectedUrls = useMemo(() => extractUrls(draft), [draft])
  const newUrls = useMemo(() => {
    const already = new Set(
      att.drafts.filter((d) => d.kind === 'url').map((d) => (d as { url: string }).url),
    )
    return detectedUrls.filter((u) => !already.has(u))
  }, [detectedUrls, att.drafts])

  // Auto-resize textarea · MAX dinâmico (prop textareaMaxPx tem prioridade
  // sobre CSS var, fallback default). Min vira o próprio max quando user
  // arrastou pra cima, pra textarea "crescer" instantaneamente mesmo vazia.
  useEffect(() => {
    const ta = taRef.current
    if (!ta) return
    const dynamicMax = textareaMaxPx ?? readComposerTextareaMax(ta)
    // Quando user arrastou pra grande, min = max (textarea grande mesmo vazia).
    // Quando default (≤360), min continua 88 (auto-grow com conteúdo).
    const minTarget = dynamicMax > MAX_TEXTAREA_PX_DEFAULT ? dynamicMax : MIN_TEXTAREA_PX
    ta.style.height = 'auto'
    const target = Math.min(dynamicMax, Math.max(minTarget, ta.scrollHeight))
    ta.style.height = `${target}px`
  }, [draft, textareaMaxPx])

  // Paste handler (imagens/screenshots)
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      if (!composerRef.current?.contains(document.activeElement)) return
      const items = e.clipboardData?.items
      if (!items) return
      const fileList: File[] = []
      for (const it of items) {
        if (it.kind === 'file') {
          const f = it.getAsFile()
          if (f) fileList.push(f)
        }
      }
      if (fileList.length > 0) {
        e.preventDefault()
        void att.addFiles(fileList, 'paste')
      }
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [att])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault()
      setDragActive(true)
    }
  }, [])
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (e.currentTarget === e.target) setDragActive(false)
  }, [])
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)
      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) void att.addFiles(files, 'drop')
      const uriList = e.dataTransfer.getData('text/uri-list')
      if (uriList) {
        uriList
          .split(/\r?\n/)
          .filter((u) => u && !u.startsWith('#'))
          .forEach((u) => void att.addUrl(u, 'paste'))
      }
    },
    [att],
  )

  const handlePickClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFilesPicked = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) void att.addFiles(files, 'picker')
      e.target.value = ''
    },
    [att],
  )

  const applySlash = useCallback(
    (cmd: string) => {
      if (cmd === '/dev') {
        onModeChange('programming')
        onChange('')
      } else if (cmd === '/ops') {
        onModeChange('operational')
        onChange('')
      } else if (cmd === '/general') {
        onModeChange('general')
        onChange('')
      } else if (cmd === '/clear') {
        onChange('')
        att.clear()
      } else if (cmd === '/files') {
        onChange('')
        handlePickClick()
      }
    },
    [onModeChange, onChange, att, handlePickClick],
  )

  const handleSendInner = useCallback(
    async (newThread: boolean) => {
      if (!canSend) return
      // Validação tardia: só mostra warning quando o operador tenta enviar
      if (programmingMissingWorkspace) {
        setShowWorkspaceWarning(true)
        return
      }
      try {
        const payload = await att.uploadAll()
        if (newThread) {
          await onSendInNew({ attachments: payload })
        } else {
          await onSend({ newThread: false, attachments: payload })
        }
        att.clear()
      } catch {
        /* erros já refletidos nos cards */
      }
    },
    [canSend, programmingMissingWorkspace, att, onSend, onSendInNew],
  )

  const handleKey = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (slashOpen && (e.key === 'Tab' || e.key === 'Enter')) {
        const first = SLASH_COMMANDS.find((c) => c.command.startsWith(draft))
        if (first) {
          e.preventDefault()
          applySlash(first.command)
          return
        }
      }
      // Enter envia; Shift+Enter quebra linha (padrão moderno chat).
      // ⌘+Enter / Ctrl+Enter mantidos como fallback equivalente.
      if (e.key === 'Enter' && !e.shiftKey && !e.altKey) {
        e.preventDefault()
        void handleSendInner(false)
      }
    },
    [slashOpen, draft, applySlash, handleSendInner],
  )

  const tokens = estimateTokens(draft, null)
  const counters = useMemo(() => {
    const c = { img: 0, pdf: 0, txt: 0, url: 0 }
    att.drafts.forEach((d) => {
      if (d.kind === 'image') c.img += 1
      else if (d.kind === 'pdf') c.pdf += 1
      else if (d.kind === 'url') c.url += 1
      else c.txt += 1
    })
    return c
  }, [att.drafts])

  // Label enxuto · "dev" / "operacional" / "geral" (eyebrow já diz "Modo")
  const modePillLabel =
    mode === 'programming' ? task : mode === 'operational' ? 'operacional' : 'geral'

  // Provider label compacto · "auto" / "claude" / "codex" / "gemini" / "conselho"
  const currentProvider = PROVIDER_OPTIONS.find((p) => p.value === provider)
  const providerPillLabel = (currentProvider?.label ?? 'auto').toLowerCase().split(' ')[0]

  // Combinamos Modo+Tarefa num menu único — quando programming, apresentamos as tasks dentro
  // como sub-items; para outros modos só lista os 3 modos.
  type ModeKey = `mode:${AtlasAiMode}` | `task:${AtlasAiTask}`
  const modeMenuValue: ModeKey = mode === 'programming' ? `task:${task}` : `mode:${mode}`
  const modeMenuOptions: Array<{
    value: ModeKey
    label: string
    description?: string
    badge?: React.ReactNode
  }> = useMemo(() => {
    const opts: Array<{ value: ModeKey; label: string; description?: string; badge?: React.ReactNode }> = []
    for (const m of MODE_OPTIONS) {
      if (m.value === 'programming') {
        // Adiciona o group header como cada task de programming
        for (const t of tasks) {
          opts.push({
            value: `task:${t.value}` as ModeKey,
            label: `Programação · ${t.label}`,
            description: t.sub,
          })
        }
      } else {
        opts.push({
          value: `mode:${m.value}` as ModeKey,
          label: m.label,
          description: MODE_DESC[m.value],
        })
      }
    }
    return opts
  }, [tasks])

  const handleModeMenuChange = useCallback(
    (next: ModeKey) => {
      if (next.startsWith('mode:')) {
        const m = next.slice(5) as AtlasAiMode
        onModeChange(m)
      } else if (next.startsWith('task:')) {
        const t = next.slice(5) as AtlasAiTask
        onModeChange('programming')
        onTaskChange(t)
      }
    },
    [onModeChange, onTaskChange],
  )

  return (
    <section
      ref={composerRef}
      className={`atlas-ai-composer atlas-ai-composer-v2${dragActive ? ' is-drag-active' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {dragActive ? (
        <div className="atlas-ai-composer-dropmask" aria-hidden="true">
          <span>solte para anexar</span>
        </div>
      ) : null}

      {/* ATTACHMENT STRIP (acima do textarea) */}
      {att.drafts.length > 0 ? (
        <div className="atlas-ai-att-strip" role="list" aria-label="Anexos">
          {att.drafts.map((d) => (
            <AtlasAiAttachmentCard key={d.id} draft={d} onRemove={att.remove} />
          ))}
        </div>
      ) : null}

      {/* URL HINTS (chip discreto para converter URL detectado em anexo rico) */}
      {newUrls.length > 0 && !sending ? (
        <div className="atlas-ai-url-hints" role="region" aria-label="URLs detectadas">
          {newUrls.slice(0, 3).map((u) => {
            let host = u
            try {
              host = new URL(u).hostname
            } catch {
              /* fallback ao bruto */
            }
            return (
              <button
                key={u}
                type="button"
                className="atlas-ai-url-hint"
                onClick={() => void att.addUrl(u, 'paste')}
                title="Anexar como link rico (com título, thumbnail, duração)"
              >
                ↗ anexar {host}
              </button>
            )
          })}
        </div>
      ) : null}

      {/* TEXTAREA — protagonista */}
      <div className="atlas-ai-composer-textarea-wrap">
        <textarea
          ref={taRef}
          className="atlas-ai-textarea atlas-ai-textarea-v2"
          value={draft}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
          placeholder={
            mode === 'programming'
              ? 'Bug, debug, feature ou review — arrasta arquivo ou cola screenshot.'
              : mode === 'operational'
                ? 'Diagnóstico, próxima ação ou risco — cole contexto se útil.'
                : 'Pesquisa, ideia ou dúvida — solte arquivo ou cole conteúdo.'
          }
          rows={3}
          maxLength={50000}
          disabled={sending}
        />

        {slashOpen ? (
          <div className="atlas-ai-slash-menu" role="listbox" aria-label="Comandos rápidos">
            {SLASH_COMMANDS.filter((c) => c.command.startsWith(draft)).map((c) => (
              <button
                key={c.command}
                type="button"
                role="option"
                aria-selected="false"
                className="atlas-ai-slash-item"
                onMouseDown={(e) => {
                  e.preventDefault()
                  applySlash(c.command)
                }}
              >
                <span className="atlas-ai-slash-cmd">{c.command}</span>
                <span className="atlas-ai-slash-label">{c.label}</span>
                <span className="atlas-ai-slash-desc">{c.description}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* FOOTER BAR — minimal, focado em ação */}
      <div className="atlas-ai-composer-bar">
        <div className="atlas-ai-composer-bar-left">
          <button
            type="button"
            className="atlas-ai-icon-btn"
            onClick={handlePickClick}
            disabled={sending}
            aria-label="Anexar arquivos"
            title="Anexar arquivos (também aceita arrastar e colar)"
          >
            <svg viewBox="0 0 18 18" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.2 8 8 14.2a3.6 3.6 0 0 1-5.1-5.1l6.6-6.6a2.4 2.4 0 0 1 3.4 3.4l-6.6 6.6a1.2 1.2 0 0 1-1.7-1.7L11 5" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,text/*,.md,.json,.yaml,.yml,.toml,.csv,.log,.ts,.tsx,.js,.jsx,.py,.rb,.rs,.go,.java,.c,.cpp,.cs,.php,.swift,.kt,.scala,.sh,.bash,.zsh,.sql,.html,.css,.scss,.less,.xml,.dockerfile,.dart,.lua"
            onChange={handleFilesPicked}
          />

          <AtlasAiComposerMenu<`mode:${AtlasAiMode}` | `task:${AtlasAiTask}`>
            triggerLabel={modePillLabel}
            triggerEyebrow={undefined}
            options={modeMenuOptions}
            value={modeMenuValue}
            onChange={handleModeMenuChange}
            disabled={sending}
            ariaLabel="Modo Atlas AI"
          />

          <AtlasAiComposerMenu<AtlasAiProviderChoice>
            triggerLabel={providerPillLabel}
            triggerEyebrow={undefined}
            options={PROVIDER_OPTIONS.map((p) => ({
              value: p.value,
              label: p.label,
              description: p.sub,
            }))}
            value={provider}
            onChange={onProviderChange}
            disabled={sending}
            align="end"
            ariaLabel="Provider Atlas AI"
          />
        </div>

        <div className="atlas-ai-composer-bar-right">
          <span className="atlas-ai-composer-counter">
            {sending ? (
              <span className="atlas-ai-composer-counter-busy">enviando…</span>
            ) : hasUnreadyAttachments ? (
              <span className="atlas-ai-composer-counter-busy">processando anexos…</span>
            ) : (
              <>
                {counters.img + counters.pdf + counters.txt + counters.url > 0 ? (
                  <span className="atlas-ai-composer-att-count">
                    {[
                      counters.img && `${counters.img} img`,
                      counters.pdf && `${counters.pdf} pdf`,
                      counters.txt && `${counters.txt} txt`,
                      counters.url && `${counters.url} url`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                ) : null}
                <span className="atlas-ai-composer-tokens">
                  ~{tokens.toLocaleString('pt-BR')} tokens
                </span>
              </>
            )}
          </span>

          <button
            type="button"
            className="atlas-ai-icon-btn"
            onClick={() => void handleSendInner(true)}
            disabled={!canSend}
            title="Nova thread (envia sem entrar na atual)"
            aria-label="Nova thread"
          >
            <svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <line x1="9" y1="3" x2="9" y2="15" />
              <line x1="3" y1="9" x2="15" y2="9" />
            </svg>
          </button>

          <button
            type="button"
            className="atlas-ai-send-btn"
            onClick={() => void handleSendInner(false)}
            disabled={!canSend}
          >
            <span>enviar</span>
            <svg viewBox="0 0 14 14" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="2.5" y1="7" x2="11.5" y2="7" />
              <polyline points="7 2.5 11.5 7 7 11.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Warnings inline · só quando o operador toca em algo inválido */}
      {showWorkspaceWarning && programmingMissingWorkspace ? (
        <p className="atlas-ai-warning-line">
          Atlas Dev exige Workspace — selecione um Projeto no topbar antes de enviar.
        </p>
      ) : null}
      {sendError ? <p className="atlas-ai-error-line">{sendError}</p> : null}
      {hasErroredAttachments ? (
        <p className="atlas-ai-error-line">
          Um ou mais anexos falharam — remova ou troque antes de enviar.
        </p>
      ) : null}
    </section>
  )
}
