'use client'

import { useEffect, useState, useRef } from 'react'
import { Box, Paper, Typography, Button, CircularProgress } from '@mui/material'
import Image from 'next/image'
import {
  QrCode as QrIcon,
  Image as ImageIcon,
  Wallpaper as WallpaperIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material'
import { apiGet } from '@/lib/utils/api-client'
import { getAuthenticatedImageUrl } from '@/lib/utils/storage'

interface EventQRSectionProps {
  eventId: string
  eventTitle?: string
  eventDescription?: string | null
  backgroundImagePath?: string | null
  publicMode?: boolean
}

export default function EventQRSection({
  eventId,
  eventTitle,
  eventDescription,
  backgroundImagePath,
  publicMode = false,
}: EventQRSectionProps) {
  const [loading, setLoading] = useState(false)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null)
  const [backgroundLoading, setBackgroundLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const backgroundInputRef = useRef<HTMLInputElement | null>(null)

  const fetchExisting = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiGet<{ exists: boolean; url?: string }>(`/api/events/${eventId}/qr`)
      if (res.exists && res.url) {
        setQrUrl(res.url)
        setRefreshKey(prev => prev + 1)
      } else {
        setQrUrl(null)
      }
    } catch (err) {
      setQrUrl(null)
      setError('Failed to load QR code')
      console.error('Failed to fetch QR:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExisting()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  useEffect(() => {
    const loadBackground = async () => {
      if (backgroundImagePath) {
        try {
          setBackgroundLoading(true)
          const url = await getAuthenticatedImageUrl(backgroundImagePath, {
            publicMode,
            eventId,
          })
          setBackgroundUrl(url)
        } catch (err) {
          console.error('Failed to load background image:', err)
          setBackgroundUrl(null)
        } finally {
          setBackgroundLoading(false)
        }
      } else {
        setBackgroundUrl(null)
      }
    }
    loadBackground()
  }, [backgroundImagePath, publicMode, eventId])

  const handleBackgroundChange = () => {
    backgroundInputRef.current?.click()
  }

  const handleBackgroundSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setBackgroundLoading(true)
    try {
      const form = new FormData()
      form.append('image', file)
      const res = await fetch(`/api/events/${eventId}/background`, { method: 'POST', body: form })
      const data = await res.json()
      if (res.ok && data.success && data.url) {
        setBackgroundUrl(data.url)
        setRefreshKey(prev => prev + 1)
      } else {
        setError(data.error || 'Failed to upload background image')
      }
    } catch (err) {
      setError('Failed to upload background image')
      console.error('Background upload failed:', err)
    } finally {
      setBackgroundLoading(false)
      if (backgroundInputRef.current) {
        backgroundInputRef.current.value = ''
      }
    }
  }

  const handleBackgroundDelete = async () => {
    setBackgroundLoading(true)
    try {
      const res = await fetch(`/api/events/${eventId}/background`, { method: 'DELETE' })
      if (res.ok) {
        setBackgroundUrl(null)
        setRefreshKey(prev => prev + 1)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to delete background image')
      }
    } catch (err) {
      setError('Failed to delete background image')
      console.error('Background deletion failed:', err)
    } finally {
      setBackgroundLoading(false)
    }
  }

  const handleGenerate = async (file?: File) => {
    setLoading(true)
    setError(null)
    try {
      const form = new FormData()
      if (file) {
        form.append('logo', file)
        form.append('aggressive', 'true')
        form.append('logoSize', '0.36')
        form.append('qrWidth', '1400')
      }
      const res = await fetch(`/api/events/${eventId}/qr`, { method: 'POST', body: form })
      const data = await res.json()
      if (res.ok && data.success && data.url) {
        // Use the URL directly from the response
        setQrUrl(data.url)
        setRefreshKey(prev => prev + 1)
      } else {
        const errorMsg = data.error || 'Failed to generate QR code'
        setError(errorMsg)
        console.error('QR generation failed:', errorMsg, data)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate QR code'
      setError(errorMsg)
      console.error('QR generation failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const onSelectImage = () => fileInputRef.current?.click()
  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = e => {
    const file = e.target.files?.[0]
    handleGenerate(file || undefined)
    e.currentTarget.value = ''
  }

  const handleDownload = async () => {
    if (!qrUrl) return
    const res = await fetch(qrUrl)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `event-${eventId}-qr.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <Paper
      sx={{
        p: 3,
        position: 'relative',
        overflow: 'hidden',
        backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        '&::before': backgroundUrl
          ? {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              zIndex: 0,
            }
          : undefined,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          gap: 3,
          alignItems: { xs: 'center', md: 'flex-start' },
          flexWrap: { xs: 'wrap', md: 'nowrap' },
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: { xs: 'center', md: 'space-between' },
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Left side: Event name and description */}
        <Box
          sx={{
            flex: { xs: '1 1 100%', md: '1 1 0%' },
            minWidth: 0,
            textAlign: { xs: 'center', md: 'left' },
          }}
        >
          {eventTitle && (
            <Typography variant="h3" component="h1" sx={{ fontWeight: 700, mb: 2 }}>
              {eventTitle}
            </Typography>
          )}
          {eventDescription && (
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {eventDescription}
            </Typography>
          )}
        </Box>

        {/* Right side: QR code and controls */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            flex: { xs: '1 1 100%', md: '0 0 auto' },
            width: { xs: '100%', md: 'auto' },
            ml: { xs: 0, md: 'auto' },
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
              Event QR
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Scan to open the photos page
            </Typography>
            {error && (
              <Box sx={{ mt: 1, mb: 1 }}>
                <Typography variant="body2" color="error">
                  {error}
                </Typography>
              </Box>
            )}
            {qrUrl && (
              <Box sx={{ mb: 2 }}>
                <Image
                  key={refreshKey} // Force remount on refresh
                  src={qrUrl}
                  alt="Event QR"
                  width={160}
                  height={160}
                  style={{ borderRadius: 8, width: 160, height: 160 }}
                  priority
                  unoptimized
                  onError={() => {
                    console.error('QR image failed to load:', qrUrl)
                    setError('Failed to load QR image')
                  }}
                />
              </Box>
            )}
            {!qrUrl && !loading && !error && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  No QR code generated yet. Click &quot;Generate QR&quot; to create one.
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
      {/* Buttons section at the bottom */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          flexWrap: 'wrap',
          gap: 1,
          justifyContent: 'center',
          mt: 3,
          pt: 3,
          borderTop: '1px solid',
          borderColor: 'divider',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={onFileChange}
        />
        <input
          ref={backgroundInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleBackgroundSelect}
        />

        {!publicMode && (
          <>
            <Button
              variant="outlined"
              startIcon={<WallpaperIcon />}
              onClick={handleBackgroundChange}
              disabled={loading || backgroundLoading}
              sx={{
                textTransform: 'none',
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                },
              }}
            >
              {backgroundLoading
                ? 'Uploading...'
                : backgroundUrl
                  ? 'Change Background'
                  : 'Set Background'}
            </Button>
            {backgroundUrl && (
              <Button
                variant="outlined"
                startIcon={<DeleteIcon />}
                onClick={handleBackgroundDelete}
                disabled={loading || backgroundLoading}
                sx={{
                  textTransform: 'none',
                  color: 'error.main',
                  borderColor: 'error.main',
                  bgcolor: 'rgba(211, 47, 47, 0.1)',
                  backdropFilter: 'blur(10px)',
                  '&:hover': {
                    bgcolor: 'rgba(211, 47, 47, 0.2)',
                  },
                }}
              >
                Remove Background
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<ImageIcon />}
              onClick={onSelectImage}
              disabled={loading}
              sx={{
                textTransform: 'none',
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                },
              }}
            >
              Choose Logo & Generate
            </Button>
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={18} /> : <QrIcon />}
              onClick={() => handleGenerate()}
              disabled={loading}
              sx={{
                textTransform: 'none',
                bgcolor: 'rgba(25, 118, 210, 0.8)',
                backdropFilter: 'blur(10px)',
                '&:hover': {
                  bgcolor: 'rgba(25, 118, 210, 0.9)',
                },
              }}
            >
              {loading ? 'Generating...' : 'Generate QR'}
            </Button>
          </>
        )}
        {qrUrl && (
          <Button
            variant="outlined"
            onClick={handleDownload}
            disabled={loading}
            sx={{
              textTransform: 'none',
              bgcolor: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.2)',
              },
            }}
          >
            Download QR
          </Button>
        )}
      </Box>
    </Paper>
  )
}
