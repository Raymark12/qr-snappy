import { createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * Event Assignment functions
 * For managing which clients can access which events
 */

export interface EventAssignment {
  id: string
  event_id: string
  user_id: string
  assigned_at: string
  assigned_by: string | null
}

export async function assignEventToUser(eventId: string, userId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  if (!currentUser) return false

  const { error } = await supabase.from('event_assignments')
    // @ts-expect-error - TypeScript has issues inferring Supabase update types
    .insert({
      event_id: eventId,
      user_id: userId,
      assigned_by: currentUser.id,
    })

  return !error
}

export async function removeEventAssignment(eventId: string, userId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('event_assignments')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', userId)

  return !error
}

export async function getEventAssignments(eventId: string) {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('event_assignments')
    .select(
      `
      *,
      profiles!event_assignments_user_id_fkey (
        id,
        email,
        role
      )
    `
    )
    .eq('event_id', eventId)

  if (error) {
    console.error('Error fetching event assignments:', error)
    return []
  }

  return data || []
}

export async function getUserAssignedEvents(userId: string) {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('event_assignments')
    .select(
      `
      *,
      events (
        id,
        title,
        description,
        is_active,
        created_at
      )
    `
    )
    .eq('user_id', userId)

  if (error) {
    console.error('Error fetching user assigned events:', error)
    return []
  }

  return data || []
}

export async function isUserAssignedToEvent(eventId: string, userId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('event_assignments')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .single()

  return !error && !!data
}

