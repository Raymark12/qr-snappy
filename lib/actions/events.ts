'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createEventSchema } from '@/lib/validations'
import { hashPassword } from '@/lib/utils/password-server'
import { getCurrentUser } from '@/lib/utils/auth-helpers'
import { generateEventQR } from '@/lib/utils/qr-generator'
import { getEventPhotos } from '@/lib/db/event-photos'
import { getEventById } from '@/lib/db/events'
import { deleteFileFromStorage, normalizeStoragePath } from '@/lib/utils/storage'
import { deleteFileFromR2, generateR2Key } from '@/lib/utils/r2-storage'
import { getQrStoragePath } from '@/lib/utils/qr-generator'

type CreateEventResult = {
  success: boolean
  error?: string
  data?: { id: string; qr?: { url: string; path: string } }
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

    const title = formData.get('title')
    const description = formData.get('description')
    const password = formData.get('password')
    const autoApproveRaw = formData.get('autoApprove')

    // Comprehensive input validation
    if (!title || typeof title !== 'string') {
      return { success: false, error: 'Title is required and must be a string' }
    }

    const trimmedTitle = title.trim()
    if (trimmedTitle === '') {
      return { success: false, error: 'Title cannot be empty' }
    }

    if (trimmedTitle.length > 100) {
      return { success: false, error: 'Title must be less than 100 characters' }
    }

    if (!password || typeof password !== 'string') {
      return { success: false, error: 'Password is required and must be a string' }
    }

    const trimmedPassword = password.trim()
    if (trimmedPassword === '') {
      return { success: false, error: 'Password cannot be empty' }
    }

    if (trimmedPassword.length < 4) {
      return { success: false, error: 'Password must be at least 4 characters' }
    }

    const trimmedDescription = (description as string || '').trim()

    const rawData: {
      title: string
      password: string
      description?: string
      autoApprove?: boolean
    } = {
      title: trimmedTitle,
      password: trimmedPassword,
      autoApprove: autoApproveRaw === 'on',
    }

    // Validate description length if provided
    if (trimmedDescription && trimmedDescription.length > 500) {
      return { success: false, error: 'Description must be less than 500 characters' }
    }

    // Only include description if it's not empty
    if (trimmedDescription) {
      rawData.description = trimmedDescription
    }

    const validation = createEventSchema.safeParse(rawData)

    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0].message,
      }
    }

    const { title: validatedTitle, description: validatedDescription, password: validatedPassword, autoApprove } = validation.data

    const hashedPassword = await hashPassword(validatedPassword)

    // Create event
    const { data, error } = await supabase
      .from('events')
      // @ts-expect-error - TypeScript has issues inferring Supabase insert types
      .insert({
        title: validatedTitle,
        description: validatedDescription || null,
        password: hashedPassword,
        admin_id: currentUser.id,
        is_active: true,
        auto_approve: autoApprove || false,
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

    const eventId = (data as { id: string }).id

    // Generate QR code for the new event
    const qrResult = await generateEventQR(eventId)

    revalidatePath('/dashboard/events')
    revalidatePath('/events')

    return {
      success: true,
      data: {
        id: eventId,
        qr: qrResult.success ? { url: qrResult.url!, path: qrResult.path! } : undefined
      }
    }
  } catch (error) {
    console.error('Create event error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create event'
    }
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

    // Get event details to check for background image
    const event = await getEventById(eventId)
    if (!event) {
      return { success: false, error: 'Event not found' }
    }

    // Get all photos for this event
    const photos = await getEventPhotos(eventId, true) // include all photos for admin

    if (photos.length > 0) {
      console.log(`Deleting event ${eventId}: found ${photos.length} photos to delete`)
    }

    // Delete all photo files from R2
    const photoDeletePromises = photos.map(async (photo) => {
      try {
        const fullPath = normalizeStoragePath(photo.file_path)
        const deleteResult = await deleteFileFromStorage(fullPath)
        return deleteResult.success
      } catch (error) {
        console.error(`Failed to delete photo ${photo.file_path}:`, error)
        return false
      }
    })

    // Delete QR code file
    const qrDeletePromise = (async () => {
      try {
        const qrPath = getQrStoragePath(eventId)
        const qrKey = generateR2Key(qrPath)
        const qrDeleteResult = await deleteFileFromR2(qrKey)
        return qrDeleteResult.success
      } catch (error) {
        console.error(`Failed to delete QR for event ${eventId}:`, error)
        return false
      }
    })()

    // Delete background image file if it exists
    const backgroundDeletePromise = (async () => {
      if (event.background_image_path) {
        try {
          const bgDeleteResult = await deleteFileFromStorage(event.background_image_path)
          return bgDeleteResult.success
        } catch (error) {
          console.error(`Failed to delete background ${event.background_image_path}:`, error)
          return false
        }
      }
      return true
    })()

    // Wait for all file deletions to complete
    const [photoResults, qrResult, backgroundResult] = await Promise.all([
      Promise.all(photoDeletePromises),
      qrDeletePromise,
      backgroundDeletePromise,
    ])

    const failedDeletions = [
      ...photoResults.filter(result => !result).map(() => 'photo'),
      ...(!qrResult ? ['QR code'] : []),
      ...(!backgroundResult ? ['background'] : []),
    ]

    if (failedDeletions.length > 0) {
      console.warn(`Some files failed to delete: ${failedDeletions.join(', ')}`)
    }

    // Delete the event (this will cascade delete photos from database)
    const { error: deleteError } = await supabase.from('events').delete().eq('id', eventId)

    if (deleteError) {
      console.error('Error deleting event:', deleteError)
      return { success: false, error: `Failed to delete event: ${deleteError.message}` }
    }

    console.log(`Successfully deleted event ${eventId} and ${photos.length} associated files`)

    revalidatePath('/dashboard')
    revalidatePath('/events')

    return { success: true }
  } catch (error) {
    console.error('Delete event error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete event'
    }
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

