/**
 * useAtomNotePreview · lazy-fetch preview do .md canon para tooltip hover
 * (Feature #3).
 *
 * Comportamento:
 *   - Hover sobre atom dispara enable(graphId)
 *   - Após HOVER_DELAY (380ms), faz fetch via bridge.loadCartographyNote
 *   - Cache em memória por graphId (sessão atual)
 *   - Disable cancela timer (não inicia fetch redundante)
 *
 * O cache é Map sincrônico (não persistido) — preview é sempre fresco
 * dentro da sessão mas re-busca em reloads (anti-mock canônico: a
 * documentação real é a fonte, nunca o cache).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { bridge } from '../../../lib/bridge'

export interface NotePreview {
  graphId: string
  title: string
  summary: string
  firstParagraph: string
  sourcePath: string
  modifiedAt: string | null
  loading: boolean
  error: boolean
}

const HOVER_DELAY = 380   // ms · canon Patek (não-instantâneo, mas responsivo)
const cache = new Map<string, NotePreview>()

/** Extrai primeiro parágrafo significativo do body Markdown.
 *  Ignora cabeçalhos `#`, frontmatter, e linhas vazias.
 *  Retorna até MAX_LEN chars (truncado com ellipsis). */
function extractFirstParagraph(body: string, maxLen = 240): string {
  if (!body) return ''
  const lines = body.split('\n')
  const buffer: string[] = []
  let collecting = false
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) {
      if (collecting && buffer.length > 0) break
      continue
    }
    if (line.startsWith('#')) {
      if (collecting) break
      continue
    }
    if (line.startsWith('---')) continue
    collecting = true
    buffer.push(line)
    if (buffer.join(' ').length >= maxLen) break
  }
  const text = buffer.join(' ').trim()
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen).replace(/\s+\S*$/, '') + '…'
}

interface UseAtomNotePreviewOptions {
  atom: { graphId: string; name: string; deck: string | null } | null
  enabled: boolean
}

export function useAtomNotePreview({ atom, enabled }: UseAtomNotePreviewOptions): NotePreview | null {
  const [preview, setPreview] = useState<NotePreview | null>(null)
  const timerRef = useRef<number | null>(null)

  // Cancel any pending timer when disabled or atom changes
  useEffect(() => {
    return () => {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [atom?.graphId])

  useEffect(() => {
    if (!enabled || !atom) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreview(null)
      return
    }
    const graphId = atom.graphId

    // Cache hit · entrega imediato (sem delay)
    const cached = cache.get(graphId)
    if (cached) {
      setPreview(cached)
      return
    }

    // Cache miss · agenda fetch após HOVER_DELAY
    timerRef.current = window.setTimeout(async () => {
      const initial: NotePreview = {
        graphId,
        title: atom.name,
        summary: atom.deck ?? '',
        firstParagraph: '',
        sourcePath: '',
        modifiedAt: null,
        loading: true,
        error: false,
      }
      setPreview(initial)
      try {
        const note = await bridge.loadCartographyNote(graphId)
        if (!note) {
          const failed: NotePreview = { ...initial, loading: false, error: true }
          cache.set(graphId, failed)
          setPreview(failed)
          return
        }
        const final: NotePreview = {
          graphId,
          title: atom.name,
          summary: atom.deck ?? '',
          firstParagraph: extractFirstParagraph(note.body),
          sourcePath: note.sourcePath,
          modifiedAt: note.modifiedAt,
          loading: false,
          error: false,
        }
        cache.set(graphId, final)
        setPreview(final)
      } catch {
        const failed: NotePreview = { ...initial, loading: false, error: true }
        cache.set(graphId, failed)
        setPreview(failed)
      }
    }, HOVER_DELAY)

    return () => {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [atom, enabled])

  const close = useCallback(() => setPreview(null), [])
  // Expor close via ref se quiser; não usado externamente por enquanto.
  void close

  return preview
}
