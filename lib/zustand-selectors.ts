import { useAuthStore } from '@/stores/authStore'
import type { AuthUser } from '@/types'
import { shallow } from 'zustand/shallow'

export const useAuth = () => {
  return useAuthStore(
    (state) => ({
      user: state.user,
      isLoading: state.isLoading,
      isAdmin: state.isAdmin,
    }),
    shallow
  )
}

export const useAuthUser = (): AuthUser | null => {
  return useAuthStore((state) => state.user)
}

export const useIsAuthLoading = (): boolean => {
  return useAuthStore((state) => state.isLoading)
}

export const useIsAdmin = (): boolean => {
  return useAuthStore((state) => state.isAdmin)
}

export const useLogout = () => {
  return useAuthStore((state) => state.logout)
}

