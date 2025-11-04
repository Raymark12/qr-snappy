'use client'

import { useParams, useRouter } from 'next/navigation'
import { Box, Typography, Button, Alert, Skeleton } from '@mui/material'
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material'
import { useEventPhotos } from '@/hooks/usePhotos'

import PhotoUploader from '@/components/events/photos/PhotoUploader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import AdminLayout from '@/components/global/AdminLayout'
import PhotosGrid from '@/components/events/photos/PhotosGrid'
import PhotosGridSkeleton from '@/components/events/photos/PhotosGridSkeleton'

export default function EventPhotosPageClient() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.eventId as string

  const { data: photos, isLoading, error } = useEventPhotos(eventId)

  if (isLoading) {
    return <LoadingSpinner message="Loading photos..." />
  }

  if (error) {
    return (
      <AdminLayout>
        <Box sx={{ p: 3 }}>
          <Alert severity="error">Failed to load photos: {error.message}</Alert>
          <Button startIcon={<ArrowBackIcon />} onClick={() => router.back()} sx={{ mt: 2 }}>
            Go Back
          </Button>
        </Box>
      </AdminLayout>
    )
  }

  const approvedPhotos = photos?.filter(photo => photo.status === 'approved') || []

  return (
    <AdminLayout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => router.back()} sx={{ mr: 2 }}>
            Back
          </Button>
          <Typography variant="h4" component="h1">
            Event Photos
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          <PhotoUploader eventId={eventId} simple />
        </Box>

        {isLoading ? (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
              <Skeleton variant="text" width="200px" height={32} />
            </Typography>
            <PhotosGridSkeleton />
          </Box>
        ) : approvedPhotos.length > 0 ? (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
              Approved Photos ({approvedPhotos.length})
            </Typography>
            <PhotosGrid photos={approvedPhotos} eventId={eventId} />
          </Box>
        ) : null}

        {photos?.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No photos uploaded yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Upload some photos to get started!
            </Typography>
          </Box>
        )}
      </Box>
    </AdminLayout>
  )
}
