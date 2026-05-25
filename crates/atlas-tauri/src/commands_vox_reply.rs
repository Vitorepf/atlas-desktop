//! Atlas Vox V6 · Reply Surface — settings + premium speech gate.
//!
//! Comandos expostos:
//!   - `vox_settings_get`         → atlas.vox.settings.v1 do disco
//!   - `vox_settings_update`      → atualiza só `voice_mode` (whitelist `off|short`)
//!   - `vox_speak_short`          → no-op seguro; voz local ruim foi removida.
//!
//! Hard rules:
//!   - Whitelist canônica de 4 frases curtas vive em
//!     [`atlas_platform::VoxShortPhrase`] — payload do webview NUNCA pode
//!     injetar texto arbitrário.
//!   - Default global: `voice_mode = off`. Mesmo com Short ligado, cooldown
//!     de 5s (clamped a [1s, 60s]) evita repetição.
//!   - Falha de TTS NUNCA quebra o fluxo: o command devolve `ok=false` com
//!     reason e o frontend ignora. Texto continua visível no overlay.
//!   - Nenhum fallback para `say`/voz ruim do macOS.

use std::path::PathBuf;
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Duration, Instant};

use atlas_platform::vox_stt::default_atlas_vox_home;
use atlas_platform::{VoiceMode, VoxSettings, VoxSettingsError, VoxSettingsStore, VoxShortPhrase};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

const ATLAS_VOICE_MAX_CHARS: usize = 1800;
const ELEVENLABS_TTS_ENDPOINT: &str = "https://api.elevenlabs.io/v1/text-to-speech";
static ELEVENLABS_HTTP_CLIENT: OnceLock<reqwest::Client> = OnceLock::new();

/// Resultado do `vox_speak_short`.
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

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AtlasVoiceSpeakResult {
    pub ok: bool,
    pub spoken: bool,
    pub platform: String,
    pub chars_spoken: usize,
    pub voice: Option<String>,
    pub reason: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub latency_ms: Option<AtlasVoiceLatencyMs>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AtlasVoiceLatencyMs {
    pub request: u64,
    pub download: u64,
    pub write: u64,
    pub playback: u64,
    pub total: u64,
    pub audio_bytes: u64,
}

#[derive(Debug, Clone, Deserialize)]
struct ElevenLabsTtsConfig {
    api_key: String,
    voice_id: String,
    #[serde(default = "default_elevenlabs_model_id")]
    model_id: String,
    #[serde(default = "default_elevenlabs_output_format")]
    output_format: String,
    #[serde(default = "default_elevenlabs_streaming_latency")]
    optimize_streaming_latency: u8,
}

fn default_elevenlabs_model_id() -> String {
    "eleven_multilingual_v2".to_string()
}

fn default_elevenlabs_output_format() -> String {
    "mp3_44100_128".to_string()
}

fn default_elevenlabs_streaming_latency() -> u8 {
    0
}

/// Estado global de cooldown — uma `last_spoken_at` por processo. Vivendo
/// num `Mutex<Instant>` simples porque o comando é chamado raramente (≤ 1/5s)
/// e a contenção de lock é trivial.
#[derive(Default, Clone)]
pub struct VoxReplyState {
    inner: Arc<Mutex<VoxReplyInner>>,
}

#[derive(Default)]
struct VoxReplyInner {
    last_spoken_at: Option<Instant>,
    atlas_voice_audio_pid: Option<u32>,
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

    fn clear_atlas_voice_pid_if(&self, pid: u32) {
        let mut g = self
            .inner
            .lock()
            .expect("vox reply mutex poisoned — atlas voice pid unrecoverable");
        if g.atlas_voice_audio_pid == Some(pid) {
            g.atlas_voice_audio_pid = None;
        }
    }

    fn atlas_voice_pid(&self) -> Option<u32> {
        let g = self
            .inner
            .lock()
            .expect("vox reply mutex poisoned — atlas voice pid unrecoverable");
        g.atlas_voice_audio_pid
    }
}

fn settings_store() -> VoxSettingsStore {
    let home = default_atlas_vox_home();
    VoxSettingsStore::with_home_dir(&home)
}

fn atlas_vox_config_dir() -> PathBuf {
    default_atlas_vox_home().join(".atlas").join("vox")
}

#[cfg(target_os = "macos")]
fn elevenlabs_http_client() -> &'static reqwest::Client {
    ELEVENLABS_HTTP_CLIENT.get_or_init(reqwest::Client::new)
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

    Ok(VoxSpeakResult {
        ok: false,
        spoken: false,
        phrase_key: phrase.key().to_string(),
        phrase_text: Some(phrase.text().to_string()),
        platform,
        voice_mode: settings.voice_mode.as_str().to_string(),
        reason: Some("premium_tts_required".to_string()),
        cooldown_remaining_ms: None,
    })
}

