import { Button, Box, Typography, Container } from '@mui/material'
import Link from 'next/link'

export default function EventNotAvailable() {
  return (
    <Container>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 2 }}>
            Event Not Available
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            This event is currently inactive.
          </Typography>
          <Link href="/events">
            <Button variant="contained" sx={{ mt: 2 }}>
              Back to Events
            </Button>
          </Link>
        </Box>
      </Box>
    </Container>
  )
}
