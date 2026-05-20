//! Vox Edge session manager. Pure state machine over an optional cpal
//! recorder. Holds one `ActiveSession` at a time (push-to-talk is single
//! channel) and a small in-memory map of finished sessions waiting for
//! the STT module to consume them.
//!
//! Safety contract enforced here:
//!   - `raw_pcm_persisted` is always reported as `false`.
//!   - No filesystem writes, no network calls, no Kernel calls.
//!   - `cancel_session` and `eclipse` drop every captured byte before
//!     returning.
//!   - `consume_audio_snapshot` is the ONLY way to extract PCM, and it
//!     removes the session from memory in the process.

use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

use chrono::{DateTime, Utc};
use parking_lot::Mutex;
use uuid::Uuid;

use super::audio::{self, AudioCaptureError, RealRecorder};
use super::hotkey;
use super::types::*;

pub const DEFAULT_LANGUAGE: &str = "pt-BR";
pub const DEFAULT_TEST_SAMPLE_RATE: u32 = 16_000;
pub const DEFAULT_TEST_CHANNELS: u16 = 1;

/// Construction-time switch. Production code uses `production()` to enable
/// real cpal capture. Tests use `test_disabled()` so they run without a
/// microphone and without triggering the macOS permission prompt.
#[derive(Debug, Clone, Copy)]
pub struct VoxEdgeConfig {
    pub real_audio: bool,
}

impl VoxEdgeConfig {
    pub fn production() -> Self {
        Self { real_audio: true }
    }

    pub fn test_disabled() -> Self {
        Self { real_audio: false }
    }
}

pub struct VoxEdge {
    config: VoxEdgeConfig,
    inner: Mutex<Inner>,
}

struct Inner {
    active: Option<ActiveSession>,
    finished: HashMap<Uuid, FinishedSession>,
    last_error: Option<String>,
}

struct ActiveSession {
    session_id: Uuid,
    audio_handle: Uuid,
    started_at_unix_ms: u128,
    started_at_iso: String,
    source: VoxSource,
    mode_requested: VoxMode,
    language: String,
    #[allow(dead_code)]
    consent: VoxConsent,
    recorder: Option<RealRecorder>,
    sample_rate: u32,
    channels: u16,
}

struct FinishedSession {
    session_id: Uuid,
    audio_handle: Uuid,
    state: VoxSessionState,
    source: VoxSource,
    mode_requested: VoxMode,
    language: String,
    started_at_iso: String,
    duration_ms: u64,
    samples: Vec<f32>,
    sample_rate: u32,
    channels: u16,
}

#[derive(Debug, thiserror::Error)]
pub enum VoxEdgeError {
    #[error("vox session already active: {0}")]
    AlreadyActive(Uuid),
    #[error("vox session not found: {0}")]
    NotFound(Uuid),
    #[error("vox consent rejects audio_capture")]
    ConsentBlocked,
    #[error("vox debug_keep_audio is forbidden in Onda 1")]
    DebugKeepAudioForbidden,
    #[error("vox language not supported (only pt-BR): {0}")]
    LanguageNotSupported(String),
    #[error("vox audio capture failed: {0}")]
    Capture(#[from] AudioCaptureError),
    #[error("vox invalid uuid: {0}")]
    InvalidUuid(String),
}

impl VoxEdge {
    pub fn new(config: VoxEdgeConfig) -> Self {
        Self {
            config,
            inner: Mutex::new(Inner {
                active: None,
                finished: HashMap::new(),
                last_error: None,
            }),
        }
    }

