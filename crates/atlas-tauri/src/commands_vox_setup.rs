//! Tauri commands for the Atlas Vox Setup Assistant (Wave 7.9).
//!
//! Commands:
//!   - `vox_open_system_settings(target)` — opens macOS System Settings to
//!     a specific privacy pane (allowlisted).
//!   - `vox_audio_input_describe()` — V6-MIC-AIRPODS-FINAL · read-only
//!     snapshot of the currently-selected macOS audio input (name + sample
//!     rate + channels). Never opens a stream, never triggers a TCC prompt.
//!     Used by the doctor and "advanced details" UI to surface "AirPods"
//!     vs "MacBook Air Microphone" without surprising Vitor.
//!
//! Allowed targets for `vox_open_system_settings`:
//!   - `microphone`         → Privacy & Security · Microphone
//!   - `accessibility`      → Privacy & Security · Accessibility
//!   - `input_monitoring`   → Privacy & Security · Input Monitoring
//!   - `sound_input`        → Sound · Input (escolher microfone ativo,
//!                            ex.: alternar entre AirPods e built-in)
//!
//! Anything else is rejected with a structured error. Non-macOS platforms
//! return `unsupported_platform` honestly so the UI degrades to
//! instruction-only.
//!
//! Hard rules:
//!   - No arbitrary URLs.
//!   - No `do shell script`, no AppleScript, no Automation, no Full Disk.
//!   - The command never spawns processes other than `/usr/bin/open` and
//!     never reads / writes the filesystem.
//!   - `vox_audio_input_describe()` is provably permission-free: it only
//!     calls `device.name()` + `default_input_config()` on the cpal default
//!     input device, both of which are pure metadata reads on macOS.

use atlas_platform::vox::describe_default_input;
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VoxSettingsOpenResult {
    pub ok: bool,
    pub target: String,
    pub url: Option<String>,
    pub platform: String,
    pub reason: Option<String>,
}

/// Returns `Some(url)` only for the canonical allowlist. Any other input
/// gives `None` — the caller surfaces that as a rejection.
fn resolve_settings_url(target: &str) -> Option<&'static str> {
    match target {
        "microphone" => {
            Some("x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone")
        }
        "accessibility" => {
            Some("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")
        }
        "input_monitoring" => {
            Some("x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent")
        }
        // V6-MIC-AIRPODS-FINAL · pane "Sound · Input" pra Vitor escolher
        // qual microfone (AirPods, built-in, Loopback) está ativo no macOS.
        // O Atlas Vox usa o que o sistema apontar como default input.
        "sound_input" => Some("x-apple.systempreferences:com.apple.preference.sound?input"),
        _ => None,
    }
}

#[tauri::command]
pub async fn vox_open_system_settings(target: String) -> Result<VoxSettingsOpenResult, String> {
    let platform = std::env::consts::OS.to_string();

    let url = match resolve_settings_url(target.as_str()) {
        Some(u) => u,
        None => {
            return Ok(VoxSettingsOpenResult {
                ok: false,
                target,
                url: None,
                platform,
                reason: Some("target_not_in_allowlist".to_string()),
            });
        }
    };

    #[cfg(target_os = "macos")]
    {
        match std::process::Command::new("/usr/bin/open").arg(url).spawn() {
            Ok(_child) => Ok(VoxSettingsOpenResult {
                ok: true,
                target,
                url: Some(url.to_string()),
                platform,
                reason: None,
            }),
            Err(e) => Ok(VoxSettingsOpenResult {
                ok: false,
                target,
                url: Some(url.to_string()),
                platform,
                reason: Some(format!("open_command_failed: {e}")),
            }),
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        Ok(VoxSettingsOpenResult {
            ok: false,
            target,
            url: Some(url.to_string()),
            platform,
            reason: Some("unsupported_platform_macos_only".to_string()),
        })
    }
}

// ────────────────────────────────────────────────────────────────────────
// V6-MIC-AIRPODS-FINAL · read-only audio input snapshot
// ────────────────────────────────────────────────────────────────────────

/// Wire shape returned by `vox_audio_input_describe`. Fields are intentionally
/// optional — when cpal cannot read a device (CI, no mic, no permission yet)
/// the UI must show "indisponível" instead of inventing a name.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VoxAudioInputDescription {
    pub schema: &'static str,
    pub platform: String,
    /// Friendly device label as macOS reports it (e.g. "Vitor's AirPods Pro",
    /// "MacBook Air Microphone", "Loopback Audio"). `None` when no default
    /// input device is enumerable.
    pub device_name: Option<String>,
    pub sample_rate_hz: Option<u32>,
    pub channels: Option<u16>,
    /// Stable hint for UI copy. `"airpods"` when the device name contains
    /// "AirPods" (case-insensitive); `"built_in"` for the MacBook mic;
    /// `"external"` for everything else with a name; `"none"` when blank.
    /// Atlas does **not** prefer AirPods — this is purely informational.
    pub device_kind_hint: &'static str,
}

