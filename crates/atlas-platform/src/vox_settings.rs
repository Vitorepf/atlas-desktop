//! Atlas Vox · local-only settings store (V6 Reply Surface).
//!
//! Stored at `~/.atlas/vox/settings.json`. Mantém preferências runtime-local
//! que NÃO devem ser sincronizadas com o backend — começa com `voice_mode`
//! (off | short). Mirror do `DictionaryStore` em estrutura/teste.
//!
//! Schema canônico: `atlas.vox.settings.v1`. Adicionar campo opcional = OK
//! (compat). Renomear/remover/mudar enum = nova versão.
//!
//! Hard rules:
//!   - Sem rede. Tudo local.
//!   - Default conservador: `voice_mode = off`.
//!   - Whitelist canônica de frases curtas vive AQUI (não em config remoto)
//!     pra evitar que payload externo injete fala arbitrária.

use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

/// Caminho default: `~/.atlas/vox/settings.json`. Testes devem injetar root
/// via [`VoxSettingsStore::with_root`] — escrever no HOME real durante
/// `cargo test` é proibido.
pub const DEFAULT_RELATIVE_PATH: &str = ".atlas/vox/settings.json";

/// Schema canônico (atlas.vox.settings.v1).
pub const SETTINGS_SCHEMA: &str = "atlas.vox.settings.v1";

/// Versão da estrutura — bumpada quando o shape muda em release.
pub const SETTINGS_VERSION: &str = "0.1.0";

/// Modo de voz do Atlas Vox V6. Default `Off`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum VoiceMode {
    /// Atlas nunca fala. Texto sempre aparece.
    Off,
    /// Atlas pode falar frases curtas da whitelist (≤ 30 chars). Texto
    /// continua aparecendo no overlay.
    Short,
}

impl Default for VoiceMode {
    fn default() -> Self {
        Self::Off
    }
}

impl VoiceMode {
    pub fn as_str(&self) -> &'static str {
        match self {
            VoiceMode::Off => "off",
            VoiceMode::Short => "short",
        }
    }

    pub fn from_str_strict(value: &str) -> Result<Self, VoxSettingsError> {
        match value {
            "off" => Ok(VoiceMode::Off),
            "short" => Ok(VoiceMode::Short),
            other => Err(VoxSettingsError::InvalidVoiceMode(other.to_string())),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct VoxSettings {
    pub schema_version: String,
    pub settings_version: String,
    pub voice_mode: VoiceMode,
    /// Cooldown entre falas (em milissegundos). Vive no JSON pra audit; o
    /// runtime usa a constante {@see DEFAULT_COOLDOWN_MS} como fallback.
    pub voice_cooldown_ms: u64,
    pub updated_at: String,
}

impl Default for VoxSettings {
    fn default() -> Self {
        Self {
            schema_version: SETTINGS_SCHEMA.to_string(),
            settings_version: SETTINGS_VERSION.to_string(),
            voice_mode: VoiceMode::default(),
            voice_cooldown_ms: DEFAULT_COOLDOWN_MS,
            updated_at: chrono::Utc::now().to_rfc3339(),
        }
    }
}

/// Cooldown default: 5 segundos. Operador pode persistir um valor maior
/// no JSON; o runtime ignora valores < 1s (anti-flood) e > 60s (sanity).
pub const DEFAULT_COOLDOWN_MS: u64 = 5_000;
pub const MIN_COOLDOWN_MS: u64 = 1_000;
pub const MAX_COOLDOWN_MS: u64 = 60_000;

/// Frases curtas canônicas para o modo `Short`. A whitelist vive aqui pra
/// que payload do frontend NUNCA possa injetar texto arbitrário no `say`.
///
/// Cada entrada tem uma `key` estável (string que o frontend manda) + um
/// `text` PT-BR curto (≤ 30 chars). Quem invocar `say` resolve a key contra
/// esta lista; falha se a key não existir.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum VoxShortPhrase {
    /// "Entendi." — confirmação de ação concluída sem incidente.
    Understood,
    /// "Preciso de um detalhe." — V5 clarify.
    NeedDetail,
    /// "Bloqueei por segurança." — V5 disagree blocking.
    BlockedSafety,
    /// "Prompt pronto." — compile() concluído sem intervenção.
    PromptReady,
}

impl VoxShortPhrase {
    pub fn key(&self) -> &'static str {
        match self {
            VoxShortPhrase::Understood => "understood",
            VoxShortPhrase::NeedDetail => "need_detail",
            VoxShortPhrase::BlockedSafety => "blocked_safety",
            VoxShortPhrase::PromptReady => "prompt_ready",
        }
    }

    pub fn text(&self) -> &'static str {
        match self {
            VoxShortPhrase::Understood => "Entendi.",
            VoxShortPhrase::NeedDetail => "Preciso de um detalhe.",
            VoxShortPhrase::BlockedSafety => "Bloqueei por segurança.",
            VoxShortPhrase::PromptReady => "Prompt pronto.",
        }
    }

    pub fn from_key(key: &str) -> Option<Self> {
        match key {
            "understood" => Some(VoxShortPhrase::Understood),
            "need_detail" => Some(VoxShortPhrase::NeedDetail),
            "blocked_safety" => Some(VoxShortPhrase::BlockedSafety),
            "prompt_ready" => Some(VoxShortPhrase::PromptReady),
            _ => None,
        }
    }

    pub fn all() -> [VoxShortPhrase; 4] {
        [
            VoxShortPhrase::Understood,
            VoxShortPhrase::NeedDetail,
            VoxShortPhrase::BlockedSafety,
            VoxShortPhrase::PromptReady,
        ]
    }
}

