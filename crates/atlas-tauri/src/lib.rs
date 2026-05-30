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
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
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
    doc_digests: Vec<WorkspaceBrainDocDigest>,
    dependency_edges: Vec<WorkspaceBrainDependencyEdge>,
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
struct WorkspaceBrainDocDigest {
    path: String,
    kind: String,
    signals: Vec<String>,
    obligations: Vec<String>,
    summary: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceBrainDependencyEdge {
    from: String,
    to: String,
    kind: String,
    source: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceBrainCommand {
    label: String,
    command: String,
    kind: String,
    source: String,
}

#[derive(Deserialize)]
struct AwisNativeMemorySaveInput {
    workspace_key: String,
    memory: Value,
}

#[derive(Deserialize)]
struct AwisNativeArtifactSaveInput {
    workspace_key: String,
    artifacts: Value,
}

#[derive(Deserialize)]
struct AwisNativeProjectSpacesSaveInput {
    spaces: Value,
    receipts: Value,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AwisNativeMemoryWriteAck {
    ok: bool,
    persisted_at: String,
    memory_count: usize,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AwisNativeArtifactWriteAck {
    ok: bool,
    persisted_at: String,
    workspace_count: usize,
    artifact_count: usize,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AwisNativeProjectSpacesWriteAck {
    ok: bool,
    persisted_at: String,
    space_count: usize,
    receipt_count: usize,
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
async fn atlas_scan_workspace_brain(
    workspace_path: String,
) -> Result<WorkspaceBrainSnapshot, String> {
    tauri::async_runtime::spawn_blocking(move || scan_workspace_brain(workspace_path))
        .await
        .map_err(|e| format!("workspace_brain_join_failed: {e}"))?
}

#[tauri::command]
async fn atlas_awis_memory_load_all() -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(read_awis_native_memory_store)
        .await
        .map_err(|e| format!("awis_memory_load_join_failed: {e}"))?
}

#[tauri::command]
async fn atlas_awis_memory_save(
    input: AwisNativeMemorySaveInput,
) -> Result<AwisNativeMemoryWriteAck, String> {
    tauri::async_runtime::spawn_blocking(move || write_awis_native_memory(input))
        .await
        .map_err(|e| format!("awis_memory_save_join_failed: {e}"))?
}

#[tauri::command]
async fn atlas_awis_artifacts_load_all() -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(read_awis_native_artifact_store)
        .await
        .map_err(|e| format!("awis_artifacts_load_join_failed: {e}"))?
}

#[tauri::command]
async fn atlas_awis_artifacts_save(
    input: AwisNativeArtifactSaveInput,
) -> Result<AwisNativeArtifactWriteAck, String> {
    tauri::async_runtime::spawn_blocking(move || write_awis_native_artifacts(input))
        .await
        .map_err(|e| format!("awis_artifacts_save_join_failed: {e}"))?
}

#[tauri::command]
async fn atlas_awis_project_spaces_load_all() -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(read_awis_native_project_spaces_store)
        .await
        .map_err(|e| format!("awis_project_spaces_load_join_failed: {e}"))?
}

#[tauri::command]
async fn atlas_awis_project_spaces_save(
    input: AwisNativeProjectSpacesSaveInput,
) -> Result<AwisNativeProjectSpacesWriteAck, String> {
    tauri::async_runtime::spawn_blocking(move || write_awis_native_project_spaces(input))
        .await
        .map_err(|e| format!("awis_project_spaces_save_join_failed: {e}"))?
}

fn read_awis_native_memory_store() -> Result<Value, String> {
    let path = awis_native_memory_store_path()?;
    if !path.exists() {
        return Ok(Value::Object(Map::new()));
    }
    let text =
        std::fs::read_to_string(&path).map_err(|e| format!("awis_memory_read_failed: {e}"))?;
    let parsed: Value =
        serde_json::from_str(&text).map_err(|e| format!("awis_memory_parse_failed: {e}"))?;
    Ok(match parsed {
        Value::Object(_) => parsed,
        _ => Value::Object(Map::new()),
    })
}

fn read_awis_native_artifact_store() -> Result<Value, String> {
    let path = awis_native_artifact_store_path()?;
    if !path.exists() {
        return Ok(Value::Object(Map::new()));
    }
    let text =
        std::fs::read_to_string(&path).map_err(|e| format!("awis_artifacts_read_failed: {e}"))?;
    let parsed: Value =
        serde_json::from_str(&text).map_err(|e| format!("awis_artifacts_parse_failed: {e}"))?;
    Ok(match parsed {
        Value::Object(_) => parsed,
        _ => Value::Object(Map::new()),
    })
}

fn read_awis_native_project_spaces_store() -> Result<Value, String> {
    let path = awis_native_project_spaces_store_path()?;
    if !path.exists() {
        return Ok(Value::Object(Map::new()));
    }
    let text = std::fs::read_to_string(&path)
        .map_err(|e| format!("awis_project_spaces_read_failed: {e}"))?;
    let parsed: Value = serde_json::from_str(&text)
        .map_err(|e| format!("awis_project_spaces_parse_failed: {e}"))?;
    Ok(match parsed {
        Value::Object(_) => parsed,
        _ => Value::Object(Map::new()),
    })
}

fn write_awis_native_memory(
    input: AwisNativeMemorySaveInput,
) -> Result<AwisNativeMemoryWriteAck, String> {
    let workspace_key = sanitize_awis_native_memory_key(&input.workspace_key)?;
    let path = awis_native_memory_store_path()?;
    let mut store = match read_awis_native_memory_store()? {
        Value::Object(map) => map,
        _ => Map::new(),
    };
    let memory_size = serde_json::to_string(&input.memory)
        .map_err(|e| format!("awis_memory_encode_failed: {e}"))?
        .len();
    if memory_size > 1_500_000 {
        return Err("awis_memory_payload_too_large".into());
    }
    store.insert(workspace_key, input.memory);
    let payload = serde_json::to_string_pretty(&Value::Object(store.clone()))
        .map_err(|e| format!("awis_memory_store_encode_failed: {e}"))?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("awis_memory_dir_create_failed: {e}"))?;
    }
    let tmp = path.with_extension("json.tmp");
    std::fs::write(&tmp, payload).map_err(|e| format!("awis_memory_write_failed: {e}"))?;
    std::fs::rename(&tmp, &path).map_err(|e| format!("awis_memory_commit_failed: {e}"))?;
    Ok(AwisNativeMemoryWriteAck {
        ok: true,
        persisted_at: chrono::Utc::now().to_rfc3339(),
        memory_count: store.len(),
    })
}

fn write_awis_native_artifacts(
    input: AwisNativeArtifactSaveInput,
) -> Result<AwisNativeArtifactWriteAck, String> {
    let workspace_key = sanitize_awis_native_memory_key(&input.workspace_key)?;
    let artifacts = match input.artifacts {
        Value::Array(items) => Value::Array(items),
        _ => return Err("awis_artifacts_payload_must_be_array".into()),
    };
    let path = awis_native_artifact_store_path()?;
    let mut store = match read_awis_native_artifact_store()? {
        Value::Object(map) => map,
        _ => Map::new(),
    };
    let artifact_size = serde_json::to_string(&artifacts)
        .map_err(|e| format!("awis_artifacts_encode_failed: {e}"))?
        .len();
    if artifact_size > 8_000_000 {
        return Err("awis_artifacts_payload_too_large".into());
    }
    let artifact_count = artifacts.as_array().map(|items| items.len()).unwrap_or(0);
    store.insert(workspace_key, artifacts);
    let payload = serde_json::to_string_pretty(&Value::Object(store.clone()))
        .map_err(|e| format!("awis_artifacts_store_encode_failed: {e}"))?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("awis_artifacts_dir_create_failed: {e}"))?;
    }
    let tmp = path.with_extension("json.tmp");
    std::fs::write(&tmp, payload).map_err(|e| format!("awis_artifacts_write_failed: {e}"))?;
    std::fs::rename(&tmp, &path).map_err(|e| format!("awis_artifacts_commit_failed: {e}"))?;
    Ok(AwisNativeArtifactWriteAck {
        ok: true,
        persisted_at: chrono::Utc::now().to_rfc3339(),
        workspace_count: store.len(),
        artifact_count,
    })
}

