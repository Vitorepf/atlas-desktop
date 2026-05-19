//! Tauri command wrappers around the Atlas Vox local STT module.
//!
//! Scope:
//!   - Status: where is the model, is the engine available, what's the next
//!     step the operator should take.
//!   - Personal dictionary: read + replace the on-disk file.
//!   - Debug-only text pipeline: applies the dictionary + post-correction to
//!     a string the caller already has, returning a real VoxTranscript so
//!     the React side can exercise the rendering path without a microphone.
//!   - Wave 6.6: `vox_stt_transcribe_audio` — pulls the in-memory PCM
//!     snapshot from `VoxEdge`, runs the real whisper.cpp engine + the
//!     personal dictionary, returns a `VoxTranscript.v1`.
//!
//! No microphone, no hotkey, no PTT lifecycle — those belong to Claude A.

use std::sync::Arc;

use atlas_platform::vox::{parse_session_id, VoxAudioSnapshot, VoxEdge};
use atlas_platform::vox_stt::{
    default_atlas_vox_home, run_text_pipeline, DictionaryStore, ModelStatus, ModelStore,
    PersonalDictionary, SttEngine, SttError, VoxSttInput, VoxTranscript, WhisperCppEngine,
};
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

fn into_str_err<E: std::fmt::Display>(e: E) -> String {
    let msg = e.to_string();
    tracing::warn!(error = %msg, "vox command failed");
    msg
}

#[tauri::command]
pub fn vox_stt_status() -> ModelStatus {
    let home = default_atlas_vox_home();
    ModelStore::with_home_dir(&home).status()
}

#[tauri::command]
pub fn vox_dictionary_get() -> Result<PersonalDictionary, String> {
    let home = default_atlas_vox_home();
    let store = DictionaryStore::with_home_dir(&home);
    let (dict, _created) = store.load_or_initialize().map_err(into_str_err)?;
    Ok(dict)
}

