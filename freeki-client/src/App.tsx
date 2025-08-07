import React, { useEffect } from 'react'
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Avatar,
  Divider,
  Snackbar,
  Alert,
  useMediaQuery,
  Tooltip
} from '@mui/material'
import {
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
  ChevronRight
} from '@mui/icons-material'
import FolderTree from './FolderTree'
import PageViewer from './PageViewer'
import PageEditor from './PageEditor'
import PageMetadataPanel from './PageMetadata'
import AdminSettingsDialog from './AdminSettingsDialog'
import { useUserSettings } from './useUserSettings'
import { useGlobalState, globalState } from './globalState'
import { buildPageTree } from './pageTreeUtils'
import type { PageMetadata } from './globalState'
import type { DragData, DropTarget } from './pageTreeUtils'
import { fetchAdminSettings } from './adminSettings'
import { createSemanticApi } from './semanticApiFactory'
import type { ISemanticApi } from './semanticApiInterface'
import './themeService'
import './App.css'

const FadePanelContent = ({ visible, children }: { visible: boolean; children: React.ReactNode }) => (
  <div className={`fade-panel${visible ? '' : ' hidden'}`}>
    {children}
  </div>
)

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

export default function App() {
  // API client instance - centralized and passed down
  const [semanticApi, setSemanticApi] = React.useState<ISemanticApi | null>(null)
  
  const { settings, userInfo, isLoaded, updateSetting } = useUserSettings(semanticApi)
  
  // Use global state with new structure
  const adminSettings = useGlobalState('adminSettings')
  const pageMetadata = useGlobalState('pageMetadata')
  const currentPageMetadata = useGlobalState('currentPageMetadata')
  const currentPageContent = useGlobalState('currentPageContent')
  const isEditing = useGlobalState('isEditing')
  const searchQuery = useGlobalState('searchQuery')
  const isLoadingPages = useGlobalState('isLoadingPages')
  
  // Compute page tree from metadata - using fixed flattened approach
  const pageTree = React.useMemo(() => buildPageTree(pageMetadata), [pageMetadata])
  
  const [showAdminSettings, setShowAdminSettings] = React.useState<boolean>(false)
  const [showError, setShowError] = React.useState<boolean>(false)
  const isNarrowScreen = useMediaQuery('(max-width: 900px)')
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false)
  const [isMetadataCollapsed, setIsMetadataCollapsed] = React.useState(false)
  const [hasInitialized, setHasInitialized] = React.useState(false)

  // Initialize Semantic API - centralized creation
  useEffect(() => {
    const api = createSemanticApi()
    setSemanticApi(api)
  }, [])

  // Load admin settings and pages on startup
  useEffect(() => {
    if (!semanticApi) return
    
    async function loadInitialData() {
      // At this point we know semanticApi is not null due to the guard above
      const api = semanticApi!
      
      try {
        // Load admin settings
        globalState.set('isLoadingAdminSettings', true)
        const settings = await fetchAdminSettings(api)
        if (settings) {
          globalState.set('adminSettings', settings)
        }
        
        // Load page metadata from API
        globalState.set('isLoadingPages', true)
        const pages = await api.listAllPages()
        if (pages.length > 0) {
          globalState.set('pageMetadata', pages)
          
          // Find the first page alphabetically to serve as the default/home page
          const defaultPage = pages.slice().sort((a, b) => a.path.localeCompare(b.path))[0]
          
          globalState.set('currentPageMetadata', defaultPage)
          // Load content for default page
          const pageWithContent = await api.getSinglePage(defaultPage.pageId)
          if (pageWithContent) {
            globalState.set('currentPageContent', {
              pageId: defaultPage.pageId,
              content: pageWithContent.content
            })
          }
        } else {
          // No pages available
          globalState.set('pageMetadata', [])
          globalState.set('currentPageMetadata', null)
          globalState.set('currentPageContent', null)
        }
      } catch (error) {
        console.error('Failed to load initial data:', error)
        // Set empty state on error
        globalState.set('pageMetadata', [])
        globalState.set('currentPageMetadata', null)
        globalState.set('currentPageContent', null)
      } finally {
        globalState.set('isLoadingAdminSettings', false)
        globalState.set('isLoadingPages', false)
      }
    }
    
    loadInitialData()
  }, [semanticApi])

  // Sync theme changes between user settings and global state
  useEffect(() => {
    if (isLoaded) {
      globalState.set('theme', settings.theme)
    }
  }, [settings.theme, isLoaded])

  // Enhanced search function
  const performSearch = (query: string) => {
    globalState.set('searchQuery', query)
    
    if (!query.trim()) {
      globalState.set('searchResults', [])
      return
    }
    
    // Search through pageMetadata
    const results = pageMetadata.filter(metadata => {
      const titleMatch = metadata.title.toLowerCase().includes(query.toLowerCase())
      const tagMatch = metadata.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
      return titleMatch || tagMatch
    })
    
    globalState.set('searchResults', results)
  }

  const handleTagClick = (tag: string) => {
    globalState.set('searchQuery', tag)
    performSearch(tag)
  }

  // Initialize collapsed state based on screen size
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

  // Handle theme toggle
  const handleThemeToggle = () => {
    const nextTheme = settings.theme === 'light' ? 'dark' : settings.theme === 'dark' ? 'auto' : 'light'
    updateSetting('theme', nextTheme)
  }

  // Get theme icon and tooltip
  const getThemeIcon = () => {
    if (settings.theme === 'light') return <LightMode />
    if (settings.theme === 'dark') return <DarkMode />
    return <Monitor />
  }

  const getThemeTooltip = () => {
    if (settings.theme === 'light') return 'Switch to Dark Mode'
    if (settings.theme === 'dark') return 'Switch to Auto Mode'
    return 'Switch to Light Mode'
  }

  // Wait for settings and semantic API to load
  if (!isLoaded || !semanticApi) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography>Loading...</Typography>
      </Box>
    )
  }
  
  const handleCloseError = () => {
    setShowError(false)
  }
  
  const handlePageSelect = async (metadata: PageMetadata) => {
    if (!semanticApi) return
    
    // Don't reload if the same page is already selected
    if (currentPageMetadata?.pageId === metadata.pageId) {
      console.log('Page already selected, skipping reload:', metadata.pageId)
      return
    }
    
    globalState.set('currentPageMetadata', metadata)
    globalState.set('isEditing', false)
    
    // Load content for selected page
    globalState.set('isLoadingPageContent', true)
    try {
      const pageWithContent = await semanticApi.getSinglePage(metadata.pageId)
      if (pageWithContent) {
        globalState.set('currentPageContent', {
          pageId: metadata.pageId,
          content: pageWithContent.content
        })
      } else {
        console.warn('Failed to load page content for:', metadata.pageId)
        globalState.set('currentPageContent', {
          pageId: metadata.pageId,
          content: `# ${metadata.title}\n\nContent could not be loaded.`
        })
      }
    } catch (error) {
      console.error('Failed to load page content:', error)
      globalState.set('currentPageContent', {
        pageId: metadata.pageId,
        content: `# ${metadata.title}\n\nContent could not be loaded.`
      })
    } finally {
      globalState.set('isLoadingPageContent', false)
    }
  }

  const handleEdit = () => {
    globalState.set('isEditing', true)
  }

  const handleSave = async (content: string) => {
    if (!currentPageMetadata || !semanticApi) return
    
    try {
      const updatedMetadata = await semanticApi.updatePage({
        pageId: currentPageMetadata.pageId,
        title: currentPageMetadata.title,
        content: content,
        filepath: currentPageMetadata.path,
        tags: currentPageMetadata.tags
      })
      
      if (updatedMetadata) {
        // Update content in state
        globalState.set('currentPageContent', {
          pageId: currentPageMetadata.pageId,
          content: content
        })
        
        // Update metadata in state
        globalState.set('currentPageMetadata', updatedMetadata)
        
        // Update in pageMetadata list
        const updatedPageMetadata = pageMetadata.map(p => 
          p.pageId === updatedMetadata.pageId ? updatedMetadata : p
        )
        globalState.set('pageMetadata', updatedPageMetadata)
        
        globalState.set('isEditing', false)
      } else {
        console.error('Failed to save page: no response from server')
      }
    } catch (error) {
      console.error('Failed to save page:', error)
    }
  }

  const handleCancel = () => {
    globalState.set('isEditing', false)
  }

  const handleNewPage = async () => {
    if (!semanticApi) return
    
    try {
      const newMetadata = await semanticApi.createPage({
        title: 'New Page',
        content: '# New Page\n\nStart writing your content here...',
        filepath: 'new-page.md',
        tags: []
      })

      if (newMetadata) {
        console.log('Page created successfully:', newMetadata)
        // Reload page metadata to include new page
        const pages = await semanticApi.listAllPages()
        globalState.set('pageMetadata', pages)
      } else {
        console.error('Failed to create page: no response from server')
      }
    } catch (error) {
      console.error('Failed to create page:', error)
    }
  }

  const handleDelete = async () => {
    if (!currentPageMetadata || !semanticApi) return
    
    try {
      const success = await semanticApi.deletePage(currentPageMetadata.pageId)
      
      if (success) {
        // Remove from pageMetadata
        const updatedPageMetadata = pageMetadata.filter(p => p.pageId !== currentPageMetadata.pageId)
        globalState.set('pageMetadata', updatedPageMetadata)
        
        // Select first remaining page alphabetically
        if (updatedPageMetadata.length > 0) {
          const nextDefaultPage = updatedPageMetadata.slice().sort((a, b) => a.path.localeCompare(b.path))[0]
          handlePageSelect(nextDefaultPage)
        } else {
          globalState.set('currentPageMetadata', null)
          globalState.set('currentPageContent', null)
        }
      } else {
        console.error('Failed to delete page: server returned false')
      }
    } catch (error) {
      console.error('Failed to delete page:', error)
    }
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

  const handleDragDrop = async (
    dragData: DragData,
    dropTarget: DropTarget,
    updatedPages: PageMetadata[]
  ) => {
    // Simplified: just update the global state with the updated pages from FolderTree
    console.log('?? App: Updating global state with drag and drop results')
    
    // Update the global pageMetadata with the updated pages
    const currentPages = [...pageMetadata]
    let hasChanges = false
    
    for (const updatedPage of updatedPages) {
      const index = currentPages.findIndex(p => p.pageId === updatedPage.pageId)
      if (index >= 0) {
        currentPages[index] = updatedPage
        hasChanges = true
      }
    }
    
    if (hasChanges) {
      globalState.set('pageMetadata', currentPages)
      
      // Update current page metadata if it was affected
      if (currentPageMetadata) {
        const updatedCurrentPage = updatedPages.find(p => p.pageId === currentPageMetadata.pageId)
        if (updatedCurrentPage) {
          globalState.set('currentPageMetadata', updatedCurrentPage)
        }
      }
      
      console.log('? App: Successfully updated global state')
    }
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
          An error occurred. Please try again.
        </Alert>
      </Snackbar>

      {/* Top Banner/AppBar */}
      <AppBar position="static" sx={{ backgroundColor: 'var(--freeki-app-bar-background)', color: 'var(--freeki-app-bar-text-color)', zIndex: 1300 }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          {/* Left side - Logo and Title */}
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

          {/* Center - Empty space */}
          <Box sx={{ flexGrow: 1, maxWidth: 500, mx: 2 }} />

          {/* Right side - Action buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Edit/Save/Cancel buttons */}
            {currentPageMetadata && (
              <>
                {isEditing ? (
                  <>
                    <EnhancedTooltip title="Save changes">
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<Save sx={{ color: 'white' }} />}
                        onClick={() => handleSave(currentPageContent?.content || '')}
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
            {currentPageMetadata && (
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

            {/* Admin Settings gear */}
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
            ) : pageTree.length > 0 ? (
              <FolderTree
                pageTree={pageTree}
                selectedPageMetadata={currentPageMetadata}
                onPageSelect={handlePageSelect}
                searchQuery={searchQuery}
                pageMetadata={pageMetadata}
                onDragDrop={handleDragDrop}
                semanticApi={semanticApi}
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
          
          {currentPageMetadata && settings.showMetadataPanel && (
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
              {currentPageMetadata && currentPageContent && (
                isEditing ? (
                  <PageEditor
                    metadata={currentPageMetadata}
                    content={currentPageContent}
                    onSave={handleSave}
                    onCancel={handleCancel}
                  />
                ) : (
                  <PageViewer
                    metadata={currentPageMetadata}
                    content={currentPageContent}
                    onEdit={handleEdit}
                  />
                )
              )}
            </Box>
          </Box>
        </div>

        {/* Right Metadata Panel */}  
        {currentPageMetadata && currentPageContent && settings.showMetadataPanel && (
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
              <PageMetadataPanel
                metadata={currentPageMetadata}
                content={currentPageContent}
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
