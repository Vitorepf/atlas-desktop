/**
 * DefaultInspectorContent · identidade editorial do Atlas AI Kernel.
 *
 * Quando nenhuma peça está em hover/foco, o inspector não fica vazio —
 * carrega a identidade do continente atual + mini-ficha de estrutura
 * + guia canônico de leitura (hover · click · double · /1..5 · cmd+K).
 * Honra o canon Don Corleone: peso editorial, hairlines deliberadas,
 * nada apologético.
 */
import type { CartographyGraph } from '@atlas/domain'

interface DefaultInspectorContentProps {
  graph: CartographyGraph | null
}

export function DefaultInspectorContent({ graph }: DefaultInspectorContentProps) {
  const audit = graph?.audit
  const sources = graph?.sourceHealth
  const laneCount = graph ? Object.keys(graph.lanes).length : 0
  const pipelineCount = graph?.pipeline.length ?? 0
  const continentCount = graph?.universe.length ?? 0
  const connectionsCount = graph?.connections.length ?? 0
  const semanticNodes = audit?.semanticNodeCount ?? 0
  const broken = audit?.brokenPaths.length ?? 0
  const orphan = audit?.orphanCount ?? 0
  const found = audit?.found ?? 0
  const missing = audit?.missing ?? 0

  const repoReadable = sources?.repo.readable ?? false
  const vaultReadable = sources?.vault.readable ?? false
  const status: 'ready' | 'degraded' | 'offline' =
    !graph ? 'offline'
    : (broken > 0 || !repoReadable || !vaultReadable) ? 'degraded'
    : 'ready'

  const statusLabel = status === 'ready' ? 'fonte canônica · ao vivo'
    : status === 'degraded' ? `${missing} peças sem fonte`
    : 'kernel offline'

  return (
    <>
      <div className="ins-header">
        <div className="ins-source">
          <span className={`ins-source-badge ${status === 'offline' ? 'missing' : status === 'degraded' ? 'mixed' : 'repo'}`}>
            {status === 'offline' ? 'offline' : 'cartografia'}
          </span>
          <span className="ins-source-path">{graph ? 'repo oficial + AtlasVault Obsidian' : 'aguardando kernel'}</span>
          <span className="ins-source-status" data-status={status}>{statusLabel}</span>
        </div>
        <div className="ins-kind">Continente · Atlas · AI Kernel Pipeline</div>
        <h2 className="ins-title">Atlas AI Kernel</h2>
        <p className="ins-lede">
          {pipelineCount} etapas canônicas · {laneCount} lanes laterais · evidence loop. A cartografia
          lê arquivos reais do filesystem; cada peça aponta para sua fonte verificável.
        </p>
      </div>

      <div className="ins-body">
        <div className="ins-section ins-identity">
          <h3>Identidade do continente</h3>
          <div className="ins-fit">
            <div className="fit-grid">
              <div className="fit-row">
                <span>etapas</span>
                <strong className="mono">{pipelineCount} · sequência 1..17</strong>
              </div>
              <div className="fit-row">
                <span>lanes</span>
                <strong className="mono">{laneCount} · domain · cap · biz · hks · evi · doc</strong>
              </div>
              <div className="fit-row">
                <span>conexões</span>
                <strong className="mono">{connectionsCount} · sequence · feed · feedback · governance</strong>
              </div>
              <div className="fit-row">
                <span>continentes</span>
                <strong className="mono">{continentCount} · atlas · memória · obras · forge · filosofia · gargalos</strong>
              </div>
              <div className="fit-row">
                <span>grafo semântico</span>
                <strong className="mono">{semanticNodes} nós · {audit?.semanticRelationCount ?? 0} relações</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="ins-section ins-audit">
          <h3>Saúde da fonte</h3>
          <div className="ins-fit">
            <div className="fit-grid">
              <div className="fit-row">
                <span>repo docs</span>
                <strong className="mono">
                  {repoReadable ? 'legível' : 'offline'} · {sources?.repo.indexedCount ?? 0} arquivos
                </strong>
              </div>
              <div className="fit-row">
                <span>atlasvault</span>
                <strong className="mono">
                  {vaultReadable ? 'legível' : 'offline'} · {sources?.vault.indexedCount ?? 0} notas
                </strong>
              </div>
              <div className="fit-row">
                <span>peças canon</span>
                <strong className="mono">
                  <span style={{ color: 'var(--moss)' }}>{found} fonte</span>
                  {missing > 0 ? <> · <span style={{ color: 'var(--rec-red)' }}>{missing} ausente</span></> : null}
                </strong>
              </div>
              {orphan > 0 ? (
                <div className="fit-row">
                  <span>órfãos</span>
                  <strong className="mono" style={{ color: 'var(--bronze-deep)' }}>{orphan} sem parent canônico</strong>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="ins-section ins-guide">
          <h3>Como ler o mapa</h3>
          <ul className="ins-guide-list">
            <li><kbd>hover</kbd> acende trilhas e popula o inspector sem trocar contexto</li>
            <li><kbd>click</kbd> isola uma peça — relacionadas continuam, resto desaparece</li>
            <li><kbd>double-click</kbd> entra em foco e revela a ficha completa</li>
            <li><kbd>/1</kbd>..<kbd>/5</kbd> trocam a lente: fluxo · relações · risco · recentes · evidência</li>
            <li><kbd>cmd+K</kbd> busca engrenagem, lane, sistema, nota</li>
            <li><kbd>esc</kbd> sai do foco · <kbd>⊟</kbd> reajusta zoom · <kbd>◉</kbd> centro do kernel</li>
          </ul>
        </div>

        <div className="ins-section ins-source-authority">
          <h3>Source authority</h3>
          <p className="ins-source-authority-body">
            A documentação oficial é a verdade. A Cartografia é a interface que torna
            essa verdade legível, navegável e verificável — sem intermediário.
          </p>
          <p className="ins-source-authority-foot">
            Repo docs → arquitetura técnica · AtlasVault → memória humana ·
            Evidence Ledger → eventos runtime. A cartografia lê; nunca escreve.
          </p>
        </div>
      </div>
    </>
  )
}
