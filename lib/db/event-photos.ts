import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Photo, PhotoInsert } from '@/types'

export type InsertPhotoParams = {
  eventId: string
  userEmail: string | null
  filePath: string
  fileName: string
  author?: string | null
  comment?: string | null
  status?: 'pending' | 'approved'
}

export type PhotoCreateData = Omit<PhotoInsert, 'id' | 'uploaded_at' | 'reviewed_at' | 'reviewed_by'>

export async function getEventPhotos(eventId: string, includePendingForModerator = false): Promise<Photo[]> {
  const supabase = await createServerSupabaseClient()

  let isModerator = false
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single<{ role: 'admin' | 'user' | 'client' }>()

    const userRole = profileData?.role

    if (userRole === 'admin') {
      isModerator = true
    }
    else if (userRole === 'client') {
      // Check if client is assigned to this event
      const { data: assignment } = await supabase
        .from('event_assignments')
        .select('id')
        .eq('event_id', eventId)
        .eq('client_id', user.id)
        .maybeSingle()

      isModerator = !!assignment
    }
  }

  const query = supabase
    .from('photos')
    .select('*')
    .eq('event_id', eventId)
    .order('uploaded_at', { ascending: false })

  if (!includePendingForModerator || !isModerator) {
    query.eq('status', 'approved')
  }

  const { data: photosData, error: fetchError } = await query

  if (fetchError) {
    console.error('Error fetching photos:', fetchError, 'eventId:', eventId)
    return []
  }

  return (photosData || []) as Photo[]
}

export async function insertPhotoRow(params: InsertPhotoParams): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createServerSupabaseClient()

  const { data: photoData, error: insertError } = await supabase
    .from('photos')
    // @ts-expect-error - Supabase types complexity
    .insert({
      event_id: params.eventId,
      user_email: params.userEmail,
      file_path: params.filePath,
      file_name: params.fileName,
      author: params.author || null,
      comment: params.comment || null,
      status: params.status || 'pending',
    })
    .select('id')
    .single<{ id: string }>()

  if (insertError) {
    console.error('Error inserting photo row:', insertError, 'eventId:', params.eventId)
    return { success: false, error: 'Failed to save photo metadata' }
  }

  return { success: true, id: photoData?.id }
}

export async function updatePhotoStatus(
  photoId: string,
  status: 'approved',
  reviewedBy: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('photos')
    // @ts-expect-error - Supabase types complexity
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewedBy,
    })
    .eq('id', photoId)

  if (error) {
    console.error('Error updating photo status:', error, 'photoId:', photoId, 'status:', status, 'reviewedBy:', reviewedBy)
    return { success: false, error: 'Failed to update photo status' }
  }

  return { success: true }
}

export async function getPhotoById(photoId: string): Promise<Photo | null> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('id', photoId)
    .single<Photo>()

  if (error) {
    console.error('Error fetching photo:', error, 'photoId:', photoId)
    return null
  }

  return data || null
}

export async function deletePhoto(photoId: string): Promise<{ success: boolean; filePath?: string; error?: string }> {
  const supabase = await createServerSupabaseClient()

  const photo = await getPhotoById(photoId)
  if (!photo) {
    return { success: false, error: 'Photo not found' }
  }

  const { error } = await supabase
    .from('photos')
    .delete()
    .eq('id', photoId)

  if (error) {
    console.error('Error deleting photo:', error, 'photoId:', photoId)
    return { success: false, error: 'Failed to delete photo' }
  }

  return { success: true, filePath: photo.file_path }
}


