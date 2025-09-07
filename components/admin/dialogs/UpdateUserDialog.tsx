'use client'

import { useState, useTransition, useEffect } from 'react'
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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material'
import type { UserWithAssignments } from '@/lib/db/users'
import { apiPatch } from '@/lib/utils/api-client'

interface UpdateUserDialogProps {
  user: UserWithAssignments
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function UpdateUserDialog({
  user,
  open,
  onClose,
  onSuccess,
}: UpdateUserDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [email, setEmail] = useState(user.email || '')
  const [role, setRole] = useState(user.role)

  useEffect(() => {
    if (open) {
      setEmail(user.email || '')
      setRole(user.role)
      setError('')
    }
  }, [open, user])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    startTransition(async () => {
      try {
        await apiPatch(`/api/users/${user.id}`, { email, role })
        onClose()
        onSuccess()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update user')
      }
    })
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Update User</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Email"
              type="email"
              required
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              disabled={isPending}
            />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                label="Role"
                value={role}
                onChange={(e) => setRole(e.target.value as 'admin' | 'user' | 'client')}
                disabled={isPending}
              >
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="client">Client</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
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
                Updating...
              </>
            ) : (
              'Update User'
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
