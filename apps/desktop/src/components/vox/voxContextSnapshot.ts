/**
 * Vox V4 · Context Snapshot / Context Resolver.
 *
 * Schema: `atlas.vox.context_snapshot.v1`.
 *
 * O Vox V3 já compila intenção a partir do transcript + context_refs leves.
 * O V4 precisa entender frases como "isso aqui", "esse arquivo", "essa tela",
 * "essa obra", "esse prompt", "no terminal" — sem screenshot, sem AppleScript,
 * sem clipboard, sem Full Disk Access. O caminho honesto é construir um
 * snapshot estruturado SÓ a partir do que o Atlas Desktop já conhece (surface
 * ativa, workspace ativo, thread selecionada, obra ativa, terminal ativo,
 * seleção dentro do composer).
 *
 * Esta camada é puramente declarativa e determinística: o resolver recebe
 * inputs já presentes nos stores existentes (useSurface, useBridge, etc.) e
 * produz o snapshot canônico. Nenhuma chamada de OS, nenhum acesso a clipboard,
 * nenhum áudio: privacy flags ficam pinned em false e isso é coberto por
 * teste — não dá pra "esquecer" e ligar.
 *
 * Canon:
 *   - docs/contracts/vox/*.md (V1 doutrina)
 *   - memory/feedback_atlas_no_mock.md (nunca inventar campo)
 */

export const VOX_CONTEXT_SNAPSHOT_SCHEMA = 'atlas.vox.context_snapshot.v1' as const
export const VOX_CONTEXT_SURFACE = 'atlas_desktop' as const

/** Limite padrão para qualquer texto livre dentro do snapshot. Mantém o
 * payload pequeno (logs/receipts), evita vazar mais do que o necessário e
 * deixa o Kernel decidir se precisa pedir mais via fetch dedicado. */
export const VOX_CONTEXT_TEXT_LIMIT = 1000

export type VoxContextActiveViewKind =
  | 'atlas_ai'
  | 'code'
  | 'terminal'
  | 'inbox'
  | 'unknown'

export interface VoxContextWorkspace {
  root: string | null
  name: string | null
}

export interface VoxContextActiveView {
  kind: VoxContextActiveViewKind
  label: string | null
}

export type VoxContextSelectionKind = 'text' | 'none'

export interface VoxContextSelection {
  kind: VoxContextSelectionKind
  text: string | null
  truncated: boolean
}

export interface VoxContextThread {
  id: string | null
  title: string | null
}

export interface VoxContextObra {
  id: string | null
  title: string | null
}

export interface VoxContextTerminal {
  cwd: string | null
  last_output_excerpt: string | null
  available: boolean
}

export interface VoxContextPrivacy {
  raw_audio_included: boolean
  full_screen_capture: boolean
  clipboard_read: boolean
}

export interface VoxContextSnapshot {
  schema: typeof VOX_CONTEXT_SNAPSHOT_SCHEMA
  surface: typeof VOX_CONTEXT_SURFACE
  workspace: VoxContextWorkspace
  active_view: VoxContextActiveView
  selection: VoxContextSelection
  thread: VoxContextThread
  obra: VoxContextObra
  terminal: VoxContextTerminal
  privacy: VoxContextPrivacy
}

/** Inputs que o resolver consome. Todos opcionais — quando nada está
 * disponível o snapshot fica honestamente `unknown/null`. */
export interface VoxContextSnapshotInput {
  workspace?: {
    root?: string | null
    name?: string | null
  } | null
  activeView?: {
    kind?: VoxContextActiveViewKind | null
    label?: string | null
  } | null
  selectionText?: string | null
  thread?: {
    id?: string | null
    title?: string | null
  } | null
  obra?: {
    id?: string | null
    title?: string | null
  } | null
  terminal?: {
    cwd?: string | null
    lastOutputExcerpt?: string | null
    available?: boolean | null
  } | null
  /** Override do limite de truncamento (testes). */
  textLimit?: number
}

function clean(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null
  const trimmed = String(value).trim()
  if (trimmed === '') return null
  return trimmed
}

export interface TruncationResult {
  text: string | null
  truncated: boolean
}

/**
 * Trunca texto preservando início e fim para o Kernel conseguir reconstruir
 * a forma da seleção sem precisar do conteúdo inteiro. Quando o texto cabe
 * dentro do limite, devolve-o intacto. Quando estoura, corta no meio e
 * marca `truncated: true`.
 *
 * Limite mínimo válido é 16 (precisa caber `…[N omitted]…`). Abaixo disso
 * trata como `null` para evitar texto inútil.
 */
