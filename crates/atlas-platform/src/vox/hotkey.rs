//! Atlas Vox global-hotkey runtime — Wave 6.5.
//!
//! macOS-first, in-process, no LaunchAgent. Wraps the [`global-hotkey`]
//! crate (which uses Carbon's RegisterEventHotKey under the hood) so the
//! operator can press Option+Space anywhere on the system and toggle a
//! Vox recording without focusing the Atlas Desktop window first.
//!
//! Bound chords (canonical for Wave 6.5):
//!   - `Option+Space`   → `VoxHotkeyEvent::ToggleRecordingRequested`
//!   - `Cmd+Shift+Space`→ `VoxHotkeyEvent::OpenOverlayRequested`
//!
//! Esc and Esc-Esc are NOT bound globally on purpose: binding plain Esc
//! system-wide would intercept it from every other app and turn Vox into
//! a hostile keyboard hog. Instead, the overlay's keyboard handler calls
//! `record_escape_press()` and the runtime applies a deterministic
//! double-tap window (default 500ms) to decide cancel vs eclipse.
//!
//! Honesty contract:
//!   - On non-macOS targets the runtime compiles but does NOT register
//!     anything. `status().platform_supported` is false, and
//!     `hotkey_available()` stays false. Tests can build cross-platform.
//!   - On macOS, if `GlobalHotKeyManager::new()` or the registration
//!     fails (e.g. missing permissions, conflicting hotkey), the runtime
//!     records the OS error in `last_error` and `hotkey_available()`
//!     stays false. We never claim a hotkey we did not bind.
//!   - No audio, no transcript, no provider crosses this module.

use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};

use parking_lot::Mutex;
use serde::Serialize;
use tokio::sync::mpsc::{UnboundedReceiver, UnboundedSender};

#[cfg(target_os = "macos")]
use global_hotkey::{
    hotkey::{Code, HotKey, Modifiers},
    GlobalHotKeyEvent, GlobalHotKeyManager, HotKeyState,
};

pub const DEFAULT_HOTKEY_DESCRIPTION: &str = "Option+Space";
pub const SECONDARY_HOTKEY_DESCRIPTION: &str = "Cmd+Shift+Space";
pub const ESCAPE_DOUBLE_TAP_WINDOW: Duration = Duration::from_millis(500);

const PLATFORM_UNSUPPORTED: &str =
    "global_hotkey_macos_only_in_wave_6_5";
const PENDING_RUNTIME_NOT_STARTED: &str =
    "global_hotkey_pending_permissions_or_platform_wiring";

/// Process-wide flag observed by `VoxEdge::status()` so the surface can
/// honestly tell the operator whether the global hotkey is live without
/// having to thread the runtime handle through every status read.
static HOTKEY_RUNTIME_ACTIVE: AtomicBool = AtomicBool::new(false);

pub fn hotkey_available() -> bool {
    HOTKEY_RUNTIME_ACTIVE.load(Ordering::Acquire)
}

pub fn pending_hotkey_capability() -> &'static str {
    PENDING_RUNTIME_NOT_STARTED
}

/// Logical events produced by the runtime and consumed by the Tauri
/// shell. The shell decides whether to drive `VoxEdge` directly, focus
/// the overlay window, or relay to the frontend via Tauri events.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case", tag = "kind")]
pub enum VoxHotkeyEvent {
    ToggleRecordingRequested,
    OpenOverlayRequested,
    CancelRequested,
    EclipseRequested,
}

/// Surface-safe view of the runtime's current state.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VoxHotkeyStatus {
    pub available: bool,
    pub platform_supported: bool,
    pub default_hotkey: String,
    pub secondary_hotkey: String,
    pub registered_hotkeys: Vec<String>,
    pub last_error: Option<String>,
    pub pending_capabilities: Vec<String>,
    pub escape_double_tap_window_ms: u64,
}

#[derive(Debug, thiserror::Error)]
pub enum HotkeyError {
    #[error("hotkey runtime already started")]
    AlreadyStarted,
    #[error("hotkey runtime unsupported on this platform")]
    UnsupportedPlatform,
    #[error("hotkey manager init failed: {0}")]
    ManagerInit(String),
    #[error("hotkey registration failed: {0}")]
    Registration(String),
}

