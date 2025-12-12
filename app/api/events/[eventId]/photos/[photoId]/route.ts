import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createRouteSupabaseClient } from '@/lib/supabase/route'
import { requireEventModerator } from '@/lib/utils/auth-helpers'
import { deletePhoto } from '@/lib/db/event-photos'
import { deleteFileFromStorage, normalizeStoragePath } from '@/lib/utils/storage'
import { photoIdParamSchema } from '@/lib/validations'

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ eventId: string; photoId: string }> }
) {
  let filePath: string | null = null
  let eventId: string | undefined
  let photoId: string | undefined

  try {
    const paramsData = await params
    eventId = paramsData.eventId
    photoId = paramsData.photoId

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

    const deleteResult = await deletePhoto(photoId)

    if (!deleteResult.success) {
      return NextResponse.json(
        { error: deleteResult.error || 'Failed to delete photo' },
        { status: 500 }
      )
    }

    filePath = deleteResult.filePath || null
    const { thumbnailPath, previewPath } = deleteResult
    console.log(`[Delete Photo] Deleting paths: original=${filePath}, thumb=${thumbnailPath}, preview=${previewPath}`)

    if (filePath) {
      const fullPath = normalizeStoragePath(filePath)
      console.log(`[Delete Photo] Normalized original path: ${fullPath}`)
      const storageDeleteResult = await deleteFileFromStorage(fullPath)
      if (!storageDeleteResult.success) {
        console.error('Failed to delete file from storage after DB deletion:', storageDeleteResult.error, 'photoId:', photoId, 'eventId:', eventId, 'filePath:', fullPath)
      }
    }

    if (thumbnailPath) {
      const fullPath = normalizeStoragePath(thumbnailPath)
      console.log(`[Delete Photo] Normalized thumbnail path: ${fullPath}`)
      await deleteFileFromStorage(fullPath).catch(err => 
        console.error('Failed to delete thumbnail:', err, 'path:', fullPath)
      )
    }

    if (previewPath) {
      const fullPath = normalizeStoragePath(previewPath)
      console.log(`[Delete Photo] Normalized preview path: ${fullPath}`)
      await deleteFileFromStorage(fullPath).catch(err => 
        console.error('Failed to delete preview:', err, 'path:', fullPath)
      )
    }

    revalidatePath(`/events/${eventId}/photos`)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete photo error:', err, 'photoId:', photoId || 'unknown', 'eventId:', eventId || 'unknown')

    if (filePath) {
      const fullPath = normalizeStoragePath(filePath)
      await deleteFileFromStorage(fullPath).catch((error) => {
        console.error('Failed to delete file from storage in error handler:', error, 'photoId:', photoId || 'unknown', 'eventId:', eventId || 'unknown', 'filePath:', fullPath)
      })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

