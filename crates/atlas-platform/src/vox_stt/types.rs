//! Types for the Atlas Vox local STT module.
//!
//! Mirrors the canonical contract `atlas.vox.transcript.v1`
//! (docs/contracts/vox/VoxTranscript.v1.md). All JSON serialization uses
//! camelCase per atlas-desktop Tauri convention; the `schema` field carries
//! the canonical id so downstream consumers know which contract version to
//! validate against.

use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub const TRANSCRIPT_SCHEMA: &str = "atlas.vox.transcript.v1";
pub const DICTIONARY_SCHEMA: &str = "atlas.vox.personal_dictionary.v1";

/// Canonical default engine for Atlas Vox V0. Swapped only via the formal
/// rivals benchmark (Onda 7.5), never silently.
pub const DEFAULT_ENGINE: &str = "whisper.cpp@large-v3";

pub const DEFAULT_LANGUAGE: &str = "pt-BR";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct WordToken {
    pub w: String,
    pub t_start: f32,
    pub t_end: f32,
    pub conf: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PostCorrection {
    pub from: String,
    pub to: String,
    /// Stable rule identifier. V0 only emits `personal_dictionary`; future
    /// passes will introduce `fuzzy_match` and `manual_inline_edit`.
    pub rule: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LatencyMs {
    pub capture_to_stt_start: u64,
    pub stt_processing: u64,
    pub correction_pass: u64,
    pub total: u64,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum EclipseCheck {
    Passed,
    AbortedMidCapture,
}

impl Default for EclipseCheck {
    fn default() -> Self {
        EclipseCheck::Passed
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct NoiseSignals {
    pub silence_ratio: f32,
    pub snr_estimate_db: f32,
    pub vad_segments: u32,
}

/// Serializable VoxTranscript.v1.
///
/// Invariants enforced by the engine pipeline:
///   1. `raw_pcm_persisted` is always `false` in this wave (no opt-in path
///      exists yet).
///   2. `text_raw` is whatever the STT engine returned, before any dictionary
///      rewrite. `text` is the post-correction output.
///   3. `personal_dictionary_applied` lists only the preferred forms that
///      were actually emitted as prompt-bias hints to the engine (best
///      effort — whisper.cpp does not expose biasing in V0, so we record
///      what would have been biased).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VoxTranscript {
    pub schema: String,
    pub session_id: Uuid,
    pub transcript_id: Uuid,
    pub audio_handle: Uuid,
    pub language: String,
    pub engine: String,
    pub engine_invocation_id: Uuid,
    pub text: String,
    pub text_raw: String,
    pub confidence: f32,
    pub words: Vec<WordToken>,
    pub personal_dictionary_applied: Vec<String>,
    pub post_corrections: Vec<PostCorrection>,
    pub latency_ms: LatencyMs,
    pub raw_pcm_persisted: bool,
    pub eclipse_check: EclipseCheck,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub noise_signals: Option<NoiseSignals>,
    pub created_at: String,
}

impl VoxTranscript {
    pub fn new(
        session_id: Uuid,
        audio_handle: Uuid,
        engine: &str,
        text_raw: String,
        text: String,
        confidence: f32,
        words: Vec<WordToken>,
        personal_dictionary_applied: Vec<String>,
        post_corrections: Vec<PostCorrection>,
        latency_ms: LatencyMs,
    ) -> Self {
        Self {
            schema: TRANSCRIPT_SCHEMA.to_string(),
            session_id,
            transcript_id: Uuid::new_v4(),
            audio_handle,
            language: DEFAULT_LANGUAGE.to_string(),
            engine: engine.to_string(),
            engine_invocation_id: Uuid::new_v4(),
            text,
            text_raw,
            confidence,
            words,
            personal_dictionary_applied,
            post_corrections,
            latency_ms,
            raw_pcm_persisted: false,
            eclipse_check: EclipseCheck::Passed,
            noise_signals: None,
            created_at: chrono::Utc::now().to_rfc3339(),
        }
    }
}

/// Input handed from the Mac Edge audio capture (Claude A) to the STT engine.
///
/// Memory-only — `pcm_f32` is a borrowed/owned buffer that lives just for the
/// duration of the transcribe call. The `audio_handle` is the opaque id with
/// 60s TTL that the contract references; the capture layer owns its
/// lifecycle, the STT layer just echoes it back inside the transcript.
#[derive(Debug, Clone)]
pub struct VoxSttInput {
    pub session_id: Uuid,
    pub audio_handle: Uuid,
    pub sample_rate: u32,
    pub channels: u16,
    pub pcm_f32: Vec<f32>,
    pub duration_ms: u64,
    pub capture_to_stt_start_ms: u64,
}

impl VoxSttInput {
    /// Convenience for tests / debug fixtures: produces a synthetic input with
    /// zero audio. The STT engine should still refuse to fabricate a
    /// transcript from this — callers use it only to exercise the pipeline
    /// scaffolding (dictionary, post-correction, serialization).
    pub fn empty(session_id: Uuid, audio_handle: Uuid) -> Self {
        Self {
            session_id,
            audio_handle,
            sample_rate: 16_000,
            channels: 1,
            pcm_f32: Vec::new(),
            duration_ms: 0,
            capture_to_stt_start_ms: 0,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn transcript_serializes_with_camel_case_and_raw_pcm_false() {
        let transcript = VoxTranscript::new(
            Uuid::nil(),
            Uuid::nil(),
            DEFAULT_ENGINE,
            "codes".into(),
            "Codex".into(),
            0.91,
            vec![],
            vec!["Codex".into()],
            vec![PostCorrection {
                from: "codes".into(),
                to: "Codex".into(),
                rule: "personal_dictionary".into(),
            }],
            LatencyMs::default(),
        );

        let value: serde_json::Value = serde_json::to_value(&transcript).unwrap();

        assert_eq!(value["schema"], "atlas.vox.transcript.v1");
        assert_eq!(value["rawPcmPersisted"], false);
        assert_eq!(value["sessionId"], "00000000-0000-0000-0000-000000000000");
        assert_eq!(value["engine"], DEFAULT_ENGINE);
        assert_eq!(value["language"], "pt-BR");
        assert_eq!(value["postCorrections"][0]["rule"], "personal_dictionary");
        assert!(value.get("noiseSignals").is_none(), "noiseSignals must be omitted when absent");
    }

    #[test]
    fn eclipse_check_serializes_snake_case_value() {
        let mut transcript = VoxTranscript::new(
            Uuid::nil(),
            Uuid::nil(),
            DEFAULT_ENGINE,
            "".into(),
            "".into(),
            0.0,
            vec![],
            vec![],
            vec![],
            LatencyMs::default(),
        );
        transcript.eclipse_check = EclipseCheck::AbortedMidCapture;
        let value: serde_json::Value = serde_json::to_value(&transcript).unwrap();
        assert_eq!(value["eclipseCheck"], "aborted_mid_capture");
    }
}
