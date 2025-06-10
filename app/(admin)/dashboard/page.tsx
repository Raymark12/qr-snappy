import type { Metadata } from 'next'
import { createMetadata } from '@/lib/metadata'
import DashboardComponent from '@/components/admin/DashboardComponent'

export const metadata: Metadata = createMetadata({
  title: 'Dashboard',
  description: 'Manage your QR Snappy events and photos',
  noIndex: true,
  path: '/dashboard',
})

export default function DashboardPage() {
  return <DashboardComponent />
}
