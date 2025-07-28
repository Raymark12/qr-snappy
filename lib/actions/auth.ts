'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { env } from '@/lib/env'

/**
 * Server Action for logout
 */
export async function logoutAction() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options) {
          try {
            cookieStore.set(name, value, options)
          } catch (error) {
            console.error('Cookie set failed:', error)
          }
        },
        remove(name: string, options) {
          try {
            cookieStore.set(name, '', { ...options, maxAge: 0 })
          } catch (error) {
            console.error('Cookie remove failed:', error)
          }
        },
      },
    }
  )

  await supabase.auth.signOut()

  // Revalidate all routes to clear cached data
  revalidatePath('/', 'layout')

  redirect('/')
}

