import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getEvents } from '@/lib/db/events'
import EventsTable from '@/components/events/display/EventsTable'

export default async function EventsList() {
  const supabase = await createServerSupabaseClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  // Get user profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: 'admin' | 'user' | 'client' }>()

  if (!profile) {
    throw new Error('User profile not found')
  }
  const events = await getEvents()

  return <EventsTable events={events} isAdmin={profile.role === 'admin'} />
}
