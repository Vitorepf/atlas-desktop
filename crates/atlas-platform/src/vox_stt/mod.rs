//! Atlas Vox · local STT + personal dictionary (Onda 1 / Claude B).
//!
//! Scope:
//!   - VoxTranscript.v1 serializable struct (contract canon).
//!   - Personal dictionary stored at `~/.atlas/vox/dictionary.json`,
//!     pre-populated with Atlas vocabulary on first run.
//!   - Post-correction pass that rewrites variants -> preferred and records
//!     the audit trail.
//!   - Model store that locates `~/.atlas/vox/models/ggml-large-v3.bin` and
//!     reports honestly when missing.
//!   - SttEngine trait + `WhisperCppEngine` placeholder that refuses to
//!     fabricate transcripts until the real whisper.cpp binding is wired in.
//!
//! Not in scope (owned by other Claudes / future waves):
//!   - Global hotkey, audio capture, PTT session lifecycle (Claude A).
//!   - VoxOverlay UI (Onda 3).
//!   - Kernel Vox, VoxCompiler, Prompt Compiler (Onda 2+).
//!   - Codex/Claude executors, terminal, mobile, Voice Realtime.
//!
//! Storage layout:
//!   - `~/.atlas/vox/dictionary.json` — runtime-local, never repo-tracked.
//!   - `~/.atlas/vox/models/ggml-large-v3.bin` — manually placed by operator.
//!   - No PCM is ever persisted in this wave.

pub mod audio_prep;
pub mod benchmark;
pub mod dictionary;
pub mod engine;
pub mod model_store;
pub mod post_correction;
pub mod types;

pub use audio_prep::{to_whisper_input, WHISPER_TARGET_SAMPLE_RATE};
pub use benchmark::{
    compute_dictionary_hit_rate, compute_wer, AudioOrigin, BenchmarkOutcome, DictionaryHitRate,
    EngineAvailability, EngineId, EngineMeans, EngineRegistry, EngineRegistryEntry, EngineSet,
    VoxSttBenchmarkAggregate, VoxSttBenchmarkEngineResult, VoxSttBenchmarkReport,
    VoxSttBenchmarkRunner, VoxSttBenchmarkSample, VoxSttBenchmarkSampleReport, WerScore,
    BENCHMARK_SAMPLE_SCHEMA, BENCHMARK_SCHEMA, DEFAULT_BENCHMARK_RELATIVE_DIR,
};
pub use dictionary::{
    DictionaryEntry, DictionaryError, DictionaryStore, PersonalDictionary, DEFAULT_RELATIVE_PATH,
};
pub use engine::{run_text_pipeline, SttEngine, SttError, WhisperCppEngine};
pub use model_store::{ModelStatus, ModelStore, NextAction, DEFAULT_MODEL_FILENAME};
pub use post_correction::{apply as apply_post_correction, PostCorrectionOutput};
pub use types::{
    EclipseCheck, LatencyMs, NoiseSignals, PostCorrection, VoxSttInput, VoxTranscript, WordToken,
    DEFAULT_ENGINE, DEFAULT_LANGUAGE, DICTIONARY_SCHEMA, TRANSCRIPT_SCHEMA,
};

/// Resolves `~/.atlas/vox/` from the `HOME` env var, falling back to `.`
/// when HOME is absent (CI, ephemeral sandboxes). Production code should
/// always have HOME set; this fallback exists only so the binary doesn't
/// panic at startup. Tests must pass an explicit root via
/// [`DictionaryStore::with_root`] / [`ModelStore::with_root`].
pub fn default_atlas_vox_home() -> std::path::PathBuf {
    if let Some(home) = std::env::var_os("HOME") {
        std::path::PathBuf::from(home)
    } else {
        std::path::PathBuf::from(".")
    }
}
