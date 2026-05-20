//! Atlas Vox · Mac Edge module.
//!
//! This module owns the **capture side** of the Vox pipeline on the
//! operator's machine: session lifecycle, push-to-talk audio capture,
//! cancellation, eclipse, and the opaque audio handle that the STT
//! module (Claude B, see `crate::vox_stt`) consumes.
//!
//! Boundary canon (Lei 0 / Lei 0.75 / ADR 0003):
//!   - No filesystem writes. No network. No Kernel calls. No provider
//!     SDKs. Raw PCM never leaves this module except via the in-process
//!     `consume_audio_snapshot` API.
//!   - `raw_pcm_persisted` is always `false`. Hard invariant.
//!   - Global hotkey wiring is NOT delivered in Onda 1; the surface
//!     drives push-to-talk via explicit Tauri commands. Status reports
//!     `hotkey_available = false` honestly.
//!
//! Integration with `vox_stt`: after `finish_session`, call
//! `consume_audio_snapshot(audio_handle)`; map the returned
//! `VoxAudioSnapshot` into the `VoxSttInput` shape that engine expects.

pub mod audio;
pub mod hotkey;
pub mod session;
pub mod types;

pub use audio::{
    capture_available, describe_default_input, AudioCaptureError, AudioInputSnapshot, RealRecorder,
};
pub use hotkey::{
    hotkey_available, pending_hotkey_capability, HotkeyError, VoxHotkeyEvent, VoxHotkeyRuntime,
    VoxHotkeyStatus, DEFAULT_HOTKEY_DESCRIPTION, ESCAPE_DOUBLE_TAP_WINDOW,
    SECONDARY_HOTKEY_DESCRIPTION,
};
pub use session::{parse_session_id, VoxEdge, VoxEdgeConfig, VoxEdgeError, DEFAULT_LANGUAGE};
pub use types::{
    VoxAudioLevel, VoxAudioSnapshot, VoxConsent, VoxEdgePermissions, VoxEdgeSession,
    VoxEdgeStatus, VoxMode, VoxSessionState, VoxSource, VoxStartSessionRequest,
};
