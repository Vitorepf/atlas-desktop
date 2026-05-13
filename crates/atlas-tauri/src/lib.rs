//! atlas-tauri · Tauri shell for Atlas Code.
//!
//! Composes the native crates (atlas-bridge, atlas-platform, atlas-receipts,
//! atlas-canon) and exposes them to the React frontend via `tauri::command`.
//! No business logic here — just transport between webview and crates.
//!
//! Enterprise pattern: the `.app` boots the entire backend itself (atlas-server
//! + queue worker) as managed sidecar processes via `kernel_manager`. The user
//! never opens extra terminals.

use std::sync::Arc;

use atlas_bridge::{AtlasBridge, AtlasServerConfig};
use serde::Serialize;
use tauri::{AppHandle, Manager, RunEvent};
use tokio::sync::Mutex;

mod commands_bridge;
mod kernel_manager;

use kernel_manager::{KernelManagerState, KernelStatusReport};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CoreStatus {
    mode: &'static str,
    db_path: String,
    workspace_path: String,
    pty: &'static str,
    signing: &'static str,
}

#[tauri::command]
fn atlas_core_status() -> CoreStatus {
    CoreStatus {
        mode: "tauri-core",
        db_path: shellexpand_default("~/.atlas/atlas.db"),
        workspace_path: std::env::current_dir()
            .ok()
            .and_then(|p| p.to_str().map(|s| s.to_string()))
            .unwrap_or_else(|| "~/develop/Atlas/atlas-server".to_string()),
        pty: "unavailable",
        signing: "unavailable",
    }
}

#[tauri::command]
async fn atlas_kernel_status(
    state: tauri::State<'_, Arc<KernelManagerState>>,
) -> Result<KernelStatusReport, String> {
    Ok(state.snapshot().await)
}

#[tauri::command]
async fn atlas_bridge_reconfigure(
    app: AppHandle,
) -> Result<(), String> {
    // Rebuild AtlasBridge from current env (after the kernel becomes ready
    // we exported ATLAS_SERVER_URL + ATLAS_TOKEN, so the new bridge picks them
    // up automatically).
    let new_bridge = AtlasBridge::new(AtlasServerConfig::default())
        .map_err(|e| e.to_string())?;
    let state: tauri::State<'_, AppState> = app.state();
    let mut guard = state.bridge.lock().await;
    *guard = new_bridge;
    Ok(())
}

fn shellexpand_default(p: &str) -> String {
    if let Some(stripped) = p.strip_prefix("~/") {
        if let Some(home) = std::env::var_os("HOME") {
            return format!("{}/{}", home.to_string_lossy(), stripped);
        }
    }
    p.to_string()
}

/// Shared state across Tauri commands. The bridge is wrapped in a Mutex so
/// we can hot-swap it once the Kernel sidecar comes online and we know the
/// real ATLAS_TOKEN to send with requests.
pub struct AppState {
    pub bridge: Mutex<AtlasBridge>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| {
                    "atlas_tauri=info,atlas_bridge=info,kernel_manager=info".into()
                }),
        )
        .with_target(true)
        .compact()
        .init();

    let kernel_state: Arc<KernelManagerState> = Arc::new(KernelManagerState::default());

    let app = tauri::Builder::default()
        .setup({
            let kernel_state = Arc::clone(&kernel_state);
            move |app| {
                // Initial bridge — empty config, will be hot-swapped when the
                // sidecar reports the kernel is ready.
                let bridge = AtlasBridge::new(AtlasServerConfig::default())
                    .expect("failed to construct AtlasBridge");
                app.manage(AppState {
                    bridge: Mutex::new(bridge),
                });
                app.manage(Arc::clone(&kernel_state));

                // Boot the Kernel sidecar in the background; the UI polls
                // atlas_kernel_status until status=ready, then re-reads
                // bridge data automatically.
                let app_handle = app.handle().clone();
                let kernel_state_for_task = Arc::clone(&kernel_state);
                tauri::async_runtime::spawn(async move {
                    let report = kernel_manager::boot(kernel_state_for_task).await;
                    if matches!(report.status, kernel_manager::KernelStatus::Ready) {
                        // Rebuild AtlasBridge with the freshly-exported env
                        // (ATLAS_SERVER_URL + ATLAS_TOKEN are set by boot()).
                        if let Ok(new_bridge) = AtlasBridge::new(AtlasServerConfig::default()) {
                            let state: tauri::State<'_, AppState> = app_handle.state();
                            let mut guard = state.bridge.lock().await;
                            *guard = new_bridge;
                        }
                        let _ = app_handle.emit("kernel://ready", &report);
                    } else {
                        let _ = app_handle.emit("kernel://failed", &report);
                    }
                });

                Ok(())
            }
        })
        .invoke_handler(tauri::generate_handler![
            atlas_core_status,
            atlas_kernel_status,
            atlas_bridge_reconfigure,
            commands_bridge::bridge_health,
            commands_bridge::bridge_list_obras,
            commands_bridge::bridge_create_obra,
            commands_bridge::bridge_list_sessions,
            commands_bridge::bridge_get_session,
            commands_bridge::bridge_stream_session,
            commands_bridge::bridge_send_intent,
            commands_bridge::bridge_get_receipt,
            commands_bridge::bridge_sign_receipt,
            commands_bridge::bridge_list_evidence,
            commands_bridge::bridge_list_gates,
            commands_bridge::bridge_run_gate,
            commands_bridge::bridge_apply_diff,
            commands_bridge::bridge_cartography_graph,
            commands_bridge::bridge_cartography_recent_changes,
            commands_bridge::bridge_cartography_note,
        ])
        .build(tauri::generate_context!())
        .expect("error while building Atlas Code");

    let kernel_state_for_exit = Arc::clone(&kernel_state);
    app.run(move |_app, event| {
        if let RunEvent::ExitRequested { .. } | RunEvent::Exit = event {
            let kernel_state = Arc::clone(&kernel_state_for_exit);
            tauri::async_runtime::block_on(async move {
                kernel_state.shutdown().await;
            });
        }
    });
}

use tauri::Emitter;
