'use client'

import { Grid, Card, CardContent, CardActions, Skeleton, Box } from '@mui/material'

export default function EventsGridSkeleton() {
  return (
    <Grid container spacing={3}>
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <Grid item xs={12} sm={6} md={4} key={item}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1 }}>
              <Skeleton variant="text" width="80%" height={40} sx={{ mb: 1 }} />
              <Skeleton variant="text" width="100%" height={20} />
              <Skeleton variant="text" width="90%" height={20} />
              <Skeleton variant="text" width="60%" height={20} sx={{ mb: 2 }} />
              <Box sx={{ mb: 2 }}>
                <Skeleton variant="rounded" width={80} height={24} />
              </Box>
              <Skeleton variant="text" width="40%" height={20} />
            </CardContent>
            <CardActions sx={{ p: 2, pt: 0 }}>
              <Skeleton variant="rounded" width="100%" height={42} />
            </CardActions>
          </Card>
        </Grid>
      ))}
    </Grid>
  )
}