#[tauri::command]
pub fn vox_dictionary_update(
    next: PersonalDictionary,
) -> Result<PersonalDictionary, String> {
    let home = default_atlas_vox_home();
    let store = DictionaryStore::with_home_dir(&home);
    store.update(next).map_err(into_str_err)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DebugTranscribeRequest {
    pub raw_text: String,
    #[serde(default)]
    pub session_id: Option<Uuid>,
    #[serde(default)]
    pub audio_handle: Option<Uuid>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DebugTranscribeResponse {
    pub transcript: VoxTranscript,
    pub note: &'static str,
}

/// Runs the dictionary + post-correction pipeline over a caller-supplied
/// string. Returns a real `VoxTranscript` so the frontend can validate
/// rendering, but the transcript carries `confidence = 0.0` and no words
/// because no audio was processed. This is intentional and the response
/// includes a `note` field documenting the limitation.
#[tauri::command]
pub fn vox_stt_transcribe_debug_text(
    request: DebugTranscribeRequest,
) -> Result<DebugTranscribeResponse, String> {
    let home = default_atlas_vox_home();
    let store = DictionaryStore::with_home_dir(&home);
    let (dict, _) = store.load_or_initialize().map_err(into_str_err)?;

    let session_id = request.session_id.unwrap_or_else(Uuid::new_v4);
    let audio_handle = request.audio_handle.unwrap_or_else(Uuid::new_v4);
    let input = VoxSttInput::empty(session_id, audio_handle);

    let transcript = run_text_pipeline(&input, &request.raw_text, &dict);
    Ok(DebugTranscribeResponse {
        transcript,
        note: "debug fixture · no audio engine invoked; confidence and words are zeroed",
    })
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscribeAudioRequest {
    pub session_id: String,
    pub audio_handle: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscribeAudioTimings {
    pub snapshot_consume_ms: u64,
    pub engine_invoke_ms: u64,
    pub total_ms: u64,
    pub sample_rate_in: u32,
    pub channels_in: u16,
    pub duration_ms: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscribeAudioResponse {
    pub transcript: VoxTranscript,
    pub model_status: ModelStatus,
    pub timings: TranscribeAudioTimings,
}

#[derive(Debug, Serialize)]
#[serde(tag = "code")]
pub enum TranscribeAudioError {
    #[serde(rename = "invalid_uuid", rename_all = "camelCase")]
    InvalidUuid { field: String, value: String },
    #[serde(rename = "audio_snapshot_missing", rename_all = "camelCase")]
    AudioSnapshotMissing {
        audio_handle: String,
        message: String,
    },
    #[serde(rename = "audio_snapshot_empty", rename_all = "camelCase")]
    AudioSnapshotEmpty { audio_handle: String },
    #[serde(rename = "session_mismatch", rename_all = "camelCase")]
    SessionMismatch {
        requested_session_id: String,
        snapshot_session_id: String,
    },
    #[serde(rename = "dictionary_load_failed", rename_all = "camelCase")]
    DictionaryLoadFailed { message: String },
    #[serde(untagged)]
    Stt(SttError),
}

impl From<TranscribeAudioError> for String {
    fn from(e: TranscribeAudioError) -> Self {
        // Tauri commands need a `String` Err variant. We still serialize
        // the structured form so the frontend can switch on `code`.
        serde_json::to_string(&e).unwrap_or_else(|_| format!("{e:?}"))
    }
}

/// Wave 6.6 (Claude M) — the real STT entry-point.
///
/// 1. Parses session_id + audio_handle into UUIDs.
/// 2. Consumes the in-memory `VoxAudioSnapshot` from `VoxEdge`
///    (removes it from memory in the process — single-use).
/// 3. Verifies the snapshot belongs to the requested session.
/// 4. Loads the personal dictionary.
/// 5. Runs `WhisperCppEngine::transcribe`. If the binding isn't compiled
///    or the model file is missing, returns a structured `SttError`
///    with the same `nextAction` the operator can act on.
/// 6. Returns `VoxTranscript.v1` + `ModelStatus` + timing breakdown.
///
/// raw_pcm_persisted is ALWAYS false in the returned transcript and the
/// snapshot is dropped at the end of this function — no `Vec<f32>`
/// escapes.
#[tauri::command]
pub fn vox_stt_transcribe_audio(
    request: TranscribeAudioRequest,
    edge: State<'_, Arc<VoxEdge>>,
) -> Result<TranscribeAudioResponse, String> {
    let session_id = parse_session_id(&request.session_id).map_err(|_| {
        let err = TranscribeAudioError::InvalidUuid {
            field: "sessionId".to_string(),
            value: request.session_id.clone(),
        };
        String::from(err)
    })?;
    let audio_handle = Uuid::parse_str(&request.audio_handle).map_err(|_| {
        let err = TranscribeAudioError::InvalidUuid {
            field: "audioHandle".to_string(),
            value: request.audio_handle.clone(),
        };
        String::from(err)
    })?;

    let total_start = std::time::Instant::now();
    let consume_start = std::time::Instant::now();
    let snapshot: VoxAudioSnapshot = edge.consume_audio_snapshot(audio_handle).ok_or_else(|| {
        let err = TranscribeAudioError::AudioSnapshotMissing {
            audio_handle: audio_handle.to_string(),
            message: "no ready-for-stt session matched this audio_handle (already consumed, cancelled, or never existed)".to_string(),
        };
        String::from(err)
    })?;
    let consume_ms = consume_start.elapsed().as_millis() as u64;

    if snapshot.session_id != session_id {
        let err = TranscribeAudioError::SessionMismatch {
            requested_session_id: session_id.to_string(),
            snapshot_session_id: snapshot.session_id.to_string(),
        };
        return Err(String::from(err));
    }
    if snapshot.is_empty() {
        let err = TranscribeAudioError::AudioSnapshotEmpty {
            audio_handle: audio_handle.to_string(),
        };
        return Err(String::from(err));
    }

    let home = default_atlas_vox_home();
    let dict_store = DictionaryStore::with_home_dir(&home);
    let (dict, _) = dict_store.load_or_initialize().map_err(|e| {
        let err = TranscribeAudioError::DictionaryLoadFailed {
            message: e.to_string(),
        };
        String::from(err)
    })?;

    let engine = WhisperCppEngine::with_home_dir(&home);
    let model_status = engine.model_status();
    let input = VoxSttInput {
        session_id,
        audio_handle,
        sample_rate: snapshot.sample_rate,
        channels: snapshot.channels,
        pcm_f32: snapshot.samples,
        duration_ms: snapshot.duration_ms,
        capture_to_stt_start_ms: consume_ms,
    };
    let sample_rate_in = input.sample_rate;
    let channels_in = input.channels;
    let duration_ms = input.duration_ms;

    let engine_start = std::time::Instant::now();
    let transcript = engine.transcribe(&input, &dict).map_err(|e| {
        // We don't fabricate: bubble the structured error up.
        String::from(TranscribeAudioError::Stt(e))
    })?;
    let engine_ms = engine_start.elapsed().as_millis() as u64;

    // Hard contract: never claim audio was persisted.
    debug_assert!(!transcript.raw_pcm_persisted);

    Ok(TranscribeAudioResponse {
        transcript,
        model_status,
        timings: TranscribeAudioTimings {
            snapshot_consume_ms: consume_ms,
            engine_invoke_ms: engine_ms,
            total_ms: total_start.elapsed().as_millis() as u64,
            sample_rate_in,
            channels_in,
            duration_ms,
        },
    })
}

#[cfg(test)]
mod transcribe_audio_tests {
    use super::*;
    use atlas_platform::vox::{VoxConsent, VoxEdgeConfig, VoxMode, VoxSource, VoxStartSessionRequest};

    fn ok_request() -> VoxStartSessionRequest {
        VoxStartSessionRequest {
            source: VoxSource::MacEdgeHotkey,
            mode_requested: VoxMode::Dictation,
            language: "pt-BR".to_string(),
            consent: VoxConsent {
                audio_capture: true,
                context_share: false,
                debug_keep_audio: false,
            },
        }
    }

    #[test]
    fn transcribe_audio_error_serializes_with_code_discriminator() {
        let err = TranscribeAudioError::InvalidUuid {
            field: "audioHandle".to_string(),
            value: "not-a-uuid".to_string(),
        };
        let v: serde_json::Value = serde_json::from_str(&String::from(err)).unwrap();
        assert_eq!(v["code"], "invalid_uuid");
        assert_eq!(v["field"], "audioHandle");
    }

    #[test]
    fn audio_snapshot_missing_error_carries_audio_handle() {
        let err = TranscribeAudioError::AudioSnapshotMissing {
            audio_handle: Uuid::nil().to_string(),
            message: "test".to_string(),
        };
        let v: serde_json::Value = serde_json::from_str(&String::from(err)).unwrap();
        assert_eq!(v["code"], "audio_snapshot_missing");
        assert_eq!(v["audioHandle"], "00000000-0000-0000-0000-000000000000");
    }

    #[test]
    fn voxedge_consume_audio_snapshot_returns_none_after_first_consume() {
        // Documents the contract the Tauri command relies on:
        // consume_audio_snapshot is single-use, so a second call yields
        // None and the command must surface `audio_snapshot_missing`.
        let edge = VoxEdge::new(VoxEdgeConfig::test_disabled());
        let started = edge.start_session(ok_request()).unwrap();
        let session_uuid = parse_session_id(&started.session_id).unwrap();
        let audio_handle = Uuid::parse_str(&started.audio_handle).unwrap();
        edge.finish_session(session_uuid).unwrap();

        let first = edge.consume_audio_snapshot(audio_handle);
        assert!(first.is_some());
        let second = edge.consume_audio_snapshot(audio_handle);
        assert!(second.is_none(), "snapshot must be single-use — re-consume would imply leftover audio");
    }

    #[test]
    fn voxedge_consume_audio_snapshot_after_cancel_returns_none() {
        // Confirms that after cancel, the command will honestly report
        // audio_snapshot_missing instead of fabricating a transcript.
        let edge = VoxEdge::new(VoxEdgeConfig::test_disabled());
        let started = edge.start_session(ok_request()).unwrap();
        let session_uuid = parse_session_id(&started.session_id).unwrap();
        let audio_handle = Uuid::parse_str(&started.audio_handle).unwrap();
        edge.cancel_session(session_uuid).unwrap();
        assert!(edge.consume_audio_snapshot(audio_handle).is_none());
    }
}
