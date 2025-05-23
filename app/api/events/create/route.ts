import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { hashPassword } from '@/lib/utils/password-server'
import { z } from 'zod'
import type { Database } from '@/types/database'

// Request validation schema
const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  description: z.string().max(500, 'Description too long').optional(),
  password: z.string().min(4, 'Password must be at least 4 characters'),
})

/**
 * POST /api/events/create
 * Create a new event with hashed password
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request body
    const validationResult = createEventSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { title, description, password } = validationResult.data

    // Get authenticated user
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single<{ role: 'admin' | 'user' }>()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can create events' },
        { status: 403 }
      )
    }

    // Hash the password using bcrypt
    const hashedPassword = await hashPassword(password)

    // Create the event with explicit type assertion
    type EventInsert = Database['public']['Tables']['events']['Insert']
    type EventRow = Database['public']['Tables']['events']['Row']

    const eventData: EventInsert = {
      title,
      description: description || null,
      password: hashedPassword,
      admin_id: user.id,
      is_active: true,
    }

    const { data, error: insertError } = await supabase
      .from('events')
      // @ts-expect-error - Type assertion needed due to RLS policies affecting insert types
      .insert(eventData)
      .select()
      .returns<EventRow[]>()

    if (insertError || !data || data.length === 0) {
      console.error('Event creation error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create event' },
        { status: 500 }
      )
    }

    const event = data[0]

    return NextResponse.json({
      success: true,
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        is_active: event.is_active,
        created_at: event.created_at,
      },
    })
  } catch (error) {
    console.error('Event creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

