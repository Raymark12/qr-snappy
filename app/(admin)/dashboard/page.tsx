import type { Metadata } from 'next'
import { createMetadata } from '@/lib/metadata'
import DashboardClient from '@/components/admin/DashboardClient'

export const metadata: Metadata = createMetadata({
  title: 'Dashboard',
  description: 'Manage your QR Snappy events and photos',
  noIndex: true,
  path: '/dashboard'
})

export default function Dashboard() {
  return <DashboardClient />
}
