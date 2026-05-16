/**
 * Atlas AI · Plan panel.
 *
 * Extrai do thread.metadata e do pending trace itens acionáveis para o
 * operador humano: próximo passo sugerido, critérios de sucesso, riscos,
 * perguntas em aberto, arquivos citados. NÃO inventa — só mostra o que o
 * Atlas já registrou na thread. Quando vazio, hint editorial calmo.
 */
import type { AiThreadDetail, AiTrace, AtlasAiMode } from '../types'

interface AtlasAiPlanPanelProps {
  thread: AiThreadDetail | null
  pendingTrace: AiTrace | null
  mode: AtlasAiMode
}

function pickStringArray(meta: Record<string, unknown> | null | undefined, key: string): string[] {
  if (!meta) return []
  const v = meta[key]
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === 'string' && x.trim() !== '')
}

function pickString(meta: Record<string, unknown> | null | undefined, key: string): string | null {
  if (!meta) return null
  const v = meta[key]
  if (typeof v !== 'string' || v.trim() === '') return null
  return v.trim()
}

export function AtlasAiPlanPanel({ thread, pendingTrace, mode }: AtlasAiPlanPanelProps) {
  const meta = thread?.metadata ?? null

  const nextStep =
    pickString(meta, 'suggested_next_step') ??
    pickString(meta, 'next_step') ??
    null

  const objective = pickString(meta, 'objective') ?? null
  const contextSummary = pickString(meta, 'context_summary') ?? null

  const successCriteria = pickStringArray(meta, 'suggested_success_criteria')
  const risks = pickStringArray(meta, 'risks')
  const openQuestions = pickStringArray(meta, 'open_questions')
  const knownFiles = pickStringArray(meta, 'known_files')

  const hasAnything =
    nextStep !== null ||
    objective !== null ||
    contextSummary !== null ||
    successCriteria.length > 0 ||
    risks.length > 0 ||
    openQuestions.length > 0 ||
    knownFiles.length > 0

  return (
    <section className="atlas-ai-plan" aria-label="Plano da conversa">
      {/* Eyebrow REDUNDANTE com a tab "Plano" — drop per Agent D #2. */}

      {!thread ? (
        <p className="atlas-ai-plan-empty">
          o plano aparece quando você abre uma conversa
        </p>
      ) : !hasAnything ? (
        <p className="atlas-ai-plan-empty">
          ainda sem plano explícito · Atlas só promove quando você decide
        </p>
      ) : (
        <div className="atlas-ai-plan-stack">
          {nextStep ? (
            <article className="atlas-ai-plan-card is-primary">
              <header>Próximo passo</header>
              <p>{nextStep}</p>
            </article>
          ) : null}

          {objective ? (
            <article className="atlas-ai-plan-card">
              <header>Objetivo declarado</header>
              <p>{objective}</p>
            </article>
          ) : null}

          {contextSummary ? (
            <article className="atlas-ai-plan-card">
              <header>Contexto resumido</header>
              <p>{contextSummary}</p>
            </article>
          ) : null}

          {successCriteria.length > 0 ? (
            <article className="atlas-ai-plan-card">
              <header>Critérios de sucesso</header>
              <ul className="atlas-ai-plan-list">
                {successCriteria.map((s, i) => (
                  <li key={`sc-${i}`}>{s}</li>
                ))}
              </ul>
            </article>
          ) : null}

          {risks.length > 0 ? (
            <article className="atlas-ai-plan-card is-warning">
              <header>Riscos</header>
              <ul className="atlas-ai-plan-list">
                {risks.map((r, i) => (
                  <li key={`rk-${i}`}>{r}</li>
                ))}
              </ul>
            </article>
          ) : null}

          {openQuestions.length > 0 ? (
            <article className="atlas-ai-plan-card">
              <header>Perguntas em aberto</header>
              <ul className="atlas-ai-plan-list">
                {openQuestions.map((q, i) => (
                  <li key={`oq-${i}`}>{q}</li>
                ))}
              </ul>
            </article>
          ) : null}

          {knownFiles.length > 0 ? (
            <article className="atlas-ai-plan-card">
              <header>Arquivos citados</header>
              <ul className="atlas-ai-plan-list atlas-ai-plan-list-mono">
                {knownFiles.slice(0, 12).map((f, i) => (
                  <li key={`kf-${i}`}><code>{f}</code></li>
                ))}
              </ul>
            </article>
          ) : null}
        </div>
      )}

      {pendingTrace && pendingTrace.status === 'completed' ? (
        <p className="atlas-ai-plan-footnote">
          Último trace concluído · provider {pendingTrace.provider ?? '—'} · latência{' '}
          {pendingTrace.latency_ms ?? '—'}ms · modo {mode}
        </p>
      ) : null}
    </section>
  )
}
