import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { createSupabaseClient } from '@/lib/supabase/client'
import type { LoginInput } from '@/lib/validations'
import { shallow } from 'zustand/shallow'

export const authKeys = {
  all: ['auth'] as const,
  user: () => [...authKeys.all, 'user'] as const,
  profile: (id: string) => [...authKeys.all, 'profile', id] as const,
}

export const useAuth = () => {
  return useAuthStore(
    (state) => ({
      user: state.user,
      isLoading: state.isLoading,
      isAdmin: state.user?.role === 'admin',
    }),
    shallow
  )
}

export const useIsAuthLoading = (): boolean => {
  return useAuthStore((state) => state.isLoading)
}

export const useUserProfile = () => {
  const user = useAuthStore(state => state.user)

  return useQuery({
    queryKey: authKeys.profile(user?.id || ''),
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID')

      const supabase = createSupabaseClient()
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!user?.id,
  })
}

export const useLogin = () => {
  const { login } = useAuthStore()

  return useMutation({
    mutationFn: async ({ email, password }: LoginInput) => {
      const result = await login(email, password)
      if (!result.success) {
        throw new Error(result.error || 'Login failed')
      }
      return result
    },
  })
}

export const useLogout = () => {
  const queryClient = useQueryClient()
  const { logout } = useAuthStore()

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear()
    },
  })
}

export const useIsAdmin = () => {
  const user = useAuthStore(state => state.user)
  return user?.role === 'admin'
}
