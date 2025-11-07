'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiPost, apiDelete } from '@/lib/utils/api-client'
import type { Photo } from '@/types'

/**
 * Hook to approve a photo
 */
export function useApprovePhoto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ eventId, photoId }: { eventId: string; photoId: string }): Promise<Photo> => {
      const response = await apiPost<Photo>(`/api/events/${eventId}/photos/${photoId}/approve`, {})
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos'] })
    },
  })
}

/**
 * Hook to delete a photo
 */
export function useDeletePhoto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ eventId, photoId }: { eventId: string; photoId: string }): Promise<void> => {
      await apiDelete(`/api/events/${eventId}/photos/${photoId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos'] })
    },
  })
}

/**
 * Hook to reject a photo
 */
export function useRejectPhoto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ eventId, photoId }: { eventId: string; photoId: string }): Promise<void> => {
      await apiDelete(`/api/events/${eventId}/photos/${photoId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos'] })
    },
  })
}