    pub fn status(&self) -> VoxEdgeStatus {
        let inner = self.inner.lock();
        let capture_available = if self.config.real_audio {
            audio::capture_available()
        } else {
            false
        };
        let hotkey_available = hotkey::hotkey_available();
        let mut pending = Vec::new();
        if !hotkey_available {
            pending.push(hotkey::pending_hotkey_capability().to_string());
        }
        VoxEdgeStatus {
            available: true,
            capture_available,
            hotkey_available,
            active_session_id: inner.active.as_ref().map(|a| a.session_id.to_string()),
            last_error: inner.last_error.clone(),
            permissions: VoxEdgePermissions {
                microphone: "not_checked".to_string(),
                accessibility: "not_checked".to_string(),
                input_monitoring: "not_checked".to_string(),
            },
            eclipse_active: false,
            default_hotkey: hotkey::DEFAULT_HOTKEY_DESCRIPTION.to_string(),
            pending_capabilities: pending,
        }
    }

    /// Begins a push-to-talk session. Returns the surface-safe snapshot
    /// on success; on failure, the manager state is unchanged.
    pub fn start_session(
        &self,
        req: VoxStartSessionRequest,
    ) -> Result<VoxEdgeSession, VoxEdgeError> {
        if !req.consent.audio_capture {
            self.record_error("consent.audio_capture = false");
            return Err(VoxEdgeError::ConsentBlocked);
        }
        if req.consent.debug_keep_audio {
            self.record_error("consent.debug_keep_audio = true (Onda 1 forbidden)");
            return Err(VoxEdgeError::DebugKeepAudioForbidden);
        }
        if req.language != DEFAULT_LANGUAGE {
            self.record_error(&format!(
                "language {} not supported (only {})",
                req.language, DEFAULT_LANGUAGE
            ));
            return Err(VoxEdgeError::LanguageNotSupported(req.language));
        }

        let mut inner = self.inner.lock();
        if let Some(existing) = &inner.active {
            return Err(VoxEdgeError::AlreadyActive(existing.session_id));
        }

        let (recorder, sample_rate, channels) = if self.config.real_audio {
            match RealRecorder::start() {
                Ok(r) => {
                    let sr = r.sample_rate();
                    let ch = r.channels();
                    (Some(r), sr, ch)
                }
                Err(e) => {
                    let msg = format!("recorder failed: {}", e);
                    inner.last_error = Some(msg);
                    return Err(VoxEdgeError::Capture(e));
                }
            }
        } else {
            (None, DEFAULT_TEST_SAMPLE_RATE, DEFAULT_TEST_CHANNELS)
        };

        let session_id = Uuid::new_v4();
        let audio_handle = Uuid::new_v4();
        let (started_at_unix_ms, started_at_iso) = now_unix_ms_and_iso();

        let snapshot = VoxEdgeSession {
            session_id: session_id.to_string(),
            started_at: started_at_iso.clone(),
            source: req.source,
            mode_requested: req.mode_requested,
            language: req.language.clone(),
            audio_handle: audio_handle.to_string(),
            raw_pcm_persisted: false,
            state: VoxSessionState::Recording,
            duration_ms: 0,
            sample_rate,
            channels,
        };

        inner.active = Some(ActiveSession {
            session_id,
            audio_handle,
            started_at_unix_ms,
            started_at_iso,
            source: req.source,
            mode_requested: req.mode_requested,
            language: req.language,
            consent: req.consent,
            recorder,
            sample_rate,
            channels,
        });
        inner.last_error = None;

        Ok(snapshot)
    }

    /// Stops the currently-active session and consolidates its PCM
    /// buffer. The session moves to `ready_for_stt` and waits for the
    /// STT module to call `consume_audio_snapshot`.
    pub fn finish_session(&self, session_id: Uuid) -> Result<VoxEdgeSession, VoxEdgeError> {
        let mut inner = self.inner.lock();
        let active = match inner.active.take() {
            Some(s) if s.session_id == session_id => s,
            Some(s) => {
                inner.active = Some(s);
                return Err(VoxEdgeError::NotFound(session_id));
            }
            None => return Err(VoxEdgeError::NotFound(session_id)),
        };

        let samples = match active.recorder {
            Some(r) => r.stop_and_take(),
            None => Vec::new(),
        };
        let duration_ms = elapsed_ms(active.started_at_unix_ms);

        let snapshot = VoxEdgeSession {
            session_id: active.session_id.to_string(),
            started_at: active.started_at_iso.clone(),
            source: active.source,
            mode_requested: active.mode_requested,
            language: active.language.clone(),
            audio_handle: active.audio_handle.to_string(),
            raw_pcm_persisted: false,
            state: VoxSessionState::ReadyForStt,
            duration_ms,
            sample_rate: active.sample_rate,
            channels: active.channels,
        };

        inner.finished.insert(
            active.session_id,
            FinishedSession {
                session_id: active.session_id,
                audio_handle: active.audio_handle,
                state: VoxSessionState::ReadyForStt,
                source: active.source,
                mode_requested: active.mode_requested,
                language: active.language,
                started_at_iso: active.started_at_iso,
                duration_ms,
                samples,
                sample_rate: active.sample_rate,
                channels: active.channels,
            },
        );

        Ok(snapshot)
    }

