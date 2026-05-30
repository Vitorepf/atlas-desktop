import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { cockpitIsSafe, statusTone, summarizeReviewQueue } from '../model'
import type { StewardshipCockpit } from '../types'

function cockpit(): StewardshipCockpit {
  return {
    schema_version: 'atlas.software_company.product_mode_cockpit.v1',
    status: 'ready',
    ap_contract: 'AP-739',
    area_id: 'agentic_engineering_os',
    portfolio_id: 'atlas_software_company',
    read_only: true,
    stack: {
      name: 'Atlas Software Company Stewardship Stack',
      parent_runtime: 'Atlas Autonomous Software Company Runtime',
      current_visual_level: 'Night Shift Product Mode',
      continuous_motor: 'Atlas Continuous Stewardship Loop',
      area_focus: 'Area Focus Loop',
      ceiling: 'Self-Expanding Software Company',
      not_a_new_os: true,
    },
    source_ap_contracts: ['AP-721', 'AP-736', 'AP-737', 'AP-738', 'AP-759', 'AP-760', 'AP-750', 'AP-752', 'AP-754'],
    counters: {
      area_findings: 2,
      area_inbox_items: 2,
      work_orders: 2,
      executive_items: 1,
      executive_pending_review: 1,
      new_area_gate_items: 1,
      new_area_blocked_review: 1,
      self_expanding_inbox_items: 1,
      review_queue_items: 7,
      ready_for_domain_runtime_creation_gate: 0,
      owner_sandbox_runtime_runs: 1,
      owner_runtime_results: 1,
      executive_allocation_handoff_packets: 1,
      product_mode_control_blockers: 0,
    },
    health: { overall: 'review' },
    area_focus: { status: 'ready', health: { overall: 'watch' }, budgets: {} },
    executive_decision_inbox: { status: 'ready', item_count: 1, decision_summary: {}, items: [], operator_controls: {} },
    new_area_proposal_gate: { status: 'ready', proposal_count: 1, gate_item_count: 1, decision_summary: {}, gate_items: [], operator_controls: {} },
    self_expanding_company: { status: 'ready_proposal_only', expansion_summary: {}, operator_inbox: {}, promotion_boundary: {}, expansion_loop: [] },
    stewardship_outcome_history: { status: 'ready', ap_contract: 'AP-740', evidence_item_count: 1, morning_inbox_item_count: 1 },
    domain_runtime_creation_handoff: { status: 'blocked', ap_contract: 'AP-741', blocked_handoff_count: 1 },
    area_stewardship_active_handoff: { status: 'ready', ap_contract: 'AP-743', active_handoff_count: 1 },
    area_stewardship_active_operation: { status: 'ready', ap_contract: 'AP-744', counts: { work_orders: 2 } },
    continuous_stewardship_loop: { status: 'paused', ap_contract: 'AP-745' },
    continuous_stewardship_scheduler: { status: 'paused', ap_contract: 'AP-746' },
    dev_forge_release: { status: 'ready_for_owner_queue_release', ap_contract: 'AP-747', target_owner: 'atlas_dev' },
    owner_sandbox_runtime_runner: {
      status: 'ready_for_ap750_result_bridge',
      ap_contract: 'AP-759',
      owner_sandbox_run_id: 'osrr_1',
      target_owner: 'atlas_dev',
      changed_file_count: 2,
      exit_code: 0,
    },
    owner_runtime_result_bridge: {
      status: 'owner_runtime_result_recorded',
      ap_contract: 'AP-750',
      owner_result_id: 'orr_1',
      target_owner: 'atlas_dev',
      evidence_item_count: 1,
    },
    executive_allocation_handoff: { status: 'ready_allocation_handoff', ap_contract: 'AP-752', allocation_handoff_count: 1 },
    product_mode_operational_controls: { status: 'ready', ap_contract: 'AP-754', repo_onboarding: { repository: 'atlas-server' } },
    review_queue: [
      {
        schema_version: 'atlas.software_company.product_mode_cockpit.review_item.v1',
        source_ap: 'AP-736',
        kind: 'autonomous_executive_recommendation',
        id: 'exec',
        title: 'Executive review',
        status: 'pending_operator_review',
        risk_level: 'low',
        target_area: 'agentic_engineering_os',
        priority_score: 10,
        decision_anchor: {},
        irreversible_action_allowed: false,
        autoimplementation_allowed: false,
      },
      {
        schema_version: 'atlas.software_company.product_mode_cockpit.review_item.v1',
        source_ap: 'AP-737',
        kind: 'existing_capability_handoff',
        id: 'gate',
        title: 'Gate review',
        status: 'blocked_awaiting_operator_review',
        risk_level: 'medium',
        target_area: 'atlas_dev',
        priority_score: 0,
        decision_anchor: {},
        blockers: ['existing_capability_requires_area_stewardship_handoff_not_domain_creation'],
        irreversible_action_allowed: false,
        autoimplementation_allowed: false,
      },
      {
        schema_version: 'atlas.software_company.product_mode_cockpit.review_item.v1',
        source_ap: 'AP-738',
        kind: 'self_expanding_operator_inbox',
        id: 'self',
        title: 'Self-expanding review',
        status: 'blocked_awaiting_operator_review',
        risk_level: 'medium',
        target_area: 'atlas_forge',
        priority_score: 0,
        decision_anchor: {},
        irreversible_action_allowed: false,
        autoimplementation_allowed: false,
      },
      {
        schema_version: 'atlas.software_company.product_mode_cockpit.review_item.v1',
        source_ap: 'AP-759',
        kind: 'owner_sandbox_runtime_runner',
        id: 'osrr_1',
        title: 'Sandboxed owner runtime',
        status: 'ready_for_ap750_result_bridge',
        risk_level: 'high',
        target_area: 'agentic_engineering_os',
        target_owner: 'atlas_dev',
        priority_score: 101,
        decision_anchor: { owner_sandbox_run_id: 'osrr_1' },
        irreversible_action_allowed: false,
        autoimplementation_allowed: false,
      },
      {
        schema_version: 'atlas.software_company.product_mode_cockpit.review_item.v1',
        source_ap: 'AP-750',
        kind: 'owner_runtime_result_bridge',
        id: 'orr_1',
        title: 'Owner runtime result',
        status: 'owner_runtime_result_recorded',
        risk_level: 'high',
        target_area: 'agentic_engineering_os',
        target_owner: 'atlas_dev',
        priority_score: 101,
        decision_anchor: { owner_result_id: 'orr_1' },
        irreversible_action_allowed: false,
        autoimplementation_allowed: false,
      },
      {
        schema_version: 'atlas.software_company.product_mode_cockpit.review_item.v1',
        source_ap: 'AP-752',
        kind: 'executive_allocation_handoff',
        id: 'allocation_1',
        title: 'Executive allocation handoff',
        status: 'ready_allocation_handoff',
        risk_level: 'high',
        target_area: 'agentic_engineering_os',
        target_owner: 'Atlas Area Stewardship Layer',
        priority_score: 102,
        decision_anchor: { handoff_packet_id: 'allocation_1' },
        irreversible_action_allowed: false,
        autoimplementation_allowed: false,
      },
      {
        schema_version: 'atlas.software_company.product_mode_cockpit.review_item.v1',
        source_ap: 'AP-754',
        kind: 'product_mode_operational_controls',
        id: 'controls_1',
        title: 'Product Mode controls',
        status: 'review_required',
        risk_level: 'medium',
        target_area: 'agentic_engineering_os',
        priority_score: 103,
        decision_anchor: { controls_hash: 'controls_1' },
        irreversible_action_allowed: false,
        autoimplementation_allowed: false,
      },
    ],
    operator_controls: {
      owner_sandbox_runtime_plan_command: 'php artisan atlas:software-company-stewardship owner-sandbox-runtime-run --json',
      owner_runtime_result_bridge_command: 'php artisan atlas:software-company-stewardship owner-runtime-result-bridge --json',
      executive_allocation_handoff_command: 'php artisan atlas:software-company-stewardship executive-allocation-handoff --json',
      product_mode_controls_command: 'php artisan atlas:software-company-stewardship product-mode-controls --json',
    },
    next_actions: [],
    claim_policy: {
      provider_invoked: false,
      dev_invoked: false,
      forge_invoked: false,
      branch_created: false,
      domain_runtime_created: false,
      continuous_loop_tick_executed_by_cockpit: false,
      recurring_scheduler_executed_by_cockpit: false,
      dev_forge_release_executed_by_cockpit: false,
      owner_queue_consumption_executed_by_cockpit: false,
      owner_sandbox_runtime_runner_executed_by_cockpit: false,
      owner_runtime_result_bridge_executed_by_cockpit: false,
      executive_allocation_handoff_executed_by_cockpit: false,
      product_mode_controls_execute_actions: false,
      autoimplementation_allowed: false,
    },
    surface_hash: 'sha256:test',
    generated_at: '2026-05-27T00:00:00+00:00',
  }
}

