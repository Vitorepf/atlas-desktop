export function DefaultInspectorContent() {
  return (
    <div className="ins-content">
      <div className="ins-header">
        <div className="ins-source">
          <span className="ins-source-badge mixed">cartografia</span>
          <span className="ins-source-path">repo oficial + AtlasVault</span>
          <span className="ins-source-status">aguardando seleção</span>
        </div>
        <div className="ins-kind">Leitura canônica</div>
        <h2 className="ins-title">Selecione uma peça do mapa</h2>
        <p className="ins-lede">
          O painel carrega o arquivo real quando uma engrenagem, sistema ou nota fica em foco.
        </p>
      </div>
      <div className="ins-body">
        <details className="ins-md" open>
          <summary>
            <span className="ins-md-title">Conteúdo do arquivo</span>
            <span className="ins-md-meta">— nenhum arquivo selecionado</span>
          </summary>
          <div className="ins-md-body">
            <p style={{ color: 'var(--ink3)', fontStyle: 'italic' }}>
              Este painel só renderiza conteúdo depois que a Cartografia recebe uma fonte real do backend.
            </p>
          </div>
        </details>
      </div>
    </div>
  )
}
