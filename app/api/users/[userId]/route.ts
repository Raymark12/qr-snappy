import { NextRequest, NextResponse } from 'next/server'
import { createRouteSupabaseClient } from '@/lib/supabase/route'
import { requireAdmin } from '@/lib/utils/auth-helpers'
import { createSupabaseAdmin } from '@/lib/supabase/client'
import { getUserById } from '@/lib/db/users'
import { validateUserId } from '@/lib/utils/validation'
import { z } from 'zod'

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  role: z.enum(['admin', 'user', 'client']).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params

    // Validate userId format
    if (!validateUserId(userId)) {
      return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 })
    }

    const supabase = createRouteSupabaseClient(req)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const authResult = await requireAdmin(supabase as any)

    if ('error' in authResult) {
      return authResult.error
    }

    const body = await req.json()
    const validationResult = updateUserSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    // Use admin client to update user (bypasses RLS)
    const adminClient = createSupabaseAdmin()
    const updateData: Record<string, unknown> = {}
    if (validationResult.data.email !== undefined) updateData.email = validationResult.data.email
    if (validationResult.data.role !== undefined) updateData.role = validationResult.data.role

    const { error: updateError } = await adminClient
      .from('profiles')
      .update(updateData)
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating user:', updateError)
      return NextResponse.json(
        { error: 'Failed to update user', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Update user error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params

    if (!validateUserId(userId)) {
      return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 })
    }

    const supabase = createRouteSupabaseClient(req)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const authResult = await requireAdmin(supabase as any)

    if ('error' in authResult) {
      return authResult.error
    }

    if (userId === authResult.user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    // Check if the user being deleted exists and get their role
    const userToDelete = await getUserById(userId)

    if (!userToDelete) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Delete user from auth and profile
    const adminClient = createSupabaseAdmin()

    // Check if user has created any events
    if (userToDelete.role === 'admin') {
      const { data: events } = await adminClient
        .from('events')
        .select('id')
        .eq('admin_id', userId)
        .limit(1)

      if (events && events.length > 0) {
        return NextResponse.json(
          { error: 'Cannot delete admin user. User has created events. Please transfer or delete events first.' },
          { status: 400 }
        )
      }
    }

    // Clean up references
    await adminClient
      .from('photos')
      .update({ reviewed_by: null })
      .eq('reviewed_by', userId)

    // Delete profile first
    const { error: profileDeleteError } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileDeleteError) {
      console.error('Error deleting profile:', profileDeleteError)
      return NextResponse.json(
        { error: 'Failed to delete user profile', details: profileDeleteError.message },
        { status: 500 }
      )
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error('Error deleting user from auth:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete user', details: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete user error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

