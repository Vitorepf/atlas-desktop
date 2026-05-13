import { useState } from 'react'

interface ComposerPanelProps {
  busy: boolean
  hasObra: boolean
  onSend: (text: string) => Promise<void>
}

export function ComposerPanel({ busy, hasObra, onSend }: ComposerPanelProps) {
  const [draft, setDraft] = useState('')

  async function handleSend() {
    const text = draft.trim()
    if (!text || busy || !hasObra) return
    setDraft('')
    await onSend(text)
  }

  return (
    <div className="composer">
      <div className="composer-row">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              void handleSend()
            }
          }}
          placeholder={
            hasObra
              ? 'conversa com o Atlas… cmd+enter envia'
              : 'cria uma obra acima primeiro · composer ativa quando obra existe'
          }
          disabled={!hasObra || busy}
        />
        <button
          className="send-btn"
          type="button"
          title="enviar (cmd+enter)"
          onClick={() => void handleSend()}
          disabled={!hasObra || busy || !draft.trim()}
        >
          ✦
        </button>
      </div>
      <div className="composer-meta">
        <div>
          ∴ {busy ? 'enviando…' : hasObra ? 'composer ativo · cmd+enter envia' : 'aguardando obra'}
        </div>
        <div>
          <kbd>cmd</kbd>+<kbd>enter</kbd> · <kbd>esc</kbd>
        </div>
      </div>
    </div>
  )
}
