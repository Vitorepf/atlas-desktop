import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const surface = readFileSync(new URL('../AtlasAiSurface.tsx', import.meta.url), 'utf8')
const contract = readFileSync(new URL('../contract.ts', import.meta.url), 'utf8')
const hero = readFileSync(new URL('../components/AtlasAiHero.tsx', import.meta.url), 'utf8')
const picker = readFileSync(new URL('../components/AtlasAiWorkspacePicker.tsx', import.meta.url), 'utf8')
const conversation = readFileSync(new URL('../components/AtlasAiConversation.tsx', import.meta.url), 'utf8')
const streamingIndicator = readFileSync(new URL('../components/AtlasAiStreamingIndicator.tsx', import.meta.url), 'utf8')
const contextPanel = readFileSync(new URL('../components/AtlasAiContextPanel.tsx', import.meta.url), 'utf8')
const planPanel = readFileSync(new URL('../components/AtlasAiPlanPanel.tsx', import.meta.url), 'utf8')
const threadExport = readFileSync(new URL('../threadExport.ts', import.meta.url), 'utf8')
const useAtlasAi = readFileSync(new URL('../useAtlasAi.ts', import.meta.url), 'utf8')
const useKernelStatus = readFileSync(new URL('../../../hooks/useKernelStatus.ts', import.meta.url), 'utf8')
const bridgeHook = readFileSync(new URL('../../../hooks/useBridge.ts', import.meta.url), 'utf8')
const bridge = readFileSync(new URL('../../../lib/bridge.ts', import.meta.url), 'utf8')
const atlasAiClient = readFileSync(new URL('../client.ts', import.meta.url), 'utf8')
const unifiedComposer = readFileSync(new URL('../../../components/composer/AtlasUnifiedComposer.tsx', import.meta.url), 'utf8')
const runtimeStatusPill = readFileSync(new URL('../components/AtlasAiRuntimeStatusPill.tsx', import.meta.url), 'utf8')
const brandBlock = readFileSync(new URL('../../../shell/topbar/BrandBlock.tsx', import.meta.url), 'utf8')
const workspacePill = readFileSync(new URL('../../../shell/topbar/WorkspacePill.tsx', import.meta.url), 'utf8')
const surfaceSwitcher = readFileSync(new URL('../../../shell/topbar/SurfaceSwitcher.tsx', import.meta.url), 'utf8')
const kernelDiagnostic = readFileSync(new URL('../../../shell/topbar/KernelDiagnostic.tsx', import.meta.url), 'utf8')
const kernelPill = readFileSync(new URL('../../../shell/topbar/KernelPill.tsx', import.meta.url), 'utf8')
const kernelStatus = readFileSync(new URL('../../../shell/topbar/kernelStatus.ts', import.meta.url), 'utf8')
const profileSheet = readFileSync(new URL('../../../shared/projectProfile/ProjectProfileSheet.tsx', import.meta.url), 'utf8')
const projectScopeStrip = readFileSync(new URL('../../../shared/projectProfile/ProjectScopeStrip.tsx', import.meta.url), 'utf8')
const surfaceHost = readFileSync(new URL('../../../shell/SurfaceHost.tsx', import.meta.url), 'utf8')
const tauriLib = readFileSync(new URL('../../../../../../crates/atlas-tauri/src/lib.rs', import.meta.url), 'utf8')
const tauriBridge = readFileSync(new URL('../../../../../../crates/atlas-tauri/src/commands_bridge.rs', import.meta.url), 'utf8')
const bridgeClient = readFileSync(new URL('../../../../../../crates/atlas-bridge/src/client.rs', import.meta.url), 'utf8')

assert.match(
  bridgeHook,
  /localStorage\.getItem\(WORKSPACE_STORAGE_KEY\)/,
  'Workspace selection must boot from the last persisted project, matching Codex/Cursor default-project UX.',
)

assert.match(
  bridgeHook,
  /persistWorkspaceSlug\(target\)/,
  'Workspace changes must persist the last selected project for the next Atlas AI launch.',
)

assert.match(
  surface,
  /conversationWorkspaceOpen = atlas\.selectedThreadId !== null \|\| atlas\.pendingUserMessage !== null/,
  'Atlas AI must detect an open or starting conversation before locking workspace scope.',
)

assert.match(
  surface,
  /workspaceSlugFromThread\(atlas\.threadDetail\)/,
  'Atlas AI must prefer the selected thread workspace when freezing an existing conversation.',
)

assert.match(
  surface,
  /profileMatchesWorkspaceValue\(item, detailWorkspace\)/,
  'Atlas AI must normalize legacy path workspaces into current project profiles.',
)

