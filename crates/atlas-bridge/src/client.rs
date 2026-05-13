//! AtlasBridge · the typed HTTP client wrapping all 12 MVP endpoints.
//!
//! Construction:
//!   let bridge = AtlasBridge::new(AtlasServerConfig::default())?;
//!
//! Each method matches the spec in src/endpoints.rs and returns a typed DTO
//! from src/dto.rs. SSE streaming is exposed as a Stream of `StreamEventDto`.

use crate::config::{AtlasServerConfig, BridgeAuth};
use crate::dto::*;
use crate::endpoints;
use crate::error::BridgeError;
use crate::BridgeResult;

use futures_util::stream::{Stream, StreamExt};
use reqwest::header::{HeaderMap, HeaderName, HeaderValue, ACCEPT, CONTENT_TYPE};
use reqwest::{Client, Method, RequestBuilder, Response};
use std::time::Duration;

#[derive(Clone)]
pub struct AtlasBridge {
    client: Client,
    config: AtlasServerConfig,
}

impl AtlasBridge {
    pub fn new(config: AtlasServerConfig) -> BridgeResult<Self> {
        let mut headers = HeaderMap::new();
        headers.insert(ACCEPT, HeaderValue::from_static("application/json"));
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
        if let BridgeAuth::Bearer { token } = &config.auth {
            // atlas-server middleware (AuthenticateAtlasToken) expects the
            // shared token in `X-Atlas-Token`, not the standard Authorization
            // header. We mirror what apps/desktop/src/lib/bridge.ts sends.
            let value = HeaderValue::from_str(token)
                .map_err(|e| BridgeError::InvalidPayload(e.to_string()))?;
            let header_name = HeaderName::from_static("x-atlas-token");
            headers.insert(header_name, value);
        }

        let client = Client::builder()
            .default_headers(headers)
            .timeout(Duration::from_millis(config.timeout_ms))
            .build()
            .map_err(|e| BridgeError::KernelOffline {
                url: config.base_url.clone(),
                source: e,
            })?;

        Ok(Self { client, config })
    }

    pub fn config(&self) -> &AtlasServerConfig {
        &self.config
    }

    fn url(&self, path: &str) -> String {
        format!("{}{}", self.config.base_url.trim_end_matches('/'), path)
    }

    fn build(&self, method: Method, path: &str) -> RequestBuilder {
        self.client.request(method, self.url(path))
    }

    async fn execute<T>(&self, req: RequestBuilder) -> BridgeResult<T>
    where
        T: serde::de::DeserializeOwned,
    {
        let response = req.send().await.map_err(|e| BridgeError::KernelOffline {
            url: self.config.base_url.clone(),
            source: e,
        })?;
        Self::extract_json(response).await
    }

    async fn extract_json<T>(response: Response) -> BridgeResult<T>
    where
        T: serde::de::DeserializeOwned,
    {
        let status = response.status();
        if !status.is_success() {
            let body = response.text().await.unwrap_or_default();
            return Err(BridgeError::from_status(status.as_u16(), body));
        }
        let body = response.text().await.map_err(BridgeError::KernelJson)?;
        Self::parse_json_body(&body)
    }

    fn parse_json_body<T>(body: &str) -> BridgeResult<T>
    where
        T: serde::de::DeserializeOwned,
    {
        serde_json::from_str::<T>(body).or_else(|first_error| {
            let Some(start) = body.find(|ch| ch == '{' || ch == '[') else {
                return Err(BridgeError::KernelInvalidJson(format!(
                    "{first_error}; response prefix: {}",
                    body.chars().take(160).collect::<String>()
                )));
            };

            serde_json::from_str::<T>(&body[start..]).map_err(|second_error| {
                BridgeError::KernelInvalidJson(format!(
                    "{second_error}; original parse error: {first_error}; response prefix: {}",
                    body.chars().take(160).collect::<String>()
                ))
            })
        })
    }

    // ────────────────────────────────────────────────────────────────────────
    // 1 · health · REUSE
    pub async fn health(&self) -> BridgeResult<HealthDto> {
        self.execute(self.build(Method::GET, endpoints::HEALTH))
            .await
    }

    // 2 · list obras · REUSE
    pub async fn list_obras(&self) -> BridgeResult<Vec<ObraDto>> {
        self.execute(self.build(Method::GET, endpoints::PROJECTS_LIST))
            .await
    }

    // 3 · create obra · WRAP (intent + objective added to POST /projects body)
    pub async fn create_obra(&self, intent: &str, objective: &str) -> BridgeResult<ObraDto> {
        let payload = CreateObraPayload {
            intent: intent.to_string(),
            objective: objective.to_string(),
        };
        self.execute(
            self.build(Method::POST, endpoints::PROJECTS_CREATE)
                .json(&payload),
        )
        .await
    }

