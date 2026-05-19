//! Canonical types for the Atlas Vox Mac Edge.
//!
//! These types are intentionally aligned with the `VoxSessionPacket.v1`
//! contract (`atlas-server/docs/contracts/vox/`) but live in the Mac Edge
//! crate as the *local* view of the session. The Kernel still owns final
//! schema validation; this is the desktop-side packet the Tauri shell
//! emits to the React surface and hands to the local STT module.
//!
//! Onda 1 invariants encoded here:
//!   - `raw_pcm_persisted` is **always** false. The Mac Edge never writes
//!     audio to disk, never streams it over the network, never hands raw
//!     PCM to the Kernel.
//!   - `language` is restricted to `pt-BR` (single-user, single-language).
//!   - `consent.debug_keep_audio` is rejected at the boundary (Onda 1).

use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Trigger origin of a Vox session. Mirrors the `source` enum in
/// `VoxSessionPacket.v1`.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum VoxSource {
    DesktopOverlay,
    MacEdgeHotkey,
    DesktopInboxButton,
    DesktopWorkbenchButton,
}

/// Operational mode requested by the operator. The Mac Edge does not
/// downgrade modes — the Kernel is allowed to reclassify down (never up)
/// per `VoxSessionPacket.v1` rule.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum VoxMode {
    Dictation,
    PromptPolish,
    IntentCompile,
    GovernedExecute,
}

/// Lifecycle state of a Mac Edge session, as visible to the surface.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum VoxSessionState {
    Idle,
    Recording,
    ReadyForStt,
    Cancelled,
    Failed,
}

/// Opt-in flags the operator (or the UI on their behalf) attaches to the
/// session. Default-deny semantics: a missing flag is treated as `false`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct VoxConsent {
    pub audio_capture: bool,
    pub context_share: bool,
    pub debug_keep_audio: bool,
}

/// Request payload from the surface (or hotkey daemon) to start a session.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VoxStartSessionRequest {
    pub source: VoxSource,
    pub mode_requested: VoxMode,
    pub language: String,
    pub consent: VoxConsent,
}

/// Snapshot of a session, safe to send over Tauri events / React.
/// Does NOT include raw PCM. Audio bytes are retrievable only via the
/// in-process Rust API (`VoxEdge::consume_audio_snapshot`).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VoxEdgeSession {
    pub session_id: String,
    pub started_at: String,
    pub source: VoxSource,
    pub mode_requested: VoxMode,
    pub language: String,
    pub audio_handle: String,
    pub raw_pcm_persisted: bool,
    pub state: VoxSessionState,
    pub duration_ms: u64,
    pub sample_rate: u32,
    pub channels: u16,
}

/// macOS permission states. Until we wire real TIS / TCC probes we report
/// `not_checked` rather than lying.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VoxEdgePermissions {
    pub microphone: String,
    pub accessibility: String,
    pub input_monitoring: String,
}

/// Top-level readiness report exposed to the surface.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VoxEdgeStatus {
    pub available: bool,
    pub capture_available: bool,
    pub hotkey_available: bool,
    pub active_session_id: Option<String>,
    pub last_error: Option<String>,
    pub permissions: VoxEdgePermissions,
    pub eclipse_active: bool,
    pub default_hotkey: String,
    pub pending_capabilities: Vec<String>,
}

/// In-memory audio snapshot handed to the STT module (Claude B).
///
/// Crossing the Tauri boundary with raw PCM is intentionally forbidden:
/// this struct is **not** `Serialize`. The STT module imports it from
/// this crate and calls `VoxEdge::consume_audio_snapshot` directly.
#[derive(Debug, Clone)]
pub struct VoxAudioSnapshot {
    pub session_id: Uuid,
    pub audio_handle: Uuid,
    pub samples: Vec<f32>,
    pub sample_rate: u32,
    pub channels: u16,
    pub captured_at_iso: String,
    pub duration_ms: u64,
}

impl VoxAudioSnapshot {
    pub fn is_empty(&self) -> bool {
        self.samples.is_empty()
    }
}