fn classify_device_kind(name: Option<&str>) -> &'static str {
    let Some(n) = name else { return "none" };
    let lower = n.to_ascii_lowercase();
    if lower.contains("airpods") {
        "airpods"
    } else if lower.contains("macbook")
        || lower.contains("built-in")
        || lower.contains("built in")
        || lower.contains("internal")
    {
        "built_in"
    } else {
        "external"
    }
}

/// Read-only snapshot of the currently-selected audio input. Provably
/// permission-free on macOS: cpal's `default_input_device()` enumerates
/// CoreAudio device metadata without opening an AudioUnit. Safe to call
/// from the doctor + setup assistant on every UI mount.
#[tauri::command]
pub fn vox_audio_input_describe() -> VoxAudioInputDescription {
    let snapshot = describe_default_input();
    let device_kind_hint = classify_device_kind(snapshot.device_name.as_deref());
    VoxAudioInputDescription {
        schema: "atlas.vox.audio_input.v1",
        platform: std::env::consts::OS.to_string(),
        device_name: snapshot.device_name,
        sample_rate_hz: snapshot.sample_rate_hz,
        channels: snapshot.channels,
        device_kind_hint,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allowlist_resolves_known_targets() {
        assert!(resolve_settings_url("microphone").is_some());
        assert!(resolve_settings_url("accessibility").is_some());
        assert!(resolve_settings_url("input_monitoring").is_some());
        assert!(resolve_settings_url("sound_input").is_some());
    }

    #[test]
    fn allowlist_rejects_anything_outside_known_targets() {
        for bad in &[
            "full_disk_access",
            "automation",
            "https://example.com/",
            "x-apple.systempreferences:com.apple.preference.security",
            "../etc/passwd",
            "Privacy_Microphone", // not a key on its own
            "",
        ] {
            assert!(
                resolve_settings_url(bad).is_none(),
                "target {bad:?} must NOT resolve"
            );
        }
    }

    #[test]
    fn settings_url_strings_are_canonical_apple_prefs() {
        let mic = resolve_settings_url("microphone").unwrap();
        assert!(mic.starts_with("x-apple.systempreferences:"));
        assert!(mic.contains("Privacy_Microphone"));
        let ax = resolve_settings_url("accessibility").unwrap();
        assert!(ax.contains("Privacy_Accessibility"));
        let im = resolve_settings_url("input_monitoring").unwrap();
        assert!(im.contains("Privacy_ListenEvent"));
        let snd = resolve_settings_url("sound_input").unwrap();
        assert!(snd.starts_with("x-apple.systempreferences:"));
        assert!(snd.contains("com.apple.preference.sound"));
    }

    #[test]
    fn classify_device_kind_recognizes_common_names() {
        assert_eq!(classify_device_kind(Some("Vitor's AirPods Pro")), "airpods");
        assert_eq!(classify_device_kind(Some("AirPods Max")), "airpods");
        assert_eq!(classify_device_kind(Some("airpods")), "airpods");
        assert_eq!(
            classify_device_kind(Some("MacBook Air Microphone")),
            "built_in"
        );
        assert_eq!(classify_device_kind(Some("Built-in Microphone")), "built_in");
        assert_eq!(classify_device_kind(Some("Internal Mic")), "built_in");
        assert_eq!(classify_device_kind(Some("Loopback Audio")), "external");
        assert_eq!(classify_device_kind(Some("Yeti Stereo Microphone")), "external");
        assert_eq!(classify_device_kind(None), "none");
        assert_eq!(classify_device_kind(Some("")), "external");
    }

    #[test]
    fn audio_input_describe_returns_canonical_schema() {
        // Pode rodar em CI sem mic. Só checamos shape canônica.
        let d = vox_audio_input_describe();
        assert_eq!(d.schema, "atlas.vox.audio_input.v1");
        assert!(["macos", "linux", "windows"].contains(&d.platform.as_str()));
        assert!(["airpods", "built_in", "external", "none"].contains(&d.device_kind_hint));
    }
}