    // 4 · list sessions for obra · NEW
    pub async fn list_sessions(&self, obra_id: &str) -> BridgeResult<Vec<SessionDto>> {
        let path = format!("{}{}/sessions", endpoints::ATLAS_CODE_SESSIONS, obra_id);
        self.execute(self.build(Method::GET, &path)).await
    }

    // 5 · get session (thread) · REUSE
    pub async fn get_session(&self, thread_id: &str) -> BridgeResult<Vec<MessageDto>> {
        let path = format!("{}{}", endpoints::THREAD_GET, thread_id);
        self.execute(self.build(Method::GET, &path)).await
    }

    // 6 · stream session events · REUSE (SSE)
    /// Returns a Stream of `StreamEventDto` parsed from SSE `data:` frames.
    pub async fn stream_session(
        &self,
        trace_id: &str,
        after_sequence: Option<u64>,
    ) -> BridgeResult<impl Stream<Item = BridgeResult<StreamEventDto>>> {
        let mut path = format!("{}{}/stream", endpoints::INTERACTION_STREAM, trace_id);
        if let Some(seq) = after_sequence {
            path.push_str(&format!("?after={seq}"));
        }
        let response = self
            .build(Method::GET, &path)
            .header(ACCEPT, "text/event-stream")
            .send()
            .await
            .map_err(|e| BridgeError::KernelOffline {
                url: self.config.base_url.clone(),
                source: e,
            })?;

        if !response.status().is_success() {
            let status = response.status().as_u16();
            let body = response.text().await.unwrap_or_default();
            return Err(BridgeError::from_status(status, body));
        }

        let stream = response
            .bytes_stream()
            .map(|chunk_result| -> BridgeResult<Vec<StreamEventDto>> {
                let chunk = chunk_result.map_err(BridgeError::StreamBroken)?;
                let text = String::from_utf8_lossy(&chunk);
                let mut events = Vec::new();
                for line in text.lines() {
                    if let Some(json) = line.strip_prefix("data: ") {
                        let parsed: StreamEventDto = serde_json::from_str(json)
                            .map_err(|e| BridgeError::InvalidPayload(e.to_string()))?;
                        events.push(parsed);
                    }
                }
                Ok(events)
            })
            .flat_map(|result| {
                futures_util::stream::iter(match result {
                    Ok(events) => events.into_iter().map(Ok).collect::<Vec<_>>(),
                    Err(e) => vec![Err(e)],
                })
            });

        Ok(stream)
    }

    // 7 · send intent (new message) · REUSE
    pub async fn send_intent(
        &self,
        session_id: &str,
        body: &str,
        channel: &str,
    ) -> BridgeResult<MessageDto> {
        let payload = SendIntentPayload {
            session_id: session_id.to_string(),
            body: body.to_string(),
            channel: channel.to_string(),
        };
        self.execute(
            self.build(Method::POST, endpoints::INTERACTION_CREATE)
                .json(&payload),
        )
        .await
    }

    // 8 · get decision receipt · WRAP (response includes signed_by + fallback_chain)
    pub async fn get_receipt(&self, decision_id: &str) -> BridgeResult<DecisionReceiptDto> {
        let path = format!("{}{}", endpoints::DECISION_GET, decision_id);
        self.execute(self.build(Method::GET, &path)).await
    }

    // 9 · sign receipt · NEW (desktop ed25519 → Kernel ledger)
    pub async fn sign_receipt(
        &self,
        decision_id: &str,
        signature: ReceiptSignaturePayload,
    ) -> BridgeResult<SignedReceiptAck> {
        let path = format!("{}{}/sign", endpoints::ATLAS_CODE_SIGN, decision_id);
        self.execute(self.build(Method::POST, &path).json(&signature))
            .await
    }

    // 10 · list evidence by obra · NEW (wraps /tools/evidence + /engineering/runs)
    pub async fn list_evidence(&self, obra_id: &str) -> BridgeResult<Vec<EvidenceDto>> {
        let path = format!("{}{}/evidence", endpoints::ATLAS_CODE_EVIDENCE, obra_id);
        self.execute(self.build(Method::GET, &path)).await
    }

    // 11a · list quality gates · REUSE
    pub async fn list_gates(&self) -> BridgeResult<Vec<QualityGateDto>> {
        self.execute(self.build(Method::GET, endpoints::TOOLS_GATE))
            .await
    }

    // 11b · run quality gate · REUSE
    pub async fn run_gate(&self, gate_id: &str) -> BridgeResult<GateRunDto> {
        let path = format!("{}{}/run", endpoints::TOOLS_RUN, gate_id);
        self.execute(self.build(Method::POST, &path)).await
    }

