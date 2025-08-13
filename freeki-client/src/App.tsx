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
  useMediaQuery,
  Tooltip
} from '@mui/material'
import {
  Edit,
  Save,
  Cancel,
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
import { useConfirmOrProceed } from './ConfirmDialog'
import { useUserSettings } from './useUserSettings'
import { useGlobalState, globalState, getCurrentLayoutState } from './globalState'
import { buildPageTree } from './pageTreeUtils'
import { sortPagesByDisplayOrder } from './pageTreeUtils'
import type { PageMetadata } from './globalState'
import type { DragData, DropTarget } from './pageTreeUtils'
import { fetchAdminSettings } from './adminSettings'
import { createSemanticApi } from './semanticApiFactory'
import type { ISemanticApi } from './semanticApiInterface'
import './themeService'
import './App.css'
import PageMetadataComponent from './PageMetadata'

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

// Helper: update or insert the latest version of a page in pageMetadata
function upsertPageMetadata(list: PageMetadata[], updated: PageMetadata): PageMetadata[] {
  // Remove any old version of this pageId
  const filtered = list.filter(p => p.pageId !== updated.pageId)
  // Add the new/updated metadata
  return [...filtered, updated]
}

// --- STATE HOOKS ---
export default function App() {
  // API client instance
  const [semanticApi, setSemanticApi] = React.useState<ISemanticApi | null>(null)
  const { settings, userInfo, isLoaded, updateSetting, fetchUserInfo } = useUserSettings(semanticApi)
  
  // Global state
  const adminSettings = useGlobalState('adminSettings')
  const pageMetadata = useGlobalState('pageMetadata')
  const currentPageMetadata = useGlobalState('currentPageMetadata')
  const currentPageContent = useGlobalState('currentPageContent')
  const isEditing = useGlobalState('isEditing')
  const searchResults = useGlobalState('searchResults')
  const isLoadingPages = useGlobalState('isLoadingPages')
  
  const isNarrowScreen = useMediaQuery('(max-width: 900px)')
  
  // Remove searchQuery from globalState, use local state for searchQueryForFolderTree
  const [searchQueryForFolderTree, setSearchQueryForFolderTree] = React.useState<string>('') // SOURCE OF TRUTH

  // Admin settings dialog
  const [showAdminSettings, setShowAdminSettings] = React.useState<boolean>(false)

  // Editor state
  const [editorContent, setEditorContent] = React.useState<string | null>(null)
  const [viewingRevision, setViewingRevision] = React.useState<{ metadata: PageMetadata; content: string } | null>(null)

  // --- DERIVED STATE ---
  const isEditingState = isEditing
  const hasUnsaved = isEditing && editorContent !== null && editorContent !== currentPageContent?.content

  // Derive current layout state - READ-ONLY
  const currentLayout = React.useMemo(() => getCurrentLayoutState(settings), [settings, isNarrowScreen])

  // Use search results if active, otherwise all pages
  const effectivePageMetadata = React.useMemo(() => {
    const hasQuery = searchQueryForFolderTree.trim().length > 0
    return hasQuery ? searchResults : pageMetadata
  }, [searchResults, pageMetadata, searchQueryForFolderTree])

  // Page tree
  const pageTree = React.useMemo(() => buildPageTree(effectivePageMetadata), [effectivePageMetadata])

  // Get the isLatestRevision logic from the metadata panel (tags block)
  // We need to know the metadata and currentPageVersion for the currently viewed revision
  const pageMetadataPanelRef = React.useRef<any>(null);

  // Find the correct metadata and currentPageVersion for the viewed revision
  const viewedMetadata = viewingRevision ? viewingRevision.metadata : currentPageMetadata;
  const viewedCurrentPageVersion = React.useMemo(() => {
    if (!viewedMetadata) return 0;
    // Find the latest version for this pageId from all pageMetadata
    const allVersions = pageMetadata.filter(p => p.pageId === viewedMetadata.pageId);
    return allVersions.length > 0 ? Math.max(...allVersions.map(p => p.version)) : viewedMetadata.version;
  }, [pageMetadata, viewedMetadata]);

  // Use the same isLatestRevision logic as PageMetadata.tsx
  const isLatestRevision = viewedMetadata && (viewedMetadata.version === viewedCurrentPageVersion);

  // --- HANDLERS ---
  const handleViewRevision = (revision: { metadata: PageMetadata; content: string } | null) => {
    setViewingRevision(revision)
    globalState.set('isEditing', false)
  }

  const handlePageSelect = (metadata: PageMetadata) => {
    confirmOrProceed(async () => {
      if (!semanticApi) return
      if (currentPageMetadata?.pageId === metadata.pageId) return
      setViewingRevision(null)
      globalState.set('currentPageMetadata', metadata)
      globalState.set('isEditing', false)
      globalState.set('isLoadingPageContent', true)
      try {
        const pageWithContent = await semanticApi.getSinglePage(metadata.pageId)
        if (pageWithContent) {
          globalState.set('currentPageContent', {
            pageId: metadata.pageId,
            content: pageWithContent.content
          })
        } else {
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
    })
  }

  // --- REIMPLEMENTED EDIT/SAVE/CANCEL/CONTENT HANDLERS ---
  const handleEdit = () => {
    if (!currentPageContent) return;
    setEditorContent(currentPageContent.content);
    globalState.set('isEditing', true);
  };

  const handleEditorContentChange = (content: string) => {
    setEditorContent(content);
  };

  const handleSave = async (content: string) => {
    if (!semanticApi || !currentPageMetadata) return;
    try {
      const updatedMetadata = await semanticApi.updatePage({
        pageId: currentPageMetadata.pageId,
        title: currentPageMetadata.title,
        content,
        filepath: currentPageMetadata.path,
        tags: currentPageMetadata.tags
      });
      if (updatedMetadata) {
        globalState.set('currentPageMetadata', updatedMetadata);
        globalState.set('pageMetadata', upsertPageMetadata(pageMetadata, updatedMetadata));
        globalState.set('currentPageContent', { pageId: updatedMetadata.pageId, content });
        setEditorContent(null);
        globalState.set('isEditing', false);
      }
    } catch (error) {
      console.error('Failed to save page:', error);
    }
  };

  const handleCancel = () => {
    setEditorContent(null);
    globalState.set('isEditing', false);
  };

  // --- CONFIRM DIALOG ---
  const {
    confirmOrProceed,
    dialog: confirmDialog
  } = useConfirmOrProceed({
    isEditing: isEditingState,
    hasUnsaved,
    onSave: async () => {
      if (editorContent !== null && currentPageMetadata && semanticApi) {
        await handleSave(editorContent)
      }
      globalState.set('isEditing', false)
      setEditorContent(null)
    },
    onDiscard: () => {
      globalState.set('isEditing', false)
      setEditorContent(null)
    },
    message: 'You have unsaved changes. What do you want to do?',
    title: 'Unsaved Changes',
    dangerous: true,
    confirmText: 'Proceed',
    cancelText: 'Cancel',
    saveText: 'Save',
    discardText: 'Discard'
  })

  // Initialize Semantic API
  useEffect(() => {
    const api = createSemanticApi()
    setSemanticApi(api)
  }, [])

  // Load initial data and fetch user info
  useEffect(() => {
    if (!semanticApi) return
    
    async function loadInitialData() {
      const api = semanticApi!
      
      try {
        // Load user info first
        await fetchUserInfo()
        
        globalState.set('isLoadingAdminSettings', true)
        const settings = await fetchAdminSettings(api)
        if (settings) {
          globalState.set('adminSettings', settings)
        }
        
        globalState.set('isLoadingPages', true)
        const pages = await api.listAllPages()
        if (pages.length > 0) {
          globalState.set('pageMetadata', pages)
          const sortedPages = sortPagesByDisplayOrder(pages)
          const defaultPage = sortedPages[0]
          globalState.set('currentPageMetadata', defaultPage)
          const pageWithContent = await api.getSinglePage(defaultPage.pageId)
          if (pageWithContent) {
            globalState.set('currentPageContent', {
              pageId: defaultPage.pageId,
              content: pageWithContent.content
            })
          }
        } else {
          globalState.set('pageMetadata', [])
          globalState.set('currentPageMetadata', null)
          globalState.set('currentPageContent', null)
        }
      } catch (error) {
        console.error('Failed to load initial data:', error)
        globalState.set('pageMetadata', [])
        globalState.set('currentPageMetadata', null)
        globalState.set('currentPageContent', null)
      } finally {
        globalState.set('isLoadingAdminSettings', false)
        globalState.set('isLoadingPages', false)
      }
    }
    
    loadInitialData()
  }, [semanticApi, fetchUserInfo])

  // Search function
  const performSearch = async () => {
    const query = searchQueryForFolderTree
    const searchConfig = settings.searchConfig
    if (!query.trim()) {
      globalState.set('searchResults', [])
      return
    }
    
    // Check if any search type is enabled
    if (!searchConfig.titles && !searchConfig.tags && !searchConfig.author && !searchConfig.content) {
      globalState.set('searchResults', [])
      return
    }
    
    try {
      let results: string[] = []
      
      if (searchConfig.content) {
        if (!semanticApi) {
          console.warn('No semantic API available for content search')
          return
        }
        results = await semanticApi.searchPagesWithContent(query)
      }
      
      const clientSearchTypes = []
      if (searchConfig.titles) clientSearchTypes.push('titles')
      if (searchConfig.tags) clientSearchTypes.push('tags')
      if (searchConfig.author) clientSearchTypes.push('author')
      
      if (clientSearchTypes.length > 0) {
        const searchTerm = query.toLowerCase()
        const matchedPages: Array<{ page: PageMetadata; score: number }> = []
        
        pageMetadata.forEach(page => {
          let isMatch = false
          let score = 0
          
          if (searchConfig.titles) {
            const titleMatch = page.title.toLowerCase().includes(searchTerm)
            if (titleMatch) {
              isMatch = true
              let titleIndex = 0
              const lowerTitle = page.title.toLowerCase()
              while ((titleIndex = lowerTitle.indexOf(searchTerm, titleIndex)) !== -1) {
                score += 3
                titleIndex += searchTerm.length
              }
            }
          }
          
          if (searchConfig.tags) {
            const tagMatch = page.tags.some(tag => tag.toLowerCase().includes(searchTerm))
            if (tagMatch) {
              isMatch = true
              page.tags.forEach(tag => {
                if (tag.toLowerCase().includes(searchTerm)) {
                  score += 2
                }
              })
            }
          }
          
          if (searchConfig.author) {
            const authorMatch = page.author.toLowerCase().includes(searchTerm)
            if (authorMatch) {
              isMatch = true
              let authorIndex = 0
              const lowerAuthor = page.author.toLowerCase()
              while ((authorIndex = lowerAuthor.indexOf(searchTerm, authorIndex)) !== -1) {
                score += 2
                authorIndex += searchTerm.length
              }
            }
          }
          
          if (isMatch && page.path.toLowerCase().includes(searchTerm)) {
            let pathIndex = 0
            const lowerPath = page.path.toLowerCase()
            while ((pathIndex = lowerPath.indexOf(searchTerm, pathIndex)) !== -1) {
              score += 1
              pathIndex += searchTerm.length
            }
          }
          
          if (isMatch) {
            matchedPages.push({ page, score })
          }
        })
        
        matchedPages.sort((a, b) => b.score - a.score)
        const clientResultIds = matchedPages.map(({ page }) => page.pageId)
        
        if (searchConfig.content) {
          const serverPageIds = new Set(results)
          const uniqueClientResults = clientResultIds.filter(id => !serverPageIds.has(id))
          results = [...results, ...uniqueClientResults]
        } else {
          results = clientResultIds
        }
      }
      
      const searchResultsAsMetadata = results.map(resultId => {
        const originalPage = pageMetadata.find(p => p.pageId === resultId)
        if (!originalPage) {
          throw new Error(`Search integrity error: page ${resultId} not found in metadata`)
        }
        return originalPage
      })
      
      const sortedSearchResults = sortPagesByDisplayOrder(searchResultsAsMetadata)
      globalState.set('searchResults', sortedSearchResults)
    } catch (error) {
      console.error('Search failed:', error)
      globalState.set('searchResults', [])
    }
  }

  const handleTagClick = (tag: string) => {
    // Set the search query and config - let FolderTree react and trigger search
    globalState.setProperty('userSettings.searchConfig', { 
      titles: false, 
      tags: true, 
      author: false, 
      content: false 
    })
    setSearchQueryForFolderTree(tag)
    // No direct performSearch() call - let the reactive system handle it
  }

  const handleAuthorClick = (author: string) => {
    // Set the search query and config - let FolderTree react and trigger search
    globalState.setProperty('userSettings.searchConfig', { 
      titles: false, 
      tags: false, 
      author: true, 
      content: false 
    })
    setSearchQueryForFolderTree(author)
    // No direct performSearch() call - let the reactive system handle it
  }

  // Fix: handleTagAdd/handleTagRemove must always return Promise<PageMetadata|null>
  const handleTagAdd = async (tagToAdd: string): Promise<PageMetadata | null> => {
    if (!currentPageMetadata || !currentPageContent || !semanticApi) return null;
    if (currentPageMetadata.tags.includes(tagToAdd)) return null;
    try {
      const newTags = [...currentPageMetadata.tags, tagToAdd];
      const updatedMetadata = await semanticApi.updatePage({
        pageId: currentPageMetadata.pageId,
        title: currentPageMetadata.title,
        content: currentPageContent.content,
        filepath: currentPageMetadata.path,
        tags: newTags
      });
      if (updatedMetadata) {
        globalState.set('currentPageMetadata', updatedMetadata);
        globalState.set('pageMetadata', upsertPageMetadata(pageMetadata, updatedMetadata));
        return updatedMetadata;
      }
    } catch (error) {
      console.error('Failed to add tag:', error);
    }
    return null;
  };

  const handleTagRemove = async (tagToRemove: string): Promise<PageMetadata | null> => {
    if (!currentPageMetadata || !currentPageContent || !semanticApi) return null;
    try {
      const newTags = currentPageMetadata.tags.filter(tag => tag !== tagToRemove);
      const updatedMetadata = await semanticApi.updatePage({
        pageId: currentPageMetadata.pageId,
        title: currentPageMetadata.title,
        content: currentPageContent.content,
        filepath: currentPageMetadata.path,
        tags: newTags
      });
      if (updatedMetadata) {
        globalState.set('currentPageMetadata', updatedMetadata);
        globalState.set('pageMetadata', upsertPageMetadata(pageMetadata, updatedMetadata));
        return updatedMetadata;
      }
    } catch (error) {
      console.error('Failed to remove tag:', error);
    }
    return null;
  }

  const handleCreatePage = async (title: string, content: string, filepath: string, tags: string[]) => {
    if (!semanticApi) return
    try {
      const newMetadata = await semanticApi.createPage({
        title,
        content,
        filepath,
        tags
      })
      if (newMetadata) {
        globalState.set('pageMetadata', upsertPageMetadata(pageMetadata, newMetadata))
        handlePageSelect(newMetadata)
      }
    } catch (error) {
      console.error('Failed to create page:', error)
      throw error
    }
  }

  const handleCreatePageWithConfirm = async (title: string, content: string, filepath: string, tags: string[]) => {
    await confirmOrProceed(async () => {
      await handleCreatePage(title, content, filepath, tags)
    })
  }

  const handleDelete = () => {
    if (!currentPageMetadata) return
    // Open delete confirmation dialog
  }

  const handleSettingsClick = () => {
    setShowAdminSettings(true)
  }

  // Panel toggles - directly update global state
  const handleSidebarToggle = () => {
    const newValue = !currentLayout.showFolderPanel
    
    if (isNarrowScreen) {
      updateSetting('narrowScreenLayout', {
        ...settings.narrowScreenLayout,
        showFolderPanel: newValue,
        // In narrow mode, close metadata when opening folder panel
        showMetadataPanel: newValue ? false : settings.narrowScreenLayout.showMetadataPanel
      })
    } else {
      updateSetting('wideScreenLayout', {
        ...settings.wideScreenLayout,
        showFolderPanel: newValue
      })
    }
  }

  const handleMetadataToggle = () => {
    const newValue = !currentLayout.showMetadataPanel
    
    if (isNarrowScreen) {
      updateSetting('narrowScreenLayout', {
        ...settings.narrowScreenLayout,
        showMetadataPanel: newValue,
        // In narrow mode, close folder when opening metadata panel
        showFolderPanel: newValue ? false : settings.narrowScreenLayout.showFolderPanel
      })
    } else {
      updateSetting('wideScreenLayout', {
        ...settings.wideScreenLayout,
        showMetadataPanel: newValue
      })
    }
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
      console.warn('No semantic API available for drag and drop')
      return
    }

    try {
      if (dragData.isFolder) {
        const affectedPages = pageMetadata.filter((page: PageMetadata) => 
          page.path.startsWith(dragData.path + '/')
        )
        
        if (affectedPages.length === 0) {
          return
        }
        
        let newBasePath: string
        
        if (dropTarget.position === 'inside') {
          if (dropTarget.targetPageId.startsWith('folder_')) {
            newBasePath = dropTarget.targetPath
          } else {
            const targetPathParts = dropTarget.targetPath.split('/')
            newBasePath = targetPathParts.length > 1 ? targetPathParts.slice(0, -1).join('/') : ''
          }
        } else {
          const targetPathParts = dropTarget.targetPath.split('/')
          newBasePath = targetPathParts.length > 1 ? targetPathParts.slice(0, -1).join('/') : ''
        }
        
        const folderName = dragData.path.split('/').pop() || dragData.path
        const newFolderPath = newBasePath ? `${newBasePath}/${folderName}` : folderName
        
        if (newFolderPath === dragData.path) {
          return
        }
        
        const updatedPagesMetadata: PageMetadata[] = []
        
        for (const page of affectedPages) {
          const relativePath = page.path.substring(dragData.path.length + 1)
          const newPagePath = `${newFolderPath}/${relativePath}`
          
          const pageWithContent = await semanticApi.getSinglePage(page.pageId)
          if (!pageWithContent) {
            continue
          }
          
          const updatedMetadata = await semanticApi.updatePage({
            pageId: page.pageId,
            title: page.title,
            content: pageWithContent.content,
            filepath: newPagePath,
            tags: page.tags
          })
          
          if (updatedMetadata) {
            updatedPagesMetadata.push(updatedMetadata)
            
            if (currentPageMetadata?.pageId === page.pageId) {
              globalState.set('currentPageMetadata', updatedMetadata)
            }
          }
        }
        
        const updatedPageMetadata = pageMetadata.map((existingPage: PageMetadata) => {
          const updatedPage = updatedPagesMetadata.find(updated => updated.pageId === existingPage.pageId)
          return updatedPage || existingPage
        })
        
        const resortedPageMetadata = sortPagesByDisplayOrder(updatedPageMetadata)
        globalState.set('pageMetadata', resortedPageMetadata)
        
      } else {
        const draggedPage = pageMetadata.find((p: PageMetadata) => p.pageId === dragData.pageId)
        if (!draggedPage) {
          return
        }

        let newPath: string

        if (dropTarget.position === 'inside') {
          const fileName = draggedPage.path.split('/').pop() || draggedPage.path
          
          if (dropTarget.targetPageId.startsWith('folder_')) {
            newPath = `${dropTarget.targetPath}/${fileName}`
          } else {
            const targetPathParts = dropTarget.targetPath.split('/')
            const targetFolder = targetPathParts.length > 1 ? targetPathParts.slice(0, -1).join('/') : ''
            newPath = targetFolder ? `${targetFolder}/${fileName}` : fileName
          }
        } else {
          const targetPathParts = dropTarget.targetPath.split('/')
          const targetFolder = targetPathParts.length > 1 ? targetPathParts.slice(0, -1).join('/') : ''
          const fileName = draggedPage.path.split('/').pop() || draggedPage.path
          newPath = targetFolder ? `${targetFolder}/${fileName}` : fileName
        }

        if (newPath === draggedPage.path) {
          return
        }

        const pageWithContent = await semanticApi.getSinglePage(draggedPage.pageId)
        if (!pageWithContent) {
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
          const updatedPageMetadata = pageMetadata.map((p: PageMetadata) => 
            p.pageId === draggedPage.pageId ? updatedMetadata : p
          )
          
          const resortedPageMetadata = sortPagesByDisplayOrder(updatedPageMetadata)
          globalState.set('pageMetadata', resortedPageMetadata)
          
          if (currentPageMetadata?.pageId === draggedPage.pageId) {
            globalState.set('currentPageMetadata', updatedMetadata)
          }
        }
      }
    } catch (error) {
      console.error('Error during drag and drop operation:', error)
    }
  }

  const handleThemeToggle = () => {
    const nextTheme = settings.theme === 'light' ? 'dark' : settings.theme === 'dark' ? 'auto' : 'light'
    updateSetting('theme', nextTheme)
  }

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

  // Call performSearch when searchQueryForFolderTree or searchConfig changes
  useEffect(() => {
    performSearch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQueryForFolderTree, settings.searchConfig, semanticApi, pageMetadata])

  if (!isLoaded || !semanticApi) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography>Loading...</Typography>
      </Box>
    )
  }

  const currentYear = new Date().getFullYear()

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Top App Bar */}
      <AppBar position="static" sx={{ backgroundColor: 'var(--freeki-app-bar-background)' }}>
        <Toolbar sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 40, px: 0 }}>
          {/* Left side - Company Icon and Title */}
          <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
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
                },
                minWidth: 0,
                pr: 1
              }}
              aria-label="Return to home page"
            >
              <Avatar
                src={adminSettings.iconUrl}
                alt={`${adminSettings.companyName} icon`}
                sx={{ mr: 1, width: 32, height: 32, backgroundColor: 'white', flexShrink: 0 }}
                aria-label={adminSettings.companyName}
              >
                {adminSettings.companyName.charAt(0)}
              </Avatar>
              <Typography variant="h6" sx={{ color: 'var(--freeki-app-bar-text-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220, fontWeight: 700, fontSize: 20 }} variantMapping={{ h6: 'div' }}>
                {adminSettings.wikiTitle}
              </Typography>
            </Button>
          </Box>

          {/* Center - Page Title */}
          {!isNarrowScreen && currentPageMetadata && (
            <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', minWidth: 0, position: 'absolute', left: 0, right: 0, pointerEvents: 'none', zIndex: 0 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  color: 'var(--freeki-app-bar-text-color)',
                  textAlign: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 500,
                  fontWeight: 600,
                  fontSize: 18,
                  mx: 'auto',
                  pointerEvents: 'auto',
                  background: 'transparent',
                  zIndex: 1
                }}
                title={currentPageMetadata.title}
              >
                {currentPageMetadata.title}
              </Typography>
            </Box>
          )}

          {/* Right side - Action buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, marginLeft: 'auto', zIndex: 2 }}>
  {/* Save button (only in edit mode) */}
  {currentPageMetadata && isEditing && (
    <EnhancedTooltip title="Save changes">
      <span>
        <IconButton
          color="success"
          onClick={() => handleSave(editorContent ?? (currentPageContent?.content || ''))}
          sx={{ color: 'var(--freeki-app-bar-text-color)', fontSize: 24 }}
          aria-label="Save changes"
          disabled={
            !!viewingRevision ||
            editorContent === null ||
            editorContent === currentPageContent?.content
          }
        >
          <Save sx={{ fontSize: 24 }} />
        </IconButton>
      </span>
    </EnhancedTooltip>
  )}
  {/* Edit or Cancel button (same spot, rightmost) */}
  {currentPageMetadata && (
    isEditing ? (
      <EnhancedTooltip title="Cancel editing">
        <IconButton
          color="error"
          onClick={handleCancel}
          sx={{ color: 'var(--freeki-app-bar-text-color)', fontSize: 24 }}
          aria-label="Cancel editing"
          disabled={false}
        >
          <Cancel sx={{ fontSize: 24 }} />
        </IconButton>
      </EnhancedTooltip>
    ) : (
      isLatestRevision ? (
        <EnhancedTooltip title="Edit page">
          <span>
            <IconButton
              sx={{ color: 'var(--freeki-app-bar-text-color)', fontSize: 24 }}
              onClick={handleEdit}
              aria-label="Edit page"
              disabled={false}
            >
              <Edit sx={{ fontSize: 24 }} />
            </IconButton>
          </span>
        </EnhancedTooltip>
      ) : (
        <span>
          <IconButton
            sx={{ color: 'var(--freeki-app-bar-text-color)', fontSize: 24 }}
            aria-label="Edit page"
            disabled={true}
          >
            <Edit sx={{ fontSize: 24 }} />
          </IconButton>
        </span>
      )
    )
  )}

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
      <div className={`main-layout${isNarrowScreen && (currentLayout.showFolderPanel || currentLayout.showMetadataPanel) ? ' panel-open' : ''}`} style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Sidebar */}
        <div 
          className={`sidebar-panel${currentLayout.showFolderPanel ? '' : ' collapsed'}${isNarrowScreen && currentLayout.showFolderPanel ? ' narrow-opened' : ''}`}
          style={{ '--sidebar-width': `${isNarrowScreen ? '90vw' : settings.wideScreenLayout.sidebarWidth + 'px'}` } as React.CSSProperties}
        >
          <button
            className={`chevron-button chevron-narrow-screen sidebar-chevron chevron-sidebar-theme ${currentLayout.showFolderPanel ? 'sidebar-open' : 'sidebar-closed'}`}
            onClick={handleSidebarToggle}
            aria-label={currentLayout.showFolderPanel ? "Close sidebar" : "Open sidebar"}
            title={currentLayout.showFolderPanel ? "Close sidebar" : "Open sidebar"}
          >
            {currentLayout.showFolderPanel ? <ChevronLeft /> : <ChevronRight />}
          </button>

          <FadePanelContent visible={currentLayout.showFolderPanel}>
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
                onSearch={setSearchQueryForFolderTree}
                searchQuery={searchQueryForFolderTree}
                pageMetadata={effectivePageMetadata}
                onDragDrop={handleDragDrop}
                onCreatePage={handleCreatePageWithConfirm}
                confirmOrProceed={confirmOrProceed}
              />
            )}
          </FadePanelContent>

          {currentLayout.showFolderPanel && !isNarrowScreen && (
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
            marginLeft: (!isNarrowScreen && !currentLayout.showFolderPanel) ? `-${settings.wideScreenLayout.sidebarWidth}px` : '0',
            marginRight: (!isNarrowScreen && !currentLayout.showMetadataPanel) ? `-${settings.wideScreenLayout.metadataWidth}px` : '0',
            transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1), margin-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <button
            className={`chevron-button chevron-wide-screen chevron-sidebar-theme ${currentLayout.showFolderPanel ? 'sidebar-open' : 'sidebar-closed'}`}
            onClick={handleSidebarToggle}
            aria-label={currentLayout.showFolderPanel ? "Close sidebar" : "Open sidebar"}
            title={currentLayout.showFolderPanel ? "Close sidebar" : "Open sidebar"}
          >
            {currentLayout.showFolderPanel ? <ChevronLeft /> : <ChevronRight />}
          </button>
          
          <button
            className={`chevron-button chevron-wide-screen chevron-metadata-theme ${currentLayout.showMetadataPanel ? 'metadata-open' : 'metadata-closed'}`}
            onClick={handleMetadataToggle}
            aria-label={currentLayout.showMetadataPanel ? "Close metadata panel" : "Open metadata panel"}
            title={currentLayout.showMetadataPanel ? "Close metadata panel" : "Open metadata panel"}
          >
            {currentLayout.showMetadataPanel ? <ChevronRight /> : <ChevronLeft />}
          </button>

          <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }} role="main">
            <Box sx={{ flex: 1, overflow: 'auto' }} role="main">
              {(viewingRevision ? (
                <PageViewer
                  metadata={viewingRevision.metadata}
                  content={{ pageId: viewingRevision.metadata.pageId, content: viewingRevision.content }}
                />
              ) : (currentPageMetadata && currentPageContent && (
                isEditing ? (
                  <PageEditor
                    content={currentPageContent}
                    onContentChange={handleEditorContentChange}
                  />
                ) : (
                  <PageViewer
                    metadata={currentPageMetadata}
                    content={currentPageContent}
                  />
                )
              )))}
            </Box>
          </Box>
        </div>

        {/* Right Metadata Panel */}  
        <div 
          className={`metadata-panel${currentLayout.showMetadataPanel ? '' : ' collapsed'}${isNarrowScreen && currentLayout.showMetadataPanel ? ' narrow-opened' : ''}`} 
          style={{ '--metadata-width': `${isNarrowScreen ? '90vw' : settings.wideScreenLayout.metadataWidth + 'px'}` } as React.CSSProperties}
        >
          <button
            className={`chevron-button chevron-narrow-screen metadata-chevron chevron-metadata-theme ${currentLayout.showMetadataPanel ? 'metadata-open' : 'metadata-closed'}`}
            onClick={handleMetadataToggle}
            aria-label={currentLayout.showMetadataPanel ? "Close metadata panel" : "Open metadata panel"}
            title={currentLayout.showMetadataPanel ? "Close metadata panel" : "Open metadata panel"}
          >
            {currentLayout.showMetadataPanel ? <ChevronRight /> : <ChevronLeft />}
          </button>

          <FadePanelContent visible={currentLayout.showMetadataPanel}>
            {(viewingRevision
              ? (
                <PageMetadataPanel
                  metadata={viewingRevision.metadata}
                  content={{ pageId: viewingRevision.metadata.pageId, content: viewingRevision.content }}
                  semanticApi={semanticApi}
                  onTagClick={handleTagClick}
                  onTagAdd={handleTagAdd}
                  onTagRemove={handleTagRemove}
                  onAuthorClick={handleAuthorClick}
                  onViewRevision={handleViewRevision}
                  currentPageVersion={currentPageMetadata?.version || viewingRevision.metadata.version}
                />
              )
              : (currentPageMetadata && currentPageContent ? (
                <PageMetadataPanel
                  metadata={currentPageMetadata}
                  content={currentPageContent}
                  semanticApi={semanticApi}
                  onTagClick={handleTagClick}
                  onTagAdd={handleTagAdd}
                  onTagRemove={handleTagRemove}
                  onAuthorClick={handleAuthorClick}
                  onViewRevision={handleViewRevision}
                  currentPageVersion={currentPageMetadata.version}
                />
              ) : (
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  height: 200,
                  color: 'var(--freeki-page-details-font-color)',
                  p: 2
                }}>
                  <Typography variant="body2" sx={{ textAlign: 'center', opacity: 0.6 }}>
                    {currentPageMetadata ? 'Loading page content...' : 'No page selected'}
                  </Typography>
                </Box>
              )))}
          </FadePanelContent>
          
          {currentLayout.showMetadataPanel && !isNarrowScreen && (
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

      {/* Cancel Confirmation Dialog */}
      {confirmDialog}
    </Box>
  )
}
