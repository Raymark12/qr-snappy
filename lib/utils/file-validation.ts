import { FILE_UPLOAD, STORAGE } from '@/lib/constants'
import { env } from '@/lib/env'

export interface FileValidationResult {
  valid: boolean
  error?: string
}

export function validateFileType(file: File): FileValidationResult {
  const allowedTypes: readonly string[] = FILE_UPLOAD.ALLOWED_TYPES
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported file type. Allowed types: ${FILE_UPLOAD.ALLOWED_EXTENSIONS.join(', ')}`,
    }
  }

  return { valid: true }
}

export function validateFileSize(file: File): FileValidationResult {
  if (file.size > FILE_UPLOAD.MAX_SIZE_BYTES) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${FILE_UPLOAD.MAX_SIZE_DISPLAY}`,
    }
  }

  return { valid: true }
}

export function validateFile(file: File): FileValidationResult {
  const typeValidation = validateFileType(file)
  if (!typeValidation.valid) {
    return typeValidation
  }

  const sizeValidation = validateFileSize(file)
  if (!sizeValidation.valid) {
    return sizeValidation
  }

  return { valid: true }
}

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  if (lastDot === -1 || lastDot === filename.length - 1) {
    return ''
  }
  return filename.substring(lastDot + 1).toLowerCase()
}

/**
 * Generate a fully random filename for storage
 * Original filename is stored in database only, not in storage path
 */
export function getPhotoStoragePath(eventId: string, filename: string): string {
  const extension = getFileExtension(filename)
  const objectName = `${crypto.randomUUID()}${extension}`
  return `${STORAGE.BUCKET_NAME}/${eventId}/${objectName}`
}

export function parseStoragePath(fullPath: string): {
  bucket: string
  path: string
} {
  const [bucket, ...rest] = fullPath.split('/')
  return {
    bucket,
    path: rest.join('/'),
  }
}

export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/')
}

export function isVideoFileName(filename: string): boolean {
  const extension = getFileExtension(filename).toLowerCase()
  return ['mp4', 'mov', 'avi', 'webm', 'm4v', 'mkv'].includes(extension)
}

export function getMediaStoragePath(eventId: string, filename: string): string {
  const extension = getFileExtension(filename)
  const objectName = `${crypto.randomUUID()}${extension}`
  // Use R2 bucket name from environment instead of hardcoded STORAGE.BUCKET_NAME
  const bucketName = env.R2_BUCKET_NAME || STORAGE.BUCKET_NAME
  return `${bucketName}/events/${eventId}/photos/${objectName}`
}

