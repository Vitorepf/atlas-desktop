/**
 * Atlas AI · MessageBody renderer.
 *
 * Renderiza conteúdo da mensagem como Markdown leve (parágrafos, listas,
 * code blocks com Shiki, blockquote, links, inline code). Code blocks têm
 * botão "copiar" inline. Texto plain quando shiki ainda não carregou.
 */
import { useCallback, useMemo, useState } from 'react'
import { parseMarkdown, renderInline } from '../markdown'
import { useShikiHighlighter } from '../useShikiHighlighter'

interface AtlasAiMessageBodyProps {
  content: string
}

export function AtlasAiMessageBody({ content }: AtlasAiMessageBodyProps) {
  const blocks = useMemo(() => parseMarkdown(content), [content])
  const { highlight } = useShikiHighlighter()

  return (
    <div className="atlas-ai-md">
      {blocks.map((b, idx) => {
        const key = `b-${idx}`
        if (b.kind === 'paragraph') {
          return (
            <p key={key} className="atlas-ai-md-p">
              {renderInline(b.text, key)}
            </p>
          )
        }
        if (b.kind === 'heading') {
          const text = renderInline(b.text, key)
          if (b.level === 1) return <h3 key={key} className="atlas-ai-md-h1">{text}</h3>
          if (b.level === 2) return <h4 key={key} className="atlas-ai-md-h2">{text}</h4>
          return <h5 key={key} className="atlas-ai-md-h3">{text}</h5>
        }
        if (b.kind === 'list') {
          const items = b.items.map((it, i) => (
            <li key={`${key}-li-${i}`}>{renderInline(it, `${key}-li-${i}`)}</li>
          ))
          return b.ordered ? (
            <ol key={key} className="atlas-ai-md-ol">{items}</ol>
          ) : (
            <ul key={key} className="atlas-ai-md-ul">{items}</ul>
          )
        }
        if (b.kind === 'quote') {
          return (
            <blockquote key={key} className="atlas-ai-md-quote">
              {renderInline(b.text, key)}
            </blockquote>
          )
        }
        if (b.kind === 'rule') {
          return (
            <div key={key} className="atlas-ai-md-rule-editorial" aria-hidden="true">
              <span className="atlas-ai-md-rule-line" />
              <span className="atlas-ai-md-rule-mark">✦</span>
              <span className="atlas-ai-md-rule-line" />
            </div>
          )
        }
        if (b.kind === 'table') {
          return (
            <div key={key} className="atlas-ai-md-table-wrap">
              <table className="atlas-ai-md-table">
                <thead>
                  <tr>
                    {b.headers.map((h, i) => (
                      <th key={`th-${i}`} style={{ textAlign: b.aligns[i] ?? 'left' }}>
                        {renderInline(h, `${key}-th-${i}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.rows.map((row, r) => (
                    <tr key={`tr-${r}`}>
                      {row.map((cell, c) => (
                        <td key={`td-${r}-${c}`} style={{ textAlign: b.aligns[c] ?? 'left' }}>
                          {renderInline(cell, `${key}-td-${r}-${c}`)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
        if (b.kind === 'code') {
          return (
            <CodeBlock
              key={key}
              source={b.source}
              lang={b.lang}
              highlight={highlight}
            />
          )
        }
        return null
      })}
    </div>
  )
}

interface CodeBlockProps {
  source: string
  lang: string | null
  highlight: (code: string, lang: string | null) => string | null
}

function CodeBlock({ source, lang, highlight }: CodeBlockProps) {
  const html = highlight(source, lang)
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(source)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      /* silently ignore — read-only clipboard sandbox */
    }
  }, [source])

  return (
    <div className="atlas-ai-md-codeblock">
      <header className="atlas-ai-md-codeblock-header">
        <span className="atlas-ai-md-codeblock-lang">{lang ?? 'texto'}</span>
        <button
          type="button"
          className={`atlas-ai-md-codeblock-copy${copied ? ' is-copied' : ''}`}
          onClick={handleCopy}
          aria-label={copied ? 'Copiado' : 'Copiar bloco de código'}
          title={copied ? 'Copiado' : 'Copiar'}
        >
          {copied ? (
            <svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="2.6 7.2 5.6 10.2 11.4 4.2" />
            </svg>
          ) : (
            <svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="4.6" y="3.4" width="7.4" height="8.6" rx="1.2" />
              <path d="M9.2 3.4 V2.6 a1.2 1.2 0 0 0 -1.2 -1.2 H3.2 a1.2 1.2 0 0 0 -1.2 1.2 V9.2" />
            </svg>
          )}
        </button>
      </header>
      {html ? (
        // eslint-disable-next-line react/no-danger
        <div className="atlas-ai-md-codeblock-body" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre className="atlas-ai-md-codeblock-fallback">
          <code>{source}</code>
        </pre>
      )}
    </div>
  )
}
