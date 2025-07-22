import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Photo } from '@/types'
import { QUERY } from '@/lib/constants'

export const photoKeys = {
  all: ['photos'] as const,
  event: (eventId: string) => [...photoKeys.all, 'event', eventId] as const,
}

async function fetchEventPhotos(eventId: string): Promise<Photo[]> {
  const res = await fetch(`/api/events/${eventId}/photos`)
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to fetch photos' }))
    throw new Error(error.error || 'Failed to fetch photos')
  }
  return res.json()
}

async function uploadPhoto(
  eventId: string,
  data: { file: File; author?: string; comment?: string }
): Promise<{ success: boolean; id: string }> {
  const formData = new FormData()
  formData.append('file', data.file)
  if (data.author) formData.append('author', data.author)
  if (data.comment) formData.append('comment', data.comment)

  const res = await fetch(`/api/events/${eventId}/photos`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Upload failed' }))
    throw new Error(error.error || 'Upload failed')
  }

  return res.json()
}

export function useEventPhotos(eventId: string) {
  return useQuery({
    queryKey: photoKeys.event(eventId),
    queryFn: () => fetchEventPhotos(eventId),
    staleTime: QUERY.PHOTOS_STALE_TIME,
    refetchInterval: QUERY.PHOTOS_REFETCH_INTERVAL,
  })
}

export function useUploadPhoto(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { file: File; author?: string; comment?: string }) =>
      uploadPhoto(eventId, data),
    onMutate: async (uploadData) => {
      await queryClient.cancelQueries({ queryKey: photoKeys.event(eventId) })

      const previousPhotos = queryClient.getQueryData<Photo[]>(photoKeys.event(eventId))

      if (previousPhotos) {
        const optimisticPhoto: Photo = {
          id: `temp-${Date.now()}`,
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
          photoKeys.event(eventId),
          [optimisticPhoto, ...previousPhotos]
        )
      }

      return { previousPhotos }
    },
    onError: (_err, _uploadData, context) => {
      if (context?.previousPhotos) {
        queryClient.setQueryData(photoKeys.event(eventId), context.previousPhotos)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: photoKeys.event(eventId) })
    },
  })
}

