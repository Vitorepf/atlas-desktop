//! Locates the whisper.cpp model file on disk and reports honestly whether
//! the engine can be initialized.
//!
//! Layout: `~/.atlas/vox/models/ggml-large-v3.bin` for the V0 default. We do
//! NOT download the model automatically — it's a multi-GB file and pulling it
//! silently is a footgun. Missing model -> structured `nextAction` that tells
//! the operator exactly where to drop the file.

use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

/// V0 default file name. Maps 1:1 to `whisper.cpp@large-v3`.
pub const DEFAULT_MODEL_FILENAME: &str = "ggml-large-v3.bin";

pub const DEFAULT_MODELS_RELATIVE_DIR: &str = ".atlas/vox/models";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelStatus {
    /// Stable model id (matches `engine` on VoxTranscript).
    pub model_id: String,
    pub model_filename: String,
    pub models_dir: String,
    pub model_path: String,
    pub model_found: bool,
    pub engine_available: bool,
    /// `null` when ready, otherwise a structured next-step the operator can
    /// act on without reading source. Example: download instructions.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_action: Option<NextAction>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NextAction {
    pub code: String,
    pub message: String,
}

pub struct ModelStore {
    models_dir: PathBuf,
    model_filename: String,
    model_id: String,
}

impl ModelStore {
    /// Production constructor: `<home>/.atlas/vox/models/`.
    pub fn with_home_dir(home: &Path) -> Self {
        Self {
            models_dir: home.join(DEFAULT_MODELS_RELATIVE_DIR),
            model_filename: DEFAULT_MODEL_FILENAME.to_string(),
            model_id: super::types::DEFAULT_ENGINE.to_string(),
        }
    }

    /// Test constructor.
    pub fn with_root(root: &Path) -> Self {
        Self {
            models_dir: root.join(DEFAULT_MODELS_RELATIVE_DIR),
            model_filename: DEFAULT_MODEL_FILENAME.to_string(),
            model_id: super::types::DEFAULT_ENGINE.to_string(),
        }
    }

    pub fn model_path(&self) -> PathBuf {
        self.models_dir.join(&self.model_filename)
    }

    /// Returns `true` when this build links a real whisper.cpp binding.
    /// Wave 6.6 (Claude M) gates `whisper-rs` behind the opt-in
    /// `whisper-cpp` feature on macOS, so any other combination still
    /// reports `false` honestly.
    pub fn binding_compiled() -> bool {
        cfg!(all(target_os = "macos", feature = "whisper-cpp"))
    }

    pub fn status(&self) -> ModelStatus {
        let model_path = self.model_path();
        let model_found = model_path.is_file();
        let binding_present = Self::binding_compiled();

        // engine_available is gated on (a) the model file existing AND
        // (b) the real whisper.cpp binding being linked into this build.
        // We do NOT pre-flight the binding by loading the model here —
        // status() is called frequently and a multi-GB mmap on each call
        // would be hostile. The engine itself returns a structured error
        // if loading actually fails at transcribe time.
        let engine_available = binding_present && model_found;

        let next_action = match (binding_present, model_found) {
            (false, _) => Some(NextAction {
                code: "engine_binding_pending".to_string(),
                message:
                    "Build atual não inclui o binding whisper.cpp. \
                     Rode `brew install cmake` e recompile com \
                     `cargo build -p atlas-platform --features whisper-cpp` em macOS."
                        .to_string(),
            }),
            (true, false) => Some(NextAction {
                code: "model_missing".to_string(),
                message: format!(
                    "Baixe o modelo ggml-large-v3.bin e salve em {}",
                    model_path.display()
                ),
            }),
            (true, true) => None,
        };

        ModelStatus {
            model_id: self.model_id.clone(),
            model_filename: self.model_filename.clone(),
            models_dir: self.models_dir.display().to_string(),
            model_path: model_path.display().to_string(),
            model_found,
            engine_available,
            next_action,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn reports_missing_model_honestly() {
        let tmp = tempdir().unwrap();
        let store = ModelStore::with_root(tmp.path());

        let status = store.status();
        assert!(!status.model_found);
        assert!(!status.engine_available);
        assert_eq!(status.model_id, "whisper.cpp@large-v3");
        assert_eq!(status.model_filename, "ggml-large-v3.bin");
        let next = status
            .next_action
            .expect("nextAction should be populated when not ready");
        // On macOS the binding is compiled in → "model_missing".
        // On other targets the binding is absent → "engine_binding_pending".
        assert!(
            next.code == "model_missing" || next.code == "engine_binding_pending",
            "unexpected next_action.code: {}",
            next.code
        );
    }

    #[test]
    #[cfg(all(target_os = "macos", feature = "whisper-cpp"))]
    fn macos_with_feature_reports_engine_available_when_model_present() {
        let tmp = tempdir().unwrap();
        let store = ModelStore::with_root(tmp.path());
        std::fs::create_dir_all(store.models_dir.as_path()).unwrap();
        std::fs::write(store.model_path(), b"fake-binary-placeholder").unwrap();

        let status = store.status();
        assert!(status.model_found);
        assert!(
            status.engine_available,
            "with feature=whisper-cpp on macOS, engine_available must be true when model is present"
        );
        assert!(status.next_action.is_none());
    }

    #[test]
    #[cfg(not(all(target_os = "macos", feature = "whisper-cpp")))]
    fn engine_binding_pending_when_feature_disabled_or_non_macos() {
        let tmp = tempdir().unwrap();
        let store = ModelStore::with_root(tmp.path());
        std::fs::create_dir_all(store.models_dir.as_path()).unwrap();
        std::fs::write(store.model_path(), b"fake-binary-placeholder").unwrap();
        let status = store.status();
        assert!(!status.engine_available);
        let next = status.next_action.unwrap();
        assert_eq!(next.code, "engine_binding_pending");
    }

    #[test]
    fn status_serializes_camel_case() {
        let tmp = tempdir().unwrap();
        let store = ModelStore::with_root(tmp.path());
        let status = store.status();
        let v: serde_json::Value = serde_json::to_value(&status).unwrap();
        assert!(v.get("modelFound").is_some());
        assert!(v.get("engineAvailable").is_some());
        assert!(v.get("modelPath").is_some());
    }
}
