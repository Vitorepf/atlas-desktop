interface AttentionErrorProps {
  message: string
  onRetry: () => void
}

export function AttentionError({ message, onRetry }: AttentionErrorProps) {
  return (
    <section className="atencao-error" role="alert">
      <h2>Atenção sem leitura</h2>
      <p>O kernel respondeu com erro. Atenção não inventa fila — corrija a conexão e tente novamente.</p>
      <pre className="atencao-error-detail">{message}</pre>
      <button type="button" className="atencao-action atencao-action-primary" onClick={onRetry}>
        Tentar novamente
      </button>
    </section>
  )
}
