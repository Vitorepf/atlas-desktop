//! Personal dictionary for Atlas Vox.
//!
//! Stored at `~/.atlas/vox/dictionary.json`. Runtime-local state — never
//! committed to the repo. Pre-populated with Atlas vocabulary on first load
//! so the operator never starts from an empty file.
//!
//! Format: `atlas.vox.personal_dictionary.v1`.

use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use super::types::DICTIONARY_SCHEMA;

/// Default install location: `~/.atlas/vox/dictionary.json`. Tests must
/// inject an alternative root via [`DictionaryStore::with_root`] — writing to
/// the real HOME during `cargo test` is forbidden.
pub const DEFAULT_RELATIVE_PATH: &str = ".atlas/vox/dictionary.json";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub struct DictionaryEntry {
    pub phrase: String,
    #[serde(default)]
    pub variants: Vec<String>,
    pub preferred: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PersonalDictionary {
    pub schema_version: String,
    /// Monotonically increasing integer. Bumped on every save. Matches
    /// `VoxSessionPacket.dictionary_version`.
    pub version: u32,
    pub language: String,
    pub accent_hint: String,
    pub entries: Vec<DictionaryEntry>,
    pub updated_at: String,
}

impl PersonalDictionary {
    /// Returns the canonical pre-populated dictionary used when no file
    /// exists on disk yet. The list is intentionally small and curated for
    /// V0 Atlas vocabulary.
    pub fn pre_populated() -> Self {
        let entries = pre_populated_entries();
        Self {
            schema_version: DICTIONARY_SCHEMA.to_string(),
            version: 1,
            language: super::types::DEFAULT_LANGUAGE.to_string(),
            accent_hint: "goiano".to_string(),
            entries,
            updated_at: chrono::Utc::now().to_rfc3339(),
        }
    }

    /// Returns the preferred forms ordered for prompt biasing. Used as the
    /// `personal_dictionary_applied` field on the transcript.
    pub fn preferred_terms(&self) -> Vec<String> {
        self.entries
            .iter()
            .map(|e| e.preferred.clone())
            .collect()
    }
}

/// Filesystem-backed store. Construct with [`DictionaryStore::with_home_dir`]
/// in production and [`DictionaryStore::with_root`] in tests.
pub struct DictionaryStore {
    path: PathBuf,
}

impl DictionaryStore {
    /// Roots the store at `<home>/.atlas/vox/dictionary.json`.
    pub fn with_home_dir(home: &Path) -> Self {
        Self {
            path: home.join(DEFAULT_RELATIVE_PATH),
        }
    }

    /// Roots the store at an arbitrary directory — used by tests with
    /// `tempfile::tempdir()` so the real HOME is never written to.
    pub fn with_root(root: &Path) -> Self {
        Self {
            path: root.join(DEFAULT_RELATIVE_PATH),
        }
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    /// Loads the dictionary, creating it with pre-populated Atlas vocabulary
    /// if the file does not exist. Returns `(dictionary, created)` so callers
    /// can log first-run population.
    pub fn load_or_initialize(&self) -> Result<(PersonalDictionary, bool), DictionaryError> {
        if self.path.exists() {
            let raw = fs::read_to_string(&self.path)?;
            let dict: PersonalDictionary = serde_json::from_str(&raw)?;
            Ok((dict, false))
        } else {
            let dict = PersonalDictionary::pre_populated();
            self.save(&dict)?;
            Ok((dict, true))
        }
    }

    pub fn save(&self, dict: &PersonalDictionary) -> Result<(), DictionaryError> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent)?;
        }
        let pretty = serde_json::to_string_pretty(dict)?;
        fs::write(&self.path, pretty)?;
        Ok(())
    }

    /// Replaces the on-disk dictionary with `dict`, bumping `version` and
    /// stamping `updated_at`.
    pub fn update(&self, mut dict: PersonalDictionary) -> Result<PersonalDictionary, DictionaryError> {
        dict.version = dict.version.saturating_add(1);
        dict.updated_at = chrono::Utc::now().to_rfc3339();
        self.save(&dict)?;
        Ok(dict)
    }
}

