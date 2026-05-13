//! Tauri command wrappers around AtlasBridge + native crates.
//!
//! Each command:
//! - Takes a `State<'_, AppState>` to reach the shared bridge
//! - Clones the bridge out of the Mutex (cheap · reqwest::Client clone is Arc'd)
//!   so we hold the lock only for the snapshot, not for the network call
//! - Returns `Result<DTO, String>` (Tauri serializes the error string for JS)
//! - Logs via `tracing` so observability stays at the boundary
//!
//! Native commands (PTY, sign, open_external) live here too because they
//! need access to the AppState (PTY manager, signer).

use crate::AppState;
use atlas_bridge::ApplyDiffAck;
use atlas_bridge::AtlasBridge;
use atlas_bridge::{
    DecisionReceiptDto, EvidenceDto, GateRunDto, HealthDto, MessageDto, ObraDto, QualityGateDto,
    ReceiptSignaturePayload as BridgeReceiptSignaturePayload, SessionDto, SignedReceiptAck,
};
use atlas_platform::{PtyManager, PtyOpenRequest, PtySpawnedEvent};
use atlas_receipts::ReceiptSigner;
use serde::Serialize;
use std::sync::Arc;
use tauri::{Emitter, State};

fn into_str_err<E: std::fmt::Display>(e: E) -> String {
    let msg = e.to_string();
    tracing::warn!(error = %msg, "bridge command failed");
    msg
}

async fn bridge_of(state: &State<'_, AppState>) -> AtlasBridge {
    state.bridge.lock().await.clone()
}

// 1
#[tauri::command]
pub async fn bridge_health(state: State<'_, AppState>) -> Result<HealthDto, String> {
    bridge_of(&state).await.health().await.map_err(into_str_err)
}

// 2
#[tauri::command]
pub async fn bridge_list_obras(state: State<'_, AppState>) -> Result<Vec<ObraDto>, String> {
    bridge_of(&state)
        .await
        .list_obras()
        .await
        .map_err(into_str_err)
}

// 3
#[tauri::command]
pub async fn bridge_create_obra(
    state: State<'_, AppState>,
    intent: String,
    objective: String,
) -> Result<ObraDto, String> {
    bridge_of(&state)
        .await
        .create_obra(&intent, &objective)
        .await
        .map_err(into_str_err)
}

// 4
#[tauri::command]
pub async fn bridge_list_sessions(
    state: State<'_, AppState>,
    obra_id: String,
) -> Result<Vec<SessionDto>, String> {
    bridge_of(&state)
        .await
        .list_sessions(&obra_id)
        .await
        .map_err(into_str_err)
}

// 5
#[tauri::command]
pub async fn bridge_get_session(
    state: State<'_, AppState>,
    thread_id: String,
) -> Result<Vec<MessageDto>, String> {
    bridge_of(&state)
        .await
        .get_session(&thread_id)
        .await
        .map_err(into_str_err)
}

// 6 — streaming exposed via Tauri events.
#[tauri::command]
pub async fn bridge_stream_session(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    trace_id: String,
    after_sequence: Option<u64>,
) -> Result<(), String> {
    use futures_util::StreamExt;

    let bridge = bridge_of(&state).await;
    let mut stream = bridge
        .stream_session(&trace_id, after_sequence)
        .await
        .map_err(into_str_err)?;

    let event_name = format!("bridge://stream/{trace_id}");
    while let Some(item) = stream.next().await {
        match item {
            Ok(event) => {
                let _ = app.emit(&event_name, event);
            }
            Err(e) => {
                tracing::warn!(error = %e, "stream error");
                break;
            }
        }
    }
    Ok(())
}

// 7
#[tauri::command]
pub async fn bridge_send_intent(
    state: State<'_, AppState>,
    session_id: String,
    body: String,
    channel: String,
) -> Result<MessageDto, String> {
    bridge_of(&state)
        .await
        .send_intent(&session_id, &body, &channel)
        .await
        .map_err(into_str_err)
}

// 8
#[tauri::command]
pub async fn bridge_get_receipt(
    state: State<'_, AppState>,
    decision_id: String,
) -> Result<DecisionReceiptDto, String> {
    bridge_of(&state)
        .await
        .get_receipt(&decision_id)
        .await
        .map_err(into_str_err)
}

// 9
#[tauri::command]
pub async fn bridge_sign_receipt(
    state: State<'_, AppState>,
    decision_id: String,
    signature: BridgeReceiptSignaturePayload,
) -> Result<SignedReceiptAck, String> {
    bridge_of(&state)
        .await
        .sign_receipt(&decision_id, signature)
        .await
        .map_err(into_str_err)
}