    /// Cancels the named session and discards its PCM. Works on either
    /// the active session or a finished-but-not-yet-consumed one.
    pub fn cancel_session(&self, session_id: Uuid) -> Result<VoxEdgeSession, VoxEdgeError> {
        let mut inner = self.inner.lock();
        if let Some(active) = inner.active.take() {
            if active.session_id == session_id {
                if let Some(r) = active.recorder {
                    r.discard();
                }
                let duration_ms = elapsed_ms(active.started_at_unix_ms);
                let snapshot = VoxEdgeSession {
                    session_id: active.session_id.to_string(),
                    started_at: active.started_at_iso.clone(),
                    source: active.source,
                    mode_requested: active.mode_requested,
                    language: active.language.clone(),
                    audio_handle: active.audio_handle.to_string(),
                    raw_pcm_persisted: false,
                    state: VoxSessionState::Cancelled,
                    duration_ms,
                    sample_rate: active.sample_rate,
                    channels: active.channels,
                };
                inner.finished.insert(
                    active.session_id,
                    FinishedSession {
                        session_id: active.session_id,
                        audio_handle: active.audio_handle,
                        state: VoxSessionState::Cancelled,
                        source: active.source,
                        mode_requested: active.mode_requested,
                        language: active.language,
                        started_at_iso: active.started_at_iso,
                        duration_ms,
                        samples: Vec::new(),
                        sample_rate: active.sample_rate,
                        channels: active.channels,
                    },
                );
                return Ok(snapshot);
            } else {
                inner.active = Some(active);
            }
        }
        if let Some(finished) = inner.finished.get_mut(&session_id) {
            finished.state = VoxSessionState::Cancelled;
            finished.samples.clear();
            return Ok(VoxEdgeSession {
                session_id: finished.session_id.to_string(),
                started_at: finished.started_at_iso.clone(),
                source: finished.source,
                mode_requested: finished.mode_requested,
                language: finished.language.clone(),
                audio_handle: finished.audio_handle.to_string(),
                raw_pcm_persisted: false,
                state: VoxSessionState::Cancelled,
                duration_ms: finished.duration_ms,
                sample_rate: finished.sample_rate,
                channels: finished.channels,
            });
        }
        Err(VoxEdgeError::NotFound(session_id))
    }

    /// Operator panic: cancels the active session AND drops every
    /// finished-but-not-yet-consumed buffer. Returns the number of
    /// sessions touched, for telemetry.
    pub fn eclipse(&self) -> usize {
        let mut inner = self.inner.lock();
        let mut count = 0usize;
        if let Some(active) = inner.active.take() {
            if let Some(r) = active.recorder {
                r.discard();
            }
            count += 1;
        }
        let drained = std::mem::take(&mut inner.finished);
        for (_, mut s) in drained {
            s.samples.clear();
            // FinishedSession dropped at end of scope
            count += 1;
        }
        inner.last_error = None;
        count
    }

