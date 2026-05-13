//! Tauri command wrappers around AtlasBridge.
//!
//! Each command:
//! - Takes a `State<'_, AppState>` to reach the shared bridge
//! - Clones the bridge out of the Mutex (cheap · reqwest::Client clone is Arc'd)
//!   so we hold the lock only for the snapshot, not for the network call
//! - Returns `Result<DTO, String>` (Tauri serializes the error string for JS)
//! - Logs via `tracing` so observability stays at the boundary

use crate::AppState;
use atlas_bridge::ApplyDiffAck;
use atlas_bridge::AtlasBridge;
use atlas_bridge::{
    DecisionReceiptDto, EvidenceDto, GateRunDto, HealthDto, MessageDto, ObraDto,
    QualityGateDto, ReceiptSignaturePayload, SessionDto, SignedReceiptAck,
};
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
    bridge_of(&state).await.list_obras().await.map_err(into_str_err)
}

// 3
#[tauri::command]
pub async fn bridge_create_obra(
    state: State<'_, AppState>,
    intent: String,
    objective: String,
) -> Result<ObraDto, String> {
    bridge_of(&state).await
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
    bridge_of(&state).await
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
    bridge_of(&state).await
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
    bridge_of(&state).await
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
    bridge_of(&state).await
        .get_receipt(&decision_id)
        .await
        .map_err(into_str_err)
}

// 9
#[tauri::command]
pub async fn bridge_sign_receipt(
    state: State<'_, AppState>,
    decision_id: String,
    signature: ReceiptSignaturePayload,
) -> Result<SignedReceiptAck, String> {
    bridge_of(&state).await
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
    bridge_of(&state).await
        .list_evidence(&obra_id)
        .await
        .map_err(into_str_err)
}

// 11a
#[tauri::command]
pub async fn bridge_list_gates(
    state: State<'_, AppState>,
) -> Result<Vec<QualityGateDto>, String> {
    bridge_of(&state).await.list_gates().await.map_err(into_str_err)
}

// 11b
#[tauri::command]
pub async fn bridge_run_gate(
    state: State<'_, AppState>,
    gate_id: String,
) -> Result<GateRunDto, String> {
    bridge_of(&state).await.run_gate(&gate_id).await.map_err(into_str_err)
}

// 12
#[tauri::command]
pub async fn bridge_apply_diff(
    state: State<'_, AppState>,
    patch_id: String,
    run_gates: Vec<String>,
) -> Result<ApplyDiffAck, String> {
    bridge_of(&state).await
        .apply_diff(&patch_id, run_gates)
        .await
        .map_err(into_str_err)
}

// ────────────────────────────────────────────────────────────────────────
// CARTOGRAPHY · read-only

#[tauri::command]
pub async fn bridge_cartography_graph(
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    bridge_of(&state).await.cartography_graph().await.map_err(into_str_err)
}

#[tauri::command]
pub async fn bridge_cartography_recent_changes(
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    bridge_of(&state).await
        .cartography_recent_changes()
        .await
        .map_err(into_str_err)
}

#[tauri::command]
pub async fn bridge_cartography_note(
    state: State<'_, AppState>,
    graph_id: String,
) -> Result<serde_json::Value, String> {
    bridge_of(&state).await
        .cartography_note(&graph_id)
        .await
        .map_err(into_str_err)
}
