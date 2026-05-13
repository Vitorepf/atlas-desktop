//! Configuration for the atlas-server transport.
//!
//! Loaded once at app boot from env or default. The desktop never persists
//! credentials — `BridgeAuth` is read from the Atlas Server session token.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AtlasServerConfig {
    pub base_url: String,
    pub timeout_ms: u64,
    pub auth: BridgeAuth,
}

impl Default for AtlasServerConfig {
    fn default() -> Self {
        Self {
            base_url: std::env::var("ATLAS_SERVER_URL")
                .unwrap_or_else(|_| "http://127.0.0.1:8000".to_string()),
            timeout_ms: 30_000,
            auth: BridgeAuth::None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum BridgeAuth {
    /// No auth (local dev only).
    None,
    /// Bearer token. Atlas Server middleware `atlas.token` accepts this.
    Bearer { token: String },
}

impl AtlasServerConfig {
    pub fn with_token(mut self, token: impl Into<String>) -> Self {
        self.auth = BridgeAuth::Bearer { token: token.into() };
        self
    }
}
