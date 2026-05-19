//! Atlas Vox local STT benchmark harness (Wave 7.5 / Claude Q).
//!
//! Goal: measure whether the current engine (`whisper.cpp@large-v3`) is
//! really the best **local** option for Vitor + PT-BR + sotaque goiano.
//! The harness is informational only — it never trades engines silently.
//! V0 (default) stays in place; promotions happen by hand after Vitor
//! reads the report (`atlas.vox.stt_benchmark.v1`).
//!
//! Hard rules:
//!   - No network, no cloud, no API.
//!   - Models are NEVER downloaded automatically. Missing model =
//!     `EngineAvailability::Unavailable` with a structured reason.
//!   - Raw audio is NEVER persisted unless `explicit_benchmark_audio_consent=true`
//!     AND the operator explicitly opted in for this sample. The default
//!     path stores only `expected_text` + transcript fixtures.
//!   - MLX Whisper stays `Unavailable` in 7.5: PyTorch/MLX stack is not
//!     present and this wave does not install it. Honest.
//!
//! The benchmark runs in two modes:
//!   - **text-fixture**: tests post-correction + dictionary hit-rate over
//!     a transcript supplied by the operator. No audio, no engine call.
//!     Always available, useful for CI.
//!   - **audio-real**: feeds PCM through `SttEngine::transcribe`, only
//!     reachable in macOS + `whisper-cpp` feature builds with a real
//!     model file present.

use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Instant;

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::dictionary::PersonalDictionary;
use super::engine::{SttEngine, SttError, WhisperCppEngine};
use super::post_correction;
use super::types::{VoxSttInput, VoxTranscript, DEFAULT_LANGUAGE};

pub const BENCHMARK_SCHEMA: &str = "atlas.vox.stt_benchmark.v1";
pub const BENCHMARK_SAMPLE_SCHEMA: &str = "atlas.vox.stt_benchmark_sample.v1";
pub const DEFAULT_BENCHMARK_RELATIVE_DIR: &str = ".atlas/vox/benchmark";

/// One benchmark sample (an expected transcript with optional in-memory
/// PCM). The Tauri layer is responsible for translating UUIDs and disk
/// paths; this struct stays pure.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VoxSttBenchmarkSample {
    pub sample_id: Uuid,
    pub label: String,
    pub language: String,
    pub expected_text: String,
    /// `true` only if the operator explicitly consented to persist the
    /// PCM bytes alongside this sample. Default = false. The runner
    /// honours this when serialising to disk; in-memory PCM for the
    /// duration of a single `run()` call is permitted regardless.
    pub explicit_benchmark_audio_consent: bool,
    pub captured_sample_rate: u32,
    pub captured_channels: u16,
    #[serde(skip_serializing, skip_deserializing)]
    pub pcm_f32: Vec<f32>,
    /// Tag of where the audio came from. `none` for text-only fixtures.
    pub audio_origin: AudioOrigin,
    pub created_at: String,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AudioOrigin {
    /// Operator supplied a transcript-only fixture; no PCM in this run.
    None,
    /// PCM came from a real Vox session the operator opted into for
    /// benchmark use. Subject to `explicit_benchmark_audio_consent`.
    MacEdgeSessionOptIn,
    /// PCM was loaded from disk (the operator placed a `.wav`/`.pcm`
    /// fixture in `~/.atlas/vox/benchmark/audio/`).
    LocalFileOptIn,
}

impl VoxSttBenchmarkSample {
    pub fn text_fixture(label: impl Into<String>, expected_text: impl Into<String>) -> Self {
        Self {
            sample_id: Uuid::new_v4(),
            label: label.into(),
            language: DEFAULT_LANGUAGE.to_string(),
            expected_text: expected_text.into(),
            explicit_benchmark_audio_consent: false,
            captured_sample_rate: 0,
            captured_channels: 0,
            pcm_f32: Vec::new(),
            audio_origin: AudioOrigin::None,
            created_at: chrono::Utc::now().to_rfc3339(),
        }
    }

    pub fn has_audio(&self) -> bool {
        !self.pcm_f32.is_empty()
    }
}

