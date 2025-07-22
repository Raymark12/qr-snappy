import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createMetadata } from '@/lib/metadata'
import { getEventById } from '@/lib/db/events'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/utils/auth-helpers'
import { isUserAssignedToEvent } from '@/lib/db/event-assignments'
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

  const supabase = await createServerSupabaseClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase client type complexity
  const currentUser = await getCurrentUser(supabase as any)

  let canUpload = false
  if (currentUser) {
    const isUserAdmin = currentUser.role === 'admin'
    const isAssigned = isUserAdmin ? true : await isUserAssignedToEvent(event.id, currentUser.id)
    canUpload = isUserAdmin || isAssigned
  }

  return (
    <AdminLayout>
      <EventPhotos event={event} canUpload={canUpload} />
    </AdminLayout>
  )
}
