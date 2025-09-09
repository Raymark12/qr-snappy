'use client'

import { useState, useEffect } from 'react'
import { Box, Typography } from '@mui/material'
import type { Photo } from '@/types'
import PhotoItem from './PhotoItem'
import PhotoGallery from './PhotoGallery'
import { getAuthenticatedImageUrl } from '@/lib/utils/storage'

interface PhotosGridProps {
  photos: Photo[]
  eventId: string
}

export default function PhotosGrid({ photos, eventId }: PhotosGridProps) {
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    if (photos.length === 0) {
      if (galleryOpen) {
        setGalleryOpen(false)
      }
      setSelectedIndex(0)
    } else if (galleryOpen && selectedIndex >= photos.length) {
      setGalleryOpen(false)
      setSelectedIndex(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos.length])

  if (!photos.length) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          No photos yet.
        </Typography>
        <Typography variant="body2" color="text.disabled">
          Upload some photos to get started.
        </Typography>
      </Box>
    )
  }

  const handlePhotoClick = (index: number) => {
    if (index >= 0 && index < photos.length && photos[index]?.file_path) {
      setSelectedIndex(index)
      setGalleryOpen(true)
    }
  }

  return (
    <>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            sm: 'repeat(3, 1fr)',
            md: 'repeat(4, 1fr)',
            lg: 'repeat(5, 1fr)',
            xl: 'repeat(6, 1fr)',
          },
          gap: { xs: 1.5, md: 2 },
        }}
      >
        {photos.map((photo, index) => (
          <PhotoItem
            key={photo.id}
            photo={photo}
            eventId={eventId}
            priority={index === 0}
            onClick={() => {
              if (photo.file_path && photo.file_path !== '') {
                handlePhotoClick(index)
              }
            }}
          />
        ))}
      </Box>

      <PhotoGallery
        photos={photos}
        initialIndex={selectedIndex}
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        getImageUrl={getAuthenticatedImageUrl}
      />
    </>
  )
}
