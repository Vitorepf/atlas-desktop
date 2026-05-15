import { useCallback } from 'react'
import {
  MODE_OPTIONS,
  PROVIDER_OPTIONS,
  taskOptionsForMode,
} from '../contract'
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
  onSend: () => void
  onSendInNew: () => void
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
}: AtlasAiComposerProps) {
  const tasks = taskOptionsForMode(mode)
  const programmingMissingWorkspace = mode === 'programming' && !workspaceSlug
  const canSend = !sending && draft.trim().length > 0 && !programmingMissingWorkspace

  const handleKey = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        if (canSend) onSend()
      }
    },
    [canSend, onSend],
  )

  return (
    <section className="atlas-ai-composer">
      <div className="atlas-ai-composer-controls">
        <fieldset className="atlas-ai-control-group">
          <legend>Modo</legend>
          <div className="atlas-ai-segmented">
            {MODE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`atlas-ai-segment${mode === opt.value ? ' is-active' : ''}`}
                onClick={() => onModeChange(opt.value)}
                title={opt.sub}
                disabled={sending}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="atlas-ai-control-group">
          <legend>Tarefa</legend>
          <div className="atlas-ai-segmented">
            {tasks.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`atlas-ai-segment${task === opt.value ? ' is-active' : ''}`}
                onClick={() => onTaskChange(opt.value)}
                title={opt.sub}
                disabled={sending}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="atlas-ai-control-group">
          <legend>Provider</legend>
          <select
            className="atlas-ai-select"
            value={provider}
            onChange={(e) => onProviderChange(e.target.value as AtlasAiProviderChoice)}
            disabled={sending}
          >
            {PROVIDER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </fieldset>
      </div>

      {programmingMissingWorkspace ? (
        <p className="atlas-ai-warning-line">
          Atlas Dev exige Workspace. Selecione um Projeto no topbar antes de enviar.
        </p>
      ) : null}

      <textarea
        className="atlas-ai-textarea"
        value={draft}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
        placeholder={
          mode === 'programming'
            ? 'Bug, debug, feature pequena/média, review… ⌘+Enter para enviar.'
            : mode === 'operational'
              ? 'Diagnóstico, próxima ação, risco… ⌘+Enter para enviar.'
              : 'Pesquisa, ideia, dúvida geral… ⌘+Enter para enviar.'
        }
        rows={4}
        maxLength={50000}
        disabled={sending}
      />

      <div className="atlas-ai-composer-row">
        <span className="atlas-ai-composer-hint">
          {sending
            ? 'enviando…'
            : `${draft.length} caracteres · enter+⌘ envia`}
        </span>
        <div className="atlas-ai-composer-actions">
          <button
            type="button"
            className="atlas-ai-action atlas-ai-action-ghost"
            onClick={onSendInNew}
            disabled={!canSend}
            title="Cria uma nova thread mesmo que haja uma selecionada"
          >
            nova thread
          </button>
          <button
            type="button"
            className="atlas-ai-action atlas-ai-action-primary"
            onClick={onSend}
            disabled={!canSend}
          >
            enviar
          </button>
        </div>
      </div>
      {sendError ? <p className="atlas-ai-error-line">{sendError}</p> : null}
    </section>
  )
}
