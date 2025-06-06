'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Typography,
  Menu,
  MenuItem,
  ListItemIcon,
} from '@mui/material'
import {
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
  QrCode as QrCodeIcon,
  Visibility as ViewIcon,
  VisibilityOff as HiddenIcon,
} from '@mui/icons-material'
import { format } from 'date-fns'
import type { EventWithDetails } from '@/types'
import { toggleEventActive } from '@/lib/actions/events'
import { useRouter } from 'next/navigation'
import DeleteEventDialog from '../dialogs/DeleteEventDialog'

interface EventsTableProps {
  events: EventWithDetails[]
  isAdmin: boolean
}

export default function EventsTable({ events, isAdmin }: EventsTableProps) {
  const router = useRouter()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedEvent, setSelectedEvent] = useState<EventWithDetails | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isToggling, setIsToggling] = useState(false)

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, eventData: EventWithDetails) => {
    setAnchorEl(event.currentTarget)
    setSelectedEvent(eventData)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleDeleteClick = () => {
    handleMenuClose()
    setDeleteDialogOpen(true)
  }

  const handleToggleActive = async () => {
    if (!selectedEvent || isToggling) return

    setIsToggling(true)
    handleMenuClose()

    const result = await toggleEventActive(selectedEvent.id, !selectedEvent.is_active)

    if (result.success) {
      router.refresh()
    } else {
      alert(result.error || 'Failed to update event')
    }

    setIsToggling(false)
  }

  const handleViewQR = () => {
    if (selectedEvent) {
      // Navigate to QR code page (to be implemented)
      router.push(`/dashboard/events/${selectedEvent.id}/qr`)
    }
    handleMenuClose()
  }

  if (events.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No events found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isAdmin ? 'Create your first event to get started!' : 'No events assigned to you yet.'}
        </Typography>
      </Paper>
    )
  }

  return (
    <>
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{ border: '1px solid', borderColor: 'divider' }}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <strong>Title</strong>
              </TableCell>
              <TableCell>
                <strong>Description</strong>
              </TableCell>
              <TableCell>
                <strong>Status</strong>
              </TableCell>
              <TableCell>
                <strong>Created</strong>
              </TableCell>
              {isAdmin && (
                <TableCell>
                  <strong>Owner</strong>
                </TableCell>
              )}
              <TableCell align="right">
                <strong>Actions</strong>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {event.title}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      maxWidth: 300,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {event.description || '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={event.is_active ? 'Active' : 'Inactive'}
                    color={event.is_active ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {format(new Date(event.created_at), 'MMM dd, yyyy')}
                  </Typography>
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {event.profiles?.email || 'Unknown'}
                    </Typography>
                  </TableCell>
                )}
                <TableCell align="right">
                  <Tooltip title="Actions">
                    <IconButton size="small" onClick={(e) => handleMenuOpen(e, event)}>
                      <MoreVertIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleViewQR}>
          <ListItemIcon>
            <QrCodeIcon fontSize="small" />
          </ListItemIcon>
          View QR Code
        </MenuItem>
        {isAdmin && (
          <>
            <MenuItem onClick={handleToggleActive} disabled={isToggling}>
              <ListItemIcon>
                {selectedEvent?.is_active ? (
                  <HiddenIcon fontSize="small" />
                ) : (
                  <ViewIcon fontSize="small" />
                )}
              </ListItemIcon>
              {selectedEvent?.is_active ? 'Deactivate' : 'Activate'}
            </MenuItem>
            <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
              <ListItemIcon sx={{ color: 'error.main' }}>
                <DeleteIcon fontSize="small" />
              </ListItemIcon>
              Delete Event
            </MenuItem>
          </>
        )}
      </Menu>
      {selectedEvent && (
        <DeleteEventDialog
          event={selectedEvent}
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
        />
      )}
    </>
  )
}
