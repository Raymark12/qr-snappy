'use client'

import { useState } from 'react'
import { Card, CardContent, CardActions, Typography, Button, Box, Chip } from '@mui/material'
import { Lock as LockIcon, CalendarToday as CalendarIcon } from '@mui/icons-material'
import type { Event } from '@/types'
import EventPasswordDialog from '@/components/events/dialogs/EventPasswordDialog'
import { format } from 'date-fns'

interface EventCardProps {
  event: Event
}

export default function EventCard({ event }: EventCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleAccessClick = () => {
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
          <Typography variant="h5" component="h2" gutterBottom fontWeight={600}>
            {event.title}
          </Typography>
          {event.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 60 }}>
              {event.description}
            </Typography>
          )}
          <Box sx={{ mb: 2 }}>
            <Chip label="Active" color="success" size="small" sx={{ fontWeight: 500 }} />
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
            startIcon={<LockIcon />}
            onClick={handleAccessClick}
            sx={{
              py: 1.5,
              fontWeight: 600,
              textTransform: 'none',
            }}
          >
            Access Event
          </Button>
        </CardActions>
      </Card>

      <EventPasswordDialog open={dialogOpen} onClose={() => setDialogOpen(false)} event={event} />
    </>
  )
}
