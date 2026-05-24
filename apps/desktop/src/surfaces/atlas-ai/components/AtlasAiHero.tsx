/**
 * Atlas AI · Hero state (empty conversation column).
 *
 * Hyperflow-first: o hero NÃO assume programação. Quando `mode==='auto'`
 * (default novo) mostramos chips multi-domínio cobrindo pesquisa, finanças,
 * marketing, programação, código review, organização pessoal, cyber e
 * automação. O operador clica num chip e o composer já entra pré-carregado.
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

const CHIPS_AUTO: ChipDef[] = [
  { label: 'Pesquisar mercado', prompt: 'Pesquisar mercado · descreva o tema e a profundidade desejada:\n\n' },
  { label: 'Analisar carteira', prompt: 'Analisar carteira · cole posições atuais e a pergunta de decisão:\n\n' },
  { label: 'Campanha marketing', prompt: 'Plano de campanha · público, canal, métrica de sucesso:\n\n' },
  { label: 'Revisar código', prompt: 'Revisar este código — risco, smell e próximo passo:\n\n' },
  { label: 'Diagnosticar bug', prompt: 'Diagnosticar este bug. Sintoma, stack e o que já tentei:\n\n' },
  { label: 'Organizar meta', prompt: 'Organizar meta pessoal · objetivo, prazo, próximas 3 ações:\n\n' },
  { label: 'Investigar tecnologia', prompt: 'Investigar tecnologia · contexto, comparações, decisões já tomadas:\n\n' },
  { label: 'Postura cyber', prompt: 'Avaliar postura defensiva · escopo, ativos, ameaça plausível:\n\n' },
  { label: 'Workflow automação', prompt: 'Desenhar workflow de automação · entrada, gatilho, saída:\n\n' },
]

const CHIPS: Record<AtlasAiMode, ChipDef[]> = {
  auto: CHIPS_AUTO,
  general: [
    { label: 'Pesquisar canon', prompt: 'Pesquisar canon Atlas sobre: ' },
    { label: 'Explicar conceito', prompt: 'Explicar este conceito para minha próxima decisão:\n\n' },
    { label: 'Rascunhar nota', prompt: 'Rascunhar uma nota curta sobre:\n\n' },
    { label: 'Resumir contexto', prompt: 'Resumir este contexto em 5 linhas operacionais:\n\n' },
  ],
  conversation: [
    { label: 'Conversa solta', prompt: 'Conversa solta — pergunta livre:\n\n' },
    { label: 'Debater ideia', prompt: 'Quero debater a ideia · me devolve o contraponto mais forte:\n\n' },
    { label: 'Trocar perspectiva', prompt: 'Olhar de outra perspectiva · contexto:\n\n' },
    { label: 'Resumir conversa', prompt: 'Resumir conversa em 5 linhas:\n\n' },
  ],
  operational: [
    { label: 'Status modelos', prompt: 'Status atual dos modelos Atlas Decide e impacto operacional:' },
    { label: 'Diagnóstico Atenção', prompt: 'Diagnóstico da fila de Atenção: o que está bloqueando humano agora?' },
    { label: 'Auditar deploy', prompt: 'Auditar o último deploy: o que mudou, o que rodou, o que ficou pendente?' },
    { label: 'Próxima decisão', prompt: 'Qual decisão humana mais urgente em aberto?' },
  ],
  programming: [
    { label: 'Revisar este código', prompt: 'Revisar este trecho — risco, smell e próximo passo:\n\n' },
    { label: 'Encontrar bug', prompt: 'Diagnosticar este bug. Sintoma, stack e o que já tentei:\n\n' },
    { label: 'Planejar feature', prompt: 'Planejar esta feature em fatias. Objetivo, riscos, critério de pronto:\n\n' },
    { label: 'Refatorar', prompt: 'Refatorar este trecho mantendo comportamento. Restrições e gosto:\n\n' },
  ],
  research: [
    { label: 'Pesquisar mercado', prompt: 'Pesquisar mercado · descreva tema e profundidade:\n\n' },
    { label: 'Comparar opções', prompt: 'Comparar opções técnicas A/B/C · critérios e decisão pendente:\n\n' },
    { label: 'Mapear estado da arte', prompt: 'Mapear estado da arte sobre:\n\n' },
    { label: 'Síntese executiva', prompt: 'Síntese executiva da pesquisa atual em 1 página:\n\n' },
  ],
  finance: [
    { label: 'Analisar carteira', prompt: 'Analisar carteira · posições, exposição, risco:\n\n' },
    { label: 'Avaliar custo', prompt: 'Avaliar custo de uma decisão · números atuais e cenários:\n\n' },
    { label: 'Decidir alocação', prompt: 'Decidir alocação · objetivo, prazo, restrições:\n\n' },
    { label: 'Auditar relatório', prompt: 'Auditar relatório financeiro · cole o relatório:\n\n' },
  ],
  marketing: [
    { label: 'Campanha de produto', prompt: 'Campanha de produto · público, canal, métrica:\n\n' },
    { label: 'Copy persuasivo', prompt: 'Copy persuasivo · contexto, audiência, ação desejada:\n\n' },
    { label: 'Métricas relevantes', prompt: 'Métricas relevantes para acompanhar esta campanha:\n\n' },
    { label: 'Plano editorial', prompt: 'Plano editorial · objetivo e cadência:\n\n' },
  ],
  strategy: [
    { label: 'Priorizar objetivos', prompt: 'Priorizar objetivos · lista atual e restrições:\n\n' },
    { label: 'Decisão go/no-go', prompt: 'Decisão go/no-go · contexto, riscos, opção descartada:\n\n' },
    { label: 'Roadmap trimestral', prompt: 'Roadmap trimestral · meta, marcos, gates:\n\n' },
    { label: 'Postmortem decisão', prompt: 'Postmortem de decisão · o que aprendi:\n\n' },
  ],
  personal_development: [
    { label: 'Organizar meta', prompt: 'Organizar meta · objetivo, prazo, próximas ações:\n\n' },
    { label: 'Plano semanal', prompt: 'Plano semanal · prioridades reais e tempo livre:\n\n' },
    { label: 'Hábito novo', prompt: 'Hábito novo · gatilho, recompensa, métrica:\n\n' },
    { label: 'Postmortem pessoal', prompt: 'Postmortem da semana · o que funcionou:\n\n' },
  ],
  cyber: [
    { label: 'Postura defensiva', prompt: 'Avaliar postura defensiva · escopo, ativos, ameaça plausível:\n\n' },
    { label: 'Threat model', prompt: 'Threat model · contexto e superfície:\n\n' },
    { label: 'Auditar log', prompt: 'Auditar log · cole o trecho relevante:\n\n' },
    { label: 'Resposta incidente', prompt: 'Resposta a incidente · escopo, próximos passos seguros:\n\n' },
  ],
  automation: [
    { label: 'Workflow novo', prompt: 'Desenhar workflow · entrada, gatilho, saída, validações:\n\n' },
    { label: 'Integrar APIs', prompt: 'Integrar APIs · contratos e mapeamento de dados:\n\n' },
    { label: 'Script utilitário', prompt: 'Script utilitário · objetivo, restrições, formato saída:\n\n' },
    { label: 'Pipeline regular', prompt: 'Pipeline recorrente · cadência, falhas previstas, observabilidade:\n\n' },
  ],
}

const COPY: Record<AtlasAiMode, { eyebrow: string; title: string; hint: string }> = {
  auto: {
    eyebrow: 'Atlas AI · Atlas decide',
    title: 'Comece — Atlas decide o caminho pelo contexto.',
    hint: 'Pesquisa, código, finanças, campanha, estratégia, cyber, automação ou conversa solta — escreva e o Atlas escolhe o caminho.',
  },
  general: {
    eyebrow: 'Atlas AI · Geral',
    title: 'Comece — pesquisa, ideia, dúvida.',
    hint: 'Atlas AI é uma única inteligência. Conversa solta vive aqui; promove para Obra apenas quando virar trabalho real.',
  },
  conversation: {
    eyebrow: 'Atlas AI · Conversa',
    title: 'Comece — troca livre, sem domínio técnico.',
    hint: 'Conversa solta com Atlas: ideias, perguntas, contrapontos. Sem assumir programação ou operacional.',
  },
  operational: {
    eyebrow: 'Atlas Ops · Operacional',
    title: 'Comece — diagnóstico, status, próxima ação.',
    hint: 'Atlas Ops responde sobre serviço local, fila Atenção, modelos e custos. Nenhuma decisão é tomada por você.',
  },
  programming: {
    eyebrow: 'Atlas Dev · Programação',
    title: 'Comece — Atlas escuta antes da Obra.',
    hint: 'Bug pequeno, debug, review ou planejamento técnico vivem aqui sem exigir Forge. Promovo para Obra só quando o trabalho crescer.',
  },
  research: {
    eyebrow: 'Atlas AI · Pesquisa',
    title: 'Comece — pesquisa técnica ou de mercado.',
    hint: 'Investigação séria com fontes, comparações e síntese executiva — sem assumir programação.',
  },
  finance: {
    eyebrow: 'Atlas AI · Finanças',
    title: 'Comece — análise financeira ou de carteira.',
    hint: 'Atlas escuta números, expõe risco e devolve a decisão; aprovação humana exigida em ordem real.',
  },
  marketing: {
    eyebrow: 'Atlas AI · Marketing',
    title: 'Comece — campanha, copy, métrica.',
    hint: 'Campanha, copy persuasivo ou plano editorial; publicação exige aprovação explícita.',
  },
  strategy: {
    eyebrow: 'Atlas AI · Estratégia',
    title: 'Comece — objetivo, prioridade, escolha.',
    hint: 'Decisões altas: priorização, roadmap, postmortem. Atlas separa fato de hipótese.',
  },
  personal_development: {
    eyebrow: 'Atlas AI · Pessoal',
    title: 'Comece — meta, hábito, organização.',
    hint: 'Atlas ajuda a estruturar meta, hábito ou plano semanal. Sem fronteiras clínicas.',
  },
  cyber: {
    eyebrow: 'Atlas AI · Cyber',
    title: 'Comece — postura defensiva ou auditoria.',
    hint: 'Threat model, auditoria de log, resposta a incidente. Atividade ofensiva exige RoE escrita.',
  },
  automation: {
    eyebrow: 'Atlas AI · Automação',
    title: 'Comece — workflow, integração, pipeline.',
    hint: 'Desenho de workflow, integração de API, script utilitário. Atlas separa o que pode rodar do que precisa aprovação.',
  },
}

/** Saudação contextual por hora do dia (Apple HIG Home humano). */
function timeOfDayGreeting(): string {
  const h = new Date().getHours()
  if (h < 5) return 'boa madrugada'
  if (h < 12) return 'bom dia'
  if (h < 18) return 'boa tarde'
  return 'boa noite'
}