assert.match(
  surface,
  /const effectiveWorkspaceSlug = lockedWorkspaceSlug \?\? shellWorkspaceSlug/,
  'Atlas AI must keep using the locked conversation workspace when the shell topbar changes.',
)

assert.match(
  surface,
  /onSelectWorkspace\(lockedSlug\)/,
  'Opening a cross-project conversation must sync the shell topbar to the locked project.',
)

assert.match(
  surface,
  /locked=\{workspacePickerLocked\}/,
  'Atlas AI workspace picker must become non-switchable after the conversation starts.',
)

assert.match(
  surface,
  /effectiveWorkspaceScopeLabel = effectiveWorkspaceHasRepo \? 'projeto' : 'contexto'/,
  'Atlas AI header must use human project wording while distinguishing context-only buckets.',
)

assert.match(
  surface,
  /effectiveWorkspaceFolderLabel = effectiveWorkspaceHasRepo[\s\S]*'Pasta pronta'[\s\S]*'Pasta ausente'[\s\S]*'Sem pasta local'[\s\S]*\{effectiveWorkspaceFolderLabel\}/,
  'Atlas AI header must show the project local-folder state directly instead of a vague linked-state label.',
)

assert.match(
  surface,
  /workspaceFolderLabel=\{effectiveWorkspaceFolderLabel\}[\s\S]*workspaceFolderReady=\{effectiveWorkspaceHasRepo\}[\s\S]*className=\{workspaceFolderReady \? 'is-ready' : 'is-missing'\}[\s\S]*\{workspaceFolderLabel\}/,
  'AWIS command center must not label a configured-but-missing local folder as ready.',
)

assert.match(
  hero,
  /projeto · <span className="atlas-ai-hero-context-name">/,
  'Atlas AI hero must say project instead of workspace in user-facing context copy.',
)

assert.doesNotMatch(
  hero,
  /estado real do kernel|providers/,
  'Atlas AI hero must not expose kernel/provider jargon in the operator-facing operational mode.',
)

assert.doesNotMatch(
  contract,
  /backend decide o task|provider ideal/,
  'Atlas AI mode/task menus must use Atlas Decide and model wording instead of backend/provider jargon.',
)

assert.match(
  contract,
  /Atlas escolhe o melhor modelo pelo contexto[\s\S]*Atlas decide a melhor ação pelo contexto/,
  'Atlas AI automatic mode/task copy must explain the decision in product language.',
)

assert.match(
  contract,
  /function modelLabel[\s\S]*claude_cli[\s\S]*Claude[\s\S]*codex_cli[\s\S]*Codex[\s\S]*replace\(\/\[_-\]\+\/g, ' '\)/,
  'Atlas AI must have a single user-facing model label helper for provider ids.',
)

assert.match(
  `${contract}\n${conversation}`,
  /function modeLabel[\s\S]*auto: 'Atlas decide'[\s\S]*modeLabel\(mode\)[\s\S]*projeto \{projectName\(detail\.workspace\)\}[\s\S]*messageCountLabel/,
  'Atlas AI conversation metadata must use human mode/project/count labels instead of raw auto/workspace tokens.',
)

assert.doesNotMatch(
  `${conversation}\n${streamingIndicator}\n${contextPanel}\n${planPanel}`,
  /\{message\.provider\}|\{detail\.last_provider\}|\{pendingTrace\.provider \?\? '—'\}|\{thread\.last_provider \?\? '—'\}|\{devRuntime\.provider \?\? '—'\}/,
  'Atlas AI conversation surfaces must not render raw provider ids as model labels.',
)

