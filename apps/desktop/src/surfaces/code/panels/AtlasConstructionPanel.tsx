import { PanelTitle } from '@atlas/ui'
import type {
  AtlasSelfConstructionCertificationWorkbenchStatus,
  AtlasSelfConstructionChainIntegrityStatus,
  AtlasSelfConstructionControlPlaneStatus,
  AtlasSelfConstructionDeterministicReplayStatus,
  AtlasSelfConstructionObservatoryStatus,
  AtlasSelfConstructionPromotionGateStatus,
  AtlasSelfConstructionReleaseDossierStatus,
  AtlasSelfConstructionReplayDiffStatus,
  AtlasSelfConstructionReplaySnapshotStatus,
  AtlasSelfConstructionRuntimePilotStatus,
  AtlasSelfConstructionSectionStatus,
  AtlasSelfConstructionSnapshot,
} from '@atlas/domain'
import { EmptyText, Row, sectionHeading } from './RightRailPrimitives'

interface AtlasConstructionPanelProps {
  snapshot: AtlasSelfConstructionSnapshot | null
  busy: boolean
  onRefresh: () => void
}

/**
 * Atlas Self-Construction OS · Agent Control Plane (read-only).
 *
 * Diagnostic surface for the certification family documented in
 * `docs/engineering-knowledge-base/self-construction/agent-control-plane-contract.md`.
 *
 * Hard contract — this panel:
 *   - NEVER triggers runtime, NEVER calls a provider, NEVER spawns a process,
 *     NEVER spends tokens, NEVER advances a slice. The only action is a
 *     re-query of the read-only diagnostic projection.
 *   - NEVER invents data. A null section means "backend has not exposed this
 *     yet" and renders an honest empty state. It does not mean "ready".
 *   - NEVER classifies a section as "complete" unless the backend says so via
 *     `status` / `result`.
 */
export function AtlasConstructionPanel({ snapshot, busy, onRefresh }: AtlasConstructionPanelProps) {
  const headerMeta = snapshot
    ? `${snapshot.status ?? 'snapshot'} · ${snapshot.source}`
    : 'endpoint pendente'

  return (
    <div className="ops-section">
      <PanelTitle label="Construction" meta={headerMeta} />

      {snapshot ? (
        <ConstructionBody snapshot={snapshot} />
      ) : (
        <EmptyText>
          backend ainda não expõe a projeção <code>atlas.self_construction.agent_control_plane.*</code>.
          {' '}A UI segue read-only — nada de runtime, nada inventado.
        </EmptyText>
      )}

      <button
        type="button"
        onClick={onRefresh}
        disabled={busy}
        style={{
          width: '100%',
          marginTop: 12,
          padding: '8px 12px',
          fontFamily: 'var(--cc-font-sans)',
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: 0,
          color: 'var(--cc-text-strong)',
          background: 'transparent',
          border: '1px solid var(--cc-border-soft)',
          borderRadius: 'var(--cc-radius-sm)',
          cursor: busy ? 'not-allowed' : 'pointer',
          opacity: busy ? 0.6 : 1,
        }}
        title="Re-consulta a projeção diagnóstica. Não dispara runtime."
      >
        {busy ? 're-consultando…' : 're-consultar snapshot (read-only)'}
      </button>
    </div>
  )
}