#[tauri::command]
pub async fn atlas_voice_speak(
    text: String,
    state: tauri::State<'_, VoxReplyState>,
) -> Result<AtlasVoiceSpeakResult, String> {
    let platform = std::env::consts::OS.to_string();
    let cleaned = sanitize_atlas_voice_text(&text);
    if cleaned.is_empty() {
        return Ok(AtlasVoiceSpeakResult {
            ok: false,
            spoken: false,
            platform,
            chars_spoken: 0,
            voice: None,
            reason: Some("empty_text".to_string()),
            latency_ms: None,
        });
    }

    #[cfg(target_os = "macos")]
    {
        atlas_voice_stop(state.clone()).await?;

        if let Some(config) = load_elevenlabs_tts_config() {
            match speak_with_elevenlabs(&cleaned, &config, state.inner().shared_inner()).await {
                Ok(result) => return Ok(result),
                Err(e) => {
                    return Ok(AtlasVoiceSpeakResult {
                        ok: false,
                        spoken: false,
                        platform,
                        chars_spoken: 0,
                        voice: Some(format!("elevenlabs:{}", config.voice_id.trim())),
                        reason: Some(format!("elevenlabs_failed: {e}")),
                        latency_ms: None,
                    });
                }
            }
        }

        Ok(AtlasVoiceSpeakResult {
            ok: false,
            spoken: false,
            platform,
            chars_spoken: cleaned.chars().count(),
            voice: None,
            reason: Some("elevenlabs_not_configured".to_string()),
            latency_ms: None,
        })
    }

    #[cfg(not(target_os = "macos"))]
    {
        Ok(AtlasVoiceSpeakResult {
            ok: false,
            spoken: false,
            platform,
            chars_spoken: cleaned.chars().count(),
            voice: None,
            reason: Some("unsupported_platform_macos_only".to_string()),
            latency_ms: None,
        })
    }
}

#[tauri::command]
pub async fn atlas_voice_stop(
    state: tauri::State<'_, VoxReplyState>,
) -> Result<AtlasVoiceSpeakResult, String> {
    let platform = std::env::consts::OS.to_string();
    let Some(pid) = state.atlas_voice_pid() else {
        return Ok(AtlasVoiceSpeakResult {
            ok: true,
            spoken: false,
            platform,
            chars_spoken: 0,
            voice: None,
            reason: Some("no_active_speech".to_string()),
            latency_ms: None,
        });
    };

    #[cfg(target_os = "macos")]
    {
        let status = std::process::Command::new("/bin/kill")
            .arg("-TERM")
            .arg(pid.to_string())
            .status()
            .map_err(|e| format!("atlas_voice_stop kill: {e}"))?;
        state.clear_atlas_voice_pid_if(pid);
        return Ok(AtlasVoiceSpeakResult {
            ok: status.success(),
            spoken: false,
            platform,
            chars_spoken: 0,
            voice: None,
            reason: if status.success() {
                Some("stopped".to_string())
            } else {
                Some(format!("kill_failed_status: {status}"))
            },
            latency_ms: None,
        });
    }

    #[cfg(not(target_os = "macos"))]
    {
        state.clear_atlas_voice_pid_if(pid);
        Ok(AtlasVoiceSpeakResult {
            ok: false,
            spoken: false,
            platform,
            chars_spoken: 0,
            voice: None,
            reason: Some("unsupported_platform_macos_only".to_string()),
            latency_ms: None,
        })
    }
}

