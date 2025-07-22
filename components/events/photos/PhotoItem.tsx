'use client'

import { useState, useEffect } from 'react'
import { Box, CircularProgress, IconButton, Tooltip } from '@mui/material'
import Image from 'next/image'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import DownloadIcon from '@mui/icons-material/Download'
import type { Photo } from '@/types'
import { getAuthenticatedImageUrl } from '@/lib/utils/storage'

interface PhotoItemProps {
  photo: Photo
  onClick?: () => void
}

export default function PhotoItem({ photo, onClick }: PhotoItemProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAuthenticatedImageUrl(photo.file_path)
      .then((url) => {
        setImageUrl(url)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to get image URL:', err)
        setImageError(true)
        setLoading(false)
      })
  }, [photo.file_path])

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const url = await getAuthenticatedImageUrl(photo.file_path)
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = blobUrl
      link.download = photo.file_name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  if (loading) {
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
          <Box
            sx={{
              fontSize: 10,
              color: 'text.secondary',
              textAlign: 'center',
              mt: 0.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              width: '100%',
              px: 1,
            }}
          >
            {photo.file_name}
          </Box>
        </Box>
      </Box>
    )
  }

  return (
    <Box
      onClick={onClick}
      sx={{
        position: 'relative',
        width: '100%',
        paddingBottom: '100%',
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'grey.100',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover .image': {
          transform: 'scale(1.05)',
        },
        '&:hover .overlay': {
          opacity: 1,
        },
      }}
    >
      <Box sx={{ position: 'absolute', inset: 0 }}>
        <Image
          src={imageUrl}
          alt={photo.file_name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
          style={{ objectFit: 'cover', transition: 'transform 0.3s ease' }}
          className="image"
          unoptimized
          onError={() => {
            console.error('Failed to load image:', imageUrl)
            setImageError(true)
          }}
        />
      </Box>
      <Tooltip title="Download photo" placement="top">
        <IconButton
          onClick={handleDownload}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            bgcolor: 'rgba(0,0,0,0.6)',
            color: 'white',
            zIndex: 10,
            opacity: 0,
            transition: 'opacity 0.3s ease',
            '.MuiBox-root:hover &': {
              opacity: 1,
            },
            '&:hover': {
              bgcolor: 'rgba(0,0,0,0.8)',
            },
          }}
          size="small"
        >
          <DownloadIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      {photo.status === 'pending' && (
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
      <Box
        className="overlay"
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
          p: 1,
          opacity: 0,
          transition: 'opacity 0.3s ease',
          zIndex: 10,
        }}
      >
        <Box
          sx={{
            color: 'white',
            fontSize: 11,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {photo.file_name}
        </Box>
      </Box>
    </Box>
  )
}
