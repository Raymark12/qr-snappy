import { uploadFileToR2, deleteFileFromR2, getR2SignedUrl } from '@/lib/utils/r2-storage'
import { env } from '@/lib/env'

export interface ImageUploadResult {
  success: boolean
  url?: string
  key?: string
  error?: string
}

export interface ImageDeleteResult {
  success: boolean
  error?: string
}

/**
 * Upload an image file to R2 storage
 */
export async function uploadImage(
  file: File,
  key: string,
  options?: {
    contentType?: string
    metadata?: Record<string, string>
  }
): Promise<ImageUploadResult> {
  try {
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'File must be an image' }
    }

    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return { success: false, error: 'Image size must be less than 10MB' }
    }

    const result = await uploadFileToR2(key, file, {
      contentType: options?.contentType || file.type,
      metadata: options?.metadata,
    })

    if (!result.success) {
      return { success: false, error: result.error }
    }

    // Generate signed URL for immediate access
    const signedUrlResult = await getR2SignedUrl(result.key!)
    if (!signedUrlResult.success) {
      console.warn('Upload succeeded but signed URL generation failed:', signedUrlResult.error)
      return {
        success: true,
        key: result.key,
        url: `${env.R2_PUBLIC_DOMAIN || `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`}/${result.key}`,
      }
    }

    return {
      success: true,
      key: result.key,
      url: signedUrlResult.url,
    }
  } catch (error) {
    console.error('Image upload error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    }
  }
}

/**
 * Delete an image from R2 storage
 */
export async function deleteImage(key: string): Promise<ImageDeleteResult> {
  try {
    const result = await deleteFileFromR2(key)

    if (!result.success) {
      return { success: false, error: result.error }
    }

    return { success: true }
  } catch (error) {
    console.error('Image delete error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed',
    }
  }
}

/**
 * Generate a signed URL for an image
 */
export async function getImageUrl(
  key: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<{ success: boolean; url?: string; error?: string }> {
  return getR2SignedUrl(key, expiresIn)
}

/**
 * Validate image file before upload
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'File must be an image' }
  }

  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    return { valid: false, error: 'Image size must be less than 10MB' }
  }

  const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp']
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!extension || !allowedExtensions.includes(extension)) {
    return { valid: false, error: 'Image must be JPG, PNG, GIF, or WebP' }
  }

  return { valid: true }
}