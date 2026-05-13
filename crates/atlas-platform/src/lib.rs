//! Native platform boundary for Atlas Desktop.
//!
//! Future ownership:
//! - PTY sessions through portable-pty.
//! - Filesystem watch through notify-rs.
//! - macOS capabilities through objc2-* or an opt-in Swift sidecar.

#[derive(Debug, Clone)]
pub struct PlatformBridge;

impl PlatformBridge {
    pub fn new() -> Self {
        Self
    }
}

impl Default for PlatformBridge {
    fn default() -> Self {
        Self::new()
    }
}
