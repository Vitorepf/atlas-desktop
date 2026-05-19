//! Tauri commands for the Atlas Vox Setup Assistant (Wave 7.9).
//!
//! Single command: `vox_open_system_settings(target)`. Opens macOS System
//! Settings to a specific privacy pane — and only to a known one. The
//! allowlist lives here (Rust) so a malicious payload from the webview
//! cannot inject an arbitrary `x-apple.systempreferences:...` URL.
//!
//! Allowed targets:
//!   - `microphone`         → Privacy & Security · Microphone
//!   - `accessibility`      → Privacy & Security · Accessibility
//!   - `input_monitoring`   → Privacy & Security · Input Monitoring
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allowlist_resolves_three_known_targets() {
        assert!(resolve_settings_url("microphone").is_some());
        assert!(resolve_settings_url("accessibility").is_some());
        assert!(resolve_settings_url("input_monitoring").is_some());
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
    }
}
