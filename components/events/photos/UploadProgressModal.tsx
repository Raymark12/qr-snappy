'use client'

import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  LinearProgress,
  List,
  ListItem,
  IconButton,
  Button,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import { UploadProgress, formatBytes, formatSpeed, formatTime } from '@/hooks/useAxiosUpload'

interface UploadProgressModalProps {
  open: boolean
  onClose: () => void
  uploads: UploadProgress[]
  onCancel: (fileIndex: number) => void
  onCancelAll: () => void
}

export default function UploadProgressModal({
  open,
  onClose,
  uploads,
  onCancel,
  onCancelAll,
}: UploadProgressModalProps) {
  const activeUploads = uploads.filter(u =>
    ['queued', 'uploading', 'processing'].includes(u.status)
  )
  const completedUploads = uploads.filter(u => u.status === 'complete')
  const failedUploads = uploads.filter(u => u.status === 'error' || u.status === 'cancelled')

  const totalFiles = uploads.length
  const finishedFiles = completedUploads.length + failedUploads.length
  const overallProgress = totalFiles > 0 ? (finishedFiles / totalFiles) * 100 : 0

  const isFinished = finishedFiles === totalFiles && totalFiles > 0

  return (
    <Dialog open={open} onClose={isFinished ? onClose : undefined} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {isFinished ? 'Upload Complete' : `Uploading ${activeUploads.length} files...`}
        {isFinished && (
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent dividers>
        {!isFinished && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {finishedFiles} of {totalFiles} files
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Math.round(overallProgress)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={overallProgress}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
        )}

        <List disablePadding>
          {uploads.map(upload => (
            <ListItem
              key={upload.fileIndex}
              divider
              sx={{ flexDirection: 'column', alignItems: 'stretch', py: 2 }}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 1,
                }}
              >
                <Typography variant="body2" noWrap sx={{ maxWidth: '70%', fontWeight: 500 }}>
                  {upload.fileName}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {upload.status === 'complete' && (
                    <CheckCircleIcon color="success" fontSize="small" />
                  )}
                  {upload.status === 'error' && <ErrorIcon color="error" fontSize="small" />}
                  {upload.status === 'cancelled' && (
                    <Typography variant="caption" color="text.secondary">
                      Cancelled
                    </Typography>
                  )}
                  {upload.status === 'uploading' && (
                    <IconButton size="small" onClick={() => onCancel(upload.fileIndex)}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              </Box>

              {(upload.status === 'uploading' || upload.status === 'processing') && (
                <Box>
                  <LinearProgress
                    variant={upload.status === 'processing' ? 'indeterminate' : 'determinate'}
                    value={upload.progress}
                    sx={{ mb: 1, height: 6, borderRadius: 3 }}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">
                      {upload.status === 'processing'
                        ? 'Processing...'
                        : `${formatBytes(upload.uploadedBytes)} of ${formatBytes(upload.fileSize)}`}
                    </Typography>
                    {upload.status === 'uploading' && (
                      <Typography variant="caption" color="text.secondary">
                        {formatSpeed(upload.speed)} • {formatTime(upload.timeRemaining)} left
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}

              {upload.error && (
                <Typography variant="caption" color="error">
                  {upload.error}
                </Typography>
              )}
            </ListItem>
          ))}
        </List>
      </DialogContent>

      {!isFinished && (
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={onCancelAll} color="error">
            Cancel All
          </Button>
        </Box>
      )}

      {isFinished && (
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={onClose} variant="contained">
            Done
          </Button>
        </Box>
      )}
    </Dialog>
  )
}
