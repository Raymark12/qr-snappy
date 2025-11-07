import { NextRequest, NextResponse } from 'next/server'
import { createRouteSupabaseClient } from '@/lib/supabase/route'
import { getR2PresignedPutUrl } from '@/lib/utils/r2-storage'
import { z } from 'zod'

const batchUploadUrlsSchema = z.object({
  files: z.array(z.object({
    name: z.string(),
    type: z.string(),
  })).min(1).max(20), // Max 20 files for public uploads
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

    // Parse request body
    const body = await req.json()
    const validationResult = batchUploadUrlsSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { files } = validationResult.data

    const uploads = await Promise.all(
      files.map(async (file, index) => {
        const timestamp = Date.now()
        const randomId = Math.random().toString(36).substring(2, 15)
        const extension = file.name.split('.').pop() || 'jpg'
        const key = `events/${eventId}/photos/${timestamp}-${randomId}-${index}.${extension}`

        const urlResult = await getR2PresignedPutUrl(key, file.type)

        if (!urlResult.success) {
          throw new Error(`Failed to generate upload URL for ${file.name}: ${urlResult.error}`)
        }

        return {
          uploadUrl: urlResult.url!,
          key,
          fileIndex: index,
        }
      })
    )

    return NextResponse.json({
      uploads,
      userEmail: 'public@guest.com',
    })
  } catch (error) {
    console.error('Public batch upload URLs error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}