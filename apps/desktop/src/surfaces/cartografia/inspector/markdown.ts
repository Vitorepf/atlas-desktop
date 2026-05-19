/**
 * Minimal markdown renderer for the cartography inspector.
 *
 * Espelho 1:1 do parseMarkdown() em public/atlas-truth-cartography.html.
 * Cobre h1/h2/h3, p, ul/li, blockquote, **bold**, *italic*, `code`,
 * [[wiki links]] (renderizados como span pra navegação futura).
 */

function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function inline(s: string): string {
  return s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[\[([^\]]+)\]\]/g, '<span class="wiki">$1</span>')
}

export function parseMarkdown(md: string): string {
  const lines = md.split('\n')
  const html: string[] = []
  let inList = false
  let inQuote = false
  const flushList = () => {
    if (inList) {
      html.push('</ul>')
      inList = false
    }
  }
  const flushQuote = () => {
    if (inQuote) {
      html.push('</blockquote>')
      inQuote = false
    }
  }
  for (const raw of lines) {
    const line = escape(raw)
    if (line.match(/^# /)) {
      flushList()
      flushQuote()
      html.push('<h1>' + inline(line.slice(2)) + '</h1>')
    } else if (line.match(/^## /)) {
      flushList()
      flushQuote()
      html.push('<h2>' + inline(line.slice(3)) + '</h2>')
    } else if (line.match(/^### /)) {
      flushList()
      flushQuote()
      html.push('<h3>' + inline(line.slice(4)) + '</h3>')
    } else if (line.match(/^- /)) {
      flushQuote()
      if (!inList) {
        html.push('<ul>')
        inList = true
      }
      html.push('<li>' + inline(line.slice(2)) + '</li>')
    } else if (line.match(/^&gt; /)) {
      flushList()
      if (!inQuote) {
        html.push('<blockquote>')
        inQuote = true
      }
      html.push(inline(line.slice(4)) + '<br>')
    } else if (line.trim() === '') {
      flushList()
      flushQuote()
    } else {
      flushList()
      flushQuote()
      html.push('<p>' + inline(line) + '</p>')
    }
  }
  flushList()
  flushQuote()
  return html.join('\n')
}