impl VoxReplyState {
    fn shared_inner(&self) -> Arc<Mutex<VoxReplyInner>> {
        self.inner.clone()
    }
}

#[cfg(target_os = "macos")]
fn load_elevenlabs_tts_config() -> Option<ElevenLabsTtsConfig> {
    let path = atlas_vox_config_dir().join("elevenlabs.json");
    let raw = std::fs::read_to_string(path).ok()?;
    let config: ElevenLabsTtsConfig = serde_json::from_str(&raw).ok()?;
    if config.api_key.trim().is_empty() || config.voice_id.trim().is_empty() {
        return None;
    }
    Some(config)
}

#[cfg(target_os = "macos")]
async fn speak_with_elevenlabs(
    text: &str,
    config: &ElevenLabsTtsConfig,
    state: Arc<Mutex<VoxReplyInner>>,
) -> Result<AtlasVoiceSpeakResult, String> {
    let platform = std::env::consts::OS.to_string();
    let chars_spoken = text.chars().count();
    let started_at = Instant::now();
    let url = format!(
        "{}/{}/stream?output_format={}&optimize_streaming_latency={}",
        ELEVENLABS_TTS_ENDPOINT,
        config.voice_id.trim(),
        config.output_format.trim(),
        config.optimize_streaming_latency.min(4),
    );
    let body = serde_json::json!({
        "text": text,
        "model_id": config.model_id.trim(),
        "voice_settings": {
            "stability": 0.45,
            "similarity_boost": 0.82,
            "style": 0.18,
            "use_speaker_boost": true
        }
    })
    .to_string();
    let response = elevenlabs_http_client()
        .post(url)
        .header("xi-api-key", config.api_key.trim())
        .header("accept", "audio/mpeg")
        .header("content-type", "application/json")
        .body(body)
        .send()
        .await
        .map_err(|e| format!("request_failed: {e}"))?;
    let response_at = Instant::now();
    let status = response.status();
    if !status.is_success() {
        return Err(format!("http_status: {status}"));
    }
    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("read_audio_failed: {e}"))?;
    let downloaded_at = Instant::now();
    if bytes.is_empty() {
        return Err("empty_audio".to_string());
    }
    let audio_bytes = bytes.len() as u64;

    let audio_path = elevenlabs_audio_path()?;
    if let Some(parent) = audio_path.parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|e| format!("create_cache_dir_failed: {e}"))?;
    }
    tokio::fs::write(&audio_path, &bytes)
        .await
        .map_err(|e| format!("write_audio_failed: {e}"))?;
    let written_at = Instant::now();

    let mut child = std::process::Command::new("/usr/bin/afplay")
        .arg(&audio_path)
        .spawn()
        .map_err(|e| format!("afplay_spawn_failed: {e}"))?;
    let pid = child.id();
    {
        let mut guard = state
            .lock()
            .expect("vox reply mutex poisoned — atlas voice pid unrecoverable");
        guard.atlas_voice_audio_pid = Some(pid);
    }
    let wait_result = tauri::async_runtime::spawn_blocking(move || child.wait())
        .await
        .map_err(|e| format!("afplay_join_failed: {e}"))?;
    let playback_done_at = Instant::now();
    {
        let mut guard = state
            .lock()
            .expect("vox reply mutex poisoned — atlas voice pid unrecoverable");
        if guard.atlas_voice_audio_pid == Some(pid) {
            guard.atlas_voice_audio_pid = None;
        }
    }
    let _ = tokio::fs::remove_file(audio_path).await;

    match wait_result {
        Ok(status) if status.success() => Ok(AtlasVoiceSpeakResult {
            ok: true,
            spoken: true,
            platform,
            chars_spoken,
            voice: Some(format!("elevenlabs:{}", config.voice_id.trim())),
            reason: None,
            latency_ms: Some(AtlasVoiceLatencyMs {
                request: millis_between(started_at, response_at),
                download: millis_between(response_at, downloaded_at),
                write: millis_between(downloaded_at, written_at),
                playback: millis_between(written_at, playback_done_at),
                total: millis_between(started_at, playback_done_at),
                audio_bytes,
            }),
        }),
        Ok(status) => Err(format!("afplay_status: {status}")),
        Err(e) => Err(format!("afplay_wait_failed: {e}")),
    }
}

