
import { useQuery, useMutation, useQueryClient, useInfiniteQuery, type UseMutationResult } from '@tanstack/react-query'
import type { Photo } from '@/types'
import { QUERY } from '@/lib/constants'
import { apiGet, apiPost, apiDelete } from '@/lib/utils/api-client'

export const photoKeys = {
  all: ['photos'] as const,
  event: (eventId: string) => [...photoKeys.all, 'event', eventId] as const,
}

export type PhotoMutationContext = {
  previousPhotos: Photo[] | undefined
}

async function fetchEventPhotos(eventId: string, publicMode = false): Promise<Photo[]> {
  const endpoint = publicMode ? `/api/public/events/${eventId}/photos` : `/api/events/${eventId}/photos`
  return apiGet<Photo[]>(endpoint)
}

async function fetchEventPhotosPaginated(
  eventId: string,
  cursor: string | null,
  pageSize: number,
  publicMode = false
): Promise<{ data: Photo[]; hasMore: boolean; nextCursor: string | null }> {
  const endpoint = publicMode ? `/api/public/events/${eventId}/photos` : `/api/events/${eventId}/photos`
  const params = new URLSearchParams()
  if (cursor) params.set('cursor', cursor)
  params.set('limit', pageSize.toString())

  const url = `${endpoint}?${params.toString()}`
  return apiGet<{ data: Photo[]; hasMore: boolean; nextCursor: string | null }>(url)
}

export async function getUploadUrl(eventId: string, filename: string, contentType: string, publicMode = false) {
  const endpoint = publicMode ? `/api/public/events/${eventId}/photos/upload-url` : `/api/events/${eventId}/photos/upload-url`
  return apiPost<{ success: boolean; uploadUrl: string; filePath: string; fileName: string; userEmail?: string }>(endpoint, {
    fileName: filename,
    contentType,
  })
}

async function uploadToR2(uploadUrl: string, file: File, onProgress?: (progress: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = (event.loaded / event.total) * 100
        onProgress(progress)
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`))
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'))
    })

    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.send(file)
  })
}

export async function completeUpload(
  eventId: string,
  filePath: string,
  fileName: string,
  author: string | null,
  comment: string | null,
  publicMode = false
): Promise<{ success: boolean; id: string }> {
  const endpoint = publicMode ? `/api/public/events/${eventId}/photos/complete-upload` : `/api/events/${eventId}/photos/complete-upload`
  return apiPost<{ success: boolean; id: string }>(endpoint, {
    filePath,
    fileName,
    author,
    comment,
  })
}

async function uploadPhoto(
  eventId: string,
  data: { file: File; author?: string; comment?: string },
  publicMode = false,
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; id: string }> {
  try {
    //Get pre-signed upload URL
    const urlResult = await getUploadUrl(eventId, data.file.name, data.file.type, publicMode)

    if (!urlResult.uploadUrl || !urlResult.filePath) {
      throw new Error('Failed to get upload URL')
    }

    //Upload file directly to R2
    await uploadToR2(urlResult.uploadUrl, data.file, onProgress)

    //Complete upload by saving metadata
    return await completeUpload(
      eventId,
      urlResult.filePath,
      urlResult.fileName || data.file.name,
      data.author || null,
      data.comment || null,
      publicMode
    )
  } catch (error) {
    console.error('Upload failed:', error)
    throw error
  }
}

export function useEventPhotos(eventId: string, publicMode = false, enabled = true) {
  return useQuery({
    queryKey: [...photoKeys.event(eventId), publicMode ? 'public' : 'private'],
    queryFn: () => fetchEventPhotos(eventId, publicMode),
    staleTime: QUERY.PHOTOS_STALE_TIME,
    refetchInterval: QUERY.PHOTOS_REFETCH_INTERVAL,
    refetchOnWindowFocus: false,
    enabled,
  })
}

export function useEventPhotosInfinite(eventId: string, publicMode = false, enabled = true, pageSize = 20) {
  return useInfiniteQuery({
    queryKey: [...photoKeys.event(eventId), publicMode ? 'public' : 'private', 'infinite'],
    queryFn: ({ pageParam }) => fetchEventPhotosPaginated(eventId, pageParam, pageSize, publicMode),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
    staleTime: QUERY.PHOTOS_STALE_TIME,
    refetchInterval: QUERY.PHOTOS_REFETCH_INTERVAL,
    refetchOnWindowFocus: false,
    enabled,
  })
}

export function useUploadPhoto(eventId: string, publicMode = false, onProgress?: (progress: number) => void) {
  const queryClient = useQueryClient()
  const queryKey = [...photoKeys.event(eventId), publicMode ? 'public' : 'private']

  return useMutation({
    mutationFn: (data: { file: File; author?: string; comment?: string }) =>
      uploadPhoto(eventId, data, publicMode, onProgress),
    onSuccess: () => {
      // Simply invalidate the cache to refetch the latest data
      queryClient.invalidateQueries({ queryKey })
    },
    onError: () => {
      // Invalidate on error to ensure data consistency
      queryClient.invalidateQueries({ queryKey })
    },
  })
}

async function approvePhoto(eventId: string, photoId: string): Promise<{ success: boolean }> {
  return apiPost<{ success: boolean }>(`/api/events/${eventId}/photos/${photoId}/approve`)
}

async function rejectPhoto(eventId: string, photoId: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/api/events/${eventId}/photos/${photoId}`)
}

