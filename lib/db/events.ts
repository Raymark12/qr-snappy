import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Event, EventWithDetails } from '@/types'

export async function getEvents(): Promise<EventWithDetails[]> {
  const supabase = await createServerSupabaseClient()

  const { data: eventsData, error: fetchError } = await supabase
    .from('events')
    .select(`
      *,
      profiles!events_admin_id_fkey (
        email
      )
    `)
    .order('created_at', { ascending: false })

  if (fetchError) {
    console.error('Error fetching events:', fetchError)
    throw new Error('Failed to fetch events')
  }

  return (eventsData || []) as EventWithDetails[]
}

export async function getEventById(eventId: string): Promise<EventWithDetails | null> {
  const supabase = await createServerSupabaseClient()

  const { data: eventData, error: fetchError } = await supabase
    .from('events')
    .select(`
      *,
      profiles!events_admin_id_fkey (
        email
      )
    `)
    .eq('id', eventId)
    .single()

  if (fetchError) {
    console.error('Error fetching event:', fetchError)
    return null
  }

  if (!eventData) {
    return null
  }

  return eventData as EventWithDetails
}

export async function getEventCount(): Promise<number> {
  const supabase = await createServerSupabaseClient()

  const { count, error: countError } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })

  if (countError) {
    console.error('Error counting events:', countError)
    return 0
  }

  return count || 0
}

export async function getActiveEvents(): Promise<Event[]> {
  const supabase = await createServerSupabaseClient()

  const { data: eventsData, error: fetchError } = await supabase
    .from('events')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (fetchError) {
    console.error('Error fetching active events:', fetchError)
    throw new Error('Failed to fetch events')
  }

  return (eventsData || []) as Event[]
}

/**
 * Helper function to sort events by created_at descending
 */
function sortEventsByDate(events: Event[]): Event[] {
  return events.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export async function getEventsForUser(): Promise<Event[]> {
  const supabase = await createServerSupabaseClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single<{ role: 'admin' | 'user' | 'client' }>()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
    } else {
      const userRole = profileData?.role

      // Admins see all events (active and inactive)
      if (userRole === 'admin') {
        const { data: eventsData, error: fetchError } = await supabase
          .from('events')
          .select('*')
          .order('created_at', { ascending: false })

        if (fetchError) {
          console.error('Error fetching events:', fetchError)
          throw new Error('Failed to fetch events')
        }

        return (eventsData || []) as Event[]
      }

      // Clients see active events + inactive events they are assigned to
      if (userRole === 'client') {
        try {
          const [activeEventsResult, assignmentsResult] = await Promise.allSettled([
            supabase
              .from('events')
              .select('*')
              .eq('is_active', true)
              .order('created_at', { ascending: false }),
            supabase
              .from('event_assignments')
              .select('event_id')
              .eq('client_id', user.id)
              .returns<Array<{ event_id: string }>>(),
          ])

          if (activeEventsResult.status === 'rejected') {
            console.error('Error fetching active events:', activeEventsResult.reason)
            throw new Error('Failed to fetch active events')
          }

          const { data: activeEvents, error: activeError } = activeEventsResult.value
          if (activeError) {
            console.error('Error fetching active events:', activeError)
            throw new Error('Failed to fetch active events')
          }

          let assignedEventIds: string[] = []
          if (assignmentsResult.status === 'fulfilled') {
            const { data: assignments, error: assignmentsError } = assignmentsResult.value
            if (!assignmentsError && assignments) {
              assignedEventIds = assignments.map(a => a.event_id)
            }
          }

          // Fetch assigned inactive events if any
          let assignedInactiveEvents: Event[] = []
          if (assignedEventIds.length > 0) {
            const { data: assignedEvents, error: assignedError } = await supabase
              .from('events')
              .select('*')
              .in('id', assignedEventIds)
              .eq('is_active', false)
              .order('created_at', { ascending: false })

            if (!assignedError && assignedEvents) {
              assignedInactiveEvents = assignedEvents as Event[]
            }
          }

          const allEvents: Event[] = [...(activeEvents || []), ...assignedInactiveEvents]
          const uniqueEvents = Array.from(new Map(allEvents.map(event => [event.id, event]))).map(
            ([, event]) => event
          )

          return sortEventsByDate(uniqueEvents)
        } catch (error) {
          console.error('Error in getEventsForUser for client:', error)
          return getActiveEvents()
        }
      }
    }
  }

  return getActiveEvents()
}

