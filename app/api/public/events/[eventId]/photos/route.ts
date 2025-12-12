import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createSupabaseAdmin } from '@/lib/supabase/client'
import { uploadFileToStorage, deleteFileFromStorage, normalizeStoragePath } from '@/lib/utils/storage'
import { validateFile, getMediaStoragePath } from '@/lib/utils/file-validation'
import { eventIdParamSchema } from '@/lib/validations'
import { getEventById } from '@/lib/db/events'

// Route segment config for Vercel deployment
export const maxDuration = 300 // 5 minutes for photo uploads
export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const { searchParams } = new URL(req.url)

    const validationResult = eventIdParamSchema.safeParse({ eventId })
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid event ID', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const event = await getEventById(eventId)
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (!event.is_active) {
      return NextResponse.json({ error: 'Event is not active' }, { status: 403 })
    }

    // Check if pagination is requested
    const cursor = searchParams.get('cursor')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50) // Max 50 per page

    if (cursor || limit !== 20) {
      // Use paginated version
      const adminClient = createSupabaseAdmin()
      let query = adminClient
        .from('media')
        .select('*')
        .eq('event_id', eventId)
        .eq('status', 'approved')
        .order('uploaded_at', { ascending: false })
        .limit(limit + 1) // Fetch one extra to check if there are more

      if (cursor) {
        query = query.lt('uploaded_at', cursor)
      }

      const { data: mediaData, error: fetchError } = await query

      if (fetchError) {
        console.error('Error fetching paginated media:', fetchError)
        return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 })
      }

      const data = (mediaData || [])
      const hasMore = data.length > limit
      const actualData = hasMore ? data.slice(0, limit) : data
      const nextCursor = actualData.length > 0 ? actualData[actualData.length - 1].uploaded_at : null

      return NextResponse.json({
        data: actualData,
        hasMore,
        nextCursor
      })
    }

    // Fallback to legacy non-paginated version for backward compatibility
    const adminClient = createSupabaseAdmin()
    const { data: mediaData, error: fetchError } = await adminClient
      .from('media')
      .select('*')
      .eq('event_id', eventId)
      .eq('status', 'approved')
      .order('uploaded_at', { ascending: false })

    if (fetchError) {
      console.error('Error fetching media:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 })
    }

    return NextResponse.json({ data: mediaData || [], hasMore: false, nextCursor: null })
  } catch (err) {
    console.error('Fetch photos error:', err)
    return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  let bucketPath: string | null = null

  try {
    const { eventId } = await params

    const validationResult = eventIdParamSchema.safeParse({ eventId })
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid event ID', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const event = await getEventById(eventId)
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (!event.is_active) {
      return NextResponse.json({ error: 'Event is not active' }, { status: 403 })
    }

    const shouldAutoApprove = event.auto_approve || false

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const author = formData.get('author') as string | null
    const comment = formData.get('comment') as string | null

    const fileValidation = validateFile(file)
    if (!fileValidation.valid) {
      return NextResponse.json({ error: fileValidation.error }, { status: 400 })
    }

    const originalName = file.name
    bucketPath = getMediaStoragePath(eventId, originalName)

    // Use admin client to upload and insert (bypasses RLS)
    const adminClient = createSupabaseAdmin()
    const uploadResult = await uploadFileToStorage(bucketPath, file)
    if (!uploadResult.success) {
      return NextResponse.json({ error: uploadResult.error || 'Upload failed' }, { status: 500 })
    }

    // Insert media with pending status using admin client (bypasses RLS)
    const { data: mediaData, error: insertError } = await adminClient
      .from('media')
      .insert({
        event_id: eventId,
        user_email: null,
        file_path: bucketPath,
        file_name: originalName,
        author: author || null,
        comment: comment || null,
        status: shouldAutoApprove ? 'approved' : 'pending',
      })
      .select('id')
      .single<{ id: string }>()

    if (insertError) {
      console.error('Error inserting media row:', insertError)

      if (bucketPath) {
        const fullPath = normalizeStoragePath(bucketPath)
        await deleteFileFromStorage(fullPath)
      }

      return NextResponse.json({
        error: 'Failed to save media metadata',
      }, { status: 500 })
    }

    revalidatePath(`/e/${eventId}/photos`)
    revalidatePath(`/events/${eventId}/photos`)

    return NextResponse.json({ success: true, id: mediaData?.id })
  } catch (err) {
    console.error('Upload error:', err)

    if (bucketPath) {
      await deleteFileFromStorage(bucketPath)
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

