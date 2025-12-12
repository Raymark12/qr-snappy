import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/client'
import { queueMediaProcessing } from '@/lib/jobs/media-processor'
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
    const supabase = createSupabaseAdmin()

    const body = await req.json()
    const validationResult = completeUploadSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { filePath, fileName, author, comment, fileSize } = validationResult.data

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

    const isAutoApprove = Boolean(event.auto_approve)
    const mediaStatus = isAutoApprove ? 'approved' : 'pending'
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
        author: author || 'Anonymous',
        comment: comment || null,
        status: mediaStatus,
        user_email: null,
      })
      .select()
      .single()

    if (mediaError) {
      console.error('Error saving public media:', mediaError)
      return NextResponse.json({ error: 'Failed to save media' }, { status: 500 })
    }

    // Queue background processing for thumbnails and video previews
    queueMediaProcessing({
      mediaId: media.id,
      eventId,
      filePath,
      fileName,
      fileSize: fileSize || 0,
    }).catch(error => {
      console.error('Failed to queue media processing:', error)
    })

    return NextResponse.json(media)
  } catch (error) {
    console.error('Public complete upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}