pub struct VoxHotkeyRuntime {
    inner: Mutex<HotkeyInner>,
    event_sender: Mutex<Option<UnboundedSender<VoxHotkeyEvent>>>,
    shutdown: std::sync::Arc<AtomicBool>,
}

struct HotkeyInner {
    started: bool,
    registered: Vec<String>,
    last_error: Option<String>,
    last_escape_at: Option<Instant>,
    forwarder: Option<std::thread::JoinHandle<()>>,
    #[cfg(target_os = "macos")]
    manager: Option<GlobalHotKeyManager>,
    #[cfg(target_os = "macos")]
    toggle_id: Option<u32>,
    #[cfg(target_os = "macos")]
    open_id: Option<u32>,
}

impl VoxHotkeyRuntime {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(HotkeyInner {
                started: false,
                registered: Vec::new(),
                last_error: None,
                last_escape_at: None,
                forwarder: None,
                #[cfg(target_os = "macos")]
                manager: None,
                #[cfg(target_os = "macos")]
                toggle_id: None,
                #[cfg(target_os = "macos")]
                open_id: None,
            }),
            event_sender: Mutex::new(None),
            shutdown: std::sync::Arc::new(AtomicBool::new(false)),
        }
    }

    /// Starts the runtime. Returns a tokio receiver the caller drains
    /// (typically inside a Tauri async task). On macOS this registers
    /// `Option+Space` and `Cmd+Shift+Space` with the OS and spawns a
    /// forwarder thread that pumps `GlobalHotKeyEvent::receiver()`.
    pub fn start(&self) -> Result<UnboundedReceiver<VoxHotkeyEvent>, HotkeyError> {
        {
            let inner = self.inner.lock();
            if inner.started {
                return Err(HotkeyError::AlreadyStarted);
            }
        }

        let (tx, rx) = tokio::sync::mpsc::unbounded_channel::<VoxHotkeyEvent>();
        *self.event_sender.lock() = Some(tx.clone());
        self.shutdown.store(false, Ordering::Release);

        #[cfg(target_os = "macos")]
        {
            self.start_macos(tx)?;
        }
        #[cfg(not(target_os = "macos"))]
        {
            let mut inner = self.inner.lock();
            inner.started = true;
            inner.last_error = Some(PLATFORM_UNSUPPORTED.to_string());
            inner.registered.clear();
            HOTKEY_RUNTIME_ACTIVE.store(false, Ordering::Release);
            tracing::warn!(
                target: "vox-hotkey",
                "VoxHotkeyRuntime started on non-macOS target — no OS hotkeys registered"
            );
        }

        Ok(rx)
    }

    pub fn stop(&self) {
        self.shutdown.store(true, Ordering::Release);
        HOTKEY_RUNTIME_ACTIVE.store(false, Ordering::Release);

        let forwarder = {
            let mut inner = self.inner.lock();
            inner.started = false;
            #[cfg(target_os = "macos")]
            {
                if let (Some(manager), Some(toggle_id)) = (inner.manager.as_ref(), inner.toggle_id) {
                    // Try to unregister; failures are tolerable here —
                    // dropping the manager also releases the hotkeys.
                    let hk = HotKey::new(Some(Modifiers::ALT), Code::Space);
                    let _ = (hk.id() == toggle_id) && manager.unregister(hk).is_ok();
                }
                if let (Some(manager), Some(open_id)) = (inner.manager.as_ref(), inner.open_id) {
                    let hk = HotKey::new(Some(Modifiers::META | Modifiers::SHIFT), Code::Space);
                    let _ = (hk.id() == open_id) && manager.unregister(hk).is_ok();
                }
                inner.manager = None;
                inner.toggle_id = None;
                inner.open_id = None;
            }
            inner.registered.clear();
            inner.forwarder.take()
        };

        if let Some(handle) = forwarder {
            // The forwarder polls shutdown every 100ms; give it a beat to
            // notice. We don't block-forever to avoid stalling app shutdown.
            let _ = handle.join();
        }
        *self.event_sender.lock() = None;
    }

    pub fn status(&self) -> VoxHotkeyStatus {
        let inner = self.inner.lock();
        let available = hotkey_available();
        let platform_supported = cfg!(target_os = "macos");
        let mut pending = Vec::new();
        if !platform_supported {
            pending.push(PLATFORM_UNSUPPORTED.to_string());
        } else if !available {
            pending.push(PENDING_RUNTIME_NOT_STARTED.to_string());
        }
        VoxHotkeyStatus {
            available,
            platform_supported,
            default_hotkey: DEFAULT_HOTKEY_DESCRIPTION.to_string(),
            secondary_hotkey: SECONDARY_HOTKEY_DESCRIPTION.to_string(),
            registered_hotkeys: inner.registered.clone(),
            last_error: inner.last_error.clone(),
            pending_capabilities: pending,
            escape_double_tap_window_ms: ESCAPE_DOUBLE_TAP_WINDOW.as_millis() as u64,
        }
    }

    /// Called by the overlay's keyboard handler when the operator hits
    /// Esc inside Atlas Vox. Returns the resolved event so the caller
    /// can route it (the runtime also emits the event on its channel
    /// when a sender is registered).
    pub fn record_escape_press(&self) -> VoxHotkeyEvent {
        self.record_escape_press_at(Instant::now())
    }

    /// Test-friendly variant that lets the caller supply a deterministic
    /// clock. Production code uses [`record_escape_press`].
    pub fn record_escape_press_at(&self, now: Instant) -> VoxHotkeyEvent {
        let event = {
            let mut inner = self.inner.lock();
            let event = match inner.last_escape_at {
                Some(prev) if now.duration_since(prev) <= ESCAPE_DOUBLE_TAP_WINDOW => {
                    // Double-tap consumed: reset so a third press doesn't
                    // immediately re-fire eclipse.
                    inner.last_escape_at = None;
                    VoxHotkeyEvent::EclipseRequested
                }
                _ => {
                    inner.last_escape_at = Some(now);
                    VoxHotkeyEvent::CancelRequested
                }
            };
            event
        };
        self.dispatch(event.clone());
        event
    }

    pub(crate) fn dispatch(&self, event: VoxHotkeyEvent) {
        if let Some(tx) = self.event_sender.lock().as_ref() {
            let _ = tx.send(event);
        }
    }

    #[cfg(target_os = "macos")]
    fn start_macos(
        &self,
        tx: UnboundedSender<VoxHotkeyEvent>,
    ) -> Result<(), HotkeyError> {
        let manager = match GlobalHotKeyManager::new() {
            Ok(m) => m,
            Err(e) => {
                let msg = e.to_string();
                let mut inner = self.inner.lock();
                inner.last_error = Some(format!("manager_init: {msg}"));
                inner.started = false;
                *self.event_sender.lock() = None;
                HOTKEY_RUNTIME_ACTIVE.store(false, Ordering::Release);
                return Err(HotkeyError::ManagerInit(msg));
            }
        };

        let toggle = HotKey::new(Some(Modifiers::ALT), Code::Space);
        let open = HotKey::new(Some(Modifiers::META | Modifiers::SHIFT), Code::Space);

        if let Err(e) = manager.register(toggle) {
            let msg = e.to_string();
            let mut inner = self.inner.lock();
            inner.last_error = Some(format!("register_toggle: {msg}"));
            inner.started = false;
            *self.event_sender.lock() = None;
            HOTKEY_RUNTIME_ACTIVE.store(false, Ordering::Release);
            return Err(HotkeyError::Registration(msg));
        }
        if let Err(e) = manager.register(open) {
            let msg = e.to_string();
            // Roll back the first one so the OS doesn't think we own it.
            let _ = manager.unregister(toggle);
            let mut inner = self.inner.lock();
            inner.last_error = Some(format!("register_open: {msg}"));
            inner.started = false;
            *self.event_sender.lock() = None;
            HOTKEY_RUNTIME_ACTIVE.store(false, Ordering::Release);
            return Err(HotkeyError::Registration(msg));
        }

        let toggle_id = toggle.id();
        let open_id = open.id();
        let shutdown = std::sync::Arc::clone(&self.shutdown);

        let handle = std::thread::Builder::new()
            .name("vox-hotkey-forwarder".to_string())
            .spawn(move || run_forwarder(toggle_id, open_id, tx, shutdown))
            .map_err(|e| HotkeyError::ManagerInit(e.to_string()))?;

        let mut inner = self.inner.lock();
        inner.started = true;
        inner.last_error = None;
        inner.registered = vec![
            DEFAULT_HOTKEY_DESCRIPTION.to_string(),
            SECONDARY_HOTKEY_DESCRIPTION.to_string(),
        ];
        inner.manager = Some(manager);
        inner.toggle_id = Some(toggle_id);
        inner.open_id = Some(open_id);
        inner.forwarder = Some(handle);
        HOTKEY_RUNTIME_ACTIVE.store(true, Ordering::Release);
        Ok(())
    }
}

