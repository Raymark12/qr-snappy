import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createRouteSupabaseClient } from '@/lib/supabase/route'
import { requireAdmin } from '@/lib/utils/auth-helpers'
import { z } from 'zod'
import { eventIdParamSchema } from '@/lib/validations'

export const runtime = 'nodejs'

const toggleActiveSchema = z.object({
  isActive: z.boolean(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    const eventIdValidation = eventIdParamSchema.safeParse({ eventId })
    if (!eventIdValidation.success) {
      return NextResponse.json(
        { error: 'Invalid event ID format', details: eventIdValidation.error.errors },
        { status: 400 }
      )
    }

    const supabase = createRouteSupabaseClient(req)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const authResult = await requireAdmin(supabase as any)
    if ('error' in authResult) {
      return authResult.error
    }

    const body = await req.json()
    const validation = toggleActiveSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { isActive } = validation.data

    // Update event
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('events')
      .update({ is_active: isActive })
      .eq('id', eventId)

    if (updateError) {
      console.error('Error updating event:', updateError)
      return NextResponse.json(
        { error: `Failed to update event: ${updateError.message}` },
        { status: 500 }
      )
    }

    // Revalidate the events page
    revalidatePath('/events')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Toggle event active error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

