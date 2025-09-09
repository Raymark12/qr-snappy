'use client'

import { useState, useEffect, useMemo } from 'react'
import { Box, CircularProgress, IconButton, Tooltip, Button } from '@mui/material'
import Image from 'next/image'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import DownloadIcon from '@mui/icons-material/Download'
import DeleteIcon from '@mui/icons-material/Delete'
import type { Photo } from '@/types'
import { getAuthenticatedImageUrl } from '@/lib/utils/storage'
import { useIsEventModerator } from '@/hooks/useAuth'
import { usePhotoActions } from '@/hooks/usePhotoActions'
import ConfirmDialog from './ConfirmDialog'

interface PhotoItemProps {
  photo: Photo
  eventId: string
  onClick?: () => void
  priority?: boolean // For LCP optimization - set on first image above the fold
}

export default function PhotoItem({ photo, eventId, onClick, priority = false }: PhotoItemProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [confirmDialogType, setConfirmDialogType] = useState<'reject' | 'delete'>('reject')
  const isModerator = useIsEventModerator(eventId)
  const showApproveReject = isModerator && photo.status === 'pending'
  const showDelete = isModerator // Moderators (admin or assigned client) can delete any photo

  // Use usePhotoActions hook directly - no props needed!
  const { approvePhoto, rejectPhoto, deletePhoto } = usePhotoActions(eventId)

  // Helper: Check if photo has a valid file path (not optimistic photo during upload)
  const hasValidFilePath = useMemo(
    () => photo.file_path && photo.file_path !== '',
    [photo.file_path]
  )

  // Helper: Stop event propagation to prevent parent click handlers
  const stopEventPropagation = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    e.preventDefault()
  }

  useEffect(() => {
    // Skip loading if file_path is empty (optimistic photo during upload)
    if (!hasValidFilePath) {
      setLoading(false)
      setImageUrl(null)
      return
    }

    // Reset error state when file_path changes
    setImageError(false)
    setLoading(true)

    let cancelled = false

    // Use photo.file_path directly (we've already checked hasValidFilePath above)
    getAuthenticatedImageUrl(photo.file_path)
      .then(url => {
        if (!cancelled) {
          setImageUrl(url)
          setLoading(false)
        }
      })
      .catch(err => {
        if (!cancelled) {
          console.error('Failed to get image URL:', err)
          setImageError(true)
          setLoading(false)
        }
      })

    // Cleanup to prevent state updates if component unmounts or file_path changes
    return () => {
      cancelled = true
    }
    // Use photo.file_path directly (primitive value) - this is the actual dependency
    // hasValidFilePath is memoized from photo.file_path, so it will change when photo.file_path changes
    // We include both for clarity: hasValidFilePath for the check, photo.file_path for the actual value used
  }, [hasValidFilePath, photo.file_path])

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation()
    // Don't download if file_path is empty (optimistic photo)
    if (!hasValidFilePath) {
      return
    }
    try {
      const url = await getAuthenticatedImageUrl(photo.file_path)
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = blobUrl
      // Use generic filename for download (prevent inappropriate filenames)
      const extension = photo.file_name.split('.').pop() || 'jpg'
      link.download = `photo-${photo.id}.${extension}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  const handleApprove = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await approvePhoto.mutateAsync(photo.id)
      // Toast is handled automatically by usePhotoActions
    } catch (error) {
      // Error toast is handled automatically by usePhotoActions
      console.error('Failed to approve photo:', error)
    }
  }

  const handleRejectClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setConfirmDialogType('reject')
    setConfirmDialogOpen(true)
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setConfirmDialogType('delete')
    setConfirmDialogOpen(true)
  }

  const handleConfirm = async () => {
    setConfirmDialogOpen(false)
    try {
      if (confirmDialogType === 'reject') {
        await rejectPhoto.mutateAsync(photo.id)
      } else {
        // Delete photo - this will remove it from the array via optimistic update
        // The mutation will immediately update the cache, removing the photo
        await deletePhoto.mutateAsync(photo.id)
      }
      // Toast is handled automatically by usePhotoActions
    } catch (error) {
      // Error toast is handled automatically by usePhotoActions
      console.error(`Failed to ${confirmDialogType} photo:`, error)
    }
  }

  // Show loading or placeholder for optimistic photos (no file_path yet)
  if (loading || !hasValidFilePath) {
    return (
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          paddingBottom: '100%',
          borderRadius: 2,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'grey.50',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CircularProgress size={32} />
        </Box>
      </Box>
    )
  }

  if (imageError || !imageUrl) {
    return (
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          paddingBottom: '100%',
          borderRadius: 2,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'error.light',
          bgcolor: 'error.lighter',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 2,
          }}
        >
          <ErrorOutlineIcon sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
          <Box sx={{ fontSize: 11, color: 'error.main', textAlign: 'center', fontWeight: 500 }}>
            Failed to load
          </Box>
        </Box>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        paddingBottom: '100%',
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'grey.100',
        '&:hover .image': {
          transform: 'scale(1.05)',
        },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          cursor: imageUrl && hasValidFilePath ? 'pointer' : 'default',
        }}
        onClick={() => {
          if (imageUrl && hasValidFilePath) {
            onClick?.()
          }
        }}
      >
        <Image
          src={imageUrl}
          alt="Event photo"
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
          style={{
            objectFit: 'cover',
            transition: 'transform 0.3s ease-out',
            willChange: 'transform',
          }}
          className="image"
          unoptimized
          priority={priority}
          onError={() => {
            console.error('Failed to load image:', imageUrl)
            setImageError(true)
          }}
        />
      </Box>
      {hasValidFilePath && (
        <Tooltip title="Download photo" placement="top">
          <IconButton
            onClick={e => {
              stopEventPropagation(e)
              handleDownload(e)
            }}
            onMouseDown={stopEventPropagation}
            onTouchStart={stopEventPropagation}
            sx={{
              position: 'absolute',
              top: 8,
              right: showDelete ? 48 : 8,
              bgcolor: 'rgba(0,0,0,0.6)',
              color: 'white',
              zIndex: 15,
              '&:hover': {
                bgcolor: 'rgba(0,0,0,0.8)',
              },
            }}
            size="small"
          >
            <DownloadIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      {showDelete && (
        <Tooltip title="Delete photo" placement="top">
          <IconButton
            onClick={e => {
              stopEventPropagation(e)
              handleDeleteClick(e)
            }}
            onMouseDown={stopEventPropagation}
            onTouchStart={stopEventPropagation}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              bgcolor: 'rgba(0,0,0,0.6)',
              color: 'white',
              zIndex: 15,
              '&:hover': {
                bgcolor: 'rgba(211, 47, 47, 0.8)',
              },
            }}
            size="small"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      {isModerator && photo.status === 'pending' && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            bgcolor: 'warning.main',
            color: 'white',
            fontSize: 11,
            px: 1,
            py: 0.5,
            borderRadius: 1,
            boxShadow: 1,
            zIndex: 10,
          }}
        >
          Pending
        </Box>
      )}

      {showApproveReject && (
        <Box
          className="approve-reject-buttons"
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            display: 'flex',
            gap: 0.5,
            p: 0.5,
            bgcolor: 'rgba(0,0,0,0.7)',
            opacity: 0,
            transition: 'opacity 0.3s ease',
            zIndex: 15,
            '.MuiBox-root:hover &': {
              opacity: 1,
            },
            '@media (hover: none)': {
              opacity: 1,
            },
          }}
        >
          <Button
            variant="contained"
            color="approve"
            size="small"
            onClick={e => {
              stopEventPropagation(e)
              handleApprove(e)
            }}
            disabled={approvePhoto.isPending}
            sx={{
              flex: 1,
              minHeight: 32,
              fontSize: 11,
              px: 2,
              textTransform: 'none',
              fontWeight: 500,
            }}
          >
            {approvePhoto.isPending ? '...' : 'Approve'}
          </Button>
          <Button
            variant="contained"
            color="reject"
            size="small"
            onClick={e => {
              stopEventPropagation(e)
              handleRejectClick(e)
            }}
            disabled={rejectPhoto.isPending}
            sx={{
              flex: 1,
              minHeight: 32,
              fontSize: 11,
              px: 2,
              textTransform: 'none',
              fontWeight: 500,
            }}
          >
            {rejectPhoto.isPending ? '...' : 'Reject'}
          </Button>
        </Box>
      )}

      <ConfirmDialog
        open={confirmDialogOpen}
        title={confirmDialogType === 'reject' ? 'Reject Photo' : 'Delete Photo'}
        message={
          confirmDialogType === 'reject'
            ? 'Are you sure you want to reject this photo? It will be permanently deleted from the database and storage.'
            : 'Are you sure you want to delete this photo? It will be permanently deleted from the database and storage.'
        }
        confirmText={confirmDialogType === 'reject' ? 'Reject' : 'Delete'}
        cancelText="Cancel"
        severity="error"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmDialogOpen(false)}
      />
    </Box>
  )
}
