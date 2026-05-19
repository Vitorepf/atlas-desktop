import type { AttachmentDraft } from './types'

export interface AtlasRichInputDraftSummary {
  images: number
  pdfs: number
  text: number
  urls: number
  total: number
}

export function estimateRichInputTokens(text: string, drafts: readonly AttachmentDraft[] = []): number {
  let tokens = text.trim() === '' ? 0 : Math.max(1, Math.round(text.length / 4))

  for (const draft of drafts) {
    if (draft.status === 'error') continue
    switch (draft.kind) {
      case 'image':
        tokens += 1200
        break
      case 'pdf':
        tokens += draft.extractedText
          ? Math.max(1, Math.round(draft.extractedText.length / 4))
          : Math.max(600, draft.pageCount * 700)
        break
      case 'text':
      case 'code':
        tokens += Math.max(1, Math.round(draft.content.length / 4))
        break
      case 'url':
        tokens += 100
        break
    }
  }

  return tokens
}

export function summarizeRichInputDrafts(drafts: readonly AttachmentDraft[]): AtlasRichInputDraftSummary {
  const summary: AtlasRichInputDraftSummary = {
    images: 0,
    pdfs: 0,
    text: 0,
    urls: 0,
    total: 0,
  }

  for (const draft of drafts) {
    if (draft.status === 'error') continue
    summary.total += 1
    if (draft.kind === 'image') summary.images += 1
    else if (draft.kind === 'pdf') summary.pdfs += 1
    else if (draft.kind === 'url') summary.urls += 1
    else summary.text += 1
  }

  return summary
}
