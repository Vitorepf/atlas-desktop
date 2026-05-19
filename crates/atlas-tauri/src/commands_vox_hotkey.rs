//! Tauri commands + dispatcher for the Atlas Vox global-hotkey runtime
//! (Wave 6.5 / Claude K).
//!
//! Surface:
//!   - `vox_hotkey_status`        — health/registration snapshot
//!   - `vox_hotkey_record_escape` — the overlay calls this when the
//!                                  operator presses Esc inside Vox
//!
//! Events emitted (Tauri side):
//!   - `vox://hotkey-status-changed` (on start/stop and on register fail)
//!   - `vox://hotkey-toggle-recording`
//!   - `vox://hotkey-open-overlay`
//!   - `vox://hotkey-cancel`
//!   - `vox://hotkey-eclipse`
//!   - `vox://session-started` / `vox://audio-capture-started`
//!     (when toggle launches a new session)
//!   - `vox://audio-capture-stopped` / `vox://session-ready-for-stt`
//!     (when toggle finishes the current session)
//!   - `vox://eclipse-activated` (when Esc-Esc fires Eclipse)
//!   - `vox://error` (registration failure, session bridge failure)
//!
//! The dispatcher NEVER:
//!   - persists audio (driven by VoxEdge only)
//!   - calls a provider
//!   - executes a terminal command
//!   - logs raw transcript text

use std::sync::Arc;

use atlas_platform::vox::{
    HotkeyError, VoxConsent, VoxEdge, VoxEdgeError, VoxHotkeyEvent, VoxHotkeyRuntime,
    VoxHotkeyStatus, VoxMode, VoxSource, VoxStartSessionRequest, DEFAULT_LANGUAGE,
};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::sync::mpsc::UnboundedReceiver;

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct VoxHotkeyErrorEvent {
    command: &'static str,
    error: String,
}

fn emit_error(app: &AppHandle, command: &'static str, error: &str) {
    let _ = app.emit(
        "vox://error",
        VoxHotkeyErrorEvent {
            command,
            error: error.to_string(),
        },
    );
}

