'use client'

import { useState, useTransition } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Alert,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Typography,
} from '@mui/material'
import { Delete as DeleteIcon } from '@mui/icons-material'
import type { UserWithAssignments } from '@/lib/db/users'
import { apiPost } from '@/lib/utils/api-client'

interface AssignEventDialogProps {
  user: UserWithAssignments
  events: Array<{ id: string; title: string }>
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AssignEventDialog({
  user,
  events,
  open,
  onClose,
  onSuccess,
}: AssignEventDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [selectedEventId, setSelectedEventId] = useState('')
  const [unassigningEventId, setUnassigningEventId] = useState<string | null>(null)

  const currentAssignments = user.event_assignments || []

  const handleAssign = () => {
    if (!selectedEventId) return

    setError('')

    startTransition(async () => {
      try {
        await apiPost(`/api/users/${user.id}/assign-event`, { eventId: selectedEventId })
        setSelectedEventId('')
        onSuccess()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to assign event')
      }
    })
  }

  const handleUnassign = (eventId: string) => {
    if (unassigningEventId || isPending) return

    setError('')
    setUnassigningEventId(eventId)

    startTransition(async () => {
      try {
        await apiPost(`/api/users/${user.id}/unassign-event`, { eventId })
        onSuccess()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to unassign event')
      } finally {
        setUnassigningEventId(null)
      }
    })
  }

  const availableEvents = events.filter(
    event => !currentAssignments.some(assignment => assignment.event_id === event.id)
  )

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Assign Events to User</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <Typography variant="body2" color="text.secondary" gutterBottom>
            Current Assignments:
          </Typography>
          {currentAssignments.length > 0 ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {currentAssignments.map(assignment => {
                const isUnassigning = unassigningEventId === assignment.event_id
                return (
                  <Chip
                    key={assignment.id}
                    label={assignment.events?.title || 'Unknown Event'}
                    onDelete={
                      isUnassigning || isPending
                        ? undefined
                        : () => handleUnassign(assignment.event_id)
                    }
                    deleteIcon={isUnassigning ? <CircularProgress size={16} /> : <DeleteIcon />}
                    color="primary"
                    variant="outlined"
                    disabled={isUnassigning || isPending}
                  />
                )
              })}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No events assigned
            </Typography>
          )}

          {availableEvents.length > 0 && (
            <FormControl fullWidth>
              <InputLabel>Assign Event</InputLabel>
              <Select
                label="Assign Event"
                value={selectedEventId}
                onChange={e => setSelectedEventId(e.target.value)}
                disabled={isPending}
              >
                {availableEvents.map(event => (
                  <MenuItem key={event.id} value={event.id}>
                    {event.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isPending}>
          Close
        </Button>
        {availableEvents.length > 0 && (
          <Button
            onClick={handleAssign}
            variant="contained"
            disabled={isPending || !selectedEventId}
          >
            {isPending ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Assigning...
              </>
            ) : (
              'Assign Event'
            )}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
