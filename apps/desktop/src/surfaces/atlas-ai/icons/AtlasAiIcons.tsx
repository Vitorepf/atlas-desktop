/**
 * Atlas AI · canonical icon set para sinais de IA.
 *
 * Toda categoria de sinal (thinking, reading, writing, executing, search,
 * mcp, git, etc.) tem um ícone canônico inline SVG. Sem dependência externa,
 * stroke=currentColor para herdar tom contextual (gold = ativo, ink-mute =
 * concluído, red = erro).
 *
 * Tamanho default 14px (compatível com inline text + footer pill).
 * Use prop `size` para ajustar; mantém viewBox para escalar nítido.
 *
 * Design DNA:
 *   - stroke-width 1.6 (mesma família dos chevrons do composer)
 *   - linecap/linejoin round
 *   - traço minimal-luxe, baixo ruído visual (TDAH-friendly)
 */
import type { ReactNode } from 'react'
import type { AiToolKind } from '../types'

interface IconBase {
  size?: number
  className?: string
  title?: string
}

function Svg({
  size = 14,
  title,
  className,
  children,
}: IconBase & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  )
}

/* ============ Pensamento / processamento ============ */

/** Diamante ✦ Atlas — pulsa quando IA está pensando. */
export function IconAtlasDiamond({ size = 14, className, title }: IconBase) {
  return (
    <Svg size={size} className={className} title={title}>
      <path d="M8 1.6 L13.8 8 L8 14.4 L2.2 8 Z" />
      <path d="M8 4.4 L11.2 8 L8 11.6 L4.8 8 Z" opacity="0.55" />
    </Svg>
  )
}

/** Spinner abstrato — círculo com gap, gira via CSS. */
export function IconSpinner({ size = 14, className, title }: IconBase) {
  return (
    <Svg size={size} className={className} title={title}>
      <path d="M8 1.6 a6.4 6.4 0 1 1 -6.4 6.4" />
    </Svg>
  )
}

/* ============ Leitura / busca ============ */

/** Pasta — leitura de arquivos / ls / glob. */
export function IconFolder({ size = 14, className, title }: IconBase) {
  return (
    <Svg size={size} className={className} title={title}>
      <path d="M1.6 4.4 a1.2 1.2 0 0 1 1.2 -1.2 h3.2 l1.6 1.6 h6.8 a1.2 1.2 0 0 1 1.2 1.2 v6.4 a1.2 1.2 0 0 1 -1.2 1.2 h-11.6 a1.2 1.2 0 0 1 -1.2 -1.2 z" />
    </Svg>
  )
}

/** Lupa — search / grep / find. */
export function IconSearch({ size = 14, className, title }: IconBase) {
  return (
    <Svg size={size} className={className} title={title}>
      <circle cx="7.2" cy="7.2" r="4.4" />
      <line x1="10.4" y1="10.4" x2="13.6" y2="13.6" />
    </Svg>
  )
}

/** Página/documento — Read um arquivo específico. */
export function IconDocument({ size = 14, className, title }: IconBase) {
  return (
    <Svg size={size} className={className} title={title}>
      <path d="M3.6 1.6 h6.4 l3.6 3.6 v8.4 a0.8 0.8 0 0 1 -0.8 0.8 h-9.2 a0.8 0.8 0 0 1 -0.8 -0.8 v-11.2 a0.8 0.8 0 0 1 0.8 -0.8 z" />
      <path d="M10 1.6 v3.6 h3.6" />
    </Svg>
  )
}

/* ============ Escrita / edição ============ */

/** Lápis — Edit / patch. */
export function IconPencil({ size = 14, className, title }: IconBase) {
  return (
    <Svg size={size} className={className} title={title}>
      <path d="M11.6 2 a1.6 1.6 0 0 1 2.4 2.4 l-9.6 9.6 h-2.4 v-2.4 z" />
      <line x1="10" y1="3.6" x2="12.4" y2="6" />
    </Svg>
  )
}

