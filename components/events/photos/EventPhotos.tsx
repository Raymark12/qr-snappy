'use client'

import { useState, useEffect, Suspense } from 'react'
import { Box, Button, Alert, Container, Typography, Paper, Skeleton } from '@mui/material'
import { ArrowBack as BackIcon } from '@mui/icons-material'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Event } from '@/types'
import { useEventPhotos } from '@/hooks/usePhotos'
import PhotosGrid from './PhotosGrid'
import PhotoUploader from './PhotoUploader'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import EventQRSection from '@/components/events/photos/EventQRSection'

interface EventPhotosProps {
  event: Event
  canUpload: boolean
}

export default function EventPhotos({ event: initialEvent, canUpload }: EventPhotosProps) {
  const router = useRouter()
  const [event, setEvent] = useState(initialEvent)
  const { data: photos, isLoading, error } = useEventPhotos(event.id)
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    setEvent(initialEvent)
  }, [initialEvent])

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null

    if (!isLoading && photos) {
      timer = setTimeout(() => {
        setShowContent(true)
      }, 800)
    } else if (isLoading) {
      setShowContent(false)
    }

    return () => {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [isLoading, photos])

  return (
    <Container maxWidth="lg" sx={{ py: 4, px: 2 }}>
      <Box sx={{ mb: 4 }}>
        <Link href="/events">
          <Button startIcon={<BackIcon />} sx={{ textTransform: 'none' }}>
            Back to Events
          </Button>
        </Link>
      </Box>
      <Box
        sx={{
          mb: 4,
          visibility: !showContent || isLoading ? 'hidden' : 'visible',
          position: !showContent || isLoading ? 'absolute' : 'relative',
          width: '100%',
        }}
      >
        <EventQRSection
          eventId={event.id}
          eventTitle={event.title}
          eventDescription={event.description}
          backgroundImagePath={
            'background_image_path' in event ? (event.background_image_path as string | null) : null
          }
          event={event}
          onEventUpdate={() => {
            router.refresh()
          }}
        />
      </Box>

      <Paper
        elevation={1}
        sx={{
          p: 3,
          visibility: !showContent || isLoading ? 'hidden' : 'visible',
          position: !showContent || isLoading ? 'absolute' : 'relative',
          width: '100%',
        }}
      >
        <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 2 }}>
          Event Photos
        </Typography>
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Auto-approve:
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: event.auto_approve ? 'success.main' : 'warning.main',
            }}
          >
            {event.auto_approve ? 'ON' : 'OFF'}
          </Typography>
        </Box>

        {canUpload && (
          <ErrorBoundary>
            <Box sx={{ mb: 4 }}>
              <PhotoUploader eventId={event.id} />
            </Box>
          </ErrorBoundary>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to load photos. Please try again.
          </Alert>
        )}

        {!error && photos && (
          <ErrorBoundary>
            <Suspense
              fallback={
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: 'repeat(2, 1fr)',
                      sm: 'repeat(3, 1fr)',
                      md: 'repeat(4, 1fr)',
                      lg: 'repeat(5, 1fr)',
                      xl: 'repeat(6, 1fr)',
                    },
                    gap: { xs: 1.5, md: 2 },
                  }}
                >
                  {[...Array(12)].map((_, i) => (
                    <Skeleton
                      key={i}
                      variant="rectangular"
                      width="100%"
                      sx={{ aspectRatio: '1/1', borderRadius: 2 }}
                    />
                  ))}
                </Box>
              }
            >
              <PhotosGrid eventId={event.id} infiniteScroll={true} />
            </Suspense>
          </ErrorBoundary>
        )}
      </Paper>

      {(!showContent || isLoading) && (
        <>
          <Box sx={{ mb: 4 }}>
            <Paper sx={{ p: 3 }}>
              <Box
                sx={{
                  display: 'flex',
                  gap: 3,
                  alignItems: 'flex-start',
                  flexWrap: { xs: 'wrap', md: 'nowrap' },
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="60%" height={60} sx={{ mb: 2 }} />
                  <Skeleton variant="text" width="100%" height={24} sx={{ mb: 1 }} />
                  <Skeleton variant="text" width="80%" height={24} />
                </Box>
                <Box
                  sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
                >
                  <Skeleton
                    variant="rectangular"
                    width={160}
                    height={160}
                    sx={{ borderRadius: 2 }}
                  />
                </Box>
              </Box>
              <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Skeleton
                    variant="rectangular"
                    width={150}
                    height={36}
                    sx={{ borderRadius: 1 }}
                  />
                  <Skeleton
                    variant="rectangular"
                    width={150}
                    height={36}
                    sx={{ borderRadius: 1 }}
                  />
                  <Skeleton
                    variant="rectangular"
                    width={150}
                    height={36}
                    sx={{ borderRadius: 1 }}
                  />
                </Box>
              </Box>
            </Paper>
          </Box>

          <Paper elevation={1} sx={{ p: 3 }}>
            <Skeleton variant="text" width="30%" height={40} sx={{ mb: 4 }} />
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, 1fr)',
                  md: 'repeat(3, 1fr)',
                  lg: 'repeat(4, 1fr)',
                },
                gap: 2,
              }}
            >
              {[...Array(8)].map((_, i) => (
                <Skeleton
                  key={i}
                  variant="rectangular"
                  width="100%"
                  height={200}
                  sx={{ borderRadius: 1 }}
                />
              ))}
            </Box>
          </Paper>
        </>
      )}
    </Container>
  )
}
