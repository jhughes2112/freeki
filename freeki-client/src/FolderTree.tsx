import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
  Box,
  Typography,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Menu,
  MenuItem,
  Checkbox,
  FormControlLabel
} from '@mui/material'
import {
  Clear,
  Tune,
  Folder,
  FolderOpen,
  Description,
  Add,
  CreateNewFolder
} from '@mui/icons-material'
import type { PageMetadata } from './globalState'
import type { TreeNode, DropTarget } from './pageTreeUtils'
import type { ISemanticApi } from './semanticApiInterface'
import { useUserSettings } from './useUserSettings'

// Extended DragData interface with expanded folder state
interface DragData {
  pageId: string
  isFolder: boolean
  path: string
  expandedChildFolders?: string[]
}

interface SearchConfiguration {
  titles: boolean
  tags: boolean
  author: boolean
  content: boolean
}

interface FolderTreeProps {
  pageTree: TreeNode[]
  selectedPageMetadata: PageMetadata | null
  onPageSelect: (metadata: PageMetadata) => void
  onSearch?: (query: string, searchConfig: SearchConfiguration) => Promise<void>
  searchQuery?: string
  pageMetadata: PageMetadata[]
  semanticApi: ISemanticApi | null
  onDragDrop?: (dragData: DragData, dropTarget: DropTarget) => Promise<void>
  onCreatePage?: (title: string, content: string, filepath: string, tags: string[]) => Promise<void>
}

