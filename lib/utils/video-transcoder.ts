import 'server-only'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from '@ffmpeg-installer/ffmpeg'
import ffprobePath from '@ffprobe-installer/ffprobe'
import { MEDIA } from '@/lib/constants'
import { uploadFileToR2 } from './r2-storage'
import { unlink, readFile, stat } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'

// Set ffmpeg and ffprobe paths
ffmpeg.setFfmpegPath(ffmpegPath.path)
ffmpeg.setFfprobePath(ffprobePath.path)

export interface TranscodeResult {
  success: boolean
  previewPath?: string
  previewSize?: number
  error?: string
}

/**
 * Transcode video to optimized preview version (720p, H.264)
 */
export async function transcodeVideoToPreview(
  inputPath: string,
  eventId: string,
  mediaId: string,
  onProgress?: (percent: number) => void
): Promise<TranscodeResult> {
  const tempOutputPath = join(tmpdir(), `${randomUUID()}.mp4`)

  try {
    const { PREVIEW_RESOLUTION, PREVIEW_CODEC, PREVIEW_CRF } = MEDIA.VIDEO

    // Check if video is small enough to skip transcoding
    const inputStats = await stat(inputPath)
    const inputSizeMB = inputStats.size / (1024 * 1024)

    // Get input video metadata to check if it's already 720p or lower
    const inputMetadata = await getVideoInfo(inputPath)
    const [width, height] = PREVIEW_RESOLUTION.split('x').map(Number)

    // Skip transcoding if video is already smaller than 720p and under size limit
    if (
      inputMetadata.width <= width &&
      inputMetadata.height <= height &&
      inputSizeMB < MEDIA.VIDEO.SMALL_VIDEO_SIZE_MB
    ) {
      console.log('Video is already optimized, skipping transcode')
      return {
        success: true,
        previewPath: undefined,
        previewSize: undefined,
      }
    }

    // Transcode video
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-c:v', PREVIEW_CODEC,
          '-crf', String(PREVIEW_CRF), // Use CRF for quality-based compression
          '-vf', `scale=${PREVIEW_RESOLUTION}:force_original_aspect_ratio=decrease`,
          '-c:a', 'aac',
          '-b:a', '128k',
          '-movflags', '+faststart', // Enable streaming
          '-preset', 'fast', // Faster encoding
          '-pix_fmt', 'yuv420p', // Ensure wide compatibility
        ])
        .output(tempOutputPath)
        .on('progress', (progress) => {
          if (onProgress && progress.percent) {
            onProgress(Math.min(99, Math.max(0, progress.percent)))
          }
        })
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run()
    })

    // Read transcoded file
    const transcodedBuffer = await readFile(tempOutputPath)

    // Upload to R2
    const previewKey = `events/${eventId}/previews/${mediaId}.mp4`
    const uploadResult = await uploadFileToR2(previewKey, new Blob([transcodedBuffer]), {
      contentType: 'video/mp4',
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
        error: uploadResult.error || 'Failed to upload preview video',
      }
    }

    if (onProgress) {
      onProgress(100)
    }

    return {
      success: true,
      previewPath: previewKey,
      previewSize: transcodedBuffer.length,
    }
  } catch (error) {
    // Clean up temp file on error
    try {
      await unlink(tempOutputPath)
    } catch {
      // Ignore cleanup errors
    }

    console.error('Failed to transcode video:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to transcode video',
    }
  }
}

/**
 * Get video information
 */
async function getVideoInfo(videoPath: string): Promise<{
  width: number
  height: number
  duration: number
  bitrate: number
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
        bitrate: metadata.format.bit_rate || 0,
      })
    })
  })
}

/**
 * Process video: generate thumbnail and preview
 */
export async function processVideo(
  videoPath: string,
  eventId: string,
  mediaId: string,
  onProgress?: (stage: 'thumbnail' | 'transcode', percent: number) => void
): Promise<{
  thumbnailResult: { success: boolean; thumbnailPath?: string; thumbnailSize?: number; error?: string }
  transcodeResult: TranscodeResult
  metadata: { width: number; height: number; duration: number }
}> {
  const { generateVideoThumbnail, getVideoMetadata } = await import('./thumbnail-generator')

  // Get metadata first
  const metadata = await getVideoMetadata(videoPath)

  // Generate thumbnail
  onProgress?.('thumbnail', 0)
  const thumbnailResult = await generateVideoThumbnail(videoPath, eventId, mediaId)
  onProgress?.('thumbnail', 100)

  // Transcode to preview
  onProgress?.('transcode', 0)
  const transcodeResult = await transcodeVideoToPreview(
    videoPath,
    eventId,
    mediaId,
    (percent) => onProgress?.('transcode', percent)
  )

  return {
    thumbnailResult,
    transcodeResult,
    metadata,
  }
}

