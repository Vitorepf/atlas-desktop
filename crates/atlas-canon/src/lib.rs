//! Local canon guardrails for the desktop surface.
//!
//! Canon authority remains in atlas-server and canonical source files. This
//! crate exists to prevent obvious local UI/runtime violations before requests
//! reach the Kernel.

#[derive(Debug, Clone)]
pub enum CanonSource {
    Repo,
    Vault,
    Kernel,
    Runtime,
}
