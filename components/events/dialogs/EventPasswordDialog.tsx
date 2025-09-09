'use client'

import { useState, useTransition } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material'
import { Lock as LockIcon } from '@mui/icons-material'
import type { Event } from '@/types'
import { useRouter } from 'next/navigation'
import { apiPost } from '@/lib/utils/api-client'

interface EventPasswordDialogProps {
  open: boolean
  onClose: () => void
  event: Event
}

export default function EventPasswordDialog({ open, onClose, event }: EventPasswordDialogProps) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  // no-op

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!password.trim()) {
      setError('Please enter a password')
      return
    }

    startTransition(async () => {
      try {
        const data = await apiPost<{ success: boolean; error?: string }>(
          '/api/events/verify-password',
          {
            eventId: event.id,
            password: password,
          }
        )

        if (data.success) {
          router.push(`/events/${event.id}/photos`)
        } else {
          setError(data.error || 'Invalid password')
          setPassword('')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred. Please try again.')
      }
    })
  }

  const handleClose = () => {
    if (!isPending) {
      setPassword('')
      setError('')
      onClose()
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        component: 'form',
        onSubmit: handleSubmit,
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LockIcon color="primary" />
          <span>Enter Event Password</span>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            {event.title}
          </Typography>
          {event.description && (
            <Typography variant="body2" color="text.secondary">
              {event.description}
            </Typography>
          )}
        </Box>
        <TextField
          autoFocus
          label="Password"
          type="password"
          fullWidth
          value={password}
          onChange={e => setPassword(e.target.value)}
          disabled={isPending}
          error={!!error}
          helperText={error || 'Enter the password to access this event'}
          sx={{ mt: 2 }}
        />
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} disabled={isPending} sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={isPending || !password.trim()}
          sx={{ textTransform: 'none', minWidth: 100 }}
        >
          {isPending ? <CircularProgress size={24} /> : 'Access'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
