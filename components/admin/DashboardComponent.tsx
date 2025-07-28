'use client'

import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import AdminLayout from '@/components/global/AdminLayout'
import { Typography, Box, Paper, Grid, Card, CardContent } from '@mui/material'
import {
  Event as EventIcon,
  QrCode as QrCodeIcon,
  PhotoLibrary as PhotoIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material'

export default function DashboardClient() {
  const { user, isLoading } = useAuth()

  if (isLoading || !user) {
    return <LoadingSpinner message="Loading dashboard..." />
  }

  return (
    <AdminLayout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight={700}>
          Welcome back! 👋
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Here&apos;s what&apos;s happening with your events today
        </Typography>
      </Box>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2" gutterBottom>
                    Total Events
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    12
                  </Typography>
                </Box>
                <Box
                  sx={{
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    p: 1.5,
                    borderRadius: 2,
                  }}
                >
                  <EventIcon />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2" gutterBottom>
                    QR Codes
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    48
                  </Typography>
                </Box>
                <Box
                  sx={{
                    bgcolor: 'success.main',
                    color: 'success.contrastText',
                    p: 1.5,
                    borderRadius: 2,
                  }}
                >
                  <QrCodeIcon />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2" gutterBottom>
                    Photos
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    1,234
                  </Typography>
                </Box>
                <Box
                  sx={{
                    bgcolor: 'warning.main',
                    color: 'warning.contrastText',
                    p: 1.5,
                    borderRadius: 2,
                  }}
                >
                  <PhotoIcon />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2" gutterBottom>
                    Views
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    5.6k
                  </Typography>
                </Box>
                <Box
                  sx={{
                    bgcolor: 'info.main',
                    color: 'info.contrastText',
                    p: 1.5,
                    borderRadius: 2,
                  }}
                >
                  <TrendingUpIcon />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom fontWeight={600}>
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
    </AdminLayout>
  )
}