    /// Consumes a ready-for-STT session and returns its PCM. Removes the
    /// session from memory in the process — Claude B's STT module is the
    /// only legitimate caller.
    pub fn consume_audio_snapshot(&self, audio_handle: Uuid) -> Option<VoxAudioSnapshot> {
        let mut inner = self.inner.lock();
        let session_id = inner
            .finished
            .iter()
            .find(|(_, f)| {
                f.audio_handle == audio_handle && f.state == VoxSessionState::ReadyForStt
            })
            .map(|(id, _)| *id)?;
        let finished = inner.finished.remove(&session_id)?;
        Some(VoxAudioSnapshot {
            session_id: finished.session_id,
            audio_handle: finished.audio_handle,
            samples: finished.samples,
            sample_rate: finished.sample_rate,
            channels: finished.channels,
            captured_at_iso: finished.started_at_iso,
            duration_ms: finished.duration_ms,
        })
    }

    /// Non-consuming view of a session's metadata. Used by Tauri commands
    /// and tests; never hands out PCM.
    pub fn peek_session(&self, session_id: Uuid) -> Option<VoxEdgeSession> {
        let inner = self.inner.lock();
        if let Some(active) = &inner.active {
            if active.session_id == session_id {
                return Some(VoxEdgeSession {
                    session_id: active.session_id.to_string(),
                    started_at: active.started_at_iso.clone(),
                    source: active.source,
                    mode_requested: active.mode_requested,
                    language: active.language.clone(),
                    audio_handle: active.audio_handle.to_string(),
                    raw_pcm_persisted: false,
                    state: VoxSessionState::Recording,
                    duration_ms: elapsed_ms(active.started_at_unix_ms),
                    sample_rate: active.sample_rate,
                    channels: active.channels,
                });
            }
        }
        if let Some(f) = inner.finished.get(&session_id) {
            return Some(VoxEdgeSession {
                session_id: f.session_id.to_string(),
                started_at: f.started_at_iso.clone(),
                source: f.source,
                mode_requested: f.mode_requested,
                language: f.language.clone(),
                audio_handle: f.audio_handle.to_string(),
                raw_pcm_persisted: false,
                state: f.state,
                duration_ms: f.duration_ms,
                sample_rate: f.sample_rate,
                channels: f.channels,
            });
        }
        None
    }

    /// Non-consuming live audio level for VAD-style UI. Aggregate stats only:
    /// no raw PCM crosses this boundary.
    pub fn active_audio_level(&self, session_id: Uuid) -> Option<VoxAudioLevel> {
        let inner = self.inner.lock();
        let active = inner.active.as_ref()?;
        if active.session_id != session_id {
            return None;
        }
        let duration_ms = elapsed_ms(active.started_at_unix_ms);
        let level = match &active.recorder {
            Some(recorder) => {
                let window_samples = (active.sample_rate as usize / 5).max(1);
                recorder.recent_level(window_samples)
            }
            None => audio::AudioLevelSnapshot {
                sample_count: 0,
                recent_sample_count: 0,
                rms: 0.0,
                peak: 0.0,
            },
        };
        Some(VoxAudioLevel {
            session_id: active.session_id.to_string(),
            duration_ms,
            sample_count: level.sample_count,
            recent_sample_count: level.recent_sample_count,
            rms: level.rms,
            peak: level.peak,
        })
    }

