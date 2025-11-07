'use client'

import { Box, Skeleton } from '@mui/material'

export default function PhotosGridSkeleton() {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(2, 1fr)',
          sm: 'repeat(3, 1fr)',
          md: 'repeat(4, 1fr)',
          lg: 'repeat(5, 1fr)',
          xl: 'repeat(6, 1fr)',
        },
        gap: { xs: 1.5, md: 2 },
      }}
    >
      {[...Array(12)].map((_, i) => (
        <Box
          key={i}
          sx={{
            position: 'relative',
            width: '100%',
            paddingBottom: '100%',
            borderRadius: 2,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'grey.50',
          }}
        >
          <Skeleton
            variant="rectangular"
            width="100%"
            height="100%"
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              borderRadius: 2,
            }}
          />
        </Box>
      ))}
    </Box>
  )
}
