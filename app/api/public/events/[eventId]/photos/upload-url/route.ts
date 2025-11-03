import { NextRequest, NextResponse } from 'next/server'
import { createRouteSupabaseClient } from '@/lib/supabase/route'
import { getR2PresignedPutUrl } from '@/lib/utils/r2-storage'
import { z } from 'zod'

const uploadUrlSchema = z.object({
  fileName: z.string(),
  contentType: z.string(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const supabase = createRouteSupabaseClient(req)

    // Check if event exists and is active
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: event, error: eventError } = await (supabase as any)
      .from('events')
      .select('id, is_active')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (!event.is_active) {
      return NextResponse.json({ error: 'Event is not active' }, { status: 403 })
    }

    const body = await req.json()
    const validationResult = uploadUrlSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { fileName, contentType } = validationResult.data

    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 15)
    const extension = fileName.split('.').pop() || 'jpg'
    const key = `events/${eventId}/photos/${timestamp}-${randomId}.${extension}`

    const urlResult = await getR2PresignedPutUrl(key, contentType)

    if (!urlResult.success) {
      return NextResponse.json(
        { error: urlResult.error || 'Failed to generate upload URL' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      uploadUrl: urlResult.url,
      filePath: key,
      fileName,
      userEmail: 'public@guest.com',
    })
  } catch (error) {
    console.error('Public upload URL error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}