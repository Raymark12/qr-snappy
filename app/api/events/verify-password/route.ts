import { NextRequest, NextResponse } from 'next/server'
import { createRouteSupabaseClient } from '@/lib/supabase/route'
import { verifyPassword } from '@/lib/utils/password-server'
import { verifyPasswordSchema } from '@/lib/validations'
import { env } from '@/lib/env'
import crypto from 'crypto'
import { PASSWORD_CACHE } from '@/lib/constants'

export const runtime = 'nodejs'

/**
 * POST /api/events/verify-password
 * Verify if a password matches an event's stored password
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validationResult = verifyPasswordSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { eventId, password } = validationResult.data

    // Get event from database
    const supabase = createRouteSupabaseClient(request)
    const { data: eventData, error: fetchError } = await supabase
      .from('events')
      .select('id, password, is_active')
      .eq('id', eventId)
      .single<{
        id: string
        password: string
        is_active: boolean
      }>()

    if (fetchError || !eventData) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (!eventData.is_active) {
      return NextResponse.json({ error: 'Event is not active' }, { status: 403 })
    }

    const isPasswordValid = await verifyPassword(password, eventData.password)

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    // Set httpOnly signed cookie to remember access for this event
    const expiresHours = PASSWORD_CACHE.EXPIRY_HOURS
    const exp = Math.floor(Date.now() / 1000) + expiresHours * 60 * 60
    const payload = `${eventData.id}.${exp}`
    const secret = process.env.APP_SECRET || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex')
    const value = `${payload}.${signature}`

    const response = NextResponse.json({ success: true, eventId: eventData.id })

    // Clear cookies before setting the new one
    const cookieName = `event_access_${eventData.id}`.toLowerCase()
    response.cookies.set(cookieName, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    })

    // Set the new access cookie
    response.cookies.set(cookieName, value, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
      path: '/',
      maxAge: expiresHours * 60 * 60,
    })

    return response
  } catch (error) {
    console.error('Password verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

