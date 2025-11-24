import { NextRequest, NextResponse } from 'next/server'
import { createRouteSupabaseClient } from '@/lib/supabase/route'
import { requireAdmin } from '@/lib/utils/auth-helpers'
import { assignEventToUser } from '@/lib/db/event-assignments'
import { validateUserId } from '@/lib/utils/validation'
import { z } from 'zod'

const assignEventSchema = z.object({
  eventId: z.string().uuid(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params

    if (!validateUserId(userId)) {
      return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 })
    }

    const supabase = createRouteSupabaseClient(req)

    // Require admin access
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const authResult = await requireAdmin(supabase as any)

    if ('error' in authResult) {
      return authResult.error
    }

    const body = await req.json()
    const validationResult = assignEventSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { eventId } = validationResult.data
    const result = await assignEventToUser(eventId, userId)

    if (!result.success) {
      // If it's a duplicate assignment error, return 409 Conflict
      if (result.error?.includes('already assigned')) {
        return NextResponse.json({ error: result.error }, { status: 409 })
      }
      return NextResponse.json({ error: result.error || 'Failed to assign event to user' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Assign event error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

