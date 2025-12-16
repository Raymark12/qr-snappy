'use client'

import { useState, useCallback, useRef } from 'react'
import axios, { AxiosProgressEvent, CancelTokenSource } from 'axios'

export interface UploadProgress {
  fileIndex: number
  fileName: string
  fileSize: number
  status: 'queued' | 'uploading' | 'processing' | 'complete' | 'error' | 'cancelled'
  progress: number // 0-100
  uploadedBytes: number
  speed: number // bytes per second
  timeRemaining: number // seconds
  error?: string
}

export interface UploadFile {
  file: File
  index: number
}

interface UseAxiosUploadOptions {
  onProgress?: (progress: UploadProgress[]) => void
  onComplete?: (results: Array<{ success: boolean; fileIndex: number; error?: string }>) => void
  onFileSuccess?: (file: File, fileIndex: number) => Promise<void>
}

export function useAxiosUpload(options?: UseAxiosUploadOptions) {
  const [uploads, setUploads] = useState<UploadProgress[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const cancelTokensRef = useRef<Map<number, CancelTokenSource>>(new Map())
  const startTimesRef = useRef<Map<number, number>>(new Map())

  const updateProgress = useCallback((fileIndex: number, updates: Partial<UploadProgress>) => {
    setUploads(prev => {
      const newUploads = prev.map(upload =>
        upload.fileIndex === fileIndex ? { ...upload, ...updates } : upload
      )
      options?.onProgress?.(newUploads)
      return newUploads
    })
  }, [options])

  const uploadSingleFile = useCallback(async (
    file: File,
    uploadUrl: string,
    fileIndex: number
  ): Promise<{ success: boolean; fileIndex: number; error?: string }> => {
    const cancelSource = axios.CancelToken.source()
    cancelTokensRef.current.set(fileIndex, cancelSource)
    startTimesRef.current.set(fileIndex, Date.now())

    let lastLoaded = 0
    let lastTime = Date.now()

    try {
      updateProgress(fileIndex, {
        status: 'uploading',
        progress: 0,
        uploadedBytes: 0,
        speed: 0,
        timeRemaining: 0,
      })

      await axios.put(uploadUrl, file, {
        headers: {
          'Content-Type': file.type,
        },
        cancelToken: cancelSource.token,
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          const now = Date.now()
          const timeDiff = (now - lastTime) / 1000 // seconds
          const loaded = progressEvent.loaded || 0
          const total = progressEvent.total || file.size
          const bytesDiff = loaded - lastLoaded

          // Calculate speed (bytes per second)
          const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0

          // Calculate time remaining
          const remaining = total - loaded
          const timeRemaining = speed > 0 ? remaining / speed : 0

          // Calculate progress percentage
          const progress = total > 0 ? Math.round((loaded / total) * 100) : 0

          updateProgress(fileIndex, {
            progress,
            uploadedBytes: loaded,
            speed,
            timeRemaining,
          })

          lastLoaded = loaded
          lastTime = now
        },
      })

      updateProgress(fileIndex, {
        status: 'complete',
        progress: 100,
        uploadedBytes: file.size,
        speed: 0,
        timeRemaining: 0,
      })

      cancelTokensRef.current.delete(fileIndex)
      startTimesRef.current.delete(fileIndex)

      return { success: true, fileIndex }
    } catch (error) {
      if (axios.isCancel(error)) {
        updateProgress(fileIndex, {
          status: 'cancelled',
          error: 'Upload cancelled',
        })
        return { success: false, fileIndex, error: 'Upload cancelled' }
      }

      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      updateProgress(fileIndex, {
        status: 'error',
        error: errorMessage,
      })

      cancelTokensRef.current.delete(fileIndex)
      startTimesRef.current.delete(fileIndex)

      return { success: false, fileIndex, error: errorMessage }
    }
  }, [updateProgress])

  const uploadFiles = useCallback(async (
    files: UploadFile[],
    getUploadUrl: (file: File, index: number) => Promise<string>
  ) => {
    setIsUploading(true)

    const initialProgress: UploadProgress[] = files.map(({ file, index }) => ({
      fileIndex: index,
      fileName: file.name,
      fileSize: file.size,
      status: 'queued' as const,
      progress: 0,
      uploadedBytes: 0,
      speed: 0,
      timeRemaining: 0,
    }))
    setUploads(initialProgress)
    options?.onProgress?.(initialProgress)

    const results: Array<{ success: boolean; fileIndex: number; error?: string }> = []

    try {
      // Upload files sequentially
      for (const { file, index } of files) {
        const uploadUrl = await getUploadUrl(file, index)

        const result = await uploadSingleFile(file, uploadUrl, index)

        if (result.success && options?.onFileSuccess) {
          updateProgress(index, { status: 'processing' })
          try {
            await options.onFileSuccess(file, index)
            updateProgress(index, { status: 'complete' })
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Processing failed'
            updateProgress(index, { status: 'error', error: errorMessage })
            result.success = false
            result.error = errorMessage
          }
        }

        results.push(result)

        if (result.error === 'Upload cancelled') {
          break
        }
      }
    } catch (error) {
      console.error('Upload batch error:', error)
    } finally {
      setIsUploading(false)
      options?.onComplete?.(results)
    }

    return results
  }, [uploadSingleFile, updateProgress, options])

  const cancelUpload = useCallback((fileIndex: number) => {
    const cancelToken = cancelTokensRef.current.get(fileIndex)
    if (cancelToken) {
      cancelToken.cancel('Upload cancelled by user')
      cancelTokensRef.current.delete(fileIndex)
      startTimesRef.current.delete(fileIndex)
    }
  }, [])

  const cancelAllUploads = useCallback(() => {
    cancelTokensRef.current.forEach((cancelToken) => {
      cancelToken.cancel('All uploads cancelled by user')
    })
    cancelTokensRef.current.clear()
    startTimesRef.current.clear()
    setIsUploading(false)
  }, [])

  const reset = useCallback(() => {
    setUploads([])
    cancelAllUploads()
  }, [cancelAllUploads])

  return {
    uploads,
    isUploading,
    uploadFiles,
    uploadSingleFile,
    cancelUpload,
    cancelAllUploads,
    reset,
  }
}

/**
 * Format bytes
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

/**
 * Format seconds
 */
export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '--'

  if (seconds < 60) {
    return `${Math.round(seconds)}s`
  }

  const minutes = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)

  return `${minutes}m ${secs}s`
}

/**
 * Format speed
 */
export function formatSpeed(bytesPerSecond: number): string {
  return `${formatBytes(bytesPerSecond)}/s`
}

