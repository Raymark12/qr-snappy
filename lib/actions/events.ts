'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { z } from 'zod'
import bcrypt from 'bcrypt'

const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  description: z.string().max(500, 'Description too long').optional(),
  password: z.string().min(4, 'Password must be at least 4 characters'),
})

type CreateEventResult = {
  success: boolean
  error?: string
  data?: { id: string }
}

export async function createEvent(formData: FormData): Promise<CreateEventResult> {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single<{ role: 'admin' | 'user' | 'client' }>()

    if (!profile || profile.role !== 'admin') {
      return { success: false, error: 'Only admins can create events' }
    }

    // Parse and validate input
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

    const hashedPassword = await bcrypt.hash(password, 10)

    // Create event
    const { data, error } = await supabase
      .from('events')
      // @ts-expect-error - TypeScript has issues inferring Supabase insert types
      .insert({
        title,
        description: description || null,
        password: hashedPassword,
        admin_id: user.id,
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

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single<{ role: 'admin' | 'user' | 'client' }>()

    if (!profile || profile.role !== 'admin') {
      return { success: false, error: 'Only admins can delete events' }
    }

    const { error } = await supabase.from('events').delete().eq('id', eventId)

    if (error) {
      console.error('Error deleting event:', error)
      return { success: false, error: 'Failed to delete event' }
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

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single<{ role: 'admin' | 'user' | 'client' }>()

    if (!profile || profile.role !== 'admin') {
      return { success: false, error: 'Only admins can modify events' }
    }

    // Update event
    const { error } = await supabase
      .from('events')
      // @ts-expect-error - TypeScript has issues inferring Supabase update types
      .update({ is_active: isActive })
      .eq('id', eventId)

    if (error) {
      console.error('Error updating event:', error)
      return { success: false, error: 'Failed to update event' }
    }

    revalidatePath('/dashboard/events')

    return { success: true }
  } catch (error) {
    console.error('Toggle event error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