// 10
#[tauri::command]
pub async fn bridge_list_evidence(
    state: State<'_, AppState>,
    obra_id: String,
) -> Result<Vec<EvidenceDto>, String> {
    bridge_of(&state)
        .await
        .list_evidence(&obra_id)
        .await
        .map_err(into_str_err)
}

// 11a
#[tauri::command]
pub async fn bridge_list_gates(state: State<'_, AppState>) -> Result<Vec<QualityGateDto>, String> {
    bridge_of(&state)
        .await
        .list_gates()
        .await
        .map_err(into_str_err)
}

// 11b
#[tauri::command]
pub async fn bridge_run_gate(
    state: State<'_, AppState>,
    gate_id: String,
) -> Result<GateRunDto, String> {
    bridge_of(&state)
        .await
        .run_gate(&gate_id)
        .await
        .map_err(into_str_err)
}

// 12
#[tauri::command]
pub async fn bridge_apply_diff(
    state: State<'_, AppState>,
    patch_id: String,
    run_gates: Vec<String>,
) -> Result<ApplyDiffAck, String> {
    bridge_of(&state)
        .await
        .apply_diff(&patch_id, run_gates)
        .await
        .map_err(into_str_err)
}

// ────────────────────────────────────────────────────────────────────────
// V2 · production-readiness endpoints (ADR-0002)
// All return raw serde_json::Value — frontend adapter owns the shape.

#[tauri::command]
pub async fn bridge_boot(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    bridge_of(&state)
        .await
        .boot_snapshot()
        .await
        .map_err(into_str_err)
}

#[tauri::command]
pub async fn bridge_mcp_status(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    bridge_of(&state)
        .await
        .mcp_status()
        .await
        .map_err(into_str_err)
}

#[tauri::command]
pub async fn bridge_list_works(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    bridge_of(&state)
        .await
        .list_works()
        .await
        .map_err(into_str_err)
}

#[tauri::command]
pub async fn bridge_create_work(
    state: State<'_, AppState>,
    intent: String,
    objective: String,
    domain: Option<String>,
) -> Result<serde_json::Value, String> {
    bridge_of(&state)
        .await
        .create_work(&intent, &objective, domain.as_deref())
        .await
        .map_err(into_str_err)
}

#[tauri::command]
pub async fn bridge_get_work_state(
    state: State<'_, AppState>,
    work_id: String,
) -> Result<serde_json::Value, String> {
    bridge_of(&state)
        .await
        .get_work_state(&work_id)
        .await
        .map_err(into_str_err)
}

#[tauri::command]
pub async fn bridge_get_thread(
    state: State<'_, AppState>,
    thread_id: String,
) -> Result<serde_json::Value, String> {
    bridge_of(&state)
        .await
        .get_thread_v2(&thread_id)
        .await
        .map_err(into_str_err)
}

#[tauri::command]
pub async fn bridge_send_intent_v2(
    state: State<'_, AppState>,
    thread_id: Option<String>,
    body: String,
    channel: Option<String>,
    obra_id: Option<String>,
) -> Result<serde_json::Value, String> {
    bridge_of(&state)
        .await
        .send_intent_v2(
            thread_id.as_deref(),
            &body,
            channel.as_deref(),
            obra_id.as_deref(),
        )
        .await
        .map_err(into_str_err)
}

#[tauri::command]
pub async fn bridge_get_receipt_v2(
    state: State<'_, AppState>,
    decision_id: String,
) -> Result<serde_json::Value, String> {
    bridge_of(&state)
        .await
        .get_receipt_v2(&decision_id)
        .await
        .map_err(into_str_err)
}

#[tauri::command]
pub async fn bridge_list_gate_runs(
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    bridge_of(&state)
        .await
        .list_gate_runs_raw()
        .await
        .map_err(into_str_err)
}

// ────────────────────────────────────────────────────────────────────────
// CARTOGRAPHY · read-only

#[tauri::command]
pub async fn bridge_cartography_graph(
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    bridge_of(&state)
        .await
        .cartography_graph()
        .await
        .map_err(into_str_err)
}

#[tauri::command]
pub async fn bridge_cartography_recent_changes(
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    bridge_of(&state)
        .await
        .cartography_recent_changes()
        .await
        .map_err(into_str_err)
}

