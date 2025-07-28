'use client'

import { useState } from 'react'
import { Button } from '@mui/material'
import { Add as AddIcon } from '@mui/icons-material'
import CreateEventDialog from '@/components/events/dialogs/CreateEventDialog'
import { useAuth } from '@/hooks/useAuth'

export default function CreateEventButton() {
  const { isAdmin } = useAuth()
  const [dialogOpen, setDialogOpen] = useState(false)

  if (!isAdmin) {
    return null
  }

  return (
    <>
      <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
        Create Event
      </Button>

      <CreateEventDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  )
}
