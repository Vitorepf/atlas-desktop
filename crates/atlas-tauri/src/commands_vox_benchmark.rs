//! Tauri commands for the Atlas Vox local STT benchmark (Wave 7.5).
//!
//! Surface:
//!   - `vox_stt_benchmark_status`        — registry + manifest snapshot
//!   - `vox_stt_benchmark_record_sample` — register a text fixture
//!   - `vox_stt_benchmark_run`           — run benchmark over manifest
//!   - `vox_stt_benchmark_report_latest` — read the latest persisted report
//!
//! Storage: `~/.atlas/vox/benchmark/`
//!   - `manifest.json`         — list of registered samples (no PCM by default)
//!   - `reports/<id>.json`     — persisted benchmark reports
//!   - `audio/<sample>.<ext>`  — present ONLY when the operator opted in
//!     with `explicit_benchmark_audio_consent=true`. This wave never
//!     writes audio bytes; the directory is reserved for future opt-in
//!     ingestion (a follow-up wave will hook the Mac Edge capture into
//!     this path under explicit consent).
//!
//! Hard rules (mirrored from `vox_stt::benchmark`):
//!   - No network, no cloud, no API.
//!   - No automatic model downloads.
//!   - No audio persisted without `explicit_benchmark_audio_consent`.

use std::fs;
use std::path::PathBuf;

use atlas_platform::vox_stt::{
    benchmark::{AudioOrigin, EngineSet, BENCHMARK_SAMPLE_SCHEMA},
    default_atlas_vox_home, DictionaryStore, EngineRegistryEntry, PersonalDictionary,
    VoxSttBenchmarkReport, VoxSttBenchmarkRunner, VoxSttBenchmarkSample,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

const MANIFEST_FILENAME: &str = "manifest.json";
const MANIFEST_SCHEMA: &str = "atlas.vox.stt_benchmark_manifest.v1";
const STATUS_SCHEMA: &str = "atlas.vox.stt_benchmark_status.v1";

fn into_str_err<E: std::fmt::Display>(e: E) -> String {
    let msg = e.to_string();
    tracing::warn!(target: "vox-benchmark", error = %msg, "vox benchmark command failed");
    msg
}

fn benchmark_dir() -> PathBuf {
    default_atlas_vox_home().join(".atlas/vox/benchmark")
}

fn manifest_path() -> PathBuf {
    benchmark_dir().join(MANIFEST_FILENAME)
}

fn reports_dir() -> PathBuf {
    benchmark_dir().join("reports")
}

fn ensure_dirs() -> std::io::Result<()> {
    fs::create_dir_all(benchmark_dir())?;
    fs::create_dir_all(reports_dir())?;
    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct Manifest {
    #[serde(default = "default_manifest_schema")]
    schema: String,
    #[serde(default)]
    samples: Vec<VoxSttBenchmarkSample>,
}

fn default_manifest_schema() -> String {
    MANIFEST_SCHEMA.to_string()
}

fn read_manifest() -> Manifest {
    match fs::read_to_string(manifest_path()) {
        Ok(s) => serde_json::from_str(&s).unwrap_or_else(|_| Manifest {
            schema: MANIFEST_SCHEMA.to_string(),
            samples: Vec::new(),
        }),
        Err(_) => Manifest {
            schema: MANIFEST_SCHEMA.to_string(),
            samples: Vec::new(),
        },
    }
}

fn write_manifest(manifest: &Manifest) -> std::io::Result<()> {
    ensure_dirs()?;
    let body = serde_json::to_string_pretty(manifest)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))?;
    fs::write(manifest_path(), body)
}