// Helper to generate safe filename
function generateFileName(title: string, existingPaths: string[], folderPath: string): string {
  let baseFileName = title
    .replace(/[^a-zA-Z0-9\s\-_]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
  
  if (!baseFileName) baseFileName = 'untitled'
  
  let fileName = `${baseFileName}.md`
  let fullPath = folderPath ? `${folderPath}/${fileName}` : fileName
  let counter = 1
  
  while (existingPaths.includes(fullPath)) {
    fileName = `${baseFileName}-${counter}.md`
    fullPath = folderPath ? `${folderPath}/${fileName}` : fileName
    counter++
  }
  
  return fullPath
}

export default function FolderTree({ 
  pageTree, 
  selectedPageMetadata, 
  onPageSelect, 
  onSearch, 
  searchQuery: externalSearchQuery, 
  pageMetadata, 
  semanticApi, 
  onDragDrop,
  onCreatePage
}: FolderTreeProps) {
  const { settings, updateSetting } = useUserSettings(semanticApi)
  
  // Simple state - just what we need
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
    const initial = new Set<string>(settings.expandedFolderPaths || [])
    initial.add('') // Root always expanded
    return initial
  })
  
  const [searchText, setSearchText] = useState(externalSearchQuery || '')
  const [searchConfig, setSearchConfig] = useState<SearchConfiguration>(settings.searchConfig || {
    titles: true,
    tags: false,
    author: false,
    content: false
  })
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false)
  const [dragHoverFolder, setDragHoverFolder] = useState('') // Always set, never null
  const [currentDraggedPath, setCurrentDraggedPath] = useState('') // Track what's being dragged
  
  // NEW: Hover-to-expand during drag
  const [hoverExpandTimer, setHoverExpandTimer] = useState<number | null>(null)
  const [hoverExpandFolder, setHoverExpandFolder] = useState('')

  // Dialog state
  const [showNewPageDialog, setShowNewPageDialog] = useState(false)
  const [newPageTitle, setNewPageTitle] = useState('')
  const [newPageTargetFolder, setNewPageTargetFolder] = useState('')
  
  // NEW: New Folder Dialog state
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderTargetPath, setNewFolderTargetPath] = useState('')
  const [newFolderDragData, setNewFolderDragData] = useState<DragData | null>(null)

  // Search dropdown state
  const [searchMenuAnchor, setSearchMenuAnchor] = useState<null | HTMLElement>(null)
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null)
  const selectedItemRef = useRef<HTMLLIElement>(null)
  const searchTimeoutRef = useRef<number | null>(null)

  // Save expanded folders to settings
  useEffect(() => {
    updateSetting('expandedFolderPaths', Array.from(expandedFolders))
  }, [expandedFolders, updateSetting])

  // Update search text from external changes
  useEffect(() => {
    if (externalSearchQuery !== undefined) {
      setSearchText(externalSearchQuery)
    }
  }, [externalSearchQuery])

  // Enhanced page tree with root folder
  const enhancedPageTree = useMemo(() => {
    if (pageTree.length === 0) return []
    
    // Filter out placeholder files from the tree display
    const filterPlaceholders = (nodes: TreeNode[]): TreeNode[] => {
      return nodes
        .filter(node => {
          // Hide placeholder files from UI
          if (!node.isFolder && node.metadata.path.endsWith('/.folder-placeholder.md')) {
            return false
          }
          return true
        })
        .map(node => ({
          ...node,
          children: node.children ? filterPlaceholders(node.children) : []
        }))
    }
    
    const filteredTree = filterPlaceholders(pageTree)
    
    const rootFolderMetadata: PageMetadata = {
      pageId: 'folder_root',
      tags: [],
      title: '/',
      author: 'System',
      lastModified: Date.now() / 1000,
      version: 0,
      path: ''
    }
    
    const rootNode: TreeNode = {
      metadata: rootFolderMetadata,
      isFolder: true,
      children: filteredTree,
      firstFilePageId: filteredTree[0]?.metadata.pageId || '',
      lastFilePageId: filteredTree[filteredTree.length - 1]?.metadata.pageId || ''
    }
    
    return [rootNode]
  }, [pageTree])

  // Check if search is active
  const isSearchActive = searchText.trim().length > 0

  // Toggle folder expansion
  const toggleFolder = (folderPath: string) => {
    if (folderPath === '') return // Root can't be collapsed
    
    // FIXED: Prevent collapsing parent folder of currently viewed page
    if (selectedPageMetadata && selectedPageMetadata.path.startsWith(folderPath + '/')) {
      console.log(`?? Cannot collapse folder ${folderPath} - contains current page ${selectedPageMetadata.path}`)
      return
    }
    
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(folderPath)) {
        newSet.delete(folderPath)
        // Also collapse all child folders
        for (const path of prev) {
          if (path.startsWith(folderPath + '/')) {
            newSet.delete(path)
          }
        }
      } else {
        newSet.add(folderPath)
      }
      return newSet
    })
  }

  // Auto-expand to show selected page
  useEffect(() => {
    if (selectedPageMetadata) {
      const pathParts = selectedPageMetadata.path.split('/').filter(Boolean)
      setExpandedFolders(prev => {
        const newSet = new Set(prev)
        // Add all parent folder paths
        for (let i = 1; i < pathParts.length; i++) {
          const folderPath = pathParts.slice(0, i).join('/')
          newSet.add(folderPath)
        }
        return newSet
      })
    }
  }, [selectedPageMetadata?.pageId])

  // Handle search
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value
    setSearchText(newValue)
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    if (onSearch) {
      if (searchConfig.content) {
        if (newValue.trim().length === 0) {
          onSearch(newValue, searchConfig)
        } else if (newValue.trim().length >= 3) {
          searchTimeoutRef.current = setTimeout(() => {
            onSearch(newValue, searchConfig)
          }, 1000)
        }
      } else {
        onSearch(newValue, searchConfig)
      }
    }
  }

  // Handle search config changes
  const handleSearchConfigChange = (newConfig: SearchConfiguration) => {
    setSearchConfig(newConfig)
    updateSetting('searchConfig', newConfig)
    
    if (searchText.trim() && onSearch) {
      onSearch(searchText, newConfig)
    }
  }

  // Drag handlers
  const handleDragStart = () => {
    setIsDragging(true)
    setDragHoverFolder('') // Start at root
  }

  const handleDragEnd = () => {
    // FIXED: ALWAYS clear drag state completely, no matter what
    setIsDragging(false)
    setDragHoverFolder('')
    setCurrentDraggedPath('')
    
    // Clear hover-to-expand state
    if (hoverExpandTimer) {
      clearTimeout(hoverExpandTimer)
      setHoverExpandTimer(null)
    }
    setHoverExpandFolder('')
  }

  const handleDragEnter = (folderPath: string) => {
    if (isDragging) {
      setDragHoverFolder(folderPath)
    }
  }

  // Auto-expand folder when something is dropped into it
  const autoExpandTargetFolder = (targetFolderPath: string, dragData?: DragData) => {
    if (targetFolderPath !== '') {
      setExpandedFolders(prev => {
        const newSet = new Set(prev)
        newSet.add(targetFolderPath)
        // Also expand all parent folders
        const pathParts = targetFolderPath.split('/')
        for (let i = 1; i < pathParts.length; i++) {
          const parentPath = pathParts.slice(0, i).join('/')
          newSet.add(parentPath)
        }
        
        // FIXED: If we have drag data with expanded child folders, restore those too
        if (dragData?.expandedChildFolders && dragData.expandedChildFolders.length > 0) {
          for (const childPath of dragData.expandedChildFolders) {
            // Calculate the relative path from the dragged item
            const relativePath = childPath.substring(dragData.path.length + 1)
            // Build the new path in the target location
            const newChildPath = targetFolderPath ? `${targetFolderPath}/${relativePath}` : relativePath
            console.log(`?? Restoring expanded folder: ${childPath} -> ${newChildPath}`)
            newSet.add(newChildPath)
          }
        }
        
        return newSet
      })
    }
  }

  const handleDrop = async (dragData: DragData, targetFolderPath: string) => {
    if (!onDragDrop) return
    
    try {
      const dropTarget: DropTarget = {
        targetPageId: targetFolderPath === '' ? 'folder_root' : `folder_${targetFolderPath}`,
        targetPath: targetFolderPath,
        position: 'inside'
      }
      
      console.log(`?? Dropping ${dragData.path} into ${targetFolderPath}`)
      await onDragDrop(dragData, dropTarget)
      
      // FIXED: Auto-expand the target folder and restore child folder expansion state
      autoExpandTargetFolder(targetFolderPath, dragData)
      
      // If we're moving a folder, also ensure the moved folder itself is expanded in its new location
      if (dragData.isFolder) {
        const newFolderPath = targetFolderPath ? `${targetFolderPath}/${dragData.path.split('/').pop()}` : dragData.path.split('/').pop()
        if (newFolderPath) {
          setExpandedFolders(prev => {
            const newSet = new Set(prev)
            newSet.add(newFolderPath)
            console.log(`?? Auto-expanding moved folder at new location: ${newFolderPath}`)
            return newSet
          })
        }
      }
    } catch (error) {
      console.error('Failed to drop item:', error)
    } finally {
      // FIXED: ALWAYS end drag state after drop, success or failure
      setIsDragging(false)
      setDragHoverFolder('')
    }
  }

  // Handle creating new folder via drop - FIXED to use proper dialog instead of prompt
  const handleCreateFolderDrop = async (targetFolderPath: string, draggedData: DragData) => {
    if (!onCreatePage || !onDragDrop) return
    
    // Show dialog instead of janky prompt
    setNewFolderTargetPath(targetFolderPath)
    setNewFolderDragData(draggedData)
    setShowNewFolderDialog(true)
    setNewFolderName('')
  }

  // Handle new folder dialog confirmation
  const handleNewFolderConfirm = async () => {
    if (!newFolderName.trim() || !onCreatePage || !onDragDrop || !newFolderDragData) return
    
    const newFolderPath = newFolderTargetPath ? `${newFolderTargetPath}/${newFolderName.trim()}` : newFolderName.trim()
    
    try {
      // Move the dragged content into the new folder FIRST
      const dropTarget: DropTarget = {
        targetPageId: `folder_${newFolderPath}`,
        targetPath: newFolderPath,
        position: 'inside'
      }
      
      await onDragDrop(newFolderDragData, dropTarget)
      
      // Auto-expand the new folder and restore child folder expansion state
      autoExpandTargetFolder(newFolderPath, newFolderDragData)
      
      // Close dialog
      setShowNewFolderDialog(false)
      setNewFolderName('')
      setNewFolderTargetPath('')
      setNewFolderDragData(null)
    } catch (error) {
      console.error('Failed to create folder and move content:', error)
      // Don't close dialog on error so user can retry
    } finally {
      // FIXED: ALWAYS end drag state after drop, success or failure
      setIsDragging(false)
      setDragHoverFolder('')
    }
  }

  // Handle new page dialog
  const handleNewPageClick = (targetFolderPath: string) => {
    setNewPageTargetFolder(targetFolderPath)
    setShowNewPageDialog(true)
    setNewPageTitle('')
  }

  const handleNewPageConfirm = async () => {
    if (!newPageTitle.trim() || !onCreatePage) return
    
    try {
      const existingPaths = pageMetadata.map(p => p.path)
      const filePath = generateFileName(newPageTitle.trim(), existingPaths, newPageTargetFolder)
      
      await onCreatePage(
        newPageTitle.trim(),
        `# ${newPageTitle.trim()}\n\n`,
        filePath,
        []
      )
      
      // Auto-expand the target folder (no drag data for new page creation)
      autoExpandTargetFolder(newPageTargetFolder)
      
      // FIXED: Reset ALL dialog state properly AFTER successful creation
      setShowNewPageDialog(false)
      setNewPageTitle('')
      setNewPageTargetFolder('')
    } catch (error) {
      console.error('Failed to create page:', error)
      // Don't close dialog on error so user can retry
    }
  }

  // Get current page's folder for New Page button
  const getCurrentPageFolder = () => {
    if (!selectedPageMetadata) return null
    const path = selectedPageMetadata.path
    return path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : ''
  }

  // Render tree node
  const renderNode = (node: TreeNode, level: number): React.ReactNode => {
    const isExpanded = node.isFolder && (isSearchActive || expandedFolders.has(node.metadata.path))
    const isSelected = selectedPageMetadata?.pageId === node.metadata.pageId
    const hasChildren = node.children && node.children.length > 0
    const isCurrentPageFolder = node.isFolder && node.metadata.path === getCurrentPageFolder()
    
    // Drag styling
    const isDragHover = isDragging && dragHoverFolder === node.metadata.path
    const showNewFolderZone = isDragging && dragHoverFolder === node.metadata.path
    
    const itemStyles = {
      pl: 1 + level * 1.5,
      pr: 1,
      py: 0.1,
      backgroundColor: isSelected ? 'var(--freeki-folders-selected-background)' : 'transparent',
      borderRadius: 'var(--freeki-border-radius)',
      mx: 0.5,
      mb: 0.05,
      cursor: 'pointer',
      minHeight: 32,
      alignItems: 'center',
      position: 'relative',
      ...(isDragHover && {
        backgroundColor: 'rgba(var(--freeki-primary-rgb), 0.1)',
        borderLeft: '3px solid var(--freeki-primary)'
      })
    }

    return (
      <React.Fragment key={node.metadata.pageId}>
        <ListItem
          ref={isSelected ? selectedItemRef : null}
          draggable={!('ontouchstart' in window)}
          onClick={() => {
            if (node.isFolder) {
              toggleFolder(node.metadata.path)
            } else {
              onPageSelect(node.metadata)
            }
          }}
          onDragStart={(e) => {
            // FIXED: Capture expanded child folders if this is a folder being dragged
            let expandedChildFolders: string[] = []
            if (node.isFolder) {
              // Get all currently expanded folders that are children of this folder
              expandedChildFolders = Array.from(expandedFolders).filter(path => 
                path.startsWith(node.metadata.path + '/') && path !== node.metadata.path
              )
              console.log(`?? Dragging folder ${node.metadata.path} with expanded children:`, expandedChildFolders)
            }
            
            e.dataTransfer.setData('application/json', JSON.stringify({
              pageId: node.metadata.pageId,
              isFolder: node.isFolder,
              path: node.metadata.path,
              expandedChildFolders
            }));
            handleDragStart()
          }}
          onDragEnd={handleDragEnd}
          onDragEnter={(e) => {
            e.preventDefault()
            if (node.isFolder) {
              handleDragEnter(node.metadata.path)
            } else {
              // Files go to their parent folder
              const parentPath = node.metadata.path.includes('/') 
                ? node.metadata.path.substring(0, node.metadata.path.lastIndexOf('/'))
                : ''
              handleDragEnter(parentPath)
            }
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={async (e) => {
            e.preventDefault()
            e.stopPropagation()
            
            const dragDataString = e.dataTransfer.getData('application/json')
            if (!dragDataString) return
            
            const dragData = JSON.parse(dragDataString)
            
            // Determine target folder
            const targetPath = node.isFolder 
              ? node.metadata.path 
              : (node.metadata.path.includes('/') 
                ? node.metadata.path.substring(0, node.metadata.path.lastIndexOf('/'))
                : '')
            
            await handleDrop(dragData, targetPath)
          }}
          sx={itemStyles}
        >
          <ListItemIcon sx={{ minWidth: 20, mr: 0.75 }}>
            {node.isFolder ? (
              isExpanded ? <FolderOpen fontSize="small" /> : <Folder fontSize="small" />
            ) : (
              <Description fontSize="small" />
            )}
          </ListItemIcon>
          
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: isSelected ? 600 : 400,
                fontSize: 'var(--freeki-folders-font-size)',
                color: 'var(--freeki-folders-font-color)'
              }}
            >
              {node.metadata.title}
            </Typography>
          </Box>

          {/* New Page button for current page's folder */}
          {isCurrentPageFolder && !isDragging && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation()
                handleNewPageClick(node.metadata.path)
              }}
              sx={{
                p: 0.25,
                color: 'var(--freeki-primary)',
                '&:hover': { backgroundColor: 'var(--freeki-primary)', color: 'white' }
              }}
            >
              <Add fontSize="small" />
            </IconButton>
          )}

          {/* New Folder drop zone during drag - FIXED to pass drag data */}
          {showNewFolderZone && (
            <Box
              sx={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                padding: '4px 8px',
                backgroundColor: 'var(--freeki-primary)',
                color: 'white',
                borderRadius: '4px',
                fontSize: '12px',
                zIndex: 10,
                cursor: 'pointer'
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onDrop={async (e) => {
                e.preventDefault()
                e.stopPropagation()
                
                // Get the dragged data
                const dragDataString = e.dataTransfer.getData('application/json')
                if (!dragDataString) return
                
                const dragData = JSON.parse(dragDataString)
                await handleCreateFolderDrop(node.metadata.path, dragData)
              }}
            >
              <CreateNewFolder fontSize="small" />
            </Box>
          )}
        </ListItem>
        
        {/* Children */}
        {node.isFolder && hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {node.children?.map((child) => renderNode(child, level + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    )
  }

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex',
      flexDirection: 'column',
      color: 'var(--freeki-folders-font-color)',
      backgroundColor: 'var(--freeki-folders-background)'
    }}>
      {/* Search bar */}
      <Box sx={{ p: 2, pb: 1 }}>
        <TextField
          variant="outlined"
          size="small"
          placeholder="Search..."
          value={searchText}
          onChange={handleSearchChange}
          fullWidth
          InputProps={{
            endAdornment: (
              <>
                {searchText && (
                  <IconButton size="small" onClick={() => setSearchText('')}>
                    <Clear fontSize="small" />
                  </IconButton>
                )}
                <IconButton 
                  size="small" 
                  onClick={(e) => setSearchMenuAnchor(e.currentTarget)}
                >
                  <Tune fontSize="small" />
                </IconButton>
              </>
            )
          }}
        />
      </Box>
      
      {/* Tree content */}
      <Box ref={containerRef} sx={{ flex: 1, overflow: 'auto' }}>
        {enhancedPageTree.length === 0 ? (
          <Typography variant="body2" sx={{ p: 3, textAlign: 'center', opacity: 0.6 }}>
            No pages found
          </Typography>
        ) : (
          <List dense disablePadding>
            {enhancedPageTree.map((node) => renderNode(node, 0))}
          </List>
        )}
      </Box>

      {/* Search config menu */}
      <Menu
        anchorEl={searchMenuAnchor}
        open={Boolean(searchMenuAnchor)}
        onClose={() => setSearchMenuAnchor(null)}
      >
        <MenuItem>
          <FormControlLabel
            control={
              <Checkbox
                checked={searchConfig.titles}
                onChange={(e) => handleSearchConfigChange({ ...searchConfig, titles: e.target.checked })}
              />
            }
            label="Titles"
          />
        </MenuItem>
        <MenuItem>
          <FormControlLabel
            control={
              <Checkbox
                checked={searchConfig.tags}
                onChange={(e) => handleSearchConfigChange({ ...searchConfig, tags: e.target.checked })}
              />
            }
            label="Tags"
          />
        </MenuItem>
        <MenuItem>
          <FormControlLabel
            control={
              <Checkbox
                checked={searchConfig.author}
                onChange={(e) => handleSearchConfigChange({ ...searchConfig, author: e.target.checked })}
              />
            }
            label="Author"
          />
        </MenuItem>
        <MenuItem>
          <FormControlLabel
            control={
              <Checkbox
                checked={searchConfig.content}
                onChange={(e) => handleSearchConfigChange({ ...searchConfig, content: e.target.checked })}
              />
            }
            label="Content"
          />
        </MenuItem>
      </Menu>

      {/* New Page Dialog */}
      <Dialog 
        open={showNewPageDialog} 
        onClose={() => {
          setShowNewPageDialog(false)
          setNewPageTitle('')
          setNewPageTargetFolder('')
        }}
        disableRestoreFocus
      >
        <DialogTitle>Create New Page</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Page Title"
            fullWidth
            variant="outlined"
            value={newPageTitle}
            onChange={(e) => setNewPageTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newPageTitle.trim()) {
                handleNewPageConfirm()
              }
            }}
            slotProps={{
              input: {
                ref: (input: HTMLInputElement) => {
                  if (input && showNewPageDialog) {
                    // Force focus after a brief delay to ensure dialog is fully rendered
                    setTimeout(() => {
                      input.focus()
                      input.select()
                    }, 100)
                  }
                }
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setShowNewPageDialog(false)
            setNewPageTitle('')
            setNewPageTargetFolder('')
          }}>Cancel</Button>
          <Button onClick={handleNewPageConfirm} disabled={!newPageTitle.trim()} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Folder Dialog */}
      <Dialog 
        open={showNewFolderDialog} 
        onClose={() => {
          setShowNewFolderDialog(false)
          setNewFolderName('')
          setNewFolderTargetPath('')
          setNewFolderDragData(null)
          // Also clear drag state when canceling
          setIsDragging(false)
          setDragHoverFolder('')
        }}
        disableRestoreFocus
      >
        <DialogTitle>Create New Folder</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Folder Name"
            fullWidth
            variant="outlined"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newFolderName.trim()) {
                handleNewFolderConfirm()
              }
            }}
            slotProps={{
              input: {
                ref: (input: HTMLInputElement) => {
                  if (input && showNewFolderDialog) {
                    setTimeout(() => {
                      input.focus()
                      input.select()
                    }, 100)
                  }
                }
              }
            }}
          />
          {newFolderTargetPath && (
            <Typography variant="caption" sx={{ mt: 1, display: 'block', opacity: 0.7 }}>
              Creating in: {newFolderTargetPath || 'Root'}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setShowNewFolderDialog(false)
            setNewFolderName('')
            setNewFolderTargetPath('')
            setNewFolderDragData(null)
            setIsDragging(false)
            setDragHoverFolder('')
          }}>Cancel</Button>
          <Button onClick={handleNewFolderConfirm} disabled={!newFolderName.trim()} variant="contained">
            Create Folder
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}