fn write_awis_native_project_spaces(
    input: AwisNativeProjectSpacesSaveInput,
) -> Result<AwisNativeProjectSpacesWriteAck, String> {
    let spaces = match input.spaces {
        Value::Array(items) => Value::Array(items),
        _ => return Err("awis_project_spaces_payload_must_be_array".into()),
    };
    let receipts = match input.receipts {
        Value::Array(items) => Value::Array(items),
        _ => return Err("awis_project_space_receipts_payload_must_be_array".into()),
    };
    let payload_size = serde_json::to_string(&spaces)
        .map_err(|e| format!("awis_project_spaces_encode_failed: {e}"))?
        .len()
        + serde_json::to_string(&receipts)
            .map_err(|e| format!("awis_project_space_receipts_encode_failed: {e}"))?
            .len();
    if payload_size > 4_000_000 {
        return Err("awis_project_spaces_payload_too_large".into());
    }
    let space_count = spaces.as_array().map(|items| items.len()).unwrap_or(0);
    let receipt_count = receipts.as_array().map(|items| items.len()).unwrap_or(0);
    let mut store = Map::new();
    store.insert("spaces".into(), spaces);
    store.insert("receipts".into(), receipts);
    let path = awis_native_project_spaces_store_path()?;
    let payload = serde_json::to_string_pretty(&Value::Object(store))
        .map_err(|e| format!("awis_project_spaces_store_encode_failed: {e}"))?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("awis_project_spaces_dir_create_failed: {e}"))?;
    }
    let tmp = path.with_extension("json.tmp");
    std::fs::write(&tmp, payload).map_err(|e| format!("awis_project_spaces_write_failed: {e}"))?;
    std::fs::rename(&tmp, &path).map_err(|e| format!("awis_project_spaces_commit_failed: {e}"))?;
    Ok(AwisNativeProjectSpacesWriteAck {
        ok: true,
        persisted_at: chrono::Utc::now().to_rfc3339(),
        space_count,
        receipt_count,
    })
}

