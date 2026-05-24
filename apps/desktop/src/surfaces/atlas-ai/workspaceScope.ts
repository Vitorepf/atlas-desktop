import type { AtlasWorkspaceProfile } from '@atlas/domain'
import type { AiThreadSummary } from './types'

export interface AtlasAiWorkspaceScope {
  slug: string | null
  name: string | null
  path: string | null
  pathExists: boolean | null
}

export function atlasAiWorkspaceScopeFromProfile(
  slug: string | null | undefined,
  profile?: AtlasWorkspaceProfile | null,
): AtlasAiWorkspaceScope {
  return {
    slug: slug ?? profile?.slug ?? null,
    name: profile?.name ?? slug ?? profile?.slug ?? null,
    path: profile?.workspacePath && profile.workspacePath.trim() !== '' ? profile.workspacePath : null,
    pathExists: typeof profile?.workspacePathExists === 'boolean' ? profile.workspacePathExists : null,
  }
}

export function workspaceStorageValue(scope: AtlasAiWorkspaceScope): string | null {
  return scope.slug ?? scope.path
}

export function workspaceMetadata(scope: AtlasAiWorkspaceScope): Record<string, unknown> {
  const metadata: Record<string, unknown> = {
    awis_workspace_scope: {
      schema_version: 'atlas.desktop_ai.workspace_scope.v1',
      workspace_slug: scope.slug,
      workspace_path_present: scope.path !== null,
      workspace_path_exists: scope.pathExists,
    },
  }
  if (scope.slug) metadata.workspace_slug = scope.slug
  if (scope.path) {
    metadata.workspace_path = scope.path
    metadata.repo_root = scope.path
  }
  if (scope.name) metadata.workspace_name = scope.name
  return metadata
}

export function threadBelongsToWorkspace(
  thread: AiThreadSummary,
  scope: AtlasAiWorkspaceScope,
): boolean {
  const keys = workspaceKeysForThread(thread)
  const wanted = workspaceKeysForScope(scope)
  if (wanted.size === 0) return true
  if (keys.size === 0) return true
  for (const key of wanted) {
    if (keys.has(key)) return true
  }
  return false
}

export function workspaceKeysForThread(thread: AiThreadSummary): Set<string> {
  const keys = new Set<string>()
  addWorkspaceKey(keys, thread.workspace)
  const meta = thread.metadata ?? {}
  addWorkspaceKey(keys, typeof meta.workspace_slug === 'string' ? meta.workspace_slug : null)
  addWorkspaceKey(keys, typeof meta.workspace_path === 'string' ? meta.workspace_path : null)
  addWorkspaceKey(keys, typeof meta.repo_root === 'string' ? meta.repo_root : null)
  return keys
}

export function workspaceKeysForScope(scope: AtlasAiWorkspaceScope): Set<string> {
  const keys = new Set<string>()
  addWorkspaceKey(keys, scope.slug)
  addWorkspaceKey(keys, scope.path)
  return keys
}

export function normaliseWorkspaceKey(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim()
  if (!trimmed) return null
  const path = trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed
  const lastSlash = path.lastIndexOf('/')
  const basename = lastSlash >= 0 ? path.slice(lastSlash + 1) : path
  return (basename || path).toLowerCase()
}

function addWorkspaceKey(target: Set<string>, raw: string | null | undefined): void {
  const exact = raw?.trim()
  if (!exact) return
  target.add(exact.toLowerCase())
  const normalised = normaliseWorkspaceKey(exact)
  if (normalised) target.add(normalised)
}
