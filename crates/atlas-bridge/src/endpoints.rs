//! Endpoint catalog — single source of truth mapping the 12 MVP needs to
//! atlas-server routes. Built from the audit:
//!   docs/architecture/0001-atlas-desktop-boundaries.md
//!
//! REUSE = endpoint already exists in atlas-server today.
//! WRAP  = endpoint exists but request/response shape needs minor extension.
//! NEW   = endpoint must be created in the `atlas-code-mvp-endpoints` branch.

pub const HEALTH: &str = "/api/health";                                         // REUSE
pub const PROVIDERS_STATUS: &str = "/api/ai/providers/status";                  // REUSE

pub const PROJECTS_LIST: &str = "/api/projects";                                // REUSE
pub const PROJECTS_CREATE: &str = "/api/projects";                              // WRAP

pub const THREAD_GET: &str = "/api/ai/threads/";                                // REUSE (+ {id})
pub const INTERACTION_STREAM: &str = "/api/ai/interactions/";                   // REUSE (+ {id}/stream)
pub const INTERACTION_CREATE: &str = "/api/ai/interactions";                    // REUSE
pub const DECISION_GET: &str = "/api/ai/decisions/";                            // WRAP (+ {id})

pub const TOOLS_GATE: &str = "/api/tools/gate";                                 // REUSE
pub const TOOLS_RUN: &str = "/api/tools/";                                      // REUSE (+ {tool}/run)
pub const TOOLS_EVIDENCE: &str = "/api/tools/evidence";                         // REUSE

// NEW · created in atlas-server branch atlas-code-mvp-endpoints
pub const ATLAS_CODE_SESSIONS: &str = "/api/atlas-code/works/";                 // NEW (+ {work}/sessions)
pub const ATLAS_CODE_EVIDENCE: &str = "/api/atlas-code/works/";                 // NEW (+ {work}/evidence)
pub const ATLAS_CODE_SIGN: &str = "/api/atlas-code/decisions/";                 // NEW (+ {id}/sign)
pub const ATLAS_CODE_APPLY_DIFF: &str = "/api/atlas-code/diffs/";               // NEW (+ {patch}/apply)