export function useApprovePhoto(eventId: string): UseMutationResult<
  { success: boolean },
  Error,
  string,
  PhotoMutationContext
> {

  const queryClient = useQueryClient()

  return useMutation<
    { success: boolean },
    Error,
    string,
    PhotoMutationContext
  >({

    mutationFn: (photoId: string) => approvePhoto(eventId, photoId),

    onMutate: async (photoId) => {

      await queryClient.cancelQueries({ queryKey: photoKeys.event(eventId) })

      const previousPhotos = queryClient.getQueryData<Photo[]>(photoKeys.event(eventId))

      if (previousPhotos) {
        queryClient.setQueryData<Photo[]>(
          photoKeys.event(eventId),
          previousPhotos.map((photo) =>
            photo.id === photoId
              ? {
                ...photo,
                status: 'approved' as const,
                reviewed_at: new Date().toISOString(),
              }
              : photo
          )
        )
      }

      return { previousPhotos }
    },
    onError: (_err, _photoId, context) => {
      if (context?.previousPhotos) {
        queryClient.setQueryData(photoKeys.event(eventId), context.previousPhotos)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: photoKeys.event(eventId) })
    },
  })
}


async function deletePhoto(eventId: string, photoId: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/api/events/${eventId}/photos/${photoId}`)
}

export function useDeletePhoto(eventId: string): UseMutationResult<
  { success: boolean },
  Error,
  string,
  PhotoMutationContext
> {
  const queryClient = useQueryClient()

  return useMutation<
    { success: boolean },
    Error,
    string,
    PhotoMutationContext
  >({
    mutationFn: (photoId: string) => deletePhoto(eventId, photoId),
    onMutate: async (photoId) => {
      await queryClient.cancelQueries({ queryKey: photoKeys.event(eventId) })

      const previousPhotos = queryClient.getQueryData<Photo[]>(photoKeys.event(eventId))

      if (previousPhotos) {
        queryClient.setQueryData<Photo[]>(
          photoKeys.event(eventId),
          previousPhotos.filter((photo) => photo.id !== photoId)
        )
      }

      return { previousPhotos }
    },
    onError: (_err, _photoId, context) => {
      if (context?.previousPhotos) {
        queryClient.setQueryData(photoKeys.event(eventId), context.previousPhotos)
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: photoKeys.event(eventId) })
    },
  })
}

export function useRejectPhoto(eventId: string): UseMutationResult<
  { success: boolean },
  Error,
  string,
  PhotoMutationContext
> {

  const queryClient = useQueryClient()

  return useMutation<
    { success: boolean },
    Error,
    string,
    PhotoMutationContext
  >({

    mutationFn: (photoId: string) => rejectPhoto(eventId, photoId),

    onMutate: async (photoId) => {
      await queryClient.cancelQueries({ queryKey: photoKeys.event(eventId) })

      const previousPhotos = queryClient.getQueryData<Photo[]>(photoKeys.event(eventId))

      if (previousPhotos) {
        queryClient.setQueryData<Photo[]>(
          photoKeys.event(eventId),
          previousPhotos.filter((photo) => photo.id !== photoId)
        )
      }

      return { previousPhotos }
    },
    onError: (_err, _photoId, context) => {
      if (context?.previousPhotos) {
        queryClient.setQueryData(photoKeys.event(eventId), context.previousPhotos)
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: photoKeys.event(eventId) })
    },
  })
}

