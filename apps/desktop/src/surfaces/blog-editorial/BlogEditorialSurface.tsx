import type { ReactElement } from 'react'

import './blog-editorial.css'
import { useBlogEditorialState } from './useBlogEditorialState'
import type { BlogEditorialCandidate, BlogEditorialPost, BlogEditorialWeek } from './types'

function formatTime(value: string | null): string {
  if (!value) return 'ainda nao sincronizado'
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(value))
  } catch {
    return value
  }
}

function asCandidateList(value: unknown): BlogEditorialCandidate[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is BlogEditorialCandidate => typeof item === 'object' && item !== null)
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
}

function postStatus(post: BlogEditorialPost): 'published' | 'ready' | 'blocked' {
  if (post.published) return 'published'
  if (post.ready) return 'ready'
  return 'blocked'
}

function postStatusLabel(post: BlogEditorialPost): string {
  const status = postStatus(post)
  if (status === 'published') return 'publicado'
  if (status === 'ready') return 'proximo'
  return 'bloqueado'
}

export function BlogEditorialSurface(): ReactElement {
  const { state, loading, error, mode, lastFetchedAt, refresh } = useBlogEditorialState()

  if (mode === 'offline') {
    return (
      <section className="blog-editorial-surface blog-editorial-surface--offline">
        <header className="blog-editorial-hero">
          <span className="blog-editorial-eyebrow">blog editorial</span>
          <h1>Blog</h1>
          <p>Conecte o Atlas Server para ver a fila editorial, prerequisitos e o proximo texto.</p>
        </header>
        <p className="blog-editorial-empty">
          Configure <code>VITE_ATLAS_SERVER_URL</code> e <code>VITE_ATLAS_TOKEN</code> para ativar esta surface.
        </p>
      </section>
    )
  }

  const planner = state?.planner
  const summary = planner?.summary
  const counts = planner?.operating_state?.counts
  const backlog = planner?.backlog
  const weeks = backlog?.weeks ?? []
  const nextPost = planner?.operating_state?.next_post ?? planner?.next_ready_post ?? null
  const frontier = planner?.operating_state?.publication_frontier
  const reviewQueue = planner?.operating_state?.review_queue ?? planner?.review_queue
  const readiness = planner?.graph_rag_readiness
  const graphContext = planner?.editorial_graph_context
  const graphCandidates = planner?.editorial_graph_candidates
  const operations = planner?.operations_packet
  const publishingPlan = operations?.publishing_plan
  const publishingSlots = Array.isArray(publishingPlan?.next_slots) ? publishingPlan.next_slots : []
  const editorialRoadmap = operations?.editorial_roadmap
  const roadmapPhases = Array.isArray(editorialRoadmap?.phases) ? editorialRoadmap.phases : []
  const dependencyMatrix = operations?.editorial_dependency_matrix
  const dependencyRows = Array.isArray(dependencyMatrix?.rows) ? dependencyMatrix.rows : []
  const topicLedger = operations?.topic_ledger
  const topicRows = Array.isArray(topicLedger?.rows) ? topicLedger.rows : []
  const topicOpportunities = Array.isArray(topicLedger?.next_topic_opportunities)
    ? topicLedger.next_topic_opportunities
    : []
  const writingPacket = planner?.writing_packet ?? operations?.writing_packet ?? null
  const sourcePosture = planner?.operating_state?.source_posture
  const writingBrief = writingPacket?.writing_brief
  const draftSeed = writingPacket?.draft_seed
  const writingOutline = asStringList(writingBrief?.outline)
  const writingMustInclude = asStringList(writingBrief?.must_include)
  const writingMustNotInclude = asStringList(writingBrief?.must_not_include)
  const futureTopicsToAvoid = asStringList(writingPacket?.coverage_snapshot?.future_topics_to_avoid)
  const draftSections = Array.isArray(draftSeed?.section_seeds) ? draftSeed.section_seeds : []
  const draftReviewChecklist = asStringList(draftSeed?.review_checklist)
  const radarCandidates = asCandidateList(planner?.editorial_radar?.candidates)
  const operatingCandidates = asCandidateList(planner?.operating_state?.candidate_pipeline?.top_candidates)
  const backlogCandidates = asCandidateList(planner?.backlog_candidates)
  const boundedGraphCandidates = asCandidateList(graphCandidates?.candidates)
  const candidates = radarCandidates.length > 0
    ? radarCandidates
    : boundedGraphCandidates.length > 0
      ? boundedGraphCandidates
      : operatingCandidates.length > 0
        ? operatingCandidates
        : backlogCandidates
  const guardrails = state?.area.guardrails ?? {}

  return (
    <section className="blog-editorial-surface">
      <header className="blog-editorial-hero">
        <div>
          <span className="blog-editorial-eyebrow">publicacao publica · ordem primeiro</span>
          <h1>Blog</h1>
          <p>
            A fila do blog como sistema: cronologia, prerequisitos, colecoes, contexto e revisao antes de publicar.
          </p>
        </div>
        <div className="blog-editorial-actions">
          <span className="blog-editorial-pill">{loading ? 'sincronizando' : mode}</span>
          <span className="blog-editorial-pill">read-only</span>
          <button type="button" onClick={() => void refresh()}>
            atualizar
          </button>
        </div>
      </header>

      {error ? <p className="blog-editorial-error">Erro ao carregar estado: {error.message}</p> : null}

      <div className="blog-editorial-metrics" aria-label="Resumo editorial">
        <Metric label="planejados" value={counts?.planned_posts ?? summary?.planned_posts ?? 0} />
        <Metric label="publicados" value={counts?.published_posts ?? summary?.published_posts ?? 0} />
        <Metric label="prontos" value={counts?.ready_posts ?? summary?.ready_posts ?? 0} />
        <Metric label="bloqueados" value={counts?.blocked_posts ?? summary?.blocked_posts ?? 0} />
      </div>

      <div className="blog-editorial-grid">
        <section className="blog-editorial-panel blog-editorial-panel--primary">
          <PanelHeader
            label="proximo texto"
            meta={frontier?.sequence_health ? String(frontier.sequence_health) : 'sequencia governada'}
          />
          {nextPost ? (
            <article className="blog-editorial-next">
              <span className="blog-editorial-order">{String(nextPost.order).padStart(2, '0')}</span>
              <div>
                <h2>{nextPost.title}</h2>
                <p>{nextPost.main_question ?? 'Pergunta principal ainda nao definida.'}</p>
                <div className="blog-editorial-meta">
                  <span>{nextPost.week_theme ?? `semana ${nextPost.week ?? '-'}`}</span>
                  <span>{nextPost.complexity_level ?? 'nivel aberto'}</span>
                  <span>{nextPost.collection ?? 'sem colecao'}</span>
                </div>
              </div>
            </article>
          ) : (
            <p className="blog-editorial-empty">Nenhum post pronto no momento.</p>
          )}
        </section>

        <section className="blog-editorial-panel">
          <PanelHeader label="fronteira" meta={`sync ${formatTime(lastFetchedAt)}`} />
          <dl className="blog-editorial-kv">
            <div>
              <dt>proxima ordem</dt>
              <dd>{frontier?.next_sequence_order ?? nextPost?.order ?? '-'}</dd>
            </div>
            <div>
              <dt>revisao</dt>
              <dd>{reviewQueue?.status ?? 'sem fila'}</dd>
            </div>
            <div>
              <dt>itens em revisao</dt>
              <dd>{reviewQueue?.item_count ?? reviewQueue?.items?.length ?? 0}</dd>
            </div>
            <div>
              <dt>RAG/graph</dt>
              <dd>{readiness?.status ?? 'bounded'}</dd>
            </div>
          </dl>
        </section>
      </div>

      <div className="blog-editorial-grid blog-editorial-grid--ops">
        <section className="blog-editorial-panel blog-editorial-panel--primary">
          <PanelHeader
            label="operacao de hoje"
            meta={operations?.next_action?.action ?? 'calcular proxima acao'}
          />
          <div className="blog-editorial-operation">
            <span className="blog-editorial-order">
              {operations?.next_action?.order ? String(operations.next_action.order).padStart(2, '0') : '--'}
            </span>
            <div>
              <h2>{operations?.next_action?.title ?? 'Sem acao pronta'}</h2>
              <p>{operations?.next_action?.why ?? 'O Atlas ainda nao encontrou uma proxima acao editorial segura.'}</p>
              {writingBrief ? (
                <div className="blog-editorial-brief">
                  <strong>{writingBrief.primary_question ?? 'Pergunta principal nao definida.'}</strong>
                  <span>{writingBrief.reader_promise ?? 'Promessa ao leitor ainda nao calculada.'}</span>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="blog-editorial-panel">
          <PanelHeader label="postura de fontes" meta={readiness?.status ?? 'p1'} />
          <dl className="blog-editorial-kv">
            <div>
              <dt>arquivo publico</dt>
              <dd>{sourcePosture?.public_archive_posts ?? operations?.source_snapshot?.public_archive_posts ?? 0}</dd>
            </div>
            <div>
              <dt>open brain</dt>
              <dd>{sourcePosture?.open_brain_context_pack ?? operations?.source_snapshot?.open_brain_status ?? 'unknown'}</dd>
            </div>
            <div>
              <dt>code intelligence</dt>
              <dd>{sourcePosture?.code_intelligence ?? 'unknown'}</dd>
            </div>
            <div>
              <dt>graph/RAG</dt>
              <dd>{readiness?.status ?? sourcePosture?.graph_retrieval ?? 'unknown'}</dd>
            </div>
            <div>
              <dt>componentes</dt>
              <dd>{readiness?.summary?.available_component_count ?? 0}</dd>
            </div>
            <div>
              <dt>bloqueios</dt>
              <dd>{readiness?.summary?.blocking_item_count ?? 0}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="blog-editorial-panel blog-editorial-panel--wide">
        <PanelHeader
          label="jornada editorial"
          meta={editorialRoadmap?.summary?.active_phase_label ?? 'ordem conceitual'}
        />
        {editorialRoadmap ? (
          <div className="blog-editorial-roadmap">
            <div className="blog-editorial-roadmap__lead">
              <dl className="blog-editorial-kv">
                <div>
                  <dt>fases</dt>
                  <dd>{editorialRoadmap.summary?.phase_count ?? 0}</dd>
                </div>
                <div>
                  <dt>posts</dt>
                  <dd>{editorialRoadmap.summary?.planned_posts ?? 0}</dd>
                </div>
                <div>
                  <dt>publicados</dt>
                  <dd>{editorialRoadmap.summary?.published_posts ?? 0}</dd>
                </div>
                <div>
                  <dt>assuntos</dt>
                  <dd>{editorialRoadmap.summary?.topic_count ?? 0}</dd>
                </div>
              </dl>
              <p>
                A jornada organiza a leitura do raso ao profundo. Ela explica a ordem, mas nao muda a fila sem revisao humana.
              </p>
            </div>
            <ol className="blog-editorial-roadmap__phases">
              {roadmapPhases.map((phase) => (
                <li key={phase.key ?? phase.label ?? 'phase'} data-status={phase.status ?? 'empty'}>
                  <span>{String(phase.position ?? 0).padStart(2, '0')}</span>
                  <div>
                    <div className="blog-editorial-roadmap__phase-head">
                      <strong>{phase.label ?? phase.key ?? 'Fase sem nome'}</strong>
                      <small>{phase.status ?? 'empty'} · {phase.post_count ?? 0} posts</small>
                    </div>
                    <p>{phase.intent ?? 'Sem intencao definida.'}</p>
                    {phase.next_post ? (
                      <em>
                        proximo: {phase.next_post.title ?? phase.next_post.slug ?? 'post sem titulo'}
                      </em>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <p className="blog-editorial-empty">Jornada editorial ainda nao carregada.</p>
        )}
      </section>

      <section className="blog-editorial-panel blog-editorial-panel--wide">
        <PanelHeader
          label="escada de dependencias"
          meta={`${dependencyMatrix?.summary?.blocked_post_count ?? 0} bloqueados`}
        />
        {dependencyMatrix ? (
          <div className="blog-editorial-dependency-matrix">
            <div className="blog-editorial-dependency-matrix__summary">
              <div>
                <span>proximo liberado</span>
                <strong>{dependencyMatrix.summary?.current_unlocked_slug ?? 'nenhum'}</strong>
                <p>
                  A matriz protege a ordem: cada texto sabe o que precisa existir antes, o que deve introduzir agora e o que ainda deve ficar para depois.
                </p>
              </div>
              <dl className="blog-editorial-kv">
                <div>
                  <dt>posts</dt>
                  <dd>{dependencyMatrix.summary?.post_count ?? 0}</dd>
                </div>
                <div>
                  <dt>fases</dt>
                  <dd>{dependencyMatrix.summary?.phase_count ?? 0}</dd>
                </div>
                <div>
                  <dt>alertas</dt>
                  <dd>{dependencyMatrix.summary?.foundation_warning_count ?? 0}</dd>
                </div>
              </dl>
            </div>
            {dependencyRows.length > 0 ? (
              <ol className="blog-editorial-dependency-rows">
                {dependencyRows.slice(0, 7).map((row) => {
                  const missing = asStringList(row.depends_on?.missing_prerequisites)
                  const avoid = asStringList(row.reader_contract?.avoid_until_later)

                  return (
                    <li key={`${row.order ?? 0}-${row.slug ?? row.title ?? 'dependency'}`} data-readiness={row.readiness ?? 'planned'}>
                      <span>{String(row.order ?? '--').padStart(2, '0')}</span>
                      <div>
                        <strong>{row.title ?? row.slug ?? 'Post sem titulo'}</strong>
                        <small>
                          {row.phase?.label ?? 'fase aberta'} · {row.complexity_level ?? 'nivel aberto'} · {row.readiness ?? 'planejado'}
                        </small>
                        <p>{row.position_reason ?? row.reader_contract?.rule ?? 'Manter a progressao do leitor.'}</p>
                        <em>
                          {missing.length > 0
                            ? `depende de ${missing.join(', ')}`
                            : avoid.length > 0
                              ? `evitar por enquanto: ${avoid.slice(0, 3).join(', ')}`
                              : 'sem prerequisito pendente'}
                        </em>
                      </div>
                    </li>
                  )
                })}
              </ol>
            ) : (
              <p className="blog-editorial-empty">Matriz de dependencias ainda nao carregada.</p>
            )}
          </div>
        ) : (
          <p className="blog-editorial-empty">Escada de dependencias ainda nao carregada.</p>
        )}
      </section>

      <section className="blog-editorial-panel blog-editorial-panel--wide">
        <PanelHeader
          label="plano de publicacao"
          meta={publishingPlan?.cadence ?? 'um texto por vez'}
        />
        {publishingPlan ? (
          <div className="blog-editorial-publishing-plan">
            <div className="blog-editorial-publishing-plan__summary">
              <div>
                <span>acao de hoje</span>
                <strong>{publishingPlan.today_lane?.action ?? 'calcular proximo passo'}</strong>
                <p>{publishingPlan.today_lane?.rule ?? publishingPlan.rule ?? 'A ordem importa mais que a data.'}</p>
              </div>
              <dl className="blog-editorial-kv">
                <div>
                  <dt>slots</dt>
                  <dd>{publishingPlan.summary?.slot_count ?? 0}</dd>
                </div>
                <div>
                  <dt>prontos</dt>
                  <dd>{publishingPlan.summary?.ready_slots ?? 0}</dd>
                </div>
                <div>
                  <dt>bloqueados</dt>
                  <dd>{publishingPlan.summary?.blocked_slots ?? 0}</dd>
                </div>
                <div>
                  <dt>revisao</dt>
                  <dd>{publishingPlan.summary?.review_queue_candidates ?? 0}</dd>
                </div>
              </dl>
            </div>
            {publishingSlots.length > 0 ? (
              <ol className="blog-editorial-publishing-slots">
                {publishingSlots.slice(0, 6).map((slot) => (
                  <li key={`${slot.order ?? 0}-${slot.slug ?? slot.title ?? 'slot'}`} data-status={slot.status ?? 'planned'}>
                    <span>{String(slot.order ?? '--').padStart(2, '0')}</span>
                    <div>
                      <strong>{slot.title ?? slot.slug ?? 'Post sem titulo'}</strong>
                      <small>{slot.label ?? slot.day ?? 'sem data'} · {slot.pipeline_stage ?? slot.status ?? 'planejado'}</small>
                      <p>{slot.human_action ?? 'manter na sequencia'}</p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="blog-editorial-empty">Nenhum slot de publicacao calculado.</p>
            )}
          </div>
        ) : (
          <p className="blog-editorial-empty">Plano de publicacao ainda nao carregado.</p>
        )}
      </section>

      <section className="blog-editorial-panel blog-editorial-panel--wide">
        <PanelHeader
          label="mapa de assuntos"
          meta={`${topicLedger?.summary?.topic_count ?? 0} assuntos`}
        />
        {topicLedger ? (
          <div className="blog-editorial-topic-ledger">
            <div className="blog-editorial-topic-ledger__summary">
              <dl className="blog-editorial-kv">
                <div>
                  <dt>planejados</dt>
                  <dd>{topicLedger.summary?.planned_topic_count ?? 0}</dd>
                </div>
                <div>
                  <dt>publicados</dt>
                  <dd>{topicLedger.summary?.published_topic_count ?? 0}</dd>
                </div>
                <div>
                  <dt>candidatos</dt>
                  <dd>{topicLedger.summary?.candidate_topic_count ?? 0}</dd>
                </div>
                <div>
                  <dt>lacunas</dt>
                  <dd>{topicLedger.summary?.foundation_gap_count ?? topicLedger.summary?.gap_count ?? 0}</dd>
                </div>
              </dl>
              <p>
                O mapa cruza assuntos planejados, publicados e candidatos. Ele orienta a sequencia, mas nao reordena nem publica nada sozinho.
              </p>
            </div>
            <div className="blog-editorial-topic-ledger__grid">
              {(topicOpportunities.length > 0 ? topicOpportunities : topicRows).slice(0, 8).map((row) => (
                <article key={row.topic ?? row.example_title ?? 'topic'} className="blog-editorial-topic-card" data-status={row.status ?? 'open'}>
                  <span>{row.status ?? 'aberto'}</span>
                  <strong>{row.topic?.replaceAll('-', ' ') ?? row.example_title ?? 'assunto sem nome'}</strong>
                  <small>
                    {row.planned_count ?? 0} planejados · {row.published_count ?? 0} publicados · {row.candidate_count ?? 0} candidatos
                  </small>
                  <p>{row.next_action?.replaceAll('_', ' ') ?? 'manter na sequencia'}</p>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <p className="blog-editorial-empty">Mapa de assuntos ainda nao carregado.</p>
        )}
      </section>

      <section className="blog-editorial-panel blog-editorial-panel--wide">
        <PanelHeader label="trilho cronologico" meta={backlog?.cadence ?? '5 posts por semana'} />
        {weeks.length > 0 ? (
          <div className="blog-editorial-weeks">
            {weeks.map((week) => (
              <WeekRail key={week.week} week={week} />
            ))}
          </div>
        ) : (
          <p className="blog-editorial-empty">Backlog ainda nao carregado.</p>
        )}
      </section>

      <section className="blog-editorial-panel blog-editorial-panel--wide">
        <PanelHeader
          label="pacote de escrita"
          meta={writingPacket?.status ?? 'preparacao privada'}
        />
        {writingPacket ? (
          <div className="blog-editorial-writing-packet">
            <div className="blog-editorial-writing-packet__lead">
              <span className="blog-editorial-order">
                {writingPacket.post?.order ? String(writingPacket.post.order).padStart(2, '0') : '--'}
              </span>
              <div>
                <h2>{writingPacket.post?.title ?? nextPost?.title ?? 'Proximo texto'}</h2>
                <p>{writingBrief?.reader_promise ?? writingPacket.post?.goal ?? 'Pacote pronto para preparar um rascunho revisavel.'}</p>
                <div className="blog-editorial-meta">
                  <span>{writingBrief?.language ?? 'pt-BR'}</span>
                  <span>{writingPacket.post?.complexity_level ?? 'nivel aberto'}</span>
                  <span>{writingPacket.post?.collection ?? 'sem colecao'}</span>
                </div>
              </div>
            </div>

            <div className="blog-editorial-writing-packet__body">
              <div className="blog-editorial-writing-card blog-editorial-writing-card--wide">
                <span>pergunta central</span>
                <strong>{writingBrief?.primary_question ?? writingPacket.post?.main_question ?? 'Pergunta ainda nao calculada.'}</strong>
                <p>{writingPacket.sequence?.rule ?? 'Escrever somente o que este post pode introduzir neste ponto da sequencia.'}</p>
              </div>

              {draftSeed ? (
                <div className="blog-editorial-writing-card blog-editorial-writing-card--wide blog-editorial-draft-seed">
                  <span>rascunho privado</span>
                  <strong>{draftSeed.working_thesis ?? 'Seed privado pronto para revisao.'}</strong>
                  <p>{draftSeed.lede_seed?.paragraph_prompt ?? 'Abrir com contexto humano antes de entrar em arquitetura.'}</p>
                  <div className="blog-editorial-draft-seed__meta">
                    <small>{draftSeed.mode ?? 'private_review_seed_p1'}</small>
                    <small>{draftSeed.guardrails?.writes_draft ? 'escreve draft' : 'nao escreve arquivo'}</small>
                    <small>{draftSeed.guardrails?.publishes_content ? 'publica' : 'nao publica'}</small>
                  </div>
                </div>
              ) : null}

              <div className="blog-editorial-writing-card">
                <span>estrutura</span>
                {writingOutline.length > 0 ? (
                  <ol>
                    {writingOutline.slice(0, 6).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ol>
                ) : (
                  <p>Outline ainda nao disponivel.</p>
                )}
              </div>

              <div className="blog-editorial-writing-card">
                <span>obrigatorio incluir</span>
                {writingMustInclude.length > 0 ? (
                  <ul>
                    {writingMustInclude.slice(0, 6).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p>Sem itens obrigatorios calculados.</p>
                )}
              </div>

              <div className="blog-editorial-writing-card">
                <span>nao aprofundar ainda</span>
                {(writingMustNotInclude.length > 0 || futureTopicsToAvoid.length > 0) ? (
                  <ul>
                    {[...writingMustNotInclude, ...futureTopicsToAvoid].slice(0, 6).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p>Nenhum limite adicional calculado.</p>
                )}
              </div>

              <div className="blog-editorial-writing-card blog-editorial-writing-card--wide">
                <span>secoes do seed</span>
                {draftSections.length > 0 ? (
                  <ul className="blog-editorial-draft-sections">
                    {draftSections.slice(0, 5).map((section) => (
                      <li key={`${section.order ?? 0}-${section.heading_hint ?? section.purpose ?? 'secao'}`}>
                        <strong>{section.heading_hint ?? `Secao ${section.order ?? '-'}`}</strong>
                        <p>{section.paragraph_prompt ?? section.purpose ?? 'Sem prompt calculado.'}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Seed de secoes ainda nao disponivel.</p>
                )}
              </div>

              <div className="blog-editorial-writing-card blog-editorial-writing-card--wide">
                <span>revisao antes de virar texto</span>
                {draftReviewChecklist.length > 0 ? (
                  <ul>
                    {draftReviewChecklist.slice(0, 5).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p>Checklist privado ainda nao calculado.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="blog-editorial-empty">Pacote de escrita ainda nao carregado para o proximo texto.</p>
        )}
      </section>

      <section className="blog-editorial-panel blog-editorial-panel--wide">
        <PanelHeader
          label="sinais do codigo"
          meta={graphCandidates?.status ?? graphContext?.status ?? 'bounded preflight'}
        />
        <div className="blog-editorial-graph">
          <div className="blog-editorial-graph-summary">
            <dl className="blog-editorial-kv">
              <div>
                <dt>escopo</dt>
                <dd>{graphCandidates?.graph_context?.graph_scope ?? graphContext?.graph_retrieval?.graph_scope ?? 'codebase_world_model_bounded'}</dd>
              </div>
              <div>
                <dt>travessia</dt>
                <dd>{graphCandidates?.graph_context?.bounded_traversal ? 'bounded' : 'nao ativa'}</dd>
              </div>
              <div>
                <dt>evidencias</dt>
                <dd>{graphCandidates?.graph_context?.evidence_count ?? graphContext?.graph_retrieval?.evidence_set?.evidence_count ?? 0}</dd>
              </div>
              <div>
                <dt>candidatos</dt>
                <dd>{graphCandidates?.candidate_count ?? 0}</dd>
              </div>
            </dl>
            <p>
              {graphCandidates?.sequence_policy?.reason
                ?? graphContext?.editorial_policy?.rule
                ?? 'O grafo pode informar contexto, mas nao decide publicacao, ordem ou promocao.'}
            </p>
          </div>
          {boundedGraphCandidates.length > 0 ? (
            <ul className="blog-editorial-list blog-editorial-list--graph">
              {boundedGraphCandidates.slice(0, 4).map((candidate) => (
                <li key={candidate.slug ?? candidate.title}>
                  <strong>{candidate.title ?? candidate.slug ?? 'Candidato sem titulo'}</strong>
                  <span>{candidate.why ?? candidate.main_question ?? 'Sinal vindo do grafo bounded aguardando revisao humana.'}</span>
                  <small>
                    depois de {candidate.suggested_after_slug ?? graphCandidates?.sequence_policy?.default_suggested_after_slug ?? 'arco atual'} · {candidate.complexity_level ?? 'nivel aberto'}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <p className="blog-editorial-empty">Nenhum candidato de grafo pronto. O sistema mantem a sequencia atual.</p>
          )}
        </div>
      </section>

      <div className="blog-editorial-grid blog-editorial-grid--bottom">
        <section className="blog-editorial-panel">
          <PanelHeader label="checklist de escrita" meta={operations?.daily_focus?.primary_packet ?? 'writing packet'} />
          {operations?.daily_focus?.must_check_before_writing?.length ? (
            <ul className="blog-editorial-list">
              {operations.daily_focus.must_check_before_writing.slice(0, 5).map((item) => (
                <li key={item}>
                  <strong>{item}</strong>
                  <span>Obrigatorio antes de transformar contexto em texto publico.</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="blog-editorial-empty">Checklist operacional ainda nao carregado.</p>
          )}
        </section>

        <section className="blog-editorial-panel">
          <PanelHeader label="candidatos" meta={`${candidates.length} sugestoes`} />
          {candidates.length > 0 ? (
            <ul className="blog-editorial-list">
              {candidates.slice(0, 5).map((candidate, index) => (
                <li key={`${candidate.slug ?? candidate.title ?? 'candidate'}-${index}`}>
                  <strong>{candidate.title ?? candidate.slug ?? 'Sem titulo'}</strong>
                  <span>{candidate.reason ?? candidate.collection ?? 'Aguardando justificativa.'}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="blog-editorial-empty">Sem candidatos novos. A ordem atual continua suficiente.</p>
          )}
        </section>

        <section className="blog-editorial-panel">
          <PanelHeader label="guardrails" meta={state?.mode ?? 'read-only'} />
          <ul className="blog-editorial-guardrails">
            {Object.entries(guardrails).map(([key, value]) => (
              <li key={key} data-safe={value ? 'yes' : 'no'}>
                <span>{key.replaceAll('_', ' ')}</span>
                <strong>{value ? 'sim' : 'nao'}</strong>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: number }): ReactElement {
  return (
    <div className="blog-editorial-metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function PanelHeader({ label, meta }: { label: string; meta: string }): ReactElement {
  return (
    <header className="blog-editorial-panel-header">
      <h2>{label}</h2>
      <span>{meta}</span>
    </header>
  )
}

function WeekRail({ week }: { week: BlogEditorialWeek }): ReactElement {
  const posts = week.posts ?? []

  return (
    <article className="blog-editorial-week">
      <div className="blog-editorial-week__head">
        <span>semana {week.week}</span>
        <strong>{week.theme ?? 'sem tema'}</strong>
      </div>
      <ul>
        {posts.map((post) => (
          <li key={post.slug} data-status={postStatus(post)}>
            <span>{String(post.order).padStart(2, '0')}</span>
            <div>
              <strong>{post.title}</strong>
              <small>{postStatusLabel(post)}</small>
            </div>
          </li>
        ))}
      </ul>
    </article>
  )
}
