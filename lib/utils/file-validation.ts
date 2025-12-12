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


export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  if (lastDot === -1 || lastDot === filename.length - 1) {
    return ''
  }
  return filename.substring(lastDot + 1).toLowerCase()
}

/**
 * Generate a fully random filename for storage
 */

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


export function isVideoFileName(filename: string): boolean {
  const extension = getFileExtension(filename).toLowerCase()
  return ['mp4', 'mov', 'avi', 'webm', 'm4v', 'mkv'].includes(extension)
}

export function getMediaStoragePath(eventId: string, filename: string): string {
  const extension = getFileExtension(filename)
  const objectName = `${crypto.randomUUID()}${extension}`
  const bucketName = env.R2_BUCKET_NAME || STORAGE.BUCKET_NAME
  return `${bucketName}/events/${eventId}/photos/${objectName}`
}

