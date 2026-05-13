export function LoadingObraBar() {
  return (
    <section className="obra-bar">
      <div style={{ display: 'flex', alignItems: 'baseline', minWidth: 0 }}>
        <span className="obra-id" style={{ opacity: 0.45 }}>—</span>
        <span className="obra-objective" style={{ opacity: 0.55 }}>consultando Kernel…</span>
      </div>
    </section>
  )
}
