//! Bridge error taxonomy.
//!
//! Errors are classified so the UI can decide between retry, show "Kernel
//! offline", or escalate.

use thiserror::Error;

#[derive(Debug, Error)]
pub enum BridgeError {
    #[error("kernel offline · could not reach atlas-server at {url}")]
    KernelOffline { url: String, source: reqwest::Error },

    #[error("kernel responded with status {status} · body: {body}")]
    KernelStatus { status: u16, body: String },

    #[error("kernel response was not valid json: {0}")]
    KernelJson(#[source] reqwest::Error),

    #[error("kernel stream broke mid-flight: {0}")]
    StreamBroken(#[source] reqwest::Error),

    #[error("payload validation failed: {0}")]
    InvalidPayload(String),

    #[error("auth required · provide BridgeAuth::Bearer in config")]
    AuthMissing,

    #[error("auth rejected by kernel")]
    AuthRejected,
}

impl BridgeError {
    pub fn from_status(status: u16, body: String) -> Self {
        match status {
            401 | 403 => Self::AuthRejected,
            _ => Self::KernelStatus { status, body },
        }
    }

    /// True if the UI should show an explicit offline indicator.
    pub fn is_offline(&self) -> bool {
        matches!(self, Self::KernelOffline { .. })
    }
}