    // 12 · apply diff · NEW
    pub async fn apply_diff(
        &self,
        patch_id: &str,
        run_gates: Vec<String>,
    ) -> BridgeResult<ApplyDiffAck> {
        let path = format!("{}{}/apply", endpoints::ATLAS_CODE_APPLY_DIFF, patch_id);
        let payload = ApplyDiffPayload {
            confirm: true,
            run_gates,
        };
        self.execute(self.build(Method::POST, &path).json(&payload))
            .await
    }

    // ────────────────────────────────────────────────────────────────────
    // V2 · production-readiness endpoints (ADR-0002)
    // Returned as raw serde_json::Value so the frontend adapter owns shape.

    pub async fn boot_snapshot(&self) -> BridgeResult<serde_json::Value> {
        self.execute(self.build(Method::GET, endpoints::ATLAS_CODE_BOOT))
            .await
    }

    pub async fn mcp_status(&self) -> BridgeResult<serde_json::Value> {
        self.execute(self.build(Method::GET, endpoints::ATLAS_CODE_MCP_STATUS))
            .await
    }

    pub async fn list_works(&self) -> BridgeResult<serde_json::Value> {
        self.execute(self.build(Method::GET, endpoints::ATLAS_CODE_WORKS_LIST))
            .await
    }

    pub async fn create_work(
        &self,
        intent: &str,
        objective: &str,
        domain: Option<&str>,
    ) -> BridgeResult<serde_json::Value> {
        let mut body = serde_json::json!({
            "intent": intent,
            "objective": objective,
        });
        if let Some(d) = domain {
            body["domain"] = serde_json::Value::String(d.to_string());
        }
        self.execute(
            self.build(Method::POST, endpoints::ATLAS_CODE_WORKS_CREATE)
                .json(&body),
        )
        .await
    }

    pub async fn send_intent_v2(
        &self,
        thread_id: Option<&str>,
        body: &str,
        _channel: Option<&str>,
        obra_id: Option<&str>,
    ) -> BridgeResult<serde_json::Value> {
        let mut payload = serde_json::json!({
            "input_text": body,
            "source_type": "app",
            "kind": "interaction",
        });

        match thread_id.map(str::trim).filter(|id| !id.is_empty()) {
            Some(id) => payload["thread_id"] = serde_json::Value::String(id.to_string()),
            None => payload["new_thread"] = serde_json::Value::Bool(true),
        }

        if let Some(id) = obra_id.map(str::trim).filter(|id| !id.is_empty()) {
            payload["source_id"] = serde_json::Value::String(id.to_string());
        }

        self.execute(
            self.build(Method::POST, endpoints::INTERACTION_CREATE)
                .json(&payload),
        )
        .await
    }

    pub async fn get_work_state(&self, work_id: &str) -> BridgeResult<serde_json::Value> {
        let path = format!("{}{}/state", endpoints::ATLAS_CODE_WORK_STATE, work_id);
        self.execute(self.build(Method::GET, &path)).await
    }

    pub async fn get_thread_v2(&self, thread_id: &str) -> BridgeResult<serde_json::Value> {
        let path = format!("{}{}", endpoints::ATLAS_CODE_THREAD, thread_id);
        self.execute(self.build(Method::GET, &path)).await
    }

    pub async fn get_receipt_v2(&self, decision_id: &str) -> BridgeResult<serde_json::Value> {
        let path = format!("{}{}/receipt", endpoints::ATLAS_CODE_RECEIPT, decision_id);
        self.execute(self.build(Method::GET, &path)).await
    }

    pub async fn list_gate_runs_raw(&self) -> BridgeResult<serde_json::Value> {
        self.execute(self.build(Method::GET, endpoints::TOOLS_GATE))
            .await
    }

    // ────────────────────────────────────────────────────────────────────
    // CARTOGRAPHY · read-only graph + notes + recent changes
    // The cartography never writes to the filesystem; we just proxy GETs.

    /// Raw graph response — frontend adapts shape to camelCase domain types.
    pub async fn cartography_graph(&self) -> BridgeResult<serde_json::Value> {
        self.execute(self.build(Method::GET, endpoints::CARTOGRAPHY_GRAPH))
            .await
    }

    pub async fn cartography_recent_changes(&self) -> BridgeResult<serde_json::Value> {
        self.execute(self.build(Method::GET, endpoints::CARTOGRAPHY_RECENT_CHANGES))
            .await
    }

    pub async fn cartography_note(&self, graph_id: &str) -> BridgeResult<serde_json::Value> {
        let path = format!(
            "{}{}",
            endpoints::CARTOGRAPHY_NOTE,
            encode_path_segment(graph_id)
        );
        self.execute(self.build(Method::GET, &path)).await
    }
}

fn encode_path_segment(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    for byte in value.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(byte as char);
            }
            _ => out.push_str(&format!("%{byte:02X}")),
        }
    }
    out
}
