import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const client = readFileSync(new URL('../client.ts', import.meta.url), 'utf8')
const hook = readFileSync(new URL('../useAtlasAi.ts', import.meta.url), 'utf8')
const threadList = readFileSync(new URL('../components/AtlasAiThreadList.tsx', import.meta.url), 'utf8')
const conversation = readFileSync(new URL('../components/AtlasAiConversation.tsx', import.meta.url), 'utf8')
const threadContextMenu = readFileSync(new URL('../components/AtlasAiThreadContextMenu.tsx', import.meta.url), 'utf8')
const contextPanel = readFileSync(new URL('../components/AtlasAiContextPanel.tsx', import.meta.url), 'utf8')
const decisionBadge = readFileSync(new URL('../components/AtlasAiDecisionBadge.tsx', import.meta.url), 'utf8')
const openBrainBadge = readFileSync(new URL('../components/AtlasAiOpenBrainBadge.tsx', import.meta.url), 'utf8')
const planIndicators = readFileSync(new URL('../components/AtlasAiPlanIndicators.tsx', import.meta.url), 'utf8')
const promotionPanel = readFileSync(new URL('../components/AtlasAiPromotionPanel.tsx', import.meta.url), 'utf8')
const errorBanner = readFileSync(new URL('../components/AtlasAiErrorBanner.tsx', import.meta.url), 'utf8')
const surface = readFileSync(new URL('../AtlasAiSurface.tsx', import.meta.url), 'utf8')
const types = readFileSync(new URL('../types.ts', import.meta.url), 'utf8')
const css = readFileSync(new URL('../atlas-ai.css', import.meta.url), 'utf8')
const tauriBridgeCommands = readFileSync(new URL('../../../../../../crates/atlas-tauri/src/commands_bridge.rs', import.meta.url), 'utf8')
const tauriLib = readFileSync(new URL('../../../../../../crates/atlas-tauri/src/lib.rs', import.meta.url), 'utf8')
const nativeBridgeClient = readFileSync(new URL('../../../../../../crates/atlas-bridge/src/client.rs', import.meta.url), 'utf8')