/** Mais — Write (criar novo arquivo). */
export function IconPlusFile({ size = 14, className, title }: IconBase) {
  return (
    <Svg size={size} className={className} title={title}>
      <path d="M3.6 1.6 h6.4 l3.6 3.6 v8.4 a0.8 0.8 0 0 1 -0.8 0.8 h-9.2 a0.8 0.8 0 0 1 -0.8 -0.8 v-11.2 a0.8 0.8 0 0 1 0.8 -0.8 z" />
      <line x1="8" y1="8.4" x2="8" y2="11.6" />
      <line x1="6.4" y1="10" x2="9.6" y2="10" />
    </Svg>
  )
}

/* ============ Execução / shell ============ */

/** Play triangulo — Executing comando. */
export function IconPlay({ size = 14, className, title }: IconBase) {
  return (
    <Svg size={size} className={className} title={title}>
      <path d="M4 2.4 L13.2 8 L4 13.6 Z" />
    </Svg>
  )
}

/** Terminal/chevron-prompt — Bash. */
export function IconTerminal({ size = 14, className, title }: IconBase) {
  return (
    <Svg size={size} className={className} title={title}>
      <rect x="1.6" y="2.4" width="12.8" height="11.2" rx="1.2" />
      <polyline points="4 6 6.4 8 4 10" />
      <line x1="8" y1="10.4" x2="12" y2="10.4" />
    </Svg>
  )
}

/* ============ Rede / MCP / external ============ */

/** Plug — MCP server connection. */
export function IconPlug({ size = 14, className, title }: IconBase) {
  return (
    <Svg size={size} className={className} title={title}>
      <path d="M5.6 3.6 v3.2 m4.8 -3.2 v3.2 m-6 0 h7.2 v2.4 a3.6 3.6 0 0 1 -3.6 3.6 a3.6 3.6 0 0 1 -3.6 -3.6 z" />
      <line x1="8" y1="12.4" x2="8" y2="14.4" />
    </Svg>
  )
}

/** Globe — Web fetch / search externa. */
export function IconGlobe({ size = 14, className, title }: IconBase) {
  return (
    <Svg size={size} className={className} title={title}>
      <circle cx="8" cy="8" r="6.4" />
      <line x1="1.6" y1="8" x2="14.4" y2="8" />
      <path d="M8 1.6 a8.8 6.4 0 0 1 0 12.8 a8.8 6.4 0 0 1 0 -12.8 z" />
    </Svg>
  )
}

/** Git branch — operação git. */
export function IconGit({ size = 14, className, title }: IconBase) {
  return (
    <Svg size={size} className={className} title={title}>
      <circle cx="4" cy="3.2" r="1.6" />
      <circle cx="4" cy="12.8" r="1.6" />
      <circle cx="12" cy="6.4" r="1.6" />
      <line x1="4" y1="4.8" x2="4" y2="11.2" />
      <path d="M5.6 3.2 h2.8 a2 2 0 0 1 2 2 v1.2" />
    </Svg>
  )
}

/* ============ Agentes / tasks ============ */

/** Esquadrão — agent dispatch / sub-agentes. */
export function IconSquad({ size = 14, className, title }: IconBase) {
  return (
    <Svg size={size} className={className} title={title}>
      <circle cx="8" cy="5.2" r="2.4" />
      <circle cx="3.6" cy="7.6" r="1.6" />
      <circle cx="12.4" cy="7.6" r="1.6" />
      <path d="M3.2 13.6 a3.2 3.2 0 0 1 3.2 -2.4 h3.2 a3.2 3.2 0 0 1 3.2 2.4" />
    </Svg>
  )
}

/** Checklist — TODO / plan. */
export function IconChecklist({ size = 14, className, title }: IconBase) {
  return (
    <Svg size={size} className={className} title={title}>
      <rect x="1.6" y="2.4" width="12.8" height="11.2" rx="1.2" />
      <polyline points="4.4 6 5.6 7.2 7.2 5.2" />
      <line x1="9.2" y1="6" x2="12.4" y2="6" />
      <polyline points="4.4 10.4 5.6 11.6 7.2 9.6" />
      <line x1="9.2" y1="10.4" x2="12.4" y2="10.4" />
    </Svg>
  )
}

/* ============ Estado / quality ============ */

/** Check — operação concluída. */
export function IconCheck({ size = 14, className, title }: IconBase) {
  return (
    <Svg size={size} className={className} title={title}>
      <polyline points="2.8 8.4 6.4 12 13.2 4.4" />
    </Svg>
  )
}

