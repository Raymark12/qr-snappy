'use client'

import { useState, useTransition, useRef } from 'react'
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
  Typography,
} from '@mui/material'
import { Image as ImageIcon } from '@mui/icons-material'
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
  const [backgroundImage, setBackgroundImage] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setBackgroundImage(file)
    }
    e.currentTarget.value = ''
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await createEvent(formData)

      if (result.success && result.data?.id) {
        if (backgroundImage) {
          try {
            const bgFormData = new FormData()
            bgFormData.append('image', backgroundImage)
            const bgRes = await fetch(`/api/events/${result.data.id}/background`, {
              method: 'POST',
              body: bgFormData,
            })
            if (!bgRes.ok) {
              console.error('Failed to upload background image')
            }
          } catch (err) {
            console.error('Error uploading background image:', err)
          }
        }

        onClose()
        ;(e.target as HTMLFormElement).reset()
        setBackgroundImage(null)
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
            <Box>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleImageSelect}
              />
              <Button
                variant="outlined"
                startIcon={<ImageIcon />}
                onClick={() => fileInputRef.current?.click()}
                disabled={isPending}
                sx={{ textTransform: 'none', mb: 1 }}
                fullWidth
              >
                {backgroundImage ? 'Change Background Image' : 'Select Background Image (Optional)'}
              </Button>
              {backgroundImage && (
                <Typography variant="body2" color="text.secondary">
                  Selected: {backgroundImage.name}
                </Typography>
              )}
            </Box>
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
