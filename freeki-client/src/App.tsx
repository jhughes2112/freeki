import React, { useState, useEffect } from 'react'
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
  Alert,
  useMediaQuery
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
  AccountCircle,
  LightMode,
  DarkMode,
  Monitor,
  ChevronLeft,
  ChevronRight
} from '@mui/icons-material'
import FolderTree from './FolderTree'
import PageViewer from './PageViewer'
import PageEditor from './PageEditor'
import PageMetadata from './PageMetadata'
import AdminSettingsDialog from './AdminSettingsDialog'
import { useUserSettings } from './useUserSettings'
import type { ColorScheme } from './adminSettings'
import { DEFAULT_ADMIN_SETTINGS, fetchAdminSettings } from './adminSettings'
import { applyTheme } from './themeUtils'
import apiClient from './apiClient'
import './App.css'

// FadePanelContent: fade in/out children based on visible prop
const FadePanelContent = ({ visible, children }: { visible: boolean; children: React.ReactNode }) => (
  <div className={`fade-panel${visible ? '' : ' hidden'}`}>
    {children}
  </div>
)

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
  const [searchQuery, setSearchQuery] = useState<string>('') // Search query state
  const [showAdminSettings, setShowAdminSettings] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [showError, setShowError] = useState<boolean>(false)
  const [adminColorSchemes, setAdminColorSchemes] = useState<{ light: ColorScheme; dark: ColorScheme }>(DEFAULT_ADMIN_SETTINGS.colorSchemes)
  const isNarrowScreen = useMediaQuery('(max-width: 900px)') // Single breakpoint for overlay behavior
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMetadataCollapsed, setIsMetadataCollapsed] = useState(false)
  const [hasInitialized, setHasInitialized] = useState(false)

  // Set up the error handler for the API client
  useEffect(() => {
    apiClient.setErrorHandler((message: string) => {
      setErrorMessage(message)
      setShowError(true)
    })
  }, [])

  // Load admin color schemes ONLY on app start (once)
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
  }, []) // Empty dependency array - only run once on mount

  // Apply theme whenever settings or admin color schemes change
  useEffect(() => {
    if (isLoaded) {
      applyTheme(adminColorSchemes, settings.theme)
    }
  }, [adminColorSchemes, settings.theme, isLoaded])

  // Listen for OS theme changes when in auto mode
  useEffect(() => {
    if (settings.theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => {
        if (isLoaded) {
          applyTheme(adminColorSchemes, settings.theme)
        }
      }
      
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [settings.theme, isLoaded, adminColorSchemes])

  // Initialize collapsed state based on screen size - only run once on mount
  useEffect(() => {
    if (!hasInitialized) {
      if (isNarrowScreen) {
        // On narrow screens (including mobile), use narrow screen layout settings
        setIsSidebarCollapsed(settings.narrowScreenLayout.sidebarCollapsed)
        setIsMetadataCollapsed(settings.narrowScreenLayout.metadataCollapsed)
      } else {
        // On wide screens, use wide screen layout settings  
        setIsSidebarCollapsed(settings.wideScreenLayout.sidebarCollapsed)
        setIsMetadataCollapsed(settings.wideScreenLayout.metadataCollapsed)
      }
      setHasInitialized(true)
    }
  }, [isNarrowScreen, hasInitialized, settings.narrowScreenLayout, settings.wideScreenLayout])

  // Handle screen size changes after initialization
  useEffect(() => {
    if (hasInitialized) {
      if (isNarrowScreen) {
        // Switching to narrow screen - save current wide screen state and load narrow state
        updateSetting('wideScreenLayout', {
          ...settings.wideScreenLayout,
          sidebarCollapsed: isSidebarCollapsed,
          metadataCollapsed: isMetadataCollapsed
        })
        setIsSidebarCollapsed(settings.narrowScreenLayout.sidebarCollapsed)
        setIsMetadataCollapsed(settings.narrowScreenLayout.metadataCollapsed)
      } else {
        // Switching to wide screen - save current narrow state and load wide state
        updateSetting('narrowScreenLayout', {
          ...settings.narrowScreenLayout,
          sidebarCollapsed: isSidebarCollapsed,
          metadataCollapsed: isMetadataCollapsed
        })
        setIsSidebarCollapsed(settings.wideScreenLayout.sidebarCollapsed)
        setIsMetadataCollapsed(settings.wideScreenLayout.metadataCollapsed)
        // Panel widths are already in the layout object
      }
    }
  }, [isNarrowScreen, hasInitialized])

  // Update layout settings when panel states change
  useEffect(() => {
    if (hasInitialized) {
      if (isNarrowScreen) {
        updateSetting('narrowScreenLayout', {
          ...settings.narrowScreenLayout,
          sidebarCollapsed: isSidebarCollapsed,
          metadataCollapsed: isMetadataCollapsed
        })
      } else {
        updateSetting('wideScreenLayout', {
          ...settings.wideScreenLayout,
          sidebarCollapsed: isSidebarCollapsed,
          metadataCollapsed: isMetadataCollapsed
          // sidebarWidth and metadataWidth are already in the layout object
        })
      }
    }
  }, [isSidebarCollapsed, isMetadataCollapsed, hasInitialized, isNarrowScreen])

  // Handle theme changes from admin dialog
  const handleThemeChange = (colorSchemes: { light: ColorScheme; dark: ColorScheme }) => {
    setAdminColorSchemes(colorSchemes)
  }

  // Handle theme toggle button click
  const handleThemeToggle = () => {
    const nextTheme = settings.theme === 'light' ? 'dark' : settings.theme === 'dark' ? 'auto' : 'light'
    updateSetting('theme', nextTheme)
  }

  // Get current theme icon based on theme setting
  const getThemeIcon = () => {
    if (settings.theme === 'light') {
      return <LightMode />
    } else if (settings.theme === 'dark') {
      return <DarkMode />
    } else {
      return <Monitor />
    }
  }

  // Get theme tooltip text
  const getThemeTooltip = () => {
    if (settings.theme === 'light') {
      return 'Switch to Dark Mode'
    } else if (settings.theme === 'dark') {
      return 'Switch to Auto Mode'
    } else {
      return 'Switch to Light Mode'
    }
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

  // Ensure only one panel can be open at a time on narrow screens
const handleSidebarToggle = () => {
  if (isNarrowScreen && !isSidebarCollapsed) {
    // Opening sidebar on narrow screen - close metadata panel
    setIsMetadataCollapsed(true)
  }
  
  const newSidebarState = !isSidebarCollapsed
  setIsSidebarCollapsed(newSidebarState)
}

const handleMetadataToggle = () => {
  if (isNarrowScreen && !isMetadataCollapsed) {
    // Opening metadata panel on narrow screen - close sidebar  
    setIsSidebarCollapsed(true)
  }
  
  const newMetadataState = !isMetadataCollapsed
  setIsMetadataCollapsed(newMetadataState)
}

  // Replace the resize handlers to use layout settings
  const handleSidebarResize = (e: React.MouseEvent) => {
    const startX = e.clientX
    const startWidth = settings.wideScreenLayout.sidebarWidth // Use layout setting

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = startWidth + (e.clientX - startX)
      const minWidth = 100
      const maxWidth = window.innerWidth * 0.8
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))
      updateSetting('wideScreenLayout', {
        ...settings.wideScreenLayout,
        sidebarWidth: clampedWidth // Update layout setting
      })
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

    const handleMetadataResize = (e: React.MouseEvent) => {
    const startX = e.clientX
    const startWidth = settings.wideScreenLayout.metadataWidth

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = startWidth - (e.clientX - startX) // Subtract because we're resizing from the left edge
      // Only enforce reasonable minimum (100px) and maximum (80% of viewport width)
      const minWidth = 100
      const maxWidth = window.innerWidth * 0.8
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))
      updateSetting('wideScreenLayout', {
        ...settings.wideScreenLayout,
        metadataWidth: clampedWidth
      })
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
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
        role="alert"
      >
        <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
          {errorMessage}
        </Alert>
      </Snackbar>

      {/* Top Banner/AppBar */}
      <AppBar position="static" sx={{ backgroundColor: 'var(--freeki-app-bar-background)', color: 'var(--freeki-app-bar-text-color)', zIndex: 1300 }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          {/* Left side - Logo and Title */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar
              src="/logo.png"
              alt={`${settings.companyName} logo`}
              sx={{ mr: 2, width: 32, height: 32, backgroundColor: 'white' }}
              aria-label={settings.companyName}
            >
              {settings.companyName.charAt(0)}
            </Avatar>
            <Typography variant="h6" sx={{ mr: 4, color: 'var(--freeki-app-bar-text-color)' }} variantMapping={{ h6: 'div' }}>
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
                    <Search sx={{ color: 'var(--freeki-app-bar-text-color)' }} />
                  </InputAdornment>
                ),
                sx: { 
                  backgroundColor: 'rgba(255,255,255,0.15)', 
                  color: 'var(--freeki-app-bar-text-color)' 
                }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: 'var(--freeki-app-bar-text-color)',
                  '& fieldset': {
                    borderColor: 'rgba(255,255,255,0.3)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255,255,255,0.5)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'var(--freeki-app-bar-text-color)',
                  },
                },
                '& .MuiInputBase-input::placeholder': {
                  color: 'rgba(255,255,255,0.7)',
                },
              }}
              aria-label="Search pages"
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
                      startIcon={<Save sx={{ color: 'white' }} />}
                      onClick={() => handleSave(selectedPage.content)}
                      sx={{ color: 'white' }}
                      aria-label="Save changes"
                    >
                      Save
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<Cancel sx={{ color: 'var(--freeki-app-bar-text-color)' }} />}
                      onClick={handleCancel}
                      sx={{ 
                        color: 'var(--freeki-app-bar-text-color)', 
                        borderColor: 'var(--freeki-app-bar-text-color)',
                        '&:hover': {
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          borderColor: 'var(--freeki-app-bar-text-color)'
                        }
                      }}
                      aria-label="Cancel editing"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outlined"
                    startIcon={<Edit sx={{ color: 'var(--freeki-app-bar-text-color)' }} />}
                    onClick={handleEdit}
                    sx={{ 
                      color: 'var(--freeki-app-bar-text-color)', 
                      borderColor: 'var(--freeki-app-bar-text-color)',
                      backgroundColor: 'transparent',
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        borderColor: 'var(--freeki-app-bar-text-color)'
                      }
                    }}
                    aria-label="Edit page"
                  >
                    Edit
                  </Button>
                )}
              </>
            )}

            <IconButton 
              sx={{ color: 'var(--freeki-app-bar-text-color)' }} 
              onClick={handleNewPage} 
              title="New Page" 
              aria-label="Create new page"
            >
              <Add />
            </IconButton>

            <IconButton 
              sx={{ color: 'var(--freeki-app-bar-text-color)' }} 
              onClick={handleHistory} 
              title="History" 
              aria-label="View page history"
            >
              <History />
            </IconButton>

            {!selectedPage.isFolder && (
              <IconButton 
                sx={{ color: 'var(--freeki-app-bar-text-color)' }} 
                onClick={handleDelete} 
                title="Delete" 
                aria-label="Delete page"
              >
                <Delete />
              </IconButton>
            )}

            <Divider orientation="vertical" flexItem sx={{ backgroundColor: 'rgba(255,255,255,0.3)', mx: 1 }} />

            {/* Only show admin settings gear if user is admin */}
            {userInfo?.isAdmin && (
              <IconButton 
                sx={{ color: 'var(--freeki-app-bar-text-color)' }} 
                onClick={handleSettingsClick} 
                title="Administration" 
                aria-label="Open administration settings"
              >
                <Settings />
              </IconButton>
            )}

            <IconButton
              sx={{ color: 'var(--freeki-app-bar-text-color)', p: 0.5 }}
              onClick={handleAccount}
              title={userInfo ? `${userInfo.fullName}\n${userInfo.email}` : "Account"}
              aria-label="Account"
            >
              {userInfo?.gravatarUrl ? (
                <Avatar
                  src={userInfo.gravatarUrl}
                  alt={userInfo.fullName}
                  sx={{
                    width: 32,
                    height: 32,
                    border: '2px solid rgba(255,255,255,0.3)'
                  }}
                  aria-label={userInfo.fullName}
                >
                  {userInfo.fullName.charAt(0)}
                </Avatar>
              ) : (
                <AccountCircle />
              )}
            </IconButton>

            {/* Theme Toggle Button */}
            <IconButton
              sx={{ color: 'var(--freeki-app-bar-text-color)' }}
              onClick={handleThemeToggle}
              title={getThemeTooltip()}
              aria-label={getThemeTooltip()}
            >
              {getThemeIcon()}
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content Area with z-index layered approach */}
      <div className={`main-layout${isNarrowScreen && (!isSidebarCollapsed || !isMetadataCollapsed) ? ' panel-open' : ''}`} style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Sidebar - always use panel, never drawer */}
        <div 
          className={`sidebar-panel${isSidebarCollapsed ? ' collapsed' : ''}${isNarrowScreen && !isSidebarCollapsed ? ' narrow-opened' : ''}`}
          style={{ '--sidebar-width': `${isNarrowScreen ? '90vw' : settings.wideScreenLayout.sidebarWidth + 'px'}` } as React.CSSProperties}
        >
          {/* Narrow screen chevron button - attached to sidebar panel and slides with it */}
          <button
            className={`chevron-button chevron-narrow-screen chevron-sidebar-theme ${isSidebarCollapsed ? 'sidebar-closed' : 'sidebar-open'}`}
            onClick={handleSidebarToggle}
            aria-label={isSidebarCollapsed ? "Open sidebar" : "Close sidebar"}
            title={isSidebarCollapsed ? "Open sidebar" : "Close sidebar"}
          >
            {isSidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}
          </button>

          <FadePanelContent visible={!isSidebarCollapsed}>
            <FolderTree
              pages={pages}
              selectedPage={selectedPage}
              onPageSelect={handlePageSelect}
            />
          </FadePanelContent>

          {/* Add sidebar splitter */}
          {!isSidebarCollapsed && !isNarrowScreen && (
            <Box
              onMouseDown={handleSidebarResize}
              tabIndex={0}
              aria-label="Sidebar width resizer"
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
          )}
        </div>

        {/* Center Content Area - expands when panels are collapsed */}
        <div 
          className="center-content"
          style={{ 
            flex: 1,
            display: 'flex', 
            flexDirection: 'column', 
            overflow: 'hidden', 
            position: 'relative',
            // Only apply negative margins on desktop screens, not mobile or narrow screens
            marginLeft: (!isNarrowScreen && isSidebarCollapsed) ? `-${settings.wideScreenLayout.sidebarWidth}px` : '0',
            marginRight: (!isNarrowScreen && isMetadataCollapsed) ? `-${settings.wideScreenLayout.metadataWidth}px` : '0',
            transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1), margin-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          {/* Wide screen chevron buttons - attached to center content */}
          <button
            className={`chevron-button chevron-wide-screen chevron-sidebar-theme ${isSidebarCollapsed ? 'sidebar-closed' : 'sidebar-open'}`}
            onClick={handleSidebarToggle}
            aria-label={isSidebarCollapsed ? "Open sidebar" : "Close sidebar"}
            title={isSidebarCollapsed ? "Open sidebar" : "Close sidebar"}
          >
            {isSidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}
          </button>
          
          {!selectedPage.isFolder && settings.showMetadataPanel && (
            <button
              className={`chevron-button chevron-wide-screen chevron-metadata-theme ${isMetadataCollapsed ? 'metadata-closed' : 'metadata-open'}`}
              onClick={handleMetadataToggle}
              aria-label={isMetadataCollapsed ? "Open metadata panel" : "Close metadata panel"}
              title={isMetadataCollapsed ? "Open metadata panel" : "Close metadata panel"}
            >
              {isMetadataCollapsed ? <ChevronLeft /> : <ChevronRight />}
            </button>
          )}

          <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }} role="main">
            {/* Main Content */}
            <Box sx={{ flex: 1, overflow: 'auto' }} role="main">
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
          </Box>
        </div>

        {/* Right Metadata Panel - always use panel, never drawer */}  
        {!selectedPage.isFolder && settings.showMetadataPanel && (
          <div className={`metadata-panel${isMetadataCollapsed ? ' collapsed' : ''}${isNarrowScreen && !isMetadataCollapsed ? ' narrow-opened' : ''}`} 
            style={{ '--metadata-width': `${isNarrowScreen ? '90vw' : settings.wideScreenLayout.metadataWidth + 'px'}` } as React.CSSProperties}
          >
            {/* Narrow screen chevron button - attached to metadata panel and slides with it */}
            <button
              className={`chevron-button chevron-narrow-screen chevron-metadata-theme metadata-chevron ${isMetadataCollapsed ? 'metadata-closed' : 'metadata-open'}`}
              onClick={handleMetadataToggle}
              aria-label={isMetadataCollapsed ? "Open metadata panel" : "Close metadata panel"}
              title={isMetadataCollapsed ? "Open metadata panel" : "Close metadata panel"}
            >
              {isMetadataCollapsed ? <ChevronLeft /> : <ChevronRight />}
            </button>

            <FadePanelContent visible={!isMetadataCollapsed}>
              <PageMetadata page={selectedPage} />
            </FadePanelContent>
            
            {/* Add metadata splitter */}
            {!isMetadataCollapsed && !isNarrowScreen && (
              <Box
                onMouseDown={handleMetadataResize}
                tabIndex={0}
                aria-label="Metadata panel width resizer"
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
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
            )}
          </div>
        )}

      </div>

      {/* Footer */}
      <Box
        sx={{
          borderTop: '1px solid var(--freeki-border-color)',
          backgroundColor: 'var(--freeki-footer-background)',
          py: 1,
          px: 2,
          textAlign: 'center'
        }}
        component="footer"
        role="contentinfo"
      >
        <Typography variant="caption" sx={{ color: 'var(--freeki-footer-text-color)' }}>
          Copyright (c) {currentYear} {settings.companyName} powered by FreeKi
        </Typography>
      </Box>

      {/* Admin Settings Dialog */}
      <AdminSettingsDialog
        open={showAdminSettings}
        onClose={() => setShowAdminSettings(false)}
        onThemeChange={handleThemeChange}
        initialSettings={adminColorSchemes}
      />
    </Box>
  )
}

// Export the API client for use in other components
export { apiClient }
