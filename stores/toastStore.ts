// ============================================================================
// TOAST STORE: Gestión de notificaciones globales
// ============================================================================
//
// SE USA ZUSTAND AQUÍ PORQUE:
// 1. ✅ Sin provider: No necesita wrapper de Provider
// 2. ✅ Mejor rendimiento: Solo re-renderiza componentes que usan el store
// 3. ✅ API simple: useToastStore() directamente
// 4. ✅ Consistente: Usa el mismo patrón que authStore
// 5. ✅ Accesible desde cualquier lugar (incluso fuera de React)
//
// ============================================================================

import { create } from 'zustand'
import { UI } from '@/lib/constants'

export type ToastSeverity = 'success' | 'error' | 'info' | 'warning'

export type ToastMessage = {
  id: string
  message: string
  severity: ToastSeverity
}

interface ToastState {
  toasts: ToastMessage[]
  timeouts: Map<string, NodeJS.Timeout>
  showToast: (message: string, severity: ToastSeverity) => void
  hideToast: (id: string) => void
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  timeouts: new Map(),
  showToast: (message: string, severity: ToastSeverity) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const toast: ToastMessage = { id, message, severity }

    // Auto-hide after duration
    const duration =
      severity === 'error' ? UI.TOAST_ERROR_DURATION : UI.TOAST_SUCCESS_DURATION
    const timeoutId = setTimeout(() => {
      get().hideToast(id)
    }, duration)

    set((state) => {
      const newTimeouts = new Map(state.timeouts)
      newTimeouts.set(id, timeoutId)
      return {
        toasts: [...state.toasts, toast],
        timeouts: newTimeouts,
      }
    })
  },
  hideToast: (id: string) => {
    set((state) => {
      const timeoutId = state.timeouts.get(id)
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      const newTimeouts = new Map(state.timeouts)
      newTimeouts.delete(id)

      return {
        toasts: state.toasts.filter((t) => t.id !== id),
        timeouts: newTimeouts,
      }
    })
  },
}))

