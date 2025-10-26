import 'server-only'
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  ListObjectsV2Command
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { env } from '@/lib/env'
import { STORAGE } from '@/lib/constants'

// Create R2 client with Cloudflare R2 configuration
const createR2Client = () => {
  // Check if R2 credentials are available
  if (!env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_ACCOUNT_ID || !env.R2_BUCKET_NAME) {
    throw new Error('R2 credentials not configured. Please set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID, and R2_BUCKET_NAME in your environment variables.')
  }

  const endpoint = env.R2_ENDPOINT || `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`

  return new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  })
}

/**
 * Upload a file to Cloudflare R2
 */
export async function uploadFileToR2(
  key: string,
  file: File | Blob,
  options?: {
    contentType?: string
    metadata?: Record<string, string>
  }
): Promise<{ success: boolean; error?: string; key?: string }> {
  try {
    const client = createR2Client()

    console.log(`Starting R2 upload for ${key}, size: ${file.size} bytes`)

    let body: Uint8Array | ReadableStream | Buffer

    if (typeof window === 'undefined') {
      console.log('Server-side upload: converting to buffer')
      const arrayBuffer = await file.arrayBuffer()
      body = Buffer.from(arrayBuffer)
    } else {
      console.log('Client-side upload: converting to Uint8Array')
      const arrayBuffer = await file.arrayBuffer()
      body = new Uint8Array(arrayBuffer)
    }

    console.log('Body conversion complete, sending to R2')

    const command = new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: options?.contentType || (file as File).type || 'application/octet-stream',
      Metadata: options?.metadata,
    })

    await client.send(command)
    console.log('R2 upload successful')

    return { success: true, key }
  } catch (error) {
    console.error('R2 upload error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    }
  }
}

/**
 * Generate a pre-signed PUT URL for direct R2 uploads
 */
export async function getR2PresignedPutUrl(
  key: string,
  contentType?: string,
  expiresIn: number = STORAGE.R2_SIGNED_URL_EXPIRY
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const client = createR2Client()

    const command = new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      ...(contentType && { ContentType: contentType }),
    })

    const url = await getSignedUrl(client, command, { expiresIn })
    return { success: true, url }
  } catch (error) {
    console.error('Failed to generate pre-signed PUT URL:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate upload URL'
    }
  }
}

/**
 * Upload large files using multipart upload (recommended for files > 50MB)
 */
export async function uploadLargeFileToR2(
  key: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; error?: string; key?: string }> {
  const client = createR2Client()
  const PART_SIZE = 5 * 1024 * 1024 // 5MB parts (same as R2_UPLOAD_PART_SIZE)

  try {
    console.log(`Starting multipart upload for ${key}, size: ${file.size} bytes`)

    const createCommand = new CreateMultipartUploadCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      ContentType: file.type,
    })

    const { UploadId } = await client.send(createCommand)
    if (!UploadId) {
      throw new Error('Failed to initiate multipart upload')
    }

    console.log(`Multipart upload initiated, uploadId: ${UploadId}`)

    const parts: Array<{ ETag: string; PartNumber: number }> = []
    const totalParts = Math.ceil(file.size / PART_SIZE)

    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      const start = (partNumber - 1) * PART_SIZE
      const end = Math.min(start + PART_SIZE, file.size)
      const chunk = file.slice(start, end)

      const arrayBuffer = await chunk.arrayBuffer()
      const body = new Uint8Array(arrayBuffer)

      const uploadCommand = new UploadPartCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: key,
        UploadId,
        PartNumber: partNumber,
        Body: body,
      })

      const { ETag } = await client.send(uploadCommand)
      if (!ETag) {
        throw new Error(`Failed to upload part ${partNumber}`)
      }

      parts.push({ ETag, PartNumber: partNumber })

      const progress = (partNumber / totalParts) * 100
      onProgress?.(progress)

      console.log(`Uploaded part ${partNumber}/${totalParts} (${Math.round(progress)}%)`)
    }

    const completeCommand = new CompleteMultipartUploadCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      UploadId,
      MultipartUpload: { Parts: parts },
    })

    await client.send(completeCommand)

    console.log('Multipart upload completed successfully')
    onProgress?.(100)

    return { success: true, key }
  } catch (error) {
    console.error('Multipart upload failed:', error)

    // Try to abort the multipart upload if it was initiated
    try {
    } catch (abortError) {
      console.error('Failed to abort multipart upload:', abortError)
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Multipart upload failed'
    }
  }
}


/**
 * Delete a file from Cloudflare R2
 */
export async function deleteFileFromR2(key: string): Promise<{ success: boolean; error?: string }> {
  try {
    const client = createR2Client()

    const command = new DeleteObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
    })

    await client.send(command)

    return { success: true }
  } catch (error) {
    console.error('R2 delete error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed'
    }
  }
}

/**
 * Generate a signed URL for accessing a file from Cloudflare R2
 */
