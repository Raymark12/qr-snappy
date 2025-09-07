import { NextRequest, NextResponse } from 'next/server'
import { createRouteSupabaseClient } from '@/lib/supabase/route'
import { requireAdmin } from '@/lib/utils/auth-helpers'
import { removeEventAssignment } from '@/lib/db/event-assignments'
import { z } from 'zod'

const unassignEventSchema = z.object({
  eventId: z.string().uuid(),
})

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function validateUserId(userId: string): boolean {
  return UUID_REGEX.test(userId)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params

    // Validate userId format
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
    const validationResult = unassignEventSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { eventId } = validationResult.data
    const success = await removeEventAssignment(eventId, userId)

    if (!success) {
      return NextResponse.json({ error: 'Failed to unassign event from user' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Unassign event error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

