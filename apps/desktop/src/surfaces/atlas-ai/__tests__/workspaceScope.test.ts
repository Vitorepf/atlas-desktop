import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  atlasAiWorkspaceScopeFromProfile,
  normaliseWorkspaceKey,
  threadBelongsToWorkspace,
  workspaceMetadata,
  workspaceStorageValue,
} from '../workspaceScope'
import type { AiThreadSummary } from '../types'

const surface = readFileSync(new URL('../AtlasAiSurface.tsx', import.meta.url), 'utf8')

function thread(partial: Partial<AiThreadSummary>): AiThreadSummary {
  return {
    id: partial.id ?? 'thread-1',
    title: partial.title ?? 'Thread',
    summary: null,
    status: 'active',
    surface: 'atlas_desktop_ai',
    workspace: partial.workspace ?? null,
    source_type: 'desktop',
    source_id: null,
    last_trace_id: null,
    last_provider: null,
    message_count: 0,
    last_message_at: null,
    metadata: partial.metadata ?? null,
    created_at: null,
    updated_at: null,
  }
}

test('workspace scope prefers slug as storage value and carries path in metadata', () => {
  const scope = atlasAiWorkspaceScopeFromProfile('atlas', {
    slug: 'atlas',
    name: 'Atlas',
    workspacePath: '/Users/vitorepf/develop/Atlas',
    workspacePathExists: true,
  } as never)

  assert.equal(workspaceStorageValue(scope), 'atlas')
  assert.deepEqual(workspaceMetadata(scope).workspace_slug, 'atlas')
  assert.deepEqual(workspaceMetadata(scope).workspace_path, '/Users/vitorepf/develop/Atlas')
  assert.deepEqual((workspaceMetadata(scope).awis_workspace_scope as Record<string, unknown>).schema_version, 'atlas.desktop_ai.workspace_scope.v1')
})

test('threadBelongsToWorkspace matches legacy path rows and new slug rows', () => {
  const scope = {
    slug: 'atlas',
    name: 'Atlas',
    path: '/Users/vitorepf/develop/Atlas',
    pathExists: true,
  }

  assert.equal(threadBelongsToWorkspace(thread({ workspace: 'atlas' }), scope), true)
  assert.equal(threadBelongsToWorkspace(thread({ workspace: '/Users/vitorepf/develop/Atlas' }), scope), true)
  assert.equal(threadBelongsToWorkspace(thread({ metadata: { workspace_slug: 'atlas' } }), scope), true)
  assert.equal(threadBelongsToWorkspace(thread({ metadata: { repo_root: '/Users/vitorepf/develop/Atlas' } }), scope), true)
  assert.equal(
    threadBelongsToWorkspace(thread({ workspace: null, metadata: null }), scope),
    true,
    'legacy unscoped conversations shown under the active project must still open for comparison',
  )
  assert.equal(threadBelongsToWorkspace(thread({ workspace: 'blackink' }), scope), false)
})

test('normaliseWorkspaceKey collapses absolute paths to project names', () => {
  assert.equal(normaliseWorkspaceKey('/Users/vitorepf/develop/Atlas'), 'atlas')
  assert.equal(normaliseWorkspaceKey('/Users/vitorepf/develop/Atlas/'), 'atlas')
  assert.equal(normaliseWorkspaceKey('blackink'), 'blackink')
  assert.equal(normaliseWorkspaceKey(null), null)
})

test('AWIS command center and hero count only conversations from the active project', () => {
  assert.match(
    surface,
    /const activeWorkspaceThreadCount = availableWorkspaceThreadIds\.size/,
    'Atlas AI must derive the visible project thread count from the active workspace scope.',
  )
  assert.match(
    surface,
    /evaluateAwisWorkspaceIntelligence\(\{[\s\S]*threadCount: activeWorkspaceThreadCount/,
    'AWIS intelligence must not use the global thread count across projects.',
  )
  assert.match(
    surface,
    /<AtlasAiHero[\s\S]*threadCount=\{activeWorkspaceThreadCount\}/,
    'The empty-state hero must show the active project conversation count, not all Atlas AI conversations.',
  )
})
