use serde::Serialize;

#[derive(Serialize)]
struct CoreStatus {
    mode: &'static str,
    db_path: &'static str,
    workspace_path: &'static str,
    pty: &'static str,
    signing: &'static str,
}

#[tauri::command]
fn atlas_core_status() -> CoreStatus {
    CoreStatus {
        mode: "tauri-core",
        db_path: "~/.atlas/atlas.db",
        workspace_path: "~/develop/Atlas/atlas-server",
        pty: "mock",
        signing: "mock",
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![atlas_core_status])
        .run(tauri::generate_context!())
        .expect("error while running Atlas Code");
}
