//! atlas-tauri · Tauri shell for Atlas Code.
//!
//! Composes the native crates (atlas-bridge, atlas-platform, atlas-receipts,
//! atlas-canon) and exposes them to the React frontend via `tauri::command`.
//! No business logic here — just transport between webview and crates.

use atlas_bridge::{AtlasBridge, AtlasServerConfig};
use serde::Serialize;
use tauri::Manager;

mod commands_bridge;

#[derive(Serialize)]
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
        pty: "mock",
        signing: "mock",
    }
}

fn shellexpand_default(p: &str) -> String {
    if let Some(stripped) = p.strip_prefix("~/") {
        if let Some(home) = std::env::var_os("HOME") {
            return format!("{}/{}", home.to_string_lossy(), stripped);
        }
    }
    p.to_string()
}

/// Shared state across Tauri commands. Holds the AtlasBridge instance.
pub struct AppState {
    pub bridge: AtlasBridge,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "atlas_tauri=info,atlas_bridge=info".into()),
        )
        .with_target(false)
        .compact()
        .init();

    tauri::Builder::default()
        .setup(|app| {
            let config = AtlasServerConfig::default();
            let bridge = AtlasBridge::new(config).expect("failed to construct AtlasBridge");
            app.manage(AppState { bridge });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            atlas_core_status,
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
        .run(tauri::generate_context!())
        .expect("error while running Atlas Code");
}
