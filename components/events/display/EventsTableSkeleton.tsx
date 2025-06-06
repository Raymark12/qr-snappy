import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Skeleton,
} from '@mui/material'

export default function EventsTableSkeleton() {
  return (
    <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>
              <strong>Title</strong>
            </TableCell>
            <TableCell>
              <strong>Description</strong>
            </TableCell>
            <TableCell>
              <strong>Status</strong>
            </TableCell>
            <TableCell>
              <strong>Created</strong>
            </TableCell>
            <TableCell>
              <strong>Owner</strong>
            </TableCell>
            <TableCell align="right">
              <strong>Actions</strong>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {[1, 2, 3, 4, 5].map((row) => (
            <TableRow key={row}>
              <TableCell>
                <Skeleton variant="text" width={150} />
              </TableCell>
              <TableCell>
                <Skeleton variant="text" width={250} />
              </TableCell>
              <TableCell>
                <Skeleton variant="rounded" width={70} height={24} />
              </TableCell>
              <TableCell>
                <Skeleton variant="text" width={100} />
              </TableCell>
              <TableCell>
                <Skeleton variant="text" width={120} />
              </TableCell>
              <TableCell align="right">
                <Skeleton variant="circular" width={32} height={32} sx={{ ml: 'auto' }} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

