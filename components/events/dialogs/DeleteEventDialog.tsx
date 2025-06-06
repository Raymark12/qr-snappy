'use client'

import { useState, useTransition } from 'react'
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
import type { EventWithDetails } from '@/types'

interface DeleteEventDialogProps {
  event: EventWithDetails
  open: boolean
  onClose: () => void
}

export default function DeleteEventDialog({ event, open, onClose }: DeleteEventDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const handleDelete = () => {
    setError('')

    startTransition(async () => {
      const result = await deleteEvent(event.id)

      if (result.success) {
        onClose()
        router.refresh()
      } else {
        setError(result.error || 'Failed to delete event')
      }
    })
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
