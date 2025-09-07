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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material'
import { useRouter } from 'next/navigation'
import { apiPost } from '@/lib/utils/api-client'

interface CreateUserDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateUserDialog({ open, onClose, onSuccess }: CreateUserDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const role = formData.get('role') as string

    startTransition(async () => {
      try {
        await apiPost('/api/users', { email, password, role })
        onClose()
        ;(e.target as HTMLFormElement).reset()
        onSuccess()
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create user')
      }
    })
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Create New User</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              name="email"
              label="Email"
              type="email"
              required
              fullWidth
              autoFocus
              placeholder="user@example.com"
              disabled={isPending}
            />
            <TextField
              name="password"
              label="Password"
              type="password"
              required
              fullWidth
              helperText="Minimum 6 characters"
              placeholder="Enter password"
              disabled={isPending}
            />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select name="role" label="Role" defaultValue="user" disabled={isPending}>
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
                Creating...
              </>
            ) : (
              'Create User'
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
