'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  Chip,
  CircularProgress,
} from '@mui/material'
import {
  Lock as LockIcon,
  CalendarToday as CalendarIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material'
import type { Event } from '@/types'
import EventPasswordDialog from '@/components/events/dialogs/EventPasswordDialog'
import DeleteEventDialog from '@/components/events/dialogs/DeleteEventDialog'
import { format } from 'date-fns'
import { apiGet } from '@/lib/utils/api-client'
import { useIsAdmin, useIsEventModerator } from '@/hooks/useAuth'

interface EventCardProps {
  event: Event
}

export default function EventCard({ event }: EventCardProps) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [checkingAccess, setCheckingAccess] = useState(false)

  const isAdmin = useIsAdmin()
  const isModerator = useIsEventModerator(event.id)

  const handleAccessClick = async () => {
    const isAuthorized = isAdmin || isModerator

    if (isAuthorized) {
      setCheckingAccess(true)
      try {
        const result = await apiGet<{ allowed: boolean }>(`/api/events/${event.id}/access`)
        if (result.allowed) {
          router.push(`/events/${event.id}/photos`)
          return
        }
      } catch {
      } finally {
        setCheckingAccess(false)
      }
    }
    setDialogOpen(true)
  }

  return (
    <>
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: 4,
          },
        }}
      >
        <CardContent sx={{ flexGrow: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              mb: 1,
            }}
          >
            <Typography variant="h5" component="h2" gutterBottom fontWeight={600} sx={{ flex: 1 }}>
              {event.title}
            </Typography>
            {isAdmin && (
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon fontSize="small" />}
                onClick={() => setDeleteDialogOpen(true)}
                sx={{
                  ml: 1,
                  minWidth: 'auto',
                  px: 2,
                  py: 0.5,
                }}
              >
                Delete
              </Button>
            )}
          </Box>
          {event.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 60 }}>
              {event.description}
            </Typography>
          )}
          <Box sx={{ mb: 2 }}>
            <Chip
              label={event.is_active ? 'Active' : 'Inactive'}
              color={event.is_active ? 'success' : 'default'}
              size="small"
              sx={{ fontWeight: 500 }}
            />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
            <CalendarIcon fontSize="small" />
            <Typography variant="caption">
              Created {format(new Date(event.created_at), 'MMM d, yyyy')}
            </Typography>
          </Box>
        </CardContent>

        <CardActions sx={{ p: 2, pt: 0 }}>
          <Button
            variant="contained"
            fullWidth
            startIcon={
              checkingAccess ? <CircularProgress size={18} color="inherit" /> : <LockIcon />
            }
            onClick={handleAccessClick}
            disabled={checkingAccess}
            sx={{
              py: 1.5,
              fontWeight: 600,
              textTransform: 'none',
            }}
          >
            {checkingAccess ? '' : 'Access Event'}
          </Button>
        </CardActions>
      </Card>

      <EventPasswordDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={() => router.push(`/events/${event.id}/photos`)}
        event={event}
      />

      <DeleteEventDialog
        event={event}
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      />
    </>
  )
}
