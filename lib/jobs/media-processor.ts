import 'server-only'
import { createSupabaseAdmin } from '@/lib/supabase/client'
import { generateImageThumbnail, downloadFromR2ToTemp } from '@/lib/utils/thumbnail-generator'
import { processVideo } from '@/lib/utils/video-transcoder'
import { isVideoFileName } from '@/lib/utils/file-validation'
import { unlink } from 'fs/promises'

export interface ProcessMediaJobData {
  mediaId: string
  eventId: string
  filePath: string
  fileName: string
  fileSize: number
}

export interface ProcessMediaResult {
  success: boolean
  mediaId: string
  thumbnailPath?: string
  previewPath?: string
  metadata?: {
    width?: number
    height?: number
    duration?: number
    thumbnailSize?: number
    previewSize?: number
  }
  error?: string
}

interface MediaUpdateData {
  thumbnail_path?: string
  thumbnail_size?: number
  width?: number
  height?: number
  duration?: number
  media_type: 'image' | 'video'
  preview_path?: string
  preview_size?: number
}

/**
 * Process uploaded media: generate thumbnails and video previews
 */
export async function processUploadedMedia(
  jobData: ProcessMediaJobData
): Promise<ProcessMediaResult> {
  const { mediaId, eventId, filePath, fileName, fileSize } = jobData
  const isVideo = isVideoFileName(fileName)

  console.log(`[Media Processor] Starting processing for ${mediaId} (${isVideo ? 'video' : 'image'})`)

  try {
    if (isVideo) {
      return await processVideoMedia(mediaId, eventId, filePath, fileSize)
    } else {
      return await processImageMedia(mediaId, eventId, filePath)
    }
  } catch (error) {
    console.error(`[Media Processor] Failed to process ${mediaId}:`, error)
    return {
      success: false,
      mediaId,
      error: error instanceof Error ? error.message : 'Processing failed',
    }
  }
}

/**
 * Process image: generate thumbnail
 */
async function processImageMedia(
  mediaId: string,
  eventId: string,
  filePath: string
): Promise<ProcessMediaResult> {
  let tempFilePath: string | null = null

  try {
    // Download image from R2 to temp location
    tempFilePath = await downloadFromR2ToTemp(filePath)

    // Read file as buffer
    const { readFile } = await import('fs/promises')
    const imageBuffer = await readFile(tempFilePath)

    // Generate thumbnail
    const thumbnailResult = await generateImageThumbnail(imageBuffer, eventId, mediaId)

    if (!thumbnailResult.success) {
      return {
        success: false,
        mediaId,
        error: thumbnailResult.error,
      }
    }

    // Update database
    const supabase = createSupabaseAdmin()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('media')
      .update({
        thumbnail_path: thumbnailResult.thumbnailPath,
        thumbnail_size: thumbnailResult.thumbnailSize,
        width: thumbnailResult.width,
        height: thumbnailResult.height,
        media_type: 'image',
      })
      .eq('id', mediaId)

    if (updateError) {
      console.error('[Media Processor] Failed to update database:', updateError)
      return {
        success: false,
        mediaId,
        error: 'Failed to update database',
      }
    }

    console.log(`[Media Processor] Successfully processed image ${mediaId}`)

    return {
      success: true,
      mediaId,
      thumbnailPath: thumbnailResult.thumbnailPath,
      metadata: {
        width: thumbnailResult.width,
        height: thumbnailResult.height,
        thumbnailSize: thumbnailResult.thumbnailSize,
      },
    }
  } finally {
    // Clean up temp file
    if (tempFilePath) {
      try {
        await unlink(tempFilePath)
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

/**
 * Process video: generate thumbnail and preview
 */
async function processVideoMedia(
  mediaId: string,
  eventId: string,
  filePath: string,
  _fileSize: number
): Promise<ProcessMediaResult> {
  let tempFilePath: string | null = null

  try {
    // Download video from R2 to temp location
    tempFilePath = await downloadFromR2ToTemp(filePath)

    // Process video (generate thumbnail and preview)
    const result = await processVideo(tempFilePath, eventId, mediaId, (stage, percent) => {
      console.log(`[Media Processor] ${mediaId} - ${stage}: ${percent}%`)
    })

    if (!result.thumbnailResult.success) {
      console.warn('[Media Processor] Thumbnail generation failed, but continuing:', result.thumbnailResult.error)
    }

    // If both failed, then we have a problem
    if (!result.thumbnailResult.success && (!result.transcodeResult.success || !result.transcodeResult.previewPath)) {
      return {
        success: false,
        mediaId,
        error: result.thumbnailResult.error || 'Failed to generate video thumbnail and preview',
      }
    }

    // Prepare update data
    const updateData: MediaUpdateData = {
      thumbnail_path: result.thumbnailResult.success ? result.thumbnailResult.thumbnailPath : undefined,
      thumbnail_size: result.thumbnailResult.success ? result.thumbnailResult.thumbnailSize : undefined,
      width: result.metadata.width,
      height: result.metadata.height,
      duration: result.metadata.duration,
      media_type: 'video',
    }

    // Add preview data if transcoding was successful
    if (result.transcodeResult.success && result.transcodeResult.previewPath) {
      updateData.preview_path = result.transcodeResult.previewPath
      updateData.preview_size = result.transcodeResult.previewSize
    }

    // Update database
    const supabase = createSupabaseAdmin()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('media')
      .update(updateData)
      .eq('id', mediaId)

    if (updateError) {
      console.error('[Media Processor] Failed to update database:', updateError)
      return {
        success: false,
        mediaId,
        error: 'Failed to update database',
      }
    }

    console.log(`[Media Processor] Successfully processed video ${mediaId}`)

    return {
      success: true,
      mediaId,
      thumbnailPath: result.thumbnailResult.thumbnailPath,
      previewPath: result.transcodeResult.previewPath,
      metadata: {
        width: result.metadata.width,
        height: result.metadata.height,
        duration: result.metadata.duration,
        thumbnailSize: result.thumbnailResult.thumbnailSize,
        previewSize: result.transcodeResult.previewSize,
      },
    }
  } finally {
    // Clean up temp file
    if (tempFilePath) {
      try {
        await unlink(tempFilePath)
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

/**
 * Queue a media processing job
 */
export async function queueMediaProcessing(jobData: ProcessMediaJobData): Promise<void> {
  processUploadedMedia(jobData).catch(error => {
    console.error('[Media Processor] Background processing failed:', error)
  })
}