fn awis_native_memory_store_path() -> Result<PathBuf, String> {
    let home =
        std::env::var("HOME").map_err(|_| "home_not_available_for_awis_memory".to_string())?;
    Ok(PathBuf::from(home)
        .join(".atlas")
        .join("desktop-awis")
        .join("workspace-memory.json"))
}

fn awis_native_artifact_store_path() -> Result<PathBuf, String> {
    let home =
        std::env::var("HOME").map_err(|_| "home_not_available_for_awis_artifacts".to_string())?;
    Ok(PathBuf::from(home)
        .join(".atlas")
        .join("desktop-awis")
        .join("workspace-artifacts.json"))
}

fn awis_native_project_spaces_store_path() -> Result<PathBuf, String> {
    let home = std::env::var("HOME")
        .map_err(|_| "home_not_available_for_awis_project_spaces".to_string())?;
    Ok(PathBuf::from(home)
        .join(".atlas")
        .join("desktop-awis")
        .join("project-spaces.json"))
}

fn sanitize_awis_native_memory_key(value: &str) -> Result<String, String> {
    let key: String = value
        .trim()
        .to_ascii_lowercase()
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || matches!(ch, '-' | '_' | '.') {
                ch
            } else {
                '-'
            }
        })
        .collect::<String>()
        .trim_matches('-')
        .chars()
        .take(120)
        .collect();
    if key.is_empty() {
        Err("awis_memory_workspace_key_required".into())
    } else {
        Ok(key)
    }
}

