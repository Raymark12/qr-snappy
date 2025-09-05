import { PASSWORD_CACHE } from '@/lib/constants'

const CACHE_PREFIX = 'event_password_'

interface PasswordCacheEntry {
  eventId: string
  verifiedAt: number
  expiresAt: number
}

/**
 * Get cached password verification for an event
 * @param eventId - Event ID to check cache for
 * @returns true if password is cached and not expired, false otherwise
 */
export function getCachedPassword(eventId: string): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    const cacheKey = `${CACHE_PREFIX}${eventId}`
    const cached = localStorage.getItem(cacheKey)

    if (!cached) {
      return false
    }

    const entry: PasswordCacheEntry = JSON.parse(cached)
    const now = Date.now()

    if (now > entry.expiresAt) {
      localStorage.removeItem(cacheKey)
      return false
    }

    return true
  } catch (error) {
    console.error('Error reading password cache:', error)
    return false
  }
}

export function setCachedPassword(eventId: string): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const now = Date.now()
    const expiresAt = now + PASSWORD_CACHE.EXPIRY_HOURS * 60 * 60 * 1000

    const entry: PasswordCacheEntry = {
      eventId,
      verifiedAt: now,
      expiresAt,
    }

    const cacheKey = `${CACHE_PREFIX}${eventId}`
    localStorage.setItem(cacheKey, JSON.stringify(entry))
  } catch (error) {
    console.error('Error setting password cache:', error)
  }
}

export function clearCachedPassword(eventId: string): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const cacheKey = `${CACHE_PREFIX}${eventId}`
    localStorage.removeItem(cacheKey)
  } catch (error) {
    console.error('Error clearing password cache:', error)
  }
}

export function clearAllCachedPasswords(): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const keys = Object.keys(localStorage)
    keys.forEach((key) => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key)
      }
    })
  } catch (error) {
    console.error('Error clearing all password caches:', error)
  }
}

