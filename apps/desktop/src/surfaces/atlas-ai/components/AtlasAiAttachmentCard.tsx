/**
 * Atlas AI · attachment card.
 *
 * Tile compacto e clicável que aparece acima do textarea no composer.
 * 5 variantes (image | pdf | text | code | url), todos com:
 *   - thumbnail/ícone à esquerda
 *   - nome + meta (size, dimensões, page count, duração)
 *   - status badge (processando / pronto / enviando / erro)
 *   - botão remove (×)
 *
 * Click no card abre overlay com preview ampliado (imagem cheia, PDF
 * thumbnail maior, código rendered, URL com thumbnail).
 */
import { useState } from 'react'
import type { AttachmentDraft } from '../attachments/types'

interface AtlasAiAttachmentCardProps {
  draft: AttachmentDraft
  onRemove: (id: string) => void
}

function formatSize(bytes: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDuration(sec: number | null): string {
  if (!sec) return ''
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function statusLabel(d: AttachmentDraft): string {
  if (d.status === 'processing') return 'processando…'
  if (d.status === 'uploading') return `enviando ${Math.round(d.progress * 100)}%`
  if (d.status === 'error') return d.error ?? 'erro'
  if (d.status === 'uploaded') return 'enviado ✓'
  return ''
}

export function AtlasAiAttachmentCard({ draft, onRemove }: AtlasAiAttachmentCardProps) {
  const [preview, setPreview] = useState(false)
  const isError = draft.status === 'error'
  const isBusy = draft.status === 'processing' || draft.status === 'uploading'

  return (
    <>
      <div
        className={`atlas-ai-att-card kind-${draft.kind}${isError ? ' is-error' : ''}${isBusy ? ' is-busy' : ''}`}
        role="group"
        aria-label={`Anexo ${draft.fileName}`}
      >
        <button
          type="button"
          className="atlas-ai-att-thumb"
          onClick={() => setPreview(true)}
          aria-label={`Ver prévia de ${draft.fileName}`}
        >
          {draft.kind === 'image' ? (
            draft.previewDataUrl ? (
              <img src={draft.previewDataUrl} alt="" />
            ) : (
              <div className="atlas-ai-att-icon">🖼</div>
            )
          ) : draft.kind === 'pdf' ? (
            draft.thumbnailDataUrl ? (
              <img src={draft.thumbnailDataUrl} alt="" />
            ) : (
              <div className="atlas-ai-att-icon">PDF</div>
            )
          ) : draft.kind === 'url' && draft.thumbnailUrl ? (
            <img src={draft.thumbnailUrl} alt="" />
          ) : draft.kind === 'url' ? (
            <div className="atlas-ai-att-icon">
              {draft.urlKind === 'youtube' ? '▶' : draft.urlKind === 'github' ? '◇' : '↗'}
            </div>
          ) : draft.kind === 'code' ? (
            <div className="atlas-ai-att-icon">‹/›</div>
          ) : (
            <div className="atlas-ai-att-icon">¶</div>
          )}
          {isBusy ? (
            <span
              className="atlas-ai-att-progress"
              style={{ ['--p' as never]: `${Math.round((draft.progress ?? 0) * 100)}%` }}
              aria-hidden="true"
            />
          ) : null}
        </button>

        <div className="atlas-ai-att-info">
          <span className="atlas-ai-att-name" title={draft.fileName}>
            {draft.kind === 'url'
              ? draft.title ?? draft.url
              : draft.fileName}
          </span>
          <span className="atlas-ai-att-meta">
            {draft.kind === 'image' && draft.width
              ? `${draft.width}×${draft.height} · ${formatSize(draft.size)}`
              : draft.kind === 'pdf'
                ? `${draft.pageCount} pág · ${formatSize(draft.size)}`
                : draft.kind === 'url'
                  ? [
                      draft.urlKind === 'youtube'
                        ? 'YouTube'
                        : draft.urlKind === 'vimeo'
                          ? 'Vimeo'
                          : draft.urlKind === 'github'
                            ? 'GitHub'
                            : 'web',
                      draft.author,
                      formatDuration(draft.durationSec),
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  : draft.kind === 'code'
                    ? `${draft.language} · ${formatSize(draft.size)}`
                    : draft.kind === 'text'
                      ? `${draft.language ?? 'texto'} · ${formatSize(draft.size)}`
                      : `${formatSize(draft.size)}`}
          </span>
          {statusLabel(draft) ? (
            <span className={`atlas-ai-att-status${isError ? ' is-error' : ''}`}>
              {statusLabel(draft)}
            </span>
          ) : null}
        </div>

        <button
          type="button"
          className="atlas-ai-att-remove"
          onClick={() => onRemove(draft.id)}
          aria-label={`Remover ${draft.fileName}`}
          disabled={draft.status === 'uploading'}
        >
          ×
        </button>
      </div>

      {preview ? (
        <div
          className="atlas-ai-att-preview-backdrop"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPreview(false)
          }}
        >
          <div className="atlas-ai-att-preview-sheet">
            <header>
              <span>{draft.kind === 'url' ? draft.title ?? draft.url : draft.fileName}</span>
              <button type="button" onClick={() => setPreview(false)} aria-label="Fechar">
                ✕
              </button>
            </header>
            <div className="atlas-ai-att-preview-body">
              {draft.kind === 'image' ? (
                <img src={draft.previewDataUrl} alt={draft.fileName} />
              ) : draft.kind === 'pdf' && draft.thumbnailDataUrl ? (
                <>
                  <img src={draft.thumbnailDataUrl} alt={draft.fileName} />
                  {draft.extractedText ? (
                    <pre className="atlas-ai-att-preview-text">{draft.extractedText.slice(0, 4000)}</pre>
                  ) : null}
                </>
              ) : draft.kind === 'url' && draft.thumbnailUrl ? (
                <>
                  <img src={draft.thumbnailUrl} alt={draft.title ?? draft.url} />
                  <a href={draft.url} target="_blank" rel="noreferrer" className="atlas-ai-att-preview-link">
                    {draft.url} ↗
                  </a>
                </>
              ) : draft.kind === 'code' || draft.kind === 'text' ? (
                <pre className="atlas-ai-att-preview-text">{draft.content.slice(0, 8000)}</pre>
              ) : (
                <p>sem preview</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
