'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { MEDIA } from '@/lib/constants'

export interface UseLazyImageOptions {
  rootMargin?: string
  threshold?: number
  onLoad?: () => void
  onError?: () => void
}

export function useLazyImage(options?: UseLazyImageOptions) {
  const [isInView, setIsInView] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const elementRef = useRef<HTMLElement | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const { ROOT_MARGIN, THRESHOLD } = MEDIA.LAZY_LOADING

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !isInView) {
          setIsInView(true)
          // Once in view, stop observing
          if (observerRef.current && element) {
            observerRef.current.unobserve(element)
          }
        }
      })
    }

    observerRef.current = new IntersectionObserver(handleIntersection, {
      rootMargin: options?.rootMargin || ROOT_MARGIN,
      threshold: options?.threshold || THRESHOLD,
    })

    observerRef.current.observe(element)

    return () => {
      if (observerRef.current && element) {
        observerRef.current.unobserve(element)
      }
    }
  }, [isInView, options?.rootMargin, options?.threshold, ROOT_MARGIN, THRESHOLD])

  const handleLoad = useCallback(() => {
    setIsLoaded(true)
    setHasError(false)
    options?.onLoad?.()
  }, [options])

  const handleError = useCallback(() => {
    setHasError(true)
    setIsLoaded(false)
    options?.onError?.()
  }, [options])

  return {
    elementRef,
    isInView,
    isLoaded,
    hasError,
    handleLoad,
    handleError,
  }
}

/**
 * Hook to get image source based on lazy loading state
 */
export function useLazyImageSource(
  thumbnailSrc: string | null,
  fullSrc: string | null,
  options?: UseLazyImageOptions
) {
  const lazy = useLazyImage(options)
  const [currentSrc, setCurrentSrc] = useState<string | null>(null)

  useEffect(() => {
    if (lazy.isInView) {
      // Load thumbnail first
      if (thumbnailSrc && !lazy.isLoaded) {
        setCurrentSrc(thumbnailSrc)
      }
      // Then load full image
      else if (fullSrc && lazy.isLoaded) {
        setCurrentSrc(fullSrc)
      }
    }
  }, [lazy.isInView, lazy.isLoaded, thumbnailSrc, fullSrc])

  return {
    ...lazy,
    currentSrc,
  }
}

/**
 * Network Information API types
 */
interface NetworkInformation extends EventTarget {
  effectiveType?: '4g' | '3g' | '2g' | 'slow-2g'
  downlink?: number
  rtt?: number
  saveData?: boolean
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation
}

/**
 * Hook to detect user's connection speed
 */
export function useConnectionSpeed() {
  const [connectionSpeed, setConnectionSpeed] = useState<'slow' | 'medium' | 'fast'>('medium')

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as NavigatorWithConnection).connection

      const updateConnectionSpeed = () => {
        const effectiveType = connection?.effectiveType

        switch (effectiveType) {
          case 'slow-2g':
          case '2g':
            setConnectionSpeed('slow')
            break
          case '3g':
            setConnectionSpeed('medium')
            break
          case '4g':
          default:
            setConnectionSpeed('fast')
            break
        }
      }

      updateConnectionSpeed()

      if (connection) {
        connection.addEventListener('change', updateConnectionSpeed)
        return () => {
          connection.removeEventListener('change', updateConnectionSpeed)
        }
      }
    }

    return undefined
  }, [])

  return connectionSpeed
}

/**
 * Hook to enable/disable data saver mode
 */
export function useDataSaver() {
  const [isDataSaverEnabled, setIsDataSaverEnabled] = useState(false)
  const connectionSpeed = useConnectionSpeed()

  useEffect(() => {
    // Check localStorage for user preference
    const saved = localStorage.getItem('dataSaverMode')
    if (saved !== null) {
      setIsDataSaverEnabled(saved === 'true')
    } else {
      // Auto-enable on slow connections
      setIsDataSaverEnabled(connectionSpeed === 'slow')
    }
  }, [connectionSpeed])

  const toggleDataSaver = useCallback((enabled?: boolean) => {
    const newValue = enabled !== undefined ? enabled : !isDataSaverEnabled
    setIsDataSaverEnabled(newValue)
    localStorage.setItem('dataSaverMode', String(newValue))
  }, [isDataSaverEnabled])

  return {
    isDataSaverEnabled,
    toggleDataSaver,
    connectionSpeed,
  }
}

