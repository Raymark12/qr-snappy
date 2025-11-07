'use client'

import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import AdminLayout from '@/components/global/AdminLayout'
import { Typography, Box, Paper, Grid, Card, CardContent } from '@mui/material'
import {
  Event as EventIcon,
  PhotoLibrary as PhotoIcon,
  People as PeopleIcon,
  Storage as StorageIcon,
} from '@mui/icons-material'
import { formatBytes } from '@/lib/utils/format'
import UsersComponent from './UsersComponent'
import type { UserWithAssignments } from '@/lib/db/users'
import type { EventWithDetails } from '@/types'
import type { DashboardStats } from '@/lib/db/dashboard-stats'

interface DashboardComponentProps {
  users: UserWithAssignments[]
  events: EventWithDetails[]
  stats: DashboardStats
}

export default function DashboardComponent({ users, events, stats }: DashboardComponentProps) {
  const { user, isLoading } = useAuth()

  if (isLoading || !user) {
    return <LoadingSpinner message="Loading dashboard..." />
  }

  return (
    <AdminLayout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight={700}>
          Welcome back!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Here&apos;s what&apos;s happening with your events today
        </Typography>
      </Box>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={6} sm={6} md={3}>
          <Card
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              height: '100%',
              minHeight: { xs: 80, sm: 90 },
              aspectRatio: { xs: '1/1', sm: 'auto' },
            }}
          >
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexGrow: 1,
                }}
              >
                <Box>
                  <Typography color="text.secondary" variant="body2" gutterBottom>
                    Total Events
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {stats.totalEvents}
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
        <Grid item xs={6} sm={6} md={3}>
          <Card
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              height: '100%',
              minHeight: { xs: 80, sm: 90 },
              aspectRatio: { xs: '1/1', sm: 'auto' },
            }}
          >
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexGrow: 1,
                }}
              >
                <Box>
                  <Typography color="text.secondary" variant="body2" gutterBottom>
                    Photos
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {stats.totalPhotos.toLocaleString()}
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

        <Grid item xs={6} sm={6} md={3}>
          <Card
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              height: '100%',
              minHeight: { xs: 80, sm: 90 },
              aspectRatio: { xs: '1/1', sm: 'auto' },
            }}
          >
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexGrow: 1,
                }}
              >
                <Box>
                  <Typography color="text.secondary" variant="body2" gutterBottom>
                    Total Users
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {stats.totalUsers}
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
                  <PeopleIcon />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={6} md={3}>
          <Card
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              height: '100%',
              minHeight: { xs: 80, sm: 90 },
              aspectRatio: { xs: '1/1', sm: 'auto' },
            }}
          >
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexGrow: 1,
                }}
              >
                <Box>
                  <Typography color="text.secondary" variant="body2" gutterBottom>
                    Storage Files
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {stats.storageError ? 'Error' : stats.storageObjectsCount.toLocaleString()}
                  </Typography>
                  {stats.storageError && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                      Check R2 config
                    </Typography>
                  )}
                  {!stats.storageError && stats.storageUsedBytes > 0 && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                      {formatBytes(stats.storageUsedBytes)}
                    </Typography>
                  )}
                </Box>
                <Box
                  sx={{
                    bgcolor: 'secondary.main',
                    color: 'secondary.contrastText',
                    p: 1.5,
                    borderRadius: 2,
                  }}
                >
                  <StorageIcon />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={6} sm={6} md={3}>
          <Card
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              height: '100%',
              minHeight: { xs: 80, sm: 90 },
              aspectRatio: { xs: '1/1', sm: 'auto' },
            }}
          >
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexGrow: 1,
                }}
              >
                <Box>
                  <Typography color="text.secondary" variant="body2" gutterBottom>
                    Active Events
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {stats.activeEvents}
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
                  <EventIcon />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <Card
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              height: '100%',
              minHeight: { xs: 80, sm: 90 },
              aspectRatio: { xs: '1/1', sm: 'auto' },
            }}
          >
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexGrow: 1,
                }}
              >
                <Box>
                  <Typography color="text.secondary" variant="body2" gutterBottom>
                    Pending Photos
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {stats.pendingPhotos}
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
        <Grid item xs={6} sm={6} md={3}>
          <Card
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              height: '100%',
              minHeight: { xs: 80, sm: 90 },
              aspectRatio: { xs: '1/1', sm: 'auto' },
            }}
          >
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexGrow: 1,
                }}
              >
                <Box>
                  <Typography color="text.secondary" variant="body2" gutterBottom>
                    Admins
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {stats.usersByRole.admin}
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
                  <PeopleIcon />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <Card
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              height: '100%',
              minHeight: { xs: 80, sm: 90 },
              aspectRatio: { xs: '1/1', sm: 'auto' },
            }}
          >
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexGrow: 1,
                }}
              >
                <Box>
                  <Typography color="text.secondary" variant="body2" gutterBottom>
                    Clients
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {stats.usersByRole.client}
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
                  <PeopleIcon />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mb: 4 }}>
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

      {user.role === 'admin' && <UsersComponent initialUsers={users} events={events} />}
    </AdminLayout>
  )
}
