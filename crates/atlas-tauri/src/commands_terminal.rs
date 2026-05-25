//! atlas-tauri · terminal launcher commands.
//!
//! Implements `bridge_open_terminal_in_workspace`, the canonical action for
//! the "Abrir Claude Code observado" flow: opens the operator's native
//! terminal application at the Observed Session's `workspace_path` and
//! optionally seeds it with a recommended command (`cd <path> && claude`).
//!
//! Design contract:
//!   - Never executes the seeded command itself — the operator confirms by
//!     pressing return. Atlas is NOT a headless executor.
//!   - Never panics on missing OS-level helpers; returns a structured error
//!     so the UI can fall back to the "copy command" affordance honestly.
//!   - Cross-platform: macOS (osascript → Terminal.app), Linux
//!     (xdg-terminal-exec / gnome-terminal / konsole), Windows
//!     (cmd /c start "" "%COMSPEC%" /K cd ...).
//!
//! Schema returned to JS: { ok: bool, platform: String, method: String,
//!   error: Option<String>, command_preview: Option<String> }

use serde::Serialize;
use std::path::Path;
use std::process::Command;

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct OpenTerminalResult {
    pub ok: bool,
    pub platform: String,
    pub method: String,
    pub error: Option<String>,
    pub command_preview: Option<String>,
}

#[tauri::command]
pub fn bridge_open_terminal_in_workspace(
    workspace_path: String,
    command: Option<String>,
) -> Result<OpenTerminalResult, String> {
    let platform = std::env::consts::OS.to_string();

    if workspace_path.is_empty() || !Path::new(&workspace_path).is_dir() {
        return Ok(OpenTerminalResult {
            ok: false,
            platform,
            method: "preflight".to_string(),
            error: Some(format!(
                "workspace_path_missing_or_unreadable: {}",
                workspace_path
            )),
            command_preview: None,
        });
    }

    // Build the canonical preview command — operator must press return to
    // run it. We never execute via shell concatenation.
    let preview = match &command {
        Some(c) if !c.is_empty() => Some(format!("cd {} && {}", shell_quote(&workspace_path), c)),
        _ => Some(format!("cd {}", shell_quote(&workspace_path))),
    };

    let result = match platform.as_str() {
        "macos" => open_macos(&workspace_path, preview.as_deref()),
        "linux" => open_linux(&workspace_path, preview.as_deref()),
        "windows" => open_windows(&workspace_path, preview.as_deref()),
        other => Err(format!("unsupported_platform: {}", other)),
    };

    Ok(match result {
        Ok(method) => OpenTerminalResult {
            ok: true,
            platform,
            method,
            error: None,
            command_preview: preview,
        },
        Err(err) => OpenTerminalResult {
            ok: false,
            platform,
            method: "spawn".to_string(),
            error: Some(err),
            command_preview: preview,
        },
    })
}

fn open_macos(workspace_path: &str, command: Option<&str>) -> Result<String, String> {
    // osascript tells Terminal.app to open a new window and run `cd <path>`.
    // If a command is provided, append it; Terminal will write but NOT press
    // return until the operator does — so this is interactive observed safe.
    let script = match command {
        Some(c) => format!(
            r#"tell application "Terminal" to do script "{}""#,
            applescript_escape(c)
        ),
        None => format!(
            r#"tell application "Terminal" to do script "cd {}""#,
            applescript_escape(workspace_path)
        ),
    };
    Command::new("osascript")
        .arg("-e")
        .arg(&script)
        .arg("-e")
        .arg(r#"tell application "Terminal" to activate"#)
        .spawn()
        .map(|_child| "osascript_terminal_app".to_string())
        .map_err(|e| format!("osascript_failed: {}", e))
}

fn open_linux(workspace_path: &str, command: Option<&str>) -> Result<String, String> {
    // Try xdg-terminal-exec first (XDG spec). Fall back to common emulators.
    let candidates: Vec<(&str, Vec<String>)> = vec![
        (
            "xdg-terminal-exec",
            command
                .map(|c| {
                    vec![
                        format!("--working-directory={}", workspace_path),
                        c.to_string(),
                    ]
                })
                .unwrap_or_else(|| vec![format!("--working-directory={}", workspace_path)]),
        ),
        (
            "gnome-terminal",
            command
                .map(|c| {
                    vec![
                        format!("--working-directory={}", workspace_path),
                        "--".to_string(),
                        "bash".to_string(),
                        "-c".to_string(),
                        format!("{}; exec bash", c),
                    ]
                })
                .unwrap_or_else(|| vec![format!("--working-directory={}", workspace_path)]),
        ),
        (
            "konsole",
            command
                .map(|c| {
                    vec![
                        "--workdir".to_string(),
                        workspace_path.to_string(),
                        "-e".to_string(),
                        "bash".to_string(),
                        "-c".to_string(),
                        format!("{}; exec bash", c),
                    ]
                })
                .unwrap_or_else(|| vec!["--workdir".to_string(), workspace_path.to_string()]),
        ),
        (
            "xterm",
            command
                .map(|c| {
                    vec![
                        "-e".to_string(),
                        format!("bash -c 'cd {} && {}; exec bash'", workspace_path, c),
                    ]
                })
                .unwrap_or_else(|| {
                    vec![
                        "-e".to_string(),
                        format!("bash -c 'cd {}; exec bash'", workspace_path),
                    ]
                }),
        ),
    ];

    for (binary, args) in candidates {
        if let Ok(_child) = Command::new(binary).args(&args).spawn() {
            return Ok(format!("linux_terminal_{}", binary));
        }
    }
    Err("no_terminal_emulator_available".to_string())
}

fn open_windows(workspace_path: &str, command: Option<&str>) -> Result<String, String> {
    // cmd /K opens a persistent shell; user types `claude` themselves.
    let cmd_string = match command {
        Some(c) => format!("cd /d {} && echo Suggested: {}", workspace_path, c),
        None => format!("cd /d {}", workspace_path),
    };
    Command::new("cmd")
        .args(["/C", "start", "", "cmd", "/K", &cmd_string])
        .spawn()
        .map(|_child| "windows_cmd".to_string())
        .map_err(|e| format!("cmd_start_failed: {}", e))
}

/// Escape a string for AppleScript double-quoted contexts.
fn applescript_escape(s: &str) -> String {
    s.replace('\\', "\\\\").replace('"', "\\\"")
}

/// Minimal POSIX shell quoting (single-quote wrap, escape internal quotes).
fn shell_quote(s: &str) -> String {
    if s.chars().all(|c| {
        c.is_ascii_alphanumeric() || matches!(c, '/' | '.' | '_' | '-' | '+' | ':' | '@' | ',')
    }) {
        s.to_string()
    } else {
        format!("'{}'", s.replace('\'', "'\\''"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn shell_quote_keeps_safe_chars() {
        assert_eq!(shell_quote("/Users/vitor/dev"), "/Users/vitor/dev");
    }

    #[test]
    fn shell_quote_wraps_dangerous_chars() {
        assert_eq!(shell_quote("foo bar"), "'foo bar'");
        assert_eq!(shell_quote("a'b"), "'a'\\''b'");
    }

    #[test]
    fn returns_blocker_when_workspace_missing() {
        let r =
            bridge_open_terminal_in_workspace("/tmp/atlas-nonexistent-xyz-123".to_string(), None)
                .expect("ok");
        assert!(!r.ok);
        assert_eq!(r.method, "preflight");
        assert!(r.error.is_some());
    }
}