assert.match(
  client,
  /opts:\s*\{\s*limit\?: number; threadIds\?: string\[\]; persist\?: boolean\s*\}/,
  'conversation fusion client must expose persist option',
)
assert.match(
  client,
  /if \(opts\.persist\) params\.set\('persist', '1'\)/,
  'conversation fusion client must request persist=1 when asked',
)
assert.match(
  client,
  /getWorkspaceArtifactLakeEntry/,
  'Desktop client must expose persisted AWIS artifact inspection',
)
assert.match(
  client,
  /MODE === 'tauri'[\s\S]*bridge_atlas_ai_http_json/,
  'Atlas AI packaged app must use the native bridge so AWIS does not depend on VITE_ATLAS_TOKEN baked into the bundle.',
)
assert.match(
  tauriBridgeCommands,
  /pub async fn bridge_atlas_ai_http_json[\s\S]*request_json\(&method, &path, body\)/,
  'Tauri must expose an authenticated local JSON bridge for Atlas AI endpoints.',
)
assert.match(
  tauriLib,
  /commands_bridge::bridge_atlas_ai_http_json/,
  'The authenticated Atlas AI JSON bridge must be registered in the Tauri invoke handler.',
)
assert.match(
  nativeBridgeClient,
  /pub async fn request_json[\s\S]*path\.starts_with\("\/ai\/"\)[\s\S]*path\.starts_with\("\/atlas-code\/"\)[\s\S]*self\.execute\(request\)\.await/,
  'The native bridge must proxy only allowlisted local Atlas API paths with the kernel ATLAS_TOKEN.',
)
assert.match(
  client,
  /getAtlasAwisLearningLoop/,
  'Desktop client must read the certified AWIS learning loop instead of relying only on local heuristics',
)
assert.match(
  client,
  /export async function getAtlasAwisLearningLoop[\s\S]*try \{[\s\S]*fetchJson<AtlasAwisLearningLoop>[\s\S]*\} catch \{[\s\S]*return null[\s\S]*\}/,
  'AWIS learning-loop hydration must be fail-soft so backend errors never replace the local brain.',
)
assert.match(
  client,
  /getAtlasServerHealth/,
  'Desktop client must expose a local health probe so AWIS can explain backend/database failures before showing generic errors',
)
assert.match(
  client,
  /fetchJson<AtlasServerHealth>\('\/health'\)/,
  'AWIS health gate must use the canonical atlas-server /health endpoint',
)
assert.match(
  client,
  /\/atlas-code\/workspace-intelligence\/learning-loop\?\$\{params\.toString\(\)\}/,
  'Certified AWIS loop must use the server workspace-intelligence learning-loop endpoint',
)
assert.match(
  client,
  /persistAtlasAwisRuntimeSnapshot/,
  'Desktop client must materialize a durable AWIS runtime snapshot, not only read local heuristics.',
)
assert.match(
  client,
  /export async function persistAtlasAwisRuntimeSnapshot[\s\S]*try \{[\s\S]*fetchJson<AtlasAwisRuntimeSnapshot>[\s\S]*\} catch \{[\s\S]*return null[\s\S]*\}/,
  'AWIS runtime snapshot persistence must be fail-soft when the server is unavailable or returns 5xx.',
)
assert.match(
  client,
  /getAtlasAwisArtifactIntelligence/,
  'Desktop client must read canonical server Artifact Intelligence so Space context survives beyond local UI state.',
)
assert.match(
  client,
  /export async function getAtlasAwisArtifactIntelligence[\s\S]*try \{[\s\S]*fetchJson<AtlasAwisArtifactIntelligence>[\s\S]*\} catch \{[\s\S]*return null[\s\S]*\}/,
  'AWIS artifact intelligence hydration must be fail-soft so stale/500 responses do not surface as user-facing errors.',
)
assert.match(
  client,
  /getAtlasAwisNextSessionBrain/,
  'Desktop client must read the canonical next-session brain so new conversations do not start cold.',
)
assert.match(
  client,
  /getAtlasAwisLiveExecutionMemory/,
  'Desktop client must read the canonical live execution memory so Spaces and sessions survive app restarts.',
)
assert.match(
  client,
  /export async function getAtlasAwisNextSessionBrain[\s\S]*try \{[\s\S]*fetchJson<AtlasAwisNextSessionBrain>[\s\S]*\} catch \{[\s\S]*return null[\s\S]*\}/,
  'AWIS next-session brain hydration must be fail-soft so new conversations fall back to local startup gold.',
)
assert.match(
  client,
  /export async function getAtlasAwisLiveExecutionMemory[\s\S]*try \{[\s\S]*fetchJson<AtlasAwisLiveExecutionMemory>[\s\S]*\} catch \{[\s\S]*return null[\s\S]*\}/,
  'AWIS live execution memory hydration must be fail-soft so stale/500 responses never break the local workspace.',
)
assert.match(
  client,
  /getAtlasAwisHandoffPack/,
  'Desktop client must read the canonical handoff pack for provider-safe workspace resume context.',
)
assert.match(
  client,
  /export async function getAtlasAwisHandoffPack[\s\S]*try \{[\s\S]*fetchJson<AtlasAwisHandoffPack>[\s\S]*\} catch \{[\s\S]*return null[\s\S]*\}/,
  'AWIS handoff pack hydration must be fail-soft so provider-safe context degrades gracefully.',
)
assert.match(
  client,
  /\/atlas-code\/workspace-intelligence\?\$\{params\.toString\(\)\}/,
  'Durable AWIS snapshots must use the canonical workspace-intelligence endpoint.',
)
assert.match(
  client,
  /\/atlas-code\/workspace-intelligence\/artifact-intelligence\?\$\{params\.toString\(\)\}/,
  'Canonical AWIS artifact replay must use the server artifact-intelligence endpoint.',
)
assert.match(
  client,
  /\/atlas-code\/workspace-intelligence\/next-session-brain\?\$\{params\.toString\(\)\}/,
  'Canonical AWIS startup brain must use the server next-session-brain endpoint.',
)
assert.match(
  client,
  /\/atlas-code\/workspace-intelligence\/live-execution-memory\?\$\{params\.toString\(\)\}/,
  'Canonical AWIS live memory must use the server live-execution-memory endpoint.',
)
assert.match(
  client,
  /\/atlas-code\/workspace-intelligence\/handoff-pack\?\$\{params\.toString\(\)\}/,
  'Canonical AWIS handoff context must use the server handoff-pack endpoint.',
)
assert.match(
  hook,
  /lastTerminalTrace: AiTrace \| null/,
  'Atlas AI hook must expose the terminal trace so AWIS learns from the real outcome, not only send start.',
)
assert.match(
  hook,
  /setLastTerminalTrace\(trace\)[\s\S]*setPendingTrace\(null\)/,
  'Terminal polling must publish the completed trace before clearing pending state.',
)
assert.match(
  hook,
  /const PENDING_TRACE_RESUME_STORAGE_KEY = 'atlas-desktop:atlas-ai:pending-trace-resume:v1'/,
  'Pending traces must be durable enough for AWIS to learn after a surface reload.',
)
assert.match(
  hook,
  /function isSafePendingTraceResumeText[\s\S]*operator_input\|response_text\|raw\[_ \]conversation\|full\[_ \]message/,
  'Pending trace resume storage must not persist raw prompt/response text.',
)
assert.match(
  hook,
  /savePendingTraceResume\(\{ traceId, threadId, workspaceSlug \}\)[\s\S]*clearPendingTraceResume\(traceId\)[\s\S]*setLastTerminalTrace\(trace\)/,
  'Trace polling must persist the resume pointer and clear it only after publishing the terminal trace.',
)
assert.match(
  hook,
  /const entry = readPendingTraceResume\(\)[\s\S]*getAiTrace\(entry\.traceId\)[\s\S]*setPendingTrace\(trace\)[\s\S]*pollTrace\(entry\.traceId, entry\.threadId\)/,
  'Startup must resume polling a pending trace instead of losing the outcome across reloads.',
)
assert.match(
  hook,
  /function awisThreadMetadataFromContext\(conversationContext\?: unknown\[\]\)/,
  'New conversations must persist a compact AWIS metadata handshake instead of depending only on transient payload context.',
)
assert.match(
  hook,
  /awis_context_applied: true[\s\S]*awis_provider_safe: true[\s\S]*awis_load_first/,
  'AWIS thread metadata must stay provider-safe and preserve the startup load contract.',
)
assert.match(
  hook,
  /awis_provider_strategy[\s\S]*awis_execution_doctrine[\s\S]*awis_memory_freshness[\s\S]*awis_confidence[\s\S]*awis_learning_flywheel[\s\S]*awis_launch_contract[\s\S]*awis_topology/,
  'AWIS thread metadata must persist advanced brain projections, not only transient payload hints.',
)
assert.match(
  hook,
  /awis_never_start_cold[\s\S]*awis_launch_mode[\s\S]*awis_startup_context_mode[\s\S]*awis_startup_prefer_summary[\s\S]*awis_startup_load_sequence[\s\S]*awis_startup_revalidate_before_send[\s\S]*awis_startup_human_boundary[\s\S]*awis_startup_readiness/,
  'AWIS thread metadata must persist the startup contract so future Spaces and sessions do not start cold.',
)
assert.match(
  hook,
  /function providerSafePercent[\s\S]*startup: providerSafePercent\(startupReadiness\?\.startup\)[\s\S]*context_kernel: providerSafePercent\(startupReadiness\?\.context_kernel\)[\s\S]*artifact_replay: providerSafePercent\(startupReadiness\?\.artifact_replay\)[\s\S]*next_session_brain: providerSafePercent\(startupReadiness\?\.next_session_brain\)/,
  'AWIS thread metadata must persist bounded readiness scores for later Space and workspace learning.',
)
assert.match(
  hook,
  /awis_space_focus[\s\S]*awis_space_continuity[\s\S]*awis_space_brain[\s\S]*awis_live_memory_hash[\s\S]*awis_live_load_first[\s\S]*awis_context_budget[\s\S]*awis_priority_load[\s\S]*awis_startup_gold/,
  'New thread metadata must preserve the living AWIS handoff: Spaces, Space brain, live memory, context kernel and startup gold.',
)
assert.match(
  hook,
  /const validate = providerSafeStringList\(space\.validate_before_use, 2\)[\s\S]*const automation = providerSafeStringList\(space\.automation_hooks, 2\)[\s\S]*const human = providerSafeStringList\(space\.human_boundary, 2\)[\s\S]*const artifacts = providerSafeStringList\(space\.artifact_refs, 2\)[\s\S]*validate,[\s\S]*automation,[\s\S]*human,[\s\S]*artifacts,/,
  'Persisted AWIS Space brain metadata must carry validation, automation, human boundaries and artifact refs so future Spaces learn recursively.',
)
assert.match(
  hook,
  /awis_folder_focus[\s\S]*awis_task_context_budget[\s\S]*awis_evidence_gate[\s\S]*awis_working_set[\s\S]*awis_impact_radius[\s\S]*awis_next_session_contract[\s\S]*awis_continue_learning/,
  'AWIS thread metadata must persist the task autopilot contract: focused folders, evidence gates, working set, impact and next-session learning.',
)
assert.match(
  hook,
  /const transferContract = objectRecord\(recommendedContext\?\.transfer_contract\)[\s\S]*awis_transfer_contract: \{[\s\S]*workspace_hints: providerSafeStringList\(transferContract\?\.workspace_hints, 4\)[\s\S]*reuse: providerSafeStringList\(transferContract\?\.reuse, 5\)[\s\S]*validate_before_use: providerSafeStringList\(transferContract\?\.validate_before_use, 5\)[\s\S]*never_transfer: providerSafeStringList\(transferContract\?\.never_transfer, 4\)/,
  'AWIS thread metadata must persist provider-safe cross-workspace transfer contracts so Spaces can reuse relations without raw paths.',
)
assert.match(
  hook,
  /const awisMetadata = awisThreadMetadataFromContext\(options\?\.conversationContext\)[\s\S]*const awisMetadataForThread = Object\.keys\(awisMetadata\)\.length > 0[\s\S]*awis_context_refreshed_at: new Date\(\)\.toISOString\(\)[\s\S]*created_via: 'atlas_desktop_ai'[\s\S]*\.\.\.awisMetadataForThread/,
  'Thread creation metadata must include the AWIS startup handshake and refresh receipt.',
)
assert.match(
  hook,
  /existingThreadIdBeforeSend && Object\.keys\(awisMetadataForThread\)\.length > 0[\s\S]*await updateAiThread\(existingThreadIdBeforeSend, \{[\s\S]*metadata: refreshedMetadata/,
  'Existing conversations must refresh AWIS metadata before sending so sessions do not continue cold.',
)
assert.match(
  client,
  /\/atlas-code\/workspace-intelligence\/artifact-lake\/\$\{encodeURIComponent\(artifact\)\}/,
  'Persisted fusion artifact inspection must use the workspace Artifact Lake endpoint',
)
assert.match(
  hook,
  /refreshConversationFusion: \(threadIds\?: string\[\], opts\?: \{ persist\?: boolean \}\) => Promise<AtlasWorkspaceConversationFusion \| null>/,
  'Atlas AI hook must expose persist control and return the generated workspace fusion pack',
)
assert.match(
  hook,
  /return fusion/,
  'Persisted AWIS Space saves must return the materialized artifact reference to the Desktop receipt cache',
)
assert.match(
  hook,
  /persist: opts\.persist === true/,
  'Atlas AI hook must forward persist=true only when a manual caller asks for materialization',
)
assert.match(
  hook,
  /inspectConversationFusionArtifact: \(artifact\?: string \| null\) => Promise<void>/,
  'Atlas AI hook must expose persisted fusion artifact inspection',
)
assert.match(
  hook,
  /getWorkspaceArtifactLakeEntry\(workspaceSlug, artifactRef\)/,
  'Artifact inspection must be workspace-scoped',
)
assert.match(
  hook,
  /opts\.persist === true[\s\S]*fusion\.persisted_artifact\?\.artifact_id[\s\S]*getWorkspaceArtifactLakeEntry\(workspaceSlug, artifactRef\)[\s\S]*setConversationFusionArtifact\(payload\)/,
  'Persisting a Space by drag/drop must immediately inspect the saved artifact so local Spaces can show safe details.',
)
assert.match(
  surface,
  /onPersistConversationFusion=\{\(\) => atlas\.refreshConversationFusion\(undefined, \{ persist: true \}\)\}/,
  'Atlas AI surface must expose explicit save-pack action for conversation fusion',
)
assert.doesNotMatch(
  surface,
  /onInspectConversationFusionArtifact=/,
  'Saved Space artifact inspection must not add a secondary details panel to the sidebar.',
)
assert.match(
  surface,
  /onFuseThreads=\{\(threadIds\) => void atlas\.refreshConversationFusion\(threadIds, \{ persist: true \}\)\}/,
  'Drag thread-to-thread fusion must materialize the generated AWIS artifact',
)
assert.match(
  surface,
  /getAtlasAwisLearningLoop\(workspace, task\)/,
  'Atlas AI surface must enrich the project command center with the certified AWIS loop',
)
assert.match(
  surface,
  /persistAtlasAwisRuntimeSnapshot\(workspace, task\)/,
  'Atlas AI surface must persist a workspace runtime snapshot when the local project is ready.',
)
assert.match(
  surface,
  /getAtlasAwisLiveExecutionMemory\(workspace, task, \{ latest: true \}\)/,
  'Atlas AI surface must hydrate live execution memory from the dedicated endpoint before doing heavier snapshot work.',
)
assert.match(
  surface,
  /getAtlasAwisArtifactIntelligence\(workspace, task, \{ latest: true \}\)/,
  'Atlas AI surface must hydrate Space replay from persisted server Artifact Intelligence on startup.',
)
assert.match(
  surface,
  /buildAwisWorkspaceArtifactProjectionsFromServer\(awair, workspaceKeyValue\)/,
  'Atlas AI surface must convert canonical AWAIR into bounded provider-safe context pack input.',
)
assert.match(
  surface,
  /awisAutoSavedArtifactHashesRef\.current\.has\(artifact\.artifact_hash\)[\s\S]*persistAwisWorkspaceArtifact\(artifact\)[\s\S]*artifactAlreadyRecorded[\s\S]*event\.evidence\.includes\(artifact\.artifact_hash\)[\s\S]*if \(!artifactAlreadyRecorded\) \{[\s\S]*rememberAwisMaintenance\(\{[\s\S]*action: 'preserve_artifact'[\s\S]*snapshot AWIS salvo automaticamente para próxima partida/,
  'AWIS automatic artifact preservation must record maintenance evidence once per artifact hash so the brain does not confuse startup replay with new learning.',
)
assert.match(
  surface,
  /getAtlasAwisNextSessionBrain\(workspace, task, \{ latest: true \}\)/,
  'Atlas AI surface must hydrate startup context from the persisted next-session brain.',
)
assert.match(
  surface,
  /getAtlasAwisHandoffPack\(workspace, task,/,
  'Atlas AI surface must hydrate provider-safe handoff context from the canonical AWIS endpoint.',
)
assert.match(
  surface,
  /nextSessionBrain: workspaceNextSessionBrain/,
  'Atlas AI context pack must carry the bounded next-session brain projection.',
)
assert.match(
  surface,
  /handoffPack: workspaceHandoffPack/,
  'Atlas AI context pack must carry the bounded handoff projection.',
)
assert.match(
  surface,
  /liveExecutionMemory: workspaceLiveExecutionMemory/,
  'Atlas AI context pack must carry the bounded live execution memory projection.',
)
assert.match(
  surface,
  /AWIS_RUNTIME_SNAPSHOT_TTL_MS/,
  'AWIS runtime snapshot persistence must be throttled so opening the app does not hammer the local service.',
)
assert.match(
  surface,
  /const ENABLE_AWIS_LOCAL_INTELLIGENCE = true/,
  'AWIS local folder intelligence must stay enabled so a ready folder becomes a real map, not a decorative status.',
)
assert.match(
  surface,
  /const ENABLE_AWIS_SERVER_INTELLIGENCE = true/,
  'AWIS server intelligence must be active so canonical next-session brain, handoff and artifacts can enrich the local brain when healthy.',
)
assert.match(
  surface,
  /awisServerHealth\?\.status !== 'ready'/,
  'AWIS server intelligence must still be gated by health so backend failures do not replace the local brain.',
)
assert.match(
  surface,
  /getAtlasServerHealth\(\)/,
  'Atlas AI surface must feed server health into the AWIS command center',
)
assert.match(
  surface,
  /health\.checks\?\.storage[\s\S]*storageWritable[\s\S]*storageHealthy[\s\S]*status: health\.status === 'ok'[\s\S]*storageHealthy \? 'ready' : 'degraded'/,
  'Atlas AI must treat unwritable local storage as degraded AWIS health, not only database connectivity.',
)
assert.match(
  surface,
  /serverHealth: awisServerHealth/,
  'AWIS intelligence must receive local service health as a first-class input',
)
assert.match(
  surface,
  /compactOperationalMaintenance[\s\S]*event\.label\.trim\(\)\.toLocaleLowerCase\('pt-BR'\)[\s\S]*new Map<string, \{ event:[\s\S]*count: number \}>[\s\S]*count > 1 \? ` · \$\{count\}x`/,
  'AWIS command center must compact repeated maintenance evidence instead of flooding the project brain with duplicate visual chips.',
)
assert.match(
  surface,
  /const refreshAwisHealth = useCallback/,
  'AWIS command center must expose an explicit local-service recheck action instead of passive health diagnostics only',
)
assert.match(
  surface,
  /Verificar serviço/,
  'AWIS degraded service state must give the operator a human retry action',
)
assert.match(
  surface,
  /const handleOpenRecommendedSideBySide = useCallback/,
  'AWIS command center must make its compare action directly executable',
)
assert.match(
  surface,
  /threadBelongsToWorkspace\(thread, activeWorkspaceScope\)/,
  'Recommended side-by-side opening must stay scoped to the active AWIS workspace',
)
assert.match(
  surface,
  /onOpenRecommendedSideBySide=\{handleOpenRecommendedSideBySide\}/,
  'AWIS command center must receive the side-by-side action instead of leaving the next step as passive text',
)
assert.match(
  surface,
  /const effectiveProjectSpaceCount = useMemo/,
  'Atlas AI command center must count a ready conversation-fusion pack as Space power, not ask the user to create a Space that already exists',
)
assert.match(
  surface,
  /const displayedScore = visibleActions\.length > 0 \? Math\.min\(94, intelligence\.score\) : intelligence\.score/,
  'Atlas AI command center must not display 100/100 while it still shows a next operational step',
)
assert.match(
  surface,
  /atlas-ai-awis-live/,
  'Atlas AI command center must show whether AWIS is local, verifying, live or blocked',
)
assert.match(
  types,
  /export interface AtlasAwisLearningLoop/,
  'Desktop types must preserve the certified AWIS learning-loop payload',
)
assert.match(
  types,
  /export interface AtlasServerHealth/,
  'Desktop types must preserve the atlas-server health payload for the AWIS health gate',
)
assert.match(
  types,
  /persisted_artifact\?:/,
  'Desktop type must preserve persisted fusion artifact metadata',
)
assert.match(
  types,
  /rejected_thread_ids\?: string\[\]/,
  'Desktop type must preserve rejected cross-workspace thread ids',
)
assert.match(
  threadList,
  /Conversas fora deste projeto/,
  'Thread list must explain cross-workspace fusion failures without showing a confusing blocked Space',
)
assert.match(
  threadList,
  /salvo/,
  'Thread list must surface that a fusion pack was materialized as an AWIS artifact',
)
assert.match(
  threadList,
  /abrir/,
  'Thread list must expose a user action to inspect the persisted fusion artifact',
)
assert.match(
  threadList,
  /atlas-ai-thread-drag-preview/,
  'Thread list must expose a floating drag preview while creating a Space.',
)
assert.match(
  threadList,
  /comparar/,
  'Thread drag preview must name the compare action when the center stage will open a pane.',
)
assert.match(
  threadList,
  /adicionar ao Space/,
  'Thread drag preview must distinguish adding to an existing Space from creating a new Space.',
)
assert.match(
  threadList,
  /const dragHandleTitle = 'Arrastar conversa'[\s\S]*title=\{dragHandleTitle\}[\s\S]*aria-label=\{`\$\{dragHandleTitle\}: \$\{title\}`\}/,
  'Visible drag handles must use compact human copy instead of exposing AWIS outcomes on every row.',
)
assert.doesNotMatch(
  threadList,
  /Criar Space ou comparar/,
  'Thread rows must not expose technical drag outcomes as the handle label.',
)
assert.doesNotMatch(
  threadList,
  /Arraste sobre outra conversa para criar um Space/,
  'Thread drag handles must not repeat long instructional copy on every row.',
)
assert.doesNotMatch(
  threadList,
  /Arraste sobre outra conversa para criar um Space/,
  'Thread drag handles must not repeat long instructional copy on every row.',
)
assert.match(
  threadList,
  /atlas-ai-thread-drag-handle/,
  'Each draggable conversation row must expose a visible drag handle for Spaces creation.',
)
assert.match(
  threadList,
  /draggable=\{false\}/,
  'Conversation rows/handles must avoid native DnD as the primary path because Tauri can miss drop/dragend.',
)
assert.match(
  surface,
  /handleAddThreadToWorkbench/,
  'Atlas AI stage must accept dropped conversations and open them in the multi-conversation Workbench.',
)
assert.match(
  surface,
  /Solte para comparar/,
  'Central stage must show an explicit drop target when a conversation is dragged over it.',
)
assert.match(
  surface,
  /onDrop=\{\(event\) => \{[\s\S]*const threadId = threadIdFromDragEvent\(event\)[\s\S]*const anchorThreadId = threadId \? resolveStageDropAnchorThreadId\(threadId, dragAnchorThreadIdFromEvent\(event\)\) : null[\s\S]*event\.preventDefault\(\)[\s\S]*setStageThreadDropTargetActive\(false\)[\s\S]*clearThreadDragVisualState\(\)[\s\S]*if \(!threadId\) return[\s\S]*handleAddThreadToWorkbench\(threadId, \{ anchorThreadId, guardFollowupSelect: true \}\)/,
  'Stage drop must clear drag UI and repair the compare anchor before opening panes.',
)
assert.match(
  threadList,
  />\s*comparar\s*<[\s\S]*Abre as sessões deste Space para comparar/,
  'Project Space cards must expose a short explicit compare action for multi-session view.',
)
assert.match(
  threadList,
  /className="atlas-ai-project-space-title-button is-static"[\s\S]*\{space\.title\}/,
  'Clicking a Space title must not secretly open every session; the explicit compare button owns that action.',
)
assert.match(
  threadList,
  /title="Abrir somente esta conversa"[\s\S]*onSelect\(thread\.id\)/,
  'Clicking a conversation inside a Space must open only that conversation.',
)
assert.match(
  threadList,
  /draggable=\{false\}[\s\S]*onDragStart=\{startThreadDrag\}/,
  'Conversation rows must keep native drag disabled so the clean AWIS pointer preview owns the drag gesture.',
)
assert.match(
  threadList,
  /className="atlas-ai-thread-drag-handle"[\s\S]*title=\{dragHandleTitle\}[\s\S]*onPointerDown=\{\(event\) => \{/,
  'The visible drag handle must start the AWIS pointer drag engine without invoking the native WebView ghost.',
)
assert.match(
  threadList,
  /ProjectSpacesPanel/,
  'Conversation fusion must be presented as Project Spaces instead of a technical CTX/fusion block.',
)
assert.match(
  threadList,
  /ProjectSpaceBrainSignals/,
  'Space cards must render the compact Space Brain signal strip.',
)
assert.match(
  threadList,
  /aria-label="Memória viva deste Space"/,
  'Space Brain signal strip must be accessible without opening raw sessions.',
)
assert.match(
  threadList,
  /cérebro vivo[\s\S]*memória salva[\s\S]*revalidar/,
  'Space cards must expose the living brain state, saved memory and revalidation hints without opening raw sessions.',
)
assert.match(
  threadList,
  /title=\{`\$\{list\.length\} conversas neste projeto`\}[\s\S]*\{list\.length\} <span>conversas<\/span>/,
  'Project rows must label the project conversation count instead of showing an ambiguous bare number.',
)
assert.match(
  threadList,
  /projectSpacePanelCount > 0[\s\S]*`[\s\S]*\$\{projectSpacePanelCount\} \$\{projectSpacePanelCount === 1 \? 'Space' : 'Spaces'\}/,
  'Project rows must label Space counts separately from conversation counts.',
)
assert.match(
  threadList,
  /projectSpacePanelCount > 0[\s\S]*: 'criar Space'/,
  'Project rows must not show a generic Spaces badge when no Space exists yet.',
)
assert.match(
  threadList,
  /const showProjectSpaces = spacesForProject\.length > 0 \|\| suggestedSpaceThreadIds\.length >= 2 \|\| \(isActiveProject && workspaceToolsOpen\)/,
  'If the project row says a Space exists, the Space panel must render without requiring a hidden tools toggle.',
)
assert.match(
  threadList,
  /const showCreationGuide = buildingSpace && spaces\.length === 0 && !showSuggestedSpace && !showBackgroundSpaceStatus[\s\S]*Solte sobre outra conversa[\s\S]*Cria um Space com estas sessões\./,
  'Empty Project Spaces panels must stay quiet until drag feedback is actually needed.',
)
assert.doesNotMatch(
  threadList,
  /Arraste uma conversa sobre outra/,
  'The sidebar must not show a permanent empty Spaces instruction card.',
)
assert.doesNotMatch(
  threadList,
  /showServerActions\s*=\s*false/,
  'Persisted Space actions must not be hidden behind a permanently disabled server-actions block.',
)
assert.match(
  threadList,
  /onSaveSpace=\{onPersistConversationFusion\}/,
  'Suggested Space cards must expose the existing provider-safe save action directly.',
)
assert.match(
  threadList,
  /const persistedFusion = await onPersistConversationFusion\(\)[\s\S]*const nextFusion = persistedFusion \?\? conversationFusion[\s\S]*const artifact = nextFusion\?\.persisted_artifact/,
  'Saved Space receipts must capture the freshly materialized artifact ref returned by the save call.',
)
assert.doesNotMatch(
  threadList,
  /onInspectSavedSpace|savedSpaceArtifactRef/,
  'Saved Space cards must stay compact and avoid opening a secondary details inspector.',
)
assert.match(
  threadList,
  /\{saved \? 'Space salvo' : 'Space sugerido'\}/,
  'Suggested Space card label must switch to saved immediately after persistence, before artifact inspection finishes.',
)
assert.match(
  threadList,
  /Space salvo neste Mac/,
  'Saved Space cards must avoid exposing an actionable open button when only the local saved receipt is available.',
)
assert.match(
  threadList,
  /savedProjectSpaceKeyFromFusion/,
  'Saved Space receipts must use a stable provider-safe fusion key instead of raw conversation content.',
)
assert.doesNotMatch(
  threadList,
  /\{artifactReady \? 'Space salvo' : 'Space sugerido'\}/,
  'Suggested Space card label must not wait for artifact inspection to show the saved state.',
)
assert.match(
  threadList,
  /consumerLabelForSpace/,
  'Saved Space replay consumers must be humanized before they appear in the AWIS sidebar.',
)
assert.doesNotMatch(
  threadList,
  /recommended_consumers\?\.slice\(0, 3\)\.join\(', '\)/,
  'Saved Space status must not dump raw recommended_consumer ids like atlas_dev or subagent_projection.',
)
assert.match(
  threadList,
  /reutilizável por/,
  'Saved Space status must describe reuse in human product language.',
)
assert.doesNotMatch(
  threadList,
  /function SavedSpaceInspector|Detalhes seguros|atlas-ai-saved-space-timeline|humanSpaceSummaryUnitText/,
  'Saved Space sidebar must not render the verbose safe-details inspector.',
)
assert.doesNotMatch(
  threadList,
  /Conversas agrupadas|sessões agrupadas/,
  'Saved Space copy must not make Space look like a generic conversation merge.',
)
assert.doesNotMatch(
  threadList,
  /const label = humanSpaceSummaryUnitText\(unit\.label\)|const value = humanSpaceSummaryUnitText\(unit\.value\)/,
  'Saved Space inspection must not render backend summary unit labels or values directly.',
)
assert.doesNotMatch(
  threadList,
  /<[^>]*(artifact_hash|artifact_hash|runtime_hash|workspace_id|schema_version)/,
  'Saved Space inspection must not expose raw artifact/workspace/schema ids as primary UI labels.',
)
assert.match(
  threadList,
  /comparar/,
  'Dragging conversations together must create an actionable Space card immediately.',
)
assert.match(
  threadList,
  /onOpenInStage/,
  'Pointer drag to the center stage must use the stage-open path instead of the ordinary beside button path.',
)
assert.doesNotMatch(
  threadList,
  /if \(stageTarget\) \{\s*onOpenInStage\?/,
  'Pointer drag must not open the side-by-side stage during hover; it must wait for drop/pointer-up.',
)
assert.match(
  threadList,
  /onStageDragActive\?\.\(Boolean\(stageTarget\)\)/,
  'Pointer drag over the center stage must still activate clear visual feedback before drop.',
)
assert.match(
  surface,
  /const isWorkbenchOpen = workbenchActive && workbenchThreadIds\.length > 0/,
  'Workbench must support one to four active panes without making normal thread selection look like Workbench.',
)
assert.match(
  surface,
  /setWorkbenchPendingThreadId\(threadId\)[\s\S]*const activePendingThreadId =[\s\S]*atlas\.pendingTrace\?\.thread_id[\s\S]*const paneHasPending = threadId === \(activePendingThreadId \?\? workbenchPendingThreadId\)[\s\S]*sending=\{paneHasPending \? atlas\.sending : false\}/,
  'Each side-by-side pane composer must keep its own usable state instead of globally disabling every pane composer.',
)
assert.doesNotMatch(
  surface,
  /const panePending = threadId === atlas\.selectedThreadId/,
  'Workbench pending/streaming state must follow the sending session, not whichever pane the operator focused last.',
)
assert.match(
  surface,
  /setWorkbenchDrafts\(\(prev\) => omitRecordKey\(prev, id\)\)[\s\S]*setWorkbenchDetails\(\(prev\) => omitRecordKey\(prev, id\)\)/,
  'Closing a Workbench pane must clear hidden draft/detail state for that pane so reopening starts from current conversation state.',
)
assert.match(
  surface,
  /onNewThread=\{\(\) => \{[\s\S]*setWorkbenchDrafts\(\{\}\)[\s\S]*setWorkbenchDetails\(\{\}\)/,
  'Starting a new conversation must clear hidden Workbench pane state.',
)
assert.match(
  threadList,
  /onOpenSpace/,
  'Project Spaces must expose a direct open action instead of a hidden click-fusion mode.',
)
assert.match(
  threadList,
  /setLocalStorageItem\(PROJECT_SPACES_STORAGE, payload\)[\s\S]*setSessionStorageItem\(PROJECT_SPACES_STORAGE, payload\)/,
  'Project Spaces must persist redundantly across Atlas AI reloads when there is no backend Space API yet.',
)
assert.doesNotMatch(
  threadList,
  /criados nesta sessão/,
  'Project Spaces are durable local workspace memory; the UI must not imply they disappear after the current session.',
)
assert.match(
  threadList,
  /mergeLocalProjectSpaces\([\s\S]*parseLocalProjectSpaces\(getLocalStorageItem\(PROJECT_SPACES_STORAGE\)\)[\s\S]*parseLocalProjectSpaces\(getSessionStorageItem\(PROJECT_SPACES_STORAGE\)\)/,
  'Project Spaces must merge redundant local/session storage instead of trusting a stale single copy.',
)
assert.match(
  threadList,
  /nativeProjectSpacesSaveTailRef[\s\S]*nativeProjectSpacesSaveVersionRef[\s\S]*bridge\.saveAwisProjectSpacesStore\(spacesSnapshot, receiptsSnapshot\)/,
  'Native Project Space persistence must be serialized so the newest Space edit wins across app restarts.',
)
assert.match(
  threadList,
  /onRenameSpace/,
  'Project Spaces must support renaming so generated names are not a dead end.',
)
assert.match(
  threadList,
  /desfazer/,
  'Local Project Spaces must expose a visible desfazer action, not only an unlabeled close glyph.',
)
assert.match(
  threadList,
  />\s*editar\s*</,
  'Local Project Spaces must expose editar as the visible action for the Space management modal.',
)
assert.match(
  threadList,
  /function SpaceEditDialog[\s\S]*role="dialog"[\s\S]*desfazer Space[\s\S]*cancelar[\s\S]*salvar/,
  'Editing a Space must happen in a closable modal with save/cancel/desfazer actions.',
)
assert.doesNotMatch(
  threadList,
  /openingSaved\s*\?\s*'abrindo'\s*:\s*'ver'|>\s*ver\s*</,
  'Saved Spaces must not expose a separate "ver" inspector action; the compact card is enough.',
)
assert.doesNotMatch(
  threadList,
  />\s*adotar\s*</,
  'Saved Space adoption cannot use vague "adotar" copy; it must say what changes for the operator.',
)
assert.doesNotMatch(
  threadList,
  /atlas-ai-project-space-rename/,
  'Local Project Spaces must not leave an inline rename editor stuck inside the sidebar.',
)
assert.match(
  threadList,
  /pointerDropTargetId/,
  'Pointer drag must highlight and add conversations to an existing Space, not only native drag.',
)
assert.match(
  threadList,
  /spaceThreads\.slice\(0, 4\)/,
  'Space cards must stay compact by showing only the first four sessions clearly.',
)
assert.match(
  threadList,
  /window\.addEventListener\('blur', clearThreadDragFromEvent\)/,
  'Thread drag state must clear when the window loses focus so no preview remains stuck.',
)
assert.match(
  threadList,
  /document\.addEventListener\('visibilitychange', clearOnHidden\)/,
  'Thread drag state must clear when the WebView becomes hidden so no preview remains stuck across app/window transitions.',
)
assert.match(
  threadList,
  /document\.addEventListener\('mouseleave', clearThreadDragFromEvent\)/,
  'Thread drag state must clear when the pointer leaves the document during a drag.',
)
assert.match(
  threadList,
  /window\.addEventListener\('dragcancel', clearThreadDragFromEvent\)/,
  'Thread drag state must clear when the WebView emits dragcancel.',
)
assert.match(
  threadList,
  /pointerFusionStartRef\.current = null/,
  'Thread drag cleanup must reset the duplicate-start guard as well as visible preview state.',
)
assert.match(
  surface,
  /document\.addEventListener\('visibilitychange', clearOnHidden\)/,
  'Stage drop highlight must clear when the WebView becomes hidden.',
)
assert.match(
  surface,
  /document\.addEventListener\('mouseleave', clearStageDrop\)/,
  'Stage drop highlight must clear when the pointer leaves the document.',
)
assert.match(
  surface,
  /window\.addEventListener\('dragcancel', clearStageDrop\)/,
  'Stage drop highlight must clear when native drag is cancelled.',
)
assert.match(
  surface,
  /setThreadDragClearSignal\(\(value\) => value \+ 1\)/,
  'Stage-open path must send a React cleanup signal so Tauri drag previews cannot remain stuck.',
)
assert.match(
  surface,
  /dragClearSignal=\{threadDragClearSignal\}/,
  'AtlasAiSurface must pass the deterministic drag cleanup signal into the thread list.',
)
assert.match(
  surface,
  /awisHistoryRecoveryErrorRef[\s\S]*awisServerHealth\?\.status !== 'ready'[\s\S]*await atlas\.refreshThreads\(\)[\s\S]*await atlas\.refreshConversationFusion\(\)/,
  'When the local AWIS service becomes healthy again, the surface must recover stale sidebar history errors automatically.',
)
assert.match(
  threadList,
  /\}, \[clearThreadDragState, dragClearSignal\]\)/,
  'Thread list must clear drag state whenever the stage accepts a conversation drop.',
)
assert.match(
  threadList,
  /const beginNativeThreadDrag = useCallback\(\(title: string, anchorThreadId: string \| null, draggedThreadId\?: string \| null\) => \{\n\s+clearThreadDragState\(\{ notifyEnd: false \}\)[\s\S]*onThreadDragStart\?\.\(anchorThreadId, draggedThreadId\)/,
  'Native drag must clear pointer-preview state before starting so ghost previews cannot remain stuck.',
)
assert.match(
  threadList,
  /if \(!draggingThreadTitle \|\| pointerFusionPreview\) return[\s\S]*1200/,
  'Native drag visual state must have a short watchdog for environments that miss dragend/drop.',
)
assert.match(
  threadList,
  /const finishThreadDrag = \(event: DragEvent<HTMLElement>\) => \{[\s\S]*const droppedOnStage = stageDropActive \|\| Boolean\(target\?\.closest\('\.atlas-ai-stage'\)\)[\s\S]*onOpenInStage\?\.\(thread\.id, nativeDragAnchorRef\.current\)/,
  'Native dragend must open the thread in the stage when Tauri/WebView misses the normal drop event.',
)
assert.match(
  threadList,
  /draggable=\{draggable\}[\s\S]*className="atlas-ai-thread-drag-handle"[\s\S]*onDragStart=\{startThreadDrag\}/,
  'Thread drag handles must emit native AWIS drag data so conversation-to-stage drop works in Tauri/WebView.',
)
assert.doesNotMatch(
  threadList,
  /draggable=\{Boolean\(draggable\)\}/,
  'Conversation rows must not opt into native draggable mode; only the drag handle owns native drag.',
)
assert.match(
  threadList,
  /window\.addEventListener\('mousemove', handlePointerMove as EventListener/,
  'Pointer drag engine must also accept mousemove because desktop automation/WebView may not emit PointerEvent reliably.',
)
assert.match(
  threadList,
  /pointerFusionStartRef[\s\S]*eventType === 'mousedown'[\s\S]*lastStart\.eventType === 'pointerdown'[\s\S]*now - lastStart\.at < 120/,
  'Pointer and mouse fallback starts must be deduped so one drag gesture cannot initialize twice.',
)
assert.match(
  threadList,
  /onMouseDown=\{onPointerFusionStart\}/,
  'Conversation rows must start the same AWIS drag engine from mouse input, not fall back to click selection.',
)
assert.match(
  threadList,
  /suppressNextThreadClick\(pointerFusionThread\.id\)/,
  'Pointer drag drop must suppress the follow-up click event so stage drop cannot be overwritten by ordinary thread selection.',
)
assert.match(
  threadList,
  /suppressClickThreadIdRef\.current = threadId[\s\S]*const selectThreadFromList = useCallback[\s\S]*if \(suppressClickThreadIdRef\.current === threadId\) return[\s\S]*onSelect\(threadId\)/,
  'Drag click suppression must use a synchronous ref so React state timing cannot overwrite a stage drop with a normal row selection.',
)
assert.match(
  threadList,
  /if \(suppressClick \|\| nativeDragClickSuppressRef\.current\) \{[\s\S]*event\.stopPropagation\(\)[\s\S]*return/,
  'Conversation row click handler must ignore the synthetic click that follows a successful drag.',
)
assert.match(
  threadList,
  /const nativeDragClickSuppressRef = useRef\(false\)[\s\S]*const suppressNativeDragClick = \(\) => \{[\s\S]*nativeDragClickSuppressRef\.current = true[\s\S]*500[\s\S]*const startThreadDrag[\s\S]*suppressNativeDragClick\(\)[\s\S]*const finishThreadDrag[\s\S]*suppressNativeDragClick\(\)/,
  'Native drag must suppress the residual click so dropping a conversation in the center cannot degrade into opening a single conversation.',
)
assert.match(
  surface,
  /Limite de 4 sessões\. Feche uma para abrir outra\./,
  'The side-by-side stage must give clear feedback instead of silently replacing panes past the four-session limit.',
)
assert.doesNotMatch(
  threadList,
  />ctx</i,
  'Atlas AI sidebar must not expose CTX as the primary user-facing workspace action.',
)
assert.doesNotMatch(
  threadList,
  /fundir/,
  'Atlas AI sidebar must not expose technical fusion wording in the primary UI.',
)
assert.doesNotMatch(
  threadList,
  /juntar projeto/i,
  'Space actions must not say "juntar projeto"; project/workspace and Space are separate AWIS concepts.',
)
assert.doesNotMatch(
  threadList,
  />pack<|Copiar pack/i,
  'Space copy actions must say context, not expose pack jargon as the primary label.',
)
assert.match(
  threadList,
  /Usar como contexto seguro; não contém mensagens completas\./,
  'Copied Space context should stay human-readable and avoid pack jargon.',
)
assert.match(
  threadList,
  /criar Space/,
  'Manual Space creation copy must name Space directly instead of merging or joining a project.',
)
assert.match(
  threadList,
  /const showCreationGuide = buildingSpace && spaces\.length === 0 && !showSuggestedSpace && !showBackgroundSpaceStatus/,
  'The sidebar must show Space creation guidance only during an active drag.',
)
assert.match(
  threadList,
  /const showBackgroundSpaceStatus = spaces\.length === 0 && !showSuggestedSpace && \(fusionLoading \|\| artifactLoading\)/,
  'Unavailable automatic Space suggestions must not add noisy error copy when there is no visible Space.',
)
assert.doesNotMatch(
  threadList,
  /thread ativa/i,
  'Conversation controls must not expose "thread" wording in user-facing help.',
)
assert.match(
  threadList,
  /Compor sem conversa ativa/,
  'New conversation help must use human-facing conversation wording.',
)
assert.doesNotMatch(
  conversation,
  /Arquivar thread/,
  'Conversation archive action must not expose "thread" wording to users.',
)
assert.doesNotMatch(
  surface,
  /Atlas AI thread \$\{threadId\}|backend indisponível para export/,
  'Export fallback must not copy raw thread/backend wording to the user.',
)
assert.doesNotMatch(
  surface,
  /Renomear thread/,
  'Rename prompt must not expose thread wording to users.',
)
assert.match(
  surface,
  /Renomear conversa/,
  'Rename prompt must use conversation wording.',
)
assert.match(
  surface,
  /Tente recarregar o histórico e exportar novamente\./,
  'Export fallback should tell the user the next concrete action in plain language.',
)
assert.doesNotMatch(
  surface,
  /Nenhuma thread é inventada|backend responder/,
  'Offline copy must not expose thread/backend wording.',
)
assert.match(
  surface,
  /Nenhuma conversa é inventada[\s\S]*serviço responder/,
  'Offline copy must explain the local service state in user language.',
)
assert.doesNotMatch(
  threadContextMenu,
  />Thread<|a thread|esta thread|título da thread|abrir esta thread/,
  'Context menu must not expose thread wording to users.',
)
assert.match(
  threadContextMenu,
  />Conversa<[\s\S]*Remove a conversa do topo[\s\S]*título da conversa[\s\S]*Copiar referência/,
  'Context menu must use conversation wording across actions.',
)
assert.doesNotMatch(
  threadContextMenu,
  />\s*Copiar ID da sessão\s*<|metadata exportadas/,
  'Context menu must not expose ID/metadata jargon as user-facing copy.',
)
assert.doesNotMatch(
  contextPanel,
  />Workspace<|>Surface<|<h3>Thread<\/h3>|Hyperflow \(backend\)|Front coleta|backend decide|Nenhum trace ativo|Sem thread carregada|<span>workspace<\/span>|<span>provider<\/span>|>Provider|plan-only endpoint|fluxo legado|erro · \{error\}/,
  'Context panel must use project/conversation Portuguese labels instead of raw workspace/thread/provider labels.',
)
assert.match(
  contextPanel,
  />Projeto<[\s\S]*>Aplicativo<[\s\S]*>Modelo<[\s\S]*Caminho escolhido[\s\S]*<h3>Conversa<\/h3>[\s\S]*Sem conversa carregada[\s\S]*Nenhuma execução ativa/,
  'Context panel must preserve human-readable AWIS identity and conversation labels.',
)
assert.doesNotMatch(
  contextPanel,
  />Atlas Runtime<|>status<|>checks<|>warnings\s*·|cert_hash|<span>selo<\/span>|>passed<| passed<|<code>\{runtimeReadiness\.status\}|<code>\{decisionMode\}|<code>atlas_desktop_ai<\/code>/,
  'Context panel must not render runtime/check/hash/internal decision labels as primary user-facing copy.',
)
assert.match(
  contextPanel,
  /Saúde do AWIS[\s\S]*verificações[\s\S]*prontas[\s\S]*atenções[\s\S]*humanizeRuntimeSignal/,
  'Context panel must explain AWIS health in human language while still deriving warning names from canonical signals.',
)
assert.match(
  contextPanel,
  /className="atlas-ai-context-heading-with-pill"[\s\S]*<span>Saúde do AWIS<\/span>[\s\S]*atlas-ai-context-runtime-pill/,
  'AWIS health heading must keep the label and status pill visually separated in the side panel.',
)
assert.match(
  contextPanel,
  /Plano técnico ainda não disponível no serviço local[\s\S]*A conversa continua funcionando/,
  'Atlas Dev plan fallback in the side panel must explain degraded service in human language.',
)
assert.doesNotMatch(
  contextPanel,
  /thread\.workspace \?\? '—'|devRuntime\.workspace\}|devRuntime\.expected_artifacts\.join|devRuntime\.schema_version|hyperflow\.handoffTarget\}<\/code>|hyperflow\.dispatchStatus\}<\/code>| chars|tiers selecionados|open brain/,
  'Context panel must not render raw workspace paths, artifact ids, schema versions, dispatch ids, char jargon, tier jargon, or Open Brain internals.',
)
assert.match(
  contextPanel,
  /projectDisplayName\(thread\.workspace[\s\S]*handoffLabel\(hyperflow\.handoffTarget\)[\s\S]*devRuntime\.expected_artifacts\.map\(expectedArtifactLabel\)[\s\S]*openBrainLabel/,
  'Context panel must translate project names, handoff destinations, expected deliverables, and memory state before rendering.',
)
assert.match(
  decisionBadge,
  /modelLabel\(provider\)/,
  'Decision badge must humanize provider names before showing them in the conversation.',
)
assert.doesNotMatch(
  decisionBadge,
  /parts\.push\(provider\)/,
  'Decision badge must not display raw provider ids as product copy.',
)
assert.doesNotMatch(
  `${openBrainBadge}\n${planIndicators}`,
  /open brain ·/,
  'Inline memory indicators must not expose Open Brain jargon in user-facing copy.',
)
assert.match(
  `${openBrainBadge}\n${planIndicators}`,
  /memória · \{statusLabel\(status\)\}[\s\S]*memória · \{ob\.label\}/,
  'Inline memory indicators must use human memory wording.',
)
assert.match(
  `${openBrainBadge}\n${planIndicators}`,
  /failed_closed'\) return 'atenção pendente'[\s\S]*hint === 'bloqueado'\) return \{ label: 'atenção pendente'/,
  'Inline memory indicators must translate closed/blocked memory states into human pending-attention copy.',
)
assert.doesNotMatch(
  `${openBrainBadge}\n${planIndicators}`,
  /memória · bloquead|plan · bloquead/,
  'Inline AWIS indicators must not expose blocked wording in compact user-facing copy.',
)
assert.match(
  errorBanner,
  /function explainAtlasAiError[\s\S]*connection refused[\s\S]*sqlstate\[08006\][\s\S]*port 5433[\s\S]*Serviço local indisponível[\s\S]*status 500[\s\S]*Serviço local instável[\s\S]*title=\{explained\.detail/,
  'Atlas AI errors must render human operational copy for database/kernel failures while preserving technical detail for debugging.',
)
assert.match(
  client,
  /function compactBridgeError[\s\S]*sqlstate\[08006\][\s\S]*connection refused[\s\S]*port 5433[\s\S]*serviço local indisponível[\s\S]*status 500[\s\S]*serviço local instável/,
  'The Desktop bridge must not leak raw SQL/JSON kernel errors into Atlas AI user-facing banners.',
)
assert.match(
  threadList,
  /retryLabel="verificar serviço"/,
  'Thread history failure must offer a service-health retry action instead of vague retry copy.',
)
assert.match(
  css,
  /\.atlas-ai-awis-next\s*\{[\s\S]*grid-column: 1 \/ -1;[\s\S]*overflow: visible;[\s\S]*\.atlas-ai-awis-next::before[\s\S]*content: 'Próximo'/,
  'AWIS command center next actions must not be squeezed into the action column.',
)
assert.match(
  css,
  /@media \(max-width: 1380px\) \{[\s\S]*\.atlas-ai-awis-command-center\s*\{[\s\S]*grid-template-columns: minmax\(0, 1fr\);[\s\S]*\.atlas-ai-awis-actions\s*\{[\s\S]*grid-column: 1;[\s\S]*grid-row: auto;/,
  'AWIS command center must stack before the side rails squeeze status text into action buttons.',
)
assert.match(
  css,
  /\.atlas-ai-runtime-pill\.is-blocked\s*\{[\s\S]*color: var\(--cc-status-warn[\s\S]*\.atlas-ai-runtime-pill-dot\.is-blocked\s*\{\s*background: var\(--cc-status-warn/,
  'Runtime blocked now means certification pending in AWIS UI, so it must use warning tone instead of destructive error tone.',
)
assert.match(
  contextPanel,
  /Atlas Desktop[\s\S]*Atlas decide pelo contexto[\s\S]*labelDecisionMode\(decisionMode\)/,
  'Context panel identity/routing copy must describe the product behavior instead of exposing surface ids or router ids.',
)
assert.match(
  contextPanel,
  /return decisionMode === 'atlas_decide' \? 'Atlas escolhe' : 'Escolha manual'/,
  'Context panel must translate router decision ids before rendering them.',
)
assert.doesNotMatch(
  promotionPanel,
  /Promover thread|workspace —|thread pequena|esta thread|workspace ausente|backend não respondeu/,
  'Promotion panel must not expose raw thread/workspace/backend copy to users.',
)
assert.match(
  promotionPanel,
  /Promover conversa[\s\S]*projeto —[\s\S]*conversa pequena[\s\S]*projeto ausente/,
  'Promotion panel must use product language for conversation and project states.',
)
assert.match(
  threadList,
  /conteúdo completo \{replay\?\.raw_conversation_replay_allowed === false \? 'protegido' : 'sob revisão'\}/,
  'Thread list artifact inspection must surface replay safety in product language.',
)
assert.doesNotMatch(
  threadList,
  /conversa bruta/i,
  'Thread list must not expose raw-conversation wording to users.',
)
assert.match(
  css,
  /\.atlas-ai-project-space-item,[\s\S]*\.atlas-ai-saved-space-inspector\s*\{[\s\S]*inset 3px 0 0 rgba\(235, 196, 124, 0\.62\)/,
  'Space cards must keep the left gold stripe visible without requiring hover.',
)
