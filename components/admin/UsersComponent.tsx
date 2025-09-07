'use client'

import { useState } from 'react'
import { Box, Container, Typography, Button, Paper, Alert } from '@mui/material'
import { PersonAdd as PersonAddIcon } from '@mui/icons-material'
import UsersAccordion from './UsersAccordion'
import UsersAccordionSkeleton from './UsersAccordionSkeleton'
import CreateUserDialog from '@/components/admin/dialogs/CreateUserDialog'
import { useRouter } from 'next/navigation'
import type { UserWithAssignments } from '@/lib/db/users'
import type { EventWithDetails } from '@/types'
import { apiGet } from '@/lib/utils/api-client'

interface UsersComponentProps {
  initialUsers: UserWithAssignments[]
  events: EventWithDetails[]
}

export default function UsersComponent({ initialUsers, events }: UsersComponentProps) {
  const router = useRouter()
  const [users, setUsers] = useState<UserWithAssignments[]>(initialUsers)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRefresh = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await apiGet<UserWithAssignments[]>('/api/users')
      setUsers(data)
    } catch (error) {
      console.error('Failed to refresh users:', error)
      setError(
        error instanceof Error ? error.message : 'Failed to refresh users. Please try again.'
      )
    } finally {
      setIsLoading(false)
      router.refresh()
    }
  }

  const handleCreateSuccess = () => {
    handleRefresh()
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        py: 6,
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            mb: 4,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: { xs: 2, sm: 0 },
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="h3"
              component="h1"
              gutterBottom
              fontWeight={700}
              sx={{
                background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Users Management
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Manage users and their event assignments
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{ textTransform: 'none', width: { xs: '100%', sm: 'auto' } }}
          >
            Create User
          </Button>
        </Box>

        <Paper sx={{ p: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {isLoading ? (
            <UsersAccordionSkeleton />
          ) : (
            <UsersAccordion
              users={users}
              events={events.map(e => ({ id: e.id, title: e.title }))}
              onRefresh={handleRefresh}
            />
          )}
        </Paper>

        <CreateUserDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          onSuccess={handleCreateSuccess}
        />
      </Container>
    </Box>
  )
}
