//! Tauri command wrappers around AtlasBridge.
//!
//! Each command:
//! - Takes a `State<'_, AppState>` to reach the shared bridge.
//! - Returns `Result<DTO, String>` (Tauri serializes the error string for JS).
//! - Logs via `tracing` so observability stays at the boundary.

use crate::AppState;
use atlas_bridge::{
    DecisionReceiptDto, EvidenceDto, GateRunDto, HealthDto, MessageDto, ObraDto,
    QualityGateDto, ReceiptSignaturePayload, SessionDto, SignedReceiptAck,
};
use atlas_bridge::ApplyDiffAck;
use tauri::{Emitter, State};

fn into_str_err<E: std::fmt::Display>(e: E) -> String {
    let msg = e.to_string();
    tracing::warn!(error = %msg, "bridge command failed");
    msg
}

// 1
#[tauri::command]
pub async fn bridge_health(state: State<'_, AppState>) -> Result<HealthDto, String> {
    state.bridge.health().await.map_err(into_str_err)
}

// 2
#[tauri::command]
pub async fn bridge_list_obras(state: State<'_, AppState>) -> Result<Vec<ObraDto>, String> {
    state.bridge.list_obras().await.map_err(into_str_err)
}

// 3
#[tauri::command]
pub async fn bridge_create_obra(
    state: State<'_, AppState>,
    intent: String,
    objective: String,
) -> Result<ObraDto, String> {
    state
        .bridge
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
    state
        .bridge
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
    state
        .bridge
        .get_session(&thread_id)
        .await
        .map_err(into_str_err)
}

// 6 — streaming exposed via Tauri events (channel pattern). For MVP we emit
// `bridge://stream/{trace_id}` events. This thin command just kicks off the
// stream; the JS side listens on `tauri://event`.
#[tauri::command]
pub async fn bridge_stream_session(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    trace_id: String,
    after_sequence: Option<u64>,
) -> Result<(), String> {
    use futures_util::StreamExt;

    let mut stream = state
        .bridge
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
    state
        .bridge
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
    state
        .bridge
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
    state
        .bridge
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
    state
        .bridge
        .list_evidence(&obra_id)
        .await
        .map_err(into_str_err)
}

// 11a
#[tauri::command]
pub async fn bridge_list_gates(
    state: State<'_, AppState>,
) -> Result<Vec<QualityGateDto>, String> {
    state.bridge.list_gates().await.map_err(into_str_err)
}

// 11b
#[tauri::command]
pub async fn bridge_run_gate(
    state: State<'_, AppState>,
    gate_id: String,
) -> Result<GateRunDto, String> {
    state.bridge.run_gate(&gate_id).await.map_err(into_str_err)
}

// 12
#[tauri::command]
pub async fn bridge_apply_diff(
    state: State<'_, AppState>,
    patch_id: String,
    run_gates: Vec<String>,
) -> Result<ApplyDiffAck, String> {
    state
        .bridge
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
    state.bridge.cartography_graph().await.map_err(into_str_err)
}

#[tauri::command]
pub async fn bridge_cartography_recent_changes(
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    state
        .bridge
        .cartography_recent_changes()
        .await
        .map_err(into_str_err)
}

#[tauri::command]
pub async fn bridge_cartography_note(
    state: State<'_, AppState>,
    graph_id: String,
) -> Result<serde_json::Value, String> {
    state
        .bridge
        .cartography_note(&graph_id)
        .await
        .map_err(into_str_err)
}
