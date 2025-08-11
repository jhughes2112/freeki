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
  FormControlLabel,
  Tooltip
} from '@mui/material'
import {
  Clear,
  Folder,
  FolderOpen,
  Description,
  Add,
  CreateNewFolder
} from '@mui/icons-material'
import type { PageMetadata } from './globalState'
import type { TreeNode, DropTarget } from './pageTreeUtils'
import { useGlobalState, globalState } from './globalState'
import SearchPipButton from './SearchPipButton'

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
  
  while (existingPaths.indexOf(fullPath) !== -1) {
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
  onDragDrop,
  onCreatePage
}: FolderTreeProps) {
  // Use global state for user settings and folder expansion
  const userSettings = useGlobalState('userSettings')
  const expandedFolderPaths = userSettings.expandedFolderPaths
  
  const expandedFolders = useMemo(() => {
    const set = new Set(expandedFolderPaths)
    set.add('') // Root always expanded
    return set
  }, [expandedFolderPaths])
  
  const [searchText, setSearchText] = useState(externalSearchQuery || '')
  const [searchConfig, setSearchConfig] = useState<SearchConfiguration>(userSettings.searchConfig || {
    titles: true,
    tags: false,
    author: false,
    content: false
  })
  
  // Dialog state
  const [showNewPageDialog, setShowNewPageDialog] = useState(false)
  const [newPageTitle, setNewPageTitle] = useState('')
  const [newPageTargetFolder, setNewPageTargetFolder] = useState('')

  // New Folder Dialog state
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderTargetPath, setNewFolderTargetPath] = useState('')
  const [newFolderDragData, setNewFolderDragData] = useState<DragData | null>(null)

  // Search dropdown state
  const [searchMenuAnchor, setSearchMenuAnchor] = useState<null | HTMLElement>(null)

  // Drag state
  const [isDragging, setIsDragging] = useState(false)
  const [dragHoverFolder, setDragHoverFolder] = useState('')
  const [currentDraggedPath, setCurrentDraggedPath] = useState('')
  const [newFolderButtonHover, setNewFolderButtonHover] = useState(false) // Track drag hover state for button

  // Hover-to-expand during drag
  const [hoverExpandTimer, setHoverExpandTimer] = useState<number | null>(null)
  const [hoverExpandFolder, setHoverExpandFolder] = useState('')

  // Refs
  const containerRef = useRef<HTMLDivElement>(null)
  const selectedItemRef = useRef<HTMLLIElement>(null)
  const searchTimeoutRef = useRef<number | null>(null)
  const buttonOverlayRef = useRef<HTMLDivElement>(null)

  // Update search text from external changes
  useEffect(() => {
    if (externalSearchQuery !== undefined) {
      setSearchText(externalSearchQuery)
    }
  }, [externalSearchQuery])

  // Position floating buttons at the right edge of the target row
  const positionFloatingButtons = (targetRowElement: HTMLElement | null) => {
    if (!buttonOverlayRef.current) return
    
    const overlay = buttonOverlayRef.current
    
    if (!targetRowElement) {
      // Hide buttons when no target
      overlay.style.display = 'none'
      return
    }
    
    // Show and position the overlay at the target row
    overlay.style.display = 'block'
    const rowRect = targetRowElement.getBoundingClientRect()
    const containerRect = containerRef.current?.getBoundingClientRect()
    
    if (containerRect) {
      // Position relative to container
      const topOffset = rowRect.top - containerRect.top
      overlay.style.top = `${topOffset}px`
      overlay.style.height = `${rowRect.height}px`
    }
  }

  // Update button positioning when relevant elements change
  useEffect(() => {
    // Find the target row for buttons (current page folder or drag hover folder)
    let targetElement: HTMLElement | null = null
    
    if (isDragging && dragHoverFolder !== undefined && dragHoverFolder !== '__NONE__') {
      // During drag - position at hover folder (including root, but not sentinel value)
      const hoverElements = containerRef.current?.querySelectorAll('.MuiListItem-root')
      if (hoverElements) {
        for (const element of hoverElements) {
          const pathData = element.getAttribute('data-folder-path')
          if (pathData === dragHoverFolder) {
            targetElement = element as HTMLElement
            break
          }
        }
      }
    } else if (!isDragging) {
      // Normal mode - position at current page folder
      const currentFolder = getCurrentPageFolder()
      if (currentFolder !== null) {
        const folderElements = containerRef.current?.querySelectorAll('.MuiListItem-root')
        if (folderElements) {
          for (const element of folderElements) {
            const pathData = element.getAttribute('data-folder-path')
            if (pathData === currentFolder) {
              targetElement = element as HTMLElement
              break
            }
          }
        }
      }
    }
    
    positionFloatingButtons(targetElement)
  }, [isDragging, dragHoverFolder, selectedPageMetadata, pageTree, expandedFolderPaths])

  // Smart text positioning on row hover - simple logic: check if ALL content fits, otherwise show icon at left
  const handleRowHover = (listItem: HTMLElement, textContent: string) => {
    if (!containerRef.current) return
    
    const container = containerRef.current
    
    // Check if this is a folder or file for debugging
    const isFolder = listItem.querySelector('.MuiSvgIcon-root[data-testid="FolderIcon"]') || listItem.querySelector('.MuiSvgIcon-root[data-testid="FolderOpenIcon"]')
    const itemType = isFolder ? 'FOLDER' : 'FILE'
    
    console.log(`${itemType} ROW_HOVER: "${textContent}"`)
    
    // Check if ANY visible rows are too wide for the container
    const allListItems = container.querySelectorAll('.MuiListItem-root')
    const containerRect = container.getBoundingClientRect()
    const actualVisibleWidth = containerRect.width - 200 // Subtract the extra 200px
    
    let anyRowTooWide = false
    
    for (const item of allListItems) {
      const itemElement = item as HTMLElement
      const itemStyle = window.getComputedStyle(itemElement)
      if (itemStyle.display === 'none') continue // Skip hidden items
          
      const textEl = itemElement.querySelector('.folder-tree-text') as HTMLElement
      const iconEl = itemElement.querySelector('.MuiListItemIcon-root') as HTMLElement
          
      if (!textEl || !iconEl) continue
          
      // Create measurement element for this item's text
      const measurer = document.createElement('span')
      measurer.style.position = 'absolute'
      measurer.style.visibility = 'hidden'
      measurer.style.whiteSpace = 'nowrap'
      const textStyle = window.getComputedStyle(textEl)
      measurer.style.fontSize = textStyle.fontSize
      measurer.style.fontFamily = textStyle.fontFamily
      measurer.style.fontWeight = textStyle.fontWeight
      measurer.textContent = textEl.textContent || ''
      document.body.appendChild(measurer)
          
      const textWidth = measurer.getBoundingClientRect().width
      document.body.removeChild(measurer)
          
      const iconWidth = iconEl.getBoundingClientRect().width + 6
      const paddingLeft = parseFloat(window.getComputedStyle(itemElement).paddingLeft) || 0
      const totalContentWidth = paddingLeft + iconWidth + textWidth
          
      if (totalContentWidth > actualVisibleWidth) {
        anyRowTooWide = true
        console.log(`${itemType}: Found wide row: ${textEl.textContent} (${totalContentWidth}px > ${actualVisibleWidth}px)`)
        break
      }
    }
    
    if (anyRowTooWide) {
      // At least one row is too wide - scroll to show icons at left edge
      const iconElement = listItem.querySelector('.MuiListItemIcon-root') as HTMLElement
      if (iconElement) {
        const paddingLeft = parseFloat(window.getComputedStyle(listItem).paddingLeft) || 0
        console.log(`${itemType}: Some content too wide, scrolling to show icons at left edge (${paddingLeft}px)`)
        container.scrollLeft = paddingLeft
      }
    } else {
      // All content fits - reset to natural position
      console.log(`${itemType}: All content fits, resetting to scroll=0`)
      container.scrollLeft = 0
    }
  }

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

  // Reset scroll position when tree becomes empty (search fails, etc.)
  useEffect(() => {
    if (enhancedPageTree.length === 0 && containerRef.current) {
      containerRef.current.scrollLeft = 0
    }
  }, [enhancedPageTree.length])

  // Toggle folder expansion - update global state directly
  const toggleFolder = (folderPath: string) => {
    if (folderPath === '') return // Root can't be collapsed
    
    // Prevent collapsing parent folder of currently viewed page
    if (selectedPageMetadata && selectedPageMetadata.path.startsWith(folderPath + '/')) {
      console.log(`Cannot collapse folder ${folderPath} - contains current page ${selectedPageMetadata.path}`)
      return
    }
    
    const currentPaths = expandedFolderPaths.slice()
    const pathIndex = currentPaths.indexOf(folderPath)
    
    if (pathIndex >= 0) {
      // Collapse this folder and all child folders
      const filteredPaths = currentPaths.filter(path => 
        path !== folderPath && !path.startsWith(folderPath + '/')
      )
      globalState.setProperty('userSettings.expandedFolderPaths', filteredPaths)
    } else {
      // Expand this folder
      currentPaths.push(folderPath)
      globalState.setProperty('userSettings.expandedFolderPaths', currentPaths)
    }
  }

  // Auto-expand to show selected page
  useEffect(() => {
    if (selectedPageMetadata) {
      const pathParts = selectedPageMetadata.path.split('/').filter(Boolean)
      const neededPaths: string[] = []
      
      // Add all parent folder paths
      for (let i = 1; i < pathParts.length; i++) {
        const folderPath = pathParts.slice(0, i).join('/')
        neededPaths.push(folderPath)
      }
      
      // Only update if we need to add paths
      if (neededPaths.length > 0) {
        const currentPaths = expandedFolderPaths.slice()
        let needsUpdate = false
        
        for (const path of neededPaths) {
          if (currentPaths.indexOf(path) === -1) {
            currentPaths.push(path)
            needsUpdate = true
          }
        }
        
        if (needsUpdate) {
          globalState.setProperty('userSettings.expandedFolderPaths', currentPaths)
        }
      }
    }
  }, [selectedPageMetadata?.pageId, expandedFolderPaths])

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
    globalState.setProperty('userSettings.searchConfig', newConfig)
    
    if (searchText.trim() && onSearch) {
      onSearch(searchText, newConfig)
    }
  }

  // Drag handlers
  const handleDragStart = (draggedPath: string) => {
    setIsDragging(true)
    setCurrentDraggedPath(draggedPath)
    setDragHoverFolder('__NONE__') // Use sentinel value instead of empty string to prevent initial button showing
  }

  const handleDragEnd = () => {
    setIsDragging(false)
    setDragHoverFolder('__NONE__')
    setCurrentDraggedPath('')
    setNewFolderButtonHover(false) // Reset button hover state
    
    // Clear hover-to-expand timer
    if (hoverExpandTimer) {
      clearTimeout(hoverExpandTimer)
      setHoverExpandTimer(null)
    }
    setHoverExpandFolder('')
  }

  // Validate that a drop operation is legal - prevent parent folders from being dropped into their own children
  const isValidDropTarget = (dragPath: string, targetPath: string): boolean => {
    // Files can be dropped anywhere
    if (!dragPath) return true
    
    // Can't drop into yourself
    if (dragPath === targetPath) return false
    
    // Can't drop a parent folder into any of its children or descendants
    if (targetPath.startsWith(dragPath + '/')) {
      console.log(`Illegal drop: Cannot move parent folder '${dragPath}' into its child '${targetPath}'`)
      return false
    }
    
    return true
  }

  // Enhanced drag enter with validation - also trigger row hover for scroll synchronization
  const handleDragEnter = (folderPath: string) => {
    if (isDragging) {
      // Only allow valid drop targets
      if (!isValidDropTarget(currentDraggedPath, folderPath)) {
        return // Don't set hover or expand for invalid targets
      }
      
      setDragHoverFolder(folderPath)
      
      // Find the target element and trigger row hover to sync scrolling
      const container = containerRef.current
      if (container) {
        const folderElements = container.querySelectorAll('.MuiListItem-root')
        for (const element of folderElements) {
          const pathData = element.getAttribute('data-folder-path')
          if (pathData === folderPath) {
            const listItem = element as HTMLElement
            const textEl = listItem.querySelector('.folder-tree-text') as HTMLElement
            
            // Trigger the same scrolling logic as row hover
            if (textEl) {
              handleRowHover(listItem, textEl.textContent || '')
            }
            break
          }
        }
      }
      
      // Auto-expand collapsed folders on hover during drag
      if (folderPath !== hoverExpandFolder) {
        // Clear previous timer
        if (hoverExpandTimer) {
          clearTimeout(hoverExpandTimer)
        }
        
        setHoverExpandFolder(folderPath)
        
        // Set new timer for this folder (1 second hover)
        if (!expandedFolders.has(folderPath) && folderPath !== '') {
          const timerId = setTimeout(() => {
            console.log(`Auto-expanding folder ${folderPath} after hover`)
            const currentPaths = expandedFolderPaths.slice()
            if (currentPaths.indexOf(folderPath) === -1) {
              currentPaths.push(folderPath)
              globalState.setProperty('userSettings.expandedFolderPaths', currentPaths)
            }
          }, 1000)
          
          setHoverExpandTimer(timerId)
        }
      }
    }
  }

  // Auto-expand folder when something is dropped into it
  const autoExpandTargetFolder = (targetFolderPath: string, dragData?: DragData) => {
    if (targetFolderPath !== '') {
      const currentPaths = expandedFolderPaths.slice()
      const pathsToAdd: string[] = []
      
      // Add target folder
      if (currentPaths.indexOf(targetFolderPath) === -1) {
        pathsToAdd.push(targetFolderPath)
      }
      
      // Add all parent folders
      const pathParts = targetFolderPath.split('/')
      for (let i = 1; i < pathParts.length; i++) {
        const parentPath = pathParts.slice(0, i).join('/')
        if (currentPaths.indexOf(parentPath) === -1) {
          pathsToAdd.push(parentPath)
        }
      }
      
      // Restore expanded child folders if available
      if (dragData?.expandedChildFolders && dragData.expandedChildFolders.length > 0) {
        for (const childPath of dragData.expandedChildFolders) {
          // Calculate the relative path from the dragged item
          const relativePath = childPath.substring(dragData.path.length + 1)
          // Build the new path in the target location
          const newChildPath = targetFolderPath ? `${targetFolderPath}/${relativePath}` : relativePath
          if (currentPaths.indexOf(newChildPath) === -1) {
            pathsToAdd.push(newChildPath)
          }
        }
      }
      
      if (pathsToAdd.length > 0) {
        globalState.setProperty('userSettings.expandedFolderPaths', currentPaths.concat(pathsToAdd))
      }
    }
  }

  // Enhanced drop handler with validation
  const handleDrop = async (dragData: DragData, targetFolderPath: string) => {
    if (!onDragDrop) return
    
    // Validate the drop operation
    if (!isValidDropTarget(dragData.path, targetFolderPath)) {
      console.log(`Drop rejected: Invalid target for '${dragData.path}' -> '${targetFolderPath}'`)
      return
    }
    
    try {
      const dropTarget: DropTarget = {
        targetPageId: targetFolderPath === '' ? 'folder_root' : `folder_${targetFolderPath}`,
        targetPath: targetFolderPath,
        position: 'inside'
      }
      
      console.log(`Dropping ${dragData.path} into ${targetFolderPath}`)
      await onDragDrop(dragData, dropTarget)
      
      // Auto-expand the target folder and restore child folder expansion state
      autoExpandTargetFolder(targetFolderPath, dragData)
      
      // If we're moving a folder, also ensure the moved folder itself is expanded in its new location
      if (dragData.isFolder) {
        const newFolderPath = targetFolderPath ? `${targetFolderPath}/${dragData.path.split('/').pop()}` : dragData.path.split('/').pop()
        if (newFolderPath) {
          const currentPaths = expandedFolderPaths.slice()
          if (currentPaths.indexOf(newFolderPath) === -1) {
            currentPaths.push(newFolderPath)
            globalState.setProperty('userSettings.expandedFolderPaths', currentPaths)
            console.log(`Auto-expanding moved folder at new location: ${newFolderPath}`)
          }
        }
      }
    } catch (error) {
      console.error('Failed to drop item:', error)
    } finally {
      setIsDragging(false)
      setDragHoverFolder('__NONE__')
    }
  }

  // Enhanced drop handler with validation and user feedback
  const handleCreateFolderDrop = async (targetFolderPath: string, draggedData: DragData) => {
    if (!onCreatePage || !onDragDrop) return
    
    // Validate the drop operation first
    if (!isValidDropTarget(draggedData.path, targetFolderPath)) {
      console.log(`Folder creation rejected: Invalid target for '${draggedData.path}' -> '${targetFolderPath}'`)
      return
    }
    
    setNewFolderTargetPath(targetFolderPath)
    setNewFolderDragData(draggedData)
    setShowNewFolderDialog(true)
    setNewFolderName('')
  }

  // Handle new folder dialog confirmation
  const handleNewFolderConfirm = async () => {
    if (!newFolderName.trim() || !onCreatePage || !onDragDrop || !newFolderDragData) return
    
    const newFolderPath = newFolderTargetPath ? `${newFolderTargetPath}/${newFolderName.trim()}` : newFolderName.trim()
    
    // Final validation before creating folder
    if (!isValidDropTarget(newFolderDragData.path, newFolderPath)) {
      console.log(`Folder creation rejected: Invalid target for '${newFolderDragData.path}' -> '${newFolderPath}'`)
      return
    }
    
    try {
      // Move the dragged content into the new folder FIRST
      const dropTarget: DropTarget = {
        targetPageId: `folder_${newFolderPath}`,
        targetPath: newFolderPath,
        position: 'inside'
      }
      
      console.log(`Creating folder '${newFolderPath}' and moving '${newFolderDragData.path}' into it`)
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
    } finally {
      setIsDragging(false)
      setDragHoverFolder('__NONE__')

      setCurrentDraggedPath('')
      
      // Clear hover timer
      if (hoverExpandTimer) {
        clearTimeout(hoverExpandTimer)
        setHoverExpandTimer(null)
      }
      setHoverExpandFolder('')
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
      
      // Auto-expand the target folder
      autoExpandTargetFolder(newPageTargetFolder)
      
      setShowNewPageDialog(false)
      setNewPageTitle('')
      setNewPageTargetFolder('')
    } catch (error) {
      console.error('Failed to create page:', error)
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
    
    const isBeingDragged = isDragging && currentDraggedPath === node.metadata.path
    const isDraggedIntoItself = isDragging && currentDraggedPath === node.metadata.path
    
    // Check if this is a valid drop target
    const isValidTarget = !isDragging || isValidDropTarget(currentDraggedPath, node.metadata.path)
    
    // Drag styling - only show hover effects for valid targets
    const isDragHover = isDragging && dragHoverFolder === node.metadata.path && !isDraggedIntoItself && isValidTarget

    const itemStyles = {
      pl: 1 + level * 1.5,
      pr: 0, // Remove right padding to extend to edge
      py: 0.1,
      backgroundColor: isSelected ? 'var(--freeki-folders-selected-background)' : 'transparent',
      borderRadius: 'var(--freeki-border-radius)',
      mx: 0, // Remove margins that create gutters
      mb: 0.05,
      cursor: 'pointer',
      minHeight: 32,
      alignItems: 'center',
      position: 'relative',
      whiteSpace: 'nowrap',
      overflow: 'visible',
      // Force full width and ensure hoverable area extends to container edge
      width: '100%',
      maxWidth: '100%',
      display: 'flex',
      boxSizing: 'border-box',
      // Add smooth transitions for all interactive states
      transition: 'background-color 0.15s ease, opacity 0.15s ease, filter 0.15s ease',
      // Apply selection class for CSS hover rules
      ...(isSelected && {
        '&.Mui-selected': {
          backgroundColor: 'var(--freeki-folders-selected-background)'
        }
      }),
      ...(isDragHover && {
        backgroundColor: 'rgba(var(--freeki-primary-rgb), 0.1)',
        borderLeft: '3px solid var(--freeki-primary)'
      }),
      ...(isBeingDragged && {
        opacity: 0.5
      }),
      // Show visual feedback for invalid drop targets
      ...(isDragging && !isValidTarget && {
        opacity: 0.3,
        cursor: 'not-allowed'
      }),
      ...(isDragging && !isExpanded && hoverExpandFolder === node.metadata.path && node.isFolder && {
        backgroundColor: 'rgba(var(--freeki-secondary-rgb, 255, 165, 0), 0.1)',
        borderLeft: '2px dashed orange'
      })
    }

    return (
      <React.Fragment key={node.metadata.pageId}>
        <ListItem
          ref={isSelected ? selectedItemRef : null}
          className={isSelected ? 'Mui-selected' : ''}
          draggable={!('ontouchstart' in window)}
          data-folder-path={node.metadata.path}
          onClick={() => {
            if (node.isFolder) {
              toggleFolder(node.metadata.path)
            } else {
              onPageSelect(node.metadata)
            }
          }}
          onMouseEnter={(e) => handleRowHover(e.currentTarget, node.metadata.title)}
          onDragStart={(e) => {
            let expandedChildFolders: string[] = []
            if (node.isFolder) {
              expandedChildFolders = expandedFolderPaths.filter(path => 
                path.startsWith(node.metadata.path + '/') && path !== node.metadata.path
              )
              console.log(`Dragging folder ${node.metadata.path} with expanded children:`, expandedChildFolders)
            }
            
            e.dataTransfer.setData('application/json', JSON.stringify({
              pageId: node.metadata.pageId,
              isFolder: node.isFolder,
              path: node.metadata.path,
              expandedChildFolders
            }));
            handleDragStart(node.metadata.path)
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
          onDragOver={(e) => {
            // Only allow drop if it's a valid target
            if (isValidTarget) {
              e.preventDefault()
            }
          }}
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
          <ListItemIcon sx={{ minWidth: 20, mr: 0.75, color: 'var(--freeki-folders-font-color)' }}>
            {node.isFolder ? (
              isExpanded ? <FolderOpen fontSize="small" /> : <Folder fontSize="small" />
            ) : (
              <Description fontSize="small" />
            )}
          </ListItemIcon>
          
          <Box sx={{ flex: 1, minWidth: 0, overflow: 'visible', width: '100%' }}>
            <Typography
              className="folder-tree-text"
              variant="body2"
              sx={{
                fontWeight: isSelected ? 600 : 400,
                fontSize: 'var(--freeki-folders-font-size)',
                color: 'var(--freeki-folders-font-color)',
                whiteSpace: 'nowrap',
                overflow: 'visible',
                minWidth: 0,
                width: '100%'
              }}
            >
              {node.metadata.title}
            </Typography>
          </Box>
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
      backgroundColor: 'var(--freeki-folders-background)',
      padding: 0,
      margin: 0
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
                <SearchPipButton 
                  searchConfig={searchConfig}
                  onClick={(e) => setSearchMenuAnchor(e.currentTarget)}
                />
              </>
            )
          }}
        />
      </Box>
      
      {/* Tree content with floating button overlay */}
      <Box sx={{ position: 'relative', flex: 1 }}>
        {/* Invisible floating button overlay - tracks Y position, ignores X scroll */}
        <Box 
          ref={buttonOverlayRef}
          sx={{
            position: 'absolute',
            top: 0,
            right: 8, // Always 8px from right edge of visible area
            width: 'auto',
            height: 32,
            display: 'none', // Hidden by default
            zIndex: 20,
            pointerEvents: 'none', // Container blocks events...
            gap: 1,
            alignItems: 'center',
            justifyContent: 'flex-end',
            flexDirection: 'row',
            // But child buttons override this
            '& > *': {
              pointerEvents: 'auto'
            }
          }}
        >
          {/* New Page button for current page's folder */}
          {!isDragging && (
            <Tooltip title="New Page" placement="left" arrow>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation()
                  const currentFolder = getCurrentPageFolder()
                  if (currentFolder !== null) {
                    handleNewPageClick(currentFolder)
                  }
                }}
                sx={{
                  p: 0.25,
                  color: 'var(--freeki-primary)',
                  backgroundColor: 'white',
                  border: '1px solid var(--freeki-primary)',
                  pointerEvents: 'auto',
                  '&:hover': { backgroundColor: 'var(--freeki-primary)', color: 'white' }
                }}
              >
                <Add fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {/* New Folder drop zone during drag */}
          {isDragging && dragHoverFolder !== undefined && dragHoverFolder !== '__NONE__' && (
            <Tooltip title="New Folder" placement="left" arrow>
              <IconButton
                size="small"
                onClick={async (e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  
                  // Simulate a drop event
                  const dragData = {
                    pageId: currentDraggedPath,
                    isFolder: true,
                    path: currentDraggedPath
                  }
                  await handleCreateFolderDrop(dragHoverFolder, dragData)
                }}
                onDragEnter={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setNewFolderButtonHover(true)
                  console.log('NEW FOLDER BUTTON: Drag enter detected')
                }}
                onDragLeave={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setNewFolderButtonHover(false)
                  console.log('NEW FOLDER BUTTON: Drag leave detected')
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setNewFolderButtonHover(true)
                  console.log('NEW FOLDER BUTTON: Drag over detected')
                }}
                onDrop={async (e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setNewFolderButtonHover(false)
                  
                  const dragDataString = e.dataTransfer.getData('application/json')
                  if (!dragDataString) return
                  
                  const dragData = JSON.parse(dragDataString)
                  await handleCreateFolderDrop(dragHoverFolder, dragData)
                }}
                sx={{
                  p: 0.25,
                  color: newFolderButtonHover ? 'white' : 'var(--freeki-primary)',
                  backgroundColor: newFolderButtonHover ? 'var(--freeki-primary)' : 'white',
                  border: '1px solid var(--freeki-primary)',
                  pointerEvents: 'auto',
                  transition: 'all 0.15s ease',
                  '&:hover': { 
                    backgroundColor: 'var(--freeki-primary)', 
                    color: 'white'
                  }
                }}
              >
                <CreateNewFolder fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Tree container - scrolls horizontally */}
        <Box 
          ref={containerRef} 
          sx={{ 
            flex: 1, 
            overflow: 'hidden', // Enable horizontal scrolling
            scrollbarWidth: 'none', // Firefox
            msOverflowStyle: 'none', // IE/Edge
            '&::-webkit-scrollbar': { // Chrome/Safari/WebKit
              display: 'none'
            },
            // Remove any padding that creates gutters
            padding: 0,
            margin: 0,
            // Make container wider than parent to prevent gaps when translating
            width: 'calc(100% + 200px)', // Extra 200px to cover translation gaps
            minWidth: 'calc(100% + 200px)',
            boxSizing: 'border-box'
          }}
        >
          {enhancedPageTree.length === 0 ? (
            <Box 
              sx={{ 
                width: '100%',
                maxWidth: '300px', // Limit message container to reasonable width
                padding: 3,
                display: 'flex',
                alignItems: 'flex-start', // Top align instead of center
                justifyContent: 'flex-start' // Left align instead of center
              }}
              onLoad={() => {
                // Reset horizontal scroll when showing error message
                if (containerRef.current) {
                  containerRef.current.scrollLeft = 0
                }
              }}
            >
              <Typography 
                variant="body2" 
                sx={{ 
                  opacity: 0.6,
                  textAlign: 'left' // Left justified text
                }}
              >
                No pages found
              </Typography>
            </Box>
          ) :
          (
            <List dense disablePadding sx={{ width: 'calc(100% + 200px)', minWidth: 'calc(100% + 200px)' }}>
              {enhancedPageTree.map((node) => renderNode(node, 0))}
            </List>
          )}
        </Box>
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
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 'var(--freeki-border-radius)',
            boxShadow: '0 8px 32px var(--freeki-shadow-color)',
            backdropFilter: 'blur(8px)',
            backgroundColor: 'var(--freeki-view-background)',
            border: '1px solid var(--freeki-border-color)'
          }
        }}
        BackdropProps={{
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)'
          }
        }}
      >
        <DialogTitle sx={{ 
          color: 'var(--freeki-h2-font-color)',
          fontSize: 'var(--freeki-h2-font-size)',
          fontWeight: 600,
          pb: 1
        }}>
          Create New Page
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            mb: 2,
            p: 2,
            backgroundColor: 'var(--freeki-style-box-bg)',
            borderRadius: 'var(--freeki-border-radius)',
            border: '1px solid var(--freeki-input-border)'
          }}>
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'var(--freeki-style-row-font-color)',
                fontFamily: 'monospace',
                fontSize: '0.9rem',
                fontWeight: 500,
                whiteSpace: 'nowrap'
              }}
            >
              /{newPageTargetFolder ? `${newPageTargetFolder}/` : '' }
            </Typography>
            <TextField
              autoFocus
              fullWidth
              variant="outlined"
              size="small"
              placeholder="page-title"
              value={newPageTitle}
              onChange={(e) => setNewPageTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newPageTitle.trim()) {
                  handleNewPageConfirm()
                }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 'var(--freeki-border-radius)',
                  backgroundColor: 'var(--freeki-view-background)',
                  borderColor: 'var(--freeki-input-border)',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem'
                }
              }}
              slotProps={{
                input: {
                  ref: (input: HTMLInputElement) => {
                    if (input && showNewPageDialog) {
                      setTimeout(() => {
                        input.focus()
                        if (input.select && typeof input.select === 'function') {
                          input.select()
                        }
                      }, 100)
                    }
                  }
                }
              }}
            />
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'var(--freeki-style-row-font-color)',
                fontFamily: 'monospace',
                fontSize: '0.9rem',
                fontWeight: 500,
                whiteSpace: 'nowrap'
              }}
            >
              .md
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            onClick={() => {
              setShowNewPageDialog(false)
              setNewPageTitle('')
              setNewPageTargetFolder('')
            }}
            sx={{ 
              borderRadius: 'var(--freeki-border-radius)',
              color: 'var(--freeki-style-row-font-color)' 
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleNewPageConfirm} 
            disabled={!newPageTitle.trim()} 
            variant="contained"
            sx={{ 
              borderRadius: 'var(--freeki-border-radius)',
              backgroundColor: 'var(--freeki-primary)',
              '&:hover': { 
                backgroundColor: 'var(--freeki-primary)',
                filter: 'brightness(90%)'
              }
            }}
          >
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
          setIsDragging(false)
          setDragHoverFolder('__NONE__')
          setCurrentDraggedPath('')
        }}
        disableRestoreFocus
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 'var(--freeki-border-radius)',
            boxShadow: '0 8px 32px var(--freeki-shadow-color)',
            backdropFilter: 'blur(8px)',
            backgroundColor: 'var(--freeki-view-background)',
            border: '1px solid var(--freeki-border-color)'
          }
        }}
        BackdropProps={{
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)'
          }
        }}
      >
        <DialogTitle sx={{ 
          color: 'var(--freeki-h2-font-color)',
          fontSize: 'var(--freeki-h2-font-size)',
          fontWeight: 600,
          pb: 1
        }}>
          Create New Folder
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            mb: 2,
            p: 2,
            backgroundColor: 'var(--freeki-style-box-bg)',
            borderRadius: 'var(--freeki-border-radius)',
            border: '1px solid var(--freeki-input-border)'
          }}>
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'var(--freeki-style-row-font-color)',
                fontFamily: 'monospace',
                fontSize: '0.9rem',
                fontWeight: 500,
                whiteSpace: 'nowrap'
              }}
            >
              /{newFolderTargetPath ? `${newFolderTargetPath}/` : '' }
            </Typography>
            <TextField
              autoFocus
              fullWidth
              variant="outlined"
              size="small"
              placeholder="folder-name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newFolderName.trim()) {
                  handleNewFolderConfirm()
                }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 'var(--freeki-border-radius)',
                  backgroundColor: 'var(--freeki-view-background)',
                  borderColor: 'var(--freeki-input-border)',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem'
                }
              }}
              slotProps={{
                input: {
                  ref: (input: HTMLInputElement) => {
                    if (input && showNewFolderDialog) {
                      setTimeout(() => {
                        input.focus()
                        if (input.select && typeof input.select === 'function') {
                          input.select()
                        }
                      }, 100)
                    }
                  }
                }
              }}
            />
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'var(--freeki-style-row-font-color)',
                fontFamily: 'monospace',
                fontSize: '0.9rem',
                fontWeight: 500,
                whiteSpace: 'nowrap'
              }}
            >
              /
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            onClick={() => {
              setShowNewFolderDialog(false)
              setNewFolderName('')
              setNewFolderTargetPath('')
              setNewFolderDragData(null)
              setIsDragging(false)
              setDragHoverFolder('__NONE__')
              setCurrentDraggedPath('')
            }}
            sx={{ 
              borderRadius: 'var(--freeki-border-radius)',
              color: 'var(--freeki-style-row-font-color)' 
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleNewFolderConfirm} 
            disabled={!newFolderName.trim()} 
            variant="contained"
            sx={{ 
              borderRadius: 'var(--freeki-border-radius)',
              backgroundColor: 'var(--freeki-primary)',
              '&:hover': { 
                backgroundColor: 'var(--freeki-primary)',
                filter: 'brightness(90%)'
              }
            }}
          >
            Create Folder
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}