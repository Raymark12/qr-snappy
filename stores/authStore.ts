


import { createWithEqualityFn } from 'zustand/traditional'

import { persist } from 'zustand/middleware'
import { createSupabaseClient } from '@/lib/supabase/client'
import type { AuthUser, UserRole } from '@/types'

interface AuthState {
  user: AuthUser | null
  isLoading: boolean


  setUser: (user: AuthUser | null) => void
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  initialize: () => Promise<void>
}


export const useAuthStore = createWithEqualityFn<AuthState>()(

  persist(

    (set, get) => ({

      user: null,
      isLoading: true,

      setUser: (user) => {
        set({
          user,
          isLoading: false
        })
      },

      login: async (email, password) => {
        try {
          set({ isLoading: true })

          const supabase = createSupabaseClient()
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
            // Obtiene el perfil del usuario de la base de datos para obtener el rol
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

            if (!profile) {
              console.error('CRITICAL: Profile missing for user', data.user.id)
              set({ isLoading: false })
              return { success: false, error: 'Account setup incomplete. Please contact support.' }
            }

            const authUser: AuthUser = {
              id: data.user.id,
              email: data.user.email ?? '',
              role: profile.role,
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
          const supabase = createSupabaseClient()
          await supabase.auth.signOut()
          set({ user: null, isLoading: false })
        } catch (error) {
          console.error('Logout error:', error)
        }
      },

      initialize: async () => {
        try {
          const supabase = createSupabaseClient()
          const { data: { session } } = await supabase.auth.getSession()

          if (session?.user) {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', session.user.id)
              .maybeSingle() as { data: { role: UserRole } | null; error: unknown }

            if (profileError) {
              console.error('Profile fetch error during initialization:', profileError)
              set({ user: null, isLoading: false })
              return
            }

            if (!profile) {
              console.error('CRITICAL: Profile missing for user', session.user.id)
              set({ user: null, isLoading: false })
              return
            }

            const authUser: AuthUser = {
              id: session.user.id,
              email: session.user.email ?? '',
              role: profile.role,
            }

            get().setUser(authUser)
          } else {
            set({ user: null, isLoading: false })
          }
        } catch (error) {
          console.error('Auth initialization error:', error)
          set({ user: null, isLoading: false })
        }
      },
    }),
    {
      name: 'qr-snappy-auth',
      partialize: (state) => ({ user: state.user }),
    }
  )
)
