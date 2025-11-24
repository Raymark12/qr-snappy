import 'server-only'
import { env } from '@/lib/env'
import { parseStoragePath } from './file-validation'
import { getR2SignedUrl, generateR2Key, uploadFileToR2, deleteFileFromR2 } from './r2-storage'
import { cookies } from 'next/headers'
import { STORAGE } from '@/lib/constants'

export async function getAuthenticatedImageUrl(
  filePath: string,
  options?: { publicMode?: boolean; eventId?: string }
): Promise<string> {
  if (!filePath || filePath.trim() === '') {
    throw new Error('Invalid file path')
  }

  if (options?.publicMode && options?.eventId) {
    try {
      const baseUrl = env.NEXT_PUBLIC_APP_URL

      // Get cookies from the request
      const cookieStore = await cookies()
      const cookieHeader = cookieStore.toString()

      const response = await fetch(`${baseUrl}/api/public/events/${options.eventId}/signed-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader,
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
      try {
        const r2Key = generateR2Key(filePath)
        const result = await getR2SignedUrl(r2Key)
        if (result.success && result.url) {
          return result.url
        }
        throw new Error(result.error || 'Failed to generate R2 signed URL')
      } catch (r2Error) {
        console.error('R2 fallback failed:', r2Error)
        throw new Error('Failed to generate image URL')
      }
    }
  }

  try {
    const r2Key = generateR2Key(filePath)
    const result = await getR2SignedUrl(r2Key)
    if (result.success && result.url) {
      return result.url
    }
    throw new Error(result.error || 'Failed to generate signed URL')
  } catch (error) {
    console.error('Failed to create signed URL:', error, 'for path:', filePath)
    throw error
  }
}

export async function uploadFileToStorage(
  bucketPath: string,
  file: File | Blob
): Promise<{ success: boolean; error?: string }> {
  if (!env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_ACCOUNT_ID || !env.R2_BUCKET_NAME) {
    return { success: false, error: 'R2 storage not configured' }
  }

  const { path: pathInBucket } = parseStoragePath(bucketPath)
  const r2Key = generateR2Key(pathInBucket)

  const result = await uploadFileToR2(r2Key, file, {
    contentType: (file as File).type || undefined,
  })

  if (!result.success) {
    console.error('R2 upload error:', result.error)
    return { success: false, error: result.error || 'Upload failed' }
  }

  return { success: true }
}

export async function deleteFileFromStorage(
  bucketPath: string
): Promise<{ success: boolean; error?: string }> {
  if (!env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_ACCOUNT_ID || !env.R2_BUCKET_NAME) {
    return { success: false, error: 'R2 storage not configured' }
  }

  const { path: pathInBucket } = parseStoragePath(bucketPath)
  const r2Key = generateR2Key(pathInBucket)

  const result = await deleteFileFromR2(r2Key)

  if (!result.success) {
    console.error('R2 delete error:', result.error, 'key:', r2Key)
    return { success: false, error: result.error || 'Delete failed' }
  }

  return { success: true }
}

/**
 * Normalize a file path to include proper bucket prefix for storage operations
 */
export function normalizeStoragePath(filePath: string): string {
  if (!filePath || filePath.trim() === '') {
    throw new Error('Invalid file path')
  }

  // If path already has R2 bucket prefix, return as-is
  if (env.R2_BUCKET_NAME && filePath.startsWith(`${env.R2_BUCKET_NAME}/`)) {
    return filePath
  }

  // If path already has legacy Photos prefix, return as-is
  if (filePath.startsWith(`${STORAGE.BUCKET_NAME}/`)) {
    return filePath
  }

  // Add R2 bucket prefix if configured, otherwise use legacy prefix
  const bucketName = env.R2_BUCKET_NAME || STORAGE.BUCKET_NAME
  return `${bucketName}/${filePath}`
}

