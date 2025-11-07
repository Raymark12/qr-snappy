'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import Lightbox, { Slide } from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import Captions from 'yet-another-react-lightbox/plugins/captions'
import Counter from 'yet-another-react-lightbox/plugins/counter'
import Video from 'yet-another-react-lightbox/plugins/video'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/captions.css'
import 'yet-another-react-lightbox/plugins/counter.css'
import { Box, Typography } from '@mui/material'
import {
  Edit as EditIcon,
  Comment as CommentIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material'
import type { Photo } from '@/types'
import { isVideoFileName } from '@/lib/utils/file-validation'

function createSlideToPhotoIndexMap(photos: Photo[]): Map<number, number> {
  const map = new Map<number, number>()
  let slideIndex = 0
  for (let photoIndex = 0; photoIndex < photos.length; photoIndex++) {
    if (photos[photoIndex]?.file_path && photos[photoIndex].file_path !== '') {
      map.set(slideIndex, photoIndex)
      slideIndex++
    }
  }
  return map
}

interface PhotoGalleryProps {
  photos: Photo[]
  initialIndex: number
  open: boolean
  onClose: () => void
  onIndexChange?: (index: number) => void
  getImageUrl: (filePath: string) => Promise<string>
}

export default function PhotoGallery({
  photos,
  initialIndex,
  open,
  onClose,
  onIndexChange,
  getImageUrl,
}: PhotoGalleryProps) {
  const [slides, setSlides] = useState<Slide[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  const slideToPhotoMap = useMemo(() => createSlideToPhotoIndexMap(photos), [photos])

  const loadImages = useCallback(async () => {
    if (!open || photos.length === 0) {
      setSlides([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const loadedSlides = await Promise.all(
        photos.map(async photo => {
          if (!photo.file_path || photo.file_path === '') {
            return null
          }

          const url = await getImageUrl(photo.file_path)
          const isVideo = isVideoFileName(photo.file_name)

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

          if (isVideo) {
            return {
              type: 'video' as const,
              sources: [
                {
                  src: url,
                  type: 'video/mp4',
                },
              ],
              title: '',
              description: (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  {descriptionParts}
                </Box>
              ),
            }
          } else {
            return {
              type: 'image' as const,
              src: url,
              title: '',
              description: (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  {descriptionParts}
                </Box>
              ),
            }
          }
        })
      )
      setSlides(loadedSlides.filter((slide): slide is NonNullable<typeof slide> => slide !== null))
    } catch (err) {
      console.error('Failed to load images:', err)
      setSlides([])
    } finally {
      setLoading(false)
    }
  }, [open, photos, getImageUrl])

  const prevPhotosIdsRef = useRef<string>('')

  useEffect(() => {
    const currentPhotosIds = photos.map(p => p.id).join(',')

    if (open && photos.length > 0) {
      if (slides.length === 0 || prevPhotosIdsRef.current !== currentPhotosIds) {
        prevPhotosIdsRef.current = currentPhotosIds
        loadImages()
      }
    } else {
      setSlides([])
      setLoading(false)
      prevPhotosIdsRef.current = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, photos])

  const mappedIndex = useMemo(() => {
    if (!open || initialIndex < 0 || initialIndex >= photos.length) return 0

    let validCount = 0
    for (let i = 0; i < initialIndex; i++) {
      if (photos[i]?.file_path && photos[i].file_path !== '') {
        validCount++
      }
    }

    if (photos[initialIndex]?.file_path && photos[initialIndex].file_path !== '') {
      return validCount
    }

    return 0
  }, [open, initialIndex, photos])

  useEffect(() => {
    if (open) {
      setCurrentIndex(mappedIndex)
    }
  }, [open, mappedIndex])

  const prevSlidesLengthRef = useRef(slides.length)

  useEffect(() => {
    if (open && slides.length > 0 && prevSlidesLengthRef.current !== slides.length) {
      prevSlidesLengthRef.current = slides.length
      setCurrentIndex(prevIndex => {
        if (prevIndex >= slides.length) {
          return Math.max(0, slides.length - 1)
        }
        return prevIndex
      })
    }
  }, [open, slides.length])

  if (loading || slides.length === 0) {
    return null
  }

  return (
    <>
      <Lightbox
        open={open}
        close={onClose}
        index={currentIndex}
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
          finite: photos.length <= 1,
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
            if (typeof index === 'number' && index !== currentIndex) {
              setCurrentIndex(index)
              const photoIndex = slideToPhotoMap.get(index)
              if (photoIndex !== undefined) {
                onIndexChange?.(photoIndex)
              }
            }
          },
        }}
      />
    </>
  )
}
