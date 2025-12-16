'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import Captions from 'yet-another-react-lightbox/plugins/captions'
import Counter from 'yet-another-react-lightbox/plugins/counter'
import Video from 'yet-another-react-lightbox/plugins/video'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/captions.css'
import 'yet-another-react-lightbox/plugins/counter.css'
import { Box, Typography, CircularProgress } from '@mui/material'
import {
  Edit as EditIcon,
  Comment as CommentIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material'
import type { Media } from '@/types'
import { useLazyLightboxSlides } from '@/hooks/useLazyLightboxSlides'
import { useSlideIndexMapping } from '@/hooks/useSlideIndexMapping'

interface PhotoGalleryProps {
  photos: Media[]
  initialIndex: number
  open: boolean
  onClose: () => void
  onIndexChange?: (index: number) => void
  getImageUrl: (filePath: string) => Promise<string>
  publicMode?: boolean
  eventId?: string
}

/**
 *
 * @param photos - Array of media items to display
 * @param initialIndex - Which photo to show when lightbox opens
 * @param open
 * @param onClose
 * @param onIndexChange - Callback when user navigates to different slide
 * @param getImageUrl
 * @param publicMode - Whether this is a public event
 * @param eventId
 */
export default function PhotoGallery({
  photos,
  initialIndex,
  open,
  onClose,
  onIndexChange,
  getImageUrl,
  publicMode,
  eventId,
}: PhotoGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  const { slideToPhotoMap, calculateInitialSlideIndex } = useSlideIndexMapping(photos)

  const createDescription = useCallback((photo: Media) => {
    const descriptionParts: React.ReactNode[] = []

    if (photo.author) {
      descriptionParts.push(
        <Box
          key="author"
          component="span"
          sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mr: 1 }}
        >
          <EditIcon sx={{ fontSize: 16, verticalAlign: 'middle' }} />
          <Typography component="span" variant="body2">
            {photo.author}
          </Typography>
        </Box>
      )
    }

    if (photo.comment) {
      descriptionParts.push(
        <Box
          key="comment"
          component="span"
          sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mr: 1 }}
        >
          <CommentIcon sx={{ fontSize: 16, verticalAlign: 'middle' }} />
          <Typography component="span" variant="body2">
            {photo.comment}
          </Typography>
        </Box>
      )
    }

    descriptionParts.push(
      <Box
        key="date"
        component="span"
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
      >
        <CalendarIcon sx={{ fontSize: 16, verticalAlign: 'middle' }} />
        <Typography component="span" variant="body2">
          {new Date(photo.uploaded_at).toLocaleDateString()}
        </Typography>
      </Box>
    )

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        {descriptionParts}
      </Box>
    )
  }, [])

  const { getSlidesArray, loadSlideOnDemand, isSlideLoading, totalSlides } = useLazyLightboxSlides({
    photos,
    initialIndex,
    open,
    getImageUrl,
    publicMode,
    eventId,
    createDescription,
    slideToPhotoMap,
  })

  const initialSlideIndex = useMemo(() => {
    return open ? calculateInitialSlideIndex(initialIndex) : 0
  }, [open, initialIndex, calculateInitialSlideIndex])

  useEffect(() => {
    if (open) {
      setCurrentIndex(initialSlideIndex)
    }
  }, [open, initialSlideIndex])

  // Get slides array with null placeholders for unloaded slides
  const slides = useMemo(() => getSlidesArray(), [getSlidesArray])

  const currentSlideIndex = Math.min(currentIndex, totalSlides - 1)

  if (!open || totalSlides === 0) {
    return null
  }

  return (
    <>
      <Lightbox
        open={open}
        close={onClose}
        index={currentSlideIndex}
        slides={slides}
        plugins={[Zoom, Captions, Counter, Video]}
        captions={{
          descriptionTextAlign: 'center',
          descriptionMaxLines: 3,
        }}
        zoom={{
          maxZoomPixelRatio: 3,
          scrollToZoom: true,
        }}
        carousel={{
          finite: totalSlides <= 1,
        }}
        animation={{
          fade: 250,
          swipe: 300,
        }}
        controller={{
          closeOnBackdropClick: true,
        }}
        video={{
          controls: true,
          muted: false,
          autoPlay: false,
        }}
        on={{
          view: ({ index }) => {
            loadSlideOnDemand(index)

            setCurrentIndex(index)
            const photoIndex = slideToPhotoMap.get(index)
            if (photoIndex !== undefined) {
              onIndexChange?.(photoIndex)
            }
          },
        }}
      />
      {isSlideLoading(currentIndex) && (
        <Box
          sx={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 9999,
            bgcolor: 'rgba(0, 0, 0, 0.7)',
            borderRadius: 2,
            p: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <CircularProgress size={24} sx={{ color: 'white' }} />
          <Typography variant="body2" sx={{ color: 'white' }}>
            Loading media...
          </Typography>
        </Box>
      )}
    </>
  )
}
