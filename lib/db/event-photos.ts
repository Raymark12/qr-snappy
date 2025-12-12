import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Media, MediaInsert } from '@/types'

export type InsertPhotoParams = {
  eventId: string
  userEmail: string | null
  filePath: string
  fileName: string
  author?: string | null
  comment?: string | null
  status?: 'pending' | 'approved'
}

export type PhotoCreateData = Omit<MediaInsert, 'id' | 'uploaded_at' | 'reviewed_at' | 'reviewed_by'>

export async function getEventPhotos(eventId: string, includePendingForModerator = false): Promise<Media[]> {
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
    .from('media')
    .select('*')
    .eq('event_id', eventId)
    .order('uploaded_at', { ascending: false })

  if (!includePendingForModerator || !isModerator) {
    query.eq('status', 'approved')
  }

  const { data: mediaData, error: fetchError } = await query

  if (fetchError) {
    console.error('Error fetching media:', fetchError, 'eventId:', eventId)
    return []
  }

  return (mediaData || []) as Media[]
}

export type PaginatedMediaResponse = {
  data: Media[]
  hasMore: boolean
  nextCursor: string | null
}

export async function getEventPhotosPaginated(
  eventId: string,
  cursor: string | null = null,
  limit = 20,
  includePendingForModerator = false
): Promise<PaginatedMediaResponse> {
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
    } else if (userRole === 'client') {
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

  let query = supabase
    .from('media')
    .select('*')
    .eq('event_id', eventId)
    .order('uploaded_at', { ascending: false })
    .limit(limit + 1) // Fetch one extra to check if there are more

  if (!includePendingForModerator || !isModerator) {
    query = query.eq('status', 'approved')
  }

  if (cursor) {
    query = query.lt('uploaded_at', cursor)
  }

  const { data: mediaData, error: fetchError } = await query

  if (fetchError) {
    console.error('Error fetching paginated media:', fetchError, 'eventId:', eventId)
    return { data: [], hasMore: false, nextCursor: null }
  }

  const data = (mediaData || []) as Media[]
  const hasMore = data.length > limit
  const actualData = hasMore ? data.slice(0, limit) : data
  const nextCursor = actualData.length > 0 ? actualData[actualData.length - 1].uploaded_at : null

  return {
    data: actualData,
    hasMore,
    nextCursor
  } as PaginatedMediaResponse
}

export async function insertPhotoRow(params: InsertPhotoParams): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createServerSupabaseClient()

  const { data: mediaData, error: insertError } = await supabase
    .from('media')
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
    console.error('Error inserting media row:', insertError, 'eventId:', params.eventId)
    return { success: false, error: 'Failed to save media metadata' }
  }

  return { success: true, id: mediaData?.id }
}

export async function updatePhotoStatus(
  photoId: string,
  status: 'approved',
  reviewedBy: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('media')
    // @ts-expect-error - Supabase types complexity
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewedBy,
    })
    .eq('id', photoId)

  if (error) {
    console.error('Error updating media status:', error, 'photoId:', photoId, 'status:', status, 'reviewedBy:', reviewedBy)
    return { success: false, error: 'Failed to update media status' }
  }

  return { success: true }
}

export async function getPhotoById(photoId: string): Promise<Media | null> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('media')
    .select('*')
    .eq('id', photoId)
    .single<Media>()

  if (error) {
    console.error('Error fetching media:', error, 'photoId:', photoId)
    return null
  }

  return data || null
}

export async function deletePhoto(photoId: string): Promise<{
  success: boolean
  filePath?: string
  thumbnailPath?: string | null
  previewPath?: string | null
  error?: string
}> {
  const supabase = await createServerSupabaseClient()

  const photo = await getPhotoById(photoId)
  if (!photo) {
    return { success: false, error: 'Media not found' }
  }

  const { error } = await supabase
    .from('media')
    .delete()
    .eq('id', photoId)

  if (error) {
    console.error('Error deleting media:', error, 'photoId:', photoId)
    return { success: false, error: 'Failed to delete media' }
  }

  return {
    success: true,
    filePath: photo.file_path,
    thumbnailPath: photo.thumbnail_path,
    previewPath: photo.preview_path
  }
}


