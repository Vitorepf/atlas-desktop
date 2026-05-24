import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  ATLAS_COMPUTE_EFFORT_OPTIONS,
  labelAtlasComputeEffortShort,
  estimateRichInputTokens,
  extractUrls,
  summarizeRichInputDrafts,
  type AtlasComputeEffortChoice,
  type AtlasRichInputAttachmentsApi,
  type AtlasRichInputPayload,
} from '../../lib/rich-input'
import { AtlasRichInputAttachmentCard } from '../rich-input/AtlasRichInputAttachmentCard'
import { VoxButton } from '../vox/VoxButton'
import type { VoxOverlayState } from '../vox/useVoxOverlay'
import {
  MODE_OPTIONS,
  PROVIDER_OPTIONS,
  TASK_OPTIONS_PROGRAMMING,
  taskOptionsForMode,
} from '../../surfaces/atlas-ai/contract'
import { AtlasAiComposerMenu } from '../../surfaces/atlas-ai/components/AtlasAiComposerMenu'
import type {
  AtlasAiMode,
  AtlasAiProviderChoice,
  AtlasAiTask,
} from '../../surfaces/atlas-ai/types'
import '../../surfaces/atlas-ai/atlas-ai.css'

export interface AtlasUnifiedComposerSendPayload {
  text: string
  richInput: AtlasRichInputPayload
  mode: AtlasAiMode
  task: AtlasAiTask
  provider: AtlasAiProviderChoice
  computeEffort: AtlasComputeEffortChoice
}

export type AtlasUnifiedComposerModeOptionOverrides = Partial<
  Record<
    AtlasAiMode,
    {
      label?: string
      description?: string
    }
  >
>

interface AtlasUnifiedComposerProps {
  draft: string
  onChange: (next: string) => void
  mode: AtlasAiMode
  onModeChange: (mode: AtlasAiMode) => void
  task: AtlasAiTask
  onTaskChange: (task: AtlasAiTask) => void
  provider: AtlasAiProviderChoice
  onProviderChange: (provider: AtlasAiProviderChoice) => void
  computeEffort: AtlasComputeEffortChoice
  onComputeEffortChange: (effort: AtlasComputeEffortChoice) => void
  attachments: AtlasRichInputAttachmentsApi
  sending: boolean
  sendError?: string | null
  disabled?: boolean
  disabledReason?: string | null
  workspaceSlug?: string | null
  requireWorkspaceForProgramming?: boolean
  textareaMaxPx?: number
  placeholder?: string
  allowedModes?: readonly AtlasAiMode[]
  allowedProgrammingTasks?: readonly AtlasAiTask[]
  modeOptionOverrides?: AtlasUnifiedComposerModeOptionOverrides
  onSend: (payload: AtlasUnifiedComposerSendPayload) => Promise<void> | void
  onVoxClick?: () => void
  voxState?: VoxOverlayState
  voiceReplyEnabled?: boolean
  onVoiceReplyToggle?: () => void
  statusSlot?: ReactNode
}

const MIN_TEXTAREA_PX = 32
const MAX_TEXTAREA_PX_DEFAULT = 360

const SLASH_COMMANDS: Array<{ command: string; label: string; description: string }> = [
  { command: '/dev', label: 'Modo Programação', description: 'troca para Atlas Dev (programação)' },
  { command: '/ops', label: 'Modo Operacional', description: 'troca para Atlas Ops (operacional)' },
  { command: '/general', label: 'Modo Geral', description: 'troca para Atlas AI Geral' },
  { command: '/clear', label: 'Limpar', description: 'limpa o texto e os anexos' },
  { command: '/files', label: 'Anexar arquivos', description: 'abre o seletor de arquivos' },
]

const MODE_DESC: Record<AtlasAiMode, string> = {
  auto: 'Atlas Decide escolhe domínio/flow pelo contexto',
  general: 'pesquisa, ideia, dúvida — sem exigir projeto local',
  conversation: 'troca livre, sem domínio técnico',
  operational: 'diagnóstico, próxima ação, risco operacional',
  programming: 'bug, debug, feature, review · exige projeto local',
  research: 'pesquisa técnica/mercado · síntese executiva',
  finance: 'análise financeira, decisão de carteira',
  marketing: 'campanha, copy, métrica',
  strategy: 'objetivo, prioridade, escolha',
  personal_development: 'meta, hábito, organização pessoal',
  cyber: 'postura defensiva, auditoria, resposta a incidente',
  automation: 'workflow, integração, pipeline',
}

