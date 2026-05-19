/**
 * Atlas AI · Shiki singleton lazy loader.
 *
 * Carrega o highlighter Shiki UMA vez por sessão e expõe um hook que retorna
 * `(code, lang) => html`. Usa o tema `github-dark-dimmed` que combina com o
 * dark slate teal do shell. Linguagens incluem o que aparece em conversa
 * técnica diária — TypeScript, Python, Rust, Bash, JSON, etc.
 */
import { useEffect, useState } from 'react'

interface ShikiAPI {
  codeToHtml: (
    code: string,
    options: { lang: string; theme: string },
  ) => string
  getLoadedLanguages?: () => string[]
}

const LANGS = [
  'typescript',
  'tsx',
  'javascript',
  'jsx',
  'python',
  'rust',
  'go',
  'bash',
  'shell',
  'json',
  'yaml',
  'toml',
  'css',
  'html',
  'markdown',
  'sql',
  'php',
  'java',
  'c',
  'cpp',
  'ruby',
  'diff',
] as const

const THEME = 'github-dark-dimmed'

let highlighterPromise: Promise<ShikiAPI> | null = null

async function loadHighlighter(): Promise<ShikiAPI> {
  if (highlighterPromise) return highlighterPromise
  highlighterPromise = (async () => {
    const shiki = await import('shiki')
    const hl = await shiki.createHighlighter({
      themes: [THEME],
      langs: LANGS as unknown as string[],
    })
    return hl as unknown as ShikiAPI
  })()
  return highlighterPromise
}

export function useShikiHighlighter() {
  const [ready, setReady] = useState(false)
  const [hl, setHl] = useState<ShikiAPI | null>(null)

  useEffect(() => {
    let cancelled = false
    void loadHighlighter().then((api) => {
      if (cancelled) return
      setHl(api)
      setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  function highlight(code: string, lang: string | null): string | null {
    if (!hl || !ready) return null
    const safeLang =
      lang && (LANGS as readonly string[]).includes(lang) ? lang : 'plaintext'
    try {
      return hl.codeToHtml(code, { lang: safeLang, theme: THEME })
    } catch {
      return null
    }
  }

  return { ready, highlight }
}
