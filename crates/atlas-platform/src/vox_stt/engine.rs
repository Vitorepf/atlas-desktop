//! STT engine boundary for Atlas Vox.
//!
//! Wave 6.6 (Claude M): real whisper.cpp transcription on macOS via
//! `whisper-rs` (Metal backend). The engine lazy-loads `ggml-large-v3.bin`
//! from `~/.atlas/vox/models/` on first transcribe; subsequent calls reuse
//! the loaded context. PCM is converted to 16 kHz mono before the call.
//! Personal-dictionary terms are passed as the initial prompt so whisper
//! biases toward Atlas vocabulary (Codex, LiveKit, Tauri, ...). Post-
//! correction still runs over the raw output to enforce canonical casing.
//!
//! Honesty contract:
//!   - If the model file is missing → `SttError::ModelMissingOrEngineUnavailable`.
//!   - If `whisper-rs` is not linked in this build (non-macOS) →
//!     same error with the engine-binding-pending next action.
//!   - If `whisper-rs` fails to load the model or run inference →
//!     `SttError::ModelMissingOrEngineUnavailable` with the underlying
//!     message. We never fabricate text.
//!   - PCM is consumed and dropped at the end of the call. Nothing is
//!     persisted. `raw_pcm_persisted` on the resulting transcript is
//!     ALWAYS `false`.

use std::path::Path;
use std::sync::Arc;

use parking_lot::Mutex;
use serde::Serialize;

#[cfg(all(target_os = "macos", feature = "whisper-cpp"))]
use super::audio_prep;
use super::dictionary::PersonalDictionary;
use super::model_store::{ModelStatus, ModelStore};
use super::post_correction;
#[cfg(all(target_os = "macos", feature = "whisper-cpp"))]
use super::types::DEFAULT_LANGUAGE;
use super::types::{LatencyMs, NoiseSignals, VoxSttInput, VoxTranscript, DEFAULT_ENGINE};

const WHISPER_SAMPLE_RATE_HZ: u32 = 16_000;
const MIN_SPEECH_DURATION_MS: u64 = 700;
const MIN_SPEECH_RMS: f32 = 0.0025;
const MIN_SPEECH_PEAK: f32 = 0.015;
const ACTIVE_SAMPLE_THRESHOLD: f32 = 0.010;
const MIN_ACTIVE_RATIO: f32 = 0.015;

#[derive(Debug, thiserror::Error, Serialize)]
#[serde(tag = "code", rename_all = "snake_case")]
pub enum SttError {
    /// Either the whisper.cpp model file is not present at
    /// `~/.atlas/vox/models/`, or the binding to whisper.cpp has not been
    /// compiled into this build yet (non-macOS targets), or the binding
    /// loaded the file but rejected it (corruption, wrong arch). No fake
    /// transcript is ever returned.
    #[error("model missing or engine unavailable: {message}")]
    ModelMissingOrEngineUnavailable {
        message: String,
        status: ModelStatus,
    },
    /// Reserved for capture-side failures the engine cannot recover from
    /// (zero audio, malformed PCM, eclipse aborted capture mid-way, etc.).
    #[error("audio input invalid: {0}")]
    AudioInputInvalid(String),
}

pub trait SttEngine: Send + Sync {
    fn engine_id(&self) -> &str;
    fn model_status(&self) -> ModelStatus;
    fn transcribe(
        &self,
        input: &VoxSttInput,
        dictionary: &PersonalDictionary,
    ) -> Result<VoxTranscript, SttError>;
}

/// Real whisper.cpp engine.
///
/// macOS: backed by `whisper-rs` 0.14 with the `metal` feature. The Metal
/// backend keeps the GPU warm so a second short utterance reuses kernels.
///
/// Other platforms: compiles, but `transcribe()` returns
/// `ModelMissingOrEngineUnavailable` because the dep is cfg-gated to
/// macOS — that's the honest state.
pub struct WhisperCppEngine {
    model_store: Arc<ModelStore>,
    engine_id: String,
    #[cfg(all(target_os = "macos", feature = "whisper-cpp"))]
    ctx: Mutex<Option<Arc<whisper_rs::WhisperContext>>>,
    // Keep the field present on other builds so the struct layout stays
    // stable without a flood of cfg() at use-sites.
    #[cfg(not(all(target_os = "macos", feature = "whisper-cpp")))]
    _ctx: Mutex<Option<()>>,
}

