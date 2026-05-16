import { useState, useCallback, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Slide } from 'yet-another-react-lightbox'
import type { Media } from '@/types'
import { Box, CircularProgress } from '@mui/material'
import { isVideoFileName } from '@/lib/utils/file-validation'

/** Valid placeholder so Lightbox never receives `src=""` (triggers React / browser warnings). */
const PLACEHOLDER_IMAGE_SRC =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

interface UseLazyLightboxSlidesOptions {
  photos: Media[]
  initialIndex: number
  open: boolean
  getImageUrl: (filePath: string) => Promise<string>
  publicMode?: boolean
  eventId?: string
  createDescription: (photo: Media) => React.ReactNode
  slideToPhotoMap: Map<number, number>
}

/**
 * Custom hook for lazy loading lightbox slides.
 *
 * This hook manages the loading of slides on-demand to minimize bandwidth usage.
 * Only loads the current slide and a few adjacent slides, using thumbnails for video posters.
 */
export function useLazyLightboxSlides({
  photos,
  initialIndex,
  open,
  getImageUrl,
  publicMode,
  eventId,
  createDescription,
  slideToPhotoMap,
}: UseLazyLightboxSlidesOptions) {
  const queryClient = useQueryClient()
  const [slidesMap, setSlidesMap] = useState<Map<number, Slide>>(new Map())
  const loadedSlidesRef = useRef<Set<number>>(new Set())
  const loadingSlidesRef = useRef<Set<number>>(new Set())

  /**
   * Loads a single slide by fetching its media URL and creating the slide object.
   * Uses thumbnails for video posters to save bandwidth.
   */
  const loadSlide = useCallback(
    async (slideIndex: number): Promise<Slide | null> => {
      // Prevent duplicate loading
      if (loadingSlidesRef.current.has(slideIndex)) {
        return null
      }

      const photoIndex = slideToPhotoMap.get(slideIndex)
      if (photoIndex === undefined) return null

      const photo = photos[photoIndex]
      if (!photo?.file_path || photo.file_path === '') {
        return null
      }

      loadingSlidesRef.current.add(slideIndex)

      try {
        const isVideo = photo.media_type === 'video' || isVideoFileName(photo.file_name)
        // Use preview for videos, original for images (bandwidth optimization)
        const pathToLoad = isVideo && photo.preview_path ? photo.preview_path : photo.file_path

        // Fetch media URL with caching
        const url = await queryClient.fetchQuery({
          queryKey: ['media-url', pathToLoad, publicMode, eventId],
          queryFn: () => getImageUrl(pathToLoad),
          staleTime: 45 * 60 * 1000, // 45 minutes
          gcTime: 60 * 60 * 1000, // 1 hour
        })

        if (typeof url !== 'string' || !url.trim()) {
          console.error(`Empty media URL for slide ${slideIndex}, path:`, pathToLoad)
          return null
        }

        let posterUrl: string | undefined
        if (isVideo && photo.thumbnail_path) {
          try {
            // Fetch thumbnail for video poster
            posterUrl = await queryClient.fetchQuery({
              queryKey: ['media-url', photo.thumbnail_path, publicMode, eventId],
              queryFn: () => getImageUrl(photo.thumbnail_path!),
              staleTime: 45 * 60 * 1000,
              gcTime: 60 * 60 * 1000,
            })
          } catch {
            console.log('Failed to load thumbnail for video poster:', photo.thumbnail_path)
          }
        }

        const description = createDescription(photo)

        // Create slide object for lightbox
        const slide: Slide = isVideo
          ? {
              type: 'video' as const,
              sources: [{ src: url, type: 'video/mp4' }],
              poster: posterUrl?.trim() || undefined,
              title: '',
              description,
            }
          : {
              type: 'image' as const,
              src: url,
              title: '',
              description,
            }

        loadedSlidesRef.current.add(slideIndex)
        setSlidesMap(prev => new Map(prev).set(slideIndex, slide))
        return slide
      } catch (err) {
        console.error(`Failed to load slide ${slideIndex}:`, err)
        return null
      } finally {
        loadingSlidesRef.current.delete(slideIndex)
      }
    },
    [photos, slideToPhotoMap, queryClient, getImageUrl, publicMode, eventId, createDescription]
  )

  /**
   * Clears slide state when lightbox closes or photos change.
   */
  useEffect(() => {
    if (!open || photos.length === 0) {
      setSlidesMap(new Map())
      loadedSlidesRef.current.clear()
      loadingSlidesRef.current.clear()
      return
    }

    // Clear state when photos change
    setSlidesMap(new Map())
    loadedSlidesRef.current.clear()
    loadingSlidesRef.current.clear()
  }, [open, photos])

  /**
   * Loads initial slides when lightbox opens.
   */
  useEffect(() => {
    if (!open || slideToPhotoMap.size === 0) return

    // Calculate initial slide index
    let slideIndex = 0
    for (let i = 0; i < initialIndex; i++) {
      if (photos[i]?.file_path && photos[i].file_path !== '') {
        slideIndex++
      }
    }

    // Load current slide immediately
    loadSlide(slideIndex)
  }, [open, slideToPhotoMap.size, initialIndex, photos, loadSlide])

  /**
   * Loads a slide on-demand when the user navigates to it.
   */
  const loadSlideOnDemand = useCallback(
    (slideIndex: number) => {
      if (!loadedSlidesRef.current.has(slideIndex) && !loadingSlidesRef.current.has(slideIndex)) {
        loadSlide(slideIndex)
      }
    },
    [loadSlide]
  )

  /**
   * Creates a loading placeholder slide for unloaded content.
   */
  const createLoadingSlide = useCallback(
    (): Slide => ({
      type: 'image' as const,
      src: PLACEHOLDER_IMAGE_SRC,
      title: '',
      description: (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
          <CircularProgress size={32} />
        </Box>
      ),
    }),
    []
  )

  /**
   * Gets slides as an array for the lightbox, creating loading placeholders for unloaded slides.
   */
  const getSlidesArray = useCallback(() => {
    const totalSlides = slideToPhotoMap.size
    return Array.from({ length: totalSlides }, (_, i) => slidesMap.get(i) || createLoadingSlide())
  }, [slideToPhotoMap.size, slidesMap, createLoadingSlide])

  return {
    slidesMap,
    getSlidesArray,
    loadSlideOnDemand,
    isSlideLoaded: (index: number) => loadedSlidesRef.current.has(index),
    isSlideLoading: (index: number) => loadingSlidesRef.current.has(index),
    totalSlides: slideToPhotoMap.size,
  }
}