fn scan_workspace_brain(workspace_path: String) -> Result<WorkspaceBrainSnapshot, String> {
    const MAX_FILES: usize = 6_000;
    const MAX_DIRS: usize = 1_200;
    const MAX_DEPTH: usize = 6;
    const MAX_IMPORTANT_FILES: usize = 110;
    const MAX_DOC_DIGESTS: usize = 16;

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
    let mut doc_digests: Vec<WorkspaceBrainDocDigest> = Vec::new();
    let mut dependency_edges: Vec<WorkspaceBrainDependencyEdge> = Vec::new();
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
                let relative = relative_path(&root, &path);
                detect_dir_signals(&relative, &mut signals);
                if is_important_dir(&relative) && important_files.len() < MAX_IMPORTANT_FILES {
                    important_files.push(WorkspaceBrainFile {
                        path: relative,
                        kind: "área".into(),
                    });
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
                let kind = important_file_kind(&name, &relative).to_string();
                important_files.push(WorkspaceBrainFile {
                    path: relative.clone(),
                    kind: kind.clone(),
                });
                if kind == "documento" && doc_digests.len() < MAX_DOC_DIGESTS {
                    if let Some(digest) = digest_workspace_document(&path, &relative) {
                        for signal in &digest.signals {
                            signals.insert(signal.clone());
                        }
                        doc_digests.push(digest);
                    }
                }
            }
            collect_manifest_intelligence(
                &path,
                &relative,
                &name,
                &mut commands,
                &mut signals,
                &mut dependency_edges,
            );
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
    sort_workspace_commands(&mut commands);
    commands.truncate(12);
    dedupe_dependency_edges(&mut dependency_edges);
    sort_workspace_dependency_edges(&mut dependency_edges);
    dependency_edges.truncate(32);

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
        doc_digests,
        dependency_edges,
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

fn detect_dir_signals(relative: &str, signals: &mut HashSet<String>) {
    let lower = relative.to_ascii_lowercase();
    if lower.contains("apps/desktop") || lower.contains("atlas-desktop") {
        signals.insert("Desktop app".into());
    }
    if lower.contains("atlas-mobile") || lower.contains("expo") || lower.contains("react-native") {
        signals.insert("Mobile app".into());
    }
    if lower.contains("src/surfaces/atlas-ai") {
        signals.insert("Atlas AI surface".into());
    }
    if lower.contains("crates/atlas-tauri") || lower.contains("src-tauri") {
        signals.insert("Tauri native runtime".into());
    }
    if lower.contains("atlas-server")
        || lower.contains("app/services")
        || lower.contains("app/http/controllers")
    {
        signals.insert("Backend service".into());
    }
    if lower.contains("docs/engineering-knowledge-base") {
        signals.insert("Canonical engineering docs".into());
    }
    if lower.contains("__tests__") || lower.ends_with("/tests") || lower.contains("/tests/") {
        signals.insert("Test suite".into());
    }
    if lower.contains("database/migrations")
        || lower.contains("/auth")
        || lower.contains("/security")
    {
        signals.insert("Sensitive execution zone".into());
    }
}

fn is_important_dir(relative: &str) -> bool {
    let lower = relative.to_ascii_lowercase();
    let last_segment = lower.rsplit('/').next().unwrap_or("");
    matches!(
        lower.as_str(),
        "apps"
            | "apps/desktop"
            | "crates"
            | "crates/atlas-tauri"
            | "docs"
            | "docs/engineering-knowledge-base"
            | "app"
            | "app/services"
            | "app/http"
            | "app/http/controllers"
            | "database"
            | "database/migrations"
            | "tests"
            | "__tests__"
    ) || last_segment.starts_with("atlas-")
        || lower.contains("src/surfaces/atlas-ai")
        || lower.contains("surfaces/atlas-ai/components")
        || lower.contains("atlas-server/app/services")
        || lower.contains("atlas-server/app/http/controllers")
        || lower.contains("atlas-desktop/apps/desktop/src/surfaces")
        || lower.contains("atlas-desktop/crates/atlas-tauri")
        || lower.ends_with("/__tests__")
        || lower.ends_with("/tests")
}

fn is_important_file(name: &str, relative: &str) -> bool {
    let lower_name = name.to_ascii_lowercase();
    let lower_relative = relative.to_ascii_lowercase();
    matches!(
        lower_name.as_str(),
        "package.json"
            | "pnpm-workspace.yaml"
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
    if lower_name == "readme.md" || lower_relative.starts_with("docs/") || lower_name == "agents.md"
    {
        "documento"
    } else if lower_name.contains("lock") {
        "lockfile"
    } else if lower_relative.contains("config")
        || lower_name.ends_with(".toml")
        || lower_name.ends_with(".json")
        || lower_name.ends_with(".yaml")
        || lower_name.ends_with(".yml")
    {
        "config"
    } else {
        "manifesto"
    }
}

fn digest_workspace_document(path: &Path, relative: &str) -> Option<WorkspaceBrainDocDigest> {
    let metadata = std::fs::metadata(path).ok()?;
    if metadata.len() > 96 * 1024 {
        return None;
    }
    let text = std::fs::read_to_string(path).ok()?;
    let lower = text.to_ascii_lowercase();
    let lower_path = relative.to_ascii_lowercase();
    let mut signals: Vec<String> = Vec::new();
    let mut obligations: Vec<String> = Vec::new();

    push_doc_signal(
        &mut signals,
        lower_path.contains("agents.md"),
        "doc:provider-operating-contract",
    );
    push_doc_signal(&mut signals, lower.contains("awis"), "doc:awis");
    push_doc_signal(&mut signals, lower.contains("space"), "doc:spaces");
    push_doc_signal(&mut signals, lower.contains("workbench"), "doc:workbench");
    push_doc_signal(
        &mut signals,
        lower.contains("context pack") || lower.contains("contexto"),
        "doc:context-pack",
    );
    push_doc_signal(
        &mut signals,
        lower.contains("artifact") || lower.contains("artefato"),
        "doc:artifacts",
    );
    push_doc_signal(&mut signals, lower.contains("tauri"), "doc:tauri");
    push_doc_signal(
        &mut signals,
        lower.contains("react") || lower.contains("typescript"),
        "doc:desktop-react",
    );
    push_doc_signal(
        &mut signals,
        lower.contains("laravel") || lower.contains("artisan"),
        "doc:laravel",
    );
    push_doc_signal(
        &mut signals,
        lower.contains("postgres") || lower.contains("database"),
        "doc:data-layer",
    );
    push_doc_signal(
        &mut signals,
        lower.contains("test") || lower.contains("teste"),
        "doc:validation",
    );
    push_doc_signal(
        &mut signals,
        lower.contains("risk") || lower.contains("risco") || lower.contains("security"),
        "doc:risk",
    );

    push_doc_signal(
        &mut obligations,
        lower.contains("session-bootstrap") || lower.contains("bootstrap"),
        "sessão:bootstrap antes de implementar",
    );
    push_doc_signal(
        &mut obligations,
        lower.contains("place-feature") || lower.contains("placement"),
        "feature:confirmar placement antes de criar fluxo novo",
    );
    push_doc_signal(
        &mut obligations,
        lower.contains("do not expose")
            || lower.contains("não expor")
            || lower.contains("internal ids"),
        "segurança:não expor ids internos nem contexto bruto",
    );
    push_doc_signal(
        &mut obligations,
        lower.contains("canonical")
            || lower.contains("canônico")
            || lower.contains("source of truth"),
        "governança:preferir docs canônicos",
    );
    push_doc_signal(
        &mut obligations,
        lower.contains("test") || lower.contains("teste") || lower.contains("build"),
        "validação:rodar comandos relevantes antes de confiar",
    );

    signals.sort();
    signals.dedup();
    signals.truncate(8);
    obligations.sort();
    obligations.dedup();
    obligations.truncate(6);
    if signals.is_empty() && obligations.is_empty() {
        return None;
    }

    Some(WorkspaceBrainDocDigest {
        path: relative.into(),
        kind: if lower_path.contains("agents.md") {
            "contrato".into()
        } else if lower_path.starts_with("docs/") {
            "documentação".into()
        } else {
            "guia".into()
        },
        summary: summarize_workspace_document_digest(relative, &signals, &obligations),
        signals,
        obligations,
    })
}

fn push_doc_signal(items: &mut Vec<String>, condition: bool, label: &str) {
    if condition {
        items.push(label.into());
    }
}

fn summarize_workspace_document_digest(
    relative: &str,
    signals: &[String],
    obligations: &[String],
) -> String {
    let role = if relative.eq_ignore_ascii_case("AGENTS.md")
        || relative.to_ascii_lowercase().ends_with("/agents.md")
    {
        "contrato operacional do provider"
    } else if relative
        .to_ascii_lowercase()
        .contains("engineering-knowledge-base")
    {
        "documentação canônica de engenharia"
    } else if relative.to_ascii_lowercase().contains("readme") {
        "guia inicial do workspace"
    } else {
        "documento operacional do workspace"
    };
    let signal = signals.first().map(String::as_str).unwrap_or("contexto");
    let obligation = obligations
        .first()
        .map(String::as_str)
        .unwrap_or("usar como resumo, não como fonte bruta");
    format!("{role}; sinal principal {signal}; regra {obligation}")
}

fn collect_manifest_intelligence(
    path: &Path,
    relative: &str,
    name: &str,
    commands: &mut Vec<WorkspaceBrainCommand>,
    signals: &mut HashSet<String>,
    dependency_edges: &mut Vec<WorkspaceBrainDependencyEdge>,
) {
    let lower_name = name.to_ascii_lowercase();
    match lower_name.as_str() {
        "package.json" => {
            collect_package_json_intelligence(path, relative, commands, signals, dependency_edges)
        }
        "pnpm-workspace.yaml" => {
            collect_pnpm_workspace_intelligence(path, relative, signals, dependency_edges)
        }
        "composer.json" => {
            collect_composer_intelligence(path, relative, commands, signals, dependency_edges)
        }
        "cargo.toml" => {
            commands.push(WorkspaceBrainCommand {
                label: "Testes Rust".into(),
                command: manifest_command(relative, "cargo test"),
                kind: "test".into(),
                source: relative.into(),
            });
            commands.push(WorkspaceBrainCommand {
                label: "Build Rust".into(),
                command: manifest_command(relative, "cargo build"),
                kind: "build".into(),
                source: relative.into(),
            });
        }
        "artisan" => {
            commands.push(WorkspaceBrainCommand {
                label: "Testes Laravel".into(),
                command: manifest_command(relative, "php artisan test"),
                kind: "test".into(),
                source: relative.into(),
            });
        }
        "makefile" => {
            commands.push(WorkspaceBrainCommand {
                label: "Make test".into(),
                command: manifest_command(relative, "make test"),
                kind: "test".into(),
                source: relative.into(),
            });
        }
        _ => {}
    }
}

fn collect_package_json_intelligence(
    path: &Path,
    relative: &str,
    commands: &mut Vec<WorkspaceBrainCommand>,
    signals: &mut HashSet<String>,
    dependency_edges: &mut Vec<WorkspaceBrainDependencyEdge>,
) {
    let Some(json) = read_small_json(path) else {
        return;
    };
    detect_package_json_signals(&json, signals);
    collect_package_dependency_edges(&json, relative, dependency_edges);
    collect_package_workspace_edges(&json, relative, signals, dependency_edges);
    let Some(scripts) = json.get("scripts").and_then(|scripts| scripts.as_object()) else {
        return;
    };
    let package_manager = package_manager_for_manifest(path, &json);
    let mut script_names: Vec<String> = scripts
        .iter()
        .filter_map(|(key, value)| value.as_str().map(|_| key.to_string()))
        .filter(|key| is_relevant_package_script(key))
        .collect();
    script_names.sort_by(|a, b| {
        package_script_priority(a)
            .cmp(&package_script_priority(b))
            .then_with(|| a.cmp(b))
    });
    for key in script_names {
        commands.push(WorkspaceBrainCommand {
            label: package_script_label(package_manager, &key),
            command: manifest_command(relative, &format!("{package_manager} run {key}")),
            kind: command_kind(&key).into(),
            source: relative.into(),
        });
    }
}

fn detect_package_json_signals(json: &serde_json::Value, signals: &mut HashSet<String>) {
    let deps = package_dependency_names(json);
    let has = |name: &str| deps.contains(name);

    if has("react") {
        signals.insert("React".into());
    }
    if has("@vitejs/plugin-react") || has("vite") {
        signals.insert("Vite".into());
    }
    if has("typescript") {
        signals.insert("TypeScript".into());
    }
    if has("@tauri-apps/api") || has("@tauri-apps/cli") {
        signals.insert("Tauri".into());
    }
    if has("expo") || has("react-native") {
        signals.insert("Expo/React Native".into());
    }
    if has("next") {
        signals.insert("Next.js".into());
    }
    if has("tailwindcss") {
        signals.insert("Tailwind".into());
    }
    if has("vitest") || has("jest") || has("@testing-library/react") {
        signals.insert("JavaScript test suite".into());
    }
    if has("@playwright/test") || has("playwright") {
        signals.insert("Browser automation tests".into());
    }
}

fn package_dependency_names(json: &serde_json::Value) -> HashSet<String> {
    let mut names = HashSet::new();
    for field in [
        "dependencies",
        "devDependencies",
        "peerDependencies",
        "optionalDependencies",
    ] {
        if let Some(deps) = json.get(field).and_then(|value| value.as_object()) {
            names.extend(deps.keys().map(|key| key.to_ascii_lowercase()));
        }
    }
    names
}

fn collect_package_dependency_edges(
    json: &serde_json::Value,
    relative: &str,
    dependency_edges: &mut Vec<WorkspaceBrainDependencyEdge>,
) {
    let from = json
        .get("name")
        .and_then(|value| value.as_str())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("package");
    let mut edges: Vec<WorkspaceBrainDependencyEdge> = Vec::new();
    for field in [
        "dependencies",
        "devDependencies",
        "peerDependencies",
        "optionalDependencies",
    ] {
        if let Some(deps) = json.get(field).and_then(|value| value.as_object()) {
            for name in deps.keys() {
                if is_relevant_dependency_name(name) {
                    edges.push(WorkspaceBrainDependencyEdge {
                        from: from.into(),
                        to: name.into(),
                        kind: field.into(),
                        source: relative.into(),
                    });
                }
            }
        }
    }
    edges.sort_by(|a, b| {
        dependency_priority(&a.to)
            .cmp(&dependency_priority(&b.to))
            .then_with(|| a.to.cmp(&b.to))
    });
    dependency_edges.extend(edges.into_iter().take(12));
}

fn collect_package_workspace_edges(
    json: &serde_json::Value,
    relative: &str,
    signals: &mut HashSet<String>,
    dependency_edges: &mut Vec<WorkspaceBrainDependencyEdge>,
) {
    let members = package_workspace_members(json);
    if members.is_empty() {
        return;
    }

    signals.insert("Monorepo workspace".into());
    let from = json
        .get("name")
        .and_then(|value| value.as_str())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("package");

    dependency_edges.extend(members.into_iter().take(16).map(|member| {
        WorkspaceBrainDependencyEdge {
            from: from.into(),
            to: member,
            kind: "workspace".into(),
            source: relative.into(),
        }
    }));
}

fn collect_pnpm_workspace_intelligence(
    path: &Path,
    relative: &str,
    signals: &mut HashSet<String>,
    dependency_edges: &mut Vec<WorkspaceBrainDependencyEdge>,
) {
    let members = pnpm_workspace_members(path);
    if members.is_empty() {
        return;
    }

    signals.insert("Monorepo workspace".into());
    signals.insert("pnpm workspace".into());
    dependency_edges.extend(members.into_iter().take(24).map(|member| {
        WorkspaceBrainDependencyEdge {
            from: "pnpm-workspace".into(),
            to: member,
            kind: "workspace".into(),
            source: relative.into(),
        }
    }));
}

fn pnpm_workspace_members(path: &Path) -> Vec<String> {
    let Some(text) = read_small_text(path, 64 * 1024) else {
        return Vec::new();
    };

    let mut members = Vec::new();
    let mut in_packages = false;
    for raw_line in text.lines() {
        let without_comment = raw_line.split('#').next().unwrap_or("").trim_end();
        let trimmed = without_comment.trim();
        if trimmed.is_empty() {
            continue;
        }

        if !raw_line.starts_with(' ') && !raw_line.starts_with('\t') {
            in_packages = trimmed == "packages:";
            continue;
        }
        if !in_packages {
            continue;
        }

        let Some(item) = trimmed.strip_prefix('-') else {
            continue;
        };
        if let Some(member) = workspace_member_text_value(item) {
            members.push(member);
        }
    }

    members.sort();
    members.dedup();
    members
}

fn package_workspace_members(json: &serde_json::Value) -> Vec<String> {
    let mut members = Vec::new();
    if let Some(items) = json.get("workspaces").and_then(|value| value.as_array()) {
        members.extend(items.iter().filter_map(workspace_member_value));
    } else if let Some(items) = json
        .get("workspaces")
        .and_then(|value| value.get("packages"))
        .and_then(|value| value.as_array())
    {
        members.extend(items.iter().filter_map(workspace_member_value));
    }

    members.sort();
    members.dedup();
    members
}

fn workspace_member_value(value: &serde_json::Value) -> Option<String> {
    workspace_member_text_value(value.as_str()?)
}

fn workspace_member_text_value(value: &str) -> Option<String> {
    let member = value.trim().trim_matches('"').trim_matches('\'').trim();
    if member.is_empty()
        || member.starts_with('/')
        || member.contains("..")
        || member.contains('\\')
        || member.len() > 160
    {
        return None;
    }
    Some(member.to_string())
}

fn package_manager_for_manifest<'a>(path: &Path, json: &'a serde_json::Value) -> &'a str {
    if let Some(manager) = json.get("packageManager").and_then(|value| value.as_str()) {
        let lower = manager.to_ascii_lowercase();
        if lower.starts_with("pnpm@") {
            return "pnpm";
        }
        if lower.starts_with("yarn@") {
            return "yarn";
        }
        if lower.starts_with("bun@") {
            return "bun";
        }
        if lower.starts_with("npm@") {
            return "npm";
        }
    }

    let mut current = path.parent();
    while let Some(dir) = current {
        if dir.join("pnpm-lock.yaml").is_file() || dir.join("pnpm-workspace.yaml").is_file() {
            return "pnpm";
        }
        if dir.join("yarn.lock").is_file() {
            return "yarn";
        }
        if dir.join("bun.lockb").is_file() || dir.join("bun.lock").is_file() {
            return "bun";
        }
        if dir.join("package-lock.json").is_file() {
            return "npm";
        }
        current = dir.parent();
    }

    "npm"
}