assert.doesNotMatch(
  threadExport,
  /Thread ID|Workspace|Último provider|timestamps \+ role \+ provider|\`\$\{m\.provider\}\`/,
  'Conversation context export must use project/conversation/model wording instead of thread/workspace/provider jargon.',
)

assert.match(
  threadExport,
  /Export de conversa Atlas AI[\s\S]*\*\*Conversa:\*\*[\s\S]*\*\*Projeto:\*\*[\s\S]*\*\*Último modelo:\*\* \$\{modelLabel\(thread\.last_provider\)\}[\s\S]*modelLabel\(m\.provider\)/,
  'Conversation context export must normalize model labels before reuse in AWIS context.',
)

assert.match(
  `${conversation}\n${streamingIndicator}\n${contextPanel}\n${planPanel}`,
  /modelLabel\(message\.provider\)[\s\S]*modelLabel\(detail\.last_provider\)[\s\S]*modelLabel\(trace\.provider\)[\s\S]*modelLabel\(thread\.last_provider\)[\s\S]*modelLabel\(pendingTrace\.provider\)/,
  'Atlas AI conversation surfaces must render model metadata through modelLabel.',
)

assert.match(
  hero,
  /serviço local, fila Atenção, modelos e custos/,
  'Atlas AI operational hero must describe runtime status with human product language.',
)

assert.match(
  hero,
  /Status modelos/,
  'Atlas AI operational prompt chip must use model wording instead of provider jargon.',
)

assert.match(
  surface,
  /Sem pasta local/,
  'Atlas AI header must not expose repo jargon for a context-only project.',
)

assert.match(
  picker,
  /type="search"/,
  'Workspace picker menu must expose a real project search field.',
)

assert.match(
  picker,
  /onOpenWorkspaceProfile\?\.\('create'\)/,
  'Workspace picker must expose the add-new-project path from the composer, like Codex project selection.',
)

assert.match(
  picker,
  /Esta conversa está vinculada a este projeto/,
  'Locked workspace state must be visible to the operator instead of silently ignoring clicks.',
)

assert.match(
  picker,
  /Sem pasta local/,
  'Workspace picker must label projects without localPath as context-only, not fake local folders.',
)

assert.match(
  `${surface}\n${picker}\n${profileSheet}`,
  /Pasta pronta[\s\S]*Pasta ausente[\s\S]*Sem pasta local/,
  'Atlas AI project controls must use one shared local-folder vocabulary: ready, missing, or no local folder.',
)

assert.doesNotMatch(
  `${picker}\n${profileSheet}`,
  /Pasta não encontrada/,
  'Atlas AI project controls must not use a second label for missing configured folders.',
)

assert.match(
  picker,
  /onOpenWorkspaceProfile\?\.\('edit'\)/,
  'Locked project chip must still open the Project Profile so the operator can link a real folder.',
)

assert.match(
  bridge,
  /invokeTauri<unknown>\('bridge_list_works', \{\s*workspaceSlug,/s,
  'Tauri listObras must pass the selected workspace to avoid mixing projects.',
)

assert.match(
  tauriBridge,
  /pub async fn bridge_list_works\([^)]*workspace_slug: Option<String>/s,
  'Native bridge_list_works must accept workspace_slug instead of listing every project indiscriminately.',
)

assert.match(
  bridgeClient,
  /pub async fn list_works\(&self, workspace_slug: Option<&str>\)/,
  'AtlasBridge must support workspace-filtered works for multi-project productivity.',
)

for (const command of [
  'bridge_list_workspaces',
  'bridge_create_workspace_profile',
  'bridge_update_workspace_profile',
  'bridge_archive_workspace_profile',
]) {
  assert.match(
    tauriLib,
    new RegExp(`commands_bridge::${command}`),
    `${command} must be registered in the Tauri invoke handler; JS fallback HTTP is not enough in packaged app mode.`,
  )
}

assert.match(
  bridge,
  /invokeTauri<unknown>\('bridge_create_workspace_profile'/,
  'Project creation must use the native bridge in Tauri mode.',
)

assert.match(
  bridge,
  /createWorkspaceProfile remote unavailable; using local profile fallback/,
  'Project creation in packaged app must still save a local workspace profile when the sidecar/read-model is unavailable.',
)

assert.match(
  useAtlasAi,
  /eventApi\.listen\('kernel:\/\/ready'/,
  'Atlas AI must refresh its own conversation list when the packaged app kernel becomes ready; useBridge refresh alone is not enough.',
)

assert.match(
  useAtlasAi,
  /threadsRetryCountRef\.current >= 6/,
  'Atlas AI conversation loading must retry transient startup failures without hammering the local service forever.',
)

assert.match(
  useAtlasAi,
  /threadsRetryCountRef\.current = 0/,
  'Atlas AI conversation retry budget must reset after a successful reload or kernel-ready event.',
)

assert.match(
  atlasAiClient,
  /rota \/ai\/threads não encontrada no serviço local/,
  'Atlas AI startup errors must name the canonical /ai/threads route, not the obsolete /api prefix.',
)

assert.doesNotMatch(
  atlasAiClient,
  /sessão do backend|Atlas Dev plan endpoint não disponível no backend ativo|Atlas Dev plan endpoint indisponível/,
  'Desktop client errors shown to the operator must not expose backend/endpoint jargon.',
)

assert.doesNotMatch(
  useAtlasAi,
  /Backend não responde ao polling do trace|provider\/kernel travado|backend indisponível, conversa só volta quando o kernel responder/,
  'Composer send errors must use human local-service wording instead of backend/kernel/provider jargon.',
)

assert.match(
  unifiedComposer,
  /ariaLabel="Modelo Atlas"/,
  'Composer model selector must not expose provider jargon in accessibility labels.',
)

assert.doesNotMatch(
  runtimeStatusPill,
  /contexto\/trace/,
  'Runtime status pill must describe execution in product language, not trace jargon.',
)

assert.doesNotMatch(
  `${brandBlock}\n${workspacePill}\n${surfaceSwitcher}`,
  /Project\/Workspace ativo|Selecionar Project\/Workspace|Atlas surfaces|Surface não declarada|não declarada no Projeto ativo|limitado/,
  'Global shell labels around Atlas AI must use projeto/área wording instead of Project/Workspace/Surface jargon.',
)

assert.doesNotMatch(
  `${unifiedComposer}\n${projectScopeStrip}\n${profileSheet}\n${brandBlock}`,
  /exigir Workspace|exige Workspace|Projeto\/Workspace|`repo_root`|`workspace_path`|Backend não expôs|read-model de projetos|\/atlas-code\/projects\/workspaces/,
  'Workspace/project UI must use Projeto and pasta local wording instead of Workspace/internal field names.',
)

assert.doesNotMatch(
  `${surfaceSwitcher}\n${profileSheet}`,
  /Área bloqueada|Backend não expôs|read-model/,
  'Project and area UI must avoid blocked/backend/read-model copy in operator-facing labels.',
)

assert.doesNotMatch(
  kernelDiagnostic,
  /Kernel diagnostic|k="failure_code"|k="repair_hint"|k="server_path"|k="php_path"|title="stderr_tail"|title="stdout_tail"|↻ tentar novamente|worker/,
  'Kernel diagnostic popover must present local-service health in human AWIS language, not raw diagnostic keys.',
)

assert.doesNotMatch(
  `${kernelPill}\n${kernelStatus}`,
  /Kernel pronto|Kernel falhou|Kernel não encontrado|worker/,
  'Kernel pill must describe the local service in human AWIS language.',
)

assert.match(
  `${kernelPill}\n${kernelStatus}`,
  /fila ativa[\s\S]*Serviço pronto[\s\S]*Serviço com atenção[\s\S]*Serviço indisponível/,
  'Kernel pill must show local-service and queue state without kernel/worker jargon.',
)

assert.match(
  kernelDiagnostic,
  /Serviço local do Atlas[\s\S]*Estado[\s\S]*Como resolver[\s\S]*Endereço local[\s\S]*verificar novamente[\s\S]*Serviço não encontrado[\s\S]*Verificação falhou/,
  'Kernel diagnostic popover must explain the local Atlas service with actionable Portuguese labels.',
)

assert.doesNotMatch(
  useKernelStatus,
  /Atlas Server configured via HTTP env|Bridge offline|retry failed|Check stderr_tail/,
  'Kernel status messages shown in the AWIS shell must not leak internal startup phrasing.',
)

assert.match(
  useKernelStatus,
  /Serviço local conectado por configuração externa[\s\S]*Serviço local indisponível[\s\S]*Iniciando serviço local do Atlas[\s\S]*Não consegui verificar o serviço local agora/,
  'Kernel status hook must emit human local-service messages for the AWIS shell.',
)

assert.doesNotMatch(
  projectScopeStrip,
  /workspace_path declarado|path ausente|atlas-project-strip-eyebrow">Scope|atlas-project-strip-slug/,
  'Shared project scope strip must not expose workspace_path/path/scope/slug jargon in operator-facing copy.',
)

assert.match(
  projectScopeStrip,
  /Projeto[\s\S]*Sem pasta local[\s\S]*Pasta pronta[\s\S]*Pasta local configurada, mas não encontrada[\s\S]*pasta ausente/,
  'Shared project scope strip must explain project and local-folder state in human Portuguese.',
)

assert.doesNotMatch(
  workspacePill,
  /\{profile\.slug\} · docs \{docs\}|ver perfil completo/,
  'Workspace dropdown must not expose slug/docs implementation copy as the primary project detail.',
)

assert.match(
  workspacePill,
  /aria-label=\{`Projeto ativo: \$\{fallbackName\}\. \$\{activeFolderLabel\}`\}[\s\S]*Pasta local pronta para contexto e execução[\s\S]*\{activeFolderLabel\}/,
  'Workspace main pill must expose the active project local-folder state without opening the dropdown.',
)

assert.match(
  workspacePill,
  /Sem pasta local[\s\S]*Pasta pronta[\s\S]*docs prontas[\s\S]*configurar projeto/,
  'Workspace dropdown and main pill must present project folder/docs state as human product language.',
)

assert.match(
  bridge,
  /invokeTauri<unknown>\('bridge_update_workspace_profile'/,
  'Project folder linking must persist through the native bridge in Tauri mode.',
)

assert.match(
  bridge,
  /protocol === 'tauri:'[\s\S]*'__TAURI_INTERNALS__' in window[\s\S]*'__TAURI__' in window/,
  'The native folder picker must stay enabled in the packaged tauri:// app even when Tauri globals initialize late.',
)

assert.match(
  bridge,
  /function normalizeLocalFolderPath[\s\S]*part === '\.\.'[\s\S]*parts\.pop\(\)[\s\S]*workspacePath: normalizeLocalFolderPath\(r\.workspace_path \?\? r\.workspacePath\)[\s\S]*workspace_path: normalizeLocalFolderPath/,
  'Project folder paths must be normalized before display/persistence so the UI does not expose raw /segment/.. paths.',
)

assert.match(
  bridge,
  /updateWorkspaceProfile remote unavailable; using local profile fallback/,
  'Project folder linking must still persist locally when the sidecar/read-model is unavailable.',
)

assert.match(
  bridge,
  /if \(MODE === 'tauri'\) \{\s*console\.warn\('\[bridge\] createWorkspaceProfile native response invalid; using local profile fallback'/s,
  'Invalid native project creation envelopes in Tauri must fall back locally even when HTTP_BASE exists.',
)

assert.match(
  profileSheet,
  /createFromFolder/,
  'Create mode must support folder-first project creation instead of forcing the operator through the full ficha first.',
)

assert.match(
  profileSheet,
  /escolher pasta do Mac e criar projeto/i,
  'Project Profile create mode must expose a clear folder-first CTA.',
)

assert.doesNotMatch(
  profileSheet,
  /perfil não foi persistido pelo backend|setError\(e instanceof Error \? e\.message : String\(e\)\)|risk_floor/,
  'Project Profile errors must not leak backend/raw exception wording into the operator-facing sheet.',
)

assert.doesNotMatch(
  profileSheet,
  /Code\/Dev|pasta local libera Code/,
  'Project Profile folder-state copy must describe local execution capability, not internal surface shorthand.',
)

assert.match(
  profileSheet,
  /Corrija a pasta antes de usar execução local/,
  'Project Profile must explain local-folder capability with one concrete operator action.',
)

assert.match(
  profileSheet,
  /pasta local libera contexto real, testes, terminal e execução local/,
  'Project Profile footer must explain what a local folder enables without naming implementation surfaces.',
)

assert.match(
  profileSheet,
  /function explainProjectProfileError[\s\S]*Não consegui salvar no serviço local agora[\s\S]*serviço local não confirmou a atualização/,
  'Project Profile must translate local-service failures into human Portuguese.',
)

assert.match(
  surfaceHost,
  /const selected = await bridge\.pickWorkspaceFolder\(\)[\s\S]*profile[\s\S]*bridge\.updateWorkspaceProfile\([\s\S]*workspacePayloadFromProfile\(profile, selected\)[\s\S]*bridge\.createWorkspaceProfile\([\s\S]*workspacePayloadFromFolder\(selected, bridge\.activeWorkspaceSlug \?\? bridge\.workspaces\?\.defaultSlug \?\? null\)[\s\S]*await bridge\.setActiveWorkspaceSlug\(updated\.slug\)/,
  'The AWIS command-center "Escolher pasta" CTA must open the native folder picker and persist the folder directly, even when the workspace list is unavailable.',
)

assert.match(
  surface,
  /onChooseWorkspaceFolder\?: \(\) => Promise<boolean \| void> \| boolean \| void[\s\S]*handleAwisChooseFolder[\s\S]*if \(!onChooseWorkspaceFolder\)[\s\S]*showWorkbenchNotice\('Pasta local vinculada\. AWIS pronto para contexto e execução\.'\)[\s\S]*onChooseFolder=\{handleAwisChooseFolder\}/,
  'Atlas AI must give immediate AWIS feedback after linking a local folder from the command center.',
)

assert.match(
  surface,
  /title=\{workspaceFolderReady \? 'Abrir perfil do projeto e pasta local' : 'Escolher pasta real do Mac para este projeto'\}/,
  'The AWIS command-center folder CTA must explain that it chooses a real Mac folder when the project has no local folder yet.',
)