export function truncateContextText(
  raw: string | null | undefined,
  limit: number = VOX_CONTEXT_TEXT_LIMIT,
): TruncationResult {
  const cleaned = clean(raw)
  if (cleaned === null) return { text: null, truncated: false }
  if (!Number.isFinite(limit) || limit < 16) {
    return { text: null, truncated: false }
  }
  if (cleaned.length <= limit) {
    return { text: cleaned, truncated: false }
  }
  // Preserva ~60% no início e ~30% no fim, deixando espaço pro marcador.
  const head = Math.max(8, Math.floor(limit * 0.6))
  const tail = Math.max(4, Math.floor(limit * 0.3))
  const omitted = cleaned.length - head - tail
  const marker = `…[${omitted} chars omitidos]…`
  const truncated = `${cleaned.slice(0, head)}${marker}${cleaned.slice(-tail)}`
  return { text: truncated, truncated: true }
}

function normalizeActiveViewKind(
  kind: VoxContextActiveViewKind | null | undefined,
): VoxContextActiveViewKind {
  switch (kind) {
    case 'atlas_ai':
    case 'code':
    case 'terminal':
    case 'inbox':
      return kind
    default:
      return 'unknown'
  }
}

/**
 * Construtor puro e determinístico do VoxContextSnapshot v1. Nenhum efeito
 * colateral: não lê clipboard, não lê tela, não toca AppleScript, não inclui
 * áudio bruto. As privacy flags ficam pinned em `false` aqui (a única forma
 * honesta — se o desktop um dia precisar liberar alguma, o canon vai exigir
 * um caminho V4.1 explícito, não um flag oportuno).
 */
export function buildVoxContextSnapshot(
  input: VoxContextSnapshotInput = {},
): VoxContextSnapshot {
  const limit = input.textLimit ?? VOX_CONTEXT_TEXT_LIMIT

  const workspace: VoxContextWorkspace = {
    root: clean(input.workspace?.root),
    name: clean(input.workspace?.name),
  }

  const activeView: VoxContextActiveView = {
    kind: normalizeActiveViewKind(input.activeView?.kind ?? null),
    label: clean(input.activeView?.label),
  }

  const selectionTruncation = truncateContextText(input.selectionText ?? null, limit)
  const selection: VoxContextSelection =
    selectionTruncation.text === null
      ? { kind: 'none', text: null, truncated: false }
      : {
          kind: 'text',
          text: selectionTruncation.text,
          truncated: selectionTruncation.truncated,
        }

  const thread: VoxContextThread = {
    id: clean(input.thread?.id),
    title: clean(input.thread?.title),
  }

  const obra: VoxContextObra = {
    id: clean(input.obra?.id),
    title: clean(input.obra?.title),
  }

  const terminalCwd = clean(input.terminal?.cwd)
  const terminalExcerpt = truncateContextText(
    input.terminal?.lastOutputExcerpt ?? null,
    limit,
  )
  const terminalAvailable = Boolean(input.terminal?.available)
  const terminal: VoxContextTerminal = {
    cwd: terminalCwd,
    last_output_excerpt: terminalExcerpt.text,
    available: terminalAvailable,
  }

  return {
    schema: VOX_CONTEXT_SNAPSHOT_SCHEMA,
    surface: VOX_CONTEXT_SURFACE,
    workspace,
    active_view: activeView,
    selection,
    thread,
    obra,
    terminal,
    privacy: {
      raw_audio_included: false,
      full_screen_capture: false,
      clipboard_read: false,
    },
  }
}

/**
 * `true` quando o snapshot não traz nenhuma informação operacional útil.
 * Usado pelo wire para evitar enviar payload vazio quando o Desktop não
 * sabe nada — o Kernel cai no caminho `kind: "none"` de context_refs.
 */
export function isVoxContextSnapshotEmpty(snap: VoxContextSnapshot): boolean {
  return (
    snap.workspace.root === null
    && snap.workspace.name === null
    && snap.active_view.kind === 'unknown'
    && snap.active_view.label === null
    && snap.selection.kind === 'none'
    && snap.thread.id === null
    && snap.thread.title === null
    && snap.obra.id === null
    && snap.obra.title === null
    && snap.terminal.cwd === null
    && snap.terminal.last_output_excerpt === null
    && snap.terminal.available === false
  )
}