fn collect_composer_intelligence(
    path: &Path,
    relative: &str,
    commands: &mut Vec<WorkspaceBrainCommand>,
    signals: &mut HashSet<String>,
    dependency_edges: &mut Vec<WorkspaceBrainDependencyEdge>,
) {
    let Some(json) = read_small_json(path) else {
        return;
    };
    detect_composer_signals(&json, signals);
    collect_composer_dependency_edges(&json, relative, dependency_edges);
    let Some(scripts) = json.get("scripts").and_then(|scripts| scripts.as_object()) else {
        return;
    };
    for key in ["test", "pest", "phpunit"] {
        if scripts.get(key).is_some() {
            commands.push(WorkspaceBrainCommand {
                label: format!("composer {key}"),
                command: manifest_command(relative, &format!("composer {key}")),
                kind: "test".into(),
                source: relative.into(),
            });
        }
    }
}

fn detect_composer_signals(json: &serde_json::Value, signals: &mut HashSet<String>) {
    let deps = composer_dependency_names(json);
    let has = |name: &str| deps.contains(name);
    if has("laravel/framework") {
        signals.insert("Laravel".into());
    }
    if has("livewire/livewire") {
        signals.insert("Livewire".into());
    }
    if has("inertiajs/inertia-laravel") {
        signals.insert("Inertia".into());
    }
    if has("pestphp/pest") || has("phpunit/phpunit") {
        signals.insert("PHP test suite".into());
    }
    if has("laravel/sanctum") || has("laravel/passport") {
        signals.insert("Auth/Security".into());
    }
}

