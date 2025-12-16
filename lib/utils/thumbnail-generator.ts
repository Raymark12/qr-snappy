import 'server-only'
import sharp from 'sharp'
import { MEDIA } from '@/lib/constants'
import { uploadFileToR2 } from './r2-storage'
import ffmpeg from '@renmu/fluent-ffmpeg'
import ffmpegPath from '@ffmpeg-installer/ffmpeg'
import ffprobePath from '@ffprobe-installer/ffprobe'
import { writeFile, unlink } from 'fs/promises'
import { join, dirname, basename } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'

// Set ffmpeg and ffprobe paths
ffmpeg.setFfmpegPath(ffmpegPath.path)
ffmpeg.setFfprobePath(ffprobePath.path)

export interface ThumbnailResult {
  success: boolean
  thumbnailPath?: string
  thumbnailSize?: number
  width?: number
  height?: number
  error?: string
}

/**
 * Generate thumbnail for an image
 */
export async function generateImageThumbnail(
  imageBuffer: Buffer,
  eventId: string,
  mediaId: string
): Promise<ThumbnailResult> {
  try {
    const { MAX_WIDTH, MAX_HEIGHT, QUALITY, FORMAT } = MEDIA.THUMBNAIL

    // Get original dimensions
    const metadata = await sharp(imageBuffer).metadata()
    const originalWidth = metadata.width || 0
    const originalHeight = metadata.height || 0

    // Generate thumbnail
    const thumbnailBuffer = await sharp(imageBuffer)
      .resize(MAX_WIDTH, MAX_HEIGHT, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: QUALITY })
      .toBuffer()

    // Upload to R2
    const thumbnailKey = `events/${eventId}/thumbnails/${mediaId}.${FORMAT}`
    const uploadResult = await uploadFileToR2(thumbnailKey, new Blob([new Uint8Array(thumbnailBuffer)]), {
      contentType: `image/${FORMAT}`,
    })

    if (!uploadResult.success) {
      return {
        success: false,
        error: uploadResult.error || 'Failed to upload thumbnail',
      }
    }

    return {
      success: true,
      thumbnailPath: thumbnailKey,
      thumbnailSize: thumbnailBuffer.length,
      width: originalWidth,
      height: originalHeight,
    }
  } catch (error) {
    console.error('Failed to generate image thumbnail:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate thumbnail',
    }
  }
}

/**
 * Generate thumbnail for a video
 */
export async function generateVideoThumbnail(
  videoPath: string,
  eventId: string,
  mediaId: string
): Promise<ThumbnailResult> {
  const tempOutputPath = join(tmpdir(), `${randomUUID()}.png`)

  try {
    const { POSTER_TIME } = MEDIA.VIDEO
    const { MAX_WIDTH, MAX_HEIGHT, QUALITY, FORMAT } = MEDIA.THUMBNAIL

    // Extract frame from video
    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: [POSTER_TIME],
          folder: dirname(tempOutputPath),
          filename: basename(tempOutputPath),
          size: `${MAX_WIDTH}x${MAX_HEIGHT}`,
        })
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
    })

    // Read the extracted frame
    const frameBuffer = await sharp(tempOutputPath).toBuffer()

    // Get video metadata
    const videoMetadata = await getVideoMetadata(videoPath)

    // Convert to WebP and compress
    const thumbnailBuffer = await sharp(frameBuffer)
      .resize(MAX_WIDTH, MAX_HEIGHT, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: QUALITY })
      .toBuffer()

    // Upload to R2
    const thumbnailKey = `events/${eventId}/thumbnails/${mediaId}.${FORMAT}`
    const uploadResult = await uploadFileToR2(thumbnailKey, new Blob([new Uint8Array(thumbnailBuffer)]), {
      contentType: `image/${FORMAT}`,
    })

    // Clean up temp file
    try {
      await unlink(tempOutputPath)
    } catch {
      // Ignore cleanup errors
    }

    if (!uploadResult.success) {
      return {
        success: false,
        error: uploadResult.error || 'Failed to upload video thumbnail',
      }
    }

    return {
      success: true,
      thumbnailPath: thumbnailKey,
      thumbnailSize: thumbnailBuffer.length,
      width: videoMetadata.width,
      height: videoMetadata.height,
    }
  } catch (error) {
    // Clean up temp file on error
    try {
      await unlink(tempOutputPath)
    } catch {
      // Ignore cleanup errors
    }

    console.error('Failed to generate video thumbnail:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate video thumbnail',
    }
  }
}

/**
 * Get video metadata (dimensions, duration)
 */
export async function getVideoMetadata(videoPath: string): Promise<{
  width: number
  height: number
  duration: number
}> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err)
        return
      }

      const videoStream = metadata.streams.find(s => s.codec_type === 'video')
      if (!videoStream) {
        reject(new Error('No video stream found'))
        return
      }

      resolve({
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        duration: Math.floor(metadata.format.duration || 0),
      })
    })
  })
}

/**
 * Download file from R2 to temp location
 */
export async function downloadFromR2ToTemp(r2Key: string): Promise<string> {
  const { getR2SignedUrl } = await import('./r2-storage')
  const tempPath = join(tmpdir(), `${randomUUID()}-${r2Key.split('/').pop()}`)

  const result = await getR2SignedUrl(r2Key)
  if (!result.success || !result.url) {
    throw new Error('Failed to get signed URL for download')
  }

  // Download file
  const response = await fetch(result.url)
  if (!response.ok) {
    throw new Error('Failed to download file from R2')
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  await writeFile(tempPath, buffer)

  return tempPath
}

