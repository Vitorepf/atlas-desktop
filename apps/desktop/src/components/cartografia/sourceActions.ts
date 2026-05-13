import type { CartographyAtom, CartographyNote, CartographySources } from '@atlas/domain'
import { bridge } from '../../lib/bridge'

export async function openCartographyDocument(
  atom: CartographyAtom,
  note: CartographyNote | null = null,
  sources: CartographySources | null = null
): Promise<void> {
  const source = note?.source ?? atom.graphSource
  const relativePath = note?.sourcePath ?? atom.sourcePath
  if (!relativePath) return

  if (source === 'vault') {
    const vault = 'AtlasVault'
    const file = encodeURIComponent(stripExtension(vaultRelativePath(relativePath, sources)))
    try {
      await bridge.openExternal(`obsidian://open?vault=${encodeURIComponent(vault)}&file=${file}`)
    } catch {
      /* best-effort */
    }
    return
  }

  try {
    await bridge.openExternal(`file://${absoluteRepoPath(relativePath, sources)}`)
  } catch {
    /* best-effort */
  }
}

export async function revealCartographyDocument(
  atom: CartographyAtom,
  note: CartographyNote | null = null,
  sources: CartographySources | null = null
): Promise<void> {
  const relative = note?.sourcePath ?? atom.sourcePath
  if (!relative) return
  const absolute = (note?.source ?? atom.graphSource) === 'vault'
    ? absoluteVaultPath(relative, sources)
    : absoluteRepoPath(relative, sources)
  try {
    await bridge.revealInFinder(absolute)
  } catch {
    /* best-effort */
  }
}

export async function copyCartographyPath(atom: CartographyAtom): Promise<void> {
  if (!atom.sourcePath) return
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(atom.sourcePath)
    }
  } catch {
    /* clipboard permission denied */
  }
}

function stripExtension(path: string): string {
  return path.replace(/\.md$/i, '')
}

function absoluteRepoPath(relative: string, sources: CartographySources | null): string {
  if (relative.startsWith('/')) return relative
  const docsRoot = sources?.repoDocsPath ?? ''
  if (docsRoot && relative.startsWith('docs/engineering-knowledge-base/')) {
    return joinPath(docsRoot, relative.replace(/^docs\/engineering-knowledge-base\/?/, ''))
  }
  if (docsRoot) return joinPath(parentDir(parentDir(docsRoot)), relative)
  return relative
}

function absoluteVaultPath(relative: string, sources: CartographySources | null): string {
  if (relative.startsWith('/')) return relative
  const vaultRoot = sources?.obsidianVaultPath ?? ''
  if (!vaultRoot) return relative
  return joinPath(vaultRoot, vaultRelativePath(relative, sources))
}

function vaultRelativePath(relative: string, _sources: CartographySources | null): string {
  return relative.replace(/^AtlasVault\/?/, '')
}

function joinPath(base: string, relative: string): string {
  return `${base.replace(/\/+$/, '')}/${relative.replace(/^\/+/, '')}`
}

function parentDir(path: string): string {
  return path.replace(/\/+$/, '').replace(/\/[^/]*$/, '')
}
