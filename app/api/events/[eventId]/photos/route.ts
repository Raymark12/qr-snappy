import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createRouteSupabaseClient } from '@/lib/supabase/route'
import { uploadFileToStorage, deleteFileFromStorage, normalizeStoragePath } from '@/lib/utils/storage'
import { requireEventAccess } from '@/lib/utils/auth-helpers'
import { validateFile, getMediaStoragePath } from '@/lib/utils/file-validation'
import { eventIdParamSchema } from '@/lib/validations'
import { getEventPhotos, insertPhotoRow } from '@/lib/db/event-photos'

export async function GET(_req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params

    const validationResult = eventIdParamSchema.safeParse({ eventId })
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid event ID', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const photos = await getEventPhotos(eventId, true) // includePendingForModerator = true

    return NextResponse.json(photos)
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

    const supabase = createRouteSupabaseClient(req)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase client type complexity with RLS policies
    const authResult = await requireEventAccess(supabase as any, eventId)

    // Get event details to check auto-approve setting
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: event } = await (supabase as any)
      .from('events')
      .select('auto_approve')
      .eq('id', eventId)
      .single()

    const shouldAutoApprove = event?.auto_approve || false

    if ('error' in authResult) {
      return authResult.error
    }

    const { user } = authResult

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

    const uploadResult = await uploadFileToStorage(bucketPath, file)
    if (!uploadResult.success) {
      return NextResponse.json({ error: uploadResult.error || 'Upload failed' }, { status: 500 })
    }

    const insertResult = await insertPhotoRow({
      eventId,
      userEmail: user.email,
      filePath: bucketPath,
      fileName: originalName,
      author: author || undefined,
      comment: comment || undefined,
      status: shouldAutoApprove ? 'approved' : 'pending',
    })

    if (!insertResult.success) {
      console.error('Error inserting photo row:', insertResult.error)

      if (bucketPath) {
        const fullPath = normalizeStoragePath(bucketPath)
        await deleteFileFromStorage(fullPath)
      }

      return NextResponse.json({
        error: insertResult.error || 'Failed to save photo metadata',
      }, { status: 500 })
    }

    revalidatePath(`/events/${eventId}/photos`)

    return NextResponse.json({ success: true, id: insertResult.id })
  } catch (err) {
    console.error('Upload error:', err)

    if (bucketPath) {
      await deleteFileFromStorage(bucketPath)
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


