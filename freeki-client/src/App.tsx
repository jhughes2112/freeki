import { useState, useEffect } from 'react'
import { 
  Box, 
  AppBar, 
  Toolbar, 
  Typography, 
  TextField, 
  Button, 
  IconButton,
  Avatar,
  Divider,
  InputAdornment,
  Snackbar,
  Alert
} from '@mui/material'
import {
  Search,
  Edit,
  Save,
  Cancel,
  Add,
  History,
  Delete,
  Settings,
  AccountCircle
} from '@mui/icons-material'
import FolderTree from './FolderTree'
import PageViewer from './PageViewer'
import PageEditor from './PageEditor'
import PageMetadata from './PageMetadata'
import AdminSettingsDialog from './AdminSettingsDialog'
import { useUserSettings } from './useUserSettings'
import type { ColorScheme } from './adminSettings'
import { DEFAULT_ADMIN_SETTINGS, fetchAdminSettings } from './adminSettings'
import apiClient from './apiClient'

export interface WikiPage {
  id: string
  title: string
  content: string
  path: string
  children?: WikiPage[]
  isFolder: boolean
  createdAt?: string
  updatedAt?: string
  author?: string
  version?: number
}

// Theme application function
function applyTheme(colorSchemes: { light: ColorScheme; dark: ColorScheme }, currentTheme: 'light' | 'dark' | 'auto') {
  const colorScheme = currentTheme === 'dark' || (currentTheme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches) 
    ? colorSchemes.dark 
    : colorSchemes.light

  const root = document.documentElement

  root.style.setProperty('--freeki-app-bar-background', colorScheme.appBarBackground)
  root.style.setProperty('--freeki-sidebar-background', colorScheme.sidebarBackground)
  root.style.setProperty('--freeki-sidebar-selected-background', colorScheme.sidebarSelectedBackground)
  root.style.setProperty('--freeki-sidebar-hover-background', colorScheme.sidebarHoverBackground)
  root.style.setProperty('--freeki-metadata-panel-background', colorScheme.metadataPanelBackground)
  root.style.setProperty('--freeki-view-mode-background', colorScheme.viewModeBackground)
  root.style.setProperty('--freeki-edit-mode-background', colorScheme.editModeBackground)
  root.style.setProperty('--freeki-text-primary', colorScheme.textPrimary)
  root.style.setProperty('--freeki-text-secondary', colorScheme.textSecondary)
  root.style.setProperty('--freeki-border-color', colorScheme.borderColor)
}

// Example content structure
const samplePages: WikiPage[] = [
  {
    id: 'home',
    title: 'Home',
    content: '<h1>Welcome to FreeKi Wiki</h1><p>This is the home page of your personal wiki.</p>',
    path: '/home',
    isFolder: false,
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-15T14:30:00Z',
    author: 'John Doe',
    version: 3
  },
  {
    id: 'projects',
    title: 'Projects',
    content: '<h1>Projects</h1><p>This folder contains all your project documentation.</p>',
    path: '/projects',
    isFolder: true,
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-10T09:15:00Z',
    author: 'Jane Smith',
    version: 1,
    children: [
      {
        id: 'project-a',
        title: 'Project Alpha',
        content: '<h1>Project Alpha</h1><p>Revolutionary new approach to solving problems.</p>',
        path: '/projects/project-a',
        isFolder: false,
        createdAt: '2024-01-05T11:20:00Z',
        updatedAt: '2024-01-12T16:45:00Z',
        author: 'Bob Wilson',
        version: 2
      }
    ]
  }
]

