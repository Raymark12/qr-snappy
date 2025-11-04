import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createMetadata } from '@/lib/metadata'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/utils/auth-helpers'
import AdminLayout from '@/components/global/AdminLayout'
import EventsComponent from '@/components/admin/EventsComponent'

export const metadata: Metadata = createMetadata({
  title: 'Events',
  description: 'Browse and access active QR Snappy events',
  path: '/events',
})

export default async function EventsPage() {
  // Server-side authentication check
  const supabase = await createServerSupabaseClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const authResult = await requireAuth(supabase as any)

  if ('error' in authResult) {
    redirect('/login?redirected=true')
  }

  return (
    <AdminLayout>
      <EventsComponent />
    </AdminLayout>
  )
}
