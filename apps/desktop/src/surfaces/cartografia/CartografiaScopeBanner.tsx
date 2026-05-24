import type {
  AtlasWorkspaceProfile,
  CartographyArtifactGraphReplay,
  CartographyArtifactLakeReplay,
  CartographyRuntimeProjectionReplay,
} from '@atlas/domain'

/**
 * Cartografia · Project/Workspace scope banner.
 *
 * Canon: docs/engineering-knowledge-base/atlas-code-multi-project-workspace-os.md
 *
 * A Cartografia hoje renderiza o mapa canônico do Atlas. Quando o Projeto
 * ativo NÃO é o Atlas, ou quando `docs_status` declara incomplete, este
 * banner aparece como uma faixa fina no canto superior para que o operador
 * saiba honestamente o que está vendo — sem fingir que Blackink tem mapa
 * completo de docs.
 *
 * Princípio: visualização honesta. Sem dado fabricado, sem expansão
 * automática. Quando o read-model real de docs por Projeto chegar, este
 * banner desaparece.
 */
interface CartografiaScopeBannerProps {
  activeWorkspace: AtlasWorkspaceProfile | null
  defaultSlug?: string | null
  runtimeProjectionReplay?: CartographyRuntimeProjectionReplay | null
  artifactGraphReplay?: CartographyArtifactGraphReplay | null
  artifactLakeReplay?: CartographyArtifactLakeReplay | null
}

export function CartografiaScopeBanner({
  activeWorkspace,
  defaultSlug,
  runtimeProjectionReplay = null,
  artifactGraphReplay = null,
  artifactLakeReplay = null,
}: CartografiaScopeBannerProps) {
  const hasRuntimeStale = (runtimeProjectionReplay?.staleCount ?? 0) > 0
  const hasArtifactGraphStale = artifactGraphReplay?.stale === true
  const hasAwisStale = hasRuntimeStale || hasArtifactGraphStale
  const persistedFusionPacks = artifactLakeReplay?.conversationFusionPackCount ?? 0

  if (!activeWorkspace && !hasAwisStale && persistedFusionPacks === 0) return null

  const isDefault = !activeWorkspace || !defaultSlug || activeWorkspace.slug === defaultSlug
  const docsComplete = activeWorkspace?.docsStatus === 'canonical'

  if (isDefault && docsComplete && !hasAwisStale && persistedFusionPacks === 0) return null

  const staleFamilies = runtimeProjectionReplay?.staleFamilies?.join(', ') ?? ''
  const reason = hasAwisStale
    ? `AWIS stale · ${hasArtifactGraphStale && !hasRuntimeStale ? 'artifact graph' : staleFamilies || 'runtime projection'}`
    : persistedFusionPacks > 0
      ? `AWIS artifact lake · ${persistedFusionPacks} fusion pack${persistedFusionPacks > 1 ? 's' : ''}`
    : isDefault
      ? `docs ${activeWorkspace?.docsStatus}`
      : `escopo de ${activeWorkspace?.name} · Cartografia mostra docs do Atlas (default)`
  const label = hasAwisStale || persistedFusionPacks > 0 ? 'AWIS' : activeWorkspace?.name

  return (
    <div
      role="note"
      aria-label="Cartografia · escopo do Projeto ativo"
      style={{
        position: 'absolute',
        top: 10,
        right: 14,
        zIndex: 30,
        padding: '5px 10px',
        background: 'rgba(255,255,255,0.92)',
        border: '1px solid rgba(0,0,0,0.18)',
        borderRadius: 3,
        fontSize: 10,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        fontFamily: 'var(--cc-font-mono, ui-monospace, SFMono-Regular, monospace)',
        color: 'rgba(40,30,15,0.85)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        pointerEvents: 'none',
      }}
    >
      <strong style={{ marginRight: 6 }}>{label}</strong>
      <span style={{ opacity: 0.7 }}>·</span>
      <span style={{ marginLeft: 6 }}>{reason}</span>
    </div>
  )
}
