import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createMetadata } from '@/lib/metadata'
import { getEventById } from '@/lib/db/events'
import AdminLayout from '@/components/global/AdminLayout'
import EventDetails from '@/components/events/details/EventDetails'
import EventNotAvailable from '@/components/events/common/EventNotAvailable'

interface EventDetailsPageProps {
  params: Promise<{
    eventId: string
  }>
}

export async function generateMetadata({ params }: EventDetailsPageProps): Promise<Metadata> {
  const { eventId } = await params
  const event = await getEventById(eventId)

  if (!event) {
    return createMetadata({
      title: 'Event Not Found',
      description: 'The requested event could not be found',
      path: `/events/${eventId}`,
    })
  }

  return createMetadata({
    title: event.title,
    description: event.description || `Details for ${event.title}`,
    path: `/events/${eventId}`,
  })
}

export default async function EventDetailsPage({ params }: EventDetailsPageProps) {
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
      <EventDetails event={event} />
    </AdminLayout>
  )
}