impl WhisperCppEngine {
    pub fn with_home_dir(home: &Path) -> Self {
        Self {
            model_store: Arc::new(ModelStore::with_home_dir(home)),
            engine_id: DEFAULT_ENGINE.to_string(),
            #[cfg(all(target_os = "macos", feature = "whisper-cpp"))]
            ctx: Mutex::new(None),
            #[cfg(not(all(target_os = "macos", feature = "whisper-cpp")))]
            _ctx: Mutex::new(None),
        }
    }

    pub fn with_root(root: &Path) -> Self {
        Self {
            model_store: Arc::new(ModelStore::with_root(root)),
            engine_id: DEFAULT_ENGINE.to_string(),
            #[cfg(all(target_os = "macos", feature = "whisper-cpp"))]
            ctx: Mutex::new(None),
            #[cfg(not(all(target_os = "macos", feature = "whisper-cpp")))]
            _ctx: Mutex::new(None),
        }
    }

    fn unavailable(&self, message: String) -> SttError {
        SttError::ModelMissingOrEngineUnavailable {
            message,
            status: self.model_store.status(),
        }
    }
}

impl SttEngine for WhisperCppEngine {
    fn engine_id(&self) -> &str {
        &self.engine_id
    }

    fn model_status(&self) -> ModelStatus {
        self.model_store.status()
    }

    #[cfg(all(target_os = "macos", feature = "whisper-cpp"))]
    fn transcribe(
        &self,
        input: &VoxSttInput,
        dictionary: &PersonalDictionary,
    ) -> Result<VoxTranscript, SttError> {
        use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

        // Model presence check before we touch whisper-rs — keeps the
        // structured nextAction in the error.
        let model_path = self.model_store.status().model_path;
        if !std::path::Path::new(&model_path).is_file() {
            return Err(self.unavailable(format!(
                "Modelo whisper.cpp não encontrado em {model_path}. Baixe ggml-large-v3.bin e salve em ~/.atlas/vox/models/.",
            )));
        }

        if input.pcm_f32.is_empty() {
            return Err(SttError::AudioInputInvalid(
                "captured PCM buffer is empty".to_string(),
            ));
        }

        // Lazy-load the context once per engine instance.
        let ctx = {
            let mut guard = self.ctx.lock();
            if guard.is_none() {
                let cparams = WhisperContextParameters::default();
                let ctx = WhisperContext::new_with_params(&model_path, cparams)
                    .map_err(|e| self.unavailable(format!("whisper context load failed: {e}")))?;
                *guard = Some(Arc::new(ctx));
            }
            // Clone the Arc out so we don't hold the lock across inference.
            guard.as_ref().expect("ctx populated above").clone()
        };

        // Convert capture PCM (whatever rate/channels cpal handed us) to
        // 16 kHz mono. No-op when already in the right shape.
        let prep_start = std::time::Instant::now();
        let pcm =
            audio_prep::to_whisper_input(&input.pcm_f32, input.sample_rate, input.channels);
        let prep_ms = prep_start.elapsed().as_millis() as u64;
        if pcm.is_empty() {
            return Err(SttError::AudioInputInvalid(
                "audio prep produced zero samples".to_string(),
            ));
        }
        let quality = analyze_audio_quality(&pcm, WHISPER_SAMPLE_RATE_HZ);
        if !quality.has_speech() {
            return Err(SttError::AudioInputInvalid(format!(
                "não ouvi fala suficiente para registrar transcript \
                 (duration={}ms, rms={:.5}, peak={:.5}, active_ratio={:.3}). \
                 Tente de novo falando um pouco mais perto do microfone.",
                quality.duration_ms, quality.rms, quality.peak, quality.active_ratio
            )));
        }

        // Run inference.
        let stt_start = std::time::Instant::now();
        let mut state = ctx
            .create_state()
            .map_err(|e| self.unavailable(format!("whisper state create failed: {e}")))?;

        let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
        params.set_language(Some(whisper_language_code(DEFAULT_LANGUAGE)));
        params.set_translate(false);
        params.set_print_special(false);
        params.set_print_progress(false);
        params.set_print_realtime(false);
        params.set_print_timestamps(false);
        params.set_suppress_blank(true);
        params.set_no_context(true);
        params.set_single_segment(false);

        let preferred = dictionary.preferred_terms();
        let prompt_bias = build_prompt_bias(&preferred);
        if let Some(ref bias) = prompt_bias {
            params.set_initial_prompt(bias);
        }

        state
            .full(params, &pcm)
            .map_err(|e| self.unavailable(format!("whisper inference failed: {e}")))?;

        let num_segments = state
            .full_n_segments()
            .map_err(|e| self.unavailable(format!("whisper segment count failed: {e}")))?;

        let mut raw_text = String::new();
        let mut words = Vec::new();
        for i in 0..num_segments {
            let segment = state
                .full_get_segment_text(i)
                .map_err(|e| self.unavailable(format!("whisper segment text failed: {e}")))?;
            // whisper.cpp returns timestamps in 10ms units (centiseconds).
            let t_start = state.full_get_segment_t0(i).unwrap_or(0) as f32 / 100.0;
            let t_end = state.full_get_segment_t1(i).unwrap_or(0) as f32 / 100.0;
            // Trim leading whitespace whisper inserts between segments.
            let trimmed = segment.trim();
            if !trimmed.is_empty() {
                if !raw_text.is_empty() {
                    raw_text.push(' ');
                }
                raw_text.push_str(trimmed);
                words.push(super::types::WordToken {
                    w: trimmed.to_string(),
                    t_start,
                    t_end,
                    conf: 1.0, // whisper.cpp does not surface per-word confidence in V0
                });
            }
        }

        let stt_ms = stt_start.elapsed().as_millis() as u64;
        let raw_text = raw_text.trim().to_string();
        if raw_text.is_empty() {
            return Err(SttError::AudioInputInvalid(
                "whisper returned no segments (silent or unintelligible audio)".to_string(),
            ));
        }

        // Apply personal-dictionary post-correction.
        let pc_start = std::time::Instant::now();
        let pc = post_correction::apply(&raw_text, dictionary);
        let pc_ms = pc_start.elapsed().as_millis() as u64;

        let latency = LatencyMs {
            capture_to_stt_start: input.capture_to_stt_start_ms + prep_ms,
            stt_processing: stt_ms,
            correction_pass: pc_ms,
            total: input.capture_to_stt_start_ms + prep_ms + stt_ms + pc_ms,
        };

        // Confidence estimate: whisper.cpp doesn't expose a clean per-call
        // confidence in this binding. Report `nan-protected` 0.85 as a
        // deterministic placeholder so the contract stays in [0,1]; a real
        // confidence model is part of a later wave.
        let confidence = 0.85f32;

        let mut transcript = VoxTranscript::new(
            input.session_id,
            input.audio_handle,
            DEFAULT_ENGINE,
            raw_text,
            pc.text,
            confidence,
            words,
            preferred,
            pc.corrections,
            latency,
        );
        transcript.noise_signals = Some(quality.noise_signals());
        Ok(transcript)
    }

