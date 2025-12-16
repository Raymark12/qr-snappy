'use client'

import { useMemo, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Box, Typography, CircularProgress } from '@mui/material'
import type { Photo } from '@/types'
import PhotoItem from './PhotoItem'
import PhotoGallery from './PhotoGallery'
import { getImageUrl } from '@/lib/actions/image-url'
import { useEventPhotosInfinite } from '@/hooks/usePhotos'
import { MEDIA } from '@/lib/constants'

interface PhotosGridProps {
  photos?: Photo[]
  eventId: string
  publicMode?: boolean
  infiniteScroll?: boolean
}

export default function PhotosGrid({
  photos: propPhotos,
  eventId,
  publicMode = false,
  infiniteScroll = false,
}: PhotosGridProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const photoIndexParam = searchParams.get('photo')

  const infiniteQuery = useEventPhotosInfinite(
    eventId,
    publicMode,
    infiniteScroll,
    MEDIA.PAGINATION.DEFAULT_PAGE_SIZE
  )
  const allPhotos = useMemo(
    () =>
      infiniteScroll
        ? infiniteQuery.data?.pages.flatMap(page => page.data) || []
        : propPhotos || [],
    [infiniteScroll, infiniteQuery.data?.pages, propPhotos]
  )

  const selectedIndex = useMemo(() => {
    if (photoIndexParam === null) return 0
    const index = parseInt(photoIndexParam, 10)
    if (isNaN(index) || index < 0 || index >= allPhotos.length) return 0
    return index
  }, [photoIndexParam, allPhotos.length])

  const galleryOpen = photoIndexParam !== null && selectedIndex < allPhotos.length

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
      if (index >= 0 && index < allPhotos.length && allPhotos[index]?.file_path) {
        router.push(buildUrl(index), { scroll: false })
      }
    },
    [allPhotos, router, buildUrl]
  )

  const handleIndexChange = useCallback(
    (index: number) => {
      if (index >= 0 && index < allPhotos.length) {
        router.replace(buildUrl(index), { scroll: false })
      }
    },
    [allPhotos.length, router, buildUrl]
  )

  useEffect(() => {
    if (galleryOpen && (allPhotos.length === 0 || selectedIndex >= allPhotos.length)) {
      closeGallery()
    }
  }, [allPhotos.length, galleryOpen, selectedIndex, closeGallery])

  const loadMoreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!infiniteScroll || !infiniteQuery.hasNextPage || infiniteQuery.isFetchingNextPage) return

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          infiniteQuery.fetchNextPage()
        }
      },
      { rootMargin: MEDIA.PAGINATION.INFINITE_SCROLL_THRESHOLD + 'px' }
    )

    const currentRef = loadMoreRef.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [infiniteScroll, infiniteQuery])

  if (!allPhotos.length && !infiniteQuery.isLoading) {
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
        {allPhotos.map((photo, index) => (
          <PhotoItem
            key={`${photo.id}-${photo.file_path}-${photo.uploaded_at}`}
            photo={photo}
            eventId={eventId}
            priority={index < 12}
            publicMode={publicMode}
            onClick={() => {
              if (photo.file_path && photo.file_path !== '') {
                openGallery(index)
              }
            }}
          />
        ))}

        {infiniteScroll && infiniteQuery.hasNextPage && (
          <Box
            ref={loadMoreRef}
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              py: 4,
              gridColumn: '1 / -1',
            }}
          >
            <CircularProgress size={40} />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
              Loading more photos...
            </Typography>
          </Box>
        )}
      </Box>

      <PhotoGallery
        photos={allPhotos}
        initialIndex={selectedIndex}
        open={galleryOpen}
        onClose={closeGallery}
        onIndexChange={handleIndexChange}
        getImageUrl={(path: string) => getImageUrl(path, { publicMode, eventId })}
        publicMode={publicMode}
        eventId={eventId}
      />
    </>
  )
}
