import type { Metadata } from 'next'
import { createMetadata } from '@/lib/metadata'
import { Login } from '@/components/admin/Login'

export const metadata: Metadata = createMetadata({
  title: 'Login',
  description: 'Sign in to your QR Snappy account',
  noIndex: true,
  path: '/login',
})

export default function LoginPage() {
  return <Login />
}
