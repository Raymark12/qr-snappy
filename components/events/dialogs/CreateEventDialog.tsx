'use client'

import { useState, useTransition } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material'
import { createEvent } from '@/lib/actions/events'
import { useRouter } from 'next/navigation'

interface CreateEventDialogProps {
  open: boolean
  onClose: () => void
}

export default function CreateEventDialog({ open, onClose }: CreateEventDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await createEvent(formData)

      if (result.success) {
        onClose()
        ;(e.target as HTMLFormElement).reset()
        router.refresh()
      } else {
        setError(result.error || 'Failed to create event')
      }
    })
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Create New Event</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              name="title"
              label="Event Title"
              required
              fullWidth
              autoFocus
              placeholder="Wedding, Birthday Party, etc."
              disabled={isPending}
            />
            <TextField
              name="description"
              label="Description"
              fullWidth
              multiline
              rows={3}
              placeholder="Optional description for this event..."
              disabled={isPending}
            />
            <TextField
              name="password"
              label="Event Password"
              type="password"
              required
              fullWidth
              helperText="Guests will need this password to upload photos"
              placeholder="Min 4 characters"
              disabled={isPending}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isPending}>
            {isPending ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Creating...
              </>
            ) : (
              'Create Event'
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
