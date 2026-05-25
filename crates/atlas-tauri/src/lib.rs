//! atlas-tauri · Tauri shell for Atlas Code.
//!
//! Composes the native crates (atlas-bridge, atlas-platform, atlas-receipts,
//! atlas-canon) and exposes them to the React frontend via `tauri::command`.
//! No business logic here — just transport between webview and crates.
//!
//! Enterprise pattern: the `.app` boots the entire backend itself (atlas-server
//! + queue worker) as managed sidecar processes via `kernel_manager`. The user
//! never opens extra terminals.

use std::collections::{HashMap, HashSet, VecDeque};
use std::path::{Path, PathBuf};
use std::sync::Arc;

use atlas_bridge::{AtlasBridge, AtlasServerConfig};
use atlas_platform::vox::{VoxEdge, VoxEdgeConfig};
use atlas_platform::PtyManager;
use serde::Serialize;
use tauri::{AppHandle, Manager, RunEvent};
use tokio::sync::Mutex;

mod commands_bridge;
mod commands_terminal;
mod commands_vox;
mod commands_vox_benchmark;
mod commands_vox_edge;
mod commands_vox_hotkey;
mod commands_vox_reply;
mod commands_vox_setup;
mod kernel_manager;
mod native_menu;
mod vox_ambient_launch;

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

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceBrainSnapshot {
    status: &'static str,
    root_name: String,
    root_path: String,
    scanned_at: String,
    is_git: bool,
    files_seen: usize,
    dirs_seen: usize,
    ignored_dirs: usize,
    max_depth: usize,
    truncated: bool,
    languages: Vec<WorkspaceBrainLanguage>,
    signals: Vec<String>,
    important_files: Vec<WorkspaceBrainFile>,
    commands: Vec<WorkspaceBrainCommand>,
    notes: Vec<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceBrainLanguage {
    label: String,
    count: usize,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceBrainFile {
    path: String,
    kind: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceBrainCommand {
    label: String,
    command: String,
    kind: String,
    source: String,
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
async fn atlas_pick_workspace_folder() -> Result<Option<String>, String> {
    let picked = tauri::async_runtime::spawn_blocking(|| {
        rfd::FileDialog::new()
            .set_title("Escolher pasta do projeto")
            .pick_folder()
    })
    .await
    .map_err(|e| format!("folder_picker_join_failed: {e}"))?;

    Ok(picked.map(|path| path.to_string_lossy().to_string()))
}

#[tauri::command]
async fn atlas_scan_workspace_brain(workspace_path: String) -> Result<WorkspaceBrainSnapshot, String> {
    tauri::async_runtime::spawn_blocking(move || scan_workspace_brain(workspace_path))
        .await
        .map_err(|e| format!("workspace_brain_join_failed: {e}"))?
}

fn scan_workspace_brain(workspace_path: String) -> Result<WorkspaceBrainSnapshot, String> {
    const MAX_FILES: usize = 6_000;
    const MAX_DIRS: usize = 1_200;
    const MAX_DEPTH: usize = 6;
    const MAX_IMPORTANT_FILES: usize = 80;

    let root = std::fs::canonicalize(PathBuf::from(workspace_path.trim()))
        .map_err(|e| format!("workspace_path_unavailable: {e}"))?;
    if !root.is_dir() {
        return Err("workspace_path_not_a_directory".into());
    }
    if root.parent().is_none() {
        return Err("workspace_path_too_broad".into());
    }

    let mut files_seen = 0usize;
    let mut dirs_seen = 0usize;
    let mut ignored_dirs = 0usize;
    let mut truncated = false;
    let mut languages: HashMap<String, usize> = HashMap::new();
    let mut signals: HashSet<String> = HashSet::new();
    let mut important_files: Vec<WorkspaceBrainFile> = Vec::new();
    let mut commands: Vec<WorkspaceBrainCommand> = Vec::new();
    let mut notes: Vec<String> = Vec::new();
    let mut queue: VecDeque<(PathBuf, usize)> = VecDeque::from([(root.clone(), 0)]);

    while let Some((dir, depth)) = queue.pop_front() {
        if dirs_seen >= MAX_DIRS || files_seen >= MAX_FILES {
            truncated = true;
            break;
        }
        dirs_seen += 1;
        let entries = match std::fs::read_dir(&dir) {
            Ok(entries) => entries,
            Err(_) => {
                notes.push(format!("sem leitura: {}", relative_path(&root, &dir)));
                continue;
            }
        };

        for entry in entries.flatten() {
            if dirs_seen >= MAX_DIRS || files_seen >= MAX_FILES {
                truncated = true;
                break;
            }
            let path = entry.path();
            let file_type = match entry.file_type() {
                Ok(file_type) => file_type,
                Err(_) => continue,
            };
            let name = entry.file_name().to_string_lossy().to_string();

            if file_type.is_dir() {
                if should_ignore_dir(&name) {
                    ignored_dirs += 1;
                    continue;
                }
                if depth < MAX_DEPTH {
                    queue.push_back((path, depth + 1));
                } else {
                    truncated = true;
                }
                continue;
            }

            if !file_type.is_file() {
                continue;
            }

            files_seen += 1;
            if let Some(language) = language_for_path(&path) {
                *languages.entry(language.to_string()).or_insert(0) += 1;
            }

            let relative = relative_path(&root, &path);
            detect_file_signals(&name, &relative, &mut signals);
            if is_important_file(&name, &relative) && important_files.len() < MAX_IMPORTANT_FILES {
                important_files.push(WorkspaceBrainFile {
                    path: relative.clone(),
                    kind: important_file_kind(&name, &relative).to_string(),
                });
            }
            collect_commands_from_manifest(&path, &relative, &name, &mut commands);
        }
    }

    if truncated {
        notes.push("scan limitado para manter desempenho".into());
    }
    if ignored_dirs > 0 {
        notes.push(format!("{ignored_dirs} pastas pesadas ignoradas"));
    }

    let mut languages: Vec<WorkspaceBrainLanguage> = languages
        .into_iter()
        .map(|(label, count)| WorkspaceBrainLanguage { label, count })
        .collect();
    languages.sort_by(|a, b| b.count.cmp(&a.count).then_with(|| a.label.cmp(&b.label)));
    languages.truncate(8);

    let mut signals: Vec<String> = signals.into_iter().collect();
    signals.sort();
    signals.truncate(16);
    dedupe_commands(&mut commands);
    commands.truncate(12);

    Ok(WorkspaceBrainSnapshot {
        status: "ready",
        root_name: root
            .file_name()
            .map(|name| name.to_string_lossy().to_string())
            .unwrap_or_else(|| "Workspace".into()),
        root_path: root.to_string_lossy().to_string(),
        scanned_at: chrono::Utc::now().to_rfc3339(),
        is_git: root.join(".git").is_dir(),
        files_seen,
        dirs_seen,
        ignored_dirs,
        max_depth: MAX_DEPTH,
        truncated,
        languages,
        signals,
        important_files,
        commands,
        notes,
    })
}

fn should_ignore_dir(name: &str) -> bool {
    matches!(
        name,
        ".git"
            | "node_modules"
            | "target"
            | "dist"
            | "build"
            | ".next"
            | ".nuxt"
            | ".turbo"
            | ".cache"
            | "coverage"
            | "DerivedData"
            | "Pods"
            | ".venv"
            | "venv"
            | "vendor"
            | ".dart_tool"
            | ".gradle"
            | ".idea"
    )
}

fn language_for_path(path: &Path) -> Option<&'static str> {
    let extension = path.extension()?.to_string_lossy().to_ascii_lowercase();
    match extension.as_str() {
        "ts" | "tsx" => Some("TypeScript"),
        "js" | "jsx" | "mjs" | "cjs" => Some("JavaScript"),
        "rs" => Some("Rust"),
        "php" => Some("PHP"),
        "swift" => Some("Swift"),
        "kt" | "kts" => Some("Kotlin"),
        "py" => Some("Python"),
        "go" => Some("Go"),
        "java" => Some("Java"),
        "css" | "scss" | "sass" => Some("CSS"),
        "md" | "mdx" => Some("Docs"),
        "json" | "toml" | "yaml" | "yml" => Some("Config"),
        _ => None,
    }
}

fn detect_file_signals(name: &str, relative: &str, signals: &mut HashSet<String>) {
    let lower_name = name.to_ascii_lowercase();
    let lower_relative = relative.to_ascii_lowercase();
    match lower_name.as_str() {
        "package.json" => {
            signals.insert("Node/JavaScript".into());
        }
        "pnpm-lock.yaml" => {
            signals.insert("pnpm".into());
        }
        "package-lock.json" => {
            signals.insert("npm".into());
        }
        "yarn.lock" => {
            signals.insert("Yarn".into());
        }
        "cargo.toml" => {
            signals.insert("Rust/Cargo".into());
        }
        "tauri.conf.json" | "tauri.conf.json5" => {
            signals.insert("Tauri".into());
        }
        "composer.json" => {
            signals.insert("PHP/Composer".into());
        }
        "artisan" => {
            signals.insert("Laravel".into());
        }
        "package.swift" => {
            signals.insert("Swift Package".into());
        }
        "podfile" => {
            signals.insert("CocoaPods".into());
        }
        "pubspec.yaml" => {
            signals.insert("Flutter/Dart".into());
        }
        _ => {}
    }
    if lower_relative.contains("vite.config.") {
        signals.insert("Vite".into());
    }
    if lower_relative.contains("next.config.") {
        signals.insert("Next.js".into());
    }
    if lower_relative.contains("tailwind.config.") {
        signals.insert("Tailwind".into());
    }
}

fn is_important_file(name: &str, relative: &str) -> bool {
    let lower_name = name.to_ascii_lowercase();
    let lower_relative = relative.to_ascii_lowercase();
    matches!(
        lower_name.as_str(),
        "package.json"
            | "pnpm-lock.yaml"
            | "package-lock.json"
            | "cargo.toml"
            | "tauri.conf.json"
            | "composer.json"
            | "artisan"
            | "package.swift"
            | "podfile"
            | "pubspec.yaml"
            | "makefile"
            | "readme.md"
            | "agents.md"
            | "dockerfile"
            | "docker-compose.yml"
            | "docker-compose.yaml"
    ) || lower_relative.contains("vite.config.")
        || lower_relative.contains("next.config.")
        || lower_relative.contains("tailwind.config.")
        || lower_relative.starts_with("docs/")
}

fn important_file_kind(name: &str, relative: &str) -> &'static str {
    let lower_name = name.to_ascii_lowercase();
    let lower_relative = relative.to_ascii_lowercase();
    if lower_name == "readme.md" || lower_relative.starts_with("docs/") || lower_name == "agents.md" {
        "documento"
    } else if lower_name.contains("lock") {
        "lockfile"
    } else if lower_relative.contains("config") || lower_name.ends_with(".toml") || lower_name.ends_with(".json") || lower_name.ends_with(".yaml") || lower_name.ends_with(".yml") {
        "config"
    } else {
        "manifesto"
    }
}

fn collect_commands_from_manifest(
    path: &Path,
    relative: &str,
    name: &str,
    commands: &mut Vec<WorkspaceBrainCommand>,
) {
    let lower_name = name.to_ascii_lowercase();
    match lower_name.as_str() {
        "package.json" => collect_package_json_commands(path, relative, commands),
        "composer.json" => collect_composer_commands(path, relative, commands),
        "cargo.toml" => {
            commands.push(WorkspaceBrainCommand {
                label: "Testes Rust".into(),
                command: "cargo test".into(),
                kind: "test".into(),
                source: relative.into(),
            });
            commands.push(WorkspaceBrainCommand {
                label: "Build Rust".into(),
                command: "cargo build".into(),
                kind: "build".into(),
                source: relative.into(),
            });
        }
        "artisan" => {
            commands.push(WorkspaceBrainCommand {
                label: "Testes Laravel".into(),
                command: "php artisan test".into(),
                kind: "test".into(),
                source: relative.into(),
            });
        }
        "makefile" => {
            commands.push(WorkspaceBrainCommand {
                label: "Make test".into(),
                command: "make test".into(),
                kind: "test".into(),
                source: relative.into(),
            });
        }
        _ => {}
    }
}

fn collect_package_json_commands(path: &Path, relative: &str, commands: &mut Vec<WorkspaceBrainCommand>) {
    let Some(json) = read_small_json(path) else { return };
    let Some(scripts) = json.get("scripts").and_then(|scripts| scripts.as_object()) else { return };
    for key in ["test", "build", "dev", "start", "lint", "typecheck"] {
        if scripts.get(key).and_then(|value| value.as_str()).is_some() {
            commands.push(WorkspaceBrainCommand {
                label: format!("npm {key}"),
                command: format!("npm run {key}"),
                kind: command_kind(key).into(),
                source: relative.into(),
            });
        }
    }
}

fn collect_composer_commands(path: &Path, relative: &str, commands: &mut Vec<WorkspaceBrainCommand>) {
    let Some(json) = read_small_json(path) else { return };
    let Some(scripts) = json.get("scripts").and_then(|scripts| scripts.as_object()) else { return };
    for key in ["test", "pest", "phpunit"] {
        if scripts.get(key).is_some() {
            commands.push(WorkspaceBrainCommand {
                label: format!("composer {key}"),
                command: format!("composer {key}"),
                kind: "test".into(),
                source: relative.into(),
            });
        }
    }
}

fn read_small_json(path: &Path) -> Option<serde_json::Value> {
    let metadata = std::fs::metadata(path).ok()?;
    if metadata.len() > 128 * 1024 {
        return None;
    }
    let text = std::fs::read_to_string(path).ok()?;
    serde_json::from_str(&text).ok()
}

fn command_kind(key: &str) -> &'static str {
    match key {
        "test" => "test",
        "build" => "build",
        "dev" | "start" => "dev",
        "lint" | "typecheck" => "check",
        _ => "run",
    }
}

fn dedupe_commands(commands: &mut Vec<WorkspaceBrainCommand>) {
    let mut seen = HashSet::new();
    commands.retain(|command| seen.insert(format!("{}:{}", command.source, command.command)));
}

fn relative_path(root: &Path, path: &Path) -> String {
    path.strip_prefix(root)
        .unwrap_or(path)
        .to_string_lossy()
        .replace('\\', "/")
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
    let vox_edge: Arc<VoxEdge> = Arc::new(VoxEdge::new(VoxEdgeConfig::production()));

    // V6-A · Atlas Vox Ambient Launch. Lê `--vox-start-listening` da linha de
    // comando ou `ATLAS_VOX_START_LISTENING=1` antes de tudo. Single-shot: o
    // overlay consome o sinal uma única vez quando o webview monta.
    let vox_ambient: Arc<vox_ambient_launch::VoxAmbientLaunchState> =
        vox_ambient_launch::VoxAmbientLaunchState::from_process();
    {
        let snap = vox_ambient.peek();
        if snap.start_listening {
            tracing::info!(
                target: "vox-ambient",
                source = ?snap.source,
                "atlas vox ambient launch: pedido para abrir já ouvindo detectado"
            );
        }
    }

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
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
                app.manage(Arc::clone(&vox_edge));
                app.manage(Arc::clone(&vox_ambient));
                // V6 · Reply Surface cooldown state (anti-flood de voz curta).
                app.manage(commands_vox_reply::VoxReplyState::new());

                // V6-A · emite o pedido ambient logo após o setup. O frontend
                // pode subscrever via `vox://ambient-launch-requested` para
                // reagir antes de chamar `vox_ambient_consume_pending_launch`.
                // O comando é a fonte canônica; o evento é só um "ping" para
                // economizar uma round-trip no caso comum.
                {
                    let snap: vox_ambient_launch::VoxAmbientLaunchSnapshot =
                        vox_ambient.peek().into();
                    if snap.start_listening {
                        let _ = app.handle().emit(
                            "vox://ambient-launch-requested",
                            &snap,
                        );
                    }
                }

                // Wave 6.5: install the Vox global-hotkey runtime
                // (Option+Space toggle + Cmd+Shift+Space open overlay)
                // and spawn the dispatcher that forwards hotkey events
                // into VoxEdge + Tauri vox://* events. If macOS denies
                // registration we still manage the runtime so the
                // status command works honestly.
                commands_vox_hotkey::install(&app.handle().clone(), Arc::clone(&vox_edge));

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
            atlas_pick_workspace_folder,
            atlas_scan_workspace_brain,
            atlas_kernel_status,
            atlas_kernel_retry,
            atlas_bridge_reconfigure,
            commands_bridge::bridge_boot,
            commands_bridge::bridge_mcp_status,
            commands_bridge::bridge_get_atlas_code_enterprise_certification,
            commands_bridge::bridge_run_atlas_code_enterprise_certification,
            commands_bridge::bridge_list_works,
            commands_bridge::bridge_list_workspaces,
            commands_bridge::bridge_create_workspace_profile,
            commands_bridge::bridge_update_workspace_profile,
            commands_bridge::bridge_archive_workspace_profile,
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
            commands_terminal::bridge_open_terminal_in_workspace,
            commands_vox::vox_stt_status,
            commands_vox::vox_dictionary_get,
            commands_vox::vox_dictionary_update,
            commands_vox::vox_stt_transcribe_debug_text,
            commands_vox::vox_stt_transcribe_audio,
            commands_vox_edge::vox_edge_status,
            commands_vox_edge::vox_edge_audio_level,
            commands_vox_edge::vox_edge_start_session,
            commands_vox_edge::vox_edge_finish_session,
            commands_vox_edge::vox_edge_cancel_session,
            commands_vox_edge::vox_edge_eclipse,
            commands_vox_hotkey::vox_hotkey_status,
            commands_vox_hotkey::vox_hotkey_record_escape,
            vox_ambient_launch::vox_ambient_consume_pending_launch,
            commands_vox_benchmark::vox_stt_benchmark_status,
            commands_vox_benchmark::vox_stt_benchmark_record_sample,
            commands_vox_benchmark::vox_stt_benchmark_run,
            commands_vox_benchmark::vox_stt_benchmark_report_latest,
            commands_vox_setup::vox_open_system_settings,
            commands_vox_setup::vox_audio_input_describe,
            commands_vox_reply::vox_settings_get,
            commands_vox_reply::vox_settings_update,
            commands_vox_reply::vox_speak_short,
            commands_vox_reply::atlas_voice_speak,
            commands_vox_reply::atlas_voice_stop,
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
