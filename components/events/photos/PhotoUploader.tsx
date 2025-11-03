'use client'

import { useRef, useState, useEffect } from 'react'
import { Box, Button, Typography, LinearProgress } from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import { useUploadPhoto } from '@/hooks/usePhotos'
import { FILE_UPLOAD, UI } from '@/lib/constants'
import { useToastStore } from '@/stores/toastStore'
import { useAuth } from '@/hooks/useAuth'
import PhotoPreviewModal, { type PhotoPreviewItem } from './PhotoPreviewModal'

type UploadItem = {
  id: string
  file: File
  status: 'uploading' | 'success' | 'error'
  error?: string
}

interface PhotoUploaderProps {
  eventId: string
  publicMode?: boolean
  simple?: boolean
}

export default function PhotoUploader({
  eventId,
  publicMode = false,
  simple = false,
}: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const timeoutRefs = useRef<Set<NodeJS.Timeout>>(new Set())
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [previewPhotos, setPreviewPhotos] = useState<PhotoPreviewItem[]>([])
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(
    null
  )
  const { user } = useAuth()
  const uploadMutation = useUploadPhoto(eventId, publicMode, progress => {
    setUploadProgress(prev =>
      prev ? { ...prev, current: progress } : { current: progress, total: 100 }
    )
  })
  const showToast = useToastStore(state => state.showToast)

  useEffect(() => {
    const timeouts = timeoutRefs.current
    return () => {
      timeouts.forEach(clearTimeout)
      timeouts.clear()
    }
  }, [])

  const scheduleTimeout = (callback: () => void, delay: number) => {
    const timeoutId = setTimeout(() => {
      callback()
      timeoutRefs.current.delete(timeoutId)
    }, delay)
    timeoutRefs.current.add(timeoutId)
    return timeoutId
  }

  const handleUpload = async (
    file: File,
    author?: string,
    comment?: string,
    suppressToast = false
  ) => {
    const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2)}`

    setUploads(prev => [
      {
        id: uploadId,
        file,
        status: 'uploading',
      },
      ...prev,
    ])

    try {
      await uploadMutation.mutateAsync({ file, author, comment })

      setUploads(prev =>
        prev.map(u => (u.id === uploadId ? { ...u, status: 'success' as const } : u))
      )

      if (!suppressToast) {
        showToast(`${file.name} uploaded successfully`, 'success')
      }

      scheduleTimeout(() => {
        setUploads(prev => prev.filter(u => u.id !== uploadId))
      }, UI.UPLOAD_SUCCESS_CLEANUP_DELAY)
    } catch (error) {
      setUploads(prev =>
        prev.map(u =>
          u.id === uploadId
            ? {
                ...u,
                status: 'error' as const,
                error: error instanceof Error ? error.message : 'Upload failed',
              }
            : u
        )
      )

      if (!suppressToast) {
        const errorMsg = error instanceof Error ? error.message : 'Upload failed'
        showToast(`Failed to upload ${file.name}: ${errorMsg}`, 'error')
      }

      scheduleTimeout(() => {
        setUploads(prev => prev.filter(u => u.id !== uploadId))
      }, UI.UPLOAD_ERROR_CLEANUP_DELAY)
    }
  }

  const onFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return

    if (files.length > FILE_UPLOAD.MAX_FILES_PER_UPLOAD) {
      showToast(
        `Maximum ${FILE_UPLOAD.MAX_FILES_PER_UPLOAD} files allowed per upload. Please select fewer files.`,
        'warning'
      )
      return
    }

    const fileArray = Array.from(files)

    const newPreviews: PhotoPreviewItem[] = fileArray.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      preview: URL.createObjectURL(file),
      author: '',
      comment: '',
    }))

    setPreviewPhotos(newPreviews)
    setPreviewModalOpen(true)
  }

  const handlePreviewClose = () => {
    previewPhotos.forEach(p => URL.revokeObjectURL(p.preview))
    setPreviewPhotos([])
    setPreviewModalOpen(false)
  }

  const handlePreviewUpload = async (photos: PhotoPreviewItem[]) => {
    setPreviewModalOpen(false)

    if (photos.length > 1) {
      showToast(`Uploading ${photos.length} photos...`, 'info')
    }

    setUploadProgress({ current: 0, total: photos.length })

    const concurrencyLimit = FILE_UPLOAD.UPLOAD_CONCURRENCY
    const results: Array<{ success: boolean; filename: string }> = []

    for (let i = 0; i < photos.length; i += concurrencyLimit) {
      const batch = photos.slice(i, i + concurrencyLimit)
      const batchPromises = batch.map(async photo => {
        try {
          await handleUpload(
            photo.file,
            photo.author || undefined,
            photo.comment || undefined,
            photos.length > 1
          )
          return { success: true, filename: photo.file.name }
        } catch {
          return { success: false, filename: photo.file.name }
        }
      })

      const batchResults = await Promise.allSettled(batchPromises)
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        }
      })

      setUploadProgress({ current: i + batch.length, total: photos.length })
    }

    setUploadProgress(null)

    const successCount = results.filter(r => r.success).length
    const failCount = results.length - successCount

    if (photos.length > 1) {
      if (failCount > 0) {
        showToast(`${successCount} uploaded, ${failCount} failed`, 'warning')
      } else {
        showToast(`All ${successCount} photos uploaded successfully`, 'success')
      }
    }

    photos.forEach(p => URL.revokeObjectURL(p.preview))
    setPreviewPhotos([])
  }

  const handleUpdatePhoto = (id: string, updates: Partial<PhotoPreviewItem>) => {
    setPreviewPhotos(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)))
  }

  const handleRemovePhoto = (id: string) => {
    setPreviewPhotos(prev => {
      const photo = prev.find(p => p.id === id)
      if (photo) {
        URL.revokeObjectURL(photo.preview)
      }
      return prev.filter(p => p.id !== id)
    })
  }

  const activeUploads = uploads.filter(u => u.status === 'uploading')

  return (
    <>
      <PhotoPreviewModal
        open={previewModalOpen}
        photos={previewPhotos}
        onClose={handlePreviewClose}
        onUpload={handlePreviewUpload}
        onUpdatePhoto={handleUpdatePhoto}
        onRemovePhoto={handleRemovePhoto}
        userEmail={user?.email}
        publicMode={publicMode}
      />

      <Box sx={{ p: 0 }}>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          hidden
          onChange={e => onFilesSelected(e.target.files)}
        />

        {simple ? (
          <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
            <Button
              variant="contained"
              startIcon={<CloudUploadIcon />}
              onClick={() => inputRef.current?.click()}
              sx={{ textTransform: 'none', width: { xs: '100%', md: 'auto' } }}
              disabled={activeUploads.length > 0}
            >
              {activeUploads.length > 0 ? 'Uploading...' : 'Upload photos & videos'}
            </Button>
            <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
              Max {FILE_UPLOAD.MAX_SIZE_DISPLAY} per file •{' '}
              {FILE_UPLOAD.ALLOWED_EXTENSIONS.join(', ')}
            </Typography>
          </Box>
        ) : (
          <Box
            onDragOver={e => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={e => {
              e.preventDefault()
              setIsDragging(false)
              onFilesSelected(e.dataTransfer.files)
            }}
            sx={{
              border: '2px dashed',
              borderColor: isDragging ? 'primary.main' : 'grey.300',
              borderRadius: 2,
              p: 3,
              textAlign: 'center',
              bgcolor: isDragging ? 'action.hover' : 'transparent',
              transition: 'all 0.2s',
            }}
          >
            <CloudUploadIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
            <Typography variant="body1" sx={{ mb: 1, fontWeight: 500 }}>
              Drag and drop images here
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
              or
            </Typography>
            <Button
              variant="contained"
              startIcon={<CloudUploadIcon />}
              onClick={() => inputRef.current?.click()}
              sx={{ textTransform: 'none' }}
              disabled={activeUploads.length > 0}
            >
              Select files
            </Button>
            <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
              Max {FILE_UPLOAD.MAX_SIZE_DISPLAY} per file •{' '}
              {FILE_UPLOAD.ALLOWED_EXTENSIONS.join(', ')}
            </Typography>

            {activeUploads.length > 0 && (
              <Typography variant="body2" sx={{ mt: 2, color: 'primary.main', fontWeight: 500 }}>
                Uploading {activeUploads.length} {activeUploads.length === 1 ? 'photo' : 'photos'}
                ...
              </Typography>
            )}

            {uploadProgress && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Progress: {uploadProgress.current} / {uploadProgress.total}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={(uploadProgress.current / uploadProgress.total) * 100}
                />
              </Box>
            )}
          </Box>
        )}
      </Box>
    </>
  )
}
