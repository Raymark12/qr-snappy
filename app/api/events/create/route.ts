import { NextRequest, NextResponse } from 'next/server'
import { createRouteSupabaseClient } from '@/lib/supabase/route'
import { hashPassword } from '@/lib/utils/password-server'
import { requireAdmin } from '@/lib/utils/auth-helpers'
import { createEventSchema } from '@/lib/validations'
import { generateEventQR } from '@/lib/utils/qr-generator'
import type { Database } from '@/types/database'

/**
 * POST /api/events/create
 * Create a new event with hashed password
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validationResult = createEventSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { title, description, password, autoApprove } = validationResult.data

    // Require admin authentication
    const supabase = createRouteSupabaseClient(request)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase client type complexity with RLS policies
    const authResult = await requireAdmin(supabase as any)

    if ('error' in authResult) {
      return authResult.error
    }

    const { user } = authResult

    const hashedPassword = await hashPassword(password)

    // Create the event with explicit type assertion
    type EventInsert = Database['public']['Tables']['events']['Insert']
    type EventRow = Database['public']['Tables']['events']['Row']

    const insertData = {
      title,
      description: description || null,
      password: hashedPassword,
      admin_id: user.id,
      is_active: true,
      auto_approve: autoApprove || false,
    } as EventInsert

    const { data: eventData, error: insertError } = await supabase
      .from('events')
      // @ts-expect-error - Supabase generated types may have RLS policy affecting types
      .insert(insertData)
      .select()
      .returns<EventRow[]>()

    if (insertError || !eventData || eventData.length === 0) {
      console.error('Event creation error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create event' },
        { status: 500 }
      )
    }

    const createdEvent = eventData[0]

    // Generate QR code for the new event
    const qrResult = await generateEventQR(createdEvent.id)
    if (!qrResult.success) {
      console.error('Failed to generate QR code for event:', createdEvent.id, qrResult.error)
      // Don't fail the event creation if QR generation fails
    }

    return NextResponse.json({
      success: true,
      event: {
        id: createdEvent.id,
        title: createdEvent.title,
        description: createdEvent.description,
        is_active: createdEvent.is_active,
        created_at: createdEvent.created_at,
      },
      qr: qrResult.success ? {
        url: qrResult.url,
        path: qrResult.path,
      } : null,
    })
  } catch (error) {
    console.error('Event creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

