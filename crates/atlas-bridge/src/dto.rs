//! Wire-level data transfer objects mirroring atlas-server JSON shapes.
//!
//! Names mirror the Atlas Server resources (camelCase via serde rename, since
//! Laravel returns snake_case but the desktop normalises to camelCase to match
//! the @atlas/domain TS package).

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

// ──────────────────────────────────────────────────────────────────────────────
// Health (#1)

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HealthDto {
    pub kernel: String,
    pub providers: Vec<String>,
    pub mcp: Vec<String>,
    pub queue: u32,
}

// ──────────────────────────────────────────────────────────────────────────────
// Obras (#2 list, #3 create)

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ObraDto {
    pub id: String,
    pub title: String,
    pub objective: String,
    pub status: ObraStatus,
    pub workspace_path: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ObraStatus {
    Active,
    Idle,
    Archived,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateObraPayload {
    pub intent: String,
    pub objective: String,
}

// ──────────────────────────────────────────────────────────────────────────────
// Sessions (#4 list, #5 get, #6 stream, #7 send intent)

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionDto {
    pub id: String,
    pub obra_id: String,
    pub thread_id: String,
    pub title: String,
    pub status: SessionStatus,
    pub turns: u32,
    pub duration_ms: u64,
    pub origin: SessionOrigin,
    pub snapshot: Option<SessionSnapshot>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SessionStatus {
    Running,
    Paused,
    Done,
    Failed,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SessionOrigin {
    Cli,
    Manual,
    Voice,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionSnapshot {
    pub size_kb: f32,
    pub intent_preserved: bool,
    pub evidence_refs: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MessageDto {
    pub id: String,
    pub role: MessageRole,
    pub body: String,
    pub channel: Option<String>,
    pub ts: String,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MessageRole {
    User,
    Atlas,
    System,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamEventDto {
    pub event_type: String,
    pub sequence: u64,
    pub content: serde_json::Value,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SendIntentPayload {
    pub session_id: String,
    pub body: String,
    pub channel: String,
}

// ──────────────────────────────────────────────────────────────────────────────
// Decision Receipts (#8 get, #9 sign)

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DecisionReceiptDto {
    pub id: String,
    pub obra_id: String,
    pub primary: String,
    pub confidence: String,
    pub confidence_score: f32,
    pub budget_est_usd: f64,
    pub budget_used_usd: f64,
    pub fallback_chain: Vec<String>,
    pub signed_by: Option<String>,
    pub signature: Option<String>,
    pub signed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReceiptSignaturePayload {
    pub signature: String,  // base64 ed25519
    pub public_key: String, // base64 ed25519
    pub signed_at: DateTime<Utc>,
    pub signer_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SignedReceiptAck {
    pub decision_id: String,
    pub signature_valid: bool,
    pub ledger_event_id: String,
}

// ──────────────────────────────────────────────────────────────────────────────
// Evidence (#10) + Quality Gates (#11) + Diff apply (#12)

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvidenceDto {
    pub id: String,
    pub obra_id: String,
    pub kind: String,
    pub summary: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QualityGateDto {
    pub id: String,
    pub name: String,
    pub state: GateState,
    pub detail: Option<String>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum GateState {
    Pending,
    Passed,
    Failed,
    Blocked,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GateRunDto {
    pub gate_id: String,
    pub run_id: String,
    pub state: GateState,
    pub detail: Option<String>,
    pub duration_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplyDiffPayload {
    pub confirm: bool,
    pub run_gates: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplyDiffAck {
    pub engineering_run_id: String,
    pub diff_applied: bool,
    pub gates_running: Vec<String>,
    pub stream_url: String,
}

// ──────────────────────────────────────────────────────────────────────────────
// Packets (lateral · Atlas Implementation Packets shown in conversation)

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PacketDto {
    pub id: String,
    pub agent: String,
    pub title: String,
    pub status: PacketStatus,
    pub cost_usd: Option<f64>,
    pub tokens: Option<u64>,
    pub duration_ms: Option<u64>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PacketStatus {
    Todo,
    Running,
    Done,
    Failed,
}
