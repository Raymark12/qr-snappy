'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Chip,
  Skeleton,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import DeleteIcon from '@mui/icons-material/Delete'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'

export type PhotoPreviewItem = {
  id: string
  file: File
  preview: string
  author?: string
  comment?: string
}

interface PhotoPreviewModalProps {
  open: boolean
  photos: PhotoPreviewItem[]
  onClose: () => void
  onUpload: (photos: PhotoPreviewItem[]) => void
  onUpdatePhoto: (id: string, updates: Partial<PhotoPreviewItem>) => void
  onRemovePhoto: (id: string) => void
}

export default function PhotoPreviewModal({
  open,
  photos,
  onClose,
  onUpload,
  onUpdatePhoto,
  onRemovePhoto,
}: PhotoPreviewModalProps) {
  const [globalAuthor, setGlobalAuthor] = useState('')
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set())

  const handleApplyAuthorToAll = () => {
    if (globalAuthor.trim()) {
      photos.forEach((photo) => {
        onUpdatePhoto(photo.id, { author: globalAuthor.trim() })
      })
    }
  }

  const handleUpload = () => {
    onUpload(photos)
  }

  const totalSize = photos.reduce((sum, p) => sum + p.file.size, 0)
  const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2)

  const handleImageLoad = (photoId: string) => {
    setLoadingImages((prev) => {
      const newSet = new Set(prev)
      newSet.delete(photoId)
      return newSet
    })
  }

  const handleImageLoadStart = (photoId: string) => {
    setLoadingImages((prev) => new Set(prev).add(photoId))
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h6">Preview Photos Before Upload</Typography>
          <Typography variant="caption" color="text.secondary">
            {photos.length} {photos.length === 1 ? 'photo' : 'photos'} • {totalSizeMB} MB total
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ mb: 3, p: 2, borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Quick Fill: Author Name
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              placeholder="Enter your name..."
              value={globalAuthor}
              onChange={(e) => setGlobalAuthor(e.target.value)}
              fullWidth
            />
            <Button
              variant="outlined"
              onClick={handleApplyAuthorToAll}
              disabled={!globalAuthor.trim()}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Apply to All
            </Button>
          </Box>
        </Box>

        <Grid container spacing={2}>
          {photos.map((photo) => (
            <Grid item xs={12} sm={6} md={4} key={photo.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ position: 'relative' }}>
                  {loadingImages.has(photo.id) && (
                    <Skeleton
                      variant="rectangular"
                      width="100%"
                      height={200}
                      sx={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}
                    />
                  )}
                  <CardMedia
                    component="img"
                    height="200"
                    image={photo.preview}
                    alt={photo.file.name}
                    sx={{ objectFit: 'cover' }}
                    onLoadStart={() => handleImageLoadStart(photo.id)}
                    onLoad={() => handleImageLoad(photo.id)}
                    onError={() => handleImageLoad(photo.id)}
                  />
                  <IconButton
                    onClick={() => onRemovePhoto(photo.id)}
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      bgcolor: 'rgba(0,0,0,0.6)',
                      color: 'white',
                      '&:hover': {
                        bgcolor: 'rgba(0,0,0,0.8)',
                      },
                    }}
                    size="small"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                  <Chip
                    label={`${(photo.file.size / 1024 / 1024).toFixed(2)} MB`}
                    size="small"
                    sx={{
                      position: 'absolute',
                      bottom: 8,
                      left: 8,
                      bgcolor: 'rgba(0,0,0,0.6)',
                      color: 'white',
                    }}
                  />
                </Box>
                <CardContent sx={{ flex: 1 }}>
                  <TextField
                    size="small"
                    label="Author (optional)"
                    placeholder="Your name..."
                    value={photo.author || ''}
                    onChange={(e) => onUpdatePhoto(photo.id, { author: e.target.value })}
                    fullWidth
                    sx={{ mb: 1 }}
                  />
                  <TextField
                    size="small"
                    label="Comment (optional)"
                    placeholder="Add a comment..."
                    value={photo.comment || ''}
                    onChange={(e) => onUpdatePhoto(photo.id, { comment: e.target.value })}
                    fullWidth
                    multiline
                    rows={2}
                  />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button
          onClick={handleUpload}
          variant="contained"
          startIcon={<CloudUploadIcon />}
          disabled={photos.length === 0}
        >
          Upload {photos.length} {photos.length === 1 ? 'Photo' : 'Photos'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
