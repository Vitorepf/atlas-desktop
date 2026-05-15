import type { LeftRailContext } from './leftRailTypes'

/**
 * LeftRail · Work-type lanes (Consultas, Intervenções Rápidas, Candidatos
 * de Obra). Obras já é renderizada acima como lane primária.
 *
 * Canon: docs/engineering-knowledge-base/atlas-code-multi-project-workspace-os.md
 *
 * Esta primeira versão expõe a arquitetura sem fingir runtime: cada lane
 * tem schema/read-model planejado, mas execução real não está plugada.
 * As contagens vêm honestas (zero), e a explicação fica em uma linha.
 *
 * Atenção: NÃO transformar isso em árvore expansível, NÃO inventar dados
 * mockados. Lanes existem para que Consulta/Intervenção/Candidato tenham
 * lugar próprio quando virarem runtime.
 */
interface LaneDescriptor {
  id: 'consultas' | 'intervencoes' | 'candidatos'
  label: string
  hint: string
}

const LANES: LaneDescriptor[] = [
  {
    id: 'consultas',
    label: 'Consultas',
    hint: 'Conversa leve dentro do Projeto · não altera código',
  },
  {
    id: 'intervencoes',
    label: 'Intervenções rápidas',
    hint: 'Mudança pequena, clara e reversível · risco e arquivos declarados',
  },
  {
    id: 'candidatos',
    label: 'Candidatos de Obra',
    hint: 'Descoberta estruturada antes de virar Obra governada',
  },
]

export function WorkTypeLanesSection({ activeWorkspace }: LeftRailContext) {
  const productionBlocked =
    !!activeWorkspace && !activeWorkspace.safety.executionAllowed
  const showBlockedHint = productionBlocked
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {LANES.map((lane) => (
        <div
          key={lane.id}
          style={{
            display: 'grid',
            gap: 2,
            padding: '6px 8px',
            border: '1px solid var(--cc-border-soft, rgba(255,255,255,0.08))',
            borderRadius: 3,
            background: 'var(--cc-panel-soft, transparent)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 6,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.2 }}>
              {lane.label}
            </span>
            <span
              className="cc-eyebrow"
              style={{ fontSize: 9, opacity: 0.55, letterSpacing: 0.4 }}
              title="Read-model planejado · runtime ainda não plugado"
            >
              0 · scaffold
            </span>
          </div>
          <span style={{ fontSize: 10, opacity: 0.7, lineHeight: 1.35 }}>{lane.hint}</span>
        </div>
      ))}
      {showBlockedHint ? (
        <div
          style={{
            fontSize: 10,
            opacity: 0.8,
            color: 'var(--cc-warning, #d4a85a)',
            padding: '2px 4px',
          }}
        >
          workspace_path ausente · este Projeto só libera Consulta/Descoberta.
        </div>
      ) : null}
    </div>
  )
}