    #[cfg(not(all(target_os = "macos", feature = "whisper-cpp")))]
    fn transcribe(
        &self,
        _input: &VoxSttInput,
        _dictionary: &PersonalDictionary,
    ) -> Result<VoxTranscript, SttError> {
        Err(self.unavailable(
            "whisper.cpp binding is not compiled into this build. \
             On macOS: `brew install cmake` then rebuild with \
             `--features whisper-cpp` to enable real transcription."
                .to_string(),
        ))
    }
}

#[derive(Debug, Clone, Copy)]
struct AudioQuality {
    duration_ms: u64,
    rms: f32,
    peak: f32,
    active_ratio: f32,
    vad_segments: u32,
}

impl AudioQuality {
    fn has_speech(&self) -> bool {
        self.duration_ms >= MIN_SPEECH_DURATION_MS
            && self.rms >= MIN_SPEECH_RMS
            && self.peak >= MIN_SPEECH_PEAK
            && self.active_ratio >= MIN_ACTIVE_RATIO
    }

    fn noise_signals(&self) -> NoiseSignals {
        let silence_ratio = (1.0 - self.active_ratio).clamp(0.0, 1.0);
        let snr_estimate_db = if self.rms > 0.0 {
            (20.0 * (self.rms / MIN_SPEECH_RMS).log10()).max(0.0)
        } else {
            0.0
        };
        NoiseSignals {
            silence_ratio,
            snr_estimate_db,
            vad_segments: self.vad_segments,
        }
    }
}

fn analyze_audio_quality(samples: &[f32], sample_rate: u32) -> AudioQuality {
    if samples.is_empty() || sample_rate == 0 {
        return AudioQuality {
            duration_ms: 0,
            rms: 0.0,
            peak: 0.0,
            active_ratio: 0.0,
            vad_segments: 0,
        };
    }

    let mut sum_sq = 0.0f64;
    let mut peak = 0.0f32;
    let mut active = 0usize;
    let mut vad_segments = 0u32;
    let mut in_segment = false;

    for sample in samples {
        let amp = sample.abs();
        sum_sq += (amp as f64) * (amp as f64);
        peak = peak.max(amp);
        let is_active = amp >= ACTIVE_SAMPLE_THRESHOLD;
        if is_active {
            active += 1;
            if !in_segment {
                vad_segments += 1;
                in_segment = true;
            }
        } else {
            in_segment = false;
        }
    }

    let rms = (sum_sq / samples.len() as f64).sqrt() as f32;
    let active_ratio = active as f32 / samples.len() as f32;
    let duration_ms = (samples.len() as u64 * 1000) / sample_rate as u64;

    AudioQuality {
        duration_ms,
        rms,
        peak,
        active_ratio,
        vad_segments,
    }
}

