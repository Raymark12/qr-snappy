import { NextRequest, NextResponse } from 'next/server'
import { createRouteSupabaseClient } from '@/lib/supabase/route'
import { requireAdmin } from '@/lib/utils/auth-helpers'
import { hashPassword } from '@/lib/utils/password-server'
import { z } from 'zod'
import { createSuccessResponse, createValidationErrorResponse, createNotFoundErrorResponse, createInternalServerErrorResponse } from '@/lib/utils/api-client'

const updateEventSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
  auto_approve: z.boolean().optional(),
  password: z.string().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const supabase = createRouteSupabaseClient(req)

    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (error) {
      console.error('Error fetching event:', error)
      return NextResponse.json(createNotFoundErrorResponse('Event'), { status: 404 })
    }

    return NextResponse.json(createSuccessResponse(event))
  } catch (err) {
    console.error('GET event error:', err)
    return NextResponse.json(createInternalServerErrorResponse(), { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const supabase = createRouteSupabaseClient(req)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const authResult = await requireAdmin(supabase as any)

    if ('error' in authResult) {
      return authResult.error
    }

    const body = await req.json()
    const validationResult = updateEventSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        createValidationErrorResponse(validationResult.error.errors),
        { status: 400 }
      )
    }

    const updateData = { ...validationResult.data }

    if (updateData.password) {
      updateData.password = await hashPassword(updateData.password)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: event, error } = await (supabase as any)
      .from('events')
      .update(updateData)
      .eq('id', eventId)
      .select()
      .single()

    if (error) {
      console.error('Error updating event:', error)
      return NextResponse.json(createInternalServerErrorResponse(), { status: 500 })
    }

    return NextResponse.json(createSuccessResponse(event))
  } catch (err) {
    console.error('PUT event error:', err)
    return NextResponse.json(createInternalServerErrorResponse(), { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const supabase = createRouteSupabaseClient(req)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const authResult = await requireAdmin(supabase as any)

    if ('error' in authResult) {
      return authResult.error
    }

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)

    if (error) {
      console.error('Error deleting event:', error)
      return NextResponse.json(createInternalServerErrorResponse(), { status: 500 })
    }

    return NextResponse.json(createSuccessResponse({ message: 'Event deleted successfully' }))
  } catch (err) {
    console.error('DELETE event error:', err)
    return NextResponse.json(createInternalServerErrorResponse(), { status: 500 })
  }
}