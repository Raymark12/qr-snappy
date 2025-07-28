'use client'

import { useState } from 'react'
import { Box, Toolbar, useMediaQuery, useTheme } from '@mui/material'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import AdminHeader from './AdminHeader'
import AdminSidebar, { menuItems } from './AdminSidebar'

const DRAWER_WIDTH = 260

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const pathname = usePathname()
  const { user } = useAuth()

  const [mobileOpen, setMobileOpen] = useState(false)

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleDrawerClose = () => {
    if (isMobile) {
      setMobileOpen(false)
    }
  }

  const pageTitle = menuItems.find((item) => item.path === pathname)?.label || 'Dashboard'

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AdminHeader title={pageTitle} user={user} onMenuClick={handleDrawerToggle} />
      <AdminSidebar mobileOpen={mobileOpen} onClose={handleDrawerClose} user={user} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { xs: '100%', md: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <Toolbar />
        <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>{children}</Box>
      </Box>
    </Box>
  )
}
