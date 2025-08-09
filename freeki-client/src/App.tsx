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
import ConfirmDialog from './ConfirmDialog'
import { useUserSettings } from './useUserSettings'
import { useGlobalState, globalState } from './globalState'
import { buildPageTree } from './pageTreeUtils'
import { sortPagesByDisplayOrder } from './pageTreeUtils'
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
  const searchResults = useGlobalState('searchResults')
  const isLoadingPages = useGlobalState('isLoadingPages')
  
  // Use search results if search is active and we have a query, otherwise use all pages
  const effectivePageMetadata = React.useMemo(() => {
    const hasQuery = searchQuery.trim().length > 0
    if (hasQuery) {
      // When search is active, always use searchResults (even if empty)
      return searchResults
    } else {
      // When search is not active, use all pages
      return pageMetadata
    }
  }, [searchResults, pageMetadata, searchQuery])
  
  // Compute page tree from effective metadata (search results or all pages)
  const pageTree = React.useMemo(() => buildPageTree(effectivePageMetadata), [effectivePageMetadata])
  
  const [showAdminSettings, setShowAdminSettings] = React.useState<boolean>(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState<boolean>(false)
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
          
          // Find the first page using the same sorting logic as the tree
          const sortedPages = sortPagesByDisplayOrder(pages)
          
          console.log('?? Page loading order (files before folders):')
          sortedPages.slice(0, 5).forEach((page, index) => {
            console.log(`  ${index + 1}. ${page.title} (${page.path})`)
          })
          
          const defaultPage = sortedPages[0]
          console.log(`?? Selected default page: ${defaultPage.title} (${defaultPage.path})`)
          
          // Debug: Test with some example data to ensure Home comes first
          const testPages: PageMetadata[] = [
            { pageId: 'doc', title: 'Documentation', author: 'Test User', path: 'documentation/intro.md', tags: [], lastModified: 1000, version: 1 },
            { pageId: 'advanced', title: 'Advanced', author: 'Test User', path: 'documentation/advanced.md', tags: [], lastModified: 1000, version: 1 },
            { pageId: 'home', title: 'Home', author: 'Test User', path: 'home.md', tags: [], lastModified: 1000, version: 1 },
            { pageId: 'welcome', title: 'Welcome', author: 'Test User', path: 'welcome.md', tags: [], lastModified: 1000, version: 1 }
          ]
          const testSorted = sortPagesByDisplayOrder(testPages)
          console.log('?? Test sorting (should show Home and Welcome first):')
          testSorted.forEach((page, index) => {
            console.log(`  ${index + 1}. ${page.title} (${page.path})`)
          })
  
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

  // Enhanced search function with configurable search types
  const performSearch = async (query: string, searchConfig: { titles: boolean; tags: boolean; author: boolean; content: boolean }) => {
    console.log(`?? App.performSearch: query="${query}", config=`, searchConfig)
    globalState.set('searchQuery', query)
    
    if (!query.trim()) {
      // Clear search results when query is empty
      globalState.set('searchResults', [])
      return
    }
    
    // Check if no search types are enabled
    if (!searchConfig.titles && !searchConfig.tags && !searchConfig.author && !searchConfig.content) {
      console.log('?? App: No search types enabled, clearing results')
      globalState.set('searchResults', [])
      return
    }
    
    try {
      let results: string[] = []
      
      if (searchConfig.content) {
        // Use server-side content search API
        if (!semanticApi) {
          console.warn('No semantic API available for content search')
          return
        }
        console.log(`?? App: Using server-side search for content`)
        results = await semanticApi.searchPagesWithContent(query)
      }
      
      // Perform client-side metadata search for selected types
      const clientSearchTypes = []
      if (searchConfig.titles) clientSearchTypes.push('titles')
      if (searchConfig.tags) clientSearchTypes.push('tags')
      if (searchConfig.author) clientSearchTypes.push('author')
      
      if (clientSearchTypes.length > 0) {
        console.log(`?? App: Using client-side search for ${clientSearchTypes.join(', ')}, searching ${pageMetadata.length} pages`)
        const searchTerm = query.toLowerCase()
        const matchedPages: Array<{ page: PageMetadata; score: number }> = []
        
        pageMetadata.forEach(page => {
          let isMatch = false
          let score = 0
          
          // Search in title if enabled
          if (searchConfig.titles) {
            const titleMatch = page.title.toLowerCase().includes(searchTerm)
            if (titleMatch) {
              isMatch = true
              // Count occurrences in title (weighted heavily)
              let titleIndex = 0
              const lowerTitle = page.title.toLowerCase()
              while ((titleIndex = lowerTitle.indexOf(searchTerm, titleIndex)) !== -1) {
                score += 3
                titleIndex += searchTerm.length
              }
            }
          }
          
          // Search in tags if enabled
          if (searchConfig.tags) {
            const tagMatch = page.tags.some(tag => tag.toLowerCase().includes(searchTerm))
            if (tagMatch) {
              isMatch = true
              // Count tag matches
              page.tags.forEach(tag => {
                if (tag.toLowerCase().includes(searchTerm)) {
                  score += 2
                }
              })
            }
          }
          
          // Search in author if enabled
          if (searchConfig.author) {
            const authorMatch = page.author.toLowerCase().includes(searchTerm)
            if (authorMatch) {
              isMatch = true
              // Count occurrences in author (weighted moderately)
              let authorIndex = 0
              const lowerAuthor = page.author.toLowerCase()
              while ((authorIndex = lowerAuthor.indexOf(searchTerm, authorIndex)) !== -1) {
                score += 2
                authorIndex += searchTerm.length
              }
            }
          }
          
          // Search in path for additional scoring (always enabled for enabled types)
          if (isMatch && page.path.toLowerCase().includes(searchTerm)) {
            let pathIndex = 0
            const lowerPath = page.path.toLowerCase()
            while ((pathIndex = lowerPath.indexOf(searchTerm, pathIndex)) !== -1) {
              score += 1
              pathIndex += searchTerm.length
            }
          }
          
          if (isMatch) {
            console.log(`? App: Found match in page "${page.title}" (score: ${score})`)
            matchedPages.push({ page, score })
          }
        })
        
        // Sort by score descending
        matchedPages.sort((a, b) => b.score - a.score)
        
        // Convert to page IDs and combine with server results
        const clientResultIds = matchedPages.map(({ page }) => page.pageId)
        
        // Combine server and client results
        if (searchConfig.content) {
          // Merge results, avoiding duplicates
          const serverPageIds = new Set(results)
          const uniqueClientResults = clientResultIds.filter(id => !serverPageIds.has(id))
          results = [...results, ...uniqueClientResults]
        } else {
          // Only client results
          results = clientResultIds
        }
        
        console.log(`?? App: Combined search found ${results.length} results`)
      }
      
      // Convert search results to PageMetadata format and sort by display order
      const searchResultsAsMetadata = results.map(resultId => {
        const originalPage = pageMetadata.find(p => p.pageId === resultId)
        if (!originalPage) {
          console.error(`Search result references page ID ${resultId} that doesn't exist in pageMetadata. This should never happen.`)
          throw new Error(`Search integrity error: page ${resultId} not found in metadata`)
        }
        return originalPage
      })
      
      // Sort search results using the same criteria as normal page display
      const sortedSearchResults = sortPagesByDisplayOrder(searchResultsAsMetadata)
      
      console.log(`?? App: Setting ${sortedSearchResults.length} sorted search results in global state`)
      globalState.set('searchResults', sortedSearchResults)
    } catch (error) {
      console.error('Search failed:', error)
      globalState.set('searchResults', [])
    }
  }

  const handleTagClick = (tag: string) => {
    globalState.set('searchQuery', tag)
    // When clicking a tag, search only in tags
    performSearch(tag, { titles: false, tags: true, author: false, content: false })
  }

  const handleTagAdd = async (tagToAdd: string) => {
    if (!currentPageMetadata || !currentPageContent || !semanticApi) return
    
    // Don't add if tag already exists
    if (currentPageMetadata.tags.includes(tagToAdd)) return
    
    try {
      const newTags = [...currentPageMetadata.tags, tagToAdd]
      const updatedMetadata = await semanticApi.updatePage({
        pageId: currentPageMetadata.pageId,
        title: currentPageMetadata.title,
        content: currentPageContent.content,
        filepath: currentPageMetadata.path,
        tags: newTags
      })
      
      if (updatedMetadata) {
        // Update metadata in state
        globalState.set('currentPageMetadata', updatedMetadata)
        
        // Update in pageMetadata list
        const updatedPageMetadata = pageMetadata.map(p => 
          p.pageId === updatedMetadata.pageId ? updatedMetadata : p
        )
        globalState.set('pageMetadata', updatedPageMetadata)
      } else {
        console.error('Failed to add tag: no response from server')
      }
    } catch (error) {
      console.error('Failed to add tag:', error)
    }
  }

  const handleTagRemove = async (tagToRemove: string) => {
    if (!currentPageMetadata || !currentPageContent || !semanticApi) return
    
    try {
      const newTags = currentPageMetadata.tags.filter(tag => tag !== tagToRemove)
      const updatedMetadata = await semanticApi.updatePage({
        pageId: currentPageMetadata.pageId,
        title: currentPageMetadata.title,
        content: currentPageContent.content,
        filepath: currentPageMetadata.path,
        tags: newTags
      })
      
      if (updatedMetadata) {
        // Update metadata in state
        globalState.set('currentPageMetadata', updatedMetadata)
        
        // Update in pageMetadata list
        const updatedPageMetadata = pageMetadata.map(p => 
          p.pageId === updatedMetadata.pageId ? updatedMetadata : p
        )
        globalState.set('pageMetadata', updatedPageMetadata)
      } else {
        console.error('Failed to remove tag: no response from server')
      }
    } catch (error) {
      console.error('Failed to remove tag:', error)
    }
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

  const handleDelete = () => {
    if (!currentPageMetadata) return
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async () => {
    if (!currentPageMetadata || !semanticApi) return
    
    try {
      const success = await semanticApi.deletePage(currentPageMetadata.pageId)
      
      if (success) {
        // Remove from pageMetadata
        const updatedPageMetadata = pageMetadata.filter(p => p.pageId !== currentPageMetadata.pageId)
        globalState.set('pageMetadata', updatedPageMetadata)
        
        // Select first remaining page using same sorting logic
        if (updatedPageMetadata.length > 0) {
          const sortedPages = sortPagesByDisplayOrder(updatedPageMetadata)
          const nextDefaultPage = sortedPages[0]
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
    dropTarget: DropTarget
  ) => {
    if (!semanticApi) {
      console.warn('?? No semantic API available for drag and drop')
      return
    }

    console.log('?? App: Processing drag and drop operation:', { 
      dragData, 
      dropTarget,
      isVirtualFolder: dropTarget.targetPageId.startsWith('folder_')
    })
    
    try {
      if (dragData.isFolder) {
        // Handle folder drag operations
        console.log('?? Moving folder:', dragData.path)
        
        // Get all pages in the dragged folder
        const affectedPages = pageMetadata.filter(page => 
          page.path.startsWith(dragData.path + '/')
        )
        
        if (affectedPages.length === 0) {
          console.warn('?? No pages found in folder to move:', dragData.path)
          return
        }
        
        console.log(`?? Found ${affectedPages.length} pages to move in folder`)
        
        // Calculate new base path for the folder
        let newBasePath: string
        
        if (dropTarget.position === 'inside') {
          if (dropTarget.targetPageId.startsWith('folder_')) {
            // Moving inside another folder
            newBasePath = dropTarget.targetPath
          } else {
            // Moving inside a file's folder (same level as file)
            const targetPathParts = dropTarget.targetPath.split('/')
            newBasePath = targetPathParts.length > 1 ? targetPathParts.slice(0, -1).join('/') : ''
          }
        } else {
          // Moving before/after something - use same level as target
          const targetPathParts = dropTarget.targetPath.split('/')
          newBasePath = targetPathParts.length > 1 ? targetPathParts.slice(0, -1).join('/') : ''
        }
        
        // Calculate the new folder name
        const folderName = dragData.path.split('/').pop() || dragData.path
        const newFolderPath = newBasePath ? `${newBasePath}/${folderName}` : folderName
        
        // Don't move if the path would be the same
        if (newFolderPath === dragData.path) {
          console.log('?? Target folder path is same as current path, no move needed')
          return
        }
        
        console.log('?? Moving folder from:', dragData.path, 'to:', newFolderPath)
        
        // Collect all updated metadata as we move each page
        const updatedPagesMetadata: PageMetadata[] = []
        
        // Move each page in the folder
        for (const page of affectedPages) {
          // Calculate new path for this page
          const relativePath = page.path.substring(dragData.path.length + 1) // Remove folder prefix + '/'
          const newPagePath = `${newFolderPath}/${relativePath}`
          
          console.log(`?? Moving page: ${page.path} ? ${newPagePath}`)
          
          // Get current content for this page
          const pageWithContent = await semanticApi.getSinglePage(page.pageId)
          if (!pageWithContent) {
            console.error('? Could not load page content for move operation:', page.pageId)
            continue
          }
          
          // Update page with new path
          const updatedMetadata = await semanticApi.updatePage({
            pageId: page.pageId,
            title: page.title,
            content: pageWithContent.content,
            filepath: newPagePath,
            tags: page.tags
          })
          
          if (updatedMetadata) {
            console.log('? Page moved successfully:', page.title)
            updatedPagesMetadata.push(updatedMetadata)
            
            // ?? CRITICAL FIX: Update current page metadata if this moved page is currently selected
            if (currentPageMetadata?.pageId === page.pageId) {
              console.log('?? Updating current page metadata after folder move:', updatedMetadata.path)
              globalState.set('currentPageMetadata', updatedMetadata)
            }
          } else {
            console.error('? Failed to move page:', page.title)
          }
        }
        
        // Update global state with all the updated metadata - NO UNNECESSARY API CALL!
        console.log('?? Updating global state with moved pages metadata (no bandwidth waste)')
        const updatedPageMetadata = pageMetadata.map(existingPage => {
          const updatedPage = updatedPagesMetadata.find(updated => updated.pageId === existingPage.pageId)
          return updatedPage || existingPage
        })
        
        // Re-sort to maintain alphabetical order
        const resortedPageMetadata = sortPagesByDisplayOrder(updatedPageMetadata)
        globalState.set('pageMetadata', resortedPageMetadata)
        
        // ?? CRITICAL FIX: If we moved a folder containing the current page, ensure it stays visible
        if (currentPageMetadata && updatedPagesMetadata.some(p => p.pageId === currentPageMetadata.pageId)) {
          console.log('?? Ensuring current page remains visible after folder move')
          const updatedCurrentPage = updatedPagesMetadata.find(p => p.pageId === currentPageMetadata.pageId)
          if (updatedCurrentPage) {
            // Force re-expand the path to ensure the moved page stays visible
            // This prevents the tree from collapsing when the folder structure changes
            handlePageSelect(updatedCurrentPage)
          }
        }
        
        console.log('? Folder move operation completed efficiently without unnecessary bandwidth')
      } else {
        // Handle single file drag operations
        const draggedPage = pageMetadata.find(p => p.pageId === dragData.pageId)
        if (!draggedPage) {
          console.error('? Could not find dragged page in metadata:', dragData.pageId)
          return
        }

        // Calculate the new file path based on drop target and position
        let newPath: string

        if (dropTarget.position === 'inside') {
          // Moving inside a folder - handle both real files and virtual folders
          const fileName = draggedPage.path.split('/').pop() || draggedPage.path
          
          if (dropTarget.targetPageId.startsWith('folder_')) {
            // Target is a virtual folder - use its path directly as the folder path
            newPath = `${dropTarget.targetPath}/${fileName}`
          } else {
            // Target is a regular file - move to same folder level as the target
            const targetPathParts = dropTarget.targetPath.split('/')
            const targetFolder = targetPathParts.length > 1 ? targetPathParts.slice(0, -1).join('/') : ''
            newPath = targetFolder ? `${targetFolder}/${fileName}` : fileName
          }
        } else {
          // Moving before/after a file - keep same folder level as target
          const targetPathParts = dropTarget.targetPath.split('/')
          const targetFolder = targetPathParts.length > 1 ? targetPathParts.slice(0, -1).join('/') : ''
          const fileName = draggedPage.path.split('/').pop() || draggedPage.path
          newPath = targetFolder ? `${targetFolder}/${fileName}` : fileName
        }

        // Don't move if the path would be the same
        if (newPath === draggedPage.path) {
          console.log('?? Target path is same as current path, no move needed')
          return
        }

        console.log('?? Moving file:', {
          from: draggedPage.path,
          to: newPath,
          position: dropTarget.position,
          targetType: dropTarget.targetPageId.startsWith('folder_') ? 'virtual-folder' : 'file'
        })

        // Get the current content since updatePage requires it
        const pageWithContent = await semanticApi.getSinglePage(draggedPage.pageId)
        if (!pageWithContent) {
          console.error('? Could not load page content for move operation')
          return
        }

        const updatedMetadata = await semanticApi.updatePage({
          pageId: draggedPage.pageId,
          title: draggedPage.title,
          content: pageWithContent.content,
          filepath: newPath,
          tags: draggedPage.tags
        })

        if (updatedMetadata) {
          console.log('? File moved successfully:', updatedMetadata)

          // Update the global pageMetadata with the returned metadata - NO UNNECESSARY API CALL!
          const updatedPageMetadata = pageMetadata.map(p => 
            p.pageId === draggedPage.pageId ? updatedMetadata : p
          )
          
          // Re-sort the pages to maintain alphabetical order after the move
          const resortedPageMetadata = sortPagesByDisplayOrder(updatedPageMetadata)
          globalState.set('pageMetadata', resortedPageMetadata)
          
          // Update current page metadata if it was the moved file
          if (currentPageMetadata?.pageId === draggedPage.pageId) {
            globalState.set('currentPageMetadata', updatedMetadata)
          }
          
          console.log('? Successfully updated and re-sorted global state after file move (bandwidth efficient)')
        } else {
          console.error('? Server returned null when updating page path')
        }
      }

    } catch (error) {
      console.error('? Error during drag and drop operation:', error)
    }
  }

  const currentYear = new Date().getFullYear()

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Top App Bar */}
      <AppBar position="static" sx={{ backgroundColor: 'var(--freeki-app-bar-background)' }}>
        <Toolbar>
          {/* Left side - Company Icon and Title */}
          <Box>
            <EnhancedTooltip title={`Return to home page (${adminSettings.companyName})`}>
              <Button
                onClick={() => {
                  if (pageMetadata.length > 0) {
                    const sortedPages = sortPagesByDisplayOrder(pageMetadata)
                    const homePage = sortedPages[0]
                    handlePageSelect(homePage)
                  }
                }}
                sx={{
                  color: 'var(--freeki-app-bar-text-color)',
                  textTransform: 'none',
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

          {/* Center - Page Title (if page is selected) */}
          <Box sx={{ flexGrow: 1, maxWidth: 500, mx: 2, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {currentPageMetadata && (
              <Typography 
                variant="h6" 
                sx={{ 
                  color: 'var(--freeki-app-bar-text-color)',
                  textAlign: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '100%'
                }}
                title={currentPageMetadata.title}
              >
                {currentPageMetadata.title}
              </Typography>
            )}
          </Box>

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
            ) : (
              <FolderTree
                pageTree={pageTree}
                selectedPageMetadata={currentPageMetadata}
                onPageSelect={handlePageSelect}
                onSearch={performSearch}
                searchQuery={searchQuery}
                pageMetadata={effectivePageMetadata}
                onDragDrop={handleDragDrop}
                semanticApi={semanticApi}
              />
            )}
            {/* Only show the "no pages available" fallback if there are truly no pages AND no search is active */}
            {!isLoadingPages && pageMetadata.length === 0 && !searchQuery.trim() && (
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
                onTagAdd={handleTagAdd}
                onTagRemove={handleTagRemove}
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Page"
        message={`Are you sure you want to delete "${currentPageMetadata?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmColor="error"
        dangerous={true}
      />
    </Box>
  )
}
