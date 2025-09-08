// app/api/events/[eventId]/qr/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createRouteSupabaseClient } from '@/lib/supabase/route'
import { createSupabaseAdmin } from '@/lib/supabase/client'
import { requireEventModerator } from '@/lib/utils/auth-helpers'
import { STORAGE } from '@/lib/constants'
import QRCode from 'qrcode'
import sharp from 'sharp'

export const runtime = 'nodejs'

// ----------------- CONFIG -----------------
const DEFAULT_QR_WIDTH = 1400
const MIN_QR_WIDTH = 400
const MAX_QR_WIDTH = 2048

// non-aggressive: safer, leaves more modules visible
const LOGO_MAX_PCT = 0.32
// aggressive: tries to occupy more of the center, but still leaves mask
const LOGO_MAX_PCT_AGGRESSIVE = 0.4

// padding for raster logos (non-SVG)
const RASTER_BASE_PAD_FACTOR = 0.02
const RASTER_BASE_PAD_FACTOR_AGGRESSIVE = 0.03

// how blurry the SVG mask border is
const SVG_BLUR_FACTOR = 0.01
const SVG_BLUR_FACTOR_AGGRESSIVE = 0.016

// ----------------- HELPERS -----------------
function getQrStoragePath(eventId: string) {
  // we store all event QR codes under Photos/qr/{eventId}/event-qr.png
  return `${STORAGE.BUCKET_NAME}/qr/${eventId}/event-qr.png`
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
  // default if user didn’t pass
  return aggressive ? Math.min(0.38, maxPct) : maxPct
}

/**
 * Generate base QR as PNG buffer.
 * We use 'H' EC level to tolerate a big center logo.
 */
async function generateBaseQrPng(url: string, width: number): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    type: 'png',
    errorCorrectionLevel: 'H',
    margin: 3,
    width,
  })
}

/**
 * For SVG logos we build a “white underlay” using a mask derived from the logo.
 * That lets the QR background stay consistent and modules around the logo stay readable.
 */
async function compositeSvgLogoOnQr(opts: {
  qr: Buffer
  logo: Buffer
  qrWidth: number
  target: number
  aggressive: boolean
}) {
  const { qr, logo, qrWidth, target, aggressive } = opts

  // turn logo into 1-channel mask -> invert -> blur -> alpha
  const sigma = Math.max(1, Math.round(qrWidth * (aggressive ? SVG_BLUR_FACTOR_AGGRESSIVE : SVG_BLUR_FACTOR)))
  const bw = await sharp(logo).removeAlpha().toColourspace('b-w').toBuffer()
  const inv = await sharp(bw).negate().toBuffer()
  const keyedMask = await sharp(inv).threshold(16).blur(sigma).toBuffer()
  const maskMeta = await sharp(keyedMask).metadata()

  // build white rectangle with the alpha from the mask
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
    // first lay the “white plate”
    .composite([{ input: whiteWithAlpha, gravity: 'centre' }])
    // then actual logo
    .composite([{ input: logo, gravity: 'centre' }])
    .png({ quality: 100 })
    .toBuffer()
}

/**
 * For raster logos we make a white box slightly bigger than the logo
 * and drop it in the center. Superb for PNG/JPEG logos.
 */
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

/**
 * Main generation helper.
 */
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

    // resize logo to target, keep aspect
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
    // if logo processing fails, fallback to pure QR
    return baseQr
  }
}

// ----------------- ROUTES -----------------

// GET: try to return existing signed QR url
export async function GET(_req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const admin = createSupabaseAdmin()
    const storagePath = getQrStoragePath(eventId)
    const pathInBucket = storagePath.replace(`${STORAGE.BUCKET_NAME}/`, '')

    const { data: signed } = await admin.storage
      .from(STORAGE.BUCKET_NAME)
      .createSignedUrl(pathInBucket, STORAGE.SIGNED_URL_EXPIRY)

    if (!signed) return NextResponse.json({ exists: false })

    return NextResponse.json({ exists: true, url: signed.signedUrl, path: storagePath })
  } catch {
    return NextResponse.json({ exists: false })
  }
}

// POST: generate, upload, and return signed url
export async function POST(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const supabase = createRouteSupabaseClient(req)
    const admin = createSupabaseAdmin()

    // auth: must be event moderator
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const authResult = await requireEventModerator(supabase as any, eventId)
    if ('error' in authResult) return authResult.error

    const formData = await req.formData().catch(() => null)
    const logo = (formData?.get('logo') as File) || null
    const logoSizeRaw = (formData?.get('logoSize') as string) || null
    const qrWidthRaw = (formData?.get('qrWidth') as string) || null
    const aggressive = ((formData?.get('aggressive') as string) || '') === 'true'

    const origin = req.nextUrl?.origin || ''
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || origin
    const encodedUrl = `${baseUrl}/e/${eventId}`

    const finalPng = await buildQrWithOptionalLogo({
      url: encodedUrl,
      logoFile: logo,
      logoSizeRaw,
      qrWidthRaw,
      aggressive,
    })

    const storagePath = getQrStoragePath(eventId)
    const pathInBucket = storagePath.replace(`${STORAGE.BUCKET_NAME}/`, '')

    // remove old one, ignore errors
    await admin.storage.from(STORAGE.BUCKET_NAME).remove([pathInBucket])

    const { error: uploadErr } = await admin.storage
      .from(STORAGE.BUCKET_NAME)
      .upload(pathInBucket, finalPng, {
        contentType: 'image/png',
        upsert: true,
      })

    if (uploadErr) {
      return NextResponse.json({ error: uploadErr.message || 'Failed to upload QR' }, { status: 500 })
    }

    const { data: signed } = await admin.storage
      .from(STORAGE.BUCKET_NAME)
      .createSignedUrl(pathInBucket, STORAGE.SIGNED_URL_EXPIRY)

    if (!signed) {
      return NextResponse.json({ error: 'Failed to sign QR URL' }, { status: 500 })
    }

    return NextResponse.json({ success: true, url: signed.signedUrl, path: storagePath })
  } catch (err) {
    console.error('QR generation failed', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
