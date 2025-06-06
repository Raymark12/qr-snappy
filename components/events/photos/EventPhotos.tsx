import { Box, Button } from '@mui/material'
import { ArrowBack as BackIcon } from '@mui/icons-material'
import Link from 'next/link'
import type { Event } from '@/types'

interface EventPhotosProps {
  event: Event
}

/**
 * Event Photos Component
 * Displays photos for a specific event
 */
export default function EventPhotos({ event }: EventPhotosProps) {
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

      {/* Photos content will go here */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Event Photos</h2>
        <p className="text-gray-500">
          Photo upload and viewing functionality will be implemented here.
        </p>
      </div>
    </div>
  )
}
