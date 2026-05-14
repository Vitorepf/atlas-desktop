import { useEffect, useRef } from 'react'
import type { Message } from '@atlas/domain'
import { LiveCockpitBanner } from './LiveCockpit'
import { SddMini } from './SddMini'
import type { MainStageContext } from './mainStageTypes'

export function ConversationPanel({
  stages,
  messages,
  receiptHash,
  loading,
  hasObra,
  programmingGovernance,
}: MainStageContext) {
  const threadRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  return (
    <div className="conv-thread" ref={threadRef}>
      <LiveCockpitBanner />
      <SddMini
        stages={stages}
        receiptHash={receiptHash}
        programmingGovernance={programmingGovernance}
        hasObra={hasObra}
      />

      {messages.length === 0 ? (
        <EmptyConversation loading={loading} hasObra={hasObra} />
      ) : (
        messages.map((m) => <ConversationMessage key={m.id} message={m} />)
      )}
    </div>
  )
}

function ConversationMessage({ message: m }: { message: Message }) {
  return (
    <article className={`conv-msg ${m.role === 'user' ? 'you' : 'atlas'}`}>
      <div className="who">
        <span>{m.role === 'user' ? 'você' : 'atlas'}</span>
        <span className="time">{m.ts}</span>
      </div>
      <div className="body">
        <p>{m.body}</p>
      </div>
    </article>
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
