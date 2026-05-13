import { useEffect, useRef, useState } from 'react'
import type { Message, SddStage } from '@atlas/domain'

interface MainStageProps {
  stages: SddStage[]
  messages: Message[]
  receiptHash: string
  loading: boolean
  busy: boolean
  hasObra: boolean
  onSend: (text: string) => Promise<void>
}

const stateGlyph: Record<SddStage['state'], string> = {
  done: '✓',
  now: '⏳',
  todo: '○',
  blocked: '△',
}

/**
 * Conversation thread + SDD pipeline mini + composer.
 * Composer wired to bridge.sendIntent.
 */
export function MainStage({
  stages,
  messages,
  receiptHash,
  loading,
  busy,
  hasObra,
  onSend,
}: MainStageProps) {
  const [draft, setDraft] = useState('')
  const threadRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  const doneCount = stages.filter((s) => s.state === 'done').length
  const totalCount = stages.length

  async function handleSend() {
    const text = draft.trim()
    if (!text || busy || !hasObra) return
    setDraft('')
    await onSend(text)
  }

  return (
    <main className="main-stage">
      <div className="conv-thread" ref={threadRef}>
        <div className="sdd-mini">
          <span className="label">SDD</span>
          <div className="stages">
            {stages.map((s) => (
              <span key={s.id} className={`stage ${s.state}`}>
                <span className="glyph">{stateGlyph[s.state]}</span>
                {s.label}
              </span>
            ))}
          </div>
          <span className="meta">
            {doneCount}/{totalCount}
            {receiptHash ? <> · receipt <span className="v">{receiptHash.slice(0, 6)}</span></> : null}
          </span>
        </div>

        {messages.length === 0 ? (
          <EmptyConversation loading={loading} hasObra={hasObra} />
        ) : (
          messages.map((m) => (
            <article key={m.id} className={`conv-msg ${m.role === 'user' ? 'you' : 'atlas'}`}>
              <div className="who">
                <span>{m.role === 'user' ? 'você' : 'atlas'}</span>
                <span className="time">{m.ts}</span>
              </div>
              <div className="body">
                <p>{m.body}</p>
              </div>
            </article>
          ))
        )}
      </div>

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
    </main>
  )
}

function EmptyConversation({ loading, hasObra }: { loading: boolean; hasObra: boolean }) {
  return (
    <div
      style={{
        maxWidth: 760,
        margin: '40px auto 0',
        padding: 24,
        textAlign: 'center',
        color: 'var(--ink3)',
        fontFamily: 'var(--serif)',
        fontStyle: 'italic',
      }}
    >
      {loading ? (
        <p>consultando Kernel…</p>
      ) : !hasObra ? (
        <p style={{ fontSize: 18, lineHeight: 1.4 }}>
          nenhuma obra ativa.<br />
          ✦ cria uma acima pra começar a conversar.
        </p>
      ) : (
        <p style={{ fontSize: 18, lineHeight: 1.4 }}>
          obra criada · sem mensagens ainda.<br />
          escreva embaixo pra dar a primeira intent.
        </p>
      )}
    </div>
  )
}
