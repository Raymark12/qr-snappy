'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Box,
} from '@mui/material'
import { Warning as WarningIcon } from '@mui/icons-material'
import { deleteEvent } from '@/lib/actions/events'
import { useRouter } from 'next/navigation'
import { useToastStore } from '@/stores/toastStore'
import type { Event } from '@/types'

interface DeleteEventDialogProps {
  event: Pick<Event, 'id' | 'title'>
  open: boolean
  onClose: () => void
}

export default function DeleteEventDialog({ event, open, onClose }: DeleteEventDialogProps) {
  const router = useRouter()
  const showToast = useToastStore(state => state.showToast)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    setError('')
    setIsPending(true)

    try {
      const result = await deleteEvent(event.id)

      if (result.success) {
        showToast(`Event "${event.title}" deleted successfully`, 'success')
        onClose()
        router.refresh()
      } else {
        setError(result.error || 'Failed to delete event')
      }
    } catch (error) {
      console.error('Delete event error:', error)
      setError('Failed to delete event')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Delete Event</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 2 }}>
          <WarningIcon color="warning" sx={{ mt: 0.5 }} />
          <Box>
            <Typography variant="body1" gutterBottom>
              Are you sure you want to delete <strong>{event.title}</strong>?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This action cannot be undone. All associated photos will also be deleted.
            </Typography>
          </Box>
        </Box>
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button onClick={handleDelete} color="error" variant="contained" disabled={isPending}>
          {isPending ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" />
              Deleting...
            </>
          ) : (
            'Delete Event'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
