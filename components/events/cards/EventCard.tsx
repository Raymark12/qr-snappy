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
  IconButton,
  Tooltip,
} from '@mui/material'
import {
  Lock as LockIcon,
  CalendarToday as CalendarIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material'
import type { Event } from '@/types'
import EventPasswordDialog from '@/components/events/dialogs/EventPasswordDialog'
import { format } from 'date-fns'
import { apiGet, apiPatch } from '@/lib/utils/api-client'
import { useIsAdmin, useIsEventModerator } from '@/hooks/useAuth'
import { useToastStore } from '@/stores/toastStore'

interface EventCardProps {
  event: Event
}

export default function EventCard({ event }: EventCardProps) {
  const router = useRouter()
  const showToast = useToastStore(state => state.showToast)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [checkingAccess, setCheckingAccess] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [optimisticActive, setOptimisticActive] = useState<boolean | null>(null)
  const isAdmin = useIsAdmin()
  const isModerator = useIsEventModerator(event.id)

  const displayIsActive = optimisticActive !== null ? optimisticActive : event.is_active

  const handleAccessClick = async () => {
    const isAuthorized = isAdmin || isModerator

    // If authorized, check cache first
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

  const handleToggleActive = async () => {
    const newActiveState = !displayIsActive

    setOptimisticActive(newActiveState)
    setToggling(true)

    try {
      const result = await apiPatch<{ success: boolean; error?: string }>(
        `/api/events/${event.id}/toggle-active`,
        { isActive: newActiveState }
      )

      if (result.success) {
        showToast(`Event ${newActiveState ? 'activated' : 'deactivated'} successfully`, 'success')
        setOptimisticActive(null)
        router.refresh()
      } else {
        setOptimisticActive(null)
        showToast(result.error || 'Failed to toggle event status. Please try again.', 'error')
      }
    } catch (error) {
      setOptimisticActive(null)
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to toggle event status. Please try again.'
      showToast(errorMessage, 'error')
      console.error('Error toggling event active status:', error)
    } finally {
      setToggling(false)
    }
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
              <Tooltip title={displayIsActive ? 'Deactivate Event' : 'Activate Event'}>
                <IconButton
                  size="small"
                  onClick={handleToggleActive}
                  disabled={toggling}
                  color={displayIsActive ? 'error' : 'success'}
                  sx={{ ml: 1 }}
                >
                  {toggling ? (
                    <CircularProgress size={20} />
                  ) : displayIsActive ? (
                    <BlockIcon fontSize="small" />
                  ) : (
                    <CheckCircleIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            )}
          </Box>
          {event.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 60 }}>
              {event.description}
            </Typography>
          )}
          <Box sx={{ mb: 2 }}>
            <Chip
              label={displayIsActive ? 'Active' : 'Inactive'}
              color={displayIsActive ? 'success' : 'default'}
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
            {checkingAccess ? 'Checking access...' : 'Access Event'}
          </Button>
        </CardActions>
      </Card>

      <EventPasswordDialog open={dialogOpen} onClose={() => setDialogOpen(false)} event={event} />
    </>
  )
}
