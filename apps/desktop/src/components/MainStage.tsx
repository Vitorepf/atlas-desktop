import type { Message, SddStage } from '@atlas/domain'

interface MainStageProps {
  stages: SddStage[]
  messages: Message[]
  receiptHash: string
}

const stateGlyph: Record<SddStage['state'], string> = {
  done: '✓',
  now: '⏳',
  todo: '○',
  blocked: '△',
}

/**
 * Conversation thread + SDD pipeline mini + composer.
 * Stage rendering only; SDD progression decisions live in atlas-server.
 */
export function MainStage({ stages, messages, receiptHash }: MainStageProps) {
  const doneCount = stages.filter((s) => s.state === 'done').length
  const totalCount = stages.length

  return (
    <main className="main-stage">
      <div className="conv-thread">
        {/* SDD mini · 5 stages · live state from server */}
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
            {doneCount}/{totalCount} · receipt <span className="v">{receiptHash}</span>
          </span>
        </div>

        {messages.map((m) => (
          <article key={m.id} className={`conv-msg ${m.role === 'user' ? 'you' : 'atlas'}`}>
            <div className="who">
              <span>{m.role === 'user' ? 'você' : 'atlas'}</span>
              <span className="time">{m.ts}</span>
            </div>
            <div className="body">
              <p>{m.body}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="composer">
        <div className="composer-row">
          <textarea
            placeholder="conversa com o Atlas… ele monta o plano, decide os agents, executa. você dirige e audita."
            disabled
          />
          <button className="send-btn" type="button" title="enviar">
            ✦
          </button>
        </div>
        <div className="composer-meta">
          <div>∴ atlas decide escolhe providers · paste = multimodal</div>
          <div>
            <kbd>cmd</kbd>+<kbd>enter</kbd> envia · <kbd>esc</kbd> cancela
          </div>
        </div>
      </div>
    </main>
  )
}
