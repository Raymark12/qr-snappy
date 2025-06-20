import type { Metadata } from 'next'
import { createMetadata } from '@/lib/metadata'
import AdminLayout from '@/components/global/AdminLayout'
import EventsComponent from '@/components/admin/EventsComponent'

export const metadata: Metadata = createMetadata({
  title: 'Events',
  description: 'Browse and access active QR Snappy events',
  path: '/events',
})

export default function EventsPage() {
  return (
    <AdminLayout>
      <EventsComponent />
    </AdminLayout>
  )
}