export default function App() {
  const { settings, userInfo, isLoaded, updateSetting } = useUserSettings()
  const [selectedPage, setSelectedPage] = useState<WikiPage>(samplePages[0])
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [pages, setPages] = useState<WikiPage[]>(samplePages)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [showAdminSettings, setShowAdminSettings] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [showError, setShowError] = useState<boolean>(false)
  const [adminColorSchemes, setAdminColorSchemes] = useState<{ light: ColorScheme; dark: ColorScheme }>(DEFAULT_ADMIN_SETTINGS.colorSchemes)

  // Set up the error handler for the API client
  useEffect(() => {
    apiClient.setErrorHandler((message: string) => {
      setErrorMessage(message)
      setShowError(true)
    })
  }, [])

  // Load admin color schemes on app start
  useEffect(() => {
    async function loadColorSchemes() {
      try {
        const adminSettings = await fetchAdminSettings()
        if (adminSettings) {
          setAdminColorSchemes(adminSettings.colorSchemes)
        }
      } catch (error) {
        console.warn('Failed to load admin color schemes:', error)
      }
    }
    loadColorSchemes()
  }, [])

  // Apply theme whenever settings or admin color schemes change
  useEffect(() => {
    if (isLoaded) {
      applyTheme(adminColorSchemes, settings.theme)
    }
  }, [adminColorSchemes, settings.theme, isLoaded])

  // Handle theme changes from admin dialog
  const handleThemeChange = (colorSchemes: { light: ColorScheme; dark: ColorScheme }) => {
    setAdminColorSchemes(colorSchemes)
  }

  // Wait for settings to load before rendering
  if (!isLoaded) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography>Loading...</Typography>
      </Box>
    )
  }

  const handleCloseError = () => {
    setShowError(false)
  }

  const handlePageSelect = (page: WikiPage) => {
    if (!page.isFolder) {
      setSelectedPage(page)
      setIsEditing(false)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleSave = async (content: string) => {
    // Use the centralized API client for real save operations
    const response = await apiClient.put(`/api/pages/${selectedPage.id}`, { 
      content,
      title: selectedPage.title,
      path: selectedPage.path
    })
    
    if (response.success) {
      // Update local state with server response
      const updatedPage = { 
        ...selectedPage, 
        content,
        updatedAt: new Date().toISOString(),
        version: (selectedPage.version || 1) + 1
      }
      setSelectedPage(updatedPage)
      
      // Update the page in the pages array
      const updatePagesRecursively = (pagesList: WikiPage[]): WikiPage[] => {
        return pagesList.map(page => {
          if (page.id === updatedPage.id) {
            return updatedPage
          }
          if (page.children) {
            return { ...page, children: updatePagesRecursively(page.children) }
          }
          return page
        })
      }
      
      setPages(updatePagesRecursively(pages))
      setIsEditing(false)
    } else {
      // Error handling is done by the apiClient
      console.warn('Failed to save page:', response.error?.message)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  const handleNewPage = async () => {
    // Use centralized API client to create new page
    const response = await apiClient.post('/api/pages?title=New%20Page&filepath=new-page.md', 
      '# New Page\n\nStart writing your content here...'
    )
    
    if (response.success) {
      // Refresh pages list or add the new page to local state
      console.log('Page created successfully:', response.data)
      // You would typically refresh the pages list here or add to local state
    }
  }

  const handleHistory = () => {
    console.log('History')
  }

  const handleDelete = async () => {
    // const response = await apiClient.delete(`/api/pages/${selectedPage.id}`)
    // if (response.success) {
    //   // Handle successful deletion
    // }
    console.log('Delete page')
  }

  const handleSettingsClick = () => {
    setShowAdminSettings(true)
  }

  const handleAccount = () => {
    console.log('Account')
  }

  const handleSidebarResize = (e: React.MouseEvent) => {
    const startX = e.clientX
    const startWidth = settings.sidebarWidth

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = startWidth + (e.clientX - startX)
      const minWidth = 200
      const maxWidth = 500
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))
      updateSetting('sidebarWidth', clampedWidth)
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const currentYear = new Date().getFullYear()

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Error Snackbar */}
      <Snackbar
        open={showError}
        autoHideDuration={6000}
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
          {errorMessage}
        </Alert>
      </Snackbar>

      {/* Top Banner/AppBar */}
      <AppBar position="static" sx={{ backgroundColor: 'var(--freeki-app-bar-background)', zIndex: 1300 }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          {/* Left side - Logo and Title */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar
              src="/logo.png"
              sx={{ mr: 2, width: 32, height: 32, backgroundColor: 'white' }}
            >
              {settings.companyName.charAt(0)}
            </Avatar>
            <Typography variant="h6" sx={{ mr: 4 }}>
              {settings.wikiTitle}
            </Typography>
          </Box>

          {/* Center - Search Bar */}
          <Box sx={{ flexGrow: 1, maxWidth: 400, mx: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search pages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
                sx: { backgroundColor: 'rgba(255,255,255,0.15)', color: 'white' }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': {
                    borderColor: 'rgba(255,255,255,0.3)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255,255,255,0.5)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'white',
                  },
                },
                '& .MuiInputBase-input::placeholder': {
                  color: 'rgba(255,255,255,0.7)',
                },
              }}
            />
          </Box>

          {/* Right side - Action buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {!selectedPage.isFolder && (
              <>
                {isEditing ? (
                  <>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<Save />}
                      onClick={() => handleSave(selectedPage.content)}
                      sx={{ color: 'white' }}
                    >
                      Save
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<Cancel />}
                      onClick={handleCancel}
                      sx={{ color: 'white', borderColor: 'white' }}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<Edit />}
                    onClick={handleEdit}
                  >
                    Edit
                  </Button>
                )}
              </>
            )}

            <IconButton color="inherit" onClick={handleNewPage} title="New Page">
              <Add />
            </IconButton>

            <IconButton color="inherit" onClick={handleHistory} title="History">
              <History />
            </IconButton>

            {!selectedPage.isFolder && (
              <IconButton color="inherit" onClick={handleDelete} title="Delete">
                <Delete />
              </IconButton>
            )}

            <Divider orientation="vertical" flexItem sx={{ backgroundColor: 'rgba(255,255,255,0.3)', mx: 1 }} />

            {/* Only show admin settings gear if user is admin */}
            {userInfo?.isAdmin && (
              <IconButton color="inherit" onClick={handleSettingsClick} title="Administration">
                <Settings />
              </IconButton>
            )}

            <IconButton
              color="inherit"
              onClick={handleAccount}
              title={userInfo ? `${userInfo.fullName}\n${userInfo.email}` : "Account"}
              sx={{ p: 0.5 }}
            >
              {userInfo?.gravatarUrl ? (
                <Avatar
                  src={userInfo.gravatarUrl}
                  sx={{
                    width: 32,
                    height: 32,
                    border: '2px solid rgba(255,255,255,0.3)'
                  }}
                >
                  {userInfo.fullName.charAt(0)}
                </Avatar>
              ) : (
                <AccountCircle />
              )}
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content Area */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Sidebar */}
        <Box
          sx={{
            width: settings.sidebarWidth,
            borderRight: '1px solid var(--freeki-border-color)',
            height: '100%',
            flexShrink: 0,
            position: 'relative',
            backgroundColor: 'var(--freeki-sidebar-background)'
          }}
        >
          <FolderTree
            pages={pages}
            selectedPage={selectedPage}
            onPageSelect={handlePageSelect}
          />

          {/* Resize Handle */}
          <Box
            onMouseDown={handleSidebarResize}
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 4,
              height: '100%',
              backgroundColor: 'transparent',
              cursor: 'col-resize',
              '&:hover': {
                backgroundColor: 'primary.main',
              },
              zIndex: 1
            }}
          />
        </Box>

        {/* Center Content */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* Main Content */}
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              {isEditing ? (
                <PageEditor
                  page={selectedPage}
                  onSave={handleSave}
                  onCancel={handleCancel}
                />
              ) : (
                <PageViewer
                  page={selectedPage}
                  onEdit={handleEdit}
                />
              )}
            </Box>

            {/* Right Metadata Panel */}
            {!selectedPage.isFolder && settings.showMetadataPanel && (
              <Box
                sx={{
                  width: 280,
                  borderLeft: '1px solid var(--freeki-border-color)',
                  backgroundColor: 'var(--freeki-metadata-panel-background)',
                  overflow: 'auto'
                }}
              >
                <PageMetadata page={selectedPage} />
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          borderTop: '1px solid var(--freeki-border-color)',
          backgroundColor: 'var(--freeki-sidebar-background)',
          py: 1,
          px: 2,
          textAlign: 'center'
        }}
      >
        <Typography variant="caption" sx={{ color: 'var(--freeki-text-secondary)' }}>
          Copyright (c) {currentYear} {settings.companyName} powered by FreeKi
        </Typography>
      </Box>

      {/* Admin Settings Dialog */}
      <AdminSettingsDialog
        open={showAdminSettings}
        onClose={() => setShowAdminSettings(false)}
        onThemeChange={handleThemeChange}
      />
    </Box>
  )
}

// Export the API client for use in other components
export { apiClient }
