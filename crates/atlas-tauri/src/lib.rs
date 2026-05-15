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
use atlas_platform::PtyManager;
use serde::Serialize;
use tauri::{AppHandle, Manager, RunEvent};
use tokio::sync::Mutex;

mod commands_bridge;
mod kernel_manager;
mod native_menu;

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
        workspace_path: atlas_workspace_path(),
        pty: "portable-pty",
        signing: "ed25519",
    }
}

fn atlas_workspace_path() -> String {
    if let Ok(path) = std::env::var("ATLAS_DESKTOP_WORKSPACE") {
        if std::path::Path::new(&path).is_dir() {
            return path;
        }
    }

    if let Ok(path) = std::env::current_dir() {
        if path.is_dir() && path != std::path::Path::new("/") {
            return path.to_string_lossy().to_string();
        }
    }

    for candidate in [
        "~/develop/Atlas/atlas-desktop",
        "~/develop/Atlas/atlas-server",
        "~/develop/Atlas",
    ] {
        let expanded = shellexpand_default(candidate);
        if std::path::Path::new(&expanded).is_dir() {
            return expanded;
        }
    }

    shellexpand_default("~/develop/Atlas")
}

#[tauri::command]
async fn atlas_kernel_status(
    state: tauri::State<'_, Arc<KernelManagerState>>,
) -> Result<KernelStatusReport, String> {
    Ok(state.snapshot().await)
}

/// Re-runs the kernel boot sequence. Idempotent — adopts an already-running
/// server if /health responds. Returns the fresh status report.
#[tauri::command]
async fn atlas_kernel_retry(
    app: AppHandle,
    state: tauri::State<'_, Arc<KernelManagerState>>,
) -> Result<KernelStatusReport, String> {
    // Kill any old children before re-spawning, to avoid two artisan serves
    // on :8001 both crashing.
    state.shutdown().await;

    let report = kernel_manager::boot(Arc::clone(&state)).await;
    if matches!(report.status, kernel_manager::KernelStatus::Ready) {
        if let Ok(new_bridge) = AtlasBridge::new(AtlasServerConfig::default()) {
            let app_state: tauri::State<'_, AppState> = app.state();
            let mut guard = app_state.bridge.lock().await;
            *guard = new_bridge;
        }
        let _ = app.emit("kernel://ready", &report);
    } else {
        let _ = app.emit("kernel://failed", &report);
    }
    Ok(report)
}

#[tauri::command]
async fn atlas_bridge_reconfigure(app: AppHandle) -> Result<(), String> {
    // Rebuild AtlasBridge from current env (after the kernel becomes ready
    // we exported ATLAS_SERVER_URL + ATLAS_TOKEN, so the new bridge picks them
    // up automatically).
    let new_bridge = AtlasBridge::new(AtlasServerConfig::default()).map_err(|e| e.to_string())?;
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
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| {
                "atlas_tauri=info,atlas_bridge=info,kernel_manager=info".into()
            }),
        )
        .with_target(true)
        .compact()
        .init();

    let kernel_state: Arc<KernelManagerState> = Arc::new(KernelManagerState::default());
    let pty_manager: Arc<PtyManager> = PtyManager::new();

    let app = tauri::Builder::default()
        .menu(native_menu::atlas_menu)
        .on_menu_event(native_menu::handle_menu_event)
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
                app.manage(Arc::clone(&pty_manager));

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
            atlas_kernel_retry,
            atlas_bridge_reconfigure,
            commands_bridge::bridge_boot,
            commands_bridge::bridge_mcp_status,
            commands_bridge::bridge_get_atlas_code_enterprise_certification,
            commands_bridge::bridge_run_atlas_code_enterprise_certification,
            commands_bridge::bridge_list_works,
            commands_bridge::bridge_create_work,
            commands_bridge::bridge_get_work_state,
            commands_bridge::bridge_run_forge_live_execution,
            commands_bridge::bridge_start_forge_live_execution_async,
            commands_bridge::bridge_get_forge_live_execution_async,
            commands_bridge::bridge_get_forge_run_history_replay,
            commands_bridge::bridge_create_programming_work_item,
            commands_bridge::bridge_compile_programming_work_item_spec_plan,
            commands_bridge::bridge_run_forge_fast_path,
            commands_bridge::bridge_get_forge_fast_path_status,
            commands_bridge::bridge_resume_forge_fast_path,
            commands_bridge::bridge_get_forge_review_packet,
            commands_bridge::bridge_decide_forge_review,
            commands_bridge::bridge_get_forge_work_intake,
            commands_bridge::bridge_save_forge_work_intake,
            commands_bridge::bridge_get_forge_provider_topology,
            commands_bridge::bridge_get_forge_continuum_certification,
            commands_bridge::bridge_get_forge_provider_capacity,
            commands_bridge::bridge_record_forge_provider_failure,
            commands_bridge::bridge_run_forge_runtime_dispatch,
            commands_bridge::bridge_get_forge_runtime_dispatch,
            commands_bridge::bridge_run_forge_provider_invocation,
            commands_bridge::bridge_get_forge_provider_invocation_latest,
            commands_bridge::bridge_get_forge_ux_orchestrator,
            commands_bridge::bridge_get_provider_arena_snapshot,
            commands_bridge::bridge_run_provider_arena,
            commands_bridge::bridge_get_forge_provider_drivers,
            commands_bridge::bridge_plan_forge_provider_driver,
            commands_bridge::bridge_create_checkpoint,
            commands_bridge::bridge_review_forge_run,
            commands_bridge::bridge_rollback_forge_promotion,
            commands_bridge::bridge_get_thread,
            commands_bridge::bridge_send_intent_v2,
            commands_bridge::bridge_get_receipt_v2,
            commands_bridge::bridge_list_gate_runs,
            commands_bridge::pty_open,
            commands_bridge::pty_write,
            commands_bridge::pty_resize,
            commands_bridge::pty_close,
            commands_bridge::sign_canonical,
            commands_bridge::open_external,
            commands_bridge::reveal_in_finder,
            commands_bridge::git_branch,
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
            commands_bridge::bridge_list_self_improvement_forge_activations,
            commands_bridge::bridge_get_self_improvement_forge_activation,
            commands_bridge::bridge_create_self_improvement_forge_activation,
            commands_bridge::bridge_accept_self_improvement_forge_activation,
            commands_bridge::bridge_reject_self_improvement_forge_activation,
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
