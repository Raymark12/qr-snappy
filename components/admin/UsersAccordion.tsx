'use client'

import { useState } from 'react'
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Chip,
  Box,
  Divider,
  Button,
  ButtonGroup,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import {
  ExpandMore as ExpandMoreIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Event as EventIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material'
import { format } from 'date-fns'
import type { UserWithAssignments } from '@/lib/db/users'
import UpdateUserDialog from '@/components/admin/dialogs/UpdateUserDialog'
import DeleteUserDialog from '@/components/admin/dialogs/DeleteUserDialog'
import AssignEventDialog from '@/components/admin/dialogs/AssignEventDialog'

interface UsersAccordionProps {
  users: UserWithAssignments[]
  events: Array<{ id: string; title: string }>
  onRefresh: () => void
}

export default function UsersAccordion({ users, events, onRefresh }: UsersAccordionProps) {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('sm'))
  const [expanded, setExpanded] = useState<string | false>(false)
  const [selectedUser, setSelectedUser] = useState<UserWithAssignments | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)

  const handleChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false)
  }

  const handleEditClick = (user: UserWithAssignments) => {
    setSelectedUser(user)
    setUpdateDialogOpen(true)
  }

  const handleDeleteClick = (user: UserWithAssignments) => {
    setSelectedUser(user)
    setDeleteDialogOpen(true)
  }

  const handleAssignEventClick = (user: UserWithAssignments) => {
    setSelectedUser(user)
    setAssignDialogOpen(true)
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'error'
      case 'client':
        return 'primary'
      default:
        return 'default'
    }
  }

  if (users.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No users found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Create your first user to get started!
        </Typography>
      </Box>
    )
  }

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {users.map(user => (
          <Accordion
            key={user.id}
            expanded={expanded === user.id}
            onChange={handleChange(user.id)}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              '&:before': {
                display: 'none',
              },
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{
                '& .MuiAccordionSummary-content': {
                  alignItems: 'center',
                  gap: 2,
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
                <PersonIcon color="action" />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body1" fontWeight={600} noWrap>
                    {user.email || '-'}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Chip label={user.role} color={getRoleColor(user.role)} size="small" />
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                    >
                      <CalendarIcon sx={{ fontSize: 14 }} />
                      {format(new Date(user.created_at), 'MMM dd, yyyy')}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Divider sx={{ mb: 2 }} />

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 1 }}>
                  Assigned Events
                </Typography>
                {user.event_assignments && user.event_assignments.length > 0 ? (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {user.event_assignments.map(assignment => (
                      <Chip
                        key={assignment.id}
                        label={assignment.events?.title || 'Unknown Event'}
                        size="small"
                        variant="outlined"
                        icon={<EventIcon />}
                      />
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No events assigned
                  </Typography>
                )}
              </Box>

              {isDesktop ? (
                <ButtonGroup variant="outlined" fullWidth orientation="horizontal">
                  <Button
                    startIcon={<EventIcon />}
                    onClick={() => handleAssignEventClick(user)}
                    sx={{ flex: 1, textTransform: 'none' }}
                  >
                    Assign Event
                  </Button>
                  <Button
                    startIcon={<EditIcon />}
                    onClick={() => handleEditClick(user)}
                    sx={{ flex: 1, textTransform: 'none' }}
                  >
                    Edit User
                  </Button>
                  <Button
                    startIcon={<DeleteIcon />}
                    onClick={() => handleDeleteClick(user)}
                    color="error"
                    disabled={user.role === 'admin'}
                    title={user.role === 'admin' ? 'Cannot delete admin users' : 'Delete user'}
                    sx={{ flex: 1, textTransform: 'none' }}
                  >
                    Delete User
                  </Button>
                </ButtonGroup>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    width: '100%',
                  }}
                >
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<EventIcon />}
                    onClick={() => handleAssignEventClick(user)}
                    sx={{ textTransform: 'none' }}
                  >
                    Assign Event
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<EditIcon />}
                    onClick={() => handleEditClick(user)}
                    sx={{ textTransform: 'none' }}
                  >
                    Edit User
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<DeleteIcon />}
                    onClick={() => handleDeleteClick(user)}
                    color="error"
                    disabled={user.role === 'admin'}
                    title={user.role === 'admin' ? 'Cannot delete admin users' : 'Delete user'}
                    sx={{ textTransform: 'none' }}
                  >
                    Delete User
                  </Button>
                </Box>
              )}
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>

      {selectedUser && (
        <>
          <UpdateUserDialog
            user={selectedUser}
            open={updateDialogOpen}
            onClose={() => {
              setUpdateDialogOpen(false)
              setSelectedUser(null)
            }}
            onSuccess={onRefresh}
          />
          <DeleteUserDialog
            user={selectedUser}
            open={deleteDialogOpen}
            onClose={() => {
              setDeleteDialogOpen(false)
              setSelectedUser(null)
            }}
            onSuccess={onRefresh}
          />
          <AssignEventDialog
            user={selectedUser}
            events={events}
            open={assignDialogOpen}
            onClose={() => {
              setAssignDialogOpen(false)
              setSelectedUser(null)
            }}
            onSuccess={onRefresh}
          />
        </>
      )}
    </>
  )
}
