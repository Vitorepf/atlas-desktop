export type BlogEditorialBridgeMode = 'tauri' | 'http' | 'offline'

export interface BlogEditorialPost {
  order: number
  title: string
  slug: string
  week?: number
  week_theme?: string
  type?: string
  complexity_level?: string
  collection?: string
  series?: string
  main_question?: string
  prerequisites?: string[]
  missing_prerequisites?: string[]
  next_reading?: string[]
  published?: boolean
  ready?: boolean
}

export interface BlogEditorialWeek {
  week: number
  theme?: string
  goal?: string
  posts?: BlogEditorialPost[]
}

export interface BlogEditorialBacklog {
  name?: string
  cadence?: string
  purpose?: string
  rule?: string
  weeks?: BlogEditorialWeek[]
}

export interface BlogEditorialSummary {
  planned_posts: number
  published_posts: number
  ready_posts: number
  blocked_posts: number
  with_candidate_suggestions?: boolean
  with_operating_state?: boolean
  with_graph_rag_readiness?: boolean
  [key: string]: unknown
}

export interface BlogEditorialFrontier {
  next_sequence_order?: number
  sequence_health?: string
  published_count?: number
  planned_count?: number
  ready_count?: number
  blocked_count?: number
  [key: string]: unknown
}

export interface BlogEditorialOperatingState {
  schema_version?: string
  status?: string
  counts?: {
    planned_posts?: number
    published_posts?: number
    ready_posts?: number
    blocked_posts?: number
    review_queue_candidates?: number
    candidate_feed?: number
  }
  next_post?: BlogEditorialPost | null
  publication_frontier?: BlogEditorialFrontier
  review_queue?: BlogEditorialReviewQueue
  source_posture?: {
    public_archive_posts?: number
    external_published_posts?: number
    engineering_knowledge?: string
    code_intelligence?: string
    open_brain_context_pack?: string
    vector_retrieval?: string
    graph_retrieval?: string
    [key: string]: unknown
  }
  candidate_pipeline?: {
    feed_count?: number
    top_candidates?: BlogEditorialCandidate[]
    promotion_rule?: string
  }
  [key: string]: unknown
}

export interface BlogEditorialReviewQueue {
  status?: string
  item_count?: number
  items?: Array<Record<string, unknown>>
  [key: string]: unknown
}

export interface BlogEditorialCandidate {
  slug?: string
  title?: string
  reason?: string
  why?: string
  recommended_after?: string
  suggested_after_slug?: string
  source_type?: string
  source_ref?: string
  collection?: string
  series?: string
  complexity_level?: string
  main_question?: string
  [key: string]: unknown
}

export interface BlogEditorialGraphContext {
  schema_version?: string
  mode?: string
  status?: string
  post?: {
    order?: number
    title?: string
    slug?: string
    complexity_level?: string
    main_question?: string
  } | null
  graph_retrieval?: {
    status?: string
    graph_scope?: string
    traversal_receipt?: {
      status?: string
      bounded_traversal?: boolean
      fallback_reason?: string | null
    }
    evidence_set?: {
      status?: string
      evidence_count?: number
      source_count?: number
    }
    claims?: {
      bounded_world_model_retrieval_ready?: boolean
      global_graph_rag_ready?: boolean
    }
  }
  editorial_policy?: {
    may_inform_writing_packet?: boolean
    may_create_candidate?: boolean
    may_reorder_backlog?: boolean
    may_publish?: boolean
    rule?: string
  }
  guardrails?: Record<string, boolean | string | number | null>
  [key: string]: unknown
}

export interface BlogEditorialGraphCandidates {
  schema_version?: string
  mode?: string
  status?: string
  candidate_count?: number
  candidates?: BlogEditorialCandidate[]
  graph_context?: {
    status?: string
    graph_retrieval_status?: string
    graph_scope?: string
    evidence_count?: number
    bounded_traversal?: boolean
    global_graph_retrieval_active?: boolean
    python_runtime_invoked?: boolean
    providers_invoked?: boolean
  }
  sequence_policy?: {
    default_suggested_after_slug?: string
    planned_post_count?: number
    published_post_count?: number
    rule?: string
    reason?: string
  }
  guardrails?: Record<string, boolean | string | number | null>
  [key: string]: unknown
}

export interface BlogEditorialRadar {
  status?: string
  candidates?: BlogEditorialCandidate[]
  candidate_count?: number
  [key: string]: unknown
}

