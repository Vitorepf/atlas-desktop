/**
 * Atlas AI · markdown mini-parser.
 *
 * Tradutor simples e suficiente para mensagens conversacionais. NÃO é
 * CommonMark completo — atende:
 *   - parágrafos
 *   - headings ATX (#, ##, ###)
 *   - listas (-, *, +) e listas ordenadas (1. 2.)
 *   - blockquotes (>)
 *   - code fences (``` opcionalmente com linguagem)
 *   - inline code (`...`)
 *   - bold (**...** ou __...__)
 *   - italic (*...* ou _..._)
 *   - links [texto](url)
 *
 * Nada de tabelas, footnotes, HTML embarcado — Atlas AI conversa em
 * texto técnico, não documento. Isso é DE PROPÓSITO: o parser fica
 * leve, rápido e sem superfície de bug.
 */

export type MarkdownBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'quote'; text: string }
  | { kind: 'code'; lang: string | null; source: string }
  | { kind: 'rule' }
  | { kind: 'table'; headers: string[]; rows: string[][]; aligns: Array<'left' | 'center' | 'right'> }

export function parseMarkdown(input: string): MarkdownBlock[] {
  const lines = input.replace(/\r\n?/g, '\n').split('\n')
  const blocks: MarkdownBlock[] = []
  let i = 0

  while (i < lines.length) {
    const raw = lines[i] ?? ''
    const line = raw.trim()

    if (line === '') {
      i++
      continue
    }

    // Code fence: ``` or ```lang
    const fenceMatch = /^```(\w[\w+.-]*)?\s*$/.exec(raw)
    if (fenceMatch) {
      const lang = fenceMatch[1] ?? null
      const sourceLines: string[] = []
      i++
      while (i < lines.length && !/^```\s*$/.test(lines[i] ?? '')) {
        sourceLines.push(lines[i] ?? '')
        i++
      }
      if (i < lines.length) i++ // consume closing fence
      blocks.push({ kind: 'code', lang, source: sourceLines.join('\n') })
      continue
    }

    // Horizontal rule
    if (/^(---|\*\*\*|___)\s*$/.test(line)) {
      blocks.push({ kind: 'rule' })
      i++
      continue
    }

    // Table (pipe-delimited GitHub-flavored markdown)
    //
    //   | col1 | col2 | col3 |
    //   |------|:----:|-----:|
    //   | a    | b    | c    |
    //
    // Detecta pelo header row + linha separadora com hifens/dois-pontos.
    const tableHeaderMatch = line.match(/^\|(.+)\|\s*$/)
    if (tableHeaderMatch && i + 1 < lines.length) {
      const sepRaw = (lines[i + 1] ?? '').trim()
      const sepMatch = sepRaw.match(/^\|(.+)\|\s*$/)
      if (sepMatch && /^\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*$/.test(sepMatch[1]!)) {
        const headers = tableHeaderMatch[1]!.split('|').map((s) => s.trim())
        const aligns: Array<'left' | 'center' | 'right'> = sepMatch[1]!.split('|').map((cell) => {
          const c = cell.trim()
          const left = c.startsWith(':')
          const right = c.endsWith(':')
          if (left && right) return 'center'
          if (right) return 'right'
          return 'left'
        })
        const rows: string[][] = []
        i += 2
        while (i < lines.length) {
          const row = (lines[i] ?? '').trim()
          const rowMatch = row.match(/^\|(.+)\|\s*$/)
          if (!rowMatch) break
          rows.push(rowMatch[1]!.split('|').map((s) => s.trim()))
          i++
        }
        blocks.push({ kind: 'table', headers, rows, aligns })
        continue
      }
    }

    // Heading ATX
    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(line)
    if (headingMatch) {
      const level = headingMatch[1]!.length as 1 | 2 | 3 | 4 | 5 | 6
      blocks.push({ kind: 'heading', level, text: headingMatch[2]!.trim() })
      i++
      continue
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const quoted: string[] = []
      while (i < lines.length && (lines[i] ?? '').trimStart().startsWith('> ')) {
        quoted.push((lines[i] ?? '').replace(/^\s*>\s?/, ''))
        i++
      }
      blocks.push({ kind: 'quote', text: quoted.join('\n') })
      continue
    }

    // Lists
    const bulletMatch = /^[-*+]\s+(.+)$/.exec(line)
    const orderedMatch = /^\d+\.\s+(.+)$/.exec(line)
    if (bulletMatch || orderedMatch) {
      const ordered = !!orderedMatch
      const items: string[] = []
      while (i < lines.length) {
        const cur = lines[i] ?? ''
        const curTrim = cur.trim()
        const bm = /^[-*+]\s+(.+)$/.exec(curTrim)
        const om = /^\d+\.\s+(.+)$/.exec(curTrim)
        if (ordered && om) {
          items.push(om[1]!)
          i++
          continue
        }
        if (!ordered && bm) {
          items.push(bm[1]!)
          i++
          continue
        }
        // continuation line indented under previous item
        if (curTrim !== '' && /^\s{2,}/.test(cur) && items.length > 0) {
          items[items.length - 1] = `${items[items.length - 1]} ${curTrim}`
          i++
          continue
        }
        break
      }
      blocks.push({ kind: 'list', ordered, items })
      continue
    }

    // Paragraph — collect until empty/structural break
    const para: string[] = [line]
    i++
    while (i < lines.length) {
      const nxt = lines[i] ?? ''
      const nxtTrim = nxt.trim()
      if (nxtTrim === '') break
      if (/^```/.test(nxtTrim)) break
      if (/^(#{1,6})\s+/.test(nxtTrim)) break
      if (/^[-*+]\s+/.test(nxtTrim)) break
      if (/^\d+\.\s+/.test(nxtTrim)) break
      if (nxtTrim.startsWith('> ')) break
      para.push(nxtTrim)
      i++
    }
    blocks.push({ kind: 'paragraph', text: para.join(' ') })
  }

  return blocks
}

/**
 * Render inline tokens to React children. Returns an array of string|JSX nodes.
 * Tokens handled in this order to avoid double-wrap:
 *   1. inline code `...`
 *   2. links [text](url)
 *   3. bold **...** / __...__
 *   4. italic *...* / _..._
 *
 * Escaping: para HTML escape simples, contamos com React text node default
 * (não usa dangerouslySetInnerHTML).
 */
import type { ReactNode } from 'react'

export function renderInline(text: string, keyPrefix = 'i'): ReactNode[] {
  const out: ReactNode[] = []
  let remaining = text
  let counter = 0

  const tokenRegex =
    /(`[^`\n]+`)|(\[[^\]]+\]\([^)\s]+\))|(\*\*[^*\n]+\*\*)|(__[^_\n]+__)|(\*[^*\n]+\*)|(_[^_\n]+_)/

  while (remaining.length > 0) {
    const match = tokenRegex.exec(remaining)
    if (!match) {
      out.push(remaining)
      break
    }
    const idx = match.index
    if (idx > 0) {
      out.push(remaining.slice(0, idx))
    }
    const tok = match[0]
    const key = `${keyPrefix}-${counter++}`

    if (tok.startsWith('`')) {
      out.push(<code key={key} className="atlas-ai-md-code">{tok.slice(1, -1)}</code>)
    } else if (tok.startsWith('[')) {
      const linkMatch = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(tok)
      if (linkMatch) {
        out.push(
          <a key={key} className="atlas-ai-md-link" href={linkMatch[2]} target="_blank" rel="noreferrer">
            {linkMatch[1]}
          </a>,
        )
      } else {
        out.push(tok)
      }
    } else if (tok.startsWith('**') || tok.startsWith('__')) {
      out.push(<strong key={key} className="atlas-ai-md-strong">{tok.slice(2, -2)}</strong>)
    } else if (tok.startsWith('*') || tok.startsWith('_')) {
      out.push(<em key={key} className="atlas-ai-md-em">{tok.slice(1, -1)}</em>)
    } else {
      out.push(tok)
    }

    remaining = remaining.slice(idx + tok.length)
  }

  return out
}