describe('Stewardship Product Mode cockpit contract', () => {
  it('summarizes upper stack and owner runtime review items', () => {
    const summary = summarizeReviewQueue(cockpit().review_queue)
    assert.equal(summary.total, 7)
    assert.equal(summary.executive, 1)
    assert.equal(summary.newArea, 1)
    assert.equal(summary.selfExpanding, 1)
    assert.equal(summary.ownerSandbox, 1)
    assert.equal(summary.ownerResult, 1)
    assert.equal(summary.allocation, 1)
    assert.equal(summary.controls, 1)
    assert.equal(summary.blocked, 2)
    assert.equal(summary.unsafe, 0)
  })

  it('fails closed when any review item allows execution', () => {
    const unsafe = cockpit()
    unsafe.review_queue[0] = { ...unsafe.review_queue[0], autoimplementation_allowed: true }
    assert.equal(cockpitIsSafe(cockpit()), true)
    assert.equal(cockpitIsSafe(unsafe), false)
  })

  it('fails closed when Product Mode claims it executed owner sandbox runtime', () => {
    const unsafe = cockpit()
    unsafe.claim_policy = { ...unsafe.claim_policy, owner_sandbox_runtime_runner_executed_by_cockpit: true }
    assert.equal(cockpitIsSafe(unsafe), false)
  })

  it('normalizes status tones for the surface', () => {
    assert.equal(statusTone('ready_proposal_only'), 'ready')
    assert.equal(statusTone('pending_operator_review'), 'review')
    assert.equal(statusTone('blocked_awaiting_operator_review'), 'blocked')
    assert.equal(statusTone(null), 'unknown')
  })
})
