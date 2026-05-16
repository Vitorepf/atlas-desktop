/**
 * Atlas AI · Rich Artifact dispatcher.
 *
 * Switch entre Diff/Flow/Tree baseado em variant. Cada subcomponent
 * tem a estética Atlas DNA (slate + gold) e nunca usa <style> inline
 * — todo CSS vive em atlas-ai.css escopado por surface.
 */
import type { ReactElement } from 'react'
import type { RichArtifactVariant } from '../markdown'
import { AtlasAiDiff } from './rich-artifacts/AtlasAiDiff'
import { AtlasAiFlow } from './rich-artifacts/AtlasAiFlow'
import { AtlasAiTree } from './rich-artifacts/AtlasAiTree'

interface AtlasAiRichArtifactProps {
  variant: RichArtifactVariant
  data: unknown
}

export function AtlasAiRichArtifact({ variant, data }: AtlasAiRichArtifactProps): ReactElement {
  if (variant === 'diff') return <AtlasAiDiff data={data} />
  if (variant === 'flow') return <AtlasAiFlow data={data} />
  if (variant === 'tree') return <AtlasAiTree data={data} />
  return (
    <div className="atlas-ai-rich-artifact atlas-ai-rich-artifact-error">
      variant desconhecido: {variant}
    </div>
  )
}
