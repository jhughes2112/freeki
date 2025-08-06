import React, { useEffect } from 'react'
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
  useMediaQuery,
  Tooltip
} from '@mui/material'
import {
  Search,
  Edit,
  Save,
  Cancel,
  Add,
  Delete,
  Settings,
  AccountCircle,
  LightMode,
  DarkMode,
  Monitor,
  ChevronLeft,
  ChevronRight,
  FlashOn,
  AccessTime
} from '@mui/icons-material'
import FolderTree from './FolderTree'
import PageViewer from './PageViewer'
import PageEditor from './PageEditor'
import PageMetadata from './PageMetadata'
import AdminSettingsDialog from './AdminSettingsDialog'
import { useUserSettings } from './useUserSettings'
import { useGlobalState, globalState } from './globalState'
import type { WikiPage } from './globalState'
import { fetchAdminSettings } from './adminSettings'
import apiClient from './apiClient'
// Import theme service to ensure it's initialized
import './themeService'
import './App.css'

// FadePanelContent: fade in/out children based on visible prop
const FadePanelContent = ({ visible, children }: { visible: boolean; children: React.ReactNode }) => (
  <div className={`fade-panel${visible ? '' : ' hidden'}`}>
    {children}
  </div>
)

// Enhanced Tooltip component with fast, modern styling
const EnhancedTooltip = ({ children, title, ...props }: { 
  children: React.ReactElement; 
  title: string; 
  placement?: 'top' | 'bottom' | 'left' | 'right';
  arrow?: boolean;
  enterDelay?: number;
  leaveDelay?: number;
}) => (
  <Tooltip
    title={title}
    enterDelay={150}
    leaveDelay={0}
    arrow
    {...props}
  >
    {children}
  </Tooltip>
)

