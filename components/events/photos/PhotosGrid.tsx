'use client'

import { useMemo, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Box, Typography } from '@mui/material'
import type { Photo } from '@/types'
import PhotoItem from './PhotoItem'
import PhotoGallery from './PhotoGallery'
import { getImageUrl } from '@/lib/actions/image-url'

interface PhotosGridProps {
  photos: Photo[]
  eventId: string
  publicMode?: boolean
}

export default function PhotosGrid({ photos, eventId, publicMode = false }: PhotosGridProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const photoIndexParam = searchParams.get('photo')

  const selectedIndex = useMemo(() => {
    if (photoIndexParam === null) return 0
    const index = parseInt(photoIndexParam, 10)
    if (isNaN(index) || index < 0 || index >= photos.length) return 0
    return index
  }, [photoIndexParam, photos.length])

  const galleryOpen = photoIndexParam !== null && selectedIndex < photos.length

  const buildUrl = useCallback(
    (photoIndex: number | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (photoIndex === null) {
        params.delete('photo')
      } else {
        params.set('photo', photoIndex.toString())
      }
      const queryString = params.toString()
      return queryString ? `${pathname}?${queryString}` : pathname
    },
    [searchParams, pathname]
  )

  const closeGallery = useCallback(() => {
    router.replace(buildUrl(null), { scroll: false })
  }, [router, buildUrl])

  const openGallery = useCallback(
    (index: number) => {
      if (index >= 0 && index < photos.length && photos[index]?.file_path) {
        router.push(buildUrl(index), { scroll: false })
      }
    },
    [photos, router, buildUrl]
  )

  const handleIndexChange = useCallback(
    (index: number) => {
      if (index >= 0 && index < photos.length) {
        router.replace(buildUrl(index), { scroll: false })
      }
    },
    [photos.length, router, buildUrl]
  )

  useEffect(() => {
    if (galleryOpen && (photos.length === 0 || selectedIndex >= photos.length)) {
      closeGallery()
    }
  }, [photos.length, galleryOpen, selectedIndex, closeGallery])

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
            key={`${photo.id}-${photo.file_path}-${photo.uploaded_at}`}
            photo={photo}
            eventId={eventId}
            priority={index === 0}
            publicMode={publicMode}
            onClick={() => {
              if (photo.file_path && photo.file_path !== '') {
                openGallery(index)
              }
            }}
          />
        ))}
      </Box>

      <PhotoGallery
        photos={photos}
        initialIndex={selectedIndex}
        open={galleryOpen}
        onClose={closeGallery}
        onIndexChange={handleIndexChange}
        getImageUrl={(path: string) => getImageUrl(path, { publicMode, eventId })}
      />
    </>
  )
}
