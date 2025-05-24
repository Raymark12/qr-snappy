import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { verifyPassword } from '@/lib/utils/password-server'
import { z } from 'zod'

// Request validation schema
const verifyPasswordSchema = z.object({
  eventId: z.string().uuid('Invalid event ID'),
  password: z.string().min(1, 'Password is required'),
})

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
    const supabase = await createServerSupabaseClient()
    const { data: event, error } = await supabase
      .from('events')
      .select('id, password, is_active')
      .eq('id', eventId)
      .single<{
        id: string
        password: string
        is_active: boolean
      }>()

    if (error || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (!event.is_active) {
      return NextResponse.json({ error: 'Event is not active' }, { status: 403 })
    }

    const isValid = await verifyPassword(password, event.password)

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      eventId: event.id,
    })
  } catch (error) {
    console.error('Password verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

