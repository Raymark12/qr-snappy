import { NextRequest, NextResponse } from 'next/server'
import { createRouteSupabaseClient } from '@/lib/supabase/route'
import { requireAdmin } from '@/lib/utils/auth-helpers'
import { createSupabaseAdmin } from '@/lib/supabase/client'
import { z } from 'zod'

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'user', 'client']),
})

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteSupabaseClient(req)

    // Require admin access
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const authResult = await requireAdmin(supabase as any)

    if ('error' in authResult) {
      return authResult.error
    }

    const body = await req.json()
    const validationResult = createUserSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { email, password, role } = validationResult.data

    // Create user in Supabase Auth using Admin API
    const adminClient = createSupabaseAdmin()
    const {
      data: { user },
      error: createError,
    } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
    })

    if (createError || !user) {
      console.error('Error creating user:', createError)
      return NextResponse.json(
        { error: createError?.message || 'Failed to create user' },
        { status: 500 }
      )
    }

    // Update profile role (profile is created automatically by trigger)
    const { error: updateError } = await adminClient
      .from('profiles')
      .update({ role, email })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating profile:', updateError)
      // Try to delete the auth user if profile update fails
      await adminClient.auth.admin.deleteUser(user.id)
      return NextResponse.json({ error: 'Failed to update user profile' }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: user.id })
  } catch (err) {
    console.error('Create user error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteSupabaseClient(req)

    // Require admin access
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const authResult = await requireAdmin(supabase as any)

    if ('error' in authResult) {
      return authResult.error
    }

    const { getUsers } = await import('@/lib/db/users')
    const users = await getUsers()

    return NextResponse.json(users)
  } catch (err) {
    console.error('Get users error:', err)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

