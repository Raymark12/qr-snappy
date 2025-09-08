import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { env } from '@/lib/env'
import crypto from 'crypto'

export const runtime = 'nodejs'

/**
 * GET /api/events/:eventId/access
 * Returns { allowed: boolean } based on httpOnly cookie
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const cookieName = `event_access_${eventId}`.toLowerCase()
    const cookieValue = request.cookies.get(cookieName)?.value
    if (!cookieValue) {
      return NextResponse.json({ allowed: false })
    }

    const parts = cookieValue.split('.')
    if (parts.length !== 3) {
      return NextResponse.json({ allowed: false })
    }

    const [cookieEventId, expStr, sig] = parts
    const exp = Number(expStr)
    if (!cookieEventId || !exp || cookieEventId !== eventId) {
      return NextResponse.json({ allowed: false })
    }

    // Check expiry
    const nowSec = Math.floor(Date.now() / 1000)
    if (nowSec > exp) {
      return NextResponse.json({ allowed: false })
    }

    // Verify signature
    const payload = `${cookieEventId}.${exp}`
    const secret = process.env.APP_SECRET || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')
    if (sig !== expected) {
      return NextResponse.json({ allowed: false })
    }

    return NextResponse.json({ allowed: true })
  } catch {
    return NextResponse.json({ allowed: false })
  }
}


