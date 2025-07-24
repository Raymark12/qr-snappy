import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export type UserRole = 'admin' | 'user' | 'client'

export interface AuthUser {
  id: string
  email: string | null
  role: UserRole
}

export interface AuthResult {
  user: AuthUser
  error?: never
}

export interface AuthError {
  user?: never
  error: NextResponse
}

export async function getCurrentUser(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>
): Promise<AuthUser | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .single<{ role: UserRole; email: string | null }>()

  if (!profile) {
    return null
  }

  return {
    id: user.id,
    email: profile.email,
    role: profile.role,
  }
}

export async function requireAuth(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>
): Promise<AuthResult | AuthError> {
  const user = await getCurrentUser(supabase)

  if (!user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  return { user }
}

export async function requireAdmin(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>
): Promise<AuthResult | AuthError> {
  const authResult = await requireAuth(supabase)

  if ('error' in authResult) {
    return authResult
  }

  if (authResult.user.role !== 'admin') {
    return {
      error: NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      ),
    }
  }

  return authResult
}

/**
 * Check if user has access to an event (either admin or assigned client)
 * @param supabase - Supabase client instance
 * @param eventId - Event ID to check access for
 * @param user - Authenticated user
 * @returns true if user has access, false otherwise
 */
export async function hasEventAccess(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  eventId: string,
  user: AuthUser
): Promise<boolean> {
  if (user.role === 'admin') {
    return true
  }

  // Check if user is assigned to the event
  const { data: assignment } = await supabase
    .from('event_assignments')
    .select('id')
    .eq('event_id', eventId)
    .eq('client_id', user.id)
    .single()

  return !!assignment
}

export async function requireEventAccess(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  eventId: string
): Promise<AuthResult | AuthError> {
  const authResult = await requireAuth(supabase)

  if ('error' in authResult) {
    return authResult
  }

  const hasAccess = await hasEventAccess(supabase, eventId, authResult.user)

  if (!hasAccess) {
    return {
      error: NextResponse.json(
        { error: 'Forbidden - No access to this event' },
        { status: 403 }
      ),
    }
  }

  return authResult
}

export async function isAdmin(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>
): Promise<boolean> {
  const user = await getCurrentUser(supabase)
  return user?.role === 'admin'
}
