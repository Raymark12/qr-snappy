import { NextRequest, NextResponse } from 'next/server'
import { STORAGE } from '@/lib/constants'
import { env } from '@/lib/env'
import { getR2SignedUrl, generateR2Key } from '@/lib/utils/r2-storage'
import crypto from 'crypto'

export const runtime = 'nodejs'

/**
 * POST /api/public/events/:eventId/signed-url
 * Generate signed URL for a file path (photo or background)
 * Requires valid access cookie for the event
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const body = await request.json()
    const { filePath } = body

    if (!filePath || typeof filePath !== 'string') {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
    }

    // Check access cookie
    const cookieName = `event_access_${eventId}`.toLowerCase()
    const cookieValue = request.cookies.get(cookieName)?.value
    if (!cookieValue) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const parts = cookieValue.split('.')
    if (parts.length !== 3) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const [cookieEventId, expStr, sig] = parts
    const exp = Number(expStr)
    if (!cookieEventId || !exp || cookieEventId !== eventId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const nowSec = Math.floor(Date.now() / 1000)
    if (nowSec > exp) {
      return NextResponse.json({ error: 'Access expired' }, { status: 403 })
    }

    // Verify signature
    const payload = `${cookieEventId}.${exp}`
    const secret = process.env.APP_SECRET || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')
    if (sig !== expected) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Generate signed URL using R2
    let pathInBucket = filePath

    const r2BucketName = env.R2_BUCKET_NAME
    if (r2BucketName && filePath.startsWith(`${r2BucketName}/`)) {
      pathInBucket = filePath.replace(`${r2BucketName}/`, '')
    } else if (filePath.startsWith(`${STORAGE.BUCKET_NAME}/`)) {
      pathInBucket = filePath.replace(`${STORAGE.BUCKET_NAME}/`, '')
    }

    const r2Key = generateR2Key(pathInBucket)
    const result = await getR2SignedUrl(r2Key, STORAGE.SIGNED_URL_EXPIRY)

    if (!result.success || !result.url) {
      console.error('Failed to create signed URL:', result.error, 'for path:', pathInBucket)
      return NextResponse.json({ error: 'Failed to create signed URL' }, { status: 500 })
    }

    return NextResponse.json({ url: result.url })
  } catch (err) {
    console.error('Signed URL error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

