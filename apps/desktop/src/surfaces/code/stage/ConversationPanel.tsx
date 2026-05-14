import { useEffect, useRef } from 'react'
import type { AtlasCodeForgeUxOrchestrator, Message, Obra } from '@atlas/domain'
import { LiveCockpitBanner } from './LiveCockpit'
import { ObraCommandCenterPanel } from './ObraCommandCenterPanel'
import { SddMini } from './SddMini'
import type { MainStageContext } from './mainStageTypes'

export function ConversationPanel({
  stages,
  messages,
  receiptHash,
  loading,
  hasObra,
  programmingGovernance,
  obra,
  forgeUxOrchestrator,
  obraCommandCenter,
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
        obraCommandCenter && obraCommandCenter.obraPresent ? (
          <ObraCommandCenterPanel snapshot={obraCommandCenter} />
        ) : (
          <ObraSummaryCenter
            loading={loading}
            hasObra={hasObra}
            obra={obra}
            orchestrator={forgeUxOrchestrator}
          />
        )
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

/**
 * Atlas Code Human Interface Upgrade v2 · resumo da Obra no centro.
 *
 * Quando não há mensagens ainda, o centro deixa de ficar vazio: renderiza
 * o resumo humano da Obra (objetivo + estado humano + próximo passo + último
 * blocker traduzido + safety). Tudo vem do read-model — não inventa nada.
 */
function ObraSummaryCenter({
  loading,
  hasObra,
  obra,
  orchestrator,
}: {
  loading: boolean
  hasObra: boolean
  obra: Obra | null
  orchestrator: AtlasCodeForgeUxOrchestrator | null
}) {
  if (loading) {
    return (
      <div
        style={{
          maxWidth: 760,
          margin: '40px auto 0',
          padding: 24,
          textAlign: 'center',
          color: 'var(--ink3)',
          fontFamily: 'var(--cc-font-sans)',
          fontStyle: 'normal',
        }}
      >
        <p>consultando Kernel…</p>
      </div>
    )
  }
  if (!hasObra) {
    return (
      <div
        style={{
          maxWidth: 760,
          margin: '40px auto 0',
          padding: 24,
          textAlign: 'center',
          color: 'var(--ink3)',
          fontFamily: 'var(--cc-font-sans)',
          fontStyle: 'normal',
        }}
      >
        <p style={{ fontSize: 18, lineHeight: 1.4 }}>
          nenhuma obra ativa.<br />
          ✦ cria uma à esquerda pra começar.
        </p>
      </div>
    )
  }

  return (
    <article
      style={{
        maxWidth: 760,
        margin: '32px auto 0',
        padding: '24px 28px',
        background: 'var(--cream)',
        border: '1px solid var(--hair-soft)',
        display: 'grid',
        gap: 14,
      }}
      aria-label="Resumo da Obra"
    >
      <header style={{ display: 'grid', gap: 4 }}>
        <span style={{ fontFamily: 'var(--cc-font-mono)', fontSize: 9, letterSpacing: 0, textTransform: 'none', color: 'var(--bronze)' }}>
          Resumo da Obra
        </span>
        <h1 style={{ fontFamily: 'var(--cc-font-sans)', fontSize: 22, fontWeight: 500, margin: 0, color: 'var(--ink)' }}>
          {obra?.title || obra?.objective || 'Obra sem título'}
        </h1>
        {obra?.objective ? (
          <p style={{ fontFamily: 'var(--cc-font-sans)', fontStyle: 'normal', fontSize: 13, color: 'var(--ink3)', margin: 0 }}>
            {obra.objective}
          </p>
        ) : null}
      </header>

      {orchestrator ? (
        <>
          <section style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontFamily: 'var(--cc-font-mono)', fontSize: 8.5, letterSpacing: 0, textTransform: 'none', color: 'var(--bronze)' }}>
              Estado humano
            </span>
            <span style={{ fontFamily: 'var(--cc-font-sans)', fontSize: 15, color: 'var(--ink)' }}>
              {orchestrator.humanStatusLabel}
            </span>
            <span style={{ fontFamily: 'var(--cc-font-sans)', fontSize: 12, fontStyle: 'normal', color: 'var(--ink3)' }}>
              {orchestrator.humanStatusDetail}
            </span>
          </section>

          <section style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontFamily: 'var(--cc-font-mono)', fontSize: 8.5, letterSpacing: 0, textTransform: 'none', color: 'var(--bronze)' }}>
              Próximo passo seguro
            </span>
            <span style={{ fontFamily: 'var(--cc-font-sans)', fontSize: 13, color: 'var(--ink2)' }}>
              {orchestrator.nextSafeStep}
            </span>
          </section>

          {orchestrator.blockerTranslation && orchestrator.blockerTranslation.kind ? (
            <section
              style={{
                padding: 12,
                border: `1px solid ${orchestrator.blockerTranslation.isBlocking ? 'var(--rec-red, #8a3025)' : 'var(--bronze-soft)'}`,
                background: orchestrator.blockerTranslation.isBlocking ? 'var(--rec-red-veil, rgba(138,48,37,0.08))' : 'var(--bronze-veil)',
                display: 'grid',
                gap: 4,
              }}
            >
              <span style={{ fontFamily: 'var(--cc-font-mono)', fontSize: 8.5, letterSpacing: 0, textTransform: 'none', color: orchestrator.blockerTranslation.isBlocking ? 'var(--rec-red, #8a3025)' : 'var(--bronze)' }}>
                Último blocker humano
              </span>
              <span style={{ fontFamily: 'var(--cc-font-sans)', fontSize: 13, color: 'var(--ink)' }}>
                {orchestrator.blockerTranslation.humanTitle}
              </span>
              {orchestrator.blockerTranslation.humanDetail ? (
                <span style={{ fontFamily: 'var(--cc-font-sans)', fontSize: 12, fontStyle: 'normal', color: 'var(--ink3)' }}>
                  {orchestrator.blockerTranslation.humanDetail}
                </span>
              ) : null}
            </section>
          ) : null}

          <section style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontFamily: 'var(--cc-font-mono)', fontSize: 9, color: 'var(--ink3)' }}>
            <span>
              provas: {orchestrator.evidenceSeparation?.obraEvidenceRefCount ?? 0}
            </span>
            <span>
              provider externo: {orchestrator.safetySummary.externalProviderCall ? 'sim' : 'não'}
            </span>
            <span>
              tokens: {String(orchestrator.safetySummary.providerTokensSpent ?? 0)}
            </span>
            <span>
              completion: {orchestrator.safetySummary.completionClaimPromoted ? 'promovido' : 'não promovido'}
            </span>
            <span>
              review gate: {orchestrator.safetySummary.reviewCompletionGatePreserved ? 'preservado' : 'AUSENTE'}
            </span>
          </section>
        </>
      ) : (
        <p style={{ fontFamily: 'var(--cc-font-sans)', fontStyle: 'normal', fontSize: 13, color: 'var(--ink3)', margin: 0 }}>
          Obra criada · sem snapshot do Forge ainda. Escreva embaixo para dar a primeira intent.
        </p>
      )}
    </article>
  )
}