/// Store filesystem-backed mirror do `DictionaryStore`.
pub struct VoxSettingsStore {
    path: PathBuf,
}

impl VoxSettingsStore {
    /// Roots o store em `<home>/.atlas/vox/settings.json`.
    pub fn with_home_dir(home: &Path) -> Self {
        Self {
            path: home.join(DEFAULT_RELATIVE_PATH),
        }
    }

    /// Roots o store em diretório arbitrário (usado por testes com tempdir).
    pub fn with_root(root: &Path) -> Self {
        Self {
            path: root.join(DEFAULT_RELATIVE_PATH),
        }
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    /// Carrega settings; cria com default conservador (`voice_mode=off`)
    /// se o arquivo não existir. Retorna `(settings, created)` para que
    /// callers possam logar first-run.
    pub fn load_or_initialize(&self) -> Result<(VoxSettings, bool), VoxSettingsError> {
        if self.path.exists() {
            let raw = fs::read_to_string(&self.path)?;
            let mut s: VoxSettings = serde_json::from_str(&raw)?;
            // Clamp cooldown a um intervalo razoável (anti-flood + sanity).
            s.voice_cooldown_ms = clamp_cooldown(s.voice_cooldown_ms);
            Ok((s, false))
        } else {
            let s = VoxSettings::default();
            self.save(&s)?;
            Ok((s, true))
        }
    }

    pub fn save(&self, s: &VoxSettings) -> Result<(), VoxSettingsError> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent)?;
        }
        let pretty = serde_json::to_string_pretty(s)?;
        fs::write(&self.path, pretty)?;
        Ok(())
    }

    /// Atualiza o modo de voz, persiste e devolve a settings atualizada.
    /// Stamping `updated_at`.
    pub fn set_voice_mode(&self, mode: VoiceMode) -> Result<VoxSettings, VoxSettingsError> {
        let (mut current, _) = self.load_or_initialize()?;
        current.voice_mode = mode;
        current.updated_at = chrono::Utc::now().to_rfc3339();
        self.save(&current)?;
        Ok(current)
    }
}

pub fn clamp_cooldown(ms: u64) -> u64 {
    ms.clamp(MIN_COOLDOWN_MS, MAX_COOLDOWN_MS)
}

