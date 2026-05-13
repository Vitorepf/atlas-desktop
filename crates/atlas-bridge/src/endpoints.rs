//! Endpoint catalog — single source of truth mapping the Desktop needs to
//! atlas-server routes. Built from the audit:
//!   docs/architecture/0001-atlas-desktop-boundaries.md
//!   docs/architecture/0002-code-cartography-production-readiness.md
//!
//! REUSE = endpoint already exists in atlas-server today.
//! WRAP  = endpoint exists but request/response shape needs minor extension.
//! NEW   = endpoint must be created in the `atlas-code-mvp-endpoints` branch.
//! V2    = added in production-readiness P0 (boot, mcp/status, works wrapper,
//!         thread wrapper, receipt v2).

pub const HEALTH: &str = "/health";                                         // REUSE
pub const PROVIDERS_STATUS: &str = "/ai/providers/status";                  // REUSE

pub const PROJECTS_LIST: &str = "/projects";                                // REUSE (legacy)
pub const PROJECTS_CREATE: &str = "/projects";                              // WRAP (legacy)

pub const THREAD_GET: &str = "/ai/threads/";                                // REUSE (+ {id})
pub const INTERACTION_STREAM: &str = "/ai/interactions/";                   // REUSE (+ {id}/stream)
pub const INTERACTION_CREATE: &str = "/ai/interactions";                    // REUSE
pub const DECISION_GET: &str = "/ai/decisions/";                            // WRAP (+ {id})

pub const TOOLS_GATE: &str = "/tools/gate";                                 // REUSE
pub const TOOLS_RUN: &str = "/tools/";                                      // REUSE (+ {tool}/run)
pub const TOOLS_EVIDENCE: &str = "/tools/evidence";                         // REUSE

// Atlas Code · NEW endpoints (atlas-code-mvp-endpoints branch)
pub const ATLAS_CODE_SESSIONS: &str = "/atlas-code/works/";                 // NEW (+ {work}/sessions)
pub const ATLAS_CODE_EVIDENCE: &str = "/atlas-code/works/";                 // NEW (+ {work}/evidence)
pub const ATLAS_CODE_SIGN: &str = "/atlas-code/decisions/";                 // NEW (+ {id}/sign)
pub const ATLAS_CODE_APPLY_DIFF: &str = "/atlas-code/diffs/";               // NEW (+ {patch}/apply)

// Atlas Code · V2 endpoints (production-readiness ADR-0002)
pub const ATLAS_CODE_BOOT: &str = "/atlas-code/boot";                       // V2
pub const ATLAS_CODE_MCP_STATUS: &str = "/atlas-code/mcp/status";           // V2
pub const ATLAS_CODE_WORKS_LIST: &str = "/atlas-code/works";                // V2
pub const ATLAS_CODE_WORKS_CREATE: &str = "/atlas-code/works";              // V2
pub const ATLAS_CODE_WORK_SHOW: &str = "/atlas-code/works/";                // V2 (+ {id})
pub const ATLAS_CODE_WORK_STATE: &str = "/atlas-code/works/";               // V2 (+ {id}/state)
pub const ATLAS_CODE_THREAD: &str = "/atlas-code/threads/";                 // V2 (+ {id})
pub const ATLAS_CODE_RECEIPT: &str = "/atlas-code/decisions/";              // V2 (+ {id}/receipt)

// CARTOGRAPHY · read-only · GET endpoints exposed by AtlasCartographyController
pub const CARTOGRAPHY_GRAPH: &str = "/atlas-cartography/graph";
pub const CARTOGRAPHY_RECENT_CHANGES: &str = "/atlas-cartography/recent-changes";
pub const CARTOGRAPHY_NOTE: &str = "/atlas-cartography/note/";              // + {graph_id}