/** Alerta — erro/warning. */
export function IconAlert({ size = 14, className, title }: IconBase) {
  return (
    <Svg size={size} className={className} title={title}>
      <path d="M8 1.6 L14.4 13.6 H1.6 Z" />
      <line x1="8" y1="6.4" x2="8" y2="9.6" />
      <circle cx="8" cy="11.6" r="0.4" fill="currentColor" stroke="none" />
    </Svg>
  )
}

/** Pause — bloqueado/awaiting. */
export function IconPause({ size = 14, className, title }: IconBase) {
  return (
    <Svg size={size} className={className} title={title}>
      <rect x="4" y="2.4" width="2.4" height="11.2" rx="0.4" />
      <rect x="9.6" y="2.4" width="2.4" height="11.2" rx="0.4" />
    </Svg>
  )
}

/** Question-mark — IA pediu confirmação. */
export function IconQuestion({ size = 14, className, title }: IconBase) {
  return (
    <Svg size={size} className={className} title={title}>
      <circle cx="8" cy="8" r="6.4" />
      <path d="M6 6.4 a2 2 0 1 1 2.8 1.6 c-0.4 0.4 -0.8 0.8 -0.8 1.6" />
      <circle cx="8" cy="11.6" r="0.4" fill="currentColor" stroke="none" />
    </Svg>
  )
}

/* ============ Router · escolha do kind correto ============ */

/**
 * Resolve um ícone para um AiToolKind (vindo do backend) com fallback
 * cascateado. Use em listas dinâmicas de tool events.
 */
export function IconForToolKind({
  kind,
  size,
  className,
  title,
}: IconBase & { kind: AiToolKind | string | null | undefined }) {
  const normalized = (kind ?? 'unknown').toLowerCase()
  switch (normalized) {
    case 'read':
      return <IconDocument size={size} className={className} title={title} />
    case 'list':
    case 'glob':
      return <IconFolder size={size} className={className} title={title} />
    case 'search':
    case 'grep':
      return <IconSearch size={size} className={className} title={title} />
    case 'write':
      return <IconPlusFile size={size} className={className} title={title} />
    case 'edit':
      return <IconPencil size={size} className={className} title={title} />
    case 'bash':
      return <IconTerminal size={size} className={className} title={title} />
    case 'execute':
      return <IconPlay size={size} className={className} title={title} />
    case 'mcp':
      return <IconPlug size={size} className={className} title={title} />
    case 'web_fetch':
    case 'web_search':
      return <IconGlobe size={size} className={className} title={title} />
    case 'git':
      return <IconGit size={size} className={className} title={title} />
    case 'agent_dispatch':
      return <IconSquad size={size} className={className} title={title} />
    case 'todo':
    case 'plan':
      return <IconChecklist size={size} className={className} title={title} />
    default:
      return <IconPlay size={size} className={className} title={title} />
  }
}

/**
 * Plural label canônico para uma kind ("X arquivos" / "Y comandos").
 * Usado nos summaries inline tipo "Explorou 5 arquivos, executou 6 comandos".
 */
// eslint-disable-next-line react-refresh/only-export-components
export function pluralLabelForKind(kind: AiToolKind | string, count: number): string {
  const n = count
  const plural = (singular: string, pluralForm?: string) =>
    `${n} ${n === 1 ? singular : (pluralForm ?? singular + 's')}`
  switch (kind) {
    case 'read':
      return plural('arquivo lido', 'arquivos lidos')
    case 'list':
    case 'glob':
      return plural('listagem', 'listagens')
    case 'search':
    case 'grep':
      return plural('pesquisa')
    case 'write':
      return plural('arquivo criado', 'arquivos criados')
    case 'edit':
      return plural('edição', 'edições')
    case 'bash':
    case 'execute':
      return plural('comando')
    case 'mcp':
      return plural('chamada MCP', 'chamadas MCP')
    case 'web_fetch':
      return plural('fetch externo', 'fetches externos')
    case 'web_search':
      return plural('busca web')
    case 'git':
      return plural('operação git', 'operações git')
    case 'agent_dispatch':
      return plural('subagente acionado', 'subagentes acionados')
    case 'todo':
      return plural('item TODO', 'itens TODO')
    case 'plan':
      return plural('item de plano', 'itens de plano')
    default:
      return plural('operação', 'operações')
  }
}
