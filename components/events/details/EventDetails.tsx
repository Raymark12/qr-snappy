import { Button, Box, Typography, Card, CardContent } from '@mui/material'
import { PhotoCamera as PhotoIcon, ArrowBack as BackIcon } from '@mui/icons-material'
import Link from 'next/link'
import type { Event } from '@/types'

interface EventDetailsProps {
  event: Event
}

export default function EventDetails({ event }: EventDetailsProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <Box sx={{ mb: 4 }}>
        <Link href="/events">
          <Button startIcon={<BackIcon />} sx={{ textTransform: 'none' }}>
            Back to Events
          </Button>
        </Link>
      </Box>
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h3" component="h1" gutterBottom fontWeight={700}>
            {event.title}
          </Typography>
          {event.description && (
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {event.description}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Created{' '}
            {new Date(event.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              timeZone: 'UTC',
            })}
          </Typography>
          <Link href={`/events/${event.id}/photos`}>
            <Button
              variant="contained"
              size="large"
              startIcon={<PhotoIcon />}
              sx={{ textTransform: 'none', py: 1.5, px: 3 }}
            >
              View Photos
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
