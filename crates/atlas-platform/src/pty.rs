//! Real PTY sessions via `portable-pty`.
//!
//! Lifecycle:
//!   1. `PtyManager::open(req)` spawns a shell in a PTY pair, returns
//!      `(session_id, child_handle, output_rx, writer)`.
//!   2. Caller (Tauri shell) bridges:
//!         output_rx  → `pty://data/{id}` events
//!         writer    ← `pty_write` Tauri command
//!   3. `PtyManager::resize(id, cols, rows)` adjusts the PTY size.
//!   4. `PtyManager::close(id)` kills the child + drops the pair.
//!
//! Default shell:
//!   - `SHELL` env if set
//!   - `/bin/zsh` (macOS default)
//!   - `/bin/bash`

use std::collections::HashMap;
use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::thread;
use std::time::{Duration, Instant};

use parking_lot::Mutex;
use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;
use uuid::Uuid;

const BATCH_MAX_BYTES: usize = 65_536;
const BATCH_MAX_WAIT: Duration = Duration::from_millis(16);

const ATLAS_ZSHRC: &str = r#"# Atlas Code terminal bootstrap.
# This file is generated. Do not edit by hand.

if [[ -r "$HOME/.zshrc" && -z "$ATLAS_SKIP_USER_ZSHRC" ]]; then
  source "$HOME/.zshrc"
fi

export FZF_DEFAULT_OPTS="${FZF_DEFAULT_OPTS:-} --height=42% --layout=reverse --border=rounded --ansi --bind=ctrl-c:abort"

autoload -Uz add-zsh-hook vcs_info 2>/dev/null || true
zstyle ':vcs_info:git:*' formats ' · %b'
zstyle ':vcs_info:*' enable git

setopt prompt_subst
setopt transient_rprompt

_atlas_cmd_started_at=0
_atlas_last_duration=''

_atlas_has_any_file() {
  local f
  for f in "$@"; do
    [[ -e "$f" ]] && return 0
  done
  return 1
}

_atlas_node_segment() {
  _atlas_has_any_file package.json pnpm-lock.yaml package-lock.json yarn.lock bun.lockb || return
  local version=''
  if command -v node >/dev/null 2>&1; then
    version=" $(node -v 2>/dev/null)"
  fi
  print -n "%F{green} via ${version}%f"
}

_atlas_docker_segment() {
  _atlas_has_any_file Dockerfile docker-compose.yml docker-compose.yaml compose.yml compose.yaml || return
  print -n "%F{cyan} · 󰡨 docker%f"
}

_atlas_duration_segment() {
  [[ -n "$_atlas_last_duration" ]] || return
  print -n "%F{244} took $_atlas_last_duration%f"
}

_atlas_format_duration() {
  local seconds="$1"
  if (( seconds < 2 )); then
    print -n ''
  elif (( seconds < 60 )); then
    print -n "${seconds}s"
  else
    local minutes=$(( seconds / 60 ))
    local rest=$(( seconds % 60 ))
    print -n "${minutes}m ${rest}s"
  fi
}

_atlas_terminal_precmd() {
  local atlas_exit=$?
  if (( _atlas_cmd_started_at > 0 )); then
    local elapsed=$(( EPOCHSECONDS - _atlas_cmd_started_at ))
    _atlas_last_duration="$(_atlas_format_duration "$elapsed")"
    _atlas_cmd_started_at=0
  fi
  vcs_info 2>/dev/null || true
  printf '\e]7;file://%s%s\a' "${HOST:-localhost}" "$PWD"
  printf '\e]133;D;%d\a' "$atlas_exit"
  printf '\e]133;A\a'
}

_atlas_terminal_preexec() {
  _atlas_cmd_started_at=$EPOCHSECONDS
  _atlas_last_duration=''
  printf '\e]133;C\a'
}

