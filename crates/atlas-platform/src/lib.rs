//! Native platform boundary for Atlas Desktop.
//!
//! Owns:
//!   - PTY sessions through [`portable-pty`] (real shell, not simulated).
//!   - Filesystem watching through [`notify`].
//!
//! The Tauri shell wraps these in `tauri::command` handlers; the React side
//! uses xterm.js for the visual terminal and listens to `pty://data` events.
//!
//! Anti-mock canon: if a PTY can't be spawned (missing shell, permission),
//! we surface the OS error directly — no fake terminal output ever.

#![forbid(unsafe_code)]

pub mod fswatch;
pub mod pty;

pub use fswatch::{FsEvent, FsWatchHandle, watch_path};
pub use pty::{PtyHandle, PtyManager, PtyOpenRequest, PtySpawnedEvent};
