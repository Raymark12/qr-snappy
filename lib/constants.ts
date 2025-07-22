export const FILE_UPLOAD = {
  /** Maximum file size in bytes (10MB) */
  MAX_SIZE_BYTES: 10 * 1024 * 1024,
  /** Maximum file size for display */
  MAX_SIZE_DISPLAY: '10MB',
  /** Allowed MIME types for image uploads */
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'] as const,
  /** Allowed file extensions (for display) */
  ALLOWED_EXTENSIONS: ['JPG', 'PNG', 'WEBP', 'HEIC'],
  /** Concurrency limit for parallel uploads */
  UPLOAD_CONCURRENCY: 3,
  /** Maximum number of files per upload batch */
  MAX_FILES_PER_UPLOAD: 50,
} as const

export const STORAGE = {
  /** Supabase storage bucket name for photos */
  BUCKET_NAME: 'Photos',
  /** Signed URL expiry in seconds (1 hour) */
  SIGNED_URL_EXPIRY: 3600,
} as const

export const AUTH = {
  /** Bcrypt salt rounds for password hashing */
  SALT_ROUNDS: 12,
  /** Minimum password length for events */
  MIN_EVENT_PASSWORD_LENGTH: 4,
  /** Minimum password length for user auth */
  MIN_USER_PASSWORD_LENGTH: 6,
} as const

export const VALIDATION = {
  /** Maximum event title length */
  MAX_EVENT_TITLE_LENGTH: 100,
  /** Maximum event description length */
  MAX_EVENT_DESCRIPTION_LENGTH: 500,
} as const

export const QUERY = {
  /** Photo list stale time in milliseconds */
  PHOTOS_STALE_TIME: 30 * 1000,
  /** Photo list refetch interval in milliseconds */
  PHOTOS_REFETCH_INTERVAL: 60 * 1000,
} as const

export const UI = {
  /** Toast auto-hide duration for success messages (ms) */
  TOAST_SUCCESS_DURATION: 4000,
  /** Toast auto-hide duration for error messages (ms) */
  TOAST_ERROR_DURATION: 6000,
  /** Upload cleanup delay after success (ms) */
  UPLOAD_SUCCESS_CLEANUP_DELAY: 500,
  /** Upload cleanup delay after error (ms) */
  UPLOAD_ERROR_CLEANUP_DELAY: 3000,
} as const
