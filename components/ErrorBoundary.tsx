'use client'

import { Component, ReactNode, ErrorInfo } from 'react'
import { Box, Button, Container, Typography } from '@mui/material'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Container maxWidth="sm">
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '100vh',
              textAlign: 'center',
              gap: 2,
            }}
          >
            <ErrorOutlineIcon sx={{ fontSize: 64, color: 'error.main' }} />
            <Typography variant="h4" component="h1" gutterBottom>
              Something went wrong
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              {this.state.error?.message || 'An unexpected error occurred'}
            </Typography>
            <Button variant="contained" onClick={() => window.location.reload()} sx={{ mt: 2 }}>
              Reload Page
            </Button>
          </Box>
        </Container>
      )
    }

    return this.props.children
  }
}
