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

export interface ApiError {
  message: string
  status: number
  statusText: string
  isNetworkError: boolean
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: ApiError
}

// Central API client class for all server communication
class ApiClient {
  private showError: (message: string) => void = () => {}

  setErrorHandler(handler: (message: string) => void): void {
    this.showError = handler
  }

  private async makeRequest<T>(
    url: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(url, options)
      
      if (response.ok) {
        let data: T
        const contentType = response.headers.get('content-type')
        
        if (contentType && contentType.includes('application/json')) {
          data = await response.json()
        } else {
          data = response as unknown as T
        }
        
        return { success: true, data }
      } else {
        const error: ApiError = {
          message: `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
          statusText: response.statusText,
          isNetworkError: false
        }
        
        // Only show error UI for non-permission errors
        if (response.status !== 401 && response.status !== 403) {
          this.showError(error.message)
        }
        
        console.error('API Error:', error)
        return { success: false, error }
      }
    } catch (err) {
      const error: ApiError = {
        message: err instanceof Error ? err.message : 'Unknown network error',
        status: 0,
        statusText: 'Network Error',
        isNetworkError: true
      }
      
      this.showError('Network error - please check your connection')
      console.error('API Error:', error)
      return { success: false, error }
    }
  }

  async get<T>(url: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, { method: 'GET' })
  }

  async post<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    const options: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }
    
    if (data !== undefined) {
      options.body = JSON.stringify(data)
    }
    
    return this.makeRequest<T>(url, options)
  }

  async put<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    const options: RequestInit = {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }
    
    if (data !== undefined) {
      options.body = JSON.stringify(data)
    }
    
    return this.makeRequest<T>(url, options)
  }

  async delete<T>(url: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, { method: 'DELETE' })
  }
}

// Global API client instance
const apiClient = new ApiClient()

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

  // Set up the error handler for the API client
  useEffect(() => {
    apiClient.setErrorHandler((message: string) => {
      setErrorMessage(message)
      setShowError(true)
    })
  }, [])

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
    // This would use the API client for real save operations
    // const response = await apiClient.put(`/api/pages/${selectedPage.id}`, { content })
    // if (response.success) {
    //   // Update local state
    // }
    
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
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  const handleNewPage = async () => {
    // Example API call using the centralized client
    // const response = await apiClient.post('/api/pages', { title: 'New Page', content: '' })
    // if (response.success) {
    //   // Handle successful creation
    // }
    console.log('New page')
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
      <AppBar position="static" sx={{ backgroundColor: '#1976d2', zIndex: 1300 }}>
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
            borderRight: '1px solid #e0e0e0',
            height: '100%',
            flexShrink: 0,
            position: 'relative',
            backgroundColor: '#fafafa'
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
                  borderLeft: '1px solid #e0e0e0',
                  backgroundColor: '#f9f9f9',
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
          borderTop: '1px solid #e0e0e0',
          backgroundColor: '#f5f5f5',
          py: 1,
          px: 2,
          textAlign: 'center'
        }}
      >
        <Typography variant="caption" color="text.secondary">
          Copyright (c) {currentYear} {settings.companyName} powered by FreeKi
        </Typography>
      </Box>

      {/* Admin Settings Dialog */}
      <AdminSettingsDialog
        open={showAdminSettings}
        onClose={() => setShowAdminSettings(false)}
      />
    </Box>
  )
}

// Export the API client for use in other components
export { apiClient }
