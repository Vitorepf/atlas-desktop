//! Endpoint catalog — single source of truth mapping the 12 MVP needs to
//! atlas-server routes. Built from the audit:
//!   docs/architecture/0001-atlas-desktop-boundaries.md
//!
//! REUSE = endpoint already exists in atlas-server today.
//! WRAP  = endpoint exists but request/response shape needs minor extension.
//! NEW   = endpoint must be created in the `atlas-code-mvp-endpoints` branch.

pub const HEALTH: &str = "/health";                                         // REUSE
pub const PROVIDERS_STATUS: &str = "/ai/providers/status";                  // REUSE

pub const PROJECTS_LIST: &str = "/projects";                                // REUSE
pub const PROJECTS_CREATE: &str = "/projects";                              // WRAP

pub const THREAD_GET: &str = "/ai/threads/";                                // REUSE (+ {id})
pub const INTERACTION_STREAM: &str = "/ai/interactions/";                   // REUSE (+ {id}/stream)
pub const INTERACTION_CREATE: &str = "/ai/interactions";                    // REUSE
pub const DECISION_GET: &str = "/ai/decisions/";                            // WRAP (+ {id})

pub const TOOLS_GATE: &str = "/tools/gate";                                 // REUSE
pub const TOOLS_RUN: &str = "/tools/";                                      // REUSE (+ {tool}/run)
pub const TOOLS_EVIDENCE: &str = "/tools/evidence";                         // REUSE

// NEW · created in atlas-server branch atlas-code-mvp-endpoints
pub const ATLAS_CODE_SESSIONS: &str = "/atlas-code/works/";                 // NEW (+ {work}/sessions)
pub const ATLAS_CODE_EVIDENCE: &str = "/atlas-code/works/";                 // NEW (+ {work}/evidence)
pub const ATLAS_CODE_SIGN: &str = "/atlas-code/decisions/";                 // NEW (+ {id}/sign)
pub const ATLAS_CODE_APPLY_DIFF: &str = "/atlas-code/diffs/";               // NEW (+ {patch}/apply)

// CARTOGRAPHY · read-only · GET endpoints exposed by AtlasCartographyController
pub const CARTOGRAPHY_GRAPH: &str = "/atlas-cartography/graph";
pub const CARTOGRAPHY_RECENT_CHANGES: &str = "/atlas-cartography/recent-changes";
pub const CARTOGRAPHY_NOTE: &str = "/atlas-cartography/note/";              // + {graph_id}