    fn record_error(&self, msg: &str) {
        let mut inner = self.inner.lock();
        inner.last_error = Some(msg.to_string());
    }
}

pub fn parse_session_id(raw: &str) -> Result<Uuid, VoxEdgeError> {
    Uuid::parse_str(raw).map_err(|_| VoxEdgeError::InvalidUuid(raw.to_string()))
}

fn now_unix_ms_and_iso() -> (u128, String) {
    let now = SystemTime::now();
    let unix_ms = now
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let iso = DateTime::<Utc>::from(now)
        .format("%Y-%m-%dT%H:%M:%S%.3fZ")
        .to_string();
    (unix_ms, iso)
}

fn elapsed_ms(started_unix_ms: u128) -> u64 {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    now.saturating_sub(started_unix_ms) as u64
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ok_request() -> VoxStartSessionRequest {
        VoxStartSessionRequest {
            source: VoxSource::MacEdgeHotkey,
            mode_requested: VoxMode::Dictation,
            language: DEFAULT_LANGUAGE.to_string(),
            consent: VoxConsent {
                audio_capture: true,
                context_share: false,
                debug_keep_audio: false,
            },
        }
    }

    #[test]
    fn lifecycle_start_recording_finish_ready_for_stt() {
        let edge = VoxEdge::new(VoxEdgeConfig::test_disabled());
        let started = edge.start_session(ok_request()).expect("start");
        assert_eq!(started.state, VoxSessionState::Recording);
        assert!(!started.raw_pcm_persisted);

        let session_id = parse_session_id(&started.session_id).unwrap();
        let finished = edge.finish_session(session_id).expect("finish");
        assert_eq!(finished.state, VoxSessionState::ReadyForStt);
        assert!(!finished.raw_pcm_persisted);
        assert_eq!(finished.audio_handle, started.audio_handle);
        assert_eq!(finished.sample_rate, DEFAULT_TEST_SAMPLE_RATE);
        assert_eq!(finished.channels, DEFAULT_TEST_CHANNELS);
    }

    #[test]
    fn cancel_active_session_clears_buffer_and_returns_cancelled() {
        let edge = VoxEdge::new(VoxEdgeConfig::test_disabled());
        let started = edge.start_session(ok_request()).unwrap();
        let id = parse_session_id(&started.session_id).unwrap();
        let cancelled = edge.cancel_session(id).expect("cancel");
        assert_eq!(cancelled.state, VoxSessionState::Cancelled);
        let handle = Uuid::parse_str(&started.audio_handle).unwrap();
        assert!(
            edge.consume_audio_snapshot(handle).is_none(),
            "cancelled session must not yield audio"
        );
    }

    #[test]
    fn finish_then_consume_audio_snapshot_returns_pcm_and_removes_session() {
        let edge = VoxEdge::new(VoxEdgeConfig::test_disabled());
        let started = edge.start_session(ok_request()).unwrap();
        let session_id = parse_session_id(&started.session_id).unwrap();
        edge.finish_session(session_id).unwrap();

        let handle = Uuid::parse_str(&started.audio_handle).unwrap();
        let snap = edge.consume_audio_snapshot(handle).expect("snapshot");
        assert_eq!(snap.session_id, session_id);
        assert_eq!(snap.audio_handle, handle);
        assert_eq!(snap.sample_rate, DEFAULT_TEST_SAMPLE_RATE);
        // Test mode: no real device, samples is empty Vec (honest, not faked)
        assert!(snap.samples.is_empty());
        // Second consume returns None — session removed from memory.
        assert!(edge.consume_audio_snapshot(handle).is_none());
    }

    #[test]
    fn audio_handle_is_unique_across_sessions() {
        let edge = VoxEdge::new(VoxEdgeConfig::test_disabled());
        let a = edge.start_session(ok_request()).unwrap();
        let id_a = parse_session_id(&a.session_id).unwrap();
        edge.finish_session(id_a).unwrap();
        let b = edge.start_session(ok_request()).unwrap();
        assert_ne!(a.audio_handle, b.audio_handle);
        assert_ne!(a.session_id, b.session_id);
    }

    #[test]
    fn raw_pcm_persisted_is_always_false_across_states() {
        let edge = VoxEdge::new(VoxEdgeConfig::test_disabled());
        let started = edge.start_session(ok_request()).unwrap();
        assert!(!started.raw_pcm_persisted);
        let id = parse_session_id(&started.session_id).unwrap();
        let finished = edge.finish_session(id).unwrap();
        assert!(!finished.raw_pcm_persisted);
        let peek = edge.peek_session(id).unwrap();
        assert!(!peek.raw_pcm_persisted);
    }

    #[test]
    fn active_audio_level_exposes_only_aggregate_stats() {
        let edge = VoxEdge::new(VoxEdgeConfig::test_disabled());
        let started = edge.start_session(ok_request()).unwrap();
        let id = parse_session_id(&started.session_id).unwrap();
        let level = edge.active_audio_level(id).expect("level");
        assert_eq!(level.session_id, started.session_id);
        assert_eq!(level.sample_count, 0);
        assert_eq!(level.recent_sample_count, 0);
        assert_eq!(level.rms, 0.0);
        assert_eq!(level.peak, 0.0);

        edge.finish_session(id).unwrap();
        assert!(
            edge.active_audio_level(id).is_none(),
            "level probe only applies to active recordings"
        );
    }

    #[test]
    fn eclipse_clears_active_session_and_all_finished_buffers() {
        let edge = VoxEdge::new(VoxEdgeConfig::test_disabled());
        // one finished session
        let a = edge.start_session(ok_request()).unwrap();
        let id_a = parse_session_id(&a.session_id).unwrap();
        edge.finish_session(id_a).unwrap();
        // one active session
        let b = edge.start_session(ok_request()).unwrap();
        let handle_a = Uuid::parse_str(&a.audio_handle).unwrap();
        let handle_b = Uuid::parse_str(&b.audio_handle).unwrap();

        let touched = edge.eclipse();
        assert_eq!(touched, 2, "eclipse should touch active + finished");
        assert!(edge.consume_audio_snapshot(handle_a).is_none());
        assert!(edge.consume_audio_snapshot(handle_b).is_none());
        assert!(edge.status().active_session_id.is_none());
    }

    #[test]
    fn start_session_rejects_when_audio_capture_consent_false() {
        let edge = VoxEdge::new(VoxEdgeConfig::test_disabled());
        let mut req = ok_request();
        req.consent.audio_capture = false;
        let err = edge.start_session(req).unwrap_err();
        assert!(matches!(err, VoxEdgeError::ConsentBlocked));
        assert!(edge.status().last_error.is_some());
    }

    #[test]
    fn start_session_rejects_debug_keep_audio() {
        let edge = VoxEdge::new(VoxEdgeConfig::test_disabled());
        let mut req = ok_request();
        req.consent.debug_keep_audio = true;
        let err = edge.start_session(req).unwrap_err();
        assert!(matches!(err, VoxEdgeError::DebugKeepAudioForbidden));
    }

    #[test]
    fn start_session_rejects_non_pt_br_language() {
        let edge = VoxEdge::new(VoxEdgeConfig::test_disabled());
        let mut req = ok_request();
        req.language = "en-US".to_string();
        let err = edge.start_session(req).unwrap_err();
        assert!(matches!(err, VoxEdgeError::LanguageNotSupported(_)));
    }

    #[test]
    fn cannot_start_two_active_sessions() {
        let edge = VoxEdge::new(VoxEdgeConfig::test_disabled());
        let _a = edge.start_session(ok_request()).unwrap();
        let err = edge.start_session(ok_request()).unwrap_err();
        assert!(matches!(err, VoxEdgeError::AlreadyActive(_)));
    }

    #[test]
    fn finish_with_wrong_id_returns_not_found_and_keeps_active() {
        let edge = VoxEdge::new(VoxEdgeConfig::test_disabled());
        let started = edge.start_session(ok_request()).unwrap();
        let bogus = Uuid::new_v4();
        let err = edge.finish_session(bogus).unwrap_err();
        assert!(matches!(err, VoxEdgeError::NotFound(_)));
        // Original session must still be active and recoverable.
        let id = parse_session_id(&started.session_id).unwrap();
        let peek = edge.peek_session(id).unwrap();
        assert_eq!(peek.state, VoxSessionState::Recording);
    }

    #[test]
    fn status_reports_hotkey_pending_capability_in_onda_1() {
        let edge = VoxEdge::new(VoxEdgeConfig::test_disabled());
        let st = edge.status();
        assert!(!st.hotkey_available);
        assert!(st
            .pending_capabilities
            .iter()
            .any(|c| c.contains("global_hotkey")));
        assert_eq!(st.permissions.microphone, "not_checked");
    }
}