#[tauri::command]
pub async fn bridge_cartography_note(
    state: State<'_, AppState>,
    graph_id: String,
) -> Result<serde_json::Value, String> {
    bridge_of(&state)
        .await
        .cartography_note(&graph_id)
        .await
        .map_err(into_str_err)
}

// ────────────────────────────────────────────────────────────────────────
// PTY · real terminal sessions via atlas-platform

#[tauri::command]
pub async fn pty_open(
    pty: State<'_, Arc<PtyManager>>,
    app: tauri::AppHandle,
    request: PtyOpenRequest,
) -> Result<PtySpawnedEvent, String> {
    let pty_manager = Arc::clone(&pty);
    let (event, mut rx) = pty_manager.open(request)?;
    let id = event.id.clone();

    // Forward stdout/stderr chunks to a Tauri event the React side
    // listens to. xterm.js writes them to the visible terminal.
    let app_clone = app.clone();
    let id_for_data = id.clone();
    tauri::async_runtime::spawn(async move {
        while let Some(chunk) = rx.recv().await {
            let payload = serde_json::json!({
                "id": id_for_data,
                "data": String::from_utf8_lossy(&chunk).to_string(),
            });
            let _ = app_clone.emit(&format!("pty://data/{id_for_data}"), payload);
        }
        let _ = app_clone.emit(
            &format!("pty://exit/{id_for_data}"),
            serde_json::json!({ "id": id_for_data }),
        );
    });

    Ok(event)
}

#[tauri::command]
pub async fn pty_write(
    pty: State<'_, Arc<PtyManager>>,
    id: String,
    data: String,
) -> Result<u64, String> {
    let n = pty.write(&id, data.as_bytes())?;
    Ok(n as u64)
}

#[tauri::command]
pub async fn pty_resize(
    pty: State<'_, Arc<PtyManager>>,
    id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    pty.resize(&id, cols, rows)
}

#[tauri::command]
pub async fn pty_close(pty: State<'_, Arc<PtyManager>>, id: String) -> Result<(), String> {
    pty.close(&id)
}

// ────────────────────────────────────────────────────────────────────────
// SIGN · ed25519 canonical Decision-Receipt signature

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CanonicalSignatureDto {
    pub signature: String,
    pub public_key: String,
    pub signed_at: String,
    pub signer_id: String,
}

#[tauri::command]
pub async fn sign_canonical(
    decision_id: String,
    signer_id: Option<String>,
) -> Result<CanonicalSignatureDto, String> {
    let signed_at = chrono::Utc::now();
    let signer = signer_id.as_deref();
    let payload = ReceiptSigner::new()
        .sign_decision(&decision_id, signed_at, signer)
        .map_err(|e| e.to_string())?;
    Ok(CanonicalSignatureDto {
        signature: payload.signature,
        public_key: payload.public_key,
        signed_at: payload
            .signed_at
            .format("%Y-%m-%dT%H:%M:%S+00:00")
            .to_string(),
        signer_id: payload.signer_id,
    })
}

// ────────────────────────────────────────────────────────────────────────
// VCS · read-only · current git branch for a cwd

#[tauri::command]
pub async fn git_branch(path: String) -> Result<Option<String>, String> {
    use std::path::Path;
    use std::time::Duration;
    use tokio::time::timeout;

    if !Path::new(&path).is_dir() {
        return Ok(None);
    }
    let path_owned = path.clone();
    let blocking = tokio::task::spawn_blocking(move || {
        std::process::Command::new("git")
            .args(["-C", &path_owned, "rev-parse", "--abbrev-ref", "HEAD"])
            .output()
    });
    let result = match timeout(Duration::from_millis(500), blocking).await {
        Ok(Ok(out)) => out,
        _ => return Ok(None),
    };

    match result {
        Ok(out) if out.status.success() => {
            let branch = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if branch.is_empty() || branch == "HEAD" {
                Ok(None)
            } else {
                Ok(Some(branch))
            }
        }
        _ => Ok(None),
    }
}

// ────────────────────────────────────────────────────────────────────────
// OS shell · open external URL or reveal in Finder

#[tauri::command]
pub async fn open_external(url: String) -> Result<(), String> {
    open_url(&url)
}

#[tauri::command]
pub async fn reveal_in_finder(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("-R")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
        return Ok(());
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = path;
        Err("reveal_in_finder available on macOS only".to_string())
    }
}

fn open_url(url: &str) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(url)
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(url)
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", url])
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
    {
        let _ = url;
        Err("open_url unsupported on this platform".to_string())
    }
}
