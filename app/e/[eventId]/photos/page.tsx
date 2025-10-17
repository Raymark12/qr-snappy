import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createMetadata } from '@/lib/metadata'
import { getEventById } from '@/lib/db/events'
import PublicEventPhotos from '@/components/events/photos/PublicEventPhotos'
import EventNotAvailable from '@/components/events/common/EventNotAvailable'

interface PublicEventPhotosPageProps {
  params: Promise<{
    eventId: string
  }>
}

export async function generateMetadata({ params }: PublicEventPhotosPageProps): Promise<Metadata> {
  const { eventId } = await params
  const event = await getEventById(eventId)

  if (!event) {
    return createMetadata({
      title: 'Event Not Found',
      description: 'The requested event could not be found',
      path: `/e/${eventId}/photos`,
    })
  }

  return createMetadata({
    title: `${event.title} - Photos`,
    description: `View and upload photos for ${event.title}`,
    path: `/e/${eventId}/photos`,
  })
}

export default async function PublicEventPhotosPage({ params }: PublicEventPhotosPageProps) {
  const { eventId } = await params
  const event = await getEventById(eventId)

  if (!event) {
    notFound()
  }

  if (!event.is_active) {
    return <EventNotAvailable />
  }

  return <PublicEventPhotos event={event} />
}
