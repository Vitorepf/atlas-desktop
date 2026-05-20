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

    pub async fn get_atlas_code_enterprise_certification(&self) -> BridgeResult<serde_json::Value> {
        self.execute(self.build(Method::GET, endpoints::ATLAS_CODE_CERTIFICATION))
            .await
    }

    pub async fn run_atlas_code_enterprise_certification(
        &self,
        keep_workspace: bool,
    ) -> BridgeResult<serde_json::Value> {
        let body = serde_json::json!({
            "keep_workspace": keep_workspace,
        });
        self.execute(
            self.build(Method::POST, endpoints::ATLAS_CODE_CERTIFICATION)
                .json(&body),
        )
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
        composer_hints: Option<serde_json::Value>,
    ) -> BridgeResult<serde_json::Value> {
        let mut payload = serde_json::json!({
            "input_text": body,
            "source_type": "app",
            "kind": "interaction",
            "payload": {
                "app_surface": "atlas_code",
                "surface_id": "atlas_code",
                "requires_obra": true,
                "atlas_mode": "forge",
                "current_mode": "forge",
                "atlas_workflow_mode": "forge",
                "domain_id": "programming",
                "flow_id": "programming.forge",
                "routing_domain": "programming",
                "routing_task": "forge",
                "programming_profile": "forge",
                "programming_flow": "programming.forge",
                "dev_execution_plan": {
                    "programming_profile": "forge",
                    "programming_flow": "programming.forge",
                    "operator_options": {
                        "complete": true,
                        "auto_test": true
                    }
                }
            }
        });

        let hints = composer_hints
            .and_then(|value| value.as_object().cloned())
            .unwrap_or_default();
        let hint_mode = hints
            .get("mode")
            .and_then(|value| value.as_str())
            .unwrap_or("auto");
        let hint_task = hints
            .get("task")
            .and_then(|value| value.as_str())
            .unwrap_or("auto");
        let hint_provider = hints
            .get("provider")
            .and_then(|value| value.as_str())
            .unwrap_or("auto");
        let hint_compute_effort = hints
            .get("computeEffort")
            .or_else(|| hints.get("compute_effort"))
            .and_then(|value| value.as_str())
            .map(normalize_compute_effort)
            .unwrap_or_else(|| "auto".to_string());
        let requested_compute_effort = if hint_compute_effort == "auto" {
            None
        } else {
            Some(hint_compute_effort.clone())
        };
        let hinted_provider = if hint_provider.trim().is_empty() || hint_provider == "auto" {
            None
        } else {
            Some(hint_provider.to_string())
        };

        payload["payload"]["operator_composer_hints"] = serde_json::json!({
            "schema_version": "atlas.unified_composer.hints.v1",
            "mode": hint_mode,
            "task": hint_task,
            "provider": hint_provider,
            "compute_effort": hint_compute_effort,
            "preserves_surface_flow": true,
            "surface_flow": "programming.forge",
            "provider_selection_effect": if hinted_provider.is_some() {
                "operator_hint_requires_backend_policy"
            } else {
                "atlas_decide"
            }
        });
        payload["payload"]["operator_compute_effort"] =
            serde_json::Value::String(hint_compute_effort.clone());
        payload["payload"]["decision_mode"] = serde_json::Value::String(
            if hinted_provider.is_some() {
                "manual_override"
            } else {
                "atlas_decide"
            }
            .to_string(),
        );
        if let Some(provider) = hinted_provider {
            payload["payload"]["requested_provider"] = serde_json::Value::String(provider.clone());
            payload["payload"]["operator_requested_provider"] = serde_json::Value::String(provider);
        }
        if let Some(effort) = requested_compute_effort {
            payload["payload"]["compute_effort"] = serde_json::Value::String(effort.clone());
            payload["payload"]["policy_hints"] = serde_json::json!({
                "compute_effort": effort,
            });
            payload["payload"]["dev_execution_plan"]["operator_options"]["compute_effort"] =
                serde_json::Value::String(hint_compute_effort);
        }

        match thread_id.map(str::trim).filter(|id| !id.is_empty()) {
            Some(id) => payload["thread_id"] = serde_json::Value::String(id.to_string()),
            None => payload["new_thread"] = serde_json::Value::Bool(true),
        }

        if let Some(id) = obra_id.map(str::trim).filter(|id| !id.is_empty()) {
            payload["source_id"] = serde_json::Value::String(id.to_string());
            payload["payload"]["obra_id"] = serde_json::Value::String(id.to_string());
            payload["payload"]["work_id"] = serde_json::Value::String(id.to_string());
            payload["payload"]["project_id"] = serde_json::Value::String(id.to_string());
            payload["payload"]["forge_workspace"] = serde_json::json!({
                "schema_version": "atlas.forge_workspace_binding.v1",
                "workspace_kind": "obras_shared_workspace",
                "specialization": "forge_workspace",
                "obra_id": id,
                "source": "atlas_code"
            });
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

    pub async fn run_forge_live_execution(
        &self,
        work_id: &str,
        simulate_failure: bool,
    ) -> BridgeResult<serde_json::Value> {
        let path = format!(
            "{}{}/forge/live-executions",
            endpoints::ATLAS_CODE_WORK_FORGE_LIVE_EXECUTIONS,
            work_id
        );
        let body = serde_json::json!({
            "simulate_failure": simulate_failure,
        });
        self.execute(self.build(Method::POST, &path).json(&body))
            .await
    }

    pub async fn start_forge_live_execution_async(
        &self,
        work_id: &str,
        simulate_failure: bool,
    ) -> BridgeResult<serde_json::Value> {
        let path = format!(
            "{}{}/forge/live-executions/async",
            endpoints::ATLAS_CODE_WORK_FORGE_LIVE_EXECUTIONS_ASYNC,
            work_id
        );
        let body = serde_json::json!({
            "simulate_failure": simulate_failure,
        });
        self.execute(self.build(Method::POST, &path).json(&body))
            .await
    }

    pub async fn get_forge_live_execution_async(
        &self,
        work_id: &str,
        execution_id: &str,
    ) -> BridgeResult<serde_json::Value> {
        let path = format!(
            "{}{}/forge/live-executions/{}",
            endpoints::ATLAS_CODE_WORK_FORGE_LIVE_EXECUTION_ASYNC_SHOW,
            work_id,
            execution_id
        );
        self.execute(self.build(Method::GET, &path)).await
    }

    pub async fn get_forge_run_history_replay(
        &self,
        work_id: &str,
        history_id: &str,
    ) -> BridgeResult<serde_json::Value> {
        let path = format!(
            "{}{}/forge/live-executions/history/{}",
            endpoints::ATLAS_CODE_WORK_FORGE_LIVE_EXECUTION_HISTORY_SHOW,
            work_id,
            history_id
        );
        self.execute(self.build(Method::GET, &path)).await
    }

    pub async fn create_programming_work_item(
        &self,
        work_id: &str,
        intent: Option<&str>,
    ) -> BridgeResult<serde_json::Value> {
        let path = format!(
            "{}{}/programming/work-items",
            endpoints::ATLAS_CODE_WORK_PROGRAMMING_WORK_ITEMS,
            work_id
        );
        let body = serde_json::json!({
            "intent": intent,
        });
        self.execute(self.build(Method::POST, &path).json(&body))
            .await
    }

    pub async fn compile_programming_work_item_spec_plan(
        &self,
        work_id: &str,
        work_item_id: &str,
    ) -> BridgeResult<serde_json::Value> {
        let path = format!(
            "{}{}/programming/work-items/{}/spec",
            endpoints::ATLAS_CODE_WORK_PROGRAMMING_WORK_ITEM_SPEC,
            work_id,
            encode_path_segment(work_item_id)
        );
        let body = serde_json::json!({});
        self.execute(self.build(Method::POST, &path).json(&body))
            .await
    }

    pub async fn run_forge_fast_path(
        &self,
        work_id: &str,
        options: serde_json::Value,
    ) -> BridgeResult<serde_json::Value> {
        let path = format!(
            "{}{}/forge/fast-path",
            endpoints::ATLAS_CODE_WORK_FORGE_FAST_PATH,
            work_id
        );
        let body = match options {
            serde_json::Value::Object(_) => options,
            _ => serde_json::json!({}),
        };
        self.execute(self.build(Method::POST, &path).json(&body))
            .await
    }

    pub async fn get_forge_fast_path_status(
        &self,
        work_id: &str,
        run_id: &str,
    ) -> BridgeResult<serde_json::Value> {
        let path = format!(
            "{}{}/forge/fast-path/{}/status",
            endpoints::ATLAS_CODE_WORK_FORGE_FAST_PATH,
            work_id,
            encode_path_segment(run_id)
        );
        self.execute(self.build(Method::GET, &path)).await
    }

    pub async fn resume_forge_fast_path(
        &self,
        work_id: &str,
        run_id: &str,
    ) -> BridgeResult<serde_json::Value> {
        let path = format!(
            "{}{}/forge/fast-path/{}/resume",
            endpoints::ATLAS_CODE_WORK_FORGE_FAST_PATH,
            work_id,
            encode_path_segment(run_id)
        );
        let body = serde_json::json!({});
        self.execute(self.build(Method::POST, &path).json(&body))
            .await
    }

    pub async fn get_forge_review_packet(
        &self,
        work_id: &str,
        run_id: &str,
    ) -> BridgeResult<serde_json::Value> {
        let path = format!(
            "{}{}/forge/fast-path/{}/review",
            endpoints::ATLAS_CODE_WORK_FORGE_FAST_PATH,
            work_id,
            encode_path_segment(run_id)
        );
        self.execute(self.build(Method::GET, &path)).await
    }

    pub async fn decide_forge_review(
        &self,
        work_id: &str,
        run_id: &str,
        decision: &str,
        payload: serde_json::Value,
    ) -> BridgeResult<serde_json::Value> {
        let path = format!(
            "{}{}/forge/fast-path/{}/review/{}",
            endpoints::ATLAS_CODE_WORK_FORGE_FAST_PATH,
            work_id,
            encode_path_segment(run_id),
            encode_path_segment(decision)
        );
        let body = match payload {
            serde_json::Value::Object(_) => payload,
            _ => serde_json::json!({}),
        };
        self.execute(self.build(Method::POST, &path).json(&body))
            .await
    }

    pub async fn get_forge_work_intake(
        &self,
        work_id: &str,
    ) -> BridgeResult<serde_json::Value> {
        let path = format!(
            "{}{}/forge/intake",
            endpoints::ATLAS_CODE_WORK_FORGE_INTAKE,
            work_id,
        );
        self.execute(self.build(Method::GET, &path)).await
    }

    pub async fn save_forge_work_intake(
        &self,
        work_id: &str,
        payload: serde_json::Value,
    ) -> BridgeResult<serde_json::Value> {
        let path = format!(
            "{}{}/forge/intake",
            endpoints::ATLAS_CODE_WORK_FORGE_INTAKE,
            work_id,
        );
        let body = match payload {
            serde_json::Value::Object(_) => payload,
            _ => serde_json::json!({}),
        };
        self.execute(self.build(Method::POST, &path).json(&body))
            .await
    }

    /// Atlas Forge Provider Topology read-model — never calls external provider.
    /// Schema: atlas.forge.provider_topology.v1
    pub async fn get_forge_provider_topology(
        &self,
        work_id: &str,
        options: Option<serde_json::Value>,
    ) -> BridgeResult<serde_json::Value> {
        let path = format!(
            "{}{}/forge/provider-topology",
            endpoints::ATLAS_CODE_WORK_FORGE_PROVIDER_TOPOLOGY,
            work_id,
        );

        let mut request = self.build(Method::GET, &path);
        if let Some(opts) = options {
            if let Some(map) = opts.as_object() {
                let mut pairs: Vec<(String, String)> = Vec::new();
                for (key, value) in map {
                    if value.is_null() {
                        continue;
                    }
                    if let Some(s) = value.as_str() {
                        if !s.is_empty() {
                            pairs.push((key.clone(), s.to_string()));
                        }
                    }
                }
                if !pairs.is_empty() {
                    request = request.query(&pairs);
                }
            }
        }

        self.execute(request).await
    }

    /// Atlas Forge Provider Capacity — local read-model snapshot for the 5
    /// canonical Forge runtime providers. Never calls a provider.
    /// Schema: atlas.forge.provider_capacity.v1
    pub async fn get_forge_provider_capacity(
        &self,
        work_id: Option<&str>,
    ) -> BridgeResult<serde_json::Value> {
        let path = match work_id {
            Some(id) => format!(
                "{}{}/forge/provider-capacity",
                endpoints::ATLAS_CODE_WORK_FORGE_PROVIDER_CAPACITY,
                id,
            ),
            None => endpoints::ATLAS_CODE_FORGE_PROVIDER_CAPACITY.to_string(),
        };

        self.execute(self.build(Method::GET, &path)).await
    }

    /// Atlas Forge Provider Failure Memory — record a governed failure event.
    /// Returns the recorded event + updated capacity snapshot + memory.
    /// Schema: atlas.forge.provider_failure_memory_event.v1
    pub async fn record_forge_provider_failure(
        &self,
        work_id: &str,
        payload: serde_json::Value,
    ) -> BridgeResult<serde_json::Value> {
        let path = format!(
            "{}{}/forge/provider-failures",
            endpoints::ATLAS_CODE_WORK_FORGE_PROVIDER_FAILURES,
            work_id,
        );
        let body = match payload {
            serde_json::Value::Object(_) => payload,
            _ => serde_json::json!({}),
        };

        self.execute(self.build(Method::POST, &path).json(&body))
            .await
    }

    /// Atlas Forge Continuum Certification — slim audit projection for desktop.
    /// Full audit: `php artisan atlas:forge:continuum-certify --json --strict`.
    /// Schema: atlas.forge_continuum_certification.v1
    pub async fn get_forge_continuum_certification(
        &self,
        work_id: &str,
        options: Option<serde_json::Value>,
    ) -> BridgeResult<serde_json::Value> {
        let path = format!(
            "{}{}/forge/continuum-certification",
            endpoints::ATLAS_CODE_WORK_FORGE_CONTINUUM_CERTIFICATION,
            work_id,
        );

        let mut request = self.build(Method::GET, &path);
        if let Some(opts) = options {
            if let Some(map) = opts.as_object() {
                let mut pairs: Vec<(String, String)> = Vec::new();
                for (key, value) in map {
                    if value.is_null() {
                        continue;
                    }
                    if let Some(s) = value.as_str() {
                        if !s.is_empty() {
                            pairs.push((key.clone(), s.to_string()));
                        }
                    } else if let Some(b) = value.as_bool() {
                        if b {
                            pairs.push((key.clone(), "true".to_string()));
                        }
                    }
                }
                if !pairs.is_empty() {
                    request = request.query(&pairs);
                }
            }
        }

        self.execute(request).await
    }

    /// Atlas Forge Runtime Dispatch · POST prepare governed dispatch plan.
    /// Schema: atlas.forge.runtime_dispatch_plan.v1
    pub async fn run_forge_runtime_dispatch(
        &self,
        work_id: &str,
        payload: serde_json::Value,
    ) -> BridgeResult<serde_json::Value> {
        let path = format!(
            "{}{}/forge/runtime-dispatch",
            endpoints::ATLAS_CODE_WORK_FORGE_RUNTIME_DISPATCH,
            work_id
        );
        let body = match payload {
            serde_json::Value::Object(_) => payload,
            _ => serde_json::json!({}),
        };
        self.execute(self.build(Method::POST, &path).json(&body))
            .await
    }

    /// Atlas Forge Runtime Dispatch · GET latest dispatch plan for work.
    pub async fn get_forge_runtime_dispatch(
        &self,
        work_id: &str,
    ) -> BridgeResult<serde_json::Value> {
        let path = format!(
            "{}{}/forge/runtime-dispatch",
            endpoints::ATLAS_CODE_WORK_FORGE_RUNTIME_DISPATCH,
            work_id
        );
        self.execute(self.build(Method::GET, &path)).await
    }

    /// Atlas Forge Governed Provider Invocation · POST prepare/execute invocation.
    /// NEVER calls external provider unless caller sets confirm_provider_call +
    /// confirm_budget (external) + confirm_runtime_dispatch and the driver is configured.
    /// Schema: atlas.forge.provider_invocation.v1
    pub async fn run_forge_provider_invocation(
        &self,
        work_id: &str,
        payload: serde_json::Value,
    ) -> BridgeResult<serde_json::Value> {
        let path = format!(
            "{}{}/forge/provider-invocations",
            endpoints::ATLAS_CODE_WORK_FORGE_PROVIDER_INVOCATIONS,
            work_id
        );
        let body = match payload {
            serde_json::Value::Object(_) => payload,
            _ => serde_json::json!({}),
        };
        self.execute(self.build(Method::POST, &path).json(&body))
            .await
    }

    /// Atlas Forge Governed Provider Invocation · GET latest invocation for work.
    pub async fn get_forge_provider_invocation_latest(
        &self,
        work_id: &str,
    ) -> BridgeResult<serde_json::Value> {
        let path = format!(
            "{}{}/forge/provider-invocations/latest",
            endpoints::ATLAS_CODE_WORK_FORGE_PROVIDER_INVOCATION_LATEST,
            work_id
        );
        self.execute(self.build(Method::GET, &path)).await
    }

    /// Atlas Code Forge UX Orchestrator · GET human state machine read-model.
    /// Schema: atlas.code.forge_ux_orchestrator.v1
    pub async fn get_forge_ux_orchestrator(
        &self,
        work_id: &str,
    ) -> BridgeResult<serde_json::Value> {
        let path = format!(
            "{}{}/forge/ux-orchestrator",
            endpoints::ATLAS_CODE_WORK_FORGE_UX_ORCHESTRATOR,
            work_id
        );
        self.execute(self.build(Method::GET, &path)).await
    }

    /// Atlas Forge Real Provider Drivers · GET driver status (router + 4 drivers).
    /// NEVER calls external provider.
    /// Schema: atlas.forge.provider_driver_router_status.v1
    pub async fn get_forge_provider_drivers(
        &self,
        work_id: &str,
    ) -> BridgeResult<serde_json::Value> {
        let path = format!(
            "{}{}/forge/provider-invocations/drivers",
            endpoints::ATLAS_CODE_WORK_FORGE_PROVIDER_DRIVERS,
            work_id
        );
        self.execute(self.build(Method::GET, &path)).await
    }

    /// Atlas Forge Real Provider Drivers · POST plan driver packet (no provider call).
    /// Schema: atlas.forge.provider_driver_plan_packet.v1
    pub async fn plan_forge_provider_driver(
        &self,
        work_id: &str,
        payload: serde_json::Value,
    ) -> BridgeResult<serde_json::Value> {
        let path = format!(
            "{}{}/forge/provider-invocations/plan-driver",
            endpoints::ATLAS_CODE_WORK_FORGE_PROVIDER_PLAN_DRIVER,
            work_id
        );
        let body = match payload {
            serde_json::Value::Object(_) => payload,
            _ => serde_json::json!({}),
        };
        self.execute(self.build(Method::POST, &path).json(&body))
            .await
    }

    pub async fn create_checkpoint(
        &self,
        work_id: &str,
        reason: Option<&str>,
    ) -> BridgeResult<serde_json::Value> {
        let path = format!(
            "{}{}/checkpoints",
            endpoints::ATLAS_CODE_WORK_CHECKPOINTS,
            work_id
        );
        let body = serde_json::json!({
            "reason": reason.unwrap_or("manual"),
        });
        self.execute(self.build(Method::POST, &path).json(&body))
            .await
    }

    pub async fn review_forge_run(
        &self,
        work_id: &str,
        decision: &str,
        comment: Option<&str>,
    ) -> BridgeResult<serde_json::Value> {
        let path = format!(
            "{}{}/forge/reviews",
            endpoints::ATLAS_CODE_WORK_FORGE_REVIEWS,
            work_id
        );
        let body = serde_json::json!({
            "decision": decision,
            "comment": comment.unwrap_or("local operator review"),
        });
        self.execute(self.build(Method::POST, &path).json(&body))
            .await
    }

    pub async fn rollback_forge_promotion(
        &self,
        work_id: &str,
        promotion_id: &str,
        comment: Option<&str>,
    ) -> BridgeResult<serde_json::Value> {
        let path = format!(
            "{}{}/forge/promotions/{}/rollback",
            endpoints::ATLAS_CODE_WORK_FORGE_REVIEWS,
            work_id,
            promotion_id
        );
        let body = serde_json::json!({
            "comment": comment.unwrap_or("operator rollback"),
        });
        self.execute(self.build(Method::POST, &path).json(&body))
            .await
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

    // ────────────────────────────────────────────────────────────────────
    // ATLAS SELF-IMPROVEMENT ACTIVATION COCKPIT v1
    //
    // Schema canonico: atlas.self_improvement.activation_cockpit.v1
    // Doc: docs/engineering-knowledge-base/atlas-self-improvement-activation-cockpit-v1.md
    //
    // The cockpit is pure read-model + 2 humans-only mutations
    // (accept/reject) that NEVER auto-execute Fast Path, NEVER call a
    // provider and NEVER unlock external_rivals_certification. Mutations
    // require reviewer + reason.

    /// Cockpit list + counters + summary (read-only).
    pub async fn list_self_improvement_forge_activations(
        &self,
        status: Option<String>,
        bucket: Option<String>,
        has_obra: Option<bool>,
    ) -> BridgeResult<serde_json::Value> {
        let mut path = String::from("/atlas-code/self-improvement/activation-cockpit");
        let mut params: Vec<String> = Vec::new();
        if let Some(s) = status {
            if !s.is_empty() {
                params.push(format!("status={}", encode_path_segment(&s)));
            }
        }
        if let Some(b) = bucket {
            if !b.is_empty() {
                params.push(format!("bucket={}", encode_path_segment(&b)));
            }
        }
        if let Some(value) = has_obra {
            params.push(format!("has_obra={}", value));
        }
        if !params.is_empty() {
            path.push('?');
            path.push_str(&params.join("&"));
        }
        self.execute(self.build(Method::GET, &path)).await
    }

    /// Cockpit detail (humanised projection) for one activation.
    pub async fn get_self_improvement_forge_activation(
        &self,
        activation_id: &str,
    ) -> BridgeResult<serde_json::Value> {
        let path = format!(
            "/atlas-code/self-improvement/activation-cockpit/{}",
            encode_path_segment(activation_id)
        );
        self.execute(self.build(Method::GET, &path)).await
    }

    /// Plan a new activation via the canonical mutation endpoint. Returns
    /// the activation payload (controller enriches with human_summary +
    /// next_safe_action). NEVER auto-executes Fast Path.
    pub async fn create_self_improvement_forge_activation(
        &self,
        payload: serde_json::Value,
    ) -> BridgeResult<serde_json::Value> {
        let path = "/atlas-code/self-improvement/forge-activations";
        self.execute(self.build(Method::POST, path).json(&payload))
            .await
    }

    /// Accept activation — requires reviewer + reason. Materialises an
    /// Obra but does not start Fast Path.
    pub async fn accept_self_improvement_forge_activation(
        &self,
        activation_id: &str,
        payload: serde_json::Value,
    ) -> BridgeResult<serde_json::Value> {
        let path = format!(
            "/atlas-code/self-improvement/forge-activations/{}/accept",
            encode_path_segment(activation_id)
        );
        self.execute(self.build(Method::POST, &path).json(&payload))
            .await
    }

    /// Reject activation — requires reviewer + reason. Records rejection,
    /// never creates an Obra.
    pub async fn reject_self_improvement_forge_activation(
        &self,
        activation_id: &str,
        payload: serde_json::Value,
    ) -> BridgeResult<serde_json::Value> {
        let path = format!(
            "/atlas-code/self-improvement/forge-activations/{}/reject",
            encode_path_segment(activation_id)
        );
        self.execute(self.build(Method::POST, &path).json(&payload))
            .await
    }

    /// Atlas Code Provider Arena · read-only snapshot for the RightRail
    /// panel. Combines arm registry, modes, presets, task categories,
    /// safety promises and the local run history.
    /// Schema: atlas.code.provider_arena_snapshot.v1
    pub async fn get_provider_arena_snapshot(
        &self,
        history_limit: Option<u32>,
    ) -> BridgeResult<serde_json::Value> {
        let mut request = self.build(
            Method::GET,
            endpoints::ATLAS_CODE_FORGE_PROVIDER_ARENA_SNAPSHOT,
        );
        if let Some(limit) = history_limit {
            request = request.query(&[("history_limit", limit.to_string())]);
        }
        self.execute(request).await
    }

    /// Atlas Code Provider Arena · dispatch a `run-arena` action.
    /// The controller enforces the three-confirmation contract on real-
    /// provider modes; `local_fake` never spends tokens.
    pub async fn run_provider_arena(
        &self,
        payload: serde_json::Value,
    ) -> BridgeResult<serde_json::Value> {
        let body = match payload {
            serde_json::Value::Object(_) => payload,
            _ => serde_json::json!({}),
        };
        self.execute(
            self.build(Method::POST, endpoints::ATLAS_CODE_FORGE_PROVIDER_ARENA_RUN)
                .json(&body),
        )
        .await
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

fn normalize_compute_effort(value: &str) -> String {
    match value.trim().to_ascii_lowercase().as_str() {
        "fast" | "quick" | "low" => "fast".to_string(),
        "balanced" | "normal" | "medium" => "balanced".to_string(),
        "deep" | "high" | "think" | "thinking" => "deep".to_string(),
        "max" | "xhigh" | "maximum" | "ultra" => "max".to_string(),
        _ => "auto".to_string(),
    }
}
