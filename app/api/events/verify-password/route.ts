import { NextRequest, NextResponse } from 'next/server'
import { createRouteSupabaseClient } from '@/lib/supabase/route'
import { verifyPassword } from '@/lib/utils/password-server'
import { verifyPasswordSchema } from '@/lib/validations'

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

    return NextResponse.json({
      success: true,
      eventId: eventData.id,
    })
  } catch (error) {
    console.error('Password verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