export interface BlogEditorialGraphReadiness {
  status?: string
  graph_retrieval?: string
  vector_retrieval?: string
  open_brain_context?: string
  summary?: {
    available_component_count?: number
    blocking_item_count?: number
    editorial_golden_set_status?: string
    [key: string]: unknown
  }
  blockers?: string[]
  [key: string]: unknown
}

export interface BlogEditorialWritingPacket {
  schema_version?: string
  mode?: string
  status?: string
  post?: {
    order?: number
    title?: string
    slug?: string
    type?: string
    complexity_level?: string
    collection?: string
    series?: string
    reader_level?: string
    main_question?: string
    goal?: string
    topics?: string[]
  }
  sequence?: {
    previous_post?: BlogEditorialPost | null
    next_post?: BlogEditorialPost | null
    prerequisites?: string[]
    missing_prerequisites?: string[]
    unknown_prerequisites?: string[]
    next_reading?: string[]
    rule?: string
  }
  concept_progression_map?: {
    current_terms?: string[]
    already_allowed_terms?: string[]
    future_terms_to_avoid?: string[]
    [key: string]: unknown
  }
  public_archive_context?: {
    duplicate_risk_count?: number
    linkable_artifact_count?: number
    prior_public_artifacts?: Array<Record<string, unknown>>
    [key: string]: unknown
  }
  coverage_snapshot?: {
    terms?: string[]
    current_level?: string
    needs_foundation?: boolean
    future_topics_to_avoid?: string[]
  }
  writing_brief?: {
    language?: string
    voice?: string
    primary_question?: string
    reader_promise?: string
    outline?: string[]
    must_include?: string[]
    must_not_include?: string[]
  }
  draft_seed?: {
    schema_version?: string
    mode?: string
    status?: string
    post_slug?: string
    language?: string
    title_options?: string[]
    working_thesis?: string
    lede_seed?: {
      purpose?: string
      paragraph_prompt?: string
      avoid?: string
    }
    section_seeds?: Array<{
      order?: number
      heading_hint?: string
      purpose?: string
      paragraph_prompt?: string
    }>
    closing_seed?: {
      purpose?: string
      paragraph_prompt?: string
      next_reading?: string[]
    }
    concept_boundaries?: {
      allowed_terms?: string[]
      future_terms_to_avoid?: string[]
      rule?: string
    }
    archive_awareness?: {
      duplicate_risk_count?: number
      linkable_artifact_count?: number
      rule?: string
    }
    review_checklist?: string[]
    guardrails?: Record<string, boolean | string | number | null>
  }
  safety_review?: Record<string, boolean | string | number | null>
  guardrails?: Record<string, boolean | string | number | null>
  [key: string]: unknown
}

