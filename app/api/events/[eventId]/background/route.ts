import { NextRequest, NextResponse } from 'next/server'
import { createRouteSupabaseClient } from '@/lib/supabase/route'
import { requireEventModerator } from '@/lib/utils/auth-helpers'
import { STORAGE } from '@/lib/constants'
import { env } from '@/lib/env'
import { validateFile } from '@/lib/utils/file-validation'
import { getR2SignedUrl, uploadFileToR2, deleteFileFromR2, generateR2Key } from '@/lib/utils/r2-storage'

export const runtime = 'nodejs'

function getBackgroundStoragePath(eventId: string) {
  // Use R2 bucket name from environment instead of hardcoded STORAGE.BUCKET_NAME
  const bucketName = env.R2_BUCKET_NAME || STORAGE.BUCKET_NAME
  return `${bucketName}/backgrounds/${eventId}/background.jpg`
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const supabase = createRouteSupabaseClient(req)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const authResult = await requireEventModerator(supabase as any, eventId)
    if ('error' in authResult) return authResult.error

    const formData = await req.formData().catch(() => null)
    const imageFile = formData?.get('image') as File | null

    if (!imageFile) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    const validation = validateFile(imageFile)
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const arrayBuffer = await imageFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const storagePath = getBackgroundStoragePath(eventId)
    const r2Key = generateR2Key(storagePath)

    // Remove old background if exists
    await deleteFileFromR2(r2Key)

    // Convert Buffer to Blob for upload
    const backgroundBlob = new Blob([buffer], { type: imageFile.type })

    // Upload new background
    const uploadResult = await uploadFileToR2(r2Key, backgroundBlob, {
      contentType: imageFile.type,
    })

    if (!uploadResult.success) {
      return NextResponse.json({ error: uploadResult.error || 'Failed to upload background' }, { status: 500 })
    }

    // Updates event background image
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateErr } = await (supabase as any)
      .from('events')
      .update({ background_image_path: storagePath })
      .eq('id', eventId)

    if (updateErr) {
      console.error('Failed to update event background_image_path:', updateErr)
    }

    // Return signed URL
    const signedResult = await getR2SignedUrl(r2Key, STORAGE.SIGNED_URL_EXPIRY)

    if (!signedResult.success || !signedResult.url) {
      return NextResponse.json({ error: 'Failed to sign background URL' }, { status: 500 })
    }

    return NextResponse.json({ success: true, url: signedResult.url, path: storagePath })
  } catch (err) {
    console.error('Background upload failed', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const supabase = createRouteSupabaseClient(req)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const authResult = await requireEventModerator(supabase as any, eventId)
    if ('error' in authResult) return authResult.error

    const storagePath = getBackgroundStoragePath(eventId)
    const r2Key = generateR2Key(storagePath)

    await deleteFileFromR2(r2Key)

    // Updates event background image to null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateErr } = await (supabase as any)
      .from('events')
      .update({ background_image_path: null })
      .eq('id', eventId)

    if (updateErr) {
      console.error('Failed to update event background_image_path:', updateErr)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Background deletion failed', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

