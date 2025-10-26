import { env } from '@/lib/env'
import { STORAGE } from '@/lib/constants'
import { getR2SignedUrl, uploadFileToR2, deleteFileFromR2, generateR2Key } from './r2-storage'
import QRCode from 'qrcode'
import sharp from 'sharp'

export const runtime = 'nodejs'

// ----------------- CONFIG -----------------
const DEFAULT_QR_WIDTH = 1400
const MIN_QR_WIDTH = 400
const MAX_QR_WIDTH = 2048

const LOGO_MAX_PCT = 0.32
const LOGO_MAX_PCT_AGGRESSIVE = 0.4

const RASTER_BASE_PAD_FACTOR = 0.02
const RASTER_BASE_PAD_FACTOR_AGGRESSIVE = 0.03

const SVG_BLUR_FACTOR = 0.01
const SVG_BLUR_FACTOR_AGGRESSIVE = 0.016

export function getQrStoragePath(eventId: string) {
  const bucketName = env.R2_BUCKET_NAME || STORAGE.BUCKET_NAME
  return `${bucketName}/qr/${eventId}/event-qr.png`
}

function coerceQrWidth(raw?: string | null): number {
  const parsed = raw ? parseInt(raw, 10) : NaN
  const value = Number.isFinite(parsed) ? parsed : DEFAULT_QR_WIDTH
  return Math.max(MIN_QR_WIDTH, Math.min(MAX_QR_WIDTH, value))
}

function coerceLogoPct(raw: string | null, aggressive: boolean): number {
  const parsed = raw ? parseFloat(raw) : NaN
  const maxPct = aggressive ? LOGO_MAX_PCT_AGGRESSIVE : LOGO_MAX_PCT
  if (Number.isFinite(parsed)) {
    return Math.max(0.1, Math.min(maxPct, parsed))
  }
  return aggressive ? Math.min(0.38, maxPct) : maxPct
}

/**
 * Generate base QR as PNG buffer.
 */
async function generateBaseQrPng(url: string, width: number): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    type: 'png',
    errorCorrectionLevel: 'H',
    margin: 3,
    width,
  })
}

