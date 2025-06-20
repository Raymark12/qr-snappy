import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createMetadata } from '@/lib/metadata'
import { getEventById } from '@/lib/db/events'
import AdminLayout from '@/components/global/AdminLayout'
import EventPhotos from '@/components/events/photos/EventPhotos'
import EventNotAvailable from '@/components/events/common/EventNotAvailable'

interface EventPhotosPageProps {
  params: Promise<{
    eventId: string
  }>
}

export async function generateMetadata({ params }: EventPhotosPageProps): Promise<Metadata> {
  const { eventId } = await params
  const event = await getEventById(eventId)

  if (!event) {
    return createMetadata({
      title: 'Event Not Found',
      description: 'The requested event could not be found',
      path: `/events/${eventId}/photos`,
    })
  }

  return createMetadata({
    title: `${event.title} - Photos`,
    description: `View and upload photos for ${event.title}`,
    path: `/events/${eventId}/photos`,
  })
}

export default async function EventPhotosPage({ params }: EventPhotosPageProps) {
  const { eventId } = await params
  const event = await getEventById(eventId)

  if (!event) {
    notFound()
  }

  if (!event.is_active) {
    return (
      <AdminLayout>
        <EventNotAvailable />
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <EventPhotos event={event} />
    </AdminLayout>
  )
}
