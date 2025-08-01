import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getEvents } from '@/lib/db/events'
import { getCurrentUser } from '@/lib/utils/auth-helpers'
import EventsTable from '@/components/events/display/EventsTable'

export default async function EventsList() {
  const supabase = await createServerSupabaseClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase client type complexity
  const currentUser = await getCurrentUser(supabase as any)

  if (!currentUser) {
    throw new Error('Unauthorized')
  }

  const events = await getEvents()

  return <EventsTable events={events} isAdmin={currentUser.role === 'admin'} />
}
