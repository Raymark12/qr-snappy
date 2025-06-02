import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Event, EventWithDetails } from '@/types'

export async function getEvents(): Promise<EventWithDetails[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      profiles!events_admin_id_fkey (
        email
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching events:', error)
    throw new Error('Failed to fetch events')
  }

  return (data || []) as EventWithDetails[]
}

export async function getEventById(eventId: string): Promise<EventWithDetails | null> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      profiles!events_admin_id_fkey (
        email
      )
    `)
    .eq('id', eventId)
    .single()

  if (error) {
    console.error('Error fetching event:', error)
    return null
  }

  if (!data) {
    return null
  }

  return data as EventWithDetails
}

export async function getEventCount(): Promise<number> {
  const supabase = await createServerSupabaseClient()

  const { count, error } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })

  if (error) {
    console.error('Error counting events:', error)
    return 0
  }

  return count || 0
}

export async function getActiveEvents(): Promise<Event[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching active events:', error)
    throw new Error('Failed to fetch events')
  }

  return (data || []) as Event[]
}

