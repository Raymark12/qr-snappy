import { Button } from '@mui/material'
import Link from 'next/link'

export default function EventNotAvailable() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Event Not Available</h1>
        <p className="text-gray-600">This event is currently inactive.</p>
        <Link href="/events">
          <Button variant="contained" sx={{ mt: 2 }}>
            Back to Events
          </Button>
        </Link>
      </div>
    </div>
  )
}