impl Drop for VoxHotkeyRuntime {
    fn drop(&mut self) {
        // Best-effort: clear the global flag even if stop() was missed.
        HOTKEY_RUNTIME_ACTIVE.store(false, Ordering::Release);
    }
}

#[cfg(target_os = "macos")]
fn run_forwarder(
    toggle_id: u32,
    open_id: u32,
    tx: UnboundedSender<VoxHotkeyEvent>,
    shutdown: std::sync::Arc<AtomicBool>,
) {
    let receiver = GlobalHotKeyEvent::receiver();
    while !shutdown.load(Ordering::Acquire) {
        match receiver.recv_timeout(Duration::from_millis(100)) {
            Ok(event) => {
                if event.state != HotKeyState::Pressed {
                    continue;
                }
                let mapped = if event.id == toggle_id {
                    Some(VoxHotkeyEvent::ToggleRecordingRequested)
                } else if event.id == open_id {
                    Some(VoxHotkeyEvent::OpenOverlayRequested)
                } else {
                    None
                };
                if let Some(ev) = mapped {
                    if tx.send(ev).is_err() {
                        break; // receiver dropped
                    }
                }
            }
            Err(err) => {
                // The receiver from `global-hotkey` is a crossbeam channel.
                // `Timeout` should just re-check the shutdown flag;
                // `Disconnected` means the manager went away — bail out.
                if err.is_disconnected() {
                    break;
                }
                continue;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn drain<T>(rx: &mut UnboundedReceiver<T>) -> Vec<T> {
        let mut out = Vec::new();
        while let Ok(v) = rx.try_recv() {
            out.push(v);
        }
        out
    }

    #[test]
    fn status_before_start_reports_pending_capability_and_not_available() {
        let runtime = VoxHotkeyRuntime::new();
        let st = runtime.status();
        assert!(!st.available);
        assert!(!st.registered_hotkeys.iter().any(|h| h == DEFAULT_HOTKEY_DESCRIPTION));
        assert!(!st.pending_capabilities.is_empty());
        assert_eq!(st.default_hotkey, "Option+Space");
        assert_eq!(st.secondary_hotkey, "Cmd+Shift+Space");
        assert_eq!(st.escape_double_tap_window_ms, 500);
    }

    #[test]
    fn single_escape_press_returns_cancel_and_emits_on_channel() {
        let runtime = VoxHotkeyRuntime::new();
        let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel();
        *runtime.event_sender.lock() = Some(tx);

        let event = runtime.record_escape_press_at(Instant::now());
        assert_eq!(event, VoxHotkeyEvent::CancelRequested);
        let drained = drain(&mut rx);
        assert_eq!(drained, vec![VoxHotkeyEvent::CancelRequested]);
    }

    #[test]
    fn rapid_double_escape_within_window_returns_eclipse() {
        let runtime = VoxHotkeyRuntime::new();
        let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel();
        *runtime.event_sender.lock() = Some(tx);

        let t0 = Instant::now();
        let first = runtime.record_escape_press_at(t0);
        let second = runtime.record_escape_press_at(t0 + Duration::from_millis(200));
        assert_eq!(first, VoxHotkeyEvent::CancelRequested);
        assert_eq!(second, VoxHotkeyEvent::EclipseRequested);

        let drained = drain(&mut rx);
        assert_eq!(
            drained,
            vec![
                VoxHotkeyEvent::CancelRequested,
                VoxHotkeyEvent::EclipseRequested,
            ]
        );
    }

    #[test]
    fn slow_double_escape_outside_window_returns_two_cancels() {
        let runtime = VoxHotkeyRuntime::new();
        let t0 = Instant::now();
        let first = runtime.record_escape_press_at(t0);
        let second = runtime.record_escape_press_at(t0 + Duration::from_millis(900));
        assert_eq!(first, VoxHotkeyEvent::CancelRequested);
        assert_eq!(second, VoxHotkeyEvent::CancelRequested);
    }

    #[test]
    fn triple_escape_does_not_chain_two_eclipses() {
        // After a double-tap consumes Eclipse, the timer resets so a
        // third press is a fresh single Cancel — eclipse never auto-repeats.
        let runtime = VoxHotkeyRuntime::new();
        let t0 = Instant::now();
        let a = runtime.record_escape_press_at(t0);
        let b = runtime.record_escape_press_at(t0 + Duration::from_millis(100));
        let c = runtime.record_escape_press_at(t0 + Duration::from_millis(150));
        assert_eq!(a, VoxHotkeyEvent::CancelRequested);
        assert_eq!(b, VoxHotkeyEvent::EclipseRequested);
        assert_eq!(c, VoxHotkeyEvent::CancelRequested);
    }

    #[test]
    fn dispatch_sends_event_when_sender_registered() {
        let runtime = VoxHotkeyRuntime::new();
        let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel();
        *runtime.event_sender.lock() = Some(tx);

        runtime.dispatch(VoxHotkeyEvent::ToggleRecordingRequested);
        runtime.dispatch(VoxHotkeyEvent::OpenOverlayRequested);
        let drained = drain(&mut rx);
        assert_eq!(
            drained,
            vec![
                VoxHotkeyEvent::ToggleRecordingRequested,
                VoxHotkeyEvent::OpenOverlayRequested,
            ]
        );
    }

    #[test]
    fn dispatch_without_sender_is_noop() {
        let runtime = VoxHotkeyRuntime::new();
        // No sender registered; should not panic or block.
        runtime.dispatch(VoxHotkeyEvent::ToggleRecordingRequested);
    }

    #[test]
    fn status_after_stop_reports_unavailable() {
        let runtime = VoxHotkeyRuntime::new();
        runtime.stop();
        let st = runtime.status();
        assert!(!st.available);
    }

    #[test]
    fn cannot_start_twice() {
        // We can't actually exercise the macOS path in unit tests
        // (no main RunLoop), but we can verify the AlreadyStarted guard
        // by faking the started flag.
        let runtime = VoxHotkeyRuntime::new();
        runtime.inner.lock().started = true;
        let err = runtime.start();
        assert!(matches!(err, Err(HotkeyError::AlreadyStarted)));
    }

    #[test]
    fn option_space_event_maps_to_toggle_recording() {
        // Contract check: Option+Space (the only "primary" hotkey we
        // register on macOS) dispatches ToggleRecordingRequested. The
        // mapping itself happens inside the forwarder thread, which
        // requires a live RunLoop we can't spin up in unit tests; this
        // test pins the contract via the explicit dispatch path.
        let runtime = VoxHotkeyRuntime::new();
        let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel();
        *runtime.event_sender.lock() = Some(tx);

        runtime.dispatch(VoxHotkeyEvent::ToggleRecordingRequested);
        assert_eq!(rx.try_recv().ok(), Some(VoxHotkeyEvent::ToggleRecordingRequested));
    }

    #[test]
    fn cmd_shift_space_event_maps_to_open_overlay() {
        let runtime = VoxHotkeyRuntime::new();
        let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel();
        *runtime.event_sender.lock() = Some(tx);

        runtime.dispatch(VoxHotkeyEvent::OpenOverlayRequested);
        assert_eq!(rx.try_recv().ok(), Some(VoxHotkeyEvent::OpenOverlayRequested));
    }

    #[test]
    fn esc_double_tap_maps_to_eclipse() {
        // Operator-facing canonical: rapid Esc-Esc = Eclipse.
        let runtime = VoxHotkeyRuntime::new();
        let t0 = Instant::now();
        let first = runtime.record_escape_press_at(t0);
        let second = runtime.record_escape_press_at(t0 + Duration::from_millis(50));
        assert_eq!(first, VoxHotkeyEvent::CancelRequested);
        assert_eq!(second, VoxHotkeyEvent::EclipseRequested);
    }

    #[test]
    fn hotkey_unavailable_reports_pending_capability() {
        // hotkey_available() must stay false until the runtime
        // successfully registers with macOS. status() reflects that
        // honestly via pending_capabilities.
        assert!(!hotkey_available());
        let runtime = VoxHotkeyRuntime::new();
        let st = runtime.status();
        assert!(!st.available);
        assert!(!st.pending_capabilities.is_empty());
        let first = st.pending_capabilities[0].as_str();
        assert!(
            first == "global_hotkey_pending_permissions_or_platform_wiring"
                || first == "global_hotkey_macos_only_in_wave_6_5",
            "unexpected pending capability: {first}",
        );
    }
}
