//! Tauri command wrappers for the Atlas Vox Mac Edge (capture side).
//!
//! Scope (Onda 1 / Claude A):
//!   - Status: capture/hotkey availability, permissions, active session.
//!   - Push-to-talk lifecycle: start / finish / cancel a single session.
//!   - Eclipse: hard panic that drops every byte still in memory.
//!
//! No STT, no dictionary, no transcript — those belong to Claude B in
//! `commands_vox.rs`. No Kernel calls, no provider, no disk writes for
//! audio.
//!
//! Events emitted (per `prompt_synchronous_weaving_meteor.md`):
//!   - `vox://session-started`
//!   - `vox://audio-capture-started`
//!   - `vox://audio-capture-stopped`
//!   - `vox://session-ready-for-stt`
//!   - `vox://session-cancelled`
//!   - `vox://eclipse-activated`
//!   - `vox://error`

use std::sync::Arc;

use atlas_platform::vox::{
    parse_session_id, VoxAudioLevel, VoxEdge, VoxEdgeError, VoxEdgeSession, VoxEdgeStatus,
    VoxStartSessionRequest,
};
use serde::Serialize;
use tauri::{AppHandle, Emitter, State};

fn into_str_err(e: VoxEdgeError) -> String {
    let msg = e.to_string();
    tracing::warn!(target: "vox-edge", error = %msg, "vox edge command failed");
    msg
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct VoxErrorEvent {
    command: &'static str,
    error: String,
}

fn emit_error(app: &AppHandle, command: &'static str, error: &str) {
    let _ = app.emit(
        "vox://error",
        VoxErrorEvent {
            command,
            error: error.to_string(),
        },
    );
}

#[tauri::command]
pub fn vox_edge_status(edge: State<'_, Arc<VoxEdge>>) -> VoxEdgeStatus {
    edge.status()
}

#[tauri::command]
pub fn vox_edge_audio_level(
    edge: State<'_, Arc<VoxEdge>>,
    session_id: String,
) -> Result<Option<VoxAudioLevel>, String> {
    let parsed = parse_session_id(&session_id).map_err(into_str_err)?;
    Ok(edge.active_audio_level(parsed))
}

#[tauri::command]
pub fn vox_edge_start_session(
    edge: State<'_, Arc<VoxEdge>>,
    app: AppHandle,
    request: VoxStartSessionRequest,
) -> Result<VoxEdgeSession, String> {
    let session = match edge.start_session(request) {
        Ok(session) => session,
        Err(VoxEdgeError::AlreadyActive(existing)) => {
            // The React overlay can lose its local session reference after a
            // reload or a hotkey-started recording. Treat a duplicate start
            // as recovery: return the active session snapshot so the UI can
            // show "listening" and the operator can finish/cancel normally.
            edge.peek_session(existing).ok_or_else(|| {
                let msg = format!("vox session already active but not recoverable: {}", existing);
                tracing::warn!(target: "vox-edge", error = %msg, "vox edge command failed");
                emit_error(&app, "vox_edge_start_session", &msg);
                msg
            })?
        }
        Err(e) => {
            let msg = into_str_err(e);
            emit_error(&app, "vox_edge_start_session", &msg);
            return Err(msg);
        }
    };
    let _ = app.emit("vox://session-started", &session);
    let _ = app.emit("vox://audio-capture-started", &session);
    Ok(session)
}

#[tauri::command]
pub fn vox_edge_finish_session(
    edge: State<'_, Arc<VoxEdge>>,
    app: AppHandle,
    session_id: String,
) -> Result<VoxEdgeSession, String> {
    let parsed = parse_session_id(&session_id).map_err(|e| {
        let msg = into_str_err(e);
        emit_error(&app, "vox_edge_finish_session", &msg);
        msg
    })?;
    let session = edge.finish_session(parsed).map_err(|e| {
        let msg = into_str_err(e);
        emit_error(&app, "vox_edge_finish_session", &msg);
        msg
    })?;
    let _ = app.emit("vox://audio-capture-stopped", &session);
    let _ = app.emit("vox://session-ready-for-stt", &session);
    Ok(session)
}

#[tauri::command]
pub fn vox_edge_cancel_session(
    edge: State<'_, Arc<VoxEdge>>,
    app: AppHandle,
    session_id: String,
) -> Result<VoxEdgeSession, String> {
    let parsed = parse_session_id(&session_id).map_err(|e| {
        let msg = into_str_err(e);
        emit_error(&app, "vox_edge_cancel_session", &msg);
        msg
    })?;
    let session = edge.cancel_session(parsed).map_err(|e| {
        let msg = into_str_err(e);
        emit_error(&app, "vox_edge_cancel_session", &msg);
        msg
    })?;
    let _ = app.emit("vox://session-cancelled", &session);
    Ok(session)
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct VoxEclipseReport {
    pub touched_sessions: usize,
}

#[tauri::command]
pub fn vox_edge_eclipse(
    edge: State<'_, Arc<VoxEdge>>,
    app: AppHandle,
) -> VoxEclipseReport {
    let touched = edge.eclipse();
    let report = VoxEclipseReport {
        touched_sessions: touched,
    };
    let _ = app.emit("vox://eclipse-activated", &report);
    report
}
