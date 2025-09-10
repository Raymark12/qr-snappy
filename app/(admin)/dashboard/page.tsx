import type { Metadata } from 'next'
import { createMetadata } from '@/lib/metadata'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/utils/auth-helpers'
import { redirect } from 'next/navigation'
import DashboardComponent from '@/components/admin/DashboardComponent'
import { getUsers } from '@/lib/db/users'
import { getEvents } from '@/lib/db/events'
import { getDashboardStats } from '@/lib/db/dashboard-stats'

export const metadata: Metadata = createMetadata({
  title: 'Dashboard',
  description: 'Manage your QR Snappy events and photos',
  noIndex: true,
  path: '/dashboard',
})

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const authResult = await requireAdmin(supabase as any)

  if ('error' in authResult) {
    redirect('/login')
  }

  try {
    const [users, events, stats] = await Promise.all([getUsers(), getEvents(), getDashboardStats()])
    return <DashboardComponent users={users} events={events} stats={stats} />
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error)
    // TODO: Add a redirect or show message if it fails.
    throw new Error('Failed to load dashboard data. Please try again later.')
  }
}
