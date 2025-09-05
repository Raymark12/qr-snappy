import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Profile } from '@/types'

export interface UserWithAssignments extends Profile {
  event_assignments: Array<{
    id: string
    event_id: string
    events: {
      id: string
      title: string
    }
  }>
}

export async function getUsers(): Promise<UserWithAssignments[]> {
  const supabase = await createServerSupabaseClient()

  const { data: usersData, error: fetchError } = await supabase
    .from('profiles')
    .select(`
      *,
      event_assignments!event_assignments_client_id_fkey (
        id,
        event_id,
        events (
          id,
          title
        )
      )
    `)
    .order('created_at', { ascending: false })

  if (fetchError) {
    console.error('Error fetching users:', fetchError)
    throw new Error('Failed to fetch users')
  }

  return (usersData || []) as UserWithAssignments[]
}

export async function getUserById(userId: string): Promise<UserWithAssignments | null> {
  const supabase = await createServerSupabaseClient()

  const { data: userData, error: fetchError } = await supabase
    .from('profiles')
    .select(`
      *,
      event_assignments!event_assignments_client_id_fkey (
        id,
        event_id,
        events (
          id,
          title
        )
      )
    `)
    .eq('id', userId)
    .single()

  if (fetchError) {
    console.error('Error fetching user:', fetchError)
    return null
  }

  return userData as UserWithAssignments
}

export async function updateUser(
  userId: string,
  updates: { email?: string; role?: 'admin' | 'user' | 'client' }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()

  const updateData: Record<string, unknown> = {}
  if (updates.email !== undefined) updateData.email = updates.email
  if (updates.role !== undefined) updateData.role = updates.role

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('profiles')
    .update(updateData)
    .eq('id', userId)

  if (error) {
    console.error('Error updating user:', error)
    return { success: false, error: 'Failed to update user' }
  }

  return { success: true }
}

