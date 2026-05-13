//! Kernel Manager · spawns the Atlas Server (php artisan serve + queue worker)
//! as a managed sidecar of the Atlas Code .app.
//!
//! Enterprise pattern: the .app boots the entire backend itself. The user
//! never has to open extra terminals. Lifecycle is bound to the Tauri window:
//! - on app start: detect atlas-server path → spawn server + worker → poll
//!   /health until ready → load token from .env → make ATLAS_SERVER_URL +
//!   ATLAS_TOKEN visible to atlas-bridge
//! - on app exit: SIGTERM both processes
//!
//! Honest empty states preserved: if the atlas-server folder isn't found, we
//! mark status=Failed with `failure_code` + `repair_hint` so the UI can
//! render an actionable error and `atlas_kernel_retry` can re-run boot().

use std::collections::VecDeque;
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::Arc;
use std::time::Duration;

use serde::Serialize;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::Mutex;

const KERNEL_PORT: u16 = 8001;
const KERNEL_HOST: &str = "127.0.0.1";
const TAIL_LINES: usize = 30;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum KernelStatus {
    Booting,
    Ready,
    Failed,
    Unconfigured,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KernelStatusReport {
    pub status: KernelStatus,
    pub message: String,
    /// Stable code for the UI to switch on, e.g. `php_missing`,
    /// `server_path_missing`, `health_timeout`, `port_in_use`.
    pub failure_code: Option<String>,
    /// Actionable next step the user can take to fix it.
    pub repair_hint: Option<String>,
    pub server_path: Option<String>,
    pub php_path: Option<String>,
    pub url: String,
    pub port: u16,
    pub queue_running: bool,
    pub stdout_tail: Vec<String>,
    pub stderr_tail: Vec<String>,
}

impl KernelStatusReport {
    fn booting() -> Self {
        Self {
            status: KernelStatus::Booting,
            message: "iniciando…".to_string(),
            failure_code: None,
            repair_hint: None,
            server_path: None,
            php_path: None,
            url: kernel_url(),
            port: KERNEL_PORT,
            queue_running: false,
            stdout_tail: vec![],
            stderr_tail: vec![],
        }
    }
}

/// Active state shared with Tauri command handlers.
#[derive(Default)]
pub struct KernelManagerState {
    inner: Mutex<Inner>,
}

#[derive(Default)]
struct Inner {
    status: Option<KernelStatusReport>,
    server_child: Option<Child>,
    worker_child: Option<Child>,
    stdout_tail: Arc<Mutex<VecDeque<String>>>,
    stderr_tail: Arc<Mutex<VecDeque<String>>>,
}

impl KernelManagerState {
    pub async fn snapshot(&self) -> KernelStatusReport {
        let guard = self.inner.lock().await;
        let mut report = guard.status.clone().unwrap_or_else(KernelStatusReport::booting);
        // Always replace tails with the freshest copy from the rolling buffers.
        let stdout = guard.stdout_tail.lock().await.iter().cloned().collect::<Vec<_>>();
        let stderr = guard.stderr_tail.lock().await.iter().cloned().collect::<Vec<_>>();
        report.stdout_tail = stdout;
        report.stderr_tail = stderr;
        report
    }

    pub async fn shutdown(&self) {
        let mut guard = self.inner.lock().await;
        if let Some(child) = guard.server_child.as_mut() {
            let _ = child.kill().await;
        }
        if let Some(child) = guard.worker_child.as_mut() {
            let _ = child.kill().await;
        }
    }
}

pub fn kernel_url() -> String {
    format!("http://{KERNEL_HOST}:{KERNEL_PORT}")
}

/// Boot the Kernel sidecar. Idempotent: if the port already responds, we
/// adopt the existing server instead of spawning a new one (useful for
/// developers running `php artisan serve` manually).
pub async fn boot(state: Arc<KernelManagerState>) -> KernelStatusReport {
    // Reset rolling tails so previous-run noise doesn't leak.
    {
        let guard = state.inner.lock().await;
        guard.stdout_tail.lock().await.clear();
        guard.stderr_tail.lock().await.clear();
    }

    // 1. Adopt existing server if /health already responds.
    if probe_health(Duration::from_millis(800)).await {
        let token = locate_atlas_server()
            .ok()
            .and_then(|p| read_token_from_env(&p));
        export_env(&kernel_url(), token.as_deref());
        let report = KernelStatusReport {
            status: KernelStatus::Ready,
            message: "adopted existing atlas-server on :8001".to_string(),
            failure_code: None,
            repair_hint: None,
            server_path: locate_atlas_server().ok().map(path_string),
            php_path: resolve_php_binary().map(path_string),
            url: kernel_url(),
            port: KERNEL_PORT,
            queue_running: false,
            stdout_tail: vec![],
            stderr_tail: vec![],
        };
        let mut guard = state.inner.lock().await;
        guard.status = Some(report.clone());
        return report;
    }

    // 2. Locate atlas-server folder.
    let server_path = match locate_atlas_server() {
        Ok(p) => p,
        Err(message) => {
            let report = KernelStatusReport {
                status: KernelStatus::Unconfigured,
                message,
                failure_code: Some("server_path_missing".to_string()),
                repair_hint: Some(
                    "Set ATLAS_SERVER_PATH or place atlas-server at ~/develop/Atlas/atlas-server"
                        .to_string(),
                ),
                server_path: None,
                php_path: resolve_php_binary().map(path_string),
                url: kernel_url(),
                port: KERNEL_PORT,
                queue_running: false,
                stdout_tail: vec![],
                stderr_tail: vec![],
            };
            let mut guard = state.inner.lock().await;
            guard.status = Some(report.clone());
            return report;
        }
    };

    // 3. Resolve php binary up front so we can surface a clear error.
    let php = match resolve_php_binary() {
        Some(p) => p,
        None => {
            let report = KernelStatusReport {
                status: KernelStatus::Failed,
                message: "php not found on PATH".to_string(),
                failure_code: Some("php_missing".to_string()),
                repair_hint: Some(
                    "Install PHP 8.4+ (brew install php) or set PHP_BINARY env var".to_string(),
                ),
                server_path: Some(path_string(server_path.clone())),
                php_path: None,
                url: kernel_url(),
                port: KERNEL_PORT,
                queue_running: false,
                stdout_tail: vec![],
                stderr_tail: vec![],
            };
            let mut guard = state.inner.lock().await;
            guard.status = Some(report.clone());
            return report;
        }
    };

    // 4. Spawn `php artisan serve --port=8001 --host=127.0.0.1`.
    let stdout_tail = {
        let guard = state.inner.lock().await;
        Arc::clone(&guard.stdout_tail)
    };
    let stderr_tail = {
        let guard = state.inner.lock().await;
        Arc::clone(&guard.stderr_tail)
    };
    let server_child = match spawn_artisan_serve(&php, &server_path, &stdout_tail, &stderr_tail).await
    {
        Ok(c) => c,
        Err(e) => {
            let report = KernelStatusReport {
                status: KernelStatus::Failed,
                message: format!("artisan serve failed: {e}"),
                failure_code: Some("artisan_spawn_failed".to_string()),
                repair_hint: Some("Run `php artisan serve` manually to inspect the error".to_string()),
                server_path: Some(path_string(server_path.clone())),
                php_path: Some(path_string(php.clone())),
                url: kernel_url(),
                port: KERNEL_PORT,
                queue_running: false,
                stdout_tail: vec![],
                stderr_tail: vec![],
            };
            let mut guard = state.inner.lock().await;
            guard.status = Some(report.clone());
            return report;
        }
    };

    // 5. Poll /health up to 15s.
    let mut ready = false;
    for _ in 0..30 {
        tokio::time::sleep(Duration::from_millis(500)).await;
        if probe_health(Duration::from_millis(400)).await {
            ready = true;
            break;
        }
    }

    if !ready {
        let report = KernelStatusReport {
            status: KernelStatus::Failed,
            message: format!("kernel did not become ready within 15s at {}", kernel_url()),
            failure_code: Some("health_timeout".to_string()),
            repair_hint: Some(
                "Check stderr_tail for migration errors or port conflicts; try retry".to_string(),
            ),
            server_path: Some(path_string(server_path.clone())),
            php_path: Some(path_string(php.clone())),
            url: kernel_url(),
            port: KERNEL_PORT,
            queue_running: false,
            stdout_tail: vec![],
            stderr_tail: vec![],
        };
        let mut guard = state.inner.lock().await;
        guard.server_child = Some(server_child);
        guard.status = Some(report.clone());
        return report;
    }

    // 6. Server is ready · load token + spawn queue worker.
    let token = read_token_from_env(&server_path);
    export_env(&kernel_url(), token.as_deref());

    let worker_child = spawn_queue_worker(&php, &server_path, &stdout_tail, &stderr_tail).await.ok();
    let queue_running = worker_child.is_some();

    let report = KernelStatusReport {
        status: KernelStatus::Ready,
        message: "Kernel pronto".to_string(),
        failure_code: None,
        repair_hint: None,
        server_path: Some(path_string(server_path.clone())),
        php_path: Some(path_string(php.clone())),
        url: kernel_url(),
        port: KERNEL_PORT,
        queue_running,
        stdout_tail: vec![],
        stderr_tail: vec![],
    };

    let mut guard = state.inner.lock().await;
    guard.server_child = Some(server_child);
    guard.worker_child = worker_child;
    guard.status = Some(report.clone());
    report
}

async fn probe_health(timeout: Duration) -> bool {
    let client = match reqwest::Client::builder().timeout(timeout).build() {
        Ok(c) => c,
        Err(_) => return false,
    };
    matches!(
        client
            .get(format!("{}/health", kernel_url()))
            .send()
            .await,
        Ok(resp) if resp.status().is_success()
    )
}

async fn spawn_artisan_serve(
    php: &PathBuf,
    server_path: &PathBuf,
    stdout_tail: &Arc<Mutex<VecDeque<String>>>,
    stderr_tail: &Arc<Mutex<VecDeque<String>>>,
) -> std::io::Result<Child> {
    let mut cmd = Command::new(php);
    apply_env(&mut cmd);
    cmd.current_dir(server_path)
        .arg("artisan")
        .arg("serve")
        .arg(format!("--port={KERNEL_PORT}"))
        .arg(format!("--host={KERNEL_HOST}"))
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .stdin(Stdio::null())
        .kill_on_drop(true);
    tracing::info!(
        target: "kernel_manager",
        php = %php.display(),
        path = ?server_path,
        "spawning atlas-server"
    );
    let mut child = cmd.spawn()?;
    pump_stream(child.stdout.take(), Arc::clone(stdout_tail));
    pump_stream(child.stderr.take(), Arc::clone(stderr_tail));
    Ok(child)
}

async fn spawn_queue_worker(
    php: &PathBuf,
    server_path: &PathBuf,
    stdout_tail: &Arc<Mutex<VecDeque<String>>>,
    stderr_tail: &Arc<Mutex<VecDeque<String>>>,
) -> std::io::Result<Child> {
    let mut cmd = Command::new(php);
    apply_env(&mut cmd);
    cmd.current_dir(server_path)
        .arg("artisan")
        .arg("queue:work")
        .arg("--queue=default,ai-interactions,ai")
        .arg("--timeout=120")
        .arg("--tries=1")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .stdin(Stdio::null())
        .kill_on_drop(true);
    tracing::info!(target: "kernel_manager", path = ?server_path, "spawning queue:work");
    let mut child = cmd.spawn()?;
    pump_stream(child.stdout.take(), Arc::clone(stdout_tail));
    pump_stream(child.stderr.take(), Arc::clone(stderr_tail));
    Ok(child)
}

/// Spawn a task that drains an AsyncRead line-by-line into a rolling tail buffer.
fn pump_stream<R>(reader: Option<R>, tail: Arc<Mutex<VecDeque<String>>>)
where
    R: tokio::io::AsyncRead + Unpin + Send + 'static,
{
    let Some(r) = reader else { return };
    tokio::spawn(async move {
        let mut lines = BufReader::new(r).lines();
        while let Ok(Some(line)) = lines.next_line().await {
            let mut tail = tail.lock().await;
            if tail.len() >= TAIL_LINES {
                tail.pop_front();
            }
            tail.push_back(line);
        }
    });
}

/// Pre-load child env with a PATH that always includes brew + system bins.
/// macOS GUI launches start with `/usr/bin:/bin:/usr/sbin:/sbin` only — `php`
/// installed via `brew install php` (default `/opt/homebrew/bin`) is unreachable
/// without help. We prepend the well-known brew prefixes plus any existing PATH.
fn apply_env(cmd: &mut Command) {
    let extra = [
        "/opt/homebrew/bin",
        "/opt/homebrew/sbin",
        "/usr/local/bin",
        "/usr/local/sbin",
    ];
    let existing = std::env::var("PATH").unwrap_or_default();
    let mut parts: Vec<String> = extra.iter().map(|s| (*s).to_string()).collect();
    if !existing.is_empty() {
        parts.push(existing);
    }
    cmd.env("PATH", parts.join(":"));
}

/// Look for atlas-server in known locations.
/// Priority:
/// 1. ATLAS_SERVER_PATH env var (explicit override)
/// 2. ../atlas-server relative to the bundled .app's binary location
/// 3. ~/develop/Atlas/atlas-server (canonical layout)
fn locate_atlas_server() -> Result<PathBuf, String> {
    if let Ok(p) = std::env::var("ATLAS_SERVER_PATH") {
        let path = PathBuf::from(p);
        if validate_atlas_server(&path).is_ok() {
            return Ok(path);
        }
    }

    if let Ok(exe) = std::env::current_exe() {
        let mut candidate = exe.clone();
        for _ in 0..6 {
            candidate.pop();
            let sibling = candidate.join("atlas-server");
            if validate_atlas_server(&sibling).is_ok() {
                return Ok(sibling);
            }
        }
    }

    if let Some(home) = std::env::var_os("HOME") {
        let canonical = PathBuf::from(home)
            .join("develop")
            .join("Atlas")
            .join("atlas-server");
        if validate_atlas_server(&canonical).is_ok() {
            return Ok(canonical);
        }
    }

    Err("atlas-server folder not found · set ATLAS_SERVER_PATH or place it at ~/develop/Atlas/atlas-server".to_string())
}

fn validate_atlas_server(path: &PathBuf) -> Result<(), ()> {
    if !path.exists() {
        return Err(());
    }
    if !path.join("artisan").exists() {
        return Err(());
    }
    Ok(())
}

fn read_token_from_env(server_path: &PathBuf) -> Option<String> {
    let env_path = server_path.join(".env");
    let contents = std::fs::read_to_string(env_path).ok()?;
    for line in contents.lines() {
        if let Some(rest) = line.trim().strip_prefix("ATLAS_TOKEN=") {
            let token = rest.trim().trim_matches('"').to_string();
            if !token.is_empty() {
                return Some(token);
            }
        }
    }
    None
}

fn export_env(url: &str, token: Option<&str>) {
    // SAFETY: env writes happen during early boot before AtlasBridge is built;
    // the entire setup runs on a single Tauri thread.
    unsafe {
        std::env::set_var("ATLAS_SERVER_URL", url);
        if let Some(t) = token {
            std::env::set_var("ATLAS_TOKEN", t);
        }
    }
}

/// Find a usable `php` binary, falling back through known install paths
/// because macOS GUI app launches don't inherit the user's shell PATH.
fn resolve_php_binary() -> Option<PathBuf> {
    // 1. Explicit override.
    if let Ok(p) = std::env::var("PHP_BINARY") {
        let path = PathBuf::from(p);
        if path.exists() {
            return Some(path);
        }
    }
    // 2. Well-known install paths (Apple Silicon brew, Intel brew, MacPorts,
    //    asdf shim, system).
    let candidates = [
        "/opt/homebrew/bin/php",
        "/opt/homebrew/opt/php/bin/php",
        "/usr/local/bin/php",
        "/usr/local/opt/php/bin/php",
        "/opt/local/bin/php",
        "/usr/bin/php",
    ];
    for c in candidates {
        let path = PathBuf::from(c);
        if path.exists() {
            return Some(path);
        }
    }
    // 3. Last resort: `which php` inside the augmented PATH.
    if let Some(home) = std::env::var_os("HOME") {
        let asdf = PathBuf::from(home).join(".asdf/shims/php");
        if asdf.exists() {
            return Some(asdf);
        }
    }
    None
}

fn path_string(p: PathBuf) -> String {
    p.to_string_lossy().to_string()
}