#[derive(Debug, thiserror::Error)]
pub enum DictionaryError {
    #[error("dictionary io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("dictionary parse error: {0}")]
    Parse(#[from] serde_json::Error),
}

/// Atlas V0 vocabulary. Each entry has a preferred canonical form plus a
/// handful of common STT mishearings (goiano accent + general PT-BR drift).
fn pre_populated_entries() -> Vec<DictionaryEntry> {
    let raw: &[(&str, &[&str], &str)] = &[
        ("Atlas", &["átlas", "atlas"], "Atlas"),
        ("Atlas Vox", &["atlas vox", "atlas vocs", "atlas box"], "Atlas Vox"),
        ("Vox", &["vocs", "box", "vox"], "Vox"),
        ("Codex", &["codes", "código", "codigo", "codecs", "códex"], "Codex"),
        ("Claude", &["claud", "clóudi", "claude", "claudi"], "Claude"),
        ("Tauri", &["tauri", "tauly", "tauri", "tauri"], "Tauri"),
        ("LiveKit", &["live kit", "livekit", "live keat", "livecat"], "LiveKit"),
        ("Decision Receipt", &["decision receipt", "decision receit"], "Decision Receipt"),
        ("Evidence Ledger", &["evidence ledger", "evidence leger"], "Evidence Ledger"),
        ("Kernel", &["kernal", "kernel"], "Kernel"),
        ("Forge", &["forge", "forj"], "Forge"),
        ("Rivals", &["rivals", "rivais"], "Rivals"),
        ("MacBook", &["macbook", "mac book"], "MacBook"),
        ("Desktop", &["desktop", "desktopy"], "Desktop"),
        ("Terminal", &["terminal", "terminaw"], "Terminal"),
        ("Laravel", &["laravel", "laravell", "lara vel"], "Laravel"),
        ("Whisper", &["whisper", "uisper", "uísper"], "Whisper"),
        ("Cartografia", &["cartografia", "cartografía"], "Cartografia"),
        ("Inbox", &["inbox", "in box"], "Inbox"),
        ("Workbench", &["workbench", "work bench"], "Workbench"),
        ("Atlas Desktop", &["atlas desktop"], "Atlas Desktop"),
        ("Atlas Server", &["atlas server", "atlas servidor"], "Atlas Server"),
        ("Prompt Compiler", &["prompt compiler", "prompt compilador"], "Prompt Compiler"),
        ("Voice Realtime", &["voice realtime", "voys realtime", "voice real time"], "Voice Realtime"),
        ("GATE V3", &["gate v3", "gate vê três", "gate v three"], "GATE V3"),
    ];

    raw.iter()
        .map(|(phrase, variants, preferred)| DictionaryEntry {
            phrase: (*phrase).to_string(),
            variants: variants.iter().map(|v| (*v).to_string()).collect(),
            preferred: (*preferred).to_string(),
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn first_load_creates_pre_populated_dictionary_in_tempdir() {
        let tmp = tempdir().unwrap();
        let store = DictionaryStore::with_root(tmp.path());

        let (dict, created) = store.load_or_initialize().unwrap();
        assert!(created, "first load should write the file");
        assert!(store.path().exists());
        assert_eq!(dict.schema_version, DICTIONARY_SCHEMA);
        assert_eq!(dict.language, "pt-BR");
        assert_eq!(dict.accent_hint, "goiano");
        assert!(dict.entries.iter().any(|e| e.preferred == "Codex"));
        assert!(dict.entries.iter().any(|e| e.preferred == "LiveKit"));
        assert!(dict.entries.iter().any(|e| e.preferred == "Atlas Vox"));
    }

    #[test]
    fn second_load_does_not_overwrite_existing_file() {
        let tmp = tempdir().unwrap();
        let store = DictionaryStore::with_root(tmp.path());

        let (mut dict, _) = store.load_or_initialize().unwrap();
        dict.entries.push(DictionaryEntry {
            phrase: "Vitor".into(),
            variants: vec!["vítor".into(), "viktor".into()],
            preferred: "Vitor".into(),
        });
        let updated = store.update(dict).unwrap();
        assert_eq!(updated.version, 2);

        let (reloaded, created) = store.load_or_initialize().unwrap();
        assert!(!created, "second load must not recreate");
        assert!(reloaded.entries.iter().any(|e| e.preferred == "Vitor"));
        assert_eq!(reloaded.version, 2);
    }

    #[test]
    fn pre_populated_has_required_atlas_vocabulary() {
        let dict = PersonalDictionary::pre_populated();
        for required in [
            "Atlas", "Atlas Vox", "Vox", "Codex", "Claude", "Tauri", "LiveKit",
            "Decision Receipt", "Evidence Ledger", "Kernel", "Forge", "Rivals",
            "MacBook", "Desktop", "Terminal", "Laravel", "Whisper", "Cartografia",
            "Inbox", "Workbench", "Atlas Desktop", "Atlas Server",
            "Prompt Compiler", "Voice Realtime", "GATE V3",
        ] {
            assert!(
                dict.entries.iter().any(|e| e.preferred == required),
                "required vocab term missing: {required}"
            );
        }
    }
}
