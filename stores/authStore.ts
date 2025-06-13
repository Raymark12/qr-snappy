import { createWithEqualityFn } from 'zustand/traditional'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase/client'
import type { AuthUser, UserRole } from '@/types'
import type { Database } from '@/types/database'

interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  isAdmin: boolean

  // Actions
  setUser: (user: AuthUser | null) => void
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  checkAdmin: () => boolean
  initialize: () => Promise<void>
}

export const useAuthStore = createWithEqualityFn<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,
      isAdmin: false,

      setUser: (user) => {
        set({
          user,
          isAdmin: user?.role === 'admin',
          isLoading: false
        })
      },

      login: async (email, password) => {
        try {
          set({ isLoading: true })

          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          })

          if (error) {
            set({ isLoading: false })
            return { success: false, error: error.message }
          }

          if (data.user) {
            // Fetch user profile to get role
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', data.user.id)
              .maybeSingle() as { data: { role: UserRole } | null; error: unknown }

            if (profileError) {
              console.error('Profile fetch error:', profileError)
              set({ isLoading: false })
              return { success: false, error: 'Failed to fetch user profile' }
            }
            // If user profile is not found, create it
            if (!profile) {
              const profileInsert: Database['public']['Tables']['profiles']['Insert'] = {
                id: data.user.id,
                email: data.user.email || null,
                role: 'user'
              }
              // Create user profile
              const { error: insertError } = await supabase
                .from('profiles')
                // @ts-expect-error - TypeScript has issues inferring Supabase insert types
                .insert(profileInsert)

              if (insertError) {
                console.error('Profile creation error:', insertError)
                set({ isLoading: false })
                return { success: false, error: 'Failed to create user profile' }
              }
            }

            const authUser: AuthUser = {
              id: data.user.id,
              email: data.user.email || 'unknown@user.com',
              role: profile?.role || 'user',
            }

            get().setUser(authUser)
            return { success: true }
          }

          return { success: false, error: 'Unknown error occurred' }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Login failed'
          set({ isLoading: false })
          return { success: false, error: message }
        }
      },

      logout: async () => {
        try {
          await supabase.auth.signOut()
          set({ user: null, isAdmin: false, isLoading: false })
        } catch (error) {
          console.error('Logout error:', error)
        }
      },

      checkAdmin: () => {
        return get().user?.role === 'admin'
      },

      initialize: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession()

          if (session?.user) {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', session.user.id)
              .maybeSingle() as { data: { role: UserRole } | null; error: unknown }

            if (profileError) {
              console.error('Profile fetch error during initialization:', profileError)
            }
            // If user profile is not found, create it
            if (!profile && !profileError) {
              const profileInsert: Database['public']['Tables']['profiles']['Insert'] = {
                id: session.user.id,
                email: session.user.email || null,
                role: 'user'
              }

              await supabase
                .from('profiles')
                // @ts-expect-error - Supabase type inference issue with RLS policies
                .insert(profileInsert)
            }

            const authUser: AuthUser = {
              id: session.user.id,
              email: session.user.email || 'unknown@user.com',
              role: profile?.role || 'user',
            }

            get().setUser(authUser)
          } else {
            set({ user: null, isAdmin: false, isLoading: false })
          }
        } catch (error) {
          console.error('Auth initialization error:', error)
          set({ user: null, isAdmin: false, isLoading: false })
        }
      },
    }),
    {
      name: 'qr-snappy-auth',
      partialize: (state) => ({ user: state.user }),
    }
  )
)
