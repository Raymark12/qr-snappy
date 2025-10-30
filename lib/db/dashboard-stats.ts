import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getR2StorageUsage } from '@/lib/utils/r2-storage'

export interface DashboardStats {
  totalEvents: number
  activeEvents: number
  totalUsers: number
  totalPhotos: number
  pendingPhotos: number
  storageUsedBytes: number
  storageObjectsCount: number
  storageError?: string
  usersByRole: {
    admin: number
    user: number
    client: number
  }
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createServerSupabaseClient()

  const { count: totalEvents, error: eventsError } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })

  if (eventsError) {
    console.error('Error counting events:', eventsError)
  }

  const { count: activeEvents, error: activeEventsError } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)

  if (activeEventsError) {
    console.error('Error counting active events:', activeEventsError)
  }

  const { count: totalUsers, error: usersError } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })

  if (usersError) {
    console.error('Error counting users:', usersError)
  }

  const { data: usersByRole, error: usersByRoleError } = await supabase
    .from('profiles')
    .select('role')
    .returns<Array<{ role: 'admin' | 'user' | 'client' }>>()

  let adminCount = 0
  let userCount = 0
  let clientCount = 0

  if (!usersByRoleError && usersByRole) {
    usersByRole.forEach(u => {
      if (u.role === 'admin') adminCount++
      else if (u.role === 'user') userCount++
      else if (u.role === 'client') clientCount++
    })
  }

  const { count: totalPhotos, error: photosError } = await supabase
    .from('photos')
    .select('id', { count: 'exact', head: true })

  if (photosError) {
    console.error('Error counting photos:', photosError)
  }

  const { count: pendingPhotos, error: pendingPhotosError } = await supabase
    .from('photos')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')

  if (pendingPhotosError) {
    console.error('Error counting pending photos:', pendingPhotosError)
  }

  // Get R2 storage usage
  const storageResult = await getR2StorageUsage()
  const storageUsedBytes = storageResult.success ? storageResult.totalBytes || 0 : 0
  const storageObjectsCount = storageResult.success ? storageResult.totalObjects || 0 : 0
  const storageError = storageResult.success ? undefined : storageResult.error

  if (!storageResult.success) {
    console.error('Error getting storage usage:', storageResult.error)
  } else {
    console.log(`Dashboard storage usage: ${storageObjectsCount} objects, ${storageUsedBytes} bytes`)
  }

  return {
    totalEvents: totalEvents || 0,
    activeEvents: activeEvents || 0,
    totalUsers: totalUsers || 0,
    totalPhotos: totalPhotos || 0,
    pendingPhotos: pendingPhotos || 0,
    storageUsedBytes,
    storageObjectsCount,
    storageError,
    usersByRole: {
      admin: adminCount,
      user: userCount,
      client: clientCount,
    },
  }
}

