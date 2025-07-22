'use client'

import { useEffect, useState, useCallback } from 'react'
import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import Captions from 'yet-another-react-lightbox/plugins/captions'
import Counter from 'yet-another-react-lightbox/plugins/counter'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/captions.css'
import 'yet-another-react-lightbox/plugins/counter.css'
import type { Photo } from '@/types'

interface PhotoGalleryProps {
  photos: Photo[]
  initialIndex: number
  open: boolean
  onClose: () => void
  getImageUrl: (filePath: string) => Promise<string>
}

export default function PhotoGallery({
  photos,
  initialIndex,
  open,
  onClose,
  getImageUrl,
}: PhotoGalleryProps) {
  const [slides, setSlides] = useState<Array<{ src: string; title: string; description: string }>>(
    []
  )
  const [loading, setLoading] = useState(true)

  const loadImages = useCallback(async () => {
    if (!open || photos.length === 0) return

    setLoading(true)
    try {
      const loadedSlides = await Promise.all(
        photos.map(async (photo) => {
          const url = await getImageUrl(photo.file_path)

          const parts: string[] = []
          if (photo.author) parts.push(`📸 ${photo.author}`)
          if (photo.comment) parts.push(`💬 ${photo.comment}`)
          parts.push(`📅 ${new Date(photo.uploaded_at).toLocaleDateString()}`)

          return {
            src: url,
            title: photo.file_name,
            description: parts.join(' • '),
          }
        })
      )
      setSlides(loadedSlides)
    } catch (err) {
      console.error('Failed to load images:', err)
    } finally {
      setLoading(false)
    }
  }, [open, photos, getImageUrl])

  useEffect(() => {
    loadImages()
  }, [loadImages])

  if (loading || slides.length === 0) {
    return null
  }

  return (
    <Lightbox
      open={open}
      close={onClose}
      index={initialIndex}
      slides={slides}
      plugins={[Zoom, Captions, Counter]}
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
    />
  )
}
