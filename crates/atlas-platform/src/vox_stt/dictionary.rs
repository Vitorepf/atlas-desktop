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
///
/// V6-ES-B doctrine:
///   - NUNCA cadastrar variante que seja palavra comum em PT-BR (ex.: "código",
///     "box", "terminal", "prompt"). Isso destrói texto comum do operador.
///   - Variantes valem só pra erros de STT/sotaque, não pra sinônimos.
///   - Variantes multi-palavra (com espaço) são seguras por construção:
///     o operador raramente fala duas palavras técnicas juntas por acaso.
fn pre_populated_entries() -> Vec<DictionaryEntry> {
    let raw: &[(&str, &[&str], &str)] = &[
        // Núcleo Atlas
        ("Atlas", &["átlas", "atilas", "atlais", "átles"], "Atlas"),
        ("Atlas Vox", &["atlas vox", "atlas vocs", "atlas box", "átlas vox", "atilas vox"], "Atlas Vox"),
        ("Atlas Code", &["atlas code", "atlas cod", "atilas code"], "Atlas Code"),
        ("Atlas Desktop", &["atlas desktop", "átlas desktop"], "Atlas Desktop"),
        ("Atlas Server", &["atlas server", "atlas servidor"], "Atlas Server"),
        ("Atlas Vox dogfood", &["atlas vox dogfood", "atlas vox dog food", "atlas vox dog fude"], "Atlas Vox dogfood"),

        // Vox stand-alone — variantes ESTRITAS pra evitar destruir "box"
        // sozinho em texto comum. Pegamos só formas que NÃO confundem com
        // palavras corriqueiras.
        ("Vox", &["átlas vox sozinho", "vocs atlas"], "Vox"),

        // IAs externas — variantes só de mishearing real.
        ("Codex", &["codes", "códex", "códecs", "codecs atlas"], "Codex"),
        ("Claude", &["claud", "clóudi", "claudi", "clauld", "clóude"], "Claude"),
        ("ChatGPT", &["chat gpt", "chat g p t", "chatgepete", "chat-gpt"], "ChatGPT"),

        // Framework / runtime
        ("Tauri", &["tauly", "taurí", "talri", "tau ri"], "Tauri"),
        ("LiveKit", &["live kit", "live keat", "livecat", "laivkit", "laiv kit"], "LiveKit"),
        ("Whisper", &["uísper", "uisper", "uíspe", "uispe", "uispér", "whyspe"], "Whisper"),
        ("whisper.cpp", &["whisper cpp", "uísper cpp", "uisper cpp", "whisper c plus plus", "uísper c plus plus"], "whisper.cpp"),
        ("Laravel", &["laravell", "lara vel", "lala vel"], "Laravel"),
        ("MacBook", &["mac book", "mecbook", "macibook"], "MacBook"),

        // Conceitos Atlas
        ("Kernel", &["kernal", "kérnel", "kérnal"], "Kernel"),
        ("Forge", &["fórdgi", "fórdj", "forg", "fórgi"], "Forge"),
        ("Inbox", &["in box", "inbóx", "ímbox"], "Inbox"),
        ("Workbench", &["work bench", "uorquibench", "uorque bench", "uork bench"], "Workbench"),
        ("Cartografia", &["cartografía", "cartografia atlas"], "Cartografia"),

        // Decisão / governança
        ("Decision Receipt", &["decision receipt", "decision receit", "decision rissipt"], "Decision Receipt"),
        ("Evidence Ledger", &["evidence ledger", "evidence leger", "evidence lédger"], "Evidence Ledger"),
        ("Voice Realtime", &["voice realtime", "voys realtime", "voice real time", "vóis realtaim"], "Voice Realtime"),
        ("Prompt Compiler", &["prompt compiler", "prompt compilador", "prompt compailer"], "Prompt Compiler"),
        ("GATE V3", &["gate vê três", "gate v three", "gate v3 atlas"], "GATE V3"),

        // Plataforma / sistema
        ("LaunchAgent", &["launch agent", "lánchi agent", "lonch agent", "lonchi agent"], "LaunchAgent"),
        ("Option Space", &["option space", "ópishon space", "ópitan space", "opção espaço", "opção mais espaço"], "Option Space"),

        // Idioma / sotaque (referências que o operador menciona em meta-fala)
        ("PT-BR", &["pê tê bê erre", "pê tê bê érri", "português do brasil"], "PT-BR"),
        ("goiano", &["goyano", "goiâno"], "goiano"),

        // dogfood — só mishearings claros, NUNCA "dog food" puro
        // (palavra ambígua: ração de cachorro vira falso positivo).
        // Quem fala "dog food" literalmente sobre Atlas usa "Atlas Vox dogfood".
        ("dogfood", &["dog fude", "dogfude", "dogue fude"], "dogfood"),
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
        // Lista canônica V6-ES-B: núcleo Atlas + IAs + framework + conceitos +
        // sistema + idioma. NUNCA inclui termos cujas variantes destruiriam
        // texto comum (Desktop/Terminal/Rivals isolados saíram de propósito —
        // os multi-palavra "Atlas Desktop" / "Atlas Server" cobrem o uso real).
        let dict = PersonalDictionary::pre_populated();
        for required in [
            "Atlas", "Atlas Vox", "Atlas Code", "Atlas Desktop", "Atlas Server",
            "Atlas Vox dogfood",
            "Vox",
            "Codex", "Claude", "ChatGPT",
            "Tauri", "LiveKit", "Whisper", "whisper.cpp", "Laravel", "MacBook",
            "Kernel", "Forge", "Inbox", "Workbench", "Cartografia",
            "Decision Receipt", "Evidence Ledger", "Voice Realtime",
            "Prompt Compiler", "GATE V3",
            "LaunchAgent", "Option Space",
            "PT-BR", "goiano",
            "dogfood",
        ] {
            assert!(
                dict.entries.iter().any(|e| e.preferred == required),
                "required vocab term missing: {required}"
            );
        }
    }

    #[test]
    fn pre_populated_has_no_destructive_variants() {
        // V6-ES-B · regression guard: variantes que coincidem com palavras
        // PT-BR comuns destruem texto do operador. Lista canon do que NÃO pode
        // estar em variantes de NENHUMA entrada.
        let dict = PersonalDictionary::pre_populated();
        let banned: &[&str] = &[
            "código", "codigo", "box", "código fonte",
            "prompt", "terminal", "desktop", "kit",
            "dog", "food", "atlas", // 'atlas' sozinho não pode reescrever
            "vox", // mesmo motivo
        ];
        for entry in &dict.entries {
            for variant in &entry.variants {
                let v = variant.to_lowercase();
                for needle in banned {
                    assert!(
                        v != *needle,
                        "entrada {:?} cadastrou variante destrutiva {:?}",
                        entry.preferred,
                        variant,
                    );
                }
            }
        }
    }
}
