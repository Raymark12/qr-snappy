import { createServerSupabaseClient } from '@/lib/supabase/server'


export async function assignEventToUser(eventId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  if (!currentUser) {
    return { success: false, error: 'User not authenticated' }
  }

  // Check if assignment already exists
  const { data: existingAssignment } = await supabase
    .from('event_assignments')
    .select('id')
    .eq('event_id', eventId)
    .eq('client_id', userId)
    .maybeSingle()

  if (existingAssignment) {
    return { success: false, error: 'Event is already assigned to this user' }
  }

  const { error: insertError } = await supabase
    .from('event_assignments')
    // @ts-expect-error - Supabase generated types may have RLS policy affecting types
    .insert({
      event_id: eventId,
      client_id: userId,
      assigned_by: currentUser.id,
    })

  if (insertError) {
    // Check for unique constraint violation
    if (insertError.code === '23505') {
      return { success: false, error: 'Event is already assigned to this user' }
    }
    return { success: false, error: insertError.message || 'Failed to assign event' }
  }

  return { success: true }
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

