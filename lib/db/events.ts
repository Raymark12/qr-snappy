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