function ConstructionBody({ snapshot }: { snapshot: AtlasSelfConstructionSnapshot }) {
  const safetyOk = snapshot.runtimeSafetyAllFalse === true
  const violations = snapshot.violationCount
  const warnings = snapshot.warningCount

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {/* Posture · top-line invariants */}
      <div
        style={{
          display: 'grid',
          gap: 6,
          padding: '9px 10px',
          background: safetyOk ? 'var(--moss-veil)' : 'var(--cc-warning-veil, rgba(204, 138, 48, 0.08))',
          border: safetyOk
            ? '1px solid var(--moss-soft)'
            : '1px solid var(--cc-warning-soft, rgba(204, 138, 48, 0.3))',
          borderRadius: 2,
        }}
      >
        <dl style={{ margin: 0 }}>
          <Row k="schema" v={fmtHash(snapshot.schemaVersion) ?? '—'} mono />
          <Row
            k="runtime_safety_all_false"
            v={fmtBool(snapshot.runtimeSafetyAllFalse)}
            ok={safetyOk}
          />
          <Row
            k="violation_count"
            v={violations === null ? '—' : String(violations)}
            ok={violations === 0}
          />
          <Row
            k="warning_count"
            v={warnings === null ? '—' : String(warnings)}
            ok={warnings === 0}
          />
          <Row k="next_required_slice" v={snapshot.nextRequiredSlice ?? '—'} mono />
          <Row k="next_safe_macro_batch" v={snapshot.nextSafeMacroBatch ?? '—'} mono />
          <Row k="generated_at" v={fmtWhen(snapshot.generatedAt)} />
          <Row k="endpoint" v={snapshot.endpoint ?? '—'} mono />
        </dl>
      </div>

      {/* Top-level blockers / warnings — only when populated */}
      {snapshot.blockers.length > 0 ? <Bullets label="blockers" tone="bad" items={snapshot.blockers} /> : null}
      {snapshot.warnings.length > 0 ? <Bullets label="warnings" tone="warn" items={snapshot.warnings} /> : null}

      {/* Per-section diagnostic projections */}
      <ControlPlaneSection section={snapshot.controlPlane} />
      <ChainIntegritySection section={snapshot.chainIntegrity} />
      <DeterministicReplaySection section={snapshot.deterministicReplay} />
      <ReplaySnapshotSection section={snapshot.replaySnapshot} />
      <ReplayDiffSection section={snapshot.replayDiff} />
      <PromotionGateSection section={snapshot.promotionGate} />
      <CertificationWorkbenchSection section={snapshot.certificationWorkbench} />
      <ObservatorySection section={snapshot.observatory} />
      <RuntimePilotSection section={snapshot.runtimePilot} />
      <ReleaseDossierSection section={snapshot.releaseDossier} />

      <ProofHashesSection hashes={snapshot.proofHashes} />
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// Section helpers

function ControlPlaneSection({ section }: { section: AtlasSelfConstructionControlPlaneStatus | null }) {
  return (
    <SectionFrame title="Agent Control Plane" section={section}>
      {section ? (
        <dl style={{ margin: 0 }}>
          <Row k="agent_control_plane_ready" v={fmtBool(section.agentControlPlaneReady)} ok={section.agentControlPlaneReady === true} />
          <Row k="post_start_liveness" v={fmtBool(section.postStartLiveness)} ok={section.postStartLiveness === true} />
          <Row k="post_start_dispatch_release" v={fmtBool(section.postStartDispatchRelease)} ok={section.postStartDispatchRelease === true} />
          <Row k="signed_dispatch_authorization" v={fmtBool(section.signedDispatchAuthorization)} ok={section.signedDispatchAuthorization === true} />
          <Row k="current_pointer" v={section.currentPointer ?? '—'} mono />
          <Row k="next_build_slices" v={fmtCount(section.nextBuildSlices)} />
          <Row k="not_yet_runtime_capable" v={fmtCount(section.notYetRuntimeCapable)} ok={section.notYetRuntimeCapable.length === 0} />
        </dl>
      ) : null}
    </SectionFrame>
  )
}

function ChainIntegritySection({ section }: { section: AtlasSelfConstructionChainIntegrityStatus | null }) {
  return (
    <SectionFrame title="Chain Integrity" section={section}>
      {section ? (
        <dl style={{ margin: 0 }}>
          <Row k="chain_integrity_hash" v={fmtHash(section.chainIntegrityHash) ?? '—'} mono />
          <Row k="runtime_safety_all_false" v={fmtBool(section.runtimeSafetyAllFalse)} ok={section.runtimeSafetyAllFalse === true} />
          <Row k="violation_count" v={section.violationCount === null ? '—' : String(section.violationCount)} ok={section.violationCount === 0} />
          <Row k="warning_count" v={section.warningCount === null ? '—' : String(section.warningCount)} ok={section.warningCount === 0} />
          <Row k="aligned_with_pointer" v={fmtBool(section.alignedWithPointer)} ok={section.alignedWithPointer === true} />
          <Row k="scheduler_invoker_count" v={section.schedulerInvokerCount === null ? '—' : String(section.schedulerInvokerCount)} />
        </dl>
      ) : null}
    </SectionFrame>
  )
}

function DeterministicReplaySection({ section }: { section: AtlasSelfConstructionDeterministicReplayStatus | null }) {
  return (
    <SectionFrame title="Deterministic Replay" section={section}>
      {section ? (
        <dl style={{ margin: 0 }}>
          <Row k="replay_hash" v={fmtHash(section.replayHash) ?? '—'} mono />
          <Row k="deterministic_replay_hash" v={fmtHash(section.deterministicReplayHash) ?? '—'} mono />
          <Row k="proof_bundle_hash" v={fmtHash(section.proofBundleHash) ?? '—'} mono />
          <Row k="current_pointer" v={section.currentPointer ?? '—'} mono />
          <Row k="violation_count" v={section.violationCount === null ? '—' : String(section.violationCount)} ok={section.violationCount === 0} />
          <Row k="warning_count" v={section.warningCount === null ? '—' : String(section.warningCount)} ok={section.warningCount === 0} />
        </dl>
      ) : null}
    </SectionFrame>
  )
}

function ReplaySnapshotSection({ section }: { section: AtlasSelfConstructionReplaySnapshotStatus | null }) {
  return (
    <SectionFrame title="Replay Snapshot" section={section}>
      {section ? (
        <dl style={{ margin: 0 }}>
          <Row k="total" v={section.total === null ? '—' : String(section.total)} />
          <Row k="capacity" v={section.capacity === null ? '—' : String(section.capacity)} />
          <Row k="storage_prefix" v={section.storagePrefix ?? '—'} mono />
          {section.latest ? (
            <>
              <Row k="latest.snapshot_id" v={section.latest.snapshotId} mono />
              <Row k="latest.label" v={section.latest.label ?? '—'} />
              <Row k="latest.created_at" v={fmtWhen(section.latest.createdAt)} />
              <Row k="latest.replay_hash" v={fmtHash(section.latest.replayHash) ?? '—'} mono />
              <Row k="latest.proof_bundle_hash" v={fmtHash(section.latest.proofBundleHash) ?? '—'} mono />
              <Row k="latest.runtime_safety_all_false" v={fmtBool(section.latest.runtimeSafetyAllFalse)} ok={section.latest.runtimeSafetyAllFalse === true} />
            </>
          ) : (
            <Row k="latest" v="sem snapshot" />
          )}
        </dl>
      ) : null}
    </SectionFrame>
  )
}

function ReplayDiffSection({ section }: { section: AtlasSelfConstructionReplayDiffStatus | null }) {
  return (
    <SectionFrame title="Replay Diff" section={section}>
      {section ? (
        <dl style={{ margin: 0 }}>
          <Row k="result" v={section.result ?? '—'} ok={section.result === 'passed' || section.result === 'no_baseline'} />
          <Row k="before_snapshot_id" v={section.beforeSnapshotId ?? '—'} mono />
          <Row k="after_snapshot_id" v={section.afterSnapshotId ?? '—'} mono />
          <Row k="regression_count" v={section.regressionCount === null ? '—' : String(section.regressionCount)} ok={section.regressionCount === 0} />
          <Row k="new_violation_count" v={section.newViolationCount === null ? '—' : String(section.newViolationCount)} ok={section.newViolationCount === 0} />
          <Row k="new_warning_count" v={section.newWarningCount === null ? '—' : String(section.newWarningCount)} ok={section.newWarningCount === 0} />
          <Row k="diff_hash" v={fmtHash(section.diffHash) ?? '—'} mono />
        </dl>
      ) : null}
    </SectionFrame>
  )
}

function PromotionGateSection({ section }: { section: AtlasSelfConstructionPromotionGateStatus | null }) {
  return (
    <SectionFrame title="Macro-Sprint Promotion Gate" section={section}>
      {section ? (
        <dl style={{ margin: 0 }}>
          <Row k="result" v={section.result ?? '—'} ok={section.result === 'passed' || section.result === 'no_baseline'} />
          <Row k="gate_hash" v={fmtHash(section.gateHash) ?? '—'} mono />
          <Row k="before_snapshot_id" v={section.beforeSnapshotId ?? '—'} mono />
          <Row k="after_snapshot_id" v={section.afterSnapshotId ?? '—'} mono />
          <Row k="require_no_violations" v={fmtBool(section.requireNoViolations)} />
          <Row k="require_runtime_safety_all_false" v={fmtBool(section.requireRuntimeSafetyAllFalse)} />
          <Row k="require_no_regressions" v={fmtBool(section.requireNoRegressions)} />
          <Row k="docs_health_status" v={section.docsHealthStatus ?? '—'} />
          <Row k="architecture_validate_status" v={section.architectureValidateStatus ?? '—'} />
          <Row k="next_action" v={section.nextAction ?? '—'} />
          {section.commandRequired.length > 0 ? (
            <Row k="command_required" v={fmtCount(section.commandRequired)} />
          ) : null}
        </dl>
      ) : null}
    </SectionFrame>
  )
}

function CertificationWorkbenchSection({ section }: { section: AtlasSelfConstructionCertificationWorkbenchStatus | null }) {
  return (
    <SectionFrame title="Certification Workbench" section={section}>
      {section ? (
        <dl style={{ margin: 0 }}>
          <Row k="workbench_hash" v={fmtHash(section.workbenchHash) ?? '—'} mono />
          <Row k="certification_count" v={section.certificationCount === null ? '—' : String(section.certificationCount)} />
          <Row k="passed_count" v={section.passedCount === null ? '—' : String(section.passedCount)} ok={section.blockedCount === 0} />
          <Row k="blocked_count" v={section.blockedCount === null ? '—' : String(section.blockedCount)} ok={section.blockedCount === 0} />
          <Row k="warning_count" v={section.warningCount === null ? '—' : String(section.warningCount)} ok={section.warningCount === 0} />
          <Row k="coverage_ratio" v={section.coverageRatio === null ? '—' : section.coverageRatio.toFixed(3)} />
          <Row k="baseline_id" v={section.baselineId ?? '—'} mono />
        </dl>
      ) : null}
    </SectionFrame>
  )
}

function ObservatorySection({ section }: { section: AtlasSelfConstructionObservatoryStatus | null }) {
  return (
    <SectionFrame title="Observatory" section={section}>
      {section ? (
        <dl style={{ margin: 0 }}>
          <Row k="observatory_hash" v={fmtHash(section.observatoryHash) ?? '—'} mono />
          <Row k="drift_detected" v={fmtBool(section.driftDetected)} ok={section.driftDetected === false} />
          <Row k="mutation_guard_status" v={section.mutationGuardStatus ?? '—'} />
          <Row k="scenario_corpus_status" v={section.scenarioCorpusStatus ?? '—'} />
          <Row k="fuzz_harness_status" v={section.fuzzHarnessStatus ?? '—'} />
          <Row k="last_observed_at" v={fmtWhen(section.lastObservedAt)} />
        </dl>
      ) : null}
    </SectionFrame>
  )
}

function RuntimePilotSection({ section }: { section: AtlasSelfConstructionRuntimePilotStatus | null }) {
  return (
    <SectionFrame title="Runtime Pilot · Dry-Run" section={section}>
      {section ? (
        <dl style={{ margin: 0 }}>
          <Row k="dry_run_status" v={section.dryRunStatus ?? '—'} ok={section.dryRunStatus === 'passed'} />
          <Row k="pilot_mode" v={section.pilotMode ?? '—'} />
          <Row k="pilot_hash" v={fmtHash(section.pilotHash) ?? '—'} mono />
          <Row k="external_provider_call" v={fmtBool(section.externalProviderCall)} ok={section.externalProviderCall === false} />
          <Row k="dispatch_allowed" v={fmtBool(section.dispatchAllowed)} />
          <Row k="last_dry_run_at" v={fmtWhen(section.lastDryRunAt)} />
        </dl>
      ) : null}
    </SectionFrame>
  )
}

function ReleaseDossierSection({ section }: { section: AtlasSelfConstructionReleaseDossierStatus | null }) {
  return (
    <SectionFrame title="Release Dossier" section={section}>
      {section ? (
        <dl style={{ margin: 0 }}>
          <Row k="dossier_id" v={section.dossierId ?? '—'} mono />
          <Row k="release_dossier_hash" v={fmtHash(section.releaseDossierHash) ?? '—'} mono />
          <Row k="risk_level" v={section.riskLevel ?? '—'} ok={section.riskLevel === 'low'} />
          <Row k="evidence_count" v={section.evidenceCount === null ? '—' : String(section.evidenceCount)} />
          <Row k="command_evidence_count" v={section.commandEvidenceCount === null ? '—' : String(section.commandEvidenceCount)} />
          <Row k="doc_evidence_count" v={section.docEvidenceCount === null ? '—' : String(section.docEvidenceCount)} />
          <Row k="test_evidence_count" v={section.testEvidenceCount === null ? '—' : String(section.testEvidenceCount)} />
          {section.operatorSummary ? (
            <div
              style={{
                marginTop: 6,
                padding: '6px 8px',
                fontFamily: 'var(--cc-font-mono)',
                fontSize: 11,
                color: 'var(--cc-text-muted)',
                background: 'var(--cc-surface-sunken, rgba(0,0,0,0.04))',
                borderRadius: 2,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {section.operatorSummary}
            </div>
          ) : null}
        </dl>
      ) : null}
    </SectionFrame>
  )
}

function ProofHashesSection({ hashes }: { hashes: AtlasSelfConstructionSnapshot['proofHashes'] }) {
  const entries: Array<[string, string | null]> = [
    ['chain_integrity', hashes.chainIntegrity],
    ['deterministic_replay', hashes.deterministicReplay],
    ['proof_bundle', hashes.proofBundle],
    ['promotion_gate', hashes.promotionGate],
    ['replay_diff', hashes.replayDiff],
    ['release_dossier', hashes.releaseDossier],
    ['certification_workbench', hashes.certificationWorkbench],
    ['observatory', hashes.observatory],
    ['runtime_pilot', hashes.runtimePilot],
  ]
  const hasAny = entries.some(([, v]) => v !== null)

  return (
    <div>
      <div style={sectionHeading}>proof hashes</div>
      <div
        style={{
          padding: '8px 10px',
          background: 'var(--cc-surface-soft, transparent)',
          border: '1px solid var(--cc-border-soft)',
          borderRadius: 2,
        }}
      >
        {hasAny ? (
          <dl style={{ margin: 0 }}>
            {entries.map(([k, v]) => (
              <Row key={k} k={k} v={fmtHash(v) ?? '—'} mono />
            ))}
          </dl>
        ) : (
          <EmptyText>sem proof hashes expostos ainda.</EmptyText>
        )}
      </div>
    </div>
  )
}

function SectionFrame({
  title,
  section,
  children,
}: {
  title: string
  section: { status: AtlasSelfConstructionSectionStatus | null; blockers: string[]; warnings: string[]; note: string | null } | null
  children?: React.ReactNode
}) {
  return (
    <div>
      <div style={sectionHeading}>
        {title}
        {section ? <span style={{ marginLeft: 8, opacity: 0.7 }}>· {section.status ?? '—'}</span> : null}
      </div>
      <div
        style={{
          padding: '8px 10px',
          background: 'var(--cc-surface-soft, transparent)',
          border: '1px solid var(--cc-border-soft)',
          borderRadius: 2,
        }}
      >
        {section ? (
          <>
            {children}
            {section.blockers.length > 0 ? <Bullets label="blockers" tone="bad" items={section.blockers} compact /> : null}
            {section.warnings.length > 0 ? <Bullets label="warnings" tone="warn" items={section.warnings} compact /> : null}
            {section.note ? (
              <div
                style={{
                  marginTop: 6,
                  fontFamily: 'var(--cc-font-mono)',
                  fontSize: 10.5,
                  color: 'var(--cc-text-muted)',
                  wordBreak: 'break-word',
                }}
              >
                {section.note}
              </div>
            ) : null}
          </>
        ) : (
          <EmptyText>backend ainda não expõe este bloco.</EmptyText>
        )}
      </div>
    </div>
  )
}

function Bullets({
  label,
  tone,
  items,
  compact = false,
}: {
  label: string
  tone: 'bad' | 'warn'
  items: string[]
  compact?: boolean
}) {
  const color = tone === 'bad' ? 'var(--rec-red, #8a3025)' : 'var(--cc-warning-fg, #b07b22)'
  return (
    <div style={{ marginTop: compact ? 6 : 0 }}>
      <div
        style={{
          fontFamily: 'var(--cc-font-sans)',
          fontSize: 10.5,
          letterSpacing: 0,
          color,
          marginBottom: 3,
          textTransform: 'lowercase',
        }}
      >
        {label} · {items.length}
      </div>
      <ul
        style={{
          margin: 0,
          paddingLeft: 14,
          color,
          fontFamily: 'var(--cc-font-mono)',
          fontSize: 10.5,
          lineHeight: 1.5,
        }}
      >
        {items.slice(0, 12).map((it, idx) => (
          <li key={`${label}-${idx}`} style={{ wordBreak: 'break-word' }}>
            {it}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// Local formatting helpers

function fmtBool(v: boolean | null): string {
  if (v === null) return '—'
  return v ? 'true' : 'false'
}

function fmtHash(v: string | null): string | null {
  if (!v) return null
  if (v.length <= 16) return v
  return `${v.slice(0, 10)}…${v.slice(-4)}`
}

function fmtWhen(v: string | null): string {
  return v ?? '—'
}

function fmtCount(items: string[]): string {
  if (items.length === 0) return '0'
  if (items.length <= 3) return items.join(' · ')
  return `${items.length} · ${items.slice(0, 2).join(' · ')}…`
}