/// Compose a short initial-prompt biasing string from the operator's
/// personal dictionary. Whisper accepts a free-form prompt and biases the
/// decoder toward the terms it contains, which improves the casing/spelling
/// of proper nouns like "Codex", "LiveKit", "Tauri" before our post-correction
/// pass runs. Returns `None` when there are no preferred terms.
#[cfg_attr(
    not(all(target_os = "macos", feature = "whisper-cpp")),
    allow(dead_code)
)]
fn build_prompt_bias(preferred: &[String]) -> Option<String> {
    if preferred.is_empty() {
        return None;
    }
    let joined = preferred.join(", ");
    // Keep it short — whisper has a small context window for the prompt.
    let bias = if joined.len() > 240 {
        joined.chars().take(240).collect::<String>()
    } else {
        joined
    };
    Some(format!("Glossário Atlas: {bias}."))
}

#[cfg_attr(
    not(all(target_os = "macos", feature = "whisper-cpp")),
    allow(dead_code)
)]
fn whisper_language_code(atlas_language: &str) -> &str {
    // Atlas contracts expose regional tags such as `pt-BR`; whisper.cpp
    // expects the base ISO 639-1 language code (`pt`). Keep the public
    // transcript contract as pt-BR and normalize only at the engine boundary.
    atlas_language
        .split(['-', '_'])
        .next()
        .filter(|code| !code.is_empty())
        .unwrap_or("pt")
}

