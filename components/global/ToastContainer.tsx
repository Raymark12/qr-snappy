'use client'

import { memo } from 'react'
import { Snackbar, Alert } from '@mui/material'
import { useToastStore } from '@/stores/toastStore'
import { UI } from '@/lib/constants'

/**
 * ToastContainer: Componente que renderiza las notificaciones toast
 * Optimizado con memo y selector único para evitar re-renders innecesarios
 */
function ToastContainer() {
  const { toasts, hideToast } = useToastStore(state => ({
    toasts: state.toasts,
    hideToast: state.hideToast,
  }))

  return (
    <>
      {toasts.map((toast, index) => (
        <Snackbar
          key={toast.id}
          open={true}
          autoHideDuration={
            toast.severity === 'error' ? UI.TOAST_ERROR_DURATION : UI.TOAST_SUCCESS_DURATION
          }
          onClose={() => hideToast(toast.id)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          sx={{ bottom: { xs: 80 + index * 70, sm: 24 + index * 70 } }}
        >
          <Alert
            onClose={() => hideToast(toast.id)}
            severity={toast.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {toast.message}
          </Alert>
        </Snackbar>
      ))}
    </>
  )
}

export default memo(ToastContainer)
