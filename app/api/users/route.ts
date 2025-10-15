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

    const allowedRoles = ['admin', 'user', 'client'] as const
    if (!allowedRoles.includes(role as typeof allowedRoles[number])) {
      return NextResponse.json(
        { error: 'Invalid role', details: `Role must be one of: ${allowedRoles.join(', ')}` },
        { status: 400 }
      )
    }

    console.log('Creating user with role:', role, 'Type:', typeof role, 'Length:', role?.length)

    // Create user in Supabase Auth using Admin API
    const adminClient = createSupabaseAdmin()
    const {
      data: { user },
      error: createError,
    } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createError || !user) {
      console.error('Error creating user:', createError)
      return NextResponse.json(
        { error: createError?.message || 'Failed to create user' },
        { status: 500 }
      )
    }

    await new Promise(resolve => setTimeout(resolve, 500))

    // Update profile role (retry if profile not ready)
    let profileUpdated = false
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data: profile, error: checkError } = await adminClient
        .from('profiles')
        .select('id, role, email')
        .eq('id', user.id)
        .maybeSingle()

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking profile:', checkError)
        await adminClient.auth.admin.deleteUser(user.id)
        return NextResponse.json(
          { error: 'Failed to verify profile creation' },
          { status: 500 }
        )
      }

      if (!profile) {
        await new Promise(resolve => setTimeout(resolve, 500))
        continue
      }

      const normalizedRole = role.toLowerCase().trim() as 'admin' | 'user' | 'client'
      if (!allowedRoles.includes(normalizedRole)) {
        console.error('Invalid normalized role:', normalizedRole)
        await adminClient.auth.admin.deleteUser(user.id)
        return NextResponse.json(
          { error: 'Invalid role value after normalization' },
          { status: 500 }
        )
      }
      const { data: updatedProfile, error: updateError } = await adminClient
        .from('profiles')
        .update({ role: normalizedRole, email })
        .eq('id', user.id)
        .select('role, email')
        .single()

      if (updateError) {
        const errorCode = (updateError as { code?: string }).code || ''
        const errorMessage = (updateError as { message?: string }).message || String(updateError)

        console.error('Error updating profile:', {
          code: errorCode,
          message: errorMessage,
          fullError: updateError,
          attempt: attempt + 1,
          userId: user.id,
          desiredRole: role
        })

        if (errorCode === 'PGRST116') {
          await new Promise(resolve => setTimeout(resolve, 500))
          continue
        }

        await adminClient.auth.admin.deleteUser(user.id)
        return NextResponse.json(
          {
            error: 'Failed to update user profile',
            details: errorMessage,
            code: errorCode
          },
          { status: 500 }
        )
      }

      // Verify the update was successful
      if (updatedProfile && updatedProfile.role === normalizedRole && updatedProfile.email === email) {
        profileUpdated = true
        break
      }
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    if (!profileUpdated) {
      await adminClient.auth.admin.deleteUser(user.id)
      return NextResponse.json(
        { error: 'Profile was not created' },
        { status: 500 }
      )
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

