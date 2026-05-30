import { PanelTitle } from '@atlas/ui'
import { EmptyText, Row } from './RightRailPrimitives'

/**
 * Cognitive Plane UX hooks — desktop panel.
 *
 * Closes the AAEOS Safe Next Block #3 ("Cognitive Plane UX hooks") on
 * the desktop surface. AP-168/AP-169/AP-170 cognitive runtime exists
 * in atlas-server; this panel is the human-facing hook that:
 *
 *   - shows the current daily plan bootstrap state (read-only)
 *   - shows worked example state per topic
 *   - shows failure tracker + Predictive Failure signals
 *   - declares the canon guardrail: review-only for curriculum mutations
 *
 * Slate dark canon per `atlas-desktop/CLAUDE.md`. Uses `--cc-*` tokens.
 * Honest empty state when backend has no cognitive data yet.
 */

interface CognitivePlaneEnvelope {
  schema_version?: string
  ap?: 'AP-168' | 'AP-169' | 'AP-170'
  daily_plan_bootstrap_present?: boolean
  worked_examples_count?: number
  failure_signatures_recent?: number
  curriculum_review_only?: boolean
  surface?: 'app' | 'mobile' | 'voice' | 'desktop'
}

interface CognitivePlaneUxPanelProps {
  envelope: CognitivePlaneEnvelope | null | undefined
}

export function CognitivePlaneUxPanel({ envelope }: CognitivePlaneUxPanelProps) {
  if (!envelope) {
    return (
      <section data-testid="cognitive-plane-ux-panel">
        <PanelTitle label="Cognitive Plane" />
        <EmptyText>
          Cognitive runtime nao retornou snapshot. Rode <code>php artisan atlas:ai:cognitive-runtime --json</code>{' '}
          para gerar.
        </EmptyText>
      </section>
    )
  }

  const ap = envelope.ap ?? '—'
  const bootstrap = envelope.daily_plan_bootstrap_present ? 'present' : 'missing'
  const workedExamples = envelope.worked_examples_count ?? 0
  const failures = envelope.failure_signatures_recent ?? 0
  const reviewOnly = envelope.curriculum_review_only === true

  return (
    <section data-testid="cognitive-plane-ux-panel">
      <PanelTitle label="Cognitive Plane" meta={ap} />

      <Row k="daily plan bootstrap" v={bootstrap} ok={bootstrap === 'present'} />
      <Row k="worked examples" v={String(workedExamples)} />
      <Row k="failure signatures (recent)" v={String(failures)} />
      <Row k="curriculum mutations" v={reviewOnly ? 'review-only' : 'auto?'} ok={reviewOnly} mono />

      <PanelTitle label="Canon Guardrail" />
      <EmptyText>
        Cognitive Plane runtime e <strong>review-only</strong> para mudanças de
        currículo. Nenhum bloco aqui auto-promove conteúdo sem Curator/operator
        review (AP-168/AP-169/AP-170 canon). Se voce ve algum elemento sugerindo
        mutação autônoma, isso e violação de canon — abra Inbox.
      </EmptyText>

      {bootstrap === 'missing' && (
        <EmptyText>
          Daily plan bootstrap ausente. AP-168 exige bootstrap real antes da
          surface render conteúdo de tutoria. Sem bootstrap = empty state.
        </EmptyText>
      )}

      {failures > 0 && (
        <EmptyText>
          {failures} failure signature(s) recente(s). Predictive Failure gate
          monitora repetição de mesma assinatura — review automático abre
          quando ocorre 3 vezes ou mais.
        </EmptyText>
      )}

      {envelope.surface && (
        <Row k="surface" v={envelope.surface} mono />
      )}
    </section>
  )
}