_atlas_fast_zi() {
  if (( $# > 0 )) && command -v zoxide >/dev/null 2>&1; then
    local result
    result="$(command zoxide query -- "$@" 2>/dev/null)" && {
      builtin cd -- "$result"
      return $?
    }
  fi

  if (( $+functions[__zoxide_zi] )); then
    __zoxide_zi "$@"
    return $?
  fi

  command zoxide query --interactive -- "$@"
}

if command -v zoxide >/dev/null 2>&1; then
  zi() { _atlas_fast_zi "$@" }
fi

add-zsh-hook precmd _atlas_terminal_precmd 2>/dev/null || true
add-zsh-hook preexec _atlas_terminal_preexec 2>/dev/null || true

PROMPT=$'%F{green}❯%f '
RPROMPT=$'$(_atlas_duration_segment)'
"#;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PtyOpenRequest {
    /// Optional stable id chosen by the frontend so it can subscribe to
    /// `pty://data/{id}` before the shell starts writing output.
    pub id: Option<String>,
    /// Working directory; defaults to $HOME if missing/invalid.
    pub cwd: Option<String>,
    /// Optional explicit shell binary; defaults to $SHELL or /bin/zsh.
    pub shell: Option<String>,
    pub cols: Option<u16>,
    pub rows: Option<u16>,
    /// Optional extra env (KEY=VALUE pairs).
    pub env: Option<HashMap<String, String>>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PtySpawnedEvent {
    pub id: String,
    pub shell: String,
    pub cwd: String,
    pub cols: u16,
    pub rows: u16,
}

/// Single PTY session bookkeeping.
pub struct PtyHandle {
    pub id: String,
    pub master: Arc<Mutex<Box<dyn MasterPty + Send>>>,
    pub writer: Arc<Mutex<Box<dyn Write + Send>>>,
    pub child: Arc<Mutex<Box<dyn Child + Send + Sync>>>,
}

#[derive(Default)]
pub struct PtyManager {
    sessions: Mutex<HashMap<String, PtyHandle>>,
}

impl PtyManager {
    pub fn new() -> Arc<Self> {
        Arc::new(Self::default())
    }

    /// Spawn a new PTY session. The returned receiver yields raw stdout
    /// chunks (utf-8 best-effort) that the caller forwards to the UI.
    pub fn open(&self, req: PtyOpenRequest) -> Result<(PtySpawnedEvent, mpsc::UnboundedReceiver<Vec<u8>>), String> {
        let pty_system = native_pty_system();
        let cols = req.cols.unwrap_or(120);
        let rows = req.rows.unwrap_or(36);

        let pair = pty_system
            .openpty(PtySize {
                cols,
                rows,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("openpty: {e}"))?;

        let shell = req
            .shell
            .filter(|s| PathBuf::from(s).exists())
            .or_else(|| std::env::var("SHELL").ok().filter(|s| PathBuf::from(s).exists()))
            .unwrap_or_else(|| {
                if PathBuf::from("/bin/zsh").exists() {
                    "/bin/zsh".to_string()
                } else {
                    "/bin/bash".to_string()
                }
            });

        let cwd = req
            .cwd
            .filter(|p| PathBuf::from(p).is_dir())
            .or_else(|| std::env::var("HOME").ok())
            .unwrap_or_else(|| "/".to_string());

        let mut cmd = CommandBuilder::new(&shell);
        cmd.cwd(&cwd);
        // Login shell so .zshrc / .bashrc fires (PATH, aliases, prompt).
        cmd.arg("-l");
        cmd.env("TERM", "xterm-256color");
        cmd.env("LANG", "en_US.UTF-8");
        cmd.env("LC_ALL", "en_US.UTF-8");
        cmd.env("ATLAS_TERMINAL", "1");
        if is_zsh(&shell) {
            if let Ok(zdotdir) = ensure_atlas_zsh_bootstrap() {
                cmd.env("ZDOTDIR", zdotdir.to_string_lossy().to_string());
            }
        }
        if let Some(extra) = req.env.as_ref() {
            for (k, v) in extra {
                cmd.env(k, v);
            }
        }

        let child = pair.slave.spawn_command(cmd).map_err(|e| format!("spawn: {e}"))?;

        let writer = pair.master.take_writer().map_err(|e| format!("writer: {e}"))?;
        let mut reader = pair.master.try_clone_reader().map_err(|e| format!("reader: {e}"))?;

        let (tx, rx) = mpsc::unbounded_channel::<Vec<u8>>();

        // Drain the master reader on a dedicated std thread (portable-pty's
        // Read impl is blocking). Batch chunks up to 64KB / 16ms so xterm.js
        // can absorb fast bursts (build output, `find`) in a single frame.
        thread::spawn(move || {
            let mut buf = [0u8; 4096];
            let mut acc: Vec<u8> = Vec::with_capacity(BATCH_MAX_BYTES);
            let mut last_flush = Instant::now();
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => {
                        if !acc.is_empty() {
                            let _ = tx.send(acc);
                        }
                        break;
                    }
                    Ok(n) => {
                        acc.extend_from_slice(&buf[..n]);
                        let should_flush =
                            acc.len() >= BATCH_MAX_BYTES || last_flush.elapsed() >= BATCH_MAX_WAIT;
                        if should_flush {
                            let flush = std::mem::replace(&mut acc, Vec::with_capacity(BATCH_MAX_BYTES));
                            if tx.send(flush).is_err() {
                                break;
                            }
                            last_flush = Instant::now();
                        }
                    }
                    Err(_) => {
                        if !acc.is_empty() {
                            let _ = tx.send(acc);
                        }
                        break;
                    }
                }
            }
        });

        let id = req.id.unwrap_or_else(|| Uuid::new_v4().to_string());
        let event = PtySpawnedEvent {
            id: id.clone(),
            shell: shell.clone(),
            cwd: cwd.clone(),
            cols,
            rows,
        };
        let handle = PtyHandle {
            id: id.clone(),
            master: Arc::new(Mutex::new(pair.master)),
            writer: Arc::new(Mutex::new(writer)),
            child: Arc::new(Mutex::new(child)),
        };
        self.sessions.lock().insert(id, handle);
        Ok((event, rx))
    }

    pub fn write(&self, id: &str, data: &[u8]) -> Result<usize, String> {
        let sessions = self.sessions.lock();
        let handle = sessions.get(id).ok_or_else(|| format!("pty {id} not found"))?;
        let writer = Arc::clone(&handle.writer);
        drop(sessions);
        let mut w = writer.lock();
        w.write_all(data).map_err(|e| format!("write: {e}"))?;
        w.flush().map_err(|e| format!("flush: {e}"))?;
        Ok(data.len())
    }

    pub fn resize(&self, id: &str, cols: u16, rows: u16) -> Result<(), String> {
        let sessions = self.sessions.lock();
        let handle = sessions.get(id).ok_or_else(|| format!("pty {id} not found"))?;
        let master = Arc::clone(&handle.master);
        drop(sessions);
        let m = master.lock();
        m.resize(PtySize {
            cols,
            rows,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("resize: {e}"))?;
        Ok(())
    }

    pub fn close(&self, id: &str) -> Result<(), String> {
        let mut sessions = self.sessions.lock();
        if let Some(handle) = sessions.remove(id) {
            // Best-effort SIGTERM
            let _ = handle.child.lock().kill();
            return Ok(());
        }
        Err(format!("pty {id} not found"))
    }
}

fn is_zsh(shell: &str) -> bool {
    Path::new(shell)
        .file_name()
        .and_then(|name| name.to_str())
        .is_some_and(|name| name == "zsh")
}

fn ensure_atlas_zsh_bootstrap() -> Result<PathBuf, String> {
    let home = std::env::var("HOME").map_err(|e| format!("HOME: {e}"))?;
    let dir = PathBuf::from(home).join(".atlas").join("terminal").join("zsh");
    fs::create_dir_all(&dir).map_err(|e| format!("create zsh bootstrap: {e}"))?;
    fs::write(dir.join(".zshrc"), ATLAS_ZSHRC).map_err(|e| format!("write zsh bootstrap: {e}"))?;
    Ok(dir)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::time::timeout;

    #[tokio::test]
    async fn pty_echoes_written_input_back_to_output_channel() {
        let manager = PtyManager::default();
        let (spawned, mut rx) = manager
            .open(PtyOpenRequest {
                id: Some("atlas-pty-test".to_string()),
                cwd: Some("/tmp".to_string()),
                shell: Some("/bin/zsh".to_string()),
                cols: Some(100),
                rows: Some(24),
                env: None,
            })
            .expect("pty should open");

        manager
            .write(&spawned.id, b"echo ATLAS_PTY_OK\n")
            .expect("pty should accept input");

        let mut output = String::new();
        let seen = timeout(Duration::from_secs(3), async {
            while let Some(chunk) = rx.recv().await {
                output.push_str(&String::from_utf8_lossy(&chunk));
                if output.contains("ATLAS_PTY_OK") {
                    return true;
                }
            }
            false
        })
        .await
        .expect("pty output timed out");

        let _ = manager.close(&spawned.id);
        assert!(seen, "expected command output, got: {output:?}");
    }
}