fn composer_dependency_names(json: &serde_json::Value) -> HashSet<String> {
    let mut names = HashSet::new();
    for field in ["require", "require-dev"] {
        if let Some(deps) = json.get(field).and_then(|value| value.as_object()) {
            names.extend(deps.keys().map(|key| key.to_ascii_lowercase()));
        }
    }
    names
}

fn collect_composer_dependency_edges(
    json: &serde_json::Value,
    relative: &str,
    dependency_edges: &mut Vec<WorkspaceBrainDependencyEdge>,
) {
    let from = json
        .get("name")
        .and_then(|value| value.as_str())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("composer-project");
    let mut edges: Vec<WorkspaceBrainDependencyEdge> = Vec::new();
    for field in ["require", "require-dev"] {
        if let Some(deps) = json.get(field).and_then(|value| value.as_object()) {
            for name in deps.keys() {
                if is_relevant_dependency_name(name) {
                    edges.push(WorkspaceBrainDependencyEdge {
                        from: from.into(),
                        to: name.into(),
                        kind: field.into(),
                        source: relative.into(),
                    });
                }
            }
        }
    }
    edges.sort_by(|a, b| {
        dependency_priority(&a.to)
            .cmp(&dependency_priority(&b.to))
            .then_with(|| a.to.cmp(&b.to))
    });
    dependency_edges.extend(edges.into_iter().take(12));
}