// Sample data expanded with deeper hierarchies and additional folders
const samplePages: WikiPage[] = [
  {
    id: 'home',
    title: 'Home',
    content: '<h1>Welcome to FreeKi Wiki</h1><p>This is the home page of your personal wiki.</p>',
    path: '/home',
    isFolder: false,
    updatedAt: '2024-01-15T14:30:00Z',
    author: 'John Doe',
    version: 3,
    tags: ['wiki', 'home', 'intro']
  },
  {
    id: 'projects',
    title: 'Projects',
    content: '<h1>Projects</h1><p>This folder contains all your project documentation.</p>',
    path: '/projects',
    isFolder: true,
    updatedAt: '2024-01-10T09:15:00Z',
    author: 'Jane Smith',
    version: 1,
    tags: ['projects', 'folder'],
    children: [
      {
        id: 'project-a',
        title: 'Project Alpha',
        content: '<h1>Project Alpha</h1><p>Revolutionary new approach to solving problems.</p>',
        path: '/projects/project-a',
        isFolder: false,
        updatedAt: '2024-01-12T16:45:00Z',
        author: 'Bob Wilson',
        version: 2,
        tags: ['alpha', 'project']
      },
      {
        id: 'project-b',
        title: 'Project Beta',
        content: '<h1>Project Beta</h1><p>Next generation platform development.</p>',
        path: '/projects/project-b',
        isFolder: true,
        updatedAt: '2024-01-11T14:20:00Z',
        author: 'Lisa Wang',
        version: 1,
        tags: ['beta', 'platform'],
        children: [
          {
            id: 'beta-planning',
            title: 'Planning Documents',
            content: '<h1>Planning Documents</h1><p>Project planning and roadmap.</p>',
            path: '/projects/project-b/planning',
            isFolder: false,
            updatedAt: '2024-01-11T15:00:00Z',
            author: 'Lisa Wang',
            version: 1,
            tags: ['planning', 'roadmap']
          },
          {
            id: 'beta-design',
            title: 'Design & Architecture',
            content: '<h1>Design & Architecture</h1><p>System design documents.</p>',
            path: '/projects/project-b/design',
            isFolder: true,
            updatedAt: '2024-01-12T10:30:00Z',
            author: 'Alice Cooper',
            version: 2,
            tags: ['design', 'architecture'],
            children: [
              {
                id: 'beta-wireframes',
                title: 'UI Wireframes',
                content: '<h1>UI Wireframes</h1><p>User interface wireframes and mockups.</p>',
                path: '/projects/project-b/design/wireframes',
                isFolder: false,
                updatedAt: '2024-01-12T11:00:00Z',
                author: 'UI Designer',
                version: 1,
                tags: ['wireframes', 'ui', 'mockups']
              },
              {
                id: 'beta-database',
                title: 'Database Schema',
                content: '<h1>Database Schema</h1><p>Database design and relationships.</p>',
                path: '/projects/project-b/design/database',
                isFolder: false,
                updatedAt: '2024-01-12T12:30:00Z',
                author: 'Database Engineer',
                version: 3,
                tags: ['database', 'schema', 'design']
              },
              {
                id: 'beta-security',
                title: 'Security Architecture',
                content: '<h1>Security Architecture</h1><p>Security design and protocols.</p>',
                path: '/projects/project-b/design/security',
                isFolder: false,
                updatedAt: '2024-01-12T14:00:00Z',
                author: 'Security Team',
                version: 1,
                tags: ['security', 'protocols', 'design']
              }
            ]
          },
          {
            id: 'beta-development',
            title: 'Development Notes',
            content: '<h1>Development Notes</h1><p>Development progress and notes.</p>',
            path: '/projects/project-b/development',
            isFolder: false,
            updatedAt: '2024-01-13T09:45:00Z',
            author: 'Dev Team',
            version: 4,
            tags: ['development', 'progress']
          }
        ]
      },
      {
        id: 'project-c',
        title: 'Project Gamma',
        content: '<h1>Project Gamma</h1><p>Research and innovation project.</p>',
        path: '/projects/project-c',
        isFolder: false,
        updatedAt: '2024-01-09T11:45:00Z',
        author: 'Rachel Green',
        version: 1,
        tags: ['gamma', 'research', 'innovation']
      }
    ]
  },
  {
    id: 'documentation',
    title: 'Documentation',
    content: '<h1>Documentation</h1><p>User guides and technical documentation.</p>',
    path: '/documentation',
    isFolder: true,
    updatedAt: '2024-01-08T10:00:00Z',
    author: 'Technical Writer',
    version: 1,
    tags: ['documentation', 'guides'],
    children: [
      {
        id: 'user-guide',
        title: 'User Guide',
        content: '<h1>User Guide</h1><p>Complete user guide and tutorials.</p>',
        path: '/documentation/user-guide',
        isFolder: true,
        updatedAt: '2024-01-08T11:00:00Z',
        author: 'Technical Writer',
        version: 2,
        tags: ['user-guide', 'tutorial'],
        children: [
          {
            id: 'getting-started',
            title: 'Getting Started',
            content: '<h1>Getting Started</h1><p>Quick start guide for new users.</p>',
            path: '/documentation/user-guide/getting-started',
            isFolder: false,
            updatedAt: '2024-01-08T12:00:00Z',
            author: 'Technical Writer',
            version: 1,
            tags: ['getting-started', 'beginner']
          },
          {
            id: 'advanced-features',
            title: 'Advanced Features',
            content: '<h1>Advanced Features</h1><p>Advanced functionality guide.</p>',
            path: '/documentation/user-guide/advanced',
            isFolder: false,
            updatedAt: '2024-01-08T13:00:00Z',
            author: 'Technical Writer',
            version: 1,
            tags: ['advanced', 'features']
          },
          {
            id: 'troubleshooting',
            title: 'Troubleshooting',
            content: '<h1>Troubleshooting</h1><p>Common issues and solutions.</p>',
            path: '/documentation/user-guide/troubleshooting',
            isFolder: false,
            updatedAt: '2024-01-08T14:00:00Z',
            author: 'Support Team',
            version: 3,
            tags: ['troubleshooting', 'support']
          }
        ]
      },
      {
        id: 'api-docs',
        title: 'API Documentation',
        content: '<h1>API Documentation</h1><p>REST API reference and examples.</p>',
        path: '/documentation/api',
        isFolder: false,
        updatedAt: '2024-01-08T15:00:00Z',
        author: 'Dev Team',
        version: 2,
        tags: ['api', 'reference', 'rest']
      },
      {
        id: 'faq',
        title: 'FAQ',
        content: '<h1>Frequently Asked Questions</h1><p>Common questions and answers.</p>',
        path: '/documentation/faq',
        isFolder: false,
        updatedAt: '2024-01-08T16:00:00Z',
        author: 'Support Team',
        version: 1,
        tags: ['faq', 'questions', 'answers']
      }
    ]
  },
  {
    id: 'team',
    title: 'Team Resources',
    content: '<h1>Team Resources</h1><p>Internal team information and resources.</p>',
    path: '/team',
    isFolder: true,
    updatedAt: '2024-01-07T09:00:00Z',
    author: 'HR Team',
    version: 1,
    tags: ['team', 'internal', 'hr'],
    children: [
      {
        id: 'onboarding',
        title: 'Onboarding',
        content: '<h1>Onboarding</h1><p>New employee onboarding materials.</p>',
        path: '/team/onboarding',
        isFolder: true,
        updatedAt: '2024-01-07T10:00:00Z',
        author: 'HR Team',
        version: 1,
        tags: ['onboarding', 'new-employee'],
        children: [
          {
            id: 'welcome-guide',
            title: 'Welcome Guide',
            content: '<h1>Welcome Guide</h1><p>Welcome to the team!</p>',
            path: '/team/onboarding/welcome',
            isFolder: false,
            updatedAt: '2024-01-07T11:00:00Z',
            author: 'HR Team',
            version: 1,
            tags: ['welcome', 'guide']
          },
          {
            id: 'first-week',
            title: 'Your First Week',
            content: '<h1>Your First Week</h1><p>What to expect in your first week.</p>',
            path: '/team/onboarding/first-week',
            isFolder: false,
            updatedAt: '2024-01-07T12:00:00Z',
            author: 'HR Team',
            version: 1,
            tags: ['first-week', 'schedule']
          },
          {
            id: 'tools-setup',
            title: 'Tools & Setup',
            content: '<h1>Tools & Setup</h1><p>Setting up your development environment.</p>',
            path: '/team/onboarding/tools',
            isFolder: false,
            updatedAt: '2024-01-07T13:00:00Z',
            author: 'IT Team',
            version: 2,
            tags: ['tools', 'setup']
          }
        ]
      },
      {
        id: 'policies',
        title: 'Company Policies',
        content: '<h1>Company Policies</h1><p>Official company policies.</p>',
        path: '/team/policies',
        isFolder: false,
        updatedAt: '2024-01-07T14:00:00Z',
        author: 'Legal Team',
        version: 1,
        tags: ['policies', 'legal']
      },
      {
        id: 'benefits',
        title: 'Benefits',
        content: '<h1>Benefits</h1><p>Employee benefits information.</p>',
        path: '/team/benefits',
        isFolder: false,
        updatedAt: '2024-01-07T15:00:00Z',
        author: 'HR Team',
        version: 1,
        tags: ['benefits', 'employee']
      }
    ]
  },
  {
    id: 'meetings',
    title: 'Meeting Notes',
    content: '<h1>Meeting Notes</h1><p>Archive of meeting notes and minutes.</p>',
    path: '/meetings',
    isFolder: true,
    updatedAt: '2024-01-06T09:00:00Z',
    author: 'Various',
    version: 1,
    tags: ['meetings', 'notes'],
    children: [
      {
        id: 'daily-standups',
        title: 'Daily Standups',
        content: '<h1>Daily Standups</h1><p>Daily standup meeting notes.</p>',
        path: '/meetings/standups',
        isFolder: false,
        updatedAt: '2024-01-06T10:00:00Z',
        author: 'Scrum Master',
        version: 1,
        tags: ['standup', 'daily']
      },
      {
        id: 'sprint-planning',
        title: 'Sprint Planning',
        content: '<h1>Sprint Planning</h1><p>Sprint planning session notes.</p>',
        path: '/meetings/planning',
        isFolder: false,
        updatedAt: '2024-01-06T11:00:00Z',
        author: 'Product Owner',
        version: 1,
        tags: ['planning', 'sprint']
      },
      {
        id: 'retrospectives',
        title: 'Retrospectives',
        content: '<h1>Retrospectives</h1><p>Sprint retrospective notes.</p>',
        path: '/meetings/retros',
        isFolder: false,
        updatedAt: '2024-01-06T12:00:00Z',
        author: 'Scrum Master',
        version: 2,
        tags: ['retrospective', 'improvement']
      }
    ]
  }
]

