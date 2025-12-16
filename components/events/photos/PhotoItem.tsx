'use client'

import { useState, useEffect, useMemo } from 'react'
import { Box, CircularProgress, IconButton, Tooltip, Button, Chip } from '@mui/material'
import Image from 'next/image'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import DownloadIcon from '@mui/icons-material/Download'
import DeleteIcon from '@mui/icons-material/Delete'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import type { Media } from '@/types'
import { getImageUrl } from '@/lib/actions/image-url'
import { useIsEventModerator, useIsAdmin } from '@/hooks/useAuth'
import { usePhotoActions } from '@/hooks/usePhotoActions'
import { isVideoFileName } from '@/lib/utils/file-validation'
import { useLazyImage } from '@/hooks/useLazyImage'
import { useMediaUrl } from '@/hooks/useMediaUrl'
import ConfirmDialog from './ConfirmDialog'

interface PhotoItemProps {
  photo: Media
  eventId: string
  onClick?: () => void
  priority?: boolean
  publicMode?: boolean
}

export default function PhotoItem({
  photo,
  eventId,
  onClick,
  priority = false,
  publicMode = false,
}: PhotoItemProps) {
  const [imageError, setImageError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [useVideoFallback, setUseVideoFallback] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [confirmDialogType, setConfirmDialogType] = useState<'reject' | 'delete'>('reject')
  const isModerator = useIsEventModerator(eventId)
  const isAdmin = useIsAdmin()
  const canModerate = isModerator || isAdmin
  const showApproveReject = canModerate && photo.status === 'pending'
  const showDelete = canModerate

  const { approvePhoto, rejectPhoto, deletePhoto } = usePhotoActions(eventId)

  const { elementRef, isInView } = useLazyImage({
    onLoad: () => setLoading(false),
    onError: () => {
      setImageError(true)
      setLoading(false)
    },
  })

  const hasValidFilePath = useMemo(
    () => Boolean(photo.file_path && photo.file_path !== ''),
    [photo.file_path]
  )

  const hasThumbnail = useMemo(
    () => photo.thumbnail_path && photo.thumbnail_path !== '',
    [photo.thumbnail_path]
  )

  const isVideo = useMemo(
    () => photo.media_type === 'video' || isVideoFileName(photo.file_name),
    [photo.media_type, photo.file_name]
  )

  const stopEventPropagation = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    if (!('touches' in e.nativeEvent)) {
      e.preventDefault()
    }
  }

  const pathToLoad = hasThumbnail && !useVideoFallback ? photo.thumbnail_path! : photo.file_path

  const {
    data: mediaUrl,
    isLoading: isUrlLoading,
    isError: isUrlError,
  } = useMediaUrl(pathToLoad, {
    enabled: isInView && hasValidFilePath,
    publicMode,
    eventId,
  })

  useEffect(() => {
    if (isUrlError) {
      if (hasThumbnail && !useVideoFallback) {
        setUseVideoFallback(true)
      } else {
        setImageError(true)
        setLoading(false)
      }
    }
  }, [isUrlError, hasThumbnail, useVideoFallback])

  // Reset loading when URL changes
  useEffect(() => {
    if (mediaUrl) {
      setLoading(true)
      setImageError(false)
    }
  }, [mediaUrl])

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!hasValidFilePath) {
      return
    }
    try {
      const url = await getImageUrl(photo.file_path, { publicMode, eventId })
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = blobUrl
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
    } catch (error) {
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
        await deletePhoto.mutateAsync(photo.id)
      }
    } catch (error) {
      console.error(`Failed to ${confirmDialogType} photo:`, error)
    }
  }

  // Format file size for display
  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return null
    const mb = bytes / (1024 * 1024)
    if (mb < 1) return `${(bytes / 1024).toFixed(0)} KB`
    return `${mb.toFixed(1)} MB`
  }

  const fileSizeLabel = formatFileSize(photo.file_size)

  if (!isInView || isUrlLoading || (loading && !mediaUrl) || !hasValidFilePath) {
    return (
      <Box
        ref={elementRef as React.RefObject<HTMLDivElement>}
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
          {loading && <CircularProgress size={32} />}
        </Box>
      </Box>
    )
  }

  if (imageError || isUrlError || !mediaUrl) {
    return (
      <Box
        ref={elementRef as React.RefObject<HTMLDivElement>}
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
      ref={elementRef as React.RefObject<HTMLDivElement>}
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
          cursor: mediaUrl && hasValidFilePath ? 'pointer' : 'default',
        }}
        onClick={() => {
          if (mediaUrl && hasValidFilePath) {
            onClick?.()
          }
        }}
      >
        {isVideo ? (
          hasThumbnail && !useVideoFallback ? (
            <Image
              src={mediaUrl}
              alt="Video thumbnail"
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
              onLoad={() => setLoading(false)}
              onError={() => {
                console.warn('Failed to load video thumbnail, falling back to video:', mediaUrl)
                setUseVideoFallback(true)
              }}
            />
          ) : (
            <video
              src={mediaUrl || undefined}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transition: 'transform 0.3s ease-out',
                willChange: 'transform',
              }}
              className="image"
              muted
              playsInline
              onLoadedData={() => setLoading(false)}
              onError={() => {
                console.error('Failed to load video:', mediaUrl)
                setImageError(true)
                setLoading(false)
              }}
            />
          )
        ) : (
          <Image
            src={mediaUrl}
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
            onLoad={() => setLoading(false)}
            onError={() => {
              console.error('Failed to load image:', mediaUrl)
              setImageError(true)
              setLoading(false)
            }}
          />
        )}

        {isVideo && (
          <Box
            className="video-overlay"
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(0, 0, 0, 0.3)',
              opacity: 0,
              transition: 'opacity 0.3s ease-out',
              '&:hover': {
                opacity: 1,
              },
            }}
          >
            <PlayArrowIcon sx={{ fontSize: 48, color: 'white' }} />
          </Box>
        )}
      </Box>

      {fileSizeLabel && (
        <Chip
          label={fileSizeLabel}
          size="small"
          sx={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            height: 20,
            fontSize: 10,
            bgcolor: 'rgba(0,0,0,0.7)',
            color: 'white',
            '& .MuiChip-label': {
              px: 1,
            },
          }}
        />
      )}
      {hasValidFilePath && (
        <Tooltip title={`Download ${isVideo ? 'video' : 'photo'}`} placement="top">
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
            gap: 0,
            p: 0,
            bgcolor: 'transparent',
            opacity: 1,
            zIndex: 15,
            overflow: 'hidden',
            borderBottomLeftRadius: 2,
            borderBottomRightRadius: 2,
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
              height: 28,
              minHeight: 28,
              maxHeight: 28,
              fontSize: 10,
              px: 1,
              py: 0.5,
              textTransform: 'none',
              fontWeight: 500,
              borderRadius: 0,
              borderBottomLeftRadius: 2,
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
              height: 28,
              minHeight: 28,
              maxHeight: 28,
              fontSize: 10,
              px: 1,
              py: 0.5,
              textTransform: 'none',
              fontWeight: 500,
              borderRadius: 0,
              borderBottomRightRadius: 2,
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
