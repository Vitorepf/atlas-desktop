//! atlas-bridge · HTTP/SSE client to atlas-server.
//!
//! Boundary contract:
//! - This is the ONLY network surface in the desktop. Frontends call into Tauri
//!   commands; the commands call into `AtlasBridge`; `AtlasBridge` calls
//!   atlas-server.
//! - This crate must stay transport-oriented. It does not decide provider,
//!   policy, memory, evidence or routing — the Kernel does that.
//! - Each function maps to one of the 12 MVP needs identified in the audit.
//!   See README + ADR-0001 for the canonical split.

#![forbid(unsafe_code)]

pub mod config;
pub mod dto;
pub mod error;

mod client;
mod endpoints;

pub use client::AtlasBridge;
pub use config::{AtlasServerConfig, BridgeAuth};
pub use error::BridgeError;

pub use dto::{
    ApplyDiffAck, ApplyDiffPayload, CreateObraPayload, DecisionReceiptDto, EvidenceDto, GateRunDto,
    HealthDto, MessageDto, ObraDto, PacketDto, QualityGateDto, ReceiptSignaturePayload,
    SendIntentPayload, SessionDto, SignedReceiptAck, StreamEventDto,
};

pub type BridgeResult<T> = Result<T, BridgeError>;
