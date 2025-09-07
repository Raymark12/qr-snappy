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
import type { UserWithAssignments } from '@/lib/db/users'
import { apiDelete } from '@/lib/utils/api-client'

interface DeleteUserDialogProps {
  user: UserWithAssignments
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function DeleteUserDialog({
  user,
  open,
  onClose,
  onSuccess,
}: DeleteUserDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const handleDelete = () => {
    setError('')

    startTransition(async () => {
      try {
        await apiDelete(`/api/users/${user.id}`)
        onClose()
        onSuccess()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete user')
      }
    })
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Delete User</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 2 }}>
          <WarningIcon color="warning" sx={{ mt: 0.5 }} />
          <Box>
            <Typography variant="body1" gutterBottom>
              Are you sure you want to delete user <strong>{user.email || user.id}</strong>?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This action cannot be undone. All associated data will also be deleted.
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
            'Delete User'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
