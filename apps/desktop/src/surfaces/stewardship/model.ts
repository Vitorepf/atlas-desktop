import type { StewardshipCockpit, StewardshipReviewItem } from './types'

export interface StewardshipQueueSummary {
  total: number
  executive: number
  newArea: number
  selfExpanding: number
  ownerSandbox: number
  ownerResult: number
  allocation: number
  controls: number
  blocked: number
  unsafe: number
}

export function summarizeReviewQueue(items: StewardshipReviewItem[]): StewardshipQueueSummary {
  return items.reduce<StewardshipQueueSummary>(
    (summary, item) => {
      summary.total += 1
      if (item.source_ap === 'AP-736') summary.executive += 1
      if (item.source_ap === 'AP-737') summary.newArea += 1
      if (item.source_ap === 'AP-738') summary.selfExpanding += 1
      if (item.source_ap === 'AP-759') summary.ownerSandbox += 1
      if (item.source_ap === 'AP-750') summary.ownerResult += 1
      if (item.source_ap === 'AP-752') summary.allocation += 1
      if (item.source_ap === 'AP-754') summary.controls += 1
      if (item.status.includes('blocked')) summary.blocked += 1
      if (item.irreversible_action_allowed || item.autoimplementation_allowed) summary.unsafe += 1
      return summary
    },
    {
      total: 0,
      executive: 0,
      newArea: 0,
      selfExpanding: 0,
      ownerSandbox: 0,
      ownerResult: 0,
      allocation: 0,
      controls: 0,
      blocked: 0,
      unsafe: 0,
    },
  )
}

export function cockpitIsSafe(cockpit: StewardshipCockpit): boolean {
  const policy = cockpit.claim_policy ?? {}
  return (
    cockpit.read_only === true &&
    cockpit.stack?.not_a_new_os === true &&
    policy.provider_invoked === false &&
    policy.dev_invoked === false &&
    policy.forge_invoked === false &&
    policy.branch_created === false &&
    policy.domain_runtime_created === false &&
    policy.continuous_loop_tick_executed_by_cockpit === false &&
    policy.recurring_scheduler_executed_by_cockpit === false &&
    policy.dev_forge_release_executed_by_cockpit === false &&
    policy.owner_queue_consumption_executed_by_cockpit === false &&
    policy.owner_sandbox_runtime_runner_executed_by_cockpit === false &&
    policy.owner_runtime_result_bridge_executed_by_cockpit === false &&
    policy.executive_allocation_handoff_executed_by_cockpit === false &&
    policy.product_mode_controls_execute_actions === false &&
    policy.autoimplementation_allowed === false &&
    summarizeReviewQueue(cockpit.review_queue ?? []).unsafe === 0
  )
}

export function statusTone(status: string | null | undefined): 'ready' | 'review' | 'blocked' | 'unknown' {
  const normalized = (status ?? '').toLowerCase()
  if (normalized.includes('blocked') || normalized.includes('rejected')) return 'blocked'
  if (normalized.includes('review') || normalized.includes('pending') || normalized.includes('deferred')) return 'review'
  if (normalized.includes('ready') || normalized.includes('accepted') || normalized.includes('healthy')) return 'ready'
  return 'unknown'
}
