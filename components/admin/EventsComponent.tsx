import { Suspense } from 'react'
import { Box, Container, Typography } from '@mui/material'
import EventsGrid from '@/components/events/display/EventsGrid'
import EventsGridSkeleton from '@/components/events/display/EventsGridSkeleton'
import CreateEventButton from '@/components/events/buttons/CreateEventButton'

export default function EventsComponent() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        py: 6,
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ mb: 6, textAlign: 'center' }}>
          <Typography
            variant="h3"
            component="h1"
            gutterBottom
            fontWeight={700}
            sx={{
              background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Active Events
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Choose an event to view and upload photos
          </Typography>
          <Box sx={{ paddingTop: 2 }}>
            <CreateEventButton />
          </Box>
        </Box>
        <Suspense fallback={<EventsGridSkeleton />}>
          <EventsGrid />
        </Suspense>
      </Container>
    </Box>
  )
}
