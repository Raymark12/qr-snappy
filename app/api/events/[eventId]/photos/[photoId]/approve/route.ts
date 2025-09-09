import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createRouteSupabaseClient } from '@/lib/supabase/route'
import { requireEventModerator } from '@/lib/utils/auth-helpers'
import { updatePhotoStatus, getPhotoById } from '@/lib/db/event-photos'
import { photoIdParamSchema } from '@/lib/validations'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ eventId: string; photoId: string }> }
) {
  try {
    const { eventId, photoId } = await params

    const validationResult = photoIdParamSchema.safeParse({ eventId, photoId })
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const supabase = createRouteSupabaseClient(req)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const authResult = await requireEventModerator(supabase as any, eventId)

    if ('error' in authResult) {
      return authResult.error
    }

    const { user } = authResult

    // Verify photo exists and belongs to the event
    const photo = await getPhotoById(photoId)
    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    if (photo.event_id !== eventId) {
      return NextResponse.json({ error: 'Photo does not belong to this event' }, { status: 400 })
    }

    const updateResult = await updatePhotoStatus(photoId, 'approved', user.id)

    if (!updateResult.success) {
      return NextResponse.json(
        { error: updateResult.error || 'Failed to approve photo' },
        { status: 500 }
      )
    }

    revalidatePath(`/events/${eventId}/photos`)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Approve photo error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

