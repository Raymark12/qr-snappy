'use client'

import { useRef, useState } from 'react'
import { Box, Button, Typography } from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import { getUploadUrl, completeUpload, photoKeys } from '@/hooks/usePhotos'
import { useAxiosUpload } from '@/hooks/useAxiosUpload'
import { useQueryClient } from '@tanstack/react-query'
import { FILE_UPLOAD } from '@/lib/constants'
import { r2PutObjectContentType } from '@/lib/utils/file-validation'
import { useToastStore } from '@/stores/toastStore'
import { useAuth } from '@/hooks/useAuth'
import PhotoPreviewModal, { type PhotoPreviewItem } from './PhotoPreviewModal'
import UploadProgressModal from './UploadProgressModal'

interface PhotoUploaderProps {
  eventId: string
  publicMode?: boolean
}

export default function PhotoUploader({ eventId, publicMode = false }: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [previewPhotos, setPreviewPhotos] = useState<PhotoPreviewItem[]>([])
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [progressModalOpen, setProgressModalOpen] = useState(false)

  const { user } = useAuth()
  const showToast = useToastStore(state => state.showToast)
  const queryClient = useQueryClient()

  const filePathsRef = useRef<Map<number, string>>(new Map())
  const metadataRef = useRef<Map<number, { author?: string; comment?: string }>>(new Map())

  const { uploads, isUploading, uploadFiles, cancelUpload, cancelAllUploads, reset } =
    useAxiosUpload({
      onFileSuccess: async (file, index) => {
        const filePath = filePathsRef.current.get(index)
        if (!filePath) throw new Error('File path not found')

        const metadata = metadataRef.current.get(index)

        await completeUpload(
          eventId,
          filePath,
          file.name,
          metadata?.author || null,
          metadata?.comment || null,
          publicMode
        )

        // Invalidate queries to refresh the list
        const queryKey = [...photoKeys.event(eventId), publicMode ? 'public' : 'private']
        queryClient.invalidateQueries({ queryKey })
      },
      onComplete: results => {
        const successCount = results.filter(r => r.success).length
        const failCount = results.length - successCount

        if (results.length > 0) {
          if (failCount === 0) {
            showToast(`All ${successCount} files uploaded successfully`, 'success')
          } else {
            showToast(`${successCount} uploaded, ${failCount} failed`, 'warning')
          }
        }
      },
    })

  const extractVideoThumbnail = (file: File): Promise<string> => {
    return new Promise(resolve => {
      const video = document.createElement('video')
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      let resolved = false

      const cleanup = () => {
        if (!resolved) {
          resolved = true
          URL.revokeObjectURL(video.src)
          resolve(URL.createObjectURL(file)) // Fallback
        }
      }

      video.preload = 'metadata'
      video.muted = true
      video.currentTime = 0.1 // Simple: 0.1 seconds

      video.onloadeddata = () => {
        if (resolved) return

        canvas.width = Math.min(video.videoWidth || 400, 400)
        canvas.height = Math.min(video.videoHeight || 300, 300)

        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          resolved = true
          resolve(canvas.toDataURL('image/jpeg', 0.8))
        }
        cleanup()
      }

      video.onerror = cleanup
      video.onabort = cleanup

      video.src = URL.createObjectURL(file)

      // Timeout after 3 seconds
      setTimeout(cleanup, 3000)
    })
  }

  const onFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    if (files.length > FILE_UPLOAD.MAX_FILES_PER_UPLOAD) {
      showToast(
        `Maximum ${FILE_UPLOAD.MAX_FILES_PER_UPLOAD} files allowed per upload. Please select fewer files.`,
        'warning'
      )
      return
    }

    const fileArray = Array.from(files)

    const newPreviews: PhotoPreviewItem[] = await Promise.all(
      fileArray.map(async file => {
        let preview: string

        if (file.type.startsWith('video/')) {
          // For videos, try to extract a thumbnail (fallback handled in function)
          preview = await extractVideoThumbnail(file)
        } else {
          // For images, use the file URL directly
          preview = URL.createObjectURL(file)
        }

        return {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file,
          preview,
          author: '',
          comment: '',
        }
      })
    )

    setPreviewPhotos(newPreviews)
    setPreviewModalOpen(true)
  }

  const handlePreviewClose = () => {
    previewPhotos.forEach(p => {
      // Only revoke blob URLs, not data URLs (video thumbnails)
      if (p.preview.startsWith('blob:')) {
        URL.revokeObjectURL(p.preview)
      }
    })
    setPreviewPhotos([])
    setPreviewModalOpen(false)
  }

  const handlePreviewUpload = async (photos: PhotoPreviewItem[]) => {
    setPreviewModalOpen(false)
    setProgressModalOpen(true)
    reset()
    filePathsRef.current.clear()
    metadataRef.current.clear()

    const uploadFilesList = photos.map((p, index) => {
      // Store metadata
      metadataRef.current.set(index, { author: p.author, comment: p.comment })
      return { file: p.file, index }
    })

    await uploadFiles(uploadFilesList, async (file, index) => {
      const result = await getUploadUrl(eventId, file.name, r2PutObjectContentType(file), publicMode)
      filePathsRef.current.set(index, result.filePath)
      return result.uploadUrl
    })

    // Clear preview photos
    photos.forEach(p => {
      if (p.preview.startsWith('blob:')) {
        URL.revokeObjectURL(p.preview)
      }
    })
    setPreviewPhotos([])
  }

  const handleUpdatePhoto = (id: string, updates: Partial<PhotoPreviewItem>) => {
    setPreviewPhotos(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)))
  }

  const handleRemovePhoto = (id: string) => {
    setPreviewPhotos(prev => {
      const photo = prev.find(p => p.id === id)
      if (photo && photo.preview.startsWith('blob:')) {
        URL.revokeObjectURL(photo.preview)
      }
      return prev.filter(p => p.id !== id)
    })
  }

  const activeUploads = uploads.filter(u => u.status === 'uploading' || u.status === 'processing')

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

      <UploadProgressModal
        open={progressModalOpen}
        onClose={() => setProgressModalOpen(false)}
        uploads={uploads}
        onCancel={cancelUpload}
        onCancelAll={cancelAllUploads}
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

        <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
          <Button
            variant="contained"
            startIcon={<CloudUploadIcon />}
            onClick={() => inputRef.current?.click()}
            sx={{ textTransform: 'none', width: { xs: '100%', md: 'auto' } }}
            disabled={isUploading}
          >
            {isUploading ? 'Uploading...' : 'Upload photos & videos'}
          </Button>
          <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
            Max {FILE_UPLOAD.MAX_SIZE_DISPLAY} per file •{' '}
            {FILE_UPLOAD.ALLOWED_EXTENSIONS.join(', ')}
          </Typography>

          {activeUploads.length > 0 && (
            <Typography variant="body2" sx={{ mt: 2, color: 'primary.main', fontWeight: 500 }}>
              Uploading {activeUploads.length} {activeUploads.length === 1 ? 'file' : 'files'}
              ...
            </Typography>
          )}
        </Box>
      </Box>
    </>
  )
}
