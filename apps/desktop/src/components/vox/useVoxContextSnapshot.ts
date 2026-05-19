/**
 * useVoxContextSnapshot · React hook que devolve um provider de
 * VoxContextSnapshot v1 para o Vox Overlay V4.
 *
 * Filosofia: o hook NÃO armazena snapshot em state — ele devolve uma
 * callback `getSnapshot()` que cada surface chama no momento em que o usuário
 * dispara a intenção (compile/execute). Assim o snapshot sempre reflete o
 * estado vivo (thread atual, seleção atual, terminal cwd atual) sem custo de
 * re-render contínuo.
 *
 * Nenhuma chamada de SO: a seleção é lida via `window.getSelection()` (que
 * só enxerga texto dentro do WKWebView do Atlas Desktop — Tauri 2). Não há
 * acesso a clipboard, screenshot, AppleScript ou Full Disk Access.
 */
import { useCallback } from 'react'
import type { Surface } from '../../hooks/useSurface'
import {
  buildVoxContextSnapshot,
  type VoxContextActiveViewKind,
  type VoxContextSnapshot,
  type VoxContextSnapshotInput,
} from './voxContextSnapshot'

export interface UseVoxContextSnapshotInput {
  /** Surface ativa do shell (resolvida via `useSurface()`). */
  surface: Surface
  /** Workspace ativo, se conhecido. */
  workspace?: {
    root?: string | null
    name?: string | null
  } | null
  /** Thread ativa (Atlas AI) — `null` quando o operador está no Hero. */
  thread?: {
    id?: string | null
    title?: string | null
  } | null
  /** Obra ativa (Atlas Code) — `null` fora do Code. */
  obra?: {
    id?: string | null
    title?: string | null
  } | null
  /** Terminal ativo (cwd + visibilidade). */
  terminal?: {
    cwd?: string | null
    lastOutputExcerpt?: string | null
    available?: boolean | null
  } | null
  /** Rótulo livre da view (ex: "Atlas AI · thread X"). */
  activeViewLabel?: string | null
}

export interface UseVoxContextSnapshotResult {
  /** Constrói o snapshot AGORA, lendo seleção viva e dados injetados. */
  getSnapshot: () => VoxContextSnapshot
}

function surfaceToActiveViewKind(surface: Surface): VoxContextActiveViewKind {
  switch (surface) {
    case 'atlas_ai':
      return 'atlas_ai'
    case 'code':
      return 'code'
    // cartografia / atencao / control_plane não fazem parte das 4 kinds
    // canônicas do snapshot V4. Mapeia honestamente para `unknown`.
    default:
      return 'unknown'
  }
}

/**
 * Lê a seleção atual dentro do WKWebView. Devolve `null` quando não há
 * seleção textual (ou quando rodando em SSR/teste sem `window`).
 *
 * IMPORTANTE: isso não é clipboard. `Selection` é o intervalo de texto
 * destacado pelo usuário dentro do próprio Atlas Desktop. Nenhum app de
 * terceiros, nenhum conteúdo fora do WKWebView é acessível por aqui.
 */
export function readLiveSelectionText(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) return null
    const text = sel.toString()
    if (!text || text.trim() === '') return null
    return text
  } catch {
    return null
  }
}

export function useVoxContextSnapshot(
  input: UseVoxContextSnapshotInput,
): UseVoxContextSnapshotResult {
  const {
    surface,
    workspace,
    thread,
    obra,
    terminal,
    activeViewLabel,
  } = input

  const getSnapshot = useCallback((): VoxContextSnapshot => {
    const selectionText = readLiveSelectionText()
    const payload: VoxContextSnapshotInput = {
      workspace: workspace ?? null,
      activeView: {
        kind: surfaceToActiveViewKind(surface),
        label: activeViewLabel ?? null,
      },
      selectionText,
      thread: thread ?? null,
      obra: obra ?? null,
      terminal: terminal ?? null,
    }
    return buildVoxContextSnapshot(payload)
    // Dependemos dos campos primitivos (não dos objetos pais) para evitar
    // re-criar a callback a cada render que monta novo wrapper. ESLint não
    // consegue verificar isso estaticamente — silenciamos com escopo
    // estreito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    surface,
    activeViewLabel,
    workspace?.root,
    workspace?.name,
    thread?.id,
    thread?.title,
    obra?.id,
    obra?.title,
    terminal?.cwd,
    terminal?.lastOutputExcerpt,
    terminal?.available,
  ])

  return { getSnapshot }
}
