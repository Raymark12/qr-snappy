'use client'

import { useAuth } from '@/lib/zustand-selectors'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Container, Typography, Box, Paper } from '@mui/material'

export default function DashboardClient() {
  const { user, isLoading } = useAuth()

  if (isLoading || !user) {
    return <LoadingSpinner message="Loading dashboard..." />
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome back, {user.email}!
        </Typography>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Account Information
        </Typography>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Email: <strong>{user.email}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Role: <strong>{user.role}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            User ID: <strong>{user.id}</strong>
          </Typography>
        </Box>
      </Paper>
    </Container>
  )
}

