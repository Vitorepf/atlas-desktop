//! Bridge boundary between Atlas Desktop and atlas-server.
//!
//! This crate must stay transport-oriented. It does not decide provider,
//! policy, memory, evidence or routing. The Kernel does that.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AtlasServerConfig {
    pub base_url: String,
}

impl Default for AtlasServerConfig {
    fn default() -> Self {
        Self {
            base_url: "http://127.0.0.1:8000".to_string(),
        }
    }
}
