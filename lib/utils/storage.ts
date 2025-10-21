import { createSupabaseAdmin, createSupabaseClient } from '@/lib/supabase/client'
import { env } from '@/lib/env'
import { STORAGE } from '@/lib/constants'
import { parseStoragePath } from './file-validation'

export async function getAuthenticatedImageUrl(
  filePath: string,
  options?: { publicMode?: boolean; eventId?: string }
): Promise<string> {
  if (!filePath || filePath.trim() === '') {
    throw new Error('Invalid file path')
  }

  // Use public API endpoint for anonymous users with access cookie
  if (options?.publicMode && options?.eventId) {
    try {
      const response = await fetch(`/api/public/events/${options.eventId}/signed-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filePath }),
      })

      if (!response.ok) {
        throw new Error(`Failed to get signed URL: ${response.statusText}`)
      }

      const data = await response.json()
      if (data.url) {
        return data.url
      }
      throw new Error('No URL in response')
    } catch (err) {
      console.error('Failed to get public signed URL:', err)
      const fullPath = filePath.startsWith(STORAGE.BUCKET_NAME) ? filePath : `${STORAGE.BUCKET_NAME}/${filePath}`
      return `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${fullPath}`
    }
  }

  const supabase = createSupabaseClient()

  let pathInBucket = filePath
  if (filePath.startsWith(`${STORAGE.BUCKET_NAME}/`)) {
    pathInBucket = filePath.replace(`${STORAGE.BUCKET_NAME}/`, '')
  }

  // Get signed URL that includes auth credentials
  const { data, error } = await supabase.storage
    .from(STORAGE.BUCKET_NAME)
    .createSignedUrl(pathInBucket, STORAGE.SIGNED_URL_EXPIRY)

  if (error || !data) {
    console.error('Failed to create signed URL:', error, 'for path:', pathInBucket)
    const fullPath = filePath.startsWith(STORAGE.BUCKET_NAME) ? filePath : `${STORAGE.BUCKET_NAME}/${filePath}`
    return `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${fullPath}`
  }

  return data.signedUrl
}

export async function uploadFileToStorage(
  bucketPath: string,
  file: File | Blob
): Promise<{ success: boolean; error?: string }> {
  const admin = createSupabaseAdmin()
  const { bucket, path: pathInBucket } = parseStoragePath(bucketPath)

  const { error } = await admin.storage.from(bucket).upload(pathInBucket, file, {
    upsert: false,
    contentType: (file as File).type || undefined,
  })

  if (error) {
    console.error('Storage upload error:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function deleteFileFromStorage(
  bucketPath: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createSupabaseAdmin()
  const { bucket, path: pathInBucket } = parseStoragePath(bucketPath)

  const { error } = await admin.storage.from(bucket).remove([pathInBucket])

  if (error) {
    console.error('Storage delete error:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

