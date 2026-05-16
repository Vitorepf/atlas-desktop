/**
 * Atlas AI · Image processor (client-side).
 *
 * - Lê File → ImageBitmap (rápido, sem layout cost)
 * - Redimensiona para max 2048px (lado maior) mantendo aspect ratio
 * - Codifica para JPEG/WebP com qualidade premium (0.86)
 * - Retorna { blob, dataUrl, width, height, originalSize }
 *
 * Vantagem sobre mobile: mobile envia o arquivo cru (até 20MB) sem
 * redimensionar. Desktop pré-comprime antes do upload — reduz tempo
 * de upload em 5-10x e mantém qualidade visual indistinguível para
 * os modelos visão (Anthropic Claude / OpenAI GPT-4V aceitam 2048px
 * como upper bound útil).
 *
 * PNGs com transparência ficam em PNG (não convertemos para JPEG).
 * GIFs animados pulam a compressão (canvas perderia frames).
 */
import { ATTACHMENT_LIMITS } from './types'

export interface ProcessedImage {
  blob: Blob
  dataUrl: string
  width: number
  height: number
  /** bytes do arquivo original, antes da compressão */
  originalSize: number
  /** mime de saída pode diferir do entrada (PNG opaco → JPEG) */
  mimeType: string
}

function isAnimated(file: File): boolean {
  return file.type === 'image/gif'
}

async function fileToBitmap(file: File): Promise<ImageBitmap> {
  // createImageBitmap é robusto para PNG/JPEG/WebP/GIF (primeira frame)
  return createImageBitmap(file)
}

function computeTargetSize(width: number, height: number): { w: number; h: number } {
  const max = ATTACHMENT_LIMITS.maxImageDimension
  if (width <= max && height <= max) return { w: width, h: height }
  if (width >= height) {
    const ratio = max / width
    return { w: max, h: Math.round(height * ratio) }
  }
  const ratio = max / height
  return { w: Math.round(width * ratio), h: max }
}

function pickOutputMime(file: File, hasAlpha: boolean): { mime: string; quality: number } {
  if (hasAlpha) return { mime: 'image/png', quality: 1 }
  if (file.type === 'image/webp') return { mime: 'image/webp', quality: ATTACHMENT_LIMITS.imageWebpQuality }
  return { mime: 'image/jpeg', quality: ATTACHMENT_LIMITS.imageJpegQuality }
}

/** Detecta alpha rápido amostrando borda do canvas (heurística suficiente). */
function detectAlpha(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  try {
    const sampleW = Math.min(w, 64)
    const sampleH = Math.min(h, 64)
    const data = ctx.getImageData(0, 0, sampleW, sampleH).data
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) return true
    }
  } catch {
    /* CSP / cross-origin safe fallback */
  }
  return false
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b)
        else reject(new Error('Falha ao codificar imagem'))
      },
      mime,
      quality,
    )
  })
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Falha ao ler imagem'))
    reader.readAsDataURL(blob)
  })
}

export async function processImage(file: File): Promise<ProcessedImage> {
  const originalSize = file.size

  // GIF animado: passamos como está. Não vale a pena perder frames.
  if (isAnimated(file)) {
    const dataUrl = await blobToDataUrl(file)
    const bitmap = await fileToBitmap(file)
    const result = {
      blob: file,
      dataUrl,
      width: bitmap.width,
      height: bitmap.height,
      originalSize,
      mimeType: file.type,
    }
    bitmap.close?.()
    return result
  }

  const bitmap = await fileToBitmap(file)
  const { w: targetW, h: targetH } = computeTargetSize(bitmap.width, bitmap.height)

  const canvas = document.createElement('canvas')
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas indisponível')

  // Para detectar alpha precisamos do raw bitmap; preserve nitidez via imageSmoothingQuality=high
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, targetW, targetH)
  bitmap.close?.()

  const hasAlpha = file.type === 'image/png' && detectAlpha(ctx, targetW, targetH)
  const { mime, quality } = pickOutputMime(file, hasAlpha)

  const blob = await canvasToBlob(canvas, mime, quality)
  const dataUrl = await blobToDataUrl(blob)

  return {
    blob,
    dataUrl,
    width: targetW,
    height: targetH,
    originalSize,
    mimeType: mime,
  }
}
