'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createEventSchema } from '@/lib/validations'
import { hashPassword } from '@/lib/utils/password-server'
import { getCurrentUser } from '@/lib/utils/auth-helpers'

type CreateEventResult = {
  success: boolean
  error?: string
  data?: { id: string }
}

export async function createEvent(formData: FormData): Promise<CreateEventResult> {
  try {
    const supabase = await createServerSupabaseClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase client type complexity
    const currentUser = await getCurrentUser(supabase as any)

    if (!currentUser) {
      return { success: false, error: 'Unauthorized' }
    }

    if (currentUser.role !== 'admin') {
      return { success: false, error: 'Only admins can create events' }
    }

    const rawData = {
      title: formData.get('title'),
      description: formData.get('description') || '',
      password: formData.get('password'),
    }

    const validation = createEventSchema.safeParse(rawData)

    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0].message,
      }
    }

    const { title, description, password } = validation.data

    const hashedPassword = await hashPassword(password)

    // Create event
    const { data, error } = await supabase
      .from('events')
      // @ts-expect-error - TypeScript has issues inferring Supabase insert types
      .insert({
        title,
        description: description || null,
        password: hashedPassword,
        admin_id: currentUser.id,
        is_active: true,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error creating event:', error)
      return {
        success: false,
        error: `Failed to create event: ${error.message || JSON.stringify(error)}`
      }
    }

    if (!data) {
      return { success: false, error: 'No data returned from database' }
    }

    revalidatePath('/dashboard/events')
    revalidatePath('/events')

    return {
      success: true,
      // @ts-expect-error - TypeScript has issues inferring Supabase return types
      data: { id: data.id as string },
    }
  } catch (error) {
    console.error('Create event error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

type DeleteEventResult = {
  success: boolean
  error?: string
}

export async function deleteEvent(eventId: string): Promise<DeleteEventResult> {
  try {
    const supabase = await createServerSupabaseClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase client type complexity
    const currentUser = await getCurrentUser(supabase as any)

    if (!currentUser) {
      return { success: false, error: 'Unauthorized' }
    }

    if (currentUser.role !== 'admin') {
      return { success: false, error: 'Only admins can delete events' }
    }

    const { error: deleteError } = await supabase.from('events').delete().eq('id', eventId)

    if (deleteError) {
      console.error('Error deleting event:', deleteError)
      return { success: false, error: `Failed to delete event: ${deleteError.message}` }
    }

    revalidatePath('/dashboard/events')

    return { success: true }
  } catch (error) {
    console.error('Delete event error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

type ToggleEventActiveResult = {
  success: boolean
  error?: string
}

export async function toggleEventActive(eventId: string, isActive: boolean): Promise<ToggleEventActiveResult> {
  try {
    const supabase = await createServerSupabaseClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase client type complexity
    const currentUser = await getCurrentUser(supabase as any)

    if (!currentUser) {
      return { success: false, error: 'Unauthorized' }
    }

    if (currentUser.role !== 'admin') {
      return { success: false, error: 'Only admins can modify events' }
    }

    // Update event
    const { error: updateError } = await supabase
      .from('events')
      // @ts-expect-error - TypeScript has issues inferring Supabase update types
      .update({ is_active: isActive })
      .eq('id', eventId)

    if (updateError) {
      console.error('Error updating event:', updateError)
      return { success: false, error: `Failed to update event: ${updateError.message}` }
    }

    revalidatePath('/dashboard/events')

    return { success: true }
  } catch (error) {
    console.error('Toggle event error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

