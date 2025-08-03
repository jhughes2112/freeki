import React, { useState } from 'react'
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
  InputAdornment
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

const COMPANY_NAME = "Your Company"
const WIKI_TITLE = "FreeKi Wiki"

export default function App() {
  const [selectedPage, setSelectedPage] = useState<WikiPage>(samplePages[0])
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [pages, setPages] = useState<WikiPage[]>(samplePages)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [sidebarWidth, setSidebarWidth] = useState<number>(300)

  const handlePageSelect = (page: WikiPage) => {
    if (!page.isFolder) {
      setSelectedPage(page)
      setIsEditing(false)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleSave = (content: string) => {
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

  const handleNewPage = () => {
    // Placeholder for new page functionality
    console.log('New page')
  }

  const handleHistory = () => {
    // Placeholder for history functionality
    console.log('History')
  }

  const handleDelete = () => {
    // Placeholder for delete functionality
    console.log('Delete page')
  }

  const handleSettings = () => {
    // Placeholder for settings functionality
    console.log('Settings')
  }

  const handleAccount = () => {
    // Placeholder for account functionality
    console.log('Account')
  }

  const handleSidebarResize = (e: React.MouseEvent) => {
    const startX = e.clientX
    const startWidth = sidebarWidth

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = startWidth + (e.clientX - startX)
      const minWidth = 200
      const maxWidth = 500
      setSidebarWidth(Math.max(minWidth, Math.min(maxWidth, newWidth)))
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
      {/* Top Banner/AppBar */}
      <AppBar position="static" sx={{ backgroundColor: '#1976d2', zIndex: 1300 }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          {/* Left side - Logo and Title */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar
              src="/logo.png"
              sx={{ mr: 2, width: 32, height: 32, backgroundColor: 'white' }}
            >
              {COMPANY_NAME.charAt(0)}
            </Avatar>
            <Typography variant="h6" sx={{ mr: 4 }}>
              {WIKI_TITLE}
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
            
            <IconButton color="inherit" onClick={handleSettings} title="Administration">
              <Settings />
            </IconButton>
            
            <IconButton color="inherit" onClick={handleAccount} title="Account">
              <AccountCircle />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content Area */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Sidebar */}
        <Box 
          sx={{ 
            width: sidebarWidth,
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
            {!selectedPage.isFolder && (
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
          Copyright (c) {currentYear} {COMPANY_NAME} powered by FreeKi
        </Typography>
      </Box>
    </Box>
  )
}