const MODE_PLACEHOLDER: Record<AtlasAiMode, string> = {
  auto: 'Escreva o que precisa — Atlas decide o caminho (pesquisa, código, finanças, campanha, estratégia, automação, conversa).',
  programming: 'Bug, debug, feature ou review — arrasta arquivo ou cola screenshot.',
  operational: 'Diagnóstico, próxima ação ou risco — cole contexto se útil.',
  research: 'Pesquisa técnica ou de mercado — descreva tema e profundidade.',
  finance: 'Análise financeira — cole números e a pergunta de decisão.',
  marketing: 'Campanha, copy ou métrica — público e objetivo.',
  strategy: 'Objetivo, prioridade, escolha — contexto e restrições.',
  personal_development: 'Meta, hábito ou plano semanal — objetivo e prazo.',
  cyber: 'Postura defensiva, auditoria ou resposta a incidente — escopo.',
  automation: 'Workflow, integração ou pipeline — entrada, gatilho, saída.',
  general: 'Pesquisa, ideia ou dúvida — solte arquivo ou cole conteúdo.',
  conversation: 'Conversa solta — pergunta ou ideia livre.',
}

function readComposerTextareaMax(el: HTMLElement | null): number {
  if (!el) return MAX_TEXTAREA_PX_DEFAULT
  const wrap = el.closest('.atlas-ai-composer-wrap') as HTMLElement | null
  const target = wrap ?? document.documentElement
  const raw = getComputedStyle(target).getPropertyValue('--composer-textarea-max').trim()
  if (!raw) return MAX_TEXTAREA_PX_DEFAULT
  const parsed = parseFloat(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : MAX_TEXTAREA_PX_DEFAULT
}

export function AtlasUnifiedComposer({
  draft,
  onChange,
  mode,
  onModeChange,
  task,
  onTaskChange,
  provider,
  onProviderChange,
  computeEffort,
  onComputeEffortChange,
  attachments,
  sending,
  sendError = null,
  disabled = false,
  disabledReason = null,
  workspaceSlug = null,
  requireWorkspaceForProgramming = false,
  textareaMaxPx,
  placeholder,
  allowedModes,
  allowedProgrammingTasks,
  modeOptionOverrides = {},
  onSend,
  onVoxClick,
  voxState = 'closed',
  voiceReplyEnabled = false,
  onVoiceReplyToggle,
  statusSlot,
}: AtlasUnifiedComposerProps) {
  void taskOptionsForMode
  const [dragActive, setDragActive] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const taRef = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const composerRef = useRef<HTMLElement | null>(null)

  const allowedModeSet = useMemo(
    () => (allowedModes ? new Set<AtlasAiMode>(allowedModes) : null),
    [allowedModes],
  )
  const allowedProgrammingTaskSet = useMemo(
    () => (allowedProgrammingTasks ? new Set<AtlasAiTask>(allowedProgrammingTasks) : null),
    [allowedProgrammingTasks],
  )
  const modeScopeBlocked = allowedModeSet ? !allowedModeSet.has(mode) : false
  const taskScopeBlocked =
    mode === 'programming' && allowedProgrammingTaskSet ? !allowedProgrammingTaskSet.has(task) : false
  const programmingMissingWorkspace =
    requireWorkspaceForProgramming && mode === 'programming' && !workspaceSlug
  const slashOpen = draft.startsWith('/') && draft.length <= 12
  const hasErroredAttachments = attachments.drafts.some((d) => d.status === 'error')
  const hasUnreadyAttachments = attachments.drafts.some(
    (d) => d.status === 'processing' || d.status === 'uploading',
  )
  const hasReadyAttachments = attachments.drafts.some(
    (d) => d.status === 'ready' || d.status === 'uploaded',
  )
  const canSend =
    !disabled &&
    !sending &&
    !hasUnreadyAttachments &&
    !modeScopeBlocked &&
    !taskScopeBlocked &&
    !programmingMissingWorkspace &&
    (draft.trim().length > 0 || hasReadyAttachments)

  const detectedUrls = useMemo(() => extractUrls(draft), [draft])
  const newUrls = useMemo(() => {
    const already = new Set(
      attachments.drafts.filter((d) => d.kind === 'url').map((d) => (d as { url: string }).url),
    )
    return detectedUrls.filter((u) => !already.has(u))
  }, [detectedUrls, attachments.drafts])

  useEffect(() => {
    const ta = taRef.current
    if (!ta) return
    const dynamicMax = textareaMaxPx ?? readComposerTextareaMax(ta)
    const minTarget = dynamicMax > MAX_TEXTAREA_PX_DEFAULT ? dynamicMax : MIN_TEXTAREA_PX
    ta.style.height = 'auto'
    const target = Math.min(dynamicMax, Math.max(minTarget, ta.scrollHeight))
    ta.style.height = `${target}px`
  }, [draft, textareaMaxPx])

  useEffect(() => {
    if (!modeScopeBlocked) return
    const fallback = allowedModes?.[0] ?? 'auto'
    onModeChange(fallback)
  }, [allowedModes, modeScopeBlocked, onModeChange])

  useEffect(() => {
    if (!taskScopeBlocked) return
    const fallback = allowedProgrammingTasks?.[0] ?? 'dev'
    onTaskChange(fallback)
  }, [allowedProgrammingTasks, onTaskChange, taskScopeBlocked])

  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      if (!composerRef.current?.contains(document.activeElement)) return
      const items = e.clipboardData?.items
      if (!items) return
      const fileList: File[] = []
      for (const item of items) {
        if (item.kind === 'file') {
          const file = item.getAsFile()
          if (file) fileList.push(file)
        }
      }
      if (fileList.length > 0) {
        e.preventDefault()
        void attachments.addFiles(fileList, 'paste')
      }
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [attachments])

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
      if (files.length > 0) void attachments.addFiles(files, 'drop')
      const uriList = e.dataTransfer.getData('text/uri-list')
      if (uriList) {
        uriList
          .split(/\r?\n/)
          .filter((u) => u && !u.startsWith('#'))
          .forEach((u) => void attachments.addUrl(u, 'paste'))
      }
    },
    [attachments],
  )

  const handlePickClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFilesPicked = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) void attachments.addFiles(files, 'picker')
      e.target.value = ''
    },
    [attachments],
  )

  const slashCommands = useMemo(
    () =>
      SLASH_COMMANDS.filter((cmd) => {
        if (cmd.command === '/dev') return !allowedModeSet || allowedModeSet.has('programming')
        if (cmd.command === '/ops') return !allowedModeSet || allowedModeSet.has('operational')
        if (cmd.command === '/general') return !allowedModeSet || allowedModeSet.has('general')
        return true
      }),
    [allowedModeSet],
  )

  const applySlash = useCallback(
    (cmd: string) => {
      if (!slashCommands.some((c) => c.command === cmd)) {
        setLocalError('Comando indisponível neste fluxo.')
        return
      }
      if (cmd === '/dev') {
        onModeChange('programming')
        if (allowedProgrammingTasks?.[0]) onTaskChange(allowedProgrammingTasks[0])
        onChange('')
      } else if (cmd === '/ops') {
        onModeChange('operational')
        onChange('')
      } else if (cmd === '/general') {
        onModeChange('general')
        onChange('')
      } else if (cmd === '/clear') {
        onChange('')
        attachments.clear()
      } else if (cmd === '/files') {
        onChange('')
        handlePickClick()
      }
    },
    [
      allowedProgrammingTasks,
      onModeChange,
      onTaskChange,
      onChange,
      attachments,
      handlePickClick,
      slashCommands,
    ],
  )

  const handleSendInner = useCallback(async () => {
    setLocalError(null)
    if (disabled) {
      setLocalError(disabledReason ?? 'Composer indisponível.')
      return
    }
    if (programmingMissingWorkspace) {
      setLocalError('Atlas Dev exige projeto local — selecione um Projeto antes de enviar.')
      return
    }
    if (modeScopeBlocked || taskScopeBlocked) {
      setLocalError('Modo indisponível neste fluxo.')
      return
    }
    if (!canSend) return
    try {
      const richInput = await attachments.uploadAllCanonical()
      await onSend({
        text: draft.trim(),
        richInput,
        mode,
        task,
        provider,
        computeEffort,
      })
      attachments.clear()
      onChange('')
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : String(error))
    }
  }, [
    attachments,
    canSend,
    disabled,
    disabledReason,
    draft,
    mode,
    modeScopeBlocked,
    onChange,
    onSend,
    programmingMissingWorkspace,
    provider,
    computeEffort,
    task,
    taskScopeBlocked,
  ])

  const handleKey = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (slashOpen && (e.key === 'Tab' || e.key === 'Enter')) {
        const first = slashCommands.find((c) => c.command.startsWith(draft))
        if (first) {
          e.preventDefault()
          applySlash(first.command)
          return
        }
      }
      if (e.key === 'Enter' && !e.shiftKey && !e.altKey) {
        e.preventDefault()
        void handleSendInner()
      }
    },
    [slashOpen, draft, slashCommands, applySlash, handleSendInner],
  )

  const tokens = estimateRichInputTokens(draft, attachments.drafts)
  const attachmentSummary = summarizeRichInputDrafts(attachments.drafts)

  const modePillLabel =
    mode === 'auto'
      ? 'auto'
      : mode === 'programming'
        ? task
        : mode === 'operational'
          ? 'operacional'
          : mode === 'general'
            ? 'geral'
            : mode === 'conversation'
              ? 'conversa'
              : mode === 'personal_development'
                ? 'pessoal'
                : mode

  const currentProvider = PROVIDER_OPTIONS.find((p) => p.value === provider)
  const providerPillLabel = (currentProvider?.label ?? 'auto').toLowerCase().split(' ')[0]
  const computeEffortPillLabel = labelAtlasComputeEffortShort(computeEffort)

  type ModeKey = `mode:${AtlasAiMode}` | `task:${AtlasAiTask}`
  const modeMenuValue: ModeKey = mode === 'programming' ? `task:${task}` : `mode:${mode}`
  const modeMenuOptions: Array<{
    value: ModeKey
    label: string
    description?: string
    badge?: ReactNode
  }> = useMemo(() => {
    const opts: Array<{
      value: ModeKey
      label: string
      description?: string
      badge?: ReactNode
    }> = []
    for (const m of MODE_OPTIONS) {
      if (allowedModeSet && !allowedModeSet.has(m.value)) continue
      if (m.value === 'programming') {
        for (const t of TASK_OPTIONS_PROGRAMMING) {
          if (allowedProgrammingTaskSet && !allowedProgrammingTaskSet.has(t.value)) continue
          opts.push({
            value: `task:${t.value}` as ModeKey,
            label: `Programação · ${t.label}`,
            description: t.sub,
          })
        }
      } else {
        const override = modeOptionOverrides[m.value]
        opts.push({
          value: `mode:${m.value}` as ModeKey,
          label: override?.label ?? m.label,
          description: override?.description ?? MODE_DESC[m.value] ?? m.sub,
        })
      }
    }
    return opts
  }, [allowedModeSet, allowedProgrammingTaskSet, modeOptionOverrides])

  const handleModeMenuChange = useCallback(
    (next: ModeKey) => {
      if (next.startsWith('mode:')) {
        onModeChange(next.slice(5) as AtlasAiMode)
      } else if (next.startsWith('task:')) {
        onModeChange('programming')
        onTaskChange(next.slice(5) as AtlasAiTask)
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

      {attachments.drafts.length > 0 ? (
        <div className="atlas-ai-att-strip" role="list" aria-label="Anexos">
          {attachments.drafts.map((draftAttachment) => (
            <AtlasRichInputAttachmentCard
              key={draftAttachment.id}
              draft={draftAttachment}
              onRemove={attachments.remove}
            />
          ))}
        </div>
      ) : null}

      {newUrls.length > 0 && !sending && !disabled ? (
        <div className="atlas-ai-url-hints" role="region" aria-label="URLs detectadas">
          {newUrls.slice(0, 3).map((url) => {
            let host = url
            try {
              host = new URL(url).hostname
            } catch {
              /* fallback */
            }
            return (
              <button
                key={url}
                type="button"
                className="atlas-ai-url-hint"
                onClick={() => void attachments.addUrl(url, 'paste')}
                title="Anexar como link rico (com título, thumbnail, duração)"
              >
                ↗ anexar {host}
              </button>
            )
          })}
        </div>
      ) : null}

      <div className="atlas-ai-composer-textarea-wrap">
        <textarea
          ref={taRef}
          className="atlas-ai-textarea atlas-ai-textarea-v2"
          value={draft}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
          placeholder={disabled ? (disabledReason ?? 'Composer indisponível.') : (placeholder ?? MODE_PLACEHOLDER[mode])}
          rows={3}
          maxLength={50000}
          disabled={disabled || sending}
        />

        {slashOpen ? (
          <div className="atlas-ai-slash-menu" role="listbox" aria-label="Comandos rápidos">
            {slashCommands.filter((c) => c.command.startsWith(draft)).map((c) => (
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

      <div className="atlas-ai-composer-bar">
        <div className="atlas-ai-composer-bar-left">
          <button
            type="button"
            className="atlas-ai-icon-btn"
            onClick={handlePickClick}
            disabled={disabled || sending}
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

          {onVoxClick ? (
            <VoxButton state={voxState} onClick={onVoxClick} disabled={disabled || sending} />
          ) : null}

          {onVoiceReplyToggle ? (
            <button
              type="button"
              className={`atlas-ai-icon-btn atlas-ai-voice-live-btn${voiceReplyEnabled ? ' is-active' : ''}`}
              onClick={onVoiceReplyToggle}
              disabled={disabled}
              aria-label={voiceReplyEnabled ? 'Parar Atlas Voice' : 'Abrir Atlas Voice'}
              title={voiceReplyEnabled ? 'Atlas Voice ligado' : 'Abrir Atlas Voice'}
            >
              <svg viewBox="0 0 18 18" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5.2 7.8v2.4" />
                <path d="M9 5.2v7.6" />
                <path d="M12.8 7.8v2.4" />
                <path d="M2.3 9a6.7 6.7 0 0 1 13.4 0" />
                <path d="M3.8 13.2c1.3 1.4 3.1 2.2 5.2 2.2s3.9-.8 5.2-2.2" />
              </svg>
            </button>
          ) : null}

          <AtlasAiComposerMenu<`mode:${AtlasAiMode}` | `task:${AtlasAiTask}`>
            triggerLabel={modePillLabel}
            options={modeMenuOptions}
            value={modeMenuValue}
            onChange={handleModeMenuChange}
            disabled={disabled || sending}
            ariaLabel="Modo Atlas"
          />

          <AtlasAiComposerMenu<AtlasAiProviderChoice>
            triggerLabel={providerPillLabel}
            options={PROVIDER_OPTIONS.map((p) => ({
              value: p.value,
              label: p.label,
              description: p.sub,
            }))}
            value={provider}
            onChange={onProviderChange}
            disabled={disabled || sending}
            align="end"
            ariaLabel="Modelo Atlas"
          />

          <AtlasAiComposerMenu<AtlasComputeEffortChoice>
            triggerLabel={computeEffortPillLabel}
            options={ATLAS_COMPUTE_EFFORT_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
              description: option.sub,
            }))}
            value={computeEffort}
            onChange={onComputeEffortChange}
            disabled={disabled || sending}
            align="end"
            ariaLabel="Esforço Atlas"
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
                {attachmentSummary.total > 0 ? (
                  <span className="atlas-ai-composer-att-count">
                    {[
                      attachmentSummary.images && `${attachmentSummary.images} img`,
                      attachmentSummary.pdfs && `${attachmentSummary.pdfs} pdf`,
                      // Canon splits `text` vs `code`; preserve historic
                      // "txt" pill behavior by aggregating both here.
                      attachmentSummary.text + attachmentSummary.code > 0 &&
                        `${attachmentSummary.text + attachmentSummary.code} txt`,
                      attachmentSummary.urls && `${attachmentSummary.urls} url`,
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
            className="atlas-ai-send-btn"
            onClick={() => void handleSendInner()}
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

      {statusSlot ? <div className="composer-meta">{statusSlot}</div> : null}
      {localError ? <p className="atlas-ai-error-line">{localError}</p> : null}
      {sendError ? <p className="atlas-ai-error-line">{sendError}</p> : null}
      {hasErroredAttachments ? (
        <p className="atlas-ai-error-line">
          Um ou mais anexos falharam — remova ou troque antes de enviar.
        </p>
      ) : null}
    </section>
  )
}
