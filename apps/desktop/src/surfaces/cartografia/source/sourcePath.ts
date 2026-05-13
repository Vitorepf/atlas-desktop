import type { CartographySources, GraphSource } from '@atlas/domain'

export function cartographyOpenUri({
  source,
  relativePath,
  sources,
}: {
  source: GraphSource
  relativePath: string
  sources: CartographySources | null
}): string {
  if (source === 'vault') {
    const vault = 'AtlasVault'
    const file = encodeURIComponent(stripMarkdownExtension(vaultRelativePath(relativePath)))
    return `obsidian://open?vault=${encodeURIComponent(vault)}&file=${file}`
  }
  return `file://${absoluteRepoPath(relativePath, sources)}`
}

export function absoluteCartographyPath({
  source,
  relativePath,
  sources,
}: {
  source: GraphSource
  relativePath: string
  sources: CartographySources | null
}): string {
  if (source === 'vault') return absoluteVaultPath(relativePath, sources)
  return absoluteRepoPath(relativePath, sources)
}

function stripMarkdownExtension(path: string): string {
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
  return joinPath(vaultRoot, vaultRelativePath(relative))
}

function vaultRelativePath(relative: string): string {
  return relative.replace(/^AtlasVault\/?/, '')
}

function joinPath(base: string, relative: string): string {
  return `${base.replace(/\/+$/, '')}/${relative.replace(/^\/+/, '')}`
}

function parentDir(path: string): string {
  return path.replace(/\/+$/, '').replace(/\/[^/]*$/, '')
}