#[tauri::command]
pub fn vox_hotkey_status(runtime: State<'_, Arc<VoxHotkeyRuntime>>) -> VoxHotkeyStatus {
    runtime.status()
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct EscapeResolution {
    pub event: &'static str,
}

/// Called by the overlay's keyboard handler when the operator presses
/// Esc inside Atlas Vox. Returns whether the Rust runtime resolved that
/// to a single Cancel or a double-tap Eclipse — so the React side can
/// reflect the right state immediately while the dispatcher also fires
/// the corresponding `vox://hotkey-*` event.
#[tauri::command]
pub fn vox_hotkey_record_escape(
    runtime: State<'_, Arc<VoxHotkeyRuntime>>,
) -> EscapeResolution {
    let event = runtime.record_escape_press();
    EscapeResolution {
        event: match event {
            VoxHotkeyEvent::EclipseRequested => "eclipse",
            _ => "cancel",
        },
    }
}

/// Default session request used when the global hotkey toggles a fresh
/// recording. Mode = `dictation` because the operator hasn't picked one
/// yet — the overlay can offer V1/V2/V3 routing AFTER finish, since
/// VoxEdge captures audio independently of the downstream Kernel mode.
fn default_hotkey_session_request() -> VoxStartSessionRequest {
    VoxStartSessionRequest {
        source: VoxSource::MacEdgeHotkey,
        mode_requested: VoxMode::Dictation,
        language: DEFAULT_LANGUAGE.to_string(),
        consent: VoxConsent {
            audio_capture: true,
            context_share: false,
            debug_keep_audio: false,
        },
    }
}

/// Long-running task that drains the hotkey runtime's event channel and
/// reacts. Owned by the Tauri setup block; the join handle is dropped
/// when the app exits, at which point the runtime is also stopped and
/// the channel closes.
pub async fn run_dispatcher(
    app: AppHandle,
    edge: Arc<VoxEdge>,
    runtime: Arc<VoxHotkeyRuntime>,
    mut rx: UnboundedReceiver<VoxHotkeyEvent>,
) {
    let _ = app.emit("vox://hotkey-status-changed", &runtime.status());

    while let Some(event) = rx.recv().await {
        match event {
            VoxHotkeyEvent::ToggleRecordingRequested => {
                let _ = app.emit("vox://hotkey-toggle-recording", &runtime.status());
                handle_toggle(&app, &edge);
                bring_overlay_forward(&app);
            }
            VoxHotkeyEvent::OpenOverlayRequested => {
                let _ = app.emit("vox://hotkey-open-overlay", &runtime.status());
                bring_overlay_forward(&app);
            }
            VoxHotkeyEvent::CancelRequested => {
                let _ = app.emit("vox://hotkey-cancel", &runtime.status());
                if let Some(active_id) = edge.status().active_session_id {
                    if let Err(e) = cancel_session_by_id(&edge, &active_id) {
                        emit_error(&app, "vox_hotkey_cancel", &e);
                    }
                }
            }
            VoxHotkeyEvent::EclipseRequested => {
                let touched = edge.eclipse();
                let _ = app.emit("vox://hotkey-eclipse", &runtime.status());
                let _ = app.emit(
                    "vox://eclipse-activated",
                    serde_json::json!({ "touched_sessions": touched }),
                );
            }
        }
    }
}

/// Reads VoxEdge's status and either starts a new session (no active
/// session) or finishes the current one (active session present).
/// Failures are surfaced via `vox://error` — the dispatcher never panics.
fn handle_toggle(app: &AppHandle, edge: &Arc<VoxEdge>) {
    let active = edge.status().active_session_id;
    match active {
        Some(session_id) => match finish_session_by_id(edge, &session_id) {
            Ok(session) => {
                let _ = app.emit("vox://audio-capture-stopped", &session);
                let _ = app.emit("vox://session-ready-for-stt", &session);
            }
            Err(e) => emit_error(app, "vox_hotkey_toggle_finish", &e),
        },
        None => match edge.start_session(default_hotkey_session_request()) {
            Ok(session) => {
                let _ = app.emit("vox://session-started", &session);
                let _ = app.emit("vox://audio-capture-started", &session);
            }
            Err(VoxEdgeError::AlreadyActive(_)) => {
                // Race: status said inactive but a session started between
                // the read and the start. Treat as a no-op and let the
                // next toggle do the right thing. Do not error-emit.
            }
            Err(e) => emit_error(app, "vox_hotkey_toggle_start", &e.to_string()),
        },
    }
}

fn finish_session_by_id(
    edge: &Arc<VoxEdge>,
    session_id: &str,
) -> Result<atlas_platform::vox::VoxEdgeSession, String> {
    let parsed = atlas_platform::vox::parse_session_id(session_id).map_err(|e| e.to_string())?;
    edge.finish_session(parsed).map_err(|e| e.to_string())
}

fn cancel_session_by_id(edge: &Arc<VoxEdge>, session_id: &str) -> Result<(), String> {
    let parsed = atlas_platform::vox::parse_session_id(session_id).map_err(|e| e.to_string())?;
    edge.cancel_session(parsed)
        .map(|_| ())
        .map_err(|e| e.to_string())
}

fn bring_overlay_forward(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

/// Helper called from `lib.rs::run()` once per process. Starts the
/// runtime, manages it as Tauri state, and spawns the dispatcher async
/// task. On registration failure the runtime is still managed (so the
/// status command works) but `available=false` and `last_error` is set.
pub fn install(
    app_handle: &AppHandle,
    edge: Arc<VoxEdge>,
) {
    let runtime: Arc<VoxHotkeyRuntime> = Arc::new(VoxHotkeyRuntime::new());

    match runtime.start() {
        Ok(rx) => {
            app_handle.manage(Arc::clone(&runtime));
            let app_for_task = app_handle.clone();
            let edge_for_task = Arc::clone(&edge);
            let runtime_for_task = Arc::clone(&runtime);
            tauri::async_runtime::spawn(async move {
                run_dispatcher(app_for_task, edge_for_task, runtime_for_task, rx).await;
            });
        }
        Err(err) => {
            tracing::warn!(
                target: "vox-hotkey",
                error = %err,
                "VoxHotkeyRuntime start failed — installing runtime in disabled state"
            );
            app_handle.manage(Arc::clone(&runtime));
            let status = runtime.status();
            let _ = app_handle.emit("vox://hotkey-status-changed", &status);
            let detail = match err {
                HotkeyError::ManagerInit(msg) => format!("manager_init: {msg}"),
                HotkeyError::Registration(msg) => format!("register: {msg}"),
                HotkeyError::AlreadyStarted => "already_started".to_string(),
                HotkeyError::UnsupportedPlatform => "unsupported_platform".to_string(),
            };
            emit_error(app_handle, "vox_hotkey_install", &detail);
        }
    }
}
