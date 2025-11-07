import { NextRequest, NextResponse } from 'next/server'
import { createRouteSupabaseClient } from '@/lib/supabase/route'
import { requireEventModerator } from '@/lib/utils/auth-helpers'
import { STORAGE } from '@/lib/constants'
import { getR2SignedUrl, generateR2Key } from '@/lib/utils/r2-storage'
import { generateEventQRCustom, getQrStoragePath } from '@/lib/utils/qr-generator'

export const runtime = 'nodejs'


export async function GET(_req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const storagePath = getQrStoragePath(eventId)
    const r2Key = generateR2Key(storagePath)

    console.log('QR GET - eventId:', eventId, 'storagePath:', storagePath, 'r2Key:', r2Key)

    const result = await getR2SignedUrl(r2Key, STORAGE.SIGNED_URL_EXPIRY)

    console.log('QR GET - signed URL result:', result)

    if (!result.success || !result.url) {
      console.error('QR GET - Failed to generate signed URL:', result.error)
      return NextResponse.json({ exists: false })
    }

    return NextResponse.json({ exists: true, url: result.url, path: storagePath })
  } catch (error) {
    console.error('QR GET - Error:', error)
    return NextResponse.json({ exists: false })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const supabase = createRouteSupabaseClient(req)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const authResult = await requireEventModerator(supabase as any, eventId)
    if ('error' in authResult) return authResult.error

    const formData = await req.formData().catch(() => null)
    const logo = (formData?.get('logo') as File) || null
    const logoSizeRaw = (formData?.get('logoSize') as string) || null
    const qrWidthRaw = (formData?.get('qrWidth') as string) || null
    const aggressive = ((formData?.get('aggressive') as string) || '') === 'true'

    const qrResult = await generateEventQRCustom(eventId, {
      logoFile: logo,
      logoSizeRaw: logoSizeRaw,
      qrWidthRaw: qrWidthRaw,
      aggressive: aggressive,
    })

    if (!qrResult.success) {
      return NextResponse.json({ error: qrResult.error || 'Failed to generate QR' }, { status: 500 })
    }

    return NextResponse.json({ success: true, url: qrResult.url, path: qrResult.path })
  } catch (err) {
    console.error('QR generation failed', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