/// Canonical engine ids for the benchmark registry. Strings match what
/// the transcript surface emits in `engine`. Adding a new candidate
/// requires adding an entry here AND wiring `EngineRegistry::probe()`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EngineId {
    WhisperCppLargeV3,
    WhisperCppLargeV3Turbo,
    MlxLargeV3,
}

impl EngineId {
    pub fn label(&self) -> &'static str {
        match self {
            EngineId::WhisperCppLargeV3 => "whisper.cpp@large-v3",
            EngineId::WhisperCppLargeV3Turbo => "whisper.cpp@large-v3-turbo",
            EngineId::MlxLargeV3 => "mlx-whisper@large-v3",
        }
    }

    pub fn model_filename(&self) -> Option<&'static str> {
        match self {
            EngineId::WhisperCppLargeV3 => Some("ggml-large-v3.bin"),
            EngineId::WhisperCppLargeV3Turbo => Some("ggml-large-v3-turbo.bin"),
            // MLX uses a different layout under ~/.mlx-models/; we do
            // not introspect it in 7.5. Stays `None` → unavailable.
            EngineId::MlxLargeV3 => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", tag = "state")]
pub enum EngineAvailability {
    Available { model_path: String },
    Unavailable { reason: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EngineRegistryEntry {
    pub engine_id: EngineId,
    pub label: String,
    pub availability: EngineAvailability,
}

/// Probes the local filesystem + build features and reports honestly
/// which engines can be invoked. Never loads a model; that happens lazily
/// when the runner actually transcribes.
pub struct EngineRegistry {
    home: PathBuf,
}

impl EngineRegistry {
    pub fn with_home_dir(home: &Path) -> Self {
        Self {
            home: home.to_path_buf(),
        }
    }

    pub fn entries(&self) -> Vec<EngineRegistryEntry> {
        vec![
            self.probe(EngineId::WhisperCppLargeV3),
            self.probe(EngineId::WhisperCppLargeV3Turbo),
            self.probe(EngineId::MlxLargeV3),
        ]
    }

    fn probe(&self, id: EngineId) -> EngineRegistryEntry {
        let label = id.label().to_string();
        let availability = match id {
            EngineId::WhisperCppLargeV3 | EngineId::WhisperCppLargeV3Turbo => {
                self.probe_whisper_cpp(id)
            }
            EngineId::MlxLargeV3 => EngineAvailability::Unavailable {
                reason: "mlx_whisper_stack_not_present_in_wave_7_5".to_string(),
            },
        };
        EngineRegistryEntry {
            engine_id: id,
            label,
            availability,
        }
    }

    fn probe_whisper_cpp(&self, id: EngineId) -> EngineAvailability {
        if !cfg!(all(target_os = "macos", feature = "whisper-cpp")) {
            return EngineAvailability::Unavailable {
                reason: "whisper_cpp_binding_not_compiled_into_this_build".to_string(),
            };
        }
        let Some(filename) = id.model_filename() else {
            return EngineAvailability::Unavailable {
                reason: "engine_has_no_model_filename".to_string(),
            };
        };
        let models_dir = self.home.join(".atlas/vox/models");
        let path = models_dir.join(filename);
        if path.is_file() {
            EngineAvailability::Available {
                model_path: path.display().to_string(),
            }
        } else {
            EngineAvailability::Unavailable {
                reason: format!("model_missing_at_{}", path.display()),
            }
        }
    }
}

/// Word Error Rate calculator. Pure, deterministic, unit-tested.
///
/// Normalisation:
///   - Lowercase via `to_lowercase` (locale-independent).
///   - Strip common punctuation (`.`, `,`, `;`, `:`, `!`, `?`, `…`, `"`, `'`).
///   - Collapse whitespace.
///
/// Then a word-level Levenshtein over the resulting token streams.
/// `wer = edits / max(reference.len(), 1)`.
pub fn compute_wer(reference: &str, hypothesis: &str) -> WerScore {
    let ref_tokens = normalise_tokens(reference);
    let hyp_tokens = normalise_tokens(hypothesis);
    let edits = levenshtein(&ref_tokens, &hyp_tokens);
    let ref_len = ref_tokens.len();
    let wer = if ref_len == 0 {
        if hyp_tokens.is_empty() {
            0.0
        } else {
            // Reference empty, hypothesis non-empty: every hypothesis
            // word is an insertion. WER >1 by classical definition.
            hyp_tokens.len() as f32
        }
    } else {
        edits as f32 / ref_len as f32
    };
    WerScore {
        wer,
        reference_words: ref_len,
        hypothesis_words: hyp_tokens.len(),
        edits,
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WerScore {
    pub wer: f32,
    pub reference_words: usize,
    pub hypothesis_words: usize,
    pub edits: usize,
}

fn normalise_tokens(text: &str) -> Vec<String> {
    let lower = text.to_lowercase();
    let cleaned: String = lower
        .chars()
        .map(|c| {
            if matches!(c, '.' | ',' | ';' | ':' | '!' | '?' | '"' | '\'' | '…' | '(' | ')' | '[' | ']') {
                ' '
            } else {
                c
            }
        })
        .collect();
    cleaned
        .split_whitespace()
        .map(|s| s.to_string())
        .collect()
}

fn levenshtein(a: &[String], b: &[String]) -> usize {
    let m = a.len();
    let n = b.len();
    if m == 0 {
        return n;
    }
    if n == 0 {
        return m;
    }
    let mut prev: Vec<usize> = (0..=n).collect();
    let mut curr: Vec<usize> = vec![0; n + 1];
    for i in 1..=m {
        curr[0] = i;
        for j in 1..=n {
            let cost = if a[i - 1] == b[j - 1] { 0 } else { 1 };
            curr[j] = (prev[j] + 1).min((curr[j - 1] + 1).min(prev[j - 1] + cost));
        }
        std::mem::swap(&mut prev, &mut curr);
    }
    prev[n]
}

/// Dictionary hit rate: fraction of preferred terms that appear in the
/// hypothesis (case-insensitive, word-boundary check via the normaliser).
/// Returns `1.0` when the dictionary has zero preferred terms (no signal
/// to measure; never penalise a clean dictionary).
pub fn compute_dictionary_hit_rate(
    hypothesis: &str,
    dictionary: &PersonalDictionary,
) -> DictionaryHitRate {
    let preferred = dictionary.preferred_terms();
    if preferred.is_empty() {
        return DictionaryHitRate {
            preferred_total: 0,
            matched: 0,
            hit_rate: 1.0,
            matched_terms: Vec::new(),
            missed_terms: Vec::new(),
        };
    }
    let lower = hypothesis.to_lowercase();
    let mut matched: Vec<String> = Vec::new();
    let mut missed: Vec<String> = Vec::new();
    for term in &preferred {
        let needle = term.to_lowercase();
        // word-boundary check: surround by whitespace/punct boundaries
        // OR string edges. Cheap-and-correct for the polish-style terms.
        if contains_word(&lower, &needle) {
            matched.push(term.clone());
        } else {
            missed.push(term.clone());
        }
    }
    let total = preferred.len();
    let hit_rate = matched.len() as f32 / total as f32;
    DictionaryHitRate {
        preferred_total: total,
        matched: matched.len(),
        hit_rate,
        matched_terms: matched,
        missed_terms: missed,
    }
}

fn contains_word(haystack: &str, needle: &str) -> bool {
    if needle.is_empty() {
        return false;
    }
    let bytes = haystack.as_bytes();
    let nbytes = needle.as_bytes();
    let nlen = nbytes.len();
    let hlen = bytes.len();
    if nlen > hlen {
        return false;
    }
    let mut i = 0usize;
    while i + nlen <= hlen {
        if &bytes[i..i + nlen] == nbytes {
            let left_boundary = i == 0
                || !(bytes[i - 1] as char).is_alphanumeric()
                    && bytes[i - 1] != b'_';
            let right = i + nlen;
            let right_boundary = right == hlen
                || !(bytes[right] as char).is_alphanumeric()
                    && bytes[right] != b'_';
            if left_boundary && right_boundary {
                return true;
            }
        }
        i += 1;
    }
    false
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DictionaryHitRate {
    pub preferred_total: usize,
    pub matched: usize,
    pub hit_rate: f32,
    pub matched_terms: Vec<String>,
    pub missed_terms: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VoxSttBenchmarkEngineResult {
    pub engine_id: EngineId,
    pub engine_label: String,
    pub status: BenchmarkOutcome,
    /// When `Ok`, the resulting transcript (without PCM).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transcript: Option<VoxTranscript>,
    pub wer: Option<WerScore>,
    pub dictionary_hit_rate: Option<DictionaryHitRate>,
    pub correction_count: Option<usize>,
    pub confidence: Option<f32>,
    pub latency_ms: u64,
    /// When the engine could not run (missing model, build feature off),
    /// the structured reason.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unavailable_reason: Option<String>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum BenchmarkOutcome {
    Ok,
    EngineUnavailable,
    AudioMissing,
    AudioConsentMissing,
    EngineError,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VoxSttBenchmarkSampleReport {
    pub schema: String,
    pub sample_id: Uuid,
    pub label: String,
    pub language: String,
    pub expected_text: String,
    pub audio_origin: AudioOrigin,
    pub had_audio: bool,
    pub engines: Vec<VoxSttBenchmarkEngineResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VoxSttBenchmarkReport {
    pub schema: String,
    pub report_id: Uuid,
    pub generated_at: String,
    pub host_dictionary_terms: usize,
    pub registry: Vec<EngineRegistryEntry>,
    pub samples: Vec<VoxSttBenchmarkSampleReport>,
    pub aggregate: VoxSttBenchmarkAggregate,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VoxSttBenchmarkAggregate {
    pub total_samples: usize,
    pub engine_means: Vec<EngineMeans>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EngineMeans {
    pub engine_id: EngineId,
    pub engine_label: String,
    pub runs_ok: usize,
    pub runs_skipped: usize,
    pub mean_wer: Option<f32>,
    pub mean_latency_ms: Option<u64>,
    pub mean_dictionary_hit_rate: Option<f32>,
    pub mean_confidence: Option<f32>,
}

/// Selects which engine implementations the runner exercises. Tests can
/// inject `EngineSet::TextOnly` so the harness exercises the dictionary +
/// post-correction stages over a fixture without needing a real model.
pub enum EngineSet {
    /// Use the real `WhisperCppEngine` instances built from the registry.
    /// Engines reported as `Unavailable` are skipped honestly.
    Default,
    /// Inject a list of engines. Each is paired with its `EngineId` so the
    /// report still labels engines canonically.
    Custom(Vec<(EngineId, Arc<dyn SttEngine>)>),
    /// Text-only mode. Skips audio transcription entirely; the runner
    /// scores the **expected_text** itself (i.e. zero-edit baseline) so
    /// callers can verify dictionary hit-rate + correction count.
    TextOnly,
}

pub struct VoxSttBenchmarkRunner {
    home: PathBuf,
}

impl VoxSttBenchmarkRunner {
    pub fn with_home_dir(home: &Path) -> Self {
        Self {
            home: home.to_path_buf(),
        }
    }

    pub fn benchmark_dir(&self) -> PathBuf {
        self.home.join(DEFAULT_BENCHMARK_RELATIVE_DIR)
    }

    /// Returns the registry snapshot (engines + availability) without
    /// running anything. Cheap; safe to call on every status poll.
    pub fn registry(&self) -> Vec<EngineRegistryEntry> {
        EngineRegistry::with_home_dir(&self.home).entries()
    }

    /// Runs the benchmark over the supplied samples.
    ///
    /// `EngineSet::Default` uses the real engines built from the registry;
    /// engines reported `Unavailable` are skipped with
    /// `BenchmarkOutcome::EngineUnavailable` (no fake transcription).
    pub fn run(
        &self,
        samples: &[VoxSttBenchmarkSample],
        dictionary: &PersonalDictionary,
        engine_set: EngineSet,
    ) -> VoxSttBenchmarkReport {
        let registry = self.registry();
        let is_text_only = matches!(engine_set, EngineSet::TextOnly);
        let engines: Vec<(EngineId, Option<Arc<dyn SttEngine>>, Option<String>)> = match engine_set
        {
            EngineSet::Default => registry
                .iter()
                .map(|entry| match &entry.availability {
                    EngineAvailability::Available { .. } => match entry.engine_id {
                        EngineId::WhisperCppLargeV3 => (
                            entry.engine_id,
                            Some(Arc::new(WhisperCppEngine::with_home_dir(&self.home))
                                as Arc<dyn SttEngine>),
                            None,
                        ),
                        // 7.5 wires only the default engine to a real
                        // implementation. Turbo would need a second
                        // engine constructor; pin it as unavailable
                        // with an honest reason for now.
                        EngineId::WhisperCppLargeV3Turbo => (
                            entry.engine_id,
                            None,
                            Some(
                                "turbo_engine_factory_not_wired_in_wave_7_5".to_string(),
                            ),
                        ),
                        EngineId::MlxLargeV3 => (
                            entry.engine_id,
                            None,
                            Some("mlx_engine_factory_not_present".to_string()),
                        ),
                    },
                    EngineAvailability::Unavailable { reason } => {
                        (entry.engine_id, None, Some(reason.clone()))
                    }
                })
                .collect(),
            EngineSet::Custom(list) => list
                .into_iter()
                .map(|(id, engine)| (id, Some(engine), None))
                .collect(),
            EngineSet::TextOnly => Vec::new(),
        };

        let mut sample_reports = Vec::new();
        for sample in samples {
            let mut engine_results = Vec::new();
            if is_text_only || engines.is_empty() {
                // Text-only path: score the expected_text against itself
                // so we still report dictionary hit-rate + corrections
                // honestly.
                engine_results.push(self.text_only_result(sample, dictionary));
            } else {
                for (engine_id, engine_opt, unavailable_reason) in &engines {
                    let result = match engine_opt {
                        Some(engine) => self.run_one_engine(
                            *engine_id,
                            engine.as_ref(),
                            sample,
                            dictionary,
                        ),
                        None => VoxSttBenchmarkEngineResult {
                            engine_id: *engine_id,
                            engine_label: engine_id.label().to_string(),
                            status: BenchmarkOutcome::EngineUnavailable,
                            transcript: None,
                            wer: None,
                            dictionary_hit_rate: None,
                            correction_count: None,
                            confidence: None,
                            latency_ms: 0,
                            unavailable_reason: unavailable_reason.clone(),
                        },
                    };
                    engine_results.push(result);
                }
            }

            sample_reports.push(VoxSttBenchmarkSampleReport {
                schema: BENCHMARK_SAMPLE_SCHEMA.to_string(),
                sample_id: sample.sample_id,
                label: sample.label.clone(),
                language: sample.language.clone(),
                expected_text: sample.expected_text.clone(),
                audio_origin: sample.audio_origin,
                had_audio: sample.has_audio(),
                engines: engine_results,
            });
        }

        let aggregate = self.aggregate(&sample_reports);

        VoxSttBenchmarkReport {
            schema: BENCHMARK_SCHEMA.to_string(),
            report_id: Uuid::new_v4(),
            generated_at: chrono::Utc::now().to_rfc3339(),
            host_dictionary_terms: dictionary.preferred_terms().len(),
            registry,
            samples: sample_reports,
            aggregate,
        }
    }

    fn run_one_engine(
        &self,
        engine_id: EngineId,
        engine: &dyn SttEngine,
        sample: &VoxSttBenchmarkSample,
        dictionary: &PersonalDictionary,
    ) -> VoxSttBenchmarkEngineResult {
        if !sample.has_audio() {
            return VoxSttBenchmarkEngineResult {
                engine_id,
                engine_label: engine_id.label().to_string(),
                status: BenchmarkOutcome::AudioMissing,
                transcript: None,
                wer: None,
                dictionary_hit_rate: None,
                correction_count: None,
                confidence: None,
                latency_ms: 0,
                unavailable_reason: Some(
                    "sample has no PCM (text fixture); audio-real path skipped".to_string(),
                ),
            };
        }

        let input = VoxSttInput {
            session_id: sample.sample_id,
            audio_handle: sample.sample_id,
            sample_rate: sample.captured_sample_rate.max(1),
            channels: sample.captured_channels.max(1),
            pcm_f32: sample.pcm_f32.clone(),
            duration_ms: 0,
            capture_to_stt_start_ms: 0,
        };

        let started = Instant::now();
        let outcome = engine.transcribe(&input, dictionary);
        let latency = started.elapsed().as_millis() as u64;
        match outcome {
            Ok(mut transcript) => {
                let wer = compute_wer(&sample.expected_text, &transcript.text);
                let hit_rate = compute_dictionary_hit_rate(&transcript.text, dictionary);
                let corrections = transcript.post_corrections.len();
                let confidence = Some(transcript.confidence);
                // Defence in depth: never let raw_pcm_persisted leak true.
                debug_assert!(!transcript.raw_pcm_persisted);
                transcript.raw_pcm_persisted = false;
                VoxSttBenchmarkEngineResult {
                    engine_id,
                    engine_label: engine_id.label().to_string(),
                    status: BenchmarkOutcome::Ok,
                    transcript: Some(transcript),
                    wer: Some(wer),
                    dictionary_hit_rate: Some(hit_rate),
                    correction_count: Some(corrections),
                    confidence,
                    latency_ms: latency,
                    unavailable_reason: None,
                }
            }
            Err(SttError::ModelMissingOrEngineUnavailable { message, .. }) => {
                VoxSttBenchmarkEngineResult {
                    engine_id,
                    engine_label: engine_id.label().to_string(),
                    status: BenchmarkOutcome::EngineUnavailable,
                    transcript: None,
                    wer: None,
                    dictionary_hit_rate: None,
                    correction_count: None,
                    confidence: None,
                    latency_ms: latency,
                    unavailable_reason: Some(message),
                }
            }
            Err(SttError::AudioInputInvalid(msg)) => VoxSttBenchmarkEngineResult {
                engine_id,
                engine_label: engine_id.label().to_string(),
                status: BenchmarkOutcome::EngineError,
                transcript: None,
                wer: None,
                dictionary_hit_rate: None,
                correction_count: None,
                confidence: None,
                latency_ms: latency,
                unavailable_reason: Some(msg),
            },
        }
    }

    fn text_only_result(
        &self,
        sample: &VoxSttBenchmarkSample,
        dictionary: &PersonalDictionary,
    ) -> VoxSttBenchmarkEngineResult {
        let started = Instant::now();
        let pc = post_correction::apply(&sample.expected_text, dictionary);
        let latency = started.elapsed().as_millis() as u64;
        let wer = compute_wer(&sample.expected_text, &pc.text);
        let hit_rate = compute_dictionary_hit_rate(&pc.text, dictionary);
        VoxSttBenchmarkEngineResult {
            engine_id: EngineId::WhisperCppLargeV3,
            engine_label: "text_fixture_pipeline".to_string(),
            status: BenchmarkOutcome::Ok,
            transcript: None,
            wer: Some(wer),
            dictionary_hit_rate: Some(hit_rate),
            correction_count: Some(pc.corrections.len()),
            confidence: None,
            latency_ms: latency,
            unavailable_reason: None,
        }
    }

    fn aggregate(&self, samples: &[VoxSttBenchmarkSampleReport]) -> VoxSttBenchmarkAggregate {
        // Group engine results by engine_id, average where applicable.
        use std::collections::BTreeMap;
        let mut by_engine: BTreeMap<EngineId, Vec<&VoxSttBenchmarkEngineResult>> = BTreeMap::new();
        for sample in samples {
            for r in &sample.engines {
                by_engine.entry(r.engine_id).or_default().push(r);
            }
        }
        let mut engine_means = Vec::new();
        for (engine_id, results) in by_engine {
            let ok_runs: Vec<&VoxSttBenchmarkEngineResult> = results
                .iter()
                .copied()
                .filter(|r| r.status == BenchmarkOutcome::Ok)
                .collect();
            let skipped = results.len() - ok_runs.len();
            let (mean_wer, mean_lat, mean_hit, mean_conf) = if ok_runs.is_empty() {
                (None, None, None, None)
            } else {
                let n = ok_runs.len() as f32;
                let sum_wer: f32 = ok_runs.iter().filter_map(|r| r.wer.as_ref().map(|w| w.wer)).sum();
                let sum_lat: u64 = ok_runs.iter().map(|r| r.latency_ms).sum();
                let sum_hit: f32 = ok_runs
                    .iter()
                    .filter_map(|r| r.dictionary_hit_rate.as_ref().map(|h| h.hit_rate))
                    .sum();
                let conf_count = ok_runs.iter().filter(|r| r.confidence.is_some()).count();
                let sum_conf: f32 = ok_runs.iter().filter_map(|r| r.confidence).sum();
                let mean_conf = if conf_count == 0 {
                    None
                } else {
                    Some(sum_conf / conf_count as f32)
                };
                (
                    Some(sum_wer / n),
                    Some(sum_lat / ok_runs.len() as u64),
                    Some(sum_hit / n),
                    mean_conf,
                )
            };
            engine_means.push(EngineMeans {
                engine_id,
                engine_label: engine_id.label().to_string(),
                runs_ok: ok_runs.len(),
                runs_skipped: skipped,
                mean_wer,
                mean_latency_ms: mean_lat,
                mean_dictionary_hit_rate: mean_hit,
                mean_confidence: mean_conf,
            });
        }
        VoxSttBenchmarkAggregate {
            total_samples: samples.len(),
            engine_means,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::vox_stt::dictionary::PersonalDictionary;
    use tempfile::tempdir;

    #[test]
    fn wer_exact_match_is_zero() {
        let score = compute_wer("Manda o Codex olhar isso", "manda o codex olhar isso.");
        assert_eq!(score.wer, 0.0);
        assert_eq!(score.edits, 0);
        assert_eq!(score.reference_words, 5);
    }

    #[test]
    fn wer_single_substitution_is_one_fifth() {
        let score = compute_wer("manda o codex olhar isso", "manda o claude olhar isso");
        assert_eq!(score.edits, 1);
        assert!((score.wer - 0.2).abs() < 1e-6);
    }

    #[test]
    fn wer_single_insertion_increments_edits() {
        let score = compute_wer("manda olhar", "manda agora olhar");
        assert_eq!(score.edits, 1);
        assert_eq!(score.reference_words, 2);
    }

    #[test]
    fn wer_single_deletion_increments_edits() {
        let score = compute_wer("manda agora olhar", "manda olhar");
        assert_eq!(score.edits, 1);
        assert_eq!(score.reference_words, 3);
    }

    #[test]
    fn wer_empty_reference_with_words_is_unbounded_above_one() {
        let score = compute_wer("", "três palavras aqui");
        assert!(score.wer >= 1.0);
        assert_eq!(score.reference_words, 0);
        assert_eq!(score.hypothesis_words, 3);
    }

    #[test]
    fn dictionary_hit_rate_full_match_is_one() {
        let dict = PersonalDictionary::pre_populated();
        let terms = dict.preferred_terms();
        let hypothesis = terms.join(" ");
        let hr = compute_dictionary_hit_rate(&hypothesis, &dict);
        assert_eq!(hr.preferred_total, terms.len());
        assert_eq!(hr.matched, terms.len());
        assert!((hr.hit_rate - 1.0).abs() < 1e-6);
    }

    #[test]
    fn dictionary_hit_rate_zero_when_no_terms_present() {
        let dict = PersonalDictionary::pre_populated();
        let hr = compute_dictionary_hit_rate("nada disso aqui", &dict);
        assert_eq!(hr.matched, 0);
        assert_eq!(hr.hit_rate, 0.0);
    }

    #[test]
    fn engine_registry_marks_missing_model_as_unavailable_with_reason() {
        let tmp = tempdir().unwrap();
        let registry = EngineRegistry::with_home_dir(tmp.path());
        let entries = registry.entries();
        assert_eq!(entries.len(), 3);
        for entry in entries {
            match entry.availability {
                EngineAvailability::Unavailable { reason } => {
                    assert!(!reason.is_empty(), "reason must be populated honestly");
                }
                EngineAvailability::Available { .. } => {
                    // Acceptable only when the operator actually staged
                    // the model file (not the case in tempdir tests).
                    panic!("no model is staged in tempdir; engine must be Unavailable");
                }
            }
        }
    }

    #[test]
    fn engine_registry_always_marks_mlx_unavailable_in_wave_7_5() {
        let tmp = tempdir().unwrap();
        let registry = EngineRegistry::with_home_dir(tmp.path());
        let mlx = registry
            .entries()
            .into_iter()
            .find(|e| e.engine_id == EngineId::MlxLargeV3)
            .expect("MLX entry");
        match mlx.availability {
            EngineAvailability::Unavailable { reason } => {
                assert!(reason.contains("mlx"));
            }
            _ => panic!("MLX must stay Unavailable in 7.5"),
        }
    }

    #[test]
    fn benchmark_sample_default_has_no_audio_and_no_consent() {
        let sample = VoxSttBenchmarkSample::text_fixture("greet", "olá Codex");
        assert!(!sample.has_audio());
        assert!(!sample.explicit_benchmark_audio_consent);
        assert_eq!(sample.audio_origin, AudioOrigin::None);
    }

    #[test]
    fn report_in_text_only_mode_scores_dictionary_and_corrections() {
        let tmp = tempdir().unwrap();
        let runner = VoxSttBenchmarkRunner::with_home_dir(tmp.path());
        let dict = PersonalDictionary::pre_populated();
        let samples = vec![VoxSttBenchmarkSample::text_fixture(
            "polish",
            "manda o codex olhar isso",
        )];
        let report = runner.run(&samples, &dict, EngineSet::TextOnly);
        assert_eq!(report.schema, BENCHMARK_SCHEMA);
        assert_eq!(report.samples.len(), 1);
        assert_eq!(report.samples[0].engines.len(), 1);
        let result = &report.samples[0].engines[0];
        assert_eq!(result.status, BenchmarkOutcome::Ok);
        assert!(result.wer.is_some());
        assert!(result.dictionary_hit_rate.is_some());
        assert!(result.correction_count.is_some());
    }

    #[test]
    fn report_default_mode_skips_unavailable_engines_without_fake_transcript() {
        let tmp = tempdir().unwrap();
        let runner = VoxSttBenchmarkRunner::with_home_dir(tmp.path());
        let dict = PersonalDictionary::pre_populated();
        let samples = vec![VoxSttBenchmarkSample::text_fixture("fixture", "olá")];
        let report = runner.run(&samples, &dict, EngineSet::Default);
        // No engine should produce Ok — none have a real model in tempdir.
        for sample in &report.samples {
            for r in &sample.engines {
                assert!(
                    r.status == BenchmarkOutcome::EngineUnavailable
                        || r.status == BenchmarkOutcome::AudioMissing
                        || r.status == BenchmarkOutcome::EngineError,
                    "engine {:?} unexpectedly Ok in default mode: {:?}",
                    r.engine_id,
                    r.status
                );
                assert!(r.transcript.is_none());
            }
        }
    }

    #[test]
    fn aggregate_collects_means_per_engine() {
        let tmp = tempdir().unwrap();
        let runner = VoxSttBenchmarkRunner::with_home_dir(tmp.path());
        let dict = PersonalDictionary::pre_populated();
        let samples = vec![
            VoxSttBenchmarkSample::text_fixture("a", "manda o codex olhar"),
            VoxSttBenchmarkSample::text_fixture("b", "olá mundo"),
        ];
        let report = runner.run(&samples, &dict, EngineSet::TextOnly);
        assert_eq!(report.aggregate.total_samples, 2);
        assert!(!report.aggregate.engine_means.is_empty());
        for means in &report.aggregate.engine_means {
            assert!(means.runs_ok > 0 || means.runs_skipped > 0);
        }
    }

    #[test]
    fn report_serializes_with_canonical_schema_strings() {
        let tmp = tempdir().unwrap();
        let runner = VoxSttBenchmarkRunner::with_home_dir(tmp.path());
        let dict = PersonalDictionary::pre_populated();
        let samples = vec![VoxSttBenchmarkSample::text_fixture("a", "olá")];
        let report = runner.run(&samples, &dict, EngineSet::TextOnly);
        let v: serde_json::Value = serde_json::to_value(&report).unwrap();
        assert_eq!(v["schema"], BENCHMARK_SCHEMA);
        assert_eq!(v["samples"][0]["schema"], BENCHMARK_SAMPLE_SCHEMA);
    }
}