fn load_dictionary() -> Result<PersonalDictionary, String> {
    let home = default_atlas_vox_home();
    let store = DictionaryStore::with_home_dir(&home);
    let (dict, _) = store.load_or_initialize().map_err(into_str_err)?;
    Ok(dict)
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VoxBenchmarkStatus {
    pub schema: String,
    pub benchmark_dir: String,
    pub manifest_path: String,
    pub registered_samples: usize,
    pub engines: Vec<EngineRegistryEntry>,
    pub audio_persisted_count: usize,
    pub audio_persistence_consented_count: usize,
}

#[tauri::command]
pub fn vox_stt_benchmark_status() -> VoxBenchmarkStatus {
    let home = default_atlas_vox_home();
    let runner = VoxSttBenchmarkRunner::with_home_dir(&home);
    let manifest = read_manifest();
    let consented = manifest
        .samples
        .iter()
        .filter(|s| s.explicit_benchmark_audio_consent)
        .count();
    VoxBenchmarkStatus {
        schema: STATUS_SCHEMA.to_string(),
        benchmark_dir: benchmark_dir().display().to_string(),
        manifest_path: manifest_path().display().to_string(),
        registered_samples: manifest.samples.len(),
        engines: runner.registry(),
        // Wave 7.5 never writes audio bytes from this surface. The
        // counter stays honest for future waves that wire opt-in audio.
        audio_persisted_count: 0,
        audio_persistence_consented_count: consented,
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordSampleRequest {
    pub label: String,
    pub expected_text: String,
    #[serde(default)]
    pub language: Option<String>,
    /// Explicit operator opt-in to persist audio for this sample. This
    /// wave never writes audio regardless — the field is recorded in the
    /// manifest so future waves honour the consent.
    #[serde(default)]
    pub explicit_benchmark_audio_consent: bool,
    #[serde(default)]
    pub audio_origin: Option<AudioOrigin>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordSampleResponse {
    pub schema: String,
    pub sample: VoxSttBenchmarkSample,
    pub manifest_path: String,
    pub registered_samples: usize,
    pub audio_persisted: bool,
    pub note: String,
}

#[tauri::command]
pub fn vox_stt_benchmark_record_sample(
    request: RecordSampleRequest,
) -> Result<RecordSampleResponse, String> {
    if request.label.trim().is_empty() {
        return Err("label is required".to_string());
    }
    if request.expected_text.trim().is_empty() {
        return Err("expectedText is required".to_string());
    }

    let mut sample = VoxSttBenchmarkSample::text_fixture(&request.label, &request.expected_text);
    if let Some(lang) = request.language {
        if !lang.is_empty() {
            sample.language = lang;
        }
    }
    sample.explicit_benchmark_audio_consent = request.explicit_benchmark_audio_consent;
    sample.audio_origin = request.audio_origin.unwrap_or(AudioOrigin::None);

    let mut manifest = read_manifest();
    manifest.samples.push(sample.clone());
    write_manifest(&manifest).map_err(into_str_err)?;

    Ok(RecordSampleResponse {
        schema: BENCHMARK_SAMPLE_SCHEMA.to_string(),
        manifest_path: manifest_path().display().to_string(),
        registered_samples: manifest.samples.len(),
        audio_persisted: false,
        note: "Wave 7.5 registers text-fixture samples only. No audio bytes were written, even when explicit_benchmark_audio_consent=true. Future waves wire opt-in audio ingestion.".to_string(),
        sample,
    })
}

#[derive(Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct RunBenchmarkRequest {
    /// When `true`, the harness runs in `EngineSet::TextOnly` mode and
    /// skips real engine invocation. Useful for CI / smoke tests.
    #[serde(default)]
    pub text_only: bool,
    /// Optional ad-hoc samples to merge with the persisted manifest.
    #[serde(default)]
    pub additional_samples: Vec<RecordSampleRequest>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunBenchmarkResponse {
    pub schema: String,
    pub report_id: Uuid,
    pub report_path: String,
    pub report: VoxSttBenchmarkReport,
}

#[tauri::command]
pub fn vox_stt_benchmark_run(
    request: Option<RunBenchmarkRequest>,
) -> Result<RunBenchmarkResponse, String> {
    let req = request.unwrap_or_default();
    let manifest = read_manifest();
    let dictionary = load_dictionary()?;
    let home = default_atlas_vox_home();
    let runner = VoxSttBenchmarkRunner::with_home_dir(&home);

    let mut samples = manifest.samples.clone();
    for ad_hoc in req.additional_samples {
        let mut s = VoxSttBenchmarkSample::text_fixture(&ad_hoc.label, &ad_hoc.expected_text);
        if let Some(lang) = ad_hoc.language {
            if !lang.is_empty() {
                s.language = lang;
            }
        }
        s.explicit_benchmark_audio_consent = ad_hoc.explicit_benchmark_audio_consent;
        s.audio_origin = ad_hoc.audio_origin.unwrap_or(AudioOrigin::None);
        samples.push(s);
    }

    if samples.is_empty() {
        return Err("no samples to benchmark — register some via vox_stt_benchmark_record_sample first".to_string());
    }

    let engine_set = if req.text_only {
        EngineSet::TextOnly
    } else {
        EngineSet::Default
    };
    let report = runner.run(&samples, &dictionary, engine_set);

    ensure_dirs().map_err(into_str_err)?;
    let report_path = reports_dir().join(format!("{}.json", report.report_id));
    let body = serde_json::to_string_pretty(&report).map_err(into_str_err)?;
    fs::write(&report_path, body).map_err(into_str_err)?;

    Ok(RunBenchmarkResponse {
        schema: report.schema.clone(),
        report_id: report.report_id,
        report_path: report_path.display().to_string(),
        report,
    })
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportLatestResponse {
    pub schema: String,
    pub report_path: String,
    pub report: VoxSttBenchmarkReport,
}

#[tauri::command]
pub fn vox_stt_benchmark_report_latest() -> Result<Option<ReportLatestResponse>, String> {
    let dir = reports_dir();
    let Ok(entries) = fs::read_dir(&dir) else {
        return Ok(None);
    };
    let mut latest: Option<(PathBuf, std::time::SystemTime)> = None;
    for entry in entries.flatten() {
        if let Ok(meta) = entry.metadata() {
            let modified = meta.modified().unwrap_or(std::time::SystemTime::UNIX_EPOCH);
            if entry.path().extension().and_then(|e| e.to_str()) == Some("json") {
                if latest.as_ref().is_none_or(|(_, t)| modified > *t) {
                    latest = Some((entry.path(), modified));
                }
            }
        }
    }
    let Some((path, _)) = latest else {
        return Ok(None);
    };
    let body = fs::read_to_string(&path).map_err(into_str_err)?;
    let report: VoxSttBenchmarkReport = serde_json::from_str(&body).map_err(into_str_err)?;
    Ok(Some(ReportLatestResponse {
        schema: report.schema.clone(),
        report_path: path.display().to_string(),
        report,
    }))
}
