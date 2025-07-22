import { createSupabaseAdmin, createSupabaseClient } from '@/lib/supabase/client'
import { env } from '@/lib/env'
import { STORAGE } from '@/lib/constants'
import { parseStoragePath } from './file-validation'

/**
 * Get authenticated/signed URL for storage objects
 * Works with private buckets using RLS policies
 */
export async function getAuthenticatedImageUrl(filePath: string): Promise<string> {
  const supabase = createSupabaseClient()

  // Get signed URL that includes auth credentials
  const { data, error } = await supabase.storage
    .from(STORAGE.BUCKET_NAME)
    .createSignedUrl(
      filePath.replace(`${STORAGE.BUCKET_NAME}/`, ''),
      STORAGE.SIGNED_URL_EXPIRY
    )

  if (error || !data) {
    console.error('Failed to create signed URL:', error)
    // Fallback to public URL (will fail if bucket is private)
    return `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${filePath}`
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

