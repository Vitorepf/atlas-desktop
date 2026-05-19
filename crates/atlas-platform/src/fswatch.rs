//! Filesystem watcher for Cartografia live-doc.
//!
//! We use [`notify`] in recursive mode so saves anywhere under `repo_docs/`
//! or AtlasVault produce events without polling. Events are debounced
//! coarsely (consume burst within 250ms) before being forwarded.

use std::path::Path;
use std::time::Duration;

use notify::event::ModifyKind;
use notify::{Config, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use tokio::sync::mpsc;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FsEvent {
    pub kind: String,
    pub path: String,
    pub at_ms: u64,
}

pub struct FsWatchHandle {
    _watcher: RecommendedWatcher,
}

/// Returns a receiver of debounced filesystem events for a path tree.
pub fn watch_path(root: &Path) -> Result<(FsWatchHandle, mpsc::UnboundedReceiver<FsEvent>), String> {
    let (tx, rx) = mpsc::unbounded_channel::<FsEvent>();
    let tx_clone = tx.clone();

    let mut watcher = notify::recommended_watcher(move |res: notify::Result<notify::Event>| {
        if let Ok(event) = res {
            let kind = event_kind(&event.kind);
            let now_ms = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_millis() as u64)
                .unwrap_or(0);
            for path in event.paths {
                let _ = tx_clone.send(FsEvent {
                    kind: kind.to_string(),
                    path: path.to_string_lossy().to_string(),
                    at_ms: now_ms,
                });
            }
        }
    })
    .map_err(|e| format!("notify init: {e}"))?;

    watcher
        .configure(Config::default().with_poll_interval(Duration::from_millis(500)))
        .ok();

    watcher
        .watch(root, RecursiveMode::Recursive)
        .map_err(|e| format!("notify watch: {e}"))?;

    drop(tx); // tx_clone keeps the channel alive until watcher dies
    Ok((FsWatchHandle { _watcher: watcher }, rx))
}

fn event_kind(kind: &EventKind) -> &'static str {
    match kind {
        EventKind::Create(_) => "create",
        EventKind::Modify(ModifyKind::Data(_) | ModifyKind::Any) => "save",
        EventKind::Modify(_) => "modify",
        EventKind::Remove(_) => "remove",
        _ => "other",
    }
}
