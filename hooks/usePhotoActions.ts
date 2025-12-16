'use client'

import { useApprovePhoto, useRejectPhoto, useDeletePhoto } from './usePhotos'
import { useToastStore } from '@/stores/toastStore'
import { TOAST_MESSAGES } from '@/lib/constants'

/**
 * Custom hook that wraps photo mutations with toast notifications
 */
export function usePhotoActions(eventId: string) {
  const showToast = useToastStore((state) => state.showToast)
  const approveMutation = useApprovePhoto(eventId)
  const rejectMutation = useRejectPhoto(eventId)
  const deleteMutation = useDeletePhoto(eventId)

  const approvePhoto = {
    ...approveMutation,
    mutateAsync: async (photoId: string) => {
      try {
        await approveMutation.mutateAsync(photoId)
        showToast(TOAST_MESSAGES.MEDIA_APPROVED, 'success')
      } catch (error) {
        showToast(TOAST_MESSAGES.MEDIA_APPROVED_ERROR, 'error')
        throw error
      }
    },
  }

  const rejectPhoto = {
    ...rejectMutation,
    mutateAsync: async (photoId: string) => {
      try {
        await rejectMutation.mutateAsync(photoId)
        showToast(TOAST_MESSAGES.MEDIA_REJECTED, 'success')
      } catch (error) {
        showToast(TOAST_MESSAGES.MEDIA_REJECTED_ERROR, 'error')
        throw error
      }
    },
  }

  const deletePhoto = {
    ...deleteMutation,
    mutateAsync: async (photoId: string) => {
      try {
        await deleteMutation.mutateAsync(photoId)
        showToast(TOAST_MESSAGES.MEDIA_DELETED, 'success')
      } catch (error) {
        showToast(TOAST_MESSAGES.MEDIA_DELETED_ERROR, 'error')
        throw error
      }
    },
  }

  return {
    approvePhoto,
    rejectPhoto,
    deletePhoto,
  }
}

