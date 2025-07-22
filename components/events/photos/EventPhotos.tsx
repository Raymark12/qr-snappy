'use client'

import { Box, Button, CircularProgress, Alert } from '@mui/material'
import { ArrowBack as BackIcon } from '@mui/icons-material'
import Link from 'next/link'
import type { Event } from '@/types'
import { useEventPhotos } from '@/hooks/usePhotos'
import PhotosGrid from './PhotosGrid'
import PhotoUploader from './PhotoUploader'
import ErrorBoundary from '@/components/ErrorBoundary'

interface EventPhotosProps {
  event: Event
  canUpload: boolean
}

export default function EventPhotos({ event, canUpload }: EventPhotosProps) {
  const { data: photos, isLoading, error } = useEventPhotos(event.id)

  return (
    <div className="container mx-auto px-4 py-8">
      <Box sx={{ mb: 4 }}>
        <Link href="/events">
          <Button startIcon={<BackIcon />} sx={{ textTransform: 'none' }}>
            Back to Events
          </Button>
        </Link>
      </Box>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{event.title}</h1>
        {event.description && <p className="text-gray-600">{event.description}</p>}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Event Photos</h2>

        {canUpload && (
          <ErrorBoundary>
            <div className="mb-6">
              <PhotoUploader eventId={event.id} />
            </div>
          </ErrorBoundary>
        )}

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to load photos. Please try again.
          </Alert>
        )}

        {!isLoading && !error && photos && (
          <ErrorBoundary>
            <PhotosGrid photos={photos} />
          </ErrorBoundary>
        )}
      </div>
    </div>
  )
}