async function compositeSvgLogoOnQr(opts: {
  qr: Buffer
  logo: Buffer
  qrWidth: number
  target: number
  aggressive: boolean
}) {
  const { qr, logo, qrWidth, target, aggressive } = opts

  const sigma = Math.max(1, Math.round(qrWidth * (aggressive ? SVG_BLUR_FACTOR_AGGRESSIVE : SVG_BLUR_FACTOR)))
  const bw = await sharp(logo).removeAlpha().toColourspace('b-w').toBuffer()
  const inv = await sharp(bw).negate().toBuffer()
  const keyedMask = await sharp(inv).threshold(16).blur(sigma).toBuffer()
  const maskMeta = await sharp(keyedMask).metadata()

  const whiteRGB = await sharp({
    create: {
      width: maskMeta.width || target,
      height: maskMeta.height || target,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  }).toBuffer()

  const whiteWithAlpha = await sharp(whiteRGB).joinChannel(keyedMask).png().toBuffer()

  return sharp(qr)
    .composite([{ input: whiteWithAlpha, gravity: 'centre' }])
    .composite([{ input: logo, gravity: 'centre' }])
    .png({ quality: 100 })
    .toBuffer()
}

async function compositeRasterLogoOnQr(opts: {
  qr: Buffer
  logo: Buffer
  qrWidth: number
  target: number
  aggressive: boolean
}) {
  const { qr, logo, qrWidth, target, aggressive } = opts
  const meta = await sharp(logo).metadata()
  const pad = Math.max(
    8,
    Math.round(qrWidth * (aggressive ? RASTER_BASE_PAD_FACTOR_AGGRESSIVE : RASTER_BASE_PAD_FACTOR)),
  )
  const padded = await sharp({
    create: {
      width: (meta.width || target) + pad * 2,
      height: (meta.height || target) + pad * 2,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: logo, left: pad, top: pad }])
    .png()
    .toBuffer()

  return sharp(qr)
    .composite([{ input: padded, gravity: 'centre' }])
    .png({ quality: 100 })
    .toBuffer()
}

async function buildQrWithOptionalLogo(opts: {
  url: string
  logoFile: File | null
  logoSizeRaw: string | null
  qrWidthRaw: string | null
  aggressive: boolean
}): Promise<Buffer> {
  const { url, logoFile, logoSizeRaw, qrWidthRaw, aggressive } = opts
  const qrWidth = coerceQrWidth(qrWidthRaw)
  const baseQr = await generateBaseQrPng(url, qrWidth)

  if (!logoFile) return baseQr

  try {
    const logoBuf = Buffer.from(await logoFile.arrayBuffer())
    const logoPct = coerceLogoPct(logoSizeRaw, aggressive)
    const target = Math.round(qrWidth * logoPct)

    const logoResized = await sharp(logoBuf)
      .resize({ width: target, height: target, fit: 'inside', withoutEnlargement: true })
      .png({ quality: 90 })
      .toBuffer()

    const isSvg =
      (logoFile.type && logoFile.type.includes('svg')) || (logoFile.name && logoFile.name.toLowerCase().endsWith('.svg'))

    if (isSvg) {
      return compositeSvgLogoOnQr({
        qr: baseQr,
        logo: logoResized,
        qrWidth,
        target,
        aggressive,
      })
    }

    return compositeRasterLogoOnQr({
      qr: baseQr,
      logo: logoResized,
      qrWidth,
      target,
      aggressive,
    })
  } catch {
    return baseQr
  }
}

/**
 * Generate and upload QR code for an event with custom options
 */
export async function generateEventQRCustom(eventId: string, options: {
  logoFile?: File | null
  logoSizeRaw?: string | null
  qrWidthRaw?: string | null
  aggressive?: boolean
} = {}): Promise<{ success: boolean; url?: string; path?: string; error?: string }> {
  try {
    const baseUrl = env.NEXT_PUBLIC_APP_URL
    const encodedUrl = `${baseUrl}/e/${eventId}`

    const finalPng = await buildQrWithOptionalLogo({
      url: encodedUrl,
      logoFile: options.logoFile || null,
      logoSizeRaw: options.logoSizeRaw || null,
      qrWidthRaw: options.qrWidthRaw || null,
      aggressive: options.aggressive || false,
    })

    const storagePath = getQrStoragePath(eventId)
    const r2Key = generateR2Key(storagePath)

    console.log('QR generation - eventId:', eventId, 'storagePath:', storagePath, 'r2Key:', r2Key)

    // Remove old QR if exists
    await deleteFileFromR2(r2Key)

    // Convert Buffer to Blob for upload
    const qrBlob = new Blob([new Uint8Array(finalPng)], { type: 'image/png' })

    console.log('QR generation - uploading QR blob, size:', qrBlob.size)

    // Upload new QR
    const uploadResult = await uploadFileToR2(r2Key, qrBlob, {
      contentType: 'image/png',
    })

    console.log('QR generation - upload result:', uploadResult)

    if (!uploadResult.success) {
      return { success: false, error: uploadResult.error || 'Failed to upload QR' }
    }

    const signedResult = await getR2SignedUrl(r2Key, STORAGE.SIGNED_URL_EXPIRY)

    console.log('QR generation - signed URL result:', signedResult)

    if (!signedResult.success || !signedResult.url) {
      return { success: false, error: 'Failed to sign QR URL' }
    }

    return { success: true, url: signedResult.url, path: storagePath }
  } catch (err) {
    console.error('QR generation failed', err)
    return { success: false, error: 'Internal server error' }
  }
}

/**
 * Generate and upload QR code for an event (simple version without logo)
 */
export async function generateEventQR(eventId: string): Promise<{ success: boolean; url?: string; path?: string; error?: string }> {
  return generateEventQRCustom(eventId, {})
}