export interface BlogEditorialOperationsPacket {
  schema_version?: string
  mode?: string
  status?: string
  next_action?: {
    action?: string
    slug?: string | null
    title?: string | null
    order?: number | null
    why?: string
  }
  daily_focus?: {
    primary_packet?: string
    must_check_before_writing?: string[]
    do_not_do?: string[]
  }
  writing_packet?: BlogEditorialWritingPacket | null
  public_archive_risks?: {
    duplicate_risk_count?: number
    linkable_artifact_count?: number
  }
  source_snapshot?: {
    public_archive_posts?: number
    external_published_posts?: number
    graph_retrieval_status?: string
    open_brain_status?: string
  }
  publishing_plan?: {
    schema_version?: string
    mode?: string
    status?: string
    cadence?: string
    publishing_days?: string[]
    buffer_days?: string[]
    rule?: string
    summary?: {
      slot_count?: number
      published_slots?: number
      ready_slots?: number
      blocked_slots?: number
      review_queue_candidates?: number
    }
    today_lane?: {
      action?: string
      slug?: string | null
      rule?: string
    }
    next_slots?: Array<{
      order?: number
      week?: number
      slot_index?: number
      day?: string
      label?: string
      slug?: string
      title?: string
      complexity_level?: string
      collection?: string
      series?: string
      status?: string
      pipeline_stage?: string
      human_action?: string
      prerequisites?: string[]
      main_question?: string
    }>
    pipeline_rules?: Record<string, string>
    guardrails?: Record<string, boolean | string | number | null>
  }
  topic_ledger?: {
    schema_version?: string
    mode?: string
    status?: string
    summary?: {
      topic_count?: number
      published_topic_count?: number
      planned_topic_count?: number
      candidate_topic_count?: number
      gap_count?: number
      foundation_gap_count?: number
    }
    rows?: Array<{
      topic?: string
      status?: string
      planned_count?: number
      published_count?: number
      candidate_count?: number
      review_queue_count?: number
      planned_slugs?: string[]
      published_slugs?: string[]
      candidate_slugs?: string[]
      review_queue_slugs?: string[]
      first_planned_order?: number | null
      example_title?: string
      next_action?: string
    }>
    next_topic_opportunities?: Array<{
      topic?: string
      status?: string
      planned_count?: number
      published_count?: number
      candidate_count?: number
      review_queue_count?: number
      first_planned_order?: number | null
      example_title?: string
      next_action?: string
    }>
    foundation_gaps?: Array<Record<string, string | boolean | number | null>>
    source_posture?: Record<string, string>
    guardrails?: Record<string, boolean | string | number | null>
  }
  editorial_roadmap?: {
    schema_version?: string
    mode?: string
    status?: string
    summary?: {
      phase_count?: number
      active_phase_key?: string | null
      active_phase_label?: string | null
      planned_posts?: number
      published_posts?: number
      topic_count?: number
    }
    phases?: Array<{
      key?: string
      position?: number
      label?: string
      intent?: string
      status?: string
      post_count?: number
      published_count?: number
      ready_count?: number
      blocked_count?: number
      planned_count?: number
      topics?: string[]
      next_post?: {
        order?: number
        slug?: string
        title?: string
        status?: string
        pipeline_stage?: string
        human_action?: string
      } | null
      posts?: Array<{
        order?: number
        slug?: string
        title?: string
        status?: string
        pipeline_stage?: string
        human_action?: string
      }>
    }>
    next_topic_opportunities?: Array<Record<string, string | number | null>>
    guardrails?: Record<string, boolean | string | number | null>
  }
  editorial_dependency_matrix?: {
    schema_version?: string
    mode?: string
    status?: string
    summary?: {
      post_count?: number
      current_unlocked_slug?: string | null
      blocked_post_count?: number
      foundation_warning_count?: number
      phase_count?: number
    }
    rows?: Array<{
      order?: number
      slug?: string
      title?: string
      status?: string
      readiness?: string
      complexity_level?: string
      depth?: number
      phase?: {
        key?: string
        label?: string
        position?: number
      }
      depends_on?: {
        previous_slug?: string | null
        next_slug?: string | null
        explicit_prerequisites?: string[]
        missing_prerequisites?: string[]
      }
      reader_contract?: {
        must_introduce?: string[]
        already_available?: string[]
        published_available?: string[]
        avoid_until_later?: string[]
        rule?: string
      }
      position_reason?: string
      depth_warning?: string | null
    }>
    guardrails?: Record<string, boolean | string | number | null>
  }
  backlog_intake?: {
    schema_version?: string
    mode?: string
    status?: string
    summary?: {
      item_count?: number
      review_queue_items?: number
      candidate_feed_items?: number
      ready_for_review_count?: number
      hold_count?: number
      dependency_ladder_blocked?: boolean
    }
    items?: Array<{
      lane?: string
      slug?: string
      title?: string
      source_type?: string
      source_ref?: string
      collection?: string
      series?: string
      complexity_level?: string
      depth?: number
      topics?: string[]
      suggested_after_slug?: string | null
      suggested_after_order?: number | null
      suggested_prerequisites?: string[]
      recommended_action?: string
      reason?: string
      promotion_rule?: string
    }>
    guardrails?: Record<string, boolean | string | number | null>
  }
  [key: string]: unknown
}

export interface BlogEditorialPlanner {
  schema_version: string
  status: string
  mode: string
  site_root?: string
  backlog_path?: string
  backlog?: BlogEditorialBacklog
  summary?: BlogEditorialSummary
  next_ready_post?: BlogEditorialPost | null
  blocked_posts?: BlogEditorialPost[]
  operating_state?: BlogEditorialOperatingState
  review_queue?: BlogEditorialReviewQueue
  editorial_radar?: BlogEditorialRadar
  graph_rag_readiness?: BlogEditorialGraphReadiness
  editorial_graph_context?: BlogEditorialGraphContext | null
  editorial_graph_candidates?: BlogEditorialGraphCandidates | null
  operations_packet?: BlogEditorialOperationsPacket | null
  writing_packet?: BlogEditorialWritingPacket | null
  guardrails?: Record<string, boolean | string | number | null>
  [key: string]: unknown
}

export interface BlogEditorialAreaState {
  schema_version: 'atlas.blog_editorial_area_state_api.v1'
  status: 'ready' | 'failed' | string
  mode: 'read_only_area_surface_p1' | string
  area: {
    name: string
    purpose: string
    surfaces: Record<string, string>
    guardrails: Record<string, boolean>
  }
  planner: BlogEditorialPlanner
}