fn millis_between(start: Instant, end: Instant) -> u64 {
    end.duration_since(start).as_millis().min(u64::MAX as u128) as u64
}

#[cfg(target_os = "macos")]
fn elevenlabs_audio_path() -> Result<PathBuf, String> {
    Ok(atlas_vox_config_dir()
        .join("cache")
        .join("tts")
        .join(format!("atlas-voice-{}.mp3", Uuid::new_v4())))
}

fn sanitize_atlas_voice_text(input: &str) -> String {
    let without_code = strip_code_blocks(input);
    let mut out = String::new();
    let mut last_was_space = false;
    for c in without_code.chars() {
        let mapped = match c {
            '\n' | '\r' | '\t' => ' ',
            '`' | '*' | '_' | '#' | '>' | '[' | ']' | '(' | ')' => ' ',
            c if c.is_control() => ' ',
            c => c,
        };
        if mapped.is_whitespace() {
            if !last_was_space {
                out.push(' ');
                last_was_space = true;
            }
        } else {
            out.push(mapped);
            last_was_space = false;
        }
        if out.chars().count() >= ATLAS_VOICE_MAX_CHARS {
            break;
        }
    }
    let mut trimmed = out.trim().to_string();
    if input.chars().count() > ATLAS_VOICE_MAX_CHARS {
        trimmed.push_str(". Resposta longa; parei aqui para não travar a conversa.");
    }
    trimmed
}

fn strip_code_blocks(input: &str) -> String {
    let mut out = String::new();
    let mut rest = input;
    loop {
        let Some(start) = rest.find("```") else {
            out.push_str(rest);
            break;
        };
        out.push_str(&rest[..start]);
        out.push_str(" trecho de código omitido. ");
        let after_start = &rest[start + 3..];
        let Some(end) = after_start.find("```") else {
            break;
        };
        rest = &after_start[end + 3..];
    }
    out
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
        assert!(
            remaining > 0 && remaining <= 5_000,
            "remaining ms inválido: {remaining}"
        );
    }

    #[test]
    fn cooldown_releases_after_elapsing() {
        let state = VoxReplyState::new();
        let cooldown = Duration::from_millis(20);
        assert!(state.try_speak_now(cooldown).is_ok());
        // espera passar o cooldown
        std::thread::sleep(Duration::from_millis(35));
        assert!(
            state.try_speak_now(cooldown).is_ok(),
            "deveria liberar após cooldown"
        );
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
    fn atlas_voice_sanitize_removes_code_and_limits_text() {
        let input = format!(
            "## Plano\n```ts\nconsole.log('x')\n```\n{}",
            "palavra ".repeat(400)
        );
        let out = sanitize_atlas_voice_text(&input);
        assert!(!out.contains("console.log"));
        assert!(out.contains("trecho de código omitido"));
        assert!(out.contains("Resposta longa; parei aqui"));
        assert!(out.chars().count() <= ATLAS_VOICE_MAX_CHARS + 80);
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
