import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Photo } from '@/types'

export type InsertPhotoParams = {
  eventId: string
  userEmail: string | null
  filePath: string
  fileName: string
  author?: string | null
  comment?: string | null
  status?: 'pending' | 'approved' | 'rejected'
}

export async function getEventPhotos(eventId: string, includePendingForAdmin = false): Promise<Photo[]> {
  const supabase = await createServerSupabaseClient()

  let isUserAdmin = false
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single<{ role: 'admin' | 'user' | 'client' }>()
    isUserAdmin = profileData?.role === 'admin'
  }

  const query = supabase
    .from('photos')
    .select('*')
    .eq('event_id', eventId)
    .order('uploaded_at', { ascending: false })

  if (!includePendingForAdmin || !isUserAdmin) {
    query.eq('status', 'approved')
  }

  const { data: photosData, error: fetchError } = await query

  if (fetchError) {
    console.error('Error fetching photos:', fetchError)
    return []
  }

  return (photosData || []) as Photo[]
}

export async function insertPhotoRow(params: InsertPhotoParams): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createServerSupabaseClient()

  const { data: photoData, error: insertError } = await supabase
    .from('photos')
    // @ts-expect-error - Supabase generated types may not include author/comment yet
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
    console.error('Error inserting photo row:', insertError)
    return { success: false, error: 'Failed to save photo metadata' }
  }

  return { success: true, id: photoData?.id }
}


