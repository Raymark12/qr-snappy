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
  Divider,
  Box,
  useTheme,
} from '@mui/material'
import {
  Menu as MenuIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
} from '@mui/icons-material'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { logoutAction } from '@/lib/actions/auth'

const DRAWER_WIDTH = 260

interface AdminHeaderProps {
  title: string
  user: {
    email?: string
    role?: string
  } | null
  onMenuClick: () => void
}

export default function AdminHeader({ title, user, onMenuClick }: AdminHeaderProps) {
  const theme = useTheme()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // User menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const openUserMenu = Boolean(anchorEl)

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleUserMenuClose = () => {
    setAnchorEl(null)
  }

  const handleNavigation = (path: string) => {
    router.push(path)
    handleUserMenuClose()
  }

  const handleLogout = () => {
    handleUserMenuClose()
    startTransition(async () => {
      try {
        await logoutAction()
      } catch (error) {
        if (error instanceof Error && error.message !== 'NEXT_REDIRECT') {
          console.error('Logout error:', error)
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
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={onMenuClick}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            {title}
          </Typography>
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
        <MenuItem onClick={() => handleNavigation('/dashboard/profile')}>
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          Profile
        </MenuItem>
        <MenuItem onClick={() => handleNavigation('/dashboard/settings')}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          Settings
        </MenuItem>
        <Divider />
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
