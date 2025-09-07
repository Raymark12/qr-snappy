import { Accordion, AccordionSummary, AccordionDetails, Skeleton, Box } from '@mui/material'
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material'

export default function UsersAccordionSkeleton() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((item) => (
        <Accordion
          key={item}
          disabled
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            '&:before': {
              display: 'none',
            },
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
              <Skeleton variant="circular" width={24} height={24} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Skeleton variant="text" width="60%" height={24} sx={{ mb: 1 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Skeleton variant="rounded" width={70} height={24} />
                  <Skeleton variant="text" width={100} height={20} />
                </Box>
              </Box>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ mb: 2 }}>
              <Skeleton variant="text" width={120} height={20} sx={{ mb: 1 }} />
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Skeleton variant="rounded" width={80} height={24} />
                <Skeleton variant="rounded" width={80} height={24} />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Skeleton variant="rounded" width="100%" height={40} />
              <Skeleton variant="rounded" width="100%" height={40} />
              <Skeleton variant="rounded" width="100%" height={40} />
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  )
}
