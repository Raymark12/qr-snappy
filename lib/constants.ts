export const FILE_UPLOAD = {
  /** Maximum file size in bytes (100MB for videos) */
  MAX_SIZE_BYTES: 100 * 1024 * 1024,
  /** Maximum file size for display */
  MAX_SIZE_DISPLAY: '100MB',
  /** Allowed MIME types for image and video uploads */
  ALLOWED_TYPES: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm'
  ] as const,
  /** Allowed file extensions (for display) */
  ALLOWED_EXTENSIONS: ['JPG', 'PNG', 'WEBP', 'HEIC', 'MP4', 'MOV', 'AVI', 'WEBM'],
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
  /** R2 Signed URL expiry in seconds (1 hour) */
  R2_SIGNED_URL_EXPIRY: 3600,
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

export const PASSWORD_CACHE = {
  /** Password cache expiry in hours */
  EXPIRY_HOURS: 24,
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

export const MEDIA = {
  THUMBNAIL: {
    MAX_WIDTH: 200,
    MAX_HEIGHT: 200,
    QUALITY: 70,
    FORMAT: 'webp' as const,
  },
  VIDEO: {
    PREVIEW_RESOLUTION: '1280x720',
    PREVIEW_BITRATE: '1M',
    PREVIEW_CRF: 28, // Constant Rate Factor
    PREVIEW_CODEC: 'libx264',
    POSTER_TIME: '00:00:01', // Extract frame at 1 second
    SMALL_VIDEO_SIZE_MB: 5, // Only skip preview for very small videos
  },
  LAZY_LOADING: {
    ROOT_MARGIN: '200px',
    THRESHOLD: 0.1,
    PRELOAD_ADJACENT: 1,
  },
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 50,
    INFINITE_SCROLL_THRESHOLD: 100, // Distance from bottom to trigger load (px)
  },
  LIGHTBOX: {
    PRELOAD_ADJACENT: 2,
    INITIAL_LOAD_RANGE: 5,
  },
} as const

export const TOAST_MESSAGES = {
  MEDIA_APPROVED: 'Media approved successfully',
  MEDIA_APPROVED_ERROR: 'Failed to approve media. Please try again.',
  MEDIA_REJECTED: 'Media rejected and deleted',
  MEDIA_REJECTED_ERROR: 'Failed to reject media. Please try again.',
  MEDIA_DELETED: 'Media deleted successfully',
  MEDIA_DELETED_ERROR: 'Failed to delete media. Please try again.',
} as const