fn is_relevant_dependency_name(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    lower.starts_with("@atlas/")
        || lower.starts_with("atlas/")
        || lower.contains("laravel")
        || lower.contains("react")
        || lower.contains("tauri")
        || lower.contains("vite")
        || lower.contains("typescript")
        || lower.contains("playwright")
        || lower.contains("vitest")
        || lower.contains("jest")
        || lower.contains("phpunit")
        || lower.contains("pest")
        || lower.contains("inertia")
        || lower.contains("livewire")
        || lower.contains("tailwind")
        || lower.contains("expo")
}

fn dependency_priority(name: &str) -> usize {
    let lower = name.to_ascii_lowercase();
    if lower.starts_with("@atlas/") || lower.starts_with("atlas/") {
        0
    } else if lower.contains("laravel") || lower.contains("tauri") || lower.contains("react") {
        1
    } else if lower.contains("test")
        || lower.contains("vitest")
        || lower.contains("phpunit")
        || lower.contains("playwright")
    {
        2
    } else {
        3
    }
}

fn read_small_json(path: &Path) -> Option<serde_json::Value> {
    let text = read_small_text(path, 128 * 1024)?;
    serde_json::from_str(&text).ok()
}

fn read_small_text(path: &Path, max_bytes: u64) -> Option<String> {
    let metadata = std::fs::metadata(path).ok()?;
    if metadata.len() > max_bytes {
        return None;
    }
    std::fs::read_to_string(path).ok()
}