export function AtlasAiHero({
  mode,
  workspaceName,
  threadCount,
  onUseChip,
}: AtlasAiHeroProps) {
  const copy = COPY[mode] ?? COPY.auto
  const chips = CHIPS[mode] ?? CHIPS.auto
  const greeting = timeOfDayGreeting()
  return (
    <section className="atlas-ai-hero" aria-label="Comece uma conversa Atlas AI">
      <p className="atlas-ai-hero-greeting">{greeting}</p>
      <h2>{copy.title}</h2>
      <p className="atlas-ai-hero-hint">
        {copy.hint}
      </p>
      {(workspaceName || threadCount > 0) && (
        <p className="atlas-ai-hero-context">
          {workspaceName ? (
            <>projeto · <span className="atlas-ai-hero-context-name">{workspaceName}</span></>
          ) : null}
          {workspaceName && threadCount > 0 ? ' · ' : ''}
          {threadCount > 0 ? (
            <>
              <span className="atlas-ai-hero-context-count">{threadCount.toLocaleString('pt-BR')}</span>
              {' '}conversa{threadCount === 1 ? '' : 's'} guardada{threadCount === 1 ? '' : 's'}
            </>
          ) : null}
        </p>
      )}

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
            <span className="atlas-ai-hero-chip-icon" aria-hidden="true">
              <svg viewBox="0 0 10 10" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3.2 1.4 7.6 5 3.2 8.6" />
              </svg>
            </span>
            {chip.label}
          </button>
        ))}
      </div>
    </section>
  )
}
