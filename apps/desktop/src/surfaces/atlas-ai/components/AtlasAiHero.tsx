/**
 * Atlas AI · Hero state (empty conversation column).
 *
 * Substitui o card apático "Nenhuma conversa selecionada" por um bloco
 * convidativo: eyebrow + título editorial + parágrafo + chips de prompt
 * por modo. Clicar num chip pré-carrega o composer com o texto sugerido,
 * pronto para Cmd+Enter. Premium e silencioso — sem decoração SaaS.
 */
import type { AtlasAiMode } from '../types'

interface AtlasAiHeroProps {
  mode: AtlasAiMode
  workspaceName: string | null
  threadCount: number
  /** @deprecated kept for layout shifts; chips render regardless of backend health */
  hasError?: boolean
  onUseChip: (text: string) => void
}

interface ChipDef {
  label: string
  prompt: string
}

const CHIPS: Record<AtlasAiMode, ChipDef[]> = {
  programming: [
    { label: 'Revisar este código', prompt: 'Revisar este trecho — risco, smell e próximo passo:\n\n' },
    { label: 'Encontrar bug', prompt: 'Diagnosticar este bug. Sintoma, stack e o que já tentei:\n\n' },
    { label: 'Planejar feature', prompt: 'Planejar esta feature em fatias. Objetivo, riscos, critério de pronto:\n\n' },
    { label: 'Refatorar', prompt: 'Refatorar este trecho mantendo comportamento. Restrições e gosto:\n\n' },
  ],
  operational: [
    { label: 'Status providers', prompt: 'Status atual dos providers Atlas Decide e impacto operacional:' },
    { label: 'Diagnóstico Atenção', prompt: 'Diagnóstico da fila de Atenção: o que está bloqueando humano agora?' },
    { label: 'Auditar deploy', prompt: 'Auditar o último deploy: o que mudou, o que rodou, o que ficou pendente?' },
    { label: 'Próxima decisão', prompt: 'Qual decisão humana mais urgente em aberto?' },
  ],
  general: [
    { label: 'Pesquisar canon', prompt: 'Pesquisar canon Atlas sobre: ' },
    { label: 'Explicar conceito', prompt: 'Explicar este conceito para minha próxima decisão:\n\n' },
    { label: 'Rascunhar nota', prompt: 'Rascunhar uma nota curta sobre:\n\n' },
    { label: 'Resumir contexto', prompt: 'Resumir este contexto em 5 linhas operacionais:\n\n' },
  ],
}

const COPY: Record<AtlasAiMode, { eyebrow: string; title: string; hint: string }> = {
  programming: {
    eyebrow: 'Atlas Dev · Programação',
    title: 'Comece — Atlas escuta antes da Obra.',
    hint: 'Bug pequeno, debug, review ou planejamento técnico vivem aqui sem exigir Forge. Promovo para Obra só quando o trabalho crescer.',
  },
  operational: {
    eyebrow: 'Atlas Ops · Operacional',
    title: 'Comece — diagnóstico, status, próxima ação.',
    hint: 'Atlas Ops responde sobre estado real do kernel, fila Atenção, providers e custos. Nenhuma decisão é tomada por você.',
  },
  general: {
    eyebrow: 'Atlas AI · Geral',
    title: 'Comece — pesquisa, ideia, dúvida.',
    hint: 'Atlas AI é uma única inteligência. Conversa solta vive aqui; promove para Obra apenas quando virar trabalho real.',
  },
}

export function AtlasAiHero({
  mode,
  workspaceName,
  threadCount,
  onUseChip,
}: AtlasAiHeroProps) {
  const copy = COPY[mode]
  const chips = CHIPS[mode]
  return (
    <section className="atlas-ai-hero" aria-label="Comece uma conversa Atlas AI">
      <p className="atlas-ai-hero-eyebrow">{copy.eyebrow}</p>
      <h2>{copy.title}</h2>
      <p>
        {copy.hint}
        {workspaceName ? ` · Workspace ativo: ${workspaceName}.` : ''}
        {threadCount > 0
          ? ` · ${threadCount} conversa${threadCount === 1 ? '' : 's'} ${threadCount === 1 ? 'guardada' : 'guardadas'}.`
          : ''}
      </p>

      <div className="atlas-ai-hero-chips" role="list" aria-label="Sugestões de início">
        {chips.map((chip) => (
          <button
            key={chip.label}
            type="button"
            role="listitem"
            className="atlas-ai-hero-chip"
            onClick={() => onUseChip(chip.prompt)}
            title="Carrega o composer com este início — você edita antes de enviar"
          >
            <span className="atlas-ai-hero-chip-icon" aria-hidden="true">›</span>
            {chip.label}
          </button>
        ))}
      </div>
    </section>
  )
}