fn command_kind(key: &str) -> &'static str {
    let lower = key.to_ascii_lowercase();
    if lower.contains("test")
        || lower.contains("smoke")
        || lower.contains("certify")
        || lower.contains("regression")
    {
        "test"
    } else if lower.contains("build") {
        "build"
    } else if matches!(lower.as_str(), "dev" | "start") || lower.ends_with(":dev") {
        "dev"
    } else if lower.contains("lint")
        || lower.contains("typecheck")
        || lower.contains("doctor")
        || lower.contains("release-check")
    {
        "check"
    } else {
        "run"
    }
}

fn dedupe_commands(commands: &mut Vec<WorkspaceBrainCommand>) {
    let mut seen = HashSet::new();
    commands.retain(|command| seen.insert(format!("{}:{}", command.source, command.command)));
}

fn dedupe_dependency_edges(edges: &mut Vec<WorkspaceBrainDependencyEdge>) {
    let mut seen = HashSet::new();
    edges.retain(|edge| {
        seen.insert(format!(
            "{}:{}:{}:{}",
            edge.source, edge.from, edge.to, edge.kind
        ))
    });
}

fn sort_workspace_dependency_edges(edges: &mut [WorkspaceBrainDependencyEdge]) {
    edges.sort_by(|a, b| {
        dependency_priority(&a.to)
            .cmp(&dependency_priority(&b.to))
            .then_with(|| a.source.cmp(&b.source))
            .then_with(|| a.from.cmp(&b.from))
            .then_with(|| a.to.cmp(&b.to))
    });
}

fn sort_workspace_commands(commands: &mut [WorkspaceBrainCommand]) {
    commands.sort_by(|a, b| {
        command_priority(a)
            .cmp(&command_priority(b))
            .then_with(|| a.source.cmp(&b.source))
            .then_with(|| a.command.cmp(&b.command))
    });
}

fn command_priority(command: &WorkspaceBrainCommand) -> usize {
    let lower = command.command.to_ascii_lowercase();
    if lower.contains("atlas-ai:test") {
        0
    } else if lower.contains("atlas-dev:test") {
        1
    } else if lower.contains("atlas-frontend:test") {
        2
    } else if lower.contains("php artisan test") {
        3
    } else if lower.contains("composer test") {
        4
    } else if lower.contains("cargo test") {
        5
    } else if command.kind == "test" {
        6
    } else if lower.contains("typecheck") || lower.contains("lint") {
        7
    } else if lower.contains("tauri:build") {
        8
    } else if command.kind == "build" {
        9
    } else if command.kind == "dev" {
        10
    } else {
        20
    }
}

fn is_relevant_package_script(key: &str) -> bool {
    let lower = key.to_ascii_lowercase();
    matches!(
        lower.as_str(),
        "test" | "build" | "dev" | "start" | "lint" | "typecheck" | "check" | "preview"
    ) || lower.contains("test")
        || lower.contains("smoke")
        || lower.contains("certify")
        || lower.contains("build")
        || lower.contains("lint")
        || lower.contains("typecheck")
        || lower.contains("doctor")
        || lower.contains("release-check")
}

fn package_script_priority(key: &str) -> usize {
    let lower = key.to_ascii_lowercase();
    match lower.as_str() {
        "atlas-ai:test" => 0,
        "atlas-dev:test" => 1,
        "atlas-frontend:test" => 2,
        "test" => 3,
        "lint" => 4,
        "typecheck" => 5,
        "tauri:build" => 6,
        "build" => 7,
        "dev" => 8,
        "start" => 9,
        _ if lower.starts_with("vox:") => 12,
        _ => 20,
    }
}

fn package_script_label(package_manager: &str, key: &str) -> String {
    if key.contains(':') {
        key.replace(':', " ")
    } else {
        format!("{package_manager} {key}")
    }
}

fn manifest_command(relative: &str, command: &str) -> String {
    let Some((dir, _)) = relative.rsplit_once('/') else {
        return command.into();
    };
    if dir.trim().is_empty() {
        command.into()
    } else {
        format!("cd {dir} && {command}")
    }
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
                        let _ = app.handle().emit("vox://ambient-launch-requested", &snap);
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
            atlas_awis_memory_load_all,
            atlas_awis_memory_save,
            atlas_awis_artifacts_load_all,
            atlas_awis_artifacts_save,
            atlas_awis_project_spaces_load_all,
            atlas_awis_project_spaces_save,
            atlas_kernel_status,
            atlas_kernel_retry,
            atlas_bridge_reconfigure,
            commands_bridge::bridge_boot,
            commands_bridge::bridge_mcp_status,
            commands_bridge::bridge_atlas_ai_http_json,
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