export async function getR2SignedUrl(
  key: string,
  expiresIn: number = STORAGE.R2_SIGNED_URL_EXPIRY
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const client = createR2Client()

    const command = new GetObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
    })

    const signedUrl = await getSignedUrl(client, command, { expiresIn })

    return { success: true, url: signedUrl }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate signed URL'
    }
  }
}

/**
 * Get a public URL for a file (if R2_PUBLIC_DOMAIN is configured)
 * Falls back to signed URL if public domain is not available
 */
export async function getR2PublicUrl(
  key: string,
  expiresIn: number = STORAGE.R2_SIGNED_URL_EXPIRY
): Promise<{ success: boolean; url?: string; error?: string }> {
  if (env.R2_PUBLIC_DOMAIN) {
    const publicUrl = `${env.R2_PUBLIC_DOMAIN}/${key}`
    return { success: true, url: publicUrl }
  }

  return getR2SignedUrl(key, expiresIn)
}

/**
 * Check if a file exists in R2
 */
export async function fileExistsInR2(key: string): Promise<boolean> {
  try {
    const client = createR2Client()

    const command = new GetObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
    })

    await client.send(command)
    return true
  } catch {
    return false
  }
}

/**
 * Get total storage usage for the R2 bucket
 * Returns the total size in bytes of all objects in the bucket
 */
export async function getR2StorageUsage(): Promise<{ success: boolean; totalBytes?: number; totalObjects?: number; error?: string }> {
  try {
    // Check if R2 is configured
    if (!env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_ACCOUNT_ID || !env.R2_BUCKET_NAME) {
      return {
        success: false,
        error: 'R2 storage not configured. Set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID, and R2_BUCKET_NAME environment variables.'
      }
    }

    const client = createR2Client()
    const bucketName = env.R2_BUCKET_NAME

    console.log('Getting R2 storage usage for bucket:', bucketName)

    let totalBytes = 0
    let totalObjects = 0
    let continuationToken: string | undefined
    let batchCount = 0

    // List all objects in the bucket and sum their sizes
    do {
      batchCount++
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      })

      const response = await client.send(command)
      const objectsInBatch = response.Contents?.length || 0

      console.log(`Batch ${batchCount}: Found ${objectsInBatch} objects`)

      // Sum the sizes of all objects in this batch
      if (response.Contents) {
        for (const object of response.Contents) {
          if (object.Size && object.Size > 0) {
            totalBytes += object.Size
            totalObjects++
          }
        }
      }

      continuationToken = response.NextContinuationToken

      if (batchCount > 100) {
        console.warn('Too many batches, stopping at batch 100')
        break
      }
    } while (continuationToken)

    console.log(`R2 storage usage calculation complete: ${totalObjects} objects, ${totalBytes} total bytes`)

    return { success: true, totalBytes, totalObjects }
  } catch (error) {
    console.error('Failed to get R2 storage usage:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get storage usage'
    }
  }
}

/**
 * Generate R2 key from database file path
 * Handles different storage patterns for QR, backgrounds, and photos
 */
export function generateR2Key(filePath: string): string {
  // Handle R2 bucket name prefix (new format)
  const r2BucketName = env.R2_BUCKET_NAME
  if (r2BucketName) {
    if (filePath.startsWith(`${r2BucketName}/qr/`)) {
      return filePath.replace(`${r2BucketName}/qr/`, 'qr/')
    }
    if (filePath.startsWith(`${r2BucketName}/backgrounds/`)) {
      return filePath.replace(`${r2BucketName}/backgrounds/`, 'backgrounds/')
    }
    if (filePath.startsWith(`${r2BucketName}/events/`)) {
      return filePath.replace(`${r2BucketName}/events/`, 'events/')
    }
    if (filePath.startsWith(`${r2BucketName}/`)) {
      return filePath.replace(`${r2BucketName}/`, '')
    }
  }

  if (filePath.startsWith('Photos/qr/')) {
    return filePath.replace('Photos/qr/', 'qr/')
  }
  if (filePath.startsWith('Photos/backgrounds/')) {
    return filePath.replace('Photos/backgrounds/', 'backgrounds/')
  }
  if (filePath.startsWith('Photos/events/')) {
    return filePath.replace('Photos/events/', 'events/')
  }
  if (filePath.startsWith('Photos/')) {
    return filePath.replace('Photos/', '')
  }

  if (filePath.startsWith('qr/') || filePath.startsWith('backgrounds/') || filePath.startsWith('events/')) {
    return filePath
  }

  return filePath
}

/**
 * Parse storage path to extract bucket and key
 * Handles both full paths and relative keys
 */
export function parseR2Path(fullPath: string): { bucket: string; key: string } {
  const bucket = env.R2_BUCKET_NAME || 'photos'
  const key = generateR2Key(fullPath)

  return { bucket, key }
}