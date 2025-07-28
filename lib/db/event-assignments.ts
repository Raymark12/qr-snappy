import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface EventAssignment {
  id: string
  event_id: string
  client_id: string
  assigned_at: string
  assigned_by: string | null
}

export async function assignEventToUser(eventId: string, userId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  if (!currentUser) return false

  const { error: insertError } = await supabase
    .from('event_assignments')
    // @ts-expect-error - Supabase generated types may have RLS policy affecting types
    .insert({
      event_id: eventId,
      client_id: userId,
      assigned_by: currentUser.id,
    })

  return !insertError
}

export async function removeEventAssignment(eventId: string, userId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient()

  const { error: deleteError } = await supabase
    .from('event_assignments')
    .delete()
    .eq('event_id', eventId)
    .eq('client_id', userId)

  return !deleteError
}

export async function getEventAssignments(eventId: string) {
  const supabase = await createServerSupabaseClient()

  const { data: assignmentsData, error: fetchError } = await supabase
    .from('event_assignments')
    .select(
      `
      *,
      profiles!event_assignments_client_id_fkey (
        id,
        email,
        role
      )
    `
    )
    .eq('event_id', eventId)

  if (fetchError) {
    console.error('Error fetching event assignments:', fetchError)
    return []
  }

  return assignmentsData || []
}

export async function getUserAssignedEvents(userId: string) {
  const supabase = await createServerSupabaseClient()

  const { data: eventsData, error: fetchError } = await supabase
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
    .eq('client_id', userId)

  if (fetchError) {
    console.error('Error fetching user assigned events:', fetchError)
    return []
  }

  return eventsData || []
}

export async function isUserAssignedToEvent(eventId: string, userId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient()

  const { data: assignmentData, error: fetchError } = await supabase
    .from('event_assignments')
    .select('id')
    .eq('event_id', eventId)
    .eq('client_id', userId)
    .single()

  return !fetchError && !!assignmentData
}

