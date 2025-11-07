'use client'

import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  Box,
  useTheme,
  Breadcrumbs,
  Link,
} from '@mui/material'
import {
  Menu as MenuIcon,
  Logout as LogoutIcon,
  NavigateNext as NavigateNextIcon,
} from '@mui/icons-material'
import { useState, useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { logoutAction } from '@/lib/actions/auth'

const DRAWER_WIDTH = 260

interface AdminHeaderProps {
  user: {
    email?: string
    role?: string
  } | null
  onMenuClick: () => void
}

interface BreadcrumbItem {
  label: string
  path?: string
}

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = []

  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) {
    breadcrumbs.push({ label: 'Dashboard' })
    return breadcrumbs
  }

  if (segments[0] === 'dashboard') {
    breadcrumbs.push({ label: 'Dashboard' })
  } else if (segments[0] === 'events') {
    breadcrumbs.push({ label: 'Events', path: '/events' })

    if (segments.length > 1) {
      if (segments.length === 2) {
        breadcrumbs.push({ label: 'Event Details' })
      } else if (segments.length === 3 && segments[2] === 'photos') {
        breadcrumbs.push({ label: 'Photos' })
      }
    }
  }

  return breadcrumbs
}

export default function AdminHeader({ user, onMenuClick }: AdminHeaderProps) {
  const theme = useTheme()
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const breadcrumbs = generateBreadcrumbs(pathname || '')

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const openUserMenu = Boolean(anchorEl)

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleUserMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = () => {
    handleUserMenuClose()
    startTransition(async () => {
      try {
        await logoutAction()
      } catch (error) {
        if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
          console.log('Server logout completed with redirect, client state will be cleared')
        } else {
          console.warn('Server logout failed, trying client logout:', error)
        }
      }
    })
  }

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          height: '6vh',
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Toolbar
          sx={{
            minHeight: '6vh !important',
            height: '6vh',
            alignItems: 'center',
          }}
        >
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={onMenuClick}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Breadcrumbs
            separator={<NavigateNextIcon fontSize="small" />}
            aria-label="breadcrumb"
            sx={{ flexGrow: 1 }}
          >
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1

              if (isLast || !crumb.path) {
                return (
                  <Typography
                    key={crumb.label}
                    color="text.primary"
                    variant="body2"
                    sx={{ fontWeight: 600 }}
                  >
                    {crumb.label}
                  </Typography>
                )
              }

              return (
                <Link
                  key={crumb.label}
                  component="button"
                  variant="body2"
                  color="text.secondary"
                  onClick={() => crumb.path && router.push(crumb.path)}
                  sx={{
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                    cursor: 'pointer',
                    border: 'none',
                    background: 'none',
                    padding: 0,
                    fontFamily: 'inherit',
                  }}
                >
                  {crumb.label}
                </Link>
              )
            })}
          </Breadcrumbs>
          <IconButton
            onClick={handleUserMenuOpen}
            size="small"
            sx={{ ml: 2 }}
            aria-controls={openUserMenu ? 'user-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={openUserMenu ? 'true' : undefined}
          >
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: theme.palette.primary.main,
                fontSize: '0.9rem',
              }}
            >
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>
      <Menu
        anchorEl={anchorEl}
        id="user-menu"
        open={openUserMenu}
        onClose={handleUserMenuClose}
        onClick={handleUserMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{
          paper: {
            elevation: 3,
            sx: {
              minWidth: 200,
              mt: 1.5,
              borderRadius: 2,
            },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="body2" fontWeight={600}>
            {user?.email}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {user?.role || 'Admin'}
          </Typography>
        </Box>
        <MenuItem onClick={handleLogout} disabled={isPending}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          {isPending ? 'Logging out...' : 'Logout'}
        </MenuItem>
      </Menu>
    </>
  )
}
