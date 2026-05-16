'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiPost } from '@/lib/utils/api-client'
import { r2PutObjectContentType } from '@/lib/utils/file-validation'
import type { Photo } from '@/types'

export interface UploadUrlResponse {
  uploadUrl: string
  key: string
  userEmail: string
}

export interface BatchUploadUrlsResponse {
  uploads: Array<{
    uploadUrl: string
    key: string
    fileIndex: number
  }>
  userEmail: string
}

export interface CompleteUploadRequest {
  filePath: string
  fileName: string
  author?: string
  comment?: string
  userEmail?: string
  publicMode?: boolean
}

export interface UploadPhotoRequest {
  eventId: string
  file: File
  author?: string
  comment?: string
}

export interface UploadPhotosBatchRequest {
  eventId: string
  files: File[]
  author?: string
  comment?: string
}

/**
 * Hook to get upload URL for a single file
 */
export function useGetUploadUrl() {
  return useMutation({
    mutationFn: async ({ eventId, fileName, contentType }: {
      eventId: string
      fileName: string
      contentType: string
    }): Promise<UploadUrlResponse> => {
      const response = await apiPost<UploadUrlResponse>(`/api/events/${eventId}/photos/upload-url`, {
        fileName,
        contentType,
      })
      return response
    },
  })
}

/**
 * Hook to get batch upload URLs
 */
export function useGetBatchUploadUrls() {
  return useMutation({
    mutationFn: async ({ eventId, files }: {
      eventId: string
      files: Array<{ name: string; type: string }>
    }): Promise<BatchUploadUrlsResponse> => {
      const response = await apiPost<BatchUploadUrlsResponse>(`/api/events/${eventId}/photos/batch-upload-urls`, {
        files,
      })
      return response
    },
  })
}

/**
 * Hook to complete upload after file is uploaded to R2
 */
export function useCompleteUpload() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      eventId,
      filePath,
      fileName,
      author,
      comment,
      userEmail,
      publicMode = false,
    }: CompleteUploadRequest & { eventId: string }): Promise<Photo> => {
      const response = await apiPost(
        publicMode
          ? `/api/public/events/${eventId}/photos/complete-upload`
          : `/api/events/${eventId}/photos/complete-upload`,
        {
          filePath,
          fileName,
          author,
          comment,
          userEmail,
        }
      )
      return response as Photo
    },
    onSuccess: () => {
      // Invalidate and refetch photos
      queryClient.invalidateQueries({ queryKey: ['photos'] })
    },
  })
}

/**
 * Hook to upload a single photo
 */
export function useUploadPhoto() {
  const getUploadUrl = useGetUploadUrl()
  const completeUpload = useCompleteUpload()

  return useMutation({
    mutationFn: async ({ eventId, file, author, comment }: UploadPhotoRequest): Promise<Photo> => {
      // Get upload URL
      const urlResult = await getUploadUrl.mutateAsync({
        eventId,
        fileName: file.name,
        contentType: r2PutObjectContentType(file),
      })

      const uploadResponse = await fetch(urlResult.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': r2PutObjectContentType(file),
        },
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to storage')
      }

      const photo = await completeUpload.mutateAsync({
        eventId,
        filePath: urlResult.key,
        fileName: file.name,
        author,
        comment,
        userEmail: urlResult.userEmail,
      })

      return photo
    },
  })
}

/**
 * Hook to upload multiple photos in batch
 */
export function useUploadPhotosBatch() {
  const getBatchUploadUrls = useGetBatchUploadUrls()
  const completeUpload = useCompleteUpload()

  return useMutation({
    mutationFn: async ({ eventId, files, author, comment }: UploadPhotosBatchRequest): Promise<Array<{ success: boolean; id?: string; error?: string; fileIndex: number }>> => {
      const results: Array<{ success: boolean; id?: string; error?: string; fileIndex: number }> = []

      try {
        const urlResult = await getBatchUploadUrls.mutateAsync({
          eventId,
          files: files.map(file => ({ name: file.name, type: r2PutObjectContentType(file) })),
        })

        const uploadPromises = urlResult.uploads.map(async (upload, index) => {
          try {
            const file = files[index]
            const response = await fetch(upload.uploadUrl, {
              method: 'PUT',
              body: file,
              headers: {
                'Content-Type': r2PutObjectContentType(file),
              },
            })

            if (!response.ok) {
              throw new Error('Failed to upload file to storage')
            }

            const photo = await completeUpload.mutateAsync({
              eventId,
              filePath: upload.key,
              fileName: file.name,
              author,
              comment,
              userEmail: urlResult.userEmail,
            })

            return { success: true, id: photo.id, fileIndex: index }
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Upload failed',
              fileIndex: index,
            }
          }
        })

        const uploadResults = await Promise.all(uploadPromises)
        results.push(...uploadResults)

      } catch (error) {
        results.push(...files.map((_, index) => ({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get upload URLs',
          fileIndex: index,
        })))
      }

      return results
    },
  })
}

/**
 * Hook to upload photo via direct API (legacy method)
 */
export function useUploadPhotoDirect() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      eventId,
      file,
      author,
      comment,
      publicMode = false,
    }: UploadPhotoRequest & { publicMode?: boolean }): Promise<Photo> => {
      const formData = new FormData()
      formData.append('file', file)
      if (author) formData.append('author', author)
      if (comment) formData.append('comment', comment)

      const response = await apiPost(
        publicMode ? `/api/public/events/${eventId}/photos` : `/api/events/${eventId}/photos`,
        formData
      )
      return response as Photo
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos'] })
    },
  })
}