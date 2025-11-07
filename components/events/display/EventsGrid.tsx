import { getEventsForUser } from '@/lib/db/events'
import { Box, Typography, Grid } from '@mui/material'
import EventCard from '@/components/events/cards/EventCard'

export default async function EventsGrid() {
  try {
    const events = await getEventsForUser()

    if (events.length === 0) {
      return (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            px: 2,
          }}
        >
          <Typography variant="h5" color="text.secondary" gutterBottom>
            No Events
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Check back later for upcoming events!
          </Typography>
        </Box>
      )
    }

    return (
      <Grid container spacing={3}>
        {events.map(event => (
          <Grid item xs={12} sm={6} md={4} key={event.id}>
            <EventCard event={event} />
          </Grid>
        ))}
      </Grid>
    )
  } catch (error) {
    console.error('Error loading events:', error)
    return (
      <Box
        sx={{
          textAlign: 'center',
          py: 8,
          px: 2,
        }}
      >
        <Typography variant="h5" color="text.secondary" gutterBottom>
          Unable to load events
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Please try refreshing the page.
        </Typography>
      </Box>
    )
  }
}
