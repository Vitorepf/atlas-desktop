//! Atlas Vox V6 · Reply Surface — settings + macOS `say` (texto curto).
//!
//! Comandos expostos:
//!   - `vox_settings_get`         → atlas.vox.settings.v1 do disco
//!   - `vox_settings_update`      → atualiza só `voice_mode` (whitelist `off|short`)
//!   - `vox_speak_short`          → macOS `say` apenas de frase whitelistada
//!                                   com cooldown global anti-flood.
//!
//! Hard rules:
//!   - Whitelist canônica de 4 frases curtas vive em
//!     [`atlas_platform::VoxShortPhrase`] — payload do webview NUNCA pode
//!     injetar texto arbitrário.
//!   - macOS-only. Em outros sistemas devolve `unsupported_platform` honesto.
//!   - Default global: `voice_mode = off`. Mesmo com Short ligado, cooldown
//!     de 5s (clamped a [1s, 60s]) evita repetição.
//!   - Falha do binário `/usr/bin/say` NUNCA quebra o fluxo: o command
//!     devolve `ok=false` com reason e o frontend ignora. Texto continua
//!     visível no overlay.
//!   - Nenhum shell. `Command::new("/usr/bin/say").arg(text)` — execução
//!     direta sem interpretação por sh.

use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use atlas_platform::{
    VoiceMode, VoxSettings, VoxSettingsError, VoxSettingsStore, VoxShortPhrase,
};
use atlas_platform::vox_stt::default_atlas_vox_home;
use serde::Serialize;

/// Resultado do `vox_speak_short`. `spoken=true` significa que /usr/bin/say
/// foi chamado com sucesso. Demais campos explicam quando `spoken=false`.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VoxSpeakResult {
    pub ok: bool,
    pub spoken: bool,
    pub phrase_key: String,
    pub phrase_text: Option<String>,
    pub platform: String,
    pub voice_mode: String,
    pub reason: Option<String>,
    /// Quando a fala foi suprimida por cooldown, devolve quanto tempo (ms)
    /// falta. Operador pode usar isso pra esconder o "speak agora" no UI.
    pub cooldown_remaining_ms: Option<u64>,
}

/// Estado global de cooldown — uma `last_spoken_at` por processo. Vivendo
/// num `Mutex<Instant>` simples porque o `say` é chamado raramente (≤ 1/5s)
/// e a contenção de lock é trivial.
#[derive(Default, Clone)]
pub struct VoxReplyState {
    inner: Arc<Mutex<VoxReplyInner>>,
}

#[derive(Default)]
struct VoxReplyInner {
    last_spoken_at: Option<Instant>,
}

impl VoxReplyState {
    pub fn new() -> Self {
        Self::default()
    }

    /// Tenta marcar que uma fala "vai sair agora". Devolve `Ok(())` se a
    /// cooldown está passada; senão devolve o restante em ms.
    pub fn try_speak_now(&self, cooldown: Duration) -> Result<(), u64> {
        let mut g = self
            .inner
            .lock()
            .expect("vox reply mutex poisoned — cooldown unrecoverable");
        let now = Instant::now();
        if let Some(prev) = g.last_spoken_at {
            let elapsed = now.duration_since(prev);
            if elapsed < cooldown {
                let remaining = cooldown - elapsed;
                return Err(remaining.as_millis().min(u64::MAX as u128) as u64);
            }
        }
        g.last_spoken_at = Some(now);
        Ok(())
    }

}

fn settings_store() -> VoxSettingsStore {
    let home = default_atlas_vox_home();
    VoxSettingsStore::with_home_dir(&home)
}

#[tauri::command]
pub async fn vox_settings_get() -> Result<VoxSettings, String> {
    let store = settings_store();
    match store.load_or_initialize() {
        Ok((s, _created)) => Ok(s),
        Err(VoxSettingsError::Io(e)) => Err(format!("vox_settings_get io: {e}")),
        Err(VoxSettingsError::Serde(e)) => Err(format!("vox_settings_get json: {e}")),
        Err(VoxSettingsError::InvalidVoiceMode(v)) => {
            Err(format!("vox_settings_get invalid voice_mode: {v}"))
        }
    }
}

#[tauri::command]
pub async fn vox_settings_update(voice_mode: String) -> Result<VoxSettings, String> {
    let mode = VoiceMode::from_str_strict(voice_mode.as_str())
        .map_err(|e| format!("vox_settings_update: {e}"))?;
    let store = settings_store();
    store
        .set_voice_mode(mode)
        .map_err(|e| format!("vox_settings_update persist: {e}"))
}

