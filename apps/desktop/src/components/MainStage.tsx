import type { Message, SddStage } from '@atlas/domain'

interface MainStageProps {
  stages: SddStage[]
  messages: Message[]
  receiptHash: string
  loading: boolean
}

const stateGlyph: Record<SddStage['state'], string> = {
  done: '✓',
  now: '⏳',
  todo: '○',
  blocked: '△',
}

/**
 * Conversation thread + SDD pipeline mini + composer.
 * When no obra is active, shows an inviting empty state instead of fake
 * conversation history.
 */
export function MainStage({ stages, messages, receiptHash, loading }: MainStageProps) {
  const doneCount = stages.filter((s) => s.state === 'done').length
  const totalCount = stages.length

  return (
    <main className="main-stage">
      <div className="conv-thread">
        {/* SDD mini · 5 stages · all "todo" until the Kernel emits real progress */}
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
          <EmptyConversation loading={loading} />
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
            placeholder="conversa com o Atlas… ele monta o plano, decide os agents, executa. você dirige e audita. (composer ainda não envia · passo 4)"
            disabled
          />
          <button className="send-btn" type="button" title="enviar — desabilitado no MVP" disabled>
            ✦
          </button>
        </div>
        <div className="composer-meta">
          <div>∴ composer não envia ainda · wire pra bridge.sendIntent fica no passo 4</div>
          <div>
            <kbd>cmd</kbd>+<kbd>enter</kbd> · <kbd>esc</kbd>
          </div>
        </div>
      </div>
    </main>
  )
}

function EmptyConversation({ loading }: { loading: boolean }) {
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
      ) : (
        <>
          <p style={{ fontSize: 18, lineHeight: 1.4, marginBottom: 12 }}>
            nenhuma conversa nesta obra ainda.
          </p>
          <p style={{ fontSize: 13, color: 'var(--ink4)' }}>
            o composer abaixo será wired ao bridge.sendIntent no passo 4.
          </p>
        </>
      )}
    </div>
  )
}
