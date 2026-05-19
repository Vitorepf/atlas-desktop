/**
 * AuditPanel · cmd+shift+A
 *
 * Editorial overlay that shows the canonical audit of the cartography:
 * pieces found vs. missing (with the expected paths), orphan semantic
 * nodes, source health (repo + AtlasVault), volume counters (semantic
 * nodes + relations) and the current payload checksum.
 *
 * Cumpre o ADR-0003 §"Auditoria do grafo" e honra o canon Don Corleone:
 * peso editorial, hairlines deliberadas, badges canônicos repo/vault/missing.
 */
import { useEffect } from 'react'
import type { CartographyGraph } from '@atlas/domain'

interface AuditPanelProps {
  graph: CartographyGraph | null
  onClose: () => void
  onPickBrokenPath: (graphId: string) => void
}

export function AuditPanel({ graph, onClose, onPickBrokenPath }: AuditPanelProps) {
  // ESC anywhere closes the panel. The cmd+shift+A toggle is handled upstream.
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const audit = graph?.audit
  const source = graph?.sourceHealth
  const checksum = graph?.checksum ?? null

  return (
    <div className="audit-panel-shroud" role="dialog" aria-modal="true" aria-label="Auditoria da cartografia" onClick={onClose}>
      <div className="audit-panel" onClick={(e) => e.stopPropagation()}>
        <header className="audit-head">
          <div className="audit-eyebrow">Auditoria · cmd+shift+a</div>
          <h2 className="audit-title">Saúde da Cartografia</h2>
          <p className="audit-lede">
            Estado canônico, peças com fonte ausente, órfãos do grafo semântico e
            saúde das duas fontes. ESC fecha.
          </p>
          <button type="button" className="audit-close" onClick={onClose} aria-label="Fechar audit panel">
            ×
          </button>
        </header>

        <div className="audit-body">
          <section className="audit-section audit-volume">
            <h3>Volume canônico</h3>
            <div className="audit-grid">
              <Stat label="encontradas" value={audit?.found ?? 0} tone="ok" />
              <Stat label="ausentes" value={audit?.missing ?? 0} tone={audit && audit.missing > 0 ? 'risk' : 'ok'} />
              <Stat label="nós semânticos" value={audit?.semanticNodeCount ?? 0} tone="ink" />
              <Stat label="relações" value={audit?.semanticRelationCount ?? 0} tone="ink" />
              <Stat label="órfãos" value={audit?.orphanCount ?? 0} tone={audit && audit.orphanCount > 0 ? 'warn' : 'ok'} />
              <Stat label="paths quebrados" value={audit?.brokenPaths.length ?? 0} tone={audit && audit.brokenPaths.length > 0 ? 'risk' : 'ok'} />
            </div>
          </section>

          <section className="audit-section audit-source">
            <h3>Fontes</h3>
            <div className="audit-grid audit-grid-source">
              <SourceRow
                label="repo · engineering-knowledge-base"
                root={source?.repo.root ?? ''}
                readable={source?.repo.readable ?? false}
                indexed={source?.repo.indexedCount ?? 0}
                errors={source?.repo.errors ?? []}
              />
              <SourceRow
                label="atlasvault · obsidian"
                root={source?.vault.root ?? ''}
                readable={source?.vault.readable ?? false}
                indexed={source?.vault.indexedCount ?? 0}
                errors={source?.vault.errors ?? []}
              />
            </div>
          </section>

          {audit && audit.brokenPaths.length > 0 ? (
            <section className="audit-section audit-broken">
              <h3>Paths ausentes · {audit.brokenPaths.length}</h3>
              <p className="audit-section-lede">
                A canon esperava esses arquivos. O frontend pinta cada peça em rec-red até a documentação aparecer.
              </p>
              <ul className="audit-list">
                {audit.brokenPaths.map((bp) => (
                  <li key={bp.graphId}>
                    <button
                      type="button"
                      className="audit-broken-row"
                      onClick={() => {
                        onPickBrokenPath(bp.graphId)
                        onClose()
                      }}
                    >
                      <span className="audit-broken-name">{bp.name || bp.graphId}</span>
                      <span className="audit-broken-id">{bp.graphId}</span>
                      <span className="audit-broken-path">{bp.expectedPath}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {audit && audit.orphanCount > 0 ? (
            <section className="audit-section audit-orphans">
              <h3>Órfãos do grafo semântico · {audit.orphanCount}</h3>
              <p className="audit-section-lede">
                Nós que declaram um `graph_parent` que não existe no índice — drift entre canon e filesystem real.
              </p>
              <ul className="audit-list">
                {audit.orphanNodes.slice(0, 12).map((o) => (
                  <li key={o.graphId} className="audit-orphan-row">
                    <span className="audit-broken-name">{o.graphId}</span>
                    <span className="audit-broken-path">parent: {o.missingParent}</span>
                  </li>
                ))}
                {audit.orphanCount > 12 ? (
                  <li className="audit-orphan-row audit-more">… +{audit.orphanCount - 12} órfãos</li>
                ) : null}
              </ul>
            </section>
          ) : null}

          <section className="audit-section audit-checksum">
            <h3>Checksum + geração</h3>
            <div className="audit-checksum-grid">
              <div>
                <span className="audit-mono-label">payload sha256</span>
                <code className="audit-checksum-hash">{checksum ?? '—'}</code>
              </div>
              <div>
                <span className="audit-mono-label">gerado em</span>
                <code className="audit-checksum-hash">{audit?.generatedAt ?? '—'}</code>
              </div>
              <div>
                <span className="audit-mono-label">indexed · repo + vault</span>
                <code className="audit-checksum-hash">{(audit?.repoIndexed ?? 0) + ' · ' + (audit?.vaultIndexed ?? 0)}</code>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'ok' | 'warn' | 'risk' | 'ink' }) {
  return (
    <div className={`audit-stat audit-stat-${tone}`}>
      <strong>{value.toLocaleString('pt-BR')}</strong>
      <span>{label}</span>
    </div>
  )
}

function SourceRow({
  label, root, readable, indexed, errors,
}: { label: string; root: string; readable: boolean; indexed: number; errors: string[] }) {
  return (
    <div className={`audit-source-row${readable ? '' : ' offline'}`}>
      <div className="audit-source-head">
        <span className="audit-source-label">{label}</span>
        <span className={`audit-source-badge ${readable ? 'ready' : 'offline'}`}>
          {readable ? 'legível' : 'inacessível'}
        </span>
        <span className="audit-source-indexed">{indexed.toLocaleString('pt-BR')} arquivos</span>
      </div>
      <code className="audit-source-path">{root || '—'}</code>
      {errors.length > 0 ? (
        <ul className="audit-source-errors">
          {errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      ) : null}
    </div>
  )
}
