import { NextRequest, NextResponse } from 'next/server'
import { createRouteSupabaseClient } from '@/lib/supabase/route'
import { requireAuth } from '@/lib/utils/auth-helpers'
import { isVideoFileName } from '@/lib/utils/file-validation'
import { z } from 'zod'

const completeUploadSchema = z.object({
  filePath: z.string(),
  fileName: z.string(),
  author: z.string().nullable().optional(),
  comment: z.string().nullable().optional(),
  userEmail: z.string().nullable().optional(),
  fileSize: z.number().optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const supabase = createRouteSupabaseClient(req)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const authResult = await requireAuth(supabase as any)

    if ('error' in authResult) {
      return authResult.error
    }

    const user = authResult.user

    const body = await req.json()
    const validationResult = completeUploadSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { filePath, fileName, author, comment, userEmail, fileSize } = validationResult.data

    if (userEmail && userEmail !== user.email) {
      return NextResponse.json(
        { error: 'User email mismatch' },
        { status: 403 }
      )
    }

    // Check if event exists and is active
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: event, error: eventError } = await (supabase as any)
      .from('events')
      .select('id, is_active, auto_approve')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (!event.is_active) {
      return NextResponse.json({ error: 'Event is not active' }, { status: 403 })
    }

    const mediaType = isVideoFileName(fileName) ? 'video' : 'image'

    // Save media record to database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: media, error: mediaError } = await (supabase as any)
      .from('media')
      .insert({
        event_id: eventId,
        file_path: filePath,
        file_name: fileName,
        media_type: mediaType,
        file_size: fileSize || null,
        author: author || null,
        comment: comment || null,
        status: event.auto_approve ? 'approved' : 'pending',
        user_email: user.email,
      })
      .select()
      .single()

    if (mediaError) {
      console.error('Error saving media:', mediaError)
      return NextResponse.json({ error: 'Failed to save media' }, { status: 500 })
    }

    // Defer heavy deps (sharp/ffmpeg); static import breaks many serverless runtimes (e.g. Vercel).
    void import('@/lib/jobs/media-processor')
      .then(({ queueMediaProcessing }) =>
        queueMediaProcessing({
          mediaId: media.id,
          eventId,
          filePath,
          fileName,
          fileSize: fileSize || 0,
        })
      )
      .catch(error => {
        console.error('Failed to queue media processing:', error)
      })

    return NextResponse.json(media)
  } catch (error) {
    console.error('Complete upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}