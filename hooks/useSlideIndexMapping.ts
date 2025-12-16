import { useMemo } from 'react'
import type { Media } from '@/types'

/**
 * Creates mappings between photo indices and slide indices.
 */
function createSlideToPhotoIndexMap(photos: Media[]): Map<number, number> {
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

/**
 * Creates mappings between photo indices and slide indices.
 */
export function useSlideIndexMapping(photos: Media[]) {
  const slideToPhotoMap = useMemo(() => createSlideToPhotoIndexMap(photos), [photos])

  const photoToSlideMap = useMemo(() => {
    const map = new Map<number, number>()
    slideToPhotoMap.forEach((photoIndex, slideIndex) => {
      map.set(photoIndex, slideIndex)
    })
    return map
  }, [slideToPhotoMap])

  const totalSlides = slideToPhotoMap.size

  /**
   * Converts a photo array index to its corresponding slide index.
   */
  const photoIndexToSlideIndex = (photoIndex: number): number | undefined => {
    return photoToSlideMap.get(photoIndex)
  }

  /**
   * Converts a slide index to its corresponding photo array index.
   */
  const slideIndexToPhotoIndex = (slideIndex: number): number | undefined => {
    return slideToPhotoMap.get(slideIndex)
  }

  /**
   * Calculates the slide index for a given photo index when the lightbox opens.
   */
  const calculateInitialSlideIndex = (initialPhotoIndex: number): number => {
    if (initialPhotoIndex < 0 || initialPhotoIndex >= photos.length) return 0

    let validCount = 0
    for (let i = 0; i < initialPhotoIndex; i++) {
      if (photos[i]?.file_path && photos[i].file_path !== '') {
        validCount++
      }
    }

    if (photos[initialPhotoIndex]?.file_path && photos[initialPhotoIndex].file_path !== '') {
      return validCount
    }

    return 0
  }

  return {
    slideToPhotoMap,
    photoToSlideMap,
    totalSlides,
    photoIndexToSlideIndex,
    slideIndexToPhotoIndex,
    calculateInitialSlideIndex,
  }
}