export default function App() {
  const { settings, userInfo, isLoaded, updateSetting } = useUserSettings()
  
  // Use global state for reactive updates
  const adminSettings = useGlobalState('adminSettings')
  const currentPage = useGlobalState('currentPage')
  const isEditing = useGlobalState('isEditing')
  const searchQuery = useGlobalState('searchQuery')
  const pages = useGlobalState('pages')
  const isLoadingPages = useGlobalState('isLoadingPages')
  
  const [showAdminSettings, setShowAdminSettings] = React.useState<boolean>(false)
  const [errorMessage, setErrorMessage] = React.useState<string>('')
  const [showError, setShowError] = React.useState<boolean>(false)
  const isNarrowScreen = useMediaQuery('(max-width: 900px)')
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false)
  const [isMetadataCollapsed, setIsMetadataCollapsed] = React.useState(false)
  const [hasInitialized, setHasInitialized] = React.useState(false)

  // Load admin settings and pages on startup
  useEffect(() => {
    async function loadInitialData() {
      try {
        // Load admin settings
        globalState.set('isLoadingAdminSettings', true)
        const settings = await fetchAdminSettings()
        if (settings) {
          globalState.set('adminSettings', settings)
        }
        
        // Load pages from API
        globalState.set('isLoadingPages', true)
        try {
          const response = await apiClient.get<WikiPage[]>('/api/pages')
          if (response.success && response.data && response.data.length > 0) {
            globalState.set('pages', response.data)
            // Set first non-folder page as current page if available
            const firstPage = response.data.find(page => !page.isFolder) || response.data[0]
            if (firstPage) {
              globalState.set('currentPage', firstPage)
            }
          } else {
            // Fallback to sample data if API returns empty or fails
            globalState.set('pages', samplePages)
            globalState.set('currentPage', samplePages[0])
          }
        } catch (error) {
          console.warn('Failed to load pages from API, using sample data:', error)
          // Fallback to sample data
          globalState.set('pages', samplePages)
          globalState.set('currentPage', samplePages[0])
        } finally {
          globalState.set('isLoadingPages', false)
        }
      } catch (error) {
        console.error('Failed to load admin settings:', error)
      } finally {
        globalState.set('isLoadingAdminSettings', false)
      }
    }
    
    loadInitialData()
  }, [])

  // Initialize global state with sample data on first load
  useEffect(() => {
    if (pages.length === 0) {
      globalState.set('pages', samplePages)
      globalState.set('currentPage', samplePages[0])
    }
  }, [pages.length])

  // Sync theme changes between user settings and global state
  useEffect(() => {
    if (isLoaded) {
      globalState.set('theme', settings.theme)
    }
  }, [settings.theme, isLoaded])

  // Enhanced search function - now uses searchMode setting, no search history
  const performSearch = (query: string) => {
    globalState.set('searchQuery', query)
    
    if (!query.trim()) {
      globalState.set('searchResults', [])
      return
    }
    
    // Enhanced search implementation with full/partial modes
    const searchInPages = (pagesList: WikiPage[], searchQuery: string): WikiPage[] => {
      const results: WikiPage[] = []
      const searchRecursive = (pages: WikiPage[]) => {
        for (const page of pages) {
          if (!page.isFolder) {
            const titleMatch = page.title.toLowerCase().includes(searchQuery)
            const tagMatch = page.tags?.some(tag => tag.toLowerCase().includes(searchQuery))
            const contentMatch = settings.searchMode === 'full' 
              ? page.content.toLowerCase().includes(searchQuery)
              : false
            
            if (titleMatch || tagMatch || contentMatch) {
              results.push(page)
            }
          }
          if (page.children) {
            searchRecursive(page.children)
          }
        }
      }
      searchRecursive(pagesList)
      return results
    }
    
    const results = searchInPages(pages, query.toLowerCase())
    globalState.set('searchResults', results)
  }

  const handleTagClick = (tag: string) => {
    performSearch(tag)
    // Focus the search input for better UX
    const input = document.querySelector('input[aria-label="Search pages"]') as HTMLInputElement | null;
    if (input) {
      input.focus();
      input.setSelectionRange(tag.length, tag.length);
    }
  }

  // Set up the error handler for the API client
  useEffect(() => {
    apiClient.setErrorHandler((message: string) => {
      setErrorMessage(message)
      setShowError(true)
    })
  }, [])

  // Initialize collapsed state based on screen size - only run once on mount
  useEffect(() => {
    if (!hasInitialized) {
      if (isNarrowScreen) {
        setIsSidebarCollapsed(settings.narrowScreenLayout.sidebarCollapsed)
        setIsMetadataCollapsed(settings.narrowScreenLayout.metadataCollapsed)
      } else {
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
        updateSetting('wideScreenLayout', {
          ...settings.wideScreenLayout,
          sidebarCollapsed: isSidebarCollapsed,
          metadataCollapsed: isMetadataCollapsed
        })
        setIsSidebarCollapsed(settings.narrowScreenLayout.sidebarCollapsed)
        setIsMetadataCollapsed(settings.narrowScreenLayout.metadataCollapsed)
      } else {
        updateSetting('narrowScreenLayout', {
          ...settings.narrowScreenLayout,
          sidebarCollapsed: isSidebarCollapsed,
          metadataCollapsed: isMetadataCollapsed
        })
        setIsSidebarCollapsed(settings.wideScreenLayout.sidebarCollapsed)
        setIsMetadataCollapsed(settings.wideScreenLayout.metadataCollapsed)
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
        })
      }
    }
  }, [isSidebarCollapsed, isMetadataCollapsed, hasInitialized, isNarrowScreen])

  // Handle search mode toggle
  const handleSearchModeToggle = () => {
    const newMode = settings.searchMode === 'full' ? 'partial' : 'full'
    updateSetting('searchMode', newMode)
    // Re-run current search with new mode
    if (searchQuery.trim()) {
      performSearch(searchQuery)
    }
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

  // Get search mode icon and tooltip - Lightning bolt for metadata, AccessTime (stopwatch) for full content
  const getSearchModeIcon = () => {
    return settings.searchMode === 'full' ? <AccessTime /> : <FlashOn />
  }

  const getSearchModeTooltip = () => {
    return settings.searchMode === 'full' ? 'Full Content Search' : 'Metadata Search'
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
      globalState.update({
        currentPage: page,
        isEditing: false // Auto-exit edit mode when changing pages
      })
    }
  }

  const handleEdit = () => {
    globalState.set('isEditing', true)
  }

  const handleSave = async (content: string) => {
    if (!currentPage) return
    
    // Use the centralized API client for real save operations
    const response = await apiClient.put(`/api/pages/${currentPage.id}`, { 
      content,
      title: currentPage.title,
      path: currentPage.path
    })
    
    if (response.success) {
      // Update the page in global state
      const updatedPage = { 
        ...currentPage, 
        content,
        updatedAt: new Date().toISOString(),
        version: (currentPage.version || 1) + 1
      }
      
      // Update pages array in global state
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
      
      globalState.update({
        pages: updatePagesRecursively(pages),
        currentPage: updatedPage,
        isEditing: false
      })
    } else {
      console.warn('Failed to save page:', response.error?.message)
    }
  }

  const handleCancel = () => {
    globalState.set('isEditing', false)
  }

  const handleNewPage = async () => {
    const response = await apiClient.post('/api/pages?title=New%20Page&filepath=new-page.md', 
      '# New Page\n\nStart writing your content here...'
    )
    
    if (response.success) {
      console.log('Page created successfully:', response.data)
    }
  }

  const handleDelete = async () => {
    console.log('Delete page')
  }

  const handleSettingsClick = () => {
    setShowAdminSettings(true)
  }

  const handleSidebarToggle = () => {
    if (isNarrowScreen && !isSidebarCollapsed) {
      setIsMetadataCollapsed(true)
    }
    setIsSidebarCollapsed(!isSidebarCollapsed)
  }

  const handleMetadataToggle = () => {
    if (isNarrowScreen && !isMetadataCollapsed) {
      setIsSidebarCollapsed(true)
    }
    setIsMetadataCollapsed(!isMetadataCollapsed)
  }

  const handleSidebarResize = (e: React.MouseEvent) => {
    const startX = e.clientX
    const startWidth = settings.wideScreenLayout.sidebarWidth

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = startWidth + (e.clientX - startX)
      const minWidth = 100
      const maxWidth = window.innerWidth * 0.8
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))
      updateSetting('wideScreenLayout', {
        ...settings.wideScreenLayout,
        sidebarWidth: clampedWidth
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
      const newWidth = startWidth - (e.clientX - startX)
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

  // Get current year for footer copyright
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
          {/* Left side - Logo and Title as clickable button */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <EnhancedTooltip title="Return to home page">
              <Button
                onClick={() => window.location.reload()}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  textTransform: 'none',
                  color: 'var(--freeki-app-bar-text-color)',
                  minHeight: 'auto',
                  p: 0,
                  mr: 4,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
                aria-label="Return to home page"
              >
                <Avatar
                  src={adminSettings.iconUrl}
                  alt={`${adminSettings.companyName} icon`}
                  sx={{ mr: 2, width: 32, height: 32, backgroundColor: 'white' }}
                  aria-label={adminSettings.companyName}
                >
                  {adminSettings.companyName.charAt(0)}
                </Avatar>
                <Typography variant="h6" sx={{ color: 'var(--freeki-app-bar-text-color)' }} variantMapping={{ h6: 'div' }}>
                  {adminSettings.wikiTitle}
                </Typography>
              </Button>
            </EnhancedTooltip>
          </Box>

          {/* Center - Search Bar with Integrated Search Mode Toggle */}
          <Box sx={{ flexGrow: 1, maxWidth: 500, mx: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder={`Search pages (${settings.searchMode})...`}
              value={searchQuery}
              onChange={(e) => performSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: 'var(--freeki-app-bar-text-color)' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <EnhancedTooltip title={getSearchModeTooltip()}>
                      <IconButton
                        size="small"
                        sx={{ color: 'var(--freeki-app-bar-text-color)' }}
                        onClick={handleSearchModeToggle}
                        aria-label={getSearchModeTooltip()}
                      >
                        {getSearchModeIcon()}
                      </IconButton>
                    </EnhancedTooltip>
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
                    borderColor: 'var(--freeki-app-bar-text-color)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'var(--freeki-app-bar-text-color)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'var(--freeki-app-bar-text-color)',
                  },
                },
                '& .MuiInputBase-input::placeholder': {
                  color: 'var(--freeki-app-bar-text-color)',
                },
              }}
              aria-label="Search pages"
            />
          </Box>

          {/* Right side - Action buttons in new order: Edit/New/Delete, separator, theme toggle, settings gear, account icon */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Edit/Save/Cancel buttons */}
            {currentPage && !currentPage.isFolder && (
              <>
                {isEditing ? (
                  <>
                    <EnhancedTooltip title="Save changes">
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<Save sx={{ color: 'white' }} />}
                        onClick={() => handleSave(currentPage.content)}
                        sx={{ color: 'white' }}
                        aria-label="Save changes"
                      >
                        Save
                      </Button>
                    </EnhancedTooltip>
                    <EnhancedTooltip title="Cancel editing">
                      <Button
                        variant="outlined"
                        startIcon={<Cancel sx={{ color: 'var(--freeki-app-bar-text-color)' }} />}
                        onClick={handleCancel}
                        sx={{ 
                          color: 'var(--freeki-app-bar-text-color)', 
                          borderColor: 'var(--freeki-app-bar-text-color)',
                          '&:hover': {
                            backgroundColor: 'var(--freeki-app-bar-hover-background)',
                            borderColor: 'var(--freeki-app-bar-text-color)'
                          }
                        }}
                        aria-label="Cancel editing"
                      >
                        Cancel
                      </Button>
                    </EnhancedTooltip>
                  </>
                ) : (
                  <EnhancedTooltip title="Edit page">
                    <IconButton 
                      sx={{ color: 'var(--freeki-app-bar-text-color)' }} 
                      onClick={handleEdit} 
                      aria-label="Edit page"
                    >
                      <Edit />
                    </IconButton>
                  </EnhancedTooltip>
                )}
              </>
            )}

            {/* New Page button */}
            <EnhancedTooltip title="Create new page">
              <IconButton 
                sx={{ color: 'var(--freeki-app-bar-text-color)' }} 
                onClick={handleNewPage} 
                aria-label="Create new page"
              >
                <Add />
              </IconButton>
            </EnhancedTooltip>

            {/* Delete button */}
            {currentPage && !currentPage.isFolder && (
              <EnhancedTooltip title="Delete page">
                <IconButton 
                  sx={{ color: 'var(--freeki-app-bar-text-color)' }} 
                  onClick={handleDelete} 
                  aria-label="Delete page"
                >
                  <Delete />
                </IconButton>
              </EnhancedTooltip>
            )}

            <Divider orientation="vertical" flexItem sx={{ backgroundColor: 'var(--freeki-app-bar-divider)', mx: 1 }} />

            {/* Theme Toggle Button */}
            <EnhancedTooltip title={getThemeTooltip()}>
              <IconButton
                sx={{ color: 'var(--freeki-app-bar-text-color)' }}
                onClick={handleThemeToggle}
                aria-label={getThemeTooltip()}
              >
                {getThemeIcon()}
              </IconButton>
            </EnhancedTooltip>

            {/* Admin Settings gear - only show if user is admin */}
            {userInfo?.isAdmin && (
              <EnhancedTooltip title="Administration settings">
                <IconButton 
                  sx={{ color: 'var(--freeki-app-bar-text-color)' }} 
                  onClick={handleSettingsClick} 
                  aria-label="Open administration settings"
                >
                  <Settings />
                </IconButton>
              </EnhancedTooltip>
            )}

            {/* User Account icon */}
            <EnhancedTooltip title={userInfo ? `${userInfo.fullName}\n${userInfo.email}` : "Not signed in"}>
              <IconButton
                sx={{ color: 'var(--freeki-app-bar-text-color)', p: 0.5 }}
                aria-label={userInfo ? `User: ${userInfo.fullName}` : "Not signed in"}
              >
                {userInfo?.gravatarUrl ? (
                  <Avatar
                    src={userInfo.gravatarUrl}
                    alt={userInfo.fullName}
                    sx={{
                      width: 32,
                      height: 32,
                      border: '2px solid var(--freeki-app-bar-divider)'
                    }}
                    aria-label={userInfo.fullName}
                  >
                    {userInfo.fullName.charAt(0)}
                  </Avatar>
                ) : (
                  <AccountCircle />
                )}
              </IconButton>
            </EnhancedTooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content Area */}
      <div className={`main-layout${isNarrowScreen && (!isSidebarCollapsed || !isMetadataCollapsed) ? ' panel-open' : ''}`} style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Sidebar */}
        <div 
          className={`sidebar-panel${isSidebarCollapsed ? ' collapsed' : ''}${isNarrowScreen && !isSidebarCollapsed ? ' narrow-opened' : ''}`}
          style={{ '--sidebar-width': `${isNarrowScreen ? '90vw' : settings.wideScreenLayout.sidebarWidth + 'px'}` } as React.CSSProperties}
        >
          <button
            className={`chevron-button chevron-narrow-screen sidebar-chevron chevron-sidebar-theme ${isSidebarCollapsed ? 'sidebar-closed' : 'sidebar-open'}`}
            onClick={handleSidebarToggle}
            aria-label={isSidebarCollapsed ? "Open sidebar" : "Close sidebar"}
            title={isSidebarCollapsed ? "Open sidebar" : "Close sidebar"}
          >
            {isSidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}
          </button>

          <FadePanelContent visible={!isSidebarCollapsed}>
            {isLoadingPages ? (
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: 200,
                color: 'var(--freeki-folders-font-color)'
              }}>
                <Typography>Loading pages...</Typography>
              </Box>
            ) : currentPage ? (
              <FolderTree
                pages={pages}
                selectedPage={currentPage}
                onPageSelect={handlePageSelect}
              />
            ) : (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                justifyContent: 'center', 
                alignItems: 'center', 
                height: 200,
                color: 'var(--freeki-folders-font-color)',
                p: 2
              }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  No pages available
                </Typography>
                <Typography variant="caption">
                  Create your first page to get started
                </Typography>
              </Box>
            )}
          </FadePanelContent>

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

        {/* Center Content Area */}
        <div 
          className="center-content"
          style={{ 
            flex: 1,
            display: 'flex', 
            flexDirection: 'column', 
            overflow: 'hidden', 
            position: 'relative',
            marginLeft: (!isNarrowScreen && isSidebarCollapsed) ? `-${settings.wideScreenLayout.sidebarWidth}px` : '0',
            marginRight: (!isNarrowScreen && isMetadataCollapsed) ? `-${settings.wideScreenLayout.metadataWidth}px` : '0',
            transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1), margin-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <button
            className={`chevron-button chevron-wide-screen chevron-sidebar-theme ${isSidebarCollapsed ? 'sidebar-closed' : 'sidebar-open'}`}
            onClick={handleSidebarToggle}
            aria-label={isSidebarCollapsed ? "Open sidebar" : "Close sidebar"}
            title={isSidebarCollapsed ? "Open sidebar" : "Close sidebar"}
          >
            {isSidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}
          </button>
          
          {currentPage && !currentPage.isFolder && settings.showMetadataPanel && (
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
            <Box sx={{ flex: 1, overflow: 'auto' }} role="main">
              {currentPage && (
                isEditing ? (
                  <PageEditor
                    page={currentPage}
                    onSave={handleSave}
                    onCancel={handleCancel}
                  />
                ) : (
                  <PageViewer
                    page={currentPage}
                    onEdit={handleEdit}
                  />
                )
              )}
            </Box>
          </Box>
        </div>

        {/* Right Metadata Panel */}  
        {currentPage && !currentPage.isFolder && settings.showMetadataPanel && (
          <div className={`metadata-panel${isMetadataCollapsed ? ' collapsed' : ''}${isNarrowScreen && !isMetadataCollapsed ? ' narrow-opened' : ''}`} 
            style={{ '--metadata-width': `${isNarrowScreen ? '90vw' : settings.wideScreenLayout.metadataWidth + 'px'}` } as React.CSSProperties}
          >
            <button
              className={`chevron-button chevron-narrow-screen metadata-chevron chevron-metadata-theme ${isMetadataCollapsed ? 'metadata-closed' : 'metadata-open'}`}
              onClick={handleMetadataToggle}
              aria-label={isMetadataCollapsed ? "Open metadata panel" : "Close metadata panel"}
              title={isMetadataCollapsed ? "Open metadata panel" : "Close metadata panel"}
            >
              {isMetadataCollapsed ? <ChevronLeft /> : <ChevronRight />}
            </button>

            <FadePanelContent visible={!isMetadataCollapsed}>
              <PageMetadata
                page={currentPage}
                onTagClick={handleTagClick}
              />
            </FadePanelContent>
            
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
          Copyright (c) {currentYear} {adminSettings.companyName} powered by FreeKi
        </Typography>
      </Box>

      {/* Admin Settings Dialog */}
      <AdminSettingsDialog
        open={showAdminSettings}
        onClose={() => setShowAdminSettings(false)}
        themeMode={settings.theme}
      />
    </Box>
  )
}

export { apiClient }