/// Pure debug/fixture pipeline: runs only the dictionary + post-correction
/// stage over a string the caller already has. Used by the Tauri debug
/// command and by tests to exercise the rest of the pipeline without an
/// audio engine. Returns a real `VoxTranscript` with empty `words`,
/// `confidence = 0.0`, and the real correction trail. This is honest: the
/// transcript carries `text_raw` exactly as the caller supplied it and
/// `text` after dictionary rewrite.
pub fn run_text_pipeline(
    input: &VoxSttInput,
    raw_text: &str,
    dictionary: &PersonalDictionary,
) -> VoxTranscript {
    let pc_start = std::time::Instant::now();
    let result = post_correction::apply(raw_text, dictionary);
    let pc_ms = pc_start.elapsed().as_millis() as u64;

    let latency = LatencyMs {
        capture_to_stt_start: input.capture_to_stt_start_ms,
        stt_processing: 0,
        correction_pass: pc_ms,
        total: input.capture_to_stt_start_ms + pc_ms,
    };

    VoxTranscript::new(
        input.session_id,
        input.audio_handle,
        DEFAULT_ENGINE,
        raw_text.to_string(),
        result.text,
        0.0,
        Vec::new(),
        dictionary.preferred_terms(),
        result.corrections,
        latency,
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::vox_stt::dictionary::PersonalDictionary;
    use tempfile::tempdir;
    use uuid::Uuid;

    #[test]
    fn engine_refuses_to_fabricate_transcript_when_unavailable() {
        let tmp = tempdir().unwrap();
        let engine = WhisperCppEngine::with_root(tmp.path());
        let dict = PersonalDictionary::pre_populated();
        let input = VoxSttInput::empty(Uuid::nil(), Uuid::nil());

        let err = engine.transcribe(&input, &dict).unwrap_err();
        match err {
            SttError::ModelMissingOrEngineUnavailable { status, .. } => {
                assert!(!status.engine_available);
                assert_eq!(status.model_id, "whisper.cpp@large-v3");
            }
            SttError::AudioInputInvalid(_) => {
                panic!("expected ModelMissingOrEngineUnavailable for empty input + missing model")
            }
        }
    }

    #[test]
    fn engine_error_serializes_with_code_tag() {
        let tmp = tempdir().unwrap();
        let engine = WhisperCppEngine::with_root(tmp.path());
        let dict = PersonalDictionary::pre_populated();
        let input = VoxSttInput::empty(Uuid::nil(), Uuid::nil());
        let err = engine.transcribe(&input, &dict).unwrap_err();
        let v = serde_json::to_value(&err).unwrap();
        assert_eq!(v["code"], "model_missing_or_engine_unavailable");
        assert!(v["status"]["modelId"].as_str().is_some());
    }

    #[test]
    fn build_prompt_bias_returns_none_for_empty_terms() {
        assert!(build_prompt_bias(&[]).is_none());
    }

    #[test]
    fn build_prompt_bias_joins_and_caps_at_240_chars() {
        let terms: Vec<String> = (0..50).map(|i| format!("Termo{i}")).collect();
        let bias = build_prompt_bias(&terms).unwrap();
        assert!(bias.starts_with("Glossário Atlas: "));
        assert!(bias.len() <= 240 + "Glossário Atlas: .".len() + 16);
    }

    #[test]
    fn whisper_language_code_strips_region_for_whisper_cpp() {
        assert_eq!(whisper_language_code("pt-BR"), "pt");
        assert_eq!(whisper_language_code("pt_BR"), "pt");
        assert_eq!(whisper_language_code("en"), "en");
        assert_eq!(whisper_language_code(""), "pt");
    }

    #[test]
    fn audio_quality_rejects_silence_before_whisper_can_hallucinate() {
        let quality = analyze_audio_quality(&vec![0.0; 16_000], 16_000);
        assert!(!quality.has_speech());
        assert_eq!(quality.duration_ms, 1000);
        assert_eq!(quality.rms, 0.0);
        assert_eq!(quality.peak, 0.0);
    }

    #[test]
    fn audio_quality_accepts_clear_voice_like_signal() {
        let samples: Vec<f32> = (0..32_000)
            .map(|i| if i % 32 < 12 { 0.035 } else { 0.0 })
            .collect();
        let quality = analyze_audio_quality(&samples, 16_000);
        assert!(quality.has_speech());
        assert!(quality.rms >= MIN_SPEECH_RMS);
        assert!(quality.peak >= MIN_SPEECH_PEAK);
        assert!(quality.active_ratio >= MIN_ACTIVE_RATIO);
        assert!(quality.noise_signals().silence_ratio < 1.0);
    }

    #[test]
    fn text_pipeline_emits_transcript_with_corrections_and_raw_pcm_false() {
        let dict = PersonalDictionary::pre_populated();
        let input = VoxSttInput::empty(Uuid::new_v4(), Uuid::new_v4());
        let transcript = run_text_pipeline(&input, "manda pro código olhar o live kit", &dict);

        assert!(transcript.text.contains("Codex"));
        assert!(transcript.text.contains("LiveKit"));
        assert_eq!(transcript.text_raw, "manda pro código olhar o live kit");
        assert!(!transcript.raw_pcm_persisted);
        assert_eq!(transcript.engine, "whisper.cpp@large-v3");
        assert_eq!(transcript.language, "pt-BR");
        assert!(transcript
            .post_corrections
            .iter()
            .any(|c| c.to == "Codex" && c.rule == "personal_dictionary"));
        assert!(transcript
            .post_corrections
            .iter()
            .any(|c| c.to == "LiveKit" && c.rule == "personal_dictionary"));
    }

    /// Smoke test for the real whisper.cpp binding. Skipped by default;
    /// the operator runs it manually on a machine that has the model file
    /// present at `~/.atlas/vox/models/ggml-large-v3.bin`. Invoke with:
    ///
    ///     cargo test -p atlas-platform -- --ignored vox_real_whisper_smoke
    ///
    /// The test does not assert text content — it only verifies that the
    /// engine loads the model, accepts a short silent buffer, and either
    /// produces a transcript object or returns a structured error. We
    /// never assert "we transcribed Portuguese" because the contents are
    /// up to the operator.
    #[test]
    #[ignore = "requires ~/.atlas/vox/models/ggml-large-v3.bin and `--features whisper-cpp`"]
    #[cfg(all(target_os = "macos", feature = "whisper-cpp"))]
    fn vox_real_whisper_smoke() {
        let home = std::env::var_os("HOME").expect("HOME required");
        let engine = WhisperCppEngine::with_home_dir(std::path::Path::new(&home));
        let dict = PersonalDictionary::pre_populated();
        // Half a second of silence — engine should NOT fabricate text.
        let mut input = VoxSttInput::empty(Uuid::new_v4(), Uuid::new_v4());
        input.sample_rate = 16_000;
        input.channels = 1;
        input.pcm_f32 = vec![0.0f32; 8_000];

        let result = engine.transcribe(&input, &dict);
        match result {
            Err(SttError::AudioInputInvalid(_)) => {}
            Err(SttError::ModelMissingOrEngineUnavailable { status, .. }) => {
                // Operator hasn't installed the model — test is a no-op.
                assert!(!status.engine_available);
            }
            Ok(t) => panic!("silent audio must not produce transcript: {}", t.text),
        }
    }
}
