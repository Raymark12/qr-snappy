import { NextRequest, NextResponse } from 'next/server'
import { createRouteSupabaseClient } from '@/lib/supabase/route'
import { createSupabaseAdmin } from '@/lib/supabase/client'
import { requireEventModerator } from '@/lib/utils/auth-helpers'
import { STORAGE } from '@/lib/constants'
import { validateFile } from '@/lib/utils/file-validation'

export const runtime = 'nodejs'

function getBackgroundStoragePath(eventId: string) {
  return `${STORAGE.BUCKET_NAME}/backgrounds/${eventId}/background.jpg`
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const supabase = createRouteSupabaseClient(req)
    const admin = createSupabaseAdmin()
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
    const blob = new Blob([arrayBuffer], { type: imageFile.type })

    const storagePath = getBackgroundStoragePath(eventId)
    const pathInBucket = storagePath.replace(`${STORAGE.BUCKET_NAME}/`, '')

    // Remove old background if exists
    await admin.storage.from(STORAGE.BUCKET_NAME).remove([pathInBucket])

    // Upload new background
    const { error: uploadErr } = await admin.storage
      .from(STORAGE.BUCKET_NAME)
      .upload(pathInBucket, blob, {
        contentType: imageFile.type,
        upsert: true,
      })

    if (uploadErr) {
      return NextResponse.json({ error: uploadErr.message || 'Failed to upload background' }, { status: 500 })
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
    const { data: signed } = await admin.storage
      .from(STORAGE.BUCKET_NAME)
      .createSignedUrl(pathInBucket, STORAGE.SIGNED_URL_EXPIRY)

    if (!signed) {
      return NextResponse.json({ error: 'Failed to sign background URL' }, { status: 500 })
    }

    return NextResponse.json({ success: true, url: signed.signedUrl, path: storagePath })
  } catch (err) {
    console.error('Background upload failed', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const supabase = createRouteSupabaseClient(req)
    const admin = createSupabaseAdmin()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const authResult = await requireEventModerator(supabase as any, eventId)
    if ('error' in authResult) return authResult.error

    const storagePath = getBackgroundStoragePath(eventId)
    const pathInBucket = storagePath.replace(`${STORAGE.BUCKET_NAME}/`, '')

    await admin.storage.from(STORAGE.BUCKET_NAME).remove([pathInBucket])

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

