import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/database'
import { env } from '@/lib/env'

function parseCookies(request: Request) {
  const cookieHeader = request.headers.get('cookie') ?? ''
  const pairs = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)

  const cookieMap = new Map<string, string>()
  for (const pair of pairs) {
    const [key, ...rest] = pair.split('=')
    if (!key) continue
    const value = rest.join('=')
    cookieMap.set(key, decodeURIComponent(value))
  }
  return cookieMap
}

/**
 * Create Supabase client for API route handlers
 * Reads cookies from Request object
 */
export function createRouteSupabaseClient(request: Request) {
  const cookieMap = parseCookies(request)

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return cookieMap.get(name)
        },
        set() {
        },
        remove() {
        },
      },
    }
  )
}