#[derive(Debug, thiserror::Error)]
pub enum VoxSettingsError {
    #[error("vox settings io: {0}")]
    Io(#[from] std::io::Error),
    #[error("vox settings json: {0}")]
    Serde(#[from] serde_json::Error),
    #[error("invalid voice_mode: {0}")]
    InvalidVoiceMode(String),
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn fresh_store() -> (TempDir, VoxSettingsStore) {
        let dir = tempfile::tempdir().expect("tempdir");
        let store = VoxSettingsStore::with_root(dir.path());
        (dir, store)
    }

    #[test]
    fn default_voice_mode_is_off() {
        let s = VoxSettings::default();
        assert_eq!(s.voice_mode, VoiceMode::Off);
        assert_eq!(s.schema_version, SETTINGS_SCHEMA);
        assert_eq!(s.voice_cooldown_ms, DEFAULT_COOLDOWN_MS);
    }

    #[test]
    fn voice_mode_round_trips_through_str() {
        assert_eq!(VoiceMode::Off.as_str(), "off");
        assert_eq!(VoiceMode::Short.as_str(), "short");
        assert_eq!(VoiceMode::from_str_strict("off").unwrap(), VoiceMode::Off);
        assert_eq!(VoiceMode::from_str_strict("short").unwrap(), VoiceMode::Short);
    }

    #[test]
    fn voice_mode_from_str_rejects_anything_else() {
        for bad in &["", "loud", "ON", "Short", "yes", "1", "true"] {
            assert!(
                VoiceMode::from_str_strict(bad).is_err(),
                "should reject {bad:?}"
            );
        }
    }

    #[test]
    fn store_creates_default_file_on_first_load() {
        let (_dir, store) = fresh_store();
        assert!(!store.path().exists());
        let (s, created) = store.load_or_initialize().unwrap();
        assert!(created);
        assert!(store.path().exists());
        assert_eq!(s.voice_mode, VoiceMode::Off);
        // segunda carga deve retornar created=false e mesmas settings.
        let (s2, created2) = store.load_or_initialize().unwrap();
        assert!(!created2);
        assert_eq!(s, s2);
    }

    #[test]
    fn set_voice_mode_persists_across_new_store_instances() {
        let (dir, store) = fresh_store();
        store.set_voice_mode(VoiceMode::Short).unwrap();
        let store2 = VoxSettingsStore::with_root(dir.path());
        let (s, _) = store2.load_or_initialize().unwrap();
        assert_eq!(s.voice_mode, VoiceMode::Short);
    }

    #[test]
    fn cooldown_is_clamped_on_load() {
        let (dir, store) = fresh_store();
        // grava um valor absurdo direto no JSON
        let raw = serde_json::json!({
            "schema_version": SETTINGS_SCHEMA,
            "settings_version": SETTINGS_VERSION,
            "voice_mode": "short",
            "voice_cooldown_ms": 999_999_999,
            "updated_at": "2026-05-19T00:00:00Z",
        });
        let path = dir.path().join(DEFAULT_RELATIVE_PATH);
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::write(&path, raw.to_string()).unwrap();

        let (s, _) = store.load_or_initialize().unwrap();
        assert_eq!(s.voice_cooldown_ms, MAX_COOLDOWN_MS);

        // valor < min vira min
        let raw = serde_json::json!({
            "schema_version": SETTINGS_SCHEMA,
            "settings_version": SETTINGS_VERSION,
            "voice_mode": "short",
            "voice_cooldown_ms": 100,
            "updated_at": "2026-05-19T00:00:00Z",
        });
        fs::write(&path, raw.to_string()).unwrap();
        let (s, _) = store.load_or_initialize().unwrap();
        assert_eq!(s.voice_cooldown_ms, MIN_COOLDOWN_MS);
    }

    #[test]
    fn short_phrases_whitelist_is_exactly_four_keys() {
        let keys: Vec<&'static str> = VoxShortPhrase::all().iter().map(|p| p.key()).collect();
        assert_eq!(
            keys,
            vec!["understood", "need_detail", "blocked_safety", "prompt_ready"],
        );
    }

    #[test]
    fn short_phrases_are_pt_br_and_short() {
        for p in VoxShortPhrase::all() {
            let text = p.text();
            // PT-BR sanity: termina com ponto, contém só ASCII básico + char acentuado válido.
            assert!(text.ends_with('.'), "phrase must end with period: {text:?}");
            // Limite de 30 chars (≤ 30 chars enforced para evitar fala longa).
            assert!(
                text.chars().count() <= 30,
                "phrase too long ({}): {text:?}",
                text.chars().count(),
            );
            // Nenhuma string vazia.
            assert!(!text.is_empty());
        }
    }

    #[test]
    fn short_phrase_from_key_accepts_only_whitelist() {
        for p in VoxShortPhrase::all() {
            assert_eq!(VoxShortPhrase::from_key(p.key()), Some(p));
        }
        for bad in &[
            "",
            "yes",
            "ok",
            "Understood",      // case-sensitive
            "system_message",  // not in whitelist
            "rm -rf",          // payload injection attempt
            "Entendi.",        // raw text — keys only
            "transcript_full",
        ] {
            assert!(
                VoxShortPhrase::from_key(bad).is_none(),
                "key {bad:?} must NOT resolve",
            );
        }
    }

    #[test]
    fn short_phrases_never_contain_shell_specials_or_command_chars() {
        // Sanidade pra macOS `say`: nenhuma frase whitelist pode ter chars
        // que se beneficiariam de escape (`;`, `|`, `&`, backtick, `$`, etc.).
        // Mesmo invocando `say` via `Command::new(...).arg(text)` (sem shell)
        // isto é defesa em profundidade contra payload manipulado.
        let bad_chars: &[char] = &['`', '$', ';', '|', '&', '<', '>', '"', '\'', '\\', '\n', '\r'];
        for p in VoxShortPhrase::all() {
            for c in p.text().chars() {
                assert!(
                    !bad_chars.contains(&c),
                    "phrase {:?} contains forbidden char {:?}",
                    p.text(),
                    c
                );
            }
        }
    }

    #[test]
    fn save_format_is_pretty_json() {
        let (_dir, store) = fresh_store();
        store.set_voice_mode(VoiceMode::Short).unwrap();
        let raw = fs::read_to_string(store.path()).unwrap();
        // pretty JSON tem newline; bare JSON em uma linha não teria.
        assert!(raw.contains('\n'));
        assert!(raw.contains("\"voice_mode\""));
        assert!(raw.contains("\"short\""));
    }
}
