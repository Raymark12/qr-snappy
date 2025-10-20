
import { useQuery, useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
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

async function uploadPhoto(
  eventId: string,
  data: { file: File; author?: string; comment?: string },
  publicMode = false
): Promise<{ success: boolean; id: string }> {
  const formData = new FormData()
  formData.append('file', data.file)
  if (data.author) formData.append('author', data.author)
  if (data.comment) formData.append('comment', data.comment)

  const endpoint = publicMode ? `/api/public/events/${eventId}/photos` : `/api/events/${eventId}/photos`
  const res = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Upload failed' }))
    throw new Error(error.error || 'Upload failed')
  }

  return res.json()
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

export function useUploadPhoto(eventId: string, publicMode = false) {
  const queryClient = useQueryClient()
  const queryKey = [...photoKeys.event(eventId), publicMode ? 'public' : 'private']

  return useMutation({
    mutationFn: (data: { file: File; author?: string; comment?: string }) =>
      uploadPhoto(eventId, data, publicMode),
    onMutate: async (uploadData) => {
      await queryClient.cancelQueries({ queryKey })

      const previousPhotos = queryClient.getQueryData<Photo[]>(queryKey)

      if (!publicMode && previousPhotos) {
        const optimisticPhoto: Photo = {
          id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
          event_id: eventId,
          user_email: null,
          file_path: '',
          file_name: uploadData.file.name,
          author: uploadData.author || null,
          comment: uploadData.comment || null,
          status: 'pending',
          uploaded_at: new Date().toISOString(),
          reviewed_at: null,
          reviewed_by: null,
        }

        queryClient.setQueryData<Photo[]>(
          queryKey,
          [optimisticPhoto, ...previousPhotos]
        )
      }

      return { previousPhotos }
    },

    onError: (_err, _uploadData, context) => {

      if (context?.previousPhotos) {
        queryClient.setQueryData(queryKey, context.previousPhotos)
      }
    },
    onSuccess: async (data) => {
      if (data.id) {
        // In public mode, just invalidate since pending photos won't show up
        if (publicMode) {
          queryClient.invalidateQueries({ queryKey })
          return
        }

        try {
          const updatedPhotos = await fetchEventPhotos(eventId, publicMode)
          const currentPhotos = queryClient.getQueryData<Photo[]>(queryKey)

          if (currentPhotos && updatedPhotos) {
            const optimisticIndex = currentPhotos.findIndex((p) => p.id.startsWith('temp-'))
            if (optimisticIndex !== -1) {
              const realPhoto = updatedPhotos.find((p) => p.id === data.id)
              if (realPhoto) {
                const newPhotos = [...currentPhotos]
                newPhotos[optimisticIndex] = realPhoto
                queryClient.setQueryData(queryKey, newPhotos)
              } else {
                queryClient.setQueryData(queryKey, updatedPhotos)
              }
            } else {
              queryClient.setQueryData(queryKey, updatedPhotos)
            }
          }
        } catch (error) {
          console.error('Failed to update photo after upload:', error)
          queryClient.invalidateQueries({ queryKey })
        }
      }
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


async function deletePhotoFunction(eventId: string, photoId: string): Promise<{ success: boolean }> {
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
    mutationFn: (photoId: string) => deletePhotoFunction(eventId, photoId),
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
    },
  })
}

