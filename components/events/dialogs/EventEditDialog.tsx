'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Box,
  Alert,
} from '@mui/material'
import { useTransition } from 'react'
import { apiPut } from '@/lib/utils/api-client'
import { useToastStore } from '@/stores/toastStore'

interface EventEditDialogProps {
  open: boolean
  onClose: () => void
  event: {
    id: string
    title: string
    description?: string | null
    is_active: boolean
    background_image_path?: string | null
    password?: string
    auto_approve?: boolean
  }
  onSuccess: () => void
  isAdmin?: boolean
}

export default function EventEditDialog({
  open,
  onClose,
  event,
  onSuccess,
  isAdmin = false,
}: EventEditDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const showToast = useToastStore(state => state.showToast)
  const [formData, setFormData] = useState({
    title: event.title || '',
    description: event.description || '',
    is_active: event.is_active,
    background_image_path: event.background_image_path || '',
    auto_approve: event.auto_approve || false,
    password: '', // Don't pre-fill with hashed password
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Prepare data for submission - only include password if user entered one
    const { password, ...otherData } = formData
    const submitData = password.trim() ? { ...otherData, password: password.trim() } : otherData

    startTransition(async () => {
      try {
        await apiPut(`/api/events/${event.id}`, submitData)
        showToast('Event updated successfully', 'success')
        onClose()
        onSuccess()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update event')
      }
    })
  }

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Edit Event</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label="Event Title"
              value={formData.title}
              onChange={handleChange('title')}
              required
              fullWidth
              disabled={isPending}
            />

            <TextField
              label="Description"
              value={formData.description}
              onChange={handleChange('description')}
              multiline
              rows={3}
              fullWidth
              disabled={isPending}
            />

            <TextField
              label={isAdmin ? 'Password' : 'Password (optional)'}
              type="password"
              value={formData.password}
              onChange={handleChange('password')}
              fullWidth
              disabled={isPending}
              helperText={
                isAdmin ? 'Set or change event password' : 'Leave empty to keep current password'
              }
            />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_active}
                    onChange={handleChange('is_active')}
                    disabled={isPending}
                  />
                }
                label="Event is active"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.auto_approve}
                    onChange={handleChange('auto_approve')}
                    disabled={isPending}
                  />
                }
                label="Auto-approve uploaded photos"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isPending}>
            {isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
