/**
 * Atlas AI · PDF processor (client-side via pdfjs-dist).
 *
 * - Conta páginas
 * - Extrai texto (limitado a MAX_TEXT_PREVIEW_CHARS pra não estourar memória)
 * - Renderiza primeira página como thumbnail
 *
 * Vantagem sobre mobile: mobile sobe o PDF cru sem preview e sem texto.
 * Desktop dá ao usuário:
 *   1. Preview visual da primeira página (capa)
 *   2. Confirmação do que vai ser enviado (page count + size)
 *   3. Texto extraído já junto no payload — providers como Claude/OpenAI
 *      respondem com 10x melhor qualidade quando o texto vem pré-extraído
 *      (em vez de tentarem OCR numa imagem do PDF)
 */
import { ATTACHMENT_LIMITS } from './types'

// pdfjs-dist precisa de worker. Como rodamos no Tauri WebView (estilo
// CSP rígido), usamos o bundle 'legacy' que roda inline e configuramos o
// workerSrc dinamicamente.

let pdfJsLib: typeof import('pdfjs-dist') | null = null

async function loadPdfJs(): Promise<typeof import('pdfjs-dist')> {
  if (pdfJsLib) return pdfJsLib
  const mod = await import('pdfjs-dist')
  // Importa o worker como URL via Vite (?url query)
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  mod.GlobalWorkerOptions.workerSrc = workerUrl
  pdfJsLib = mod
  return mod
}

export interface ProcessedPdf {
  pageCount: number
  extractedText: string
  textLength: number
  thumbnailDataUrl: string | null
}

export async function processPdf(file: File): Promise<ProcessedPdf> {
  const lib = await loadPdfJs()
  const arrayBuffer = await file.arrayBuffer()
  const loadingTask = lib.getDocument({
    data: new Uint8Array(arrayBuffer),
    isEvalSupported: false,
    disableFontFace: false,
  })

  const pdf = await loadingTask.promise
  const pageCount = pdf.numPages

  // Extração de texto — itera todas as páginas até atingir o teto.
  const textChunks: string[] = []
  let charBudget = ATTACHMENT_LIMITS.maxTextPreviewChars
  for (let i = 1; i <= pageCount && charBudget > 0; i++) {
    try {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const pageText = content.items
        .map((it) => (typeof (it as { str?: unknown }).str === 'string' ? (it as { str: string }).str : ''))
        .join(' ')
      const slice = pageText.slice(0, charBudget)
      if (slice) {
        textChunks.push(`[p.${i}] ${slice}`)
        charBudget -= slice.length
      }
      page.cleanup()
    } catch {
      /* página corrompida — segue a vida */
    }
  }
  const extractedText = textChunks.join('\n\n').trim()

  // Thumbnail — primeira página renderizada em ~360px de largura.
  let thumbnailDataUrl: string | null = null
  try {
    const page = await pdf.getPage(1)
    const viewport0 = page.getViewport({ scale: 1 })
    const targetW = 360
    const scale = targetW / viewport0.width
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#15212a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      await page.render({ canvasContext: ctx, viewport, intent: 'display' }).promise
      thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.82)
    }
    page.cleanup()
  } catch {
    thumbnailDataUrl = null
  }

  await pdf.destroy()
  return {
    pageCount,
    extractedText,
    textLength: extractedText.length,
    thumbnailDataUrl,
  }
}
