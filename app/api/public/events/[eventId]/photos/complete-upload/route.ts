import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/client'
import { z } from 'zod'

const completeUploadSchema = z.object({
  filePath: z.string(),
  fileName: z.string(),
  author: z.string().nullable().optional(),
  comment: z.string().nullable().optional(),
  userEmail: z.string().nullable().optional(),
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

    const { filePath, fileName, author, comment } = validationResult.data

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
    const photoStatus = isAutoApprove ? 'approved' : 'pending'

    // Save photo/video record to database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: photo, error: photoError } = await (supabase as any)
      .from('photos')
      .insert({
        event_id: eventId,
        file_path: filePath,
        file_name: fileName,
        author: author || 'Anonymous',
        comment: comment || null,
        status: photoStatus,
        user_email: null,
      })
      .select()
      .single()

    if (photoError) {
      console.error('Error saving public photo:', photoError)
      return NextResponse.json({ error: 'Failed to save photo' }, { status: 500 })
    }

    return NextResponse.json(photo)
  } catch (error) {
    console.error('Public complete upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}