#[tauri::command]
pub async fn vox_speak_short(
    phrase_key: String,
    state: tauri::State<'_, VoxReplyState>,
) -> Result<VoxSpeakResult, String> {
    let platform = std::env::consts::OS.to_string();

    // 1) Whitelist primeiro — payload externo NUNCA injeta texto cru.
    let phrase = match VoxShortPhrase::from_key(phrase_key.as_str()) {
        Some(p) => p,
        None => {
            return Ok(VoxSpeakResult {
                ok: false,
                spoken: false,
                phrase_key,
                phrase_text: None,
                platform,
                voice_mode: "unknown".to_string(),
                reason: Some("phrase_not_in_whitelist".to_string()),
                cooldown_remaining_ms: None,
            });
        }
    };

    // 2) Settings — voice_mode precisa estar em short.
    let store = settings_store();
    let settings = match store.load_or_initialize() {
        Ok((s, _)) => s,
        Err(e) => {
            return Ok(VoxSpeakResult {
                ok: false,
                spoken: false,
                phrase_key: phrase.key().to_string(),
                phrase_text: Some(phrase.text().to_string()),
                platform,
                voice_mode: "unknown".to_string(),
                reason: Some(format!("settings_load_failed: {e}")),
                cooldown_remaining_ms: None,
            });
        }
    };

    if settings.voice_mode == VoiceMode::Off {
        return Ok(VoxSpeakResult {
            ok: true, // não é erro — operador escolheu silêncio
            spoken: false,
            phrase_key: phrase.key().to_string(),
            phrase_text: Some(phrase.text().to_string()),
            platform,
            voice_mode: settings.voice_mode.as_str().to_string(),
            reason: Some("voice_mode_off".to_string()),
            cooldown_remaining_ms: None,
        });
    }

    // 3) Cooldown global anti-flood.
    let cooldown = Duration::from_millis(settings.voice_cooldown_ms);
    if let Err(remaining) = state.try_speak_now(cooldown) {
        return Ok(VoxSpeakResult {
            ok: true, // não é erro — só cedo demais
            spoken: false,
            phrase_key: phrase.key().to_string(),
            phrase_text: Some(phrase.text().to_string()),
            platform,
            voice_mode: settings.voice_mode.as_str().to_string(),
            reason: Some("cooldown_active".to_string()),
            cooldown_remaining_ms: Some(remaining),
        });
    }

    // 4) Plataforma: macOS-only. Em outros sistemas falha silenciosa.
    #[cfg(target_os = "macos")]
    {
        match std::process::Command::new("/usr/bin/say")
            .arg(phrase.text())
            .spawn()
        {
            Ok(_child) => Ok(VoxSpeakResult {
                ok: true,
                spoken: true,
                phrase_key: phrase.key().to_string(),
                phrase_text: Some(phrase.text().to_string()),
                platform,
                voice_mode: settings.voice_mode.as_str().to_string(),
                reason: None,
                cooldown_remaining_ms: None,
            }),
            Err(e) => {
                // /usr/bin/say falhou — log discreto via reason, fluxo segue.
                eprintln!("[vox.say] /usr/bin/say falhou: {e}");
                Ok(VoxSpeakResult {
                    ok: false,
                    spoken: false,
                    phrase_key: phrase.key().to_string(),
                    phrase_text: Some(phrase.text().to_string()),
                    platform,
                    voice_mode: settings.voice_mode.as_str().to_string(),
                    reason: Some(format!("say_command_failed: {e}")),
                    cooldown_remaining_ms: None,
                })
            }
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        Ok(VoxSpeakResult {
            ok: false,
            spoken: false,
            phrase_key: phrase.key().to_string(),
            phrase_text: Some(phrase.text().to_string()),
            platform,
            voice_mode: settings.voice_mode.as_str().to_string(),
            reason: Some("unsupported_platform_macos_only".to_string()),
            cooldown_remaining_ms: None,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cooldown_blocks_immediate_repeat() {
        let state = VoxReplyState::new();
        let cooldown = Duration::from_millis(5_000);
        // 1ª chamada passa
        assert!(state.try_speak_now(cooldown).is_ok());
        // 2ª chamada imediata é bloqueada
        let res = state.try_speak_now(cooldown);
        assert!(res.is_err(), "deveria bloquear repeat imediato");
        let remaining = res.unwrap_err();
        assert!(remaining > 0 && remaining <= 5_000, "remaining ms inválido: {remaining}");
    }

    #[test]
    fn cooldown_releases_after_elapsing() {
        let state = VoxReplyState::new();
        let cooldown = Duration::from_millis(20);
        assert!(state.try_speak_now(cooldown).is_ok());
        // espera passar o cooldown
        std::thread::sleep(Duration::from_millis(35));
        assert!(state.try_speak_now(cooldown).is_ok(), "deveria liberar após cooldown");
    }

    #[test]
    fn cooldown_zero_does_not_block() {
        let state = VoxReplyState::new();
        // cooldown=0 é caso patológico (settings clampa pra MIN_COOLDOWN_MS, mas
        // aqui validamos o invariante do mutex).
        assert!(state.try_speak_now(Duration::ZERO).is_ok());
        assert!(state.try_speak_now(Duration::ZERO).is_ok());
    }

    #[test]
    fn whitelist_rejects_arbitrary_keys() {
        // Sem rodar a tauri::command, validamos só a parte determinística.
        let bad_keys = [
            "",
            "Understood", // case-sensitive
            "transcript_full",
            "rm -rf",
            "Entendi.", // raw text
            "system_message",
        ];
        for key in bad_keys {
            assert!(
                VoxShortPhrase::from_key(key).is_none(),
                "key {key:?} jamais pode resolver"
            );
        }
        // 4 keys canônicos válidos
        assert!(VoxShortPhrase::from_key("understood").is_some());
        assert!(VoxShortPhrase::from_key("need_detail").is_some());
        assert!(VoxShortPhrase::from_key("blocked_safety").is_some());
        assert!(VoxShortPhrase::from_key("prompt_ready").is_some());
    }

    #[test]
    fn reply_state_clones_share_inner() {
        let a = VoxReplyState::new();
        let b = a.clone();
        let cooldown = Duration::from_millis(5_000);
        assert!(a.try_speak_now(cooldown).is_ok());
        // Como `b` compartilha o `Arc<Mutex<_>>`, ele também deveria estar
        // em cooldown — invariante crítico para tauri::State.
        assert!(b.try_speak_now(cooldown).is_err());
    }
}
