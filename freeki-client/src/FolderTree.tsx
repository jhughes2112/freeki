import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  TextField,
  Collapse,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemIcon
} from '@mui/material'
import {
  Clear,
  Folder,
  FolderOpen,
  Description
} from '@mui/icons-material'
import type { PageMetadata } from './globalState'
import type { TreeNode } from './pageTreeUtils'
import type { ISemanticApi } from './semanticApiInterface'
import { useUserSettings } from './useUserSettings'

// Search modes for the filter
export type SearchMode = 'titles' | 'metadata' | 'fullContent'

interface SearchDepthIndicatorProps {
  mode: SearchMode
  onClick: () => void
  title: string
}

// Enhanced Tooltip component matching the header tooltips
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

// Custom component for search depth indicator with vertical pips
function SearchDepthIndicator({ mode, onClick, title }: SearchDepthIndicatorProps) {
  const getPipCount = () => {
    switch (mode) {
      case 'titles': return 1
      case 'metadata': return 2
      case 'fullContent': return 3
      default: return 1
    }
  }

  const pipCount = getPipCount()

  return (
    <EnhancedTooltip title={title}>
      <IconButton
        size="small"
        onClick={onClick}
        sx={{ p: 0.5 }}
        aria-label={title}
      >
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: 0.25,
          width: 16,
          height: 16
        }}>
          {/* Create 3 pips, fill based on mode */}
          {[3, 2, 1].map((level) => (
            <Box
              key={level}
              sx={{
                width: 8,
                height: 3,
                borderRadius: 0.5,
                backgroundColor: level <= pipCount 
                  ? 'var(--freeki-folders-font-color)' 
                  : 'transparent',
                border: `1px solid var(--freeki-folders-font-color)`,
                opacity: level <= pipCount ? 1 : 0.4,
                transition: 'all 0.2s ease-in-out'
              }}
            />
          ))}
        </Box>
      </IconButton>
    </EnhancedTooltip>
  )
}

interface FolderTreeProps {
  pageTree: TreeNode[]
  selectedPageMetadata: PageMetadata | null
  onPageSelect: (metadata: PageMetadata) => void
  onSearch?: (query: string, mode: SearchMode) => Promise<void>
  searchQuery?: string
  pageMetadata: PageMetadata[]
  semanticApi: ISemanticApi | null
  onDragDrop?: (
    dragData: import('./pageTreeUtils').DragData, 
    dropTarget: import('./pageTreeUtils').DropTarget
  ) => Promise<void>
}

interface TreeNodeComponentProps {
  node: TreeNode
  level: number
  selectedPageMetadata: PageMetadata | null
  onPageSelect: (metadata: PageMetadata) => void
  visiblePageIds: Set<string>
  onToggleFolderExpansion: (folderPath: string) => void
  selectedItemRef?: React.RefObject<HTMLLIElement | null>
  onDragDrop?: (dragData: import('./pageTreeUtils').DragData, dropTarget: import('./pageTreeUtils').DropTarget) => Promise<void>
  onAutoExpandFolder?: (folderPath: string) => void
  onTemporaryAutoExpand?: (folderPath: string) => void
  onDragEnterFolder?: (folderPath: string) => void
  onDragLeaveFolder?: (folderPath: string) => void
  onGlobalDragStart?: () => void
  onGlobalDragEnd?: () => void
  pageMetadata: PageMetadata[]
  currentlyHoveredFolders: Set<string>
  isFolderExpanded: (folderPath: string) => boolean
  isSearchActive: boolean
  isDragging: boolean
  temporaryExpandedFolders: Set<string>
}

function TreeNodeComponent({ 
  node, 
  level, 
  selectedPageMetadata, 
  onPageSelect, 
  visiblePageIds,
  onToggleFolderExpansion,
  selectedItemRef,
  onDragDrop,
  onAutoExpandFolder,
  onTemporaryAutoExpand,
  onDragEnterFolder,
  onDragLeaveFolder,
  onGlobalDragStart,
  onGlobalDragEnd,
  pageMetadata,
  currentlyHoveredFolders,
  isFolderExpanded,
  isSearchActive,
  isDragging,
  temporaryExpandedFolders,
  activeDropTarget
}: TreeNodeComponentProps & { activeDropTarget: string | null }) {
  // Use the proper folder expansion check including temporary expansions during drag
  const isExpanded = useMemo(() => {
    if (!node.isFolder) return false
    
    // Check permanent expansion state first
    const isPermanentlyExpanded = isFolderExpanded(node.metadata.path)
    
    // During search, expand all folders to show search results
    if (isSearchActive) {
      return true
    }
    
    // During drag, also check for temporary expansions
    if (isDragging) {
      const isTemporarilyExpanded = temporaryExpandedFolders.has(node.metadata.path)
      return isPermanentlyExpanded || isTemporarilyExpanded
    }
    
    return isPermanentlyExpanded
  }, [node.isFolder, node.metadata.path, isFolderExpanded, isSearchActive, isDragging, temporaryExpandedFolders])
  
  const isSelected = selectedPageMetadata?.pageId === node.metadata.pageId
  const hasChildren = node.children && node.children.length > 0
  const textRef = useRef<HTMLDivElement>(null)
  const folderIconRef = useRef<HTMLDivElement>(null)

  // Drag and drop state
  const [isDraggingState, setIsDragging] = useState(false)
  const [dragOver, setDragOver] = useState<'none' | 'before' | 'inside' | 'after'>('none')
  const dragCounter = useRef(0)
  
  // Auto-expand on drag hover
  const dragHoverTimeoutRef = useRef<number | null>(null)
  
  // Mobile touch handling
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const [longPressActive, setLongPressActive] = useState(false)
  const longPressTimeoutRef = useRef<number | null>(null)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  // Detect touch device on mount
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  const handleClick = () => {
    // On touch devices, only allow click if not in long press mode
    if (isTouchDevice && longPressActive) {
      return
    }
    
    // Always select the page when clicked (only if it's not a folder)
    if (!node.isFolder) {
      onPageSelect(node.metadata)
    }
    
    // If it's a folder with children, toggle expansion
    if (node.isFolder && hasChildren) {
      onToggleFolderExpansion(node.metadata.path)
    }
  }

  // Drag event handlers
  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation()
    setIsDragging(true)
    
    // Notify parent about global drag start
    if (onGlobalDragStart) {
      onGlobalDragStart()
    }
    
    const dragData = {
      pageId: node.metadata.pageId,
      isFolder: node.isFolder,
      path: node.metadata.path
    }
    
    e.dataTransfer.setData('application/json', JSON.stringify(dragData))
    e.dataTransfer.effectAllowed = 'move'
    
    // Add visual feedback to drag image
    if (e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, 0, 0)
    }
  }

  const handleDragEnd = () => {
    setIsDragging(false)
    setDragOver('none')
    dragCounter.current = 0
    
    // Notify parent about global drag end
    if (onGlobalDragEnd) {
      onGlobalDragEnd()
    }
    
    // Clean up auto-expand timer
    if (dragHoverTimeoutRef.current) {
      clearTimeout(dragHoverTimeoutRef.current)
      dragHoverTimeoutRef.current = null
    }
  }

  const calculateDropPosition = (e: React.DragEvent): 'before' | 'inside' | 'after' => {
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const height = rect.height
    
    // Enhanced logic to prioritize folder drops and handle virtual folders better
    if (node.isFolder) {
      // For folders: make 'inside' the dominant drop zone (60% of the height)
      // This makes it much easier to drop into folders
      if (y <= height * 0.2) {
        return 'before'
      } else if (y >= height * 0.8) {
        return 'after'
      } else {
        return 'inside'
      }
    } else {
      // For files: top 40% = before, bottom 40% = after, middle 20% = try parent folder
      if (y <= height * 0.4) {
        return 'before'
      } else if (y >= height * 0.6) {
        return 'after'
      } else {
        // Middle zone - if this file is in a folder, prefer dropping into the parent folder
        const pathParts = node.metadata.path.split('/').filter(Boolean)
        if (pathParts.length > 1) {
          // This file is in a folder, so dropping in middle should go to parent folder
          return 'inside' // This will be interpreted as "into parent folder" by the drop handler
        } else {
          // Root level file - use 'after' as default
          return 'after'
        }
      }
    }
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++
    
    if (dragCounter.current === 1) {
      const position = calculateDropPosition(e)
      setDragOver(position)
      
      // Notify parent that we've entered this folder/file
      if (onDragEnterFolder) {
        onDragEnterFolder(node.metadata.path)
      }
      
      // Start temporary auto-expand timer for folders that aren't expanded
      if (node.isFolder && !isExpanded && onTemporaryAutoExpand) {
        dragHoverTimeoutRef.current = setTimeout(() => {
          if (onTemporaryAutoExpand) {
            onTemporaryAutoExpand(node.metadata.path)
          }
        }, 500) // Faster temporary expand - 500ms vs 1000ms for permanent
      }
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    
    if (dragCounter.current === 0) {
      setDragOver('none')
      
      // Notify parent that we've left this folder/file
      if (onDragLeaveFolder) {
        onDragLeaveFolder(node.metadata.path)
      }
      
      // Cancel auto-expand timer
      if (dragHoverTimeoutRef.current) {
        clearTimeout(dragHoverTimeoutRef.current)
        dragHoverTimeoutRef.current = null
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const position = calculateDropPosition(e)
    
    // Only update state if position changes to avoid spam
    if (dragOver !== position) {
      setDragOver(position)
    }
    
    // Set the appropriate drop effect - always allow move
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    try {
      const dragDataString = e.dataTransfer.getData('application/json')
      if (!dragDataString) return
      
      const dragData = JSON.parse(dragDataString)
      
      // Don't allow dropping on self
      if (dragData.pageId === node.metadata.pageId) {
        return
      }
      
      // Don't allow dropping a folder into one of its own children
      if (dragData.isFolder && node.metadata.path && node.metadata.path.startsWith(dragData.path + '/')) {
        console.warn('Cannot drop folder into its own child folder')
        return
      }
      
      // Ensure we have a valid drop position
      if (dragOver === 'none') {
        return
      }
      
      // Enhanced drop target calculation to handle parent folder drops
      let finalDropTarget = {
        targetPageId: node.metadata.pageId,
        targetPath: node.metadata.path,
        position: dragOver as 'before' | 'after' | 'inside'
      }
      
      // Special handling for files in the middle drop zone - redirect to parent folder
      if (!node.isFolder && dragOver === 'inside') {
        const pathParts = node.metadata.path.split('/').filter(Boolean)
        if (pathParts.length > 1) {
          // This file is in a folder - redirect drop to parent folder
          const parentFolderPath = pathParts.slice(0, -1).join('/')
          finalDropTarget = {
            targetPageId: `folder_${parentFolderPath}`,
            targetPath: parentFolderPath,
            position: 'inside'
          }
        } else {
          // Root level file - treat as 'after'
          finalDropTarget.position = 'after'
        }
      }
      
      // Call the drag drop handler if provided  
      if (onDragDrop) {
        await onDragDrop(dragData, finalDropTarget)
      }
      
    } catch (error) {
      console.error('Error handling drop:', error)
    } finally {
      setDragOver('none')
      dragCounter.current = 0
    }
  }

  // Touch event handlers for mobile long-press drag
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isTouchDevice) return
    
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
    
    // Start long press timer
    longPressTimeoutRef.current = setTimeout(() => {
      setLongPressActive(true)
      // Provide haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(50)
      }
      // Start drag operation
      handleDragStart({
        stopPropagation: () => {},
        dataTransfer: {
          setData: () => {},
          setDragImage: () => {},
          effectAllowed: 'move'
        },
        currentTarget: e.currentTarget
      } as any)
    }, 500) // 500ms long press
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isTouchDevice || !touchStartRef.current) return
    
    const touch = e.touches[0]
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x)
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y)
    
    // If user moves finger significantly, cancel long press
    if (deltaX > 10 || deltaY > 10) {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current)
        longPressTimeoutRef.current = null
      }
      
      // If already in long press mode, handle as drag
      if (longPressActive) {
        // Find element under touch point for drop targeting
        const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY)
        if (elementBelow) {
          const listItem = elementBelow.closest('[role="button"]')
          if (listItem && listItem !== e.currentTarget) {
            // Simulate drag over event
            const syntheticEvent = new DragEvent('dragover', {
              bubbles: true,
              cancelable: true,
              clientX: touch.clientX,
              clientY: touch.clientY
            })
            listItem.dispatchEvent(syntheticEvent)
          }
        }
      }
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isTouchDevice) return
    
    // Clear long press timer
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current)
      longPressTimeoutRef.current = null
    }
    
    // If we were in long press mode, handle as drop
    if (longPressActive) {
      const touch = e.changedTouches[0]
      const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY)
      if (elementBelow) {
        const listItem = elementBelow.closest('[role="button"]')
        if (listItem && listItem !== e.currentTarget) {
          // Simulate drop event
          const syntheticEvent = new DragEvent('drop', {
            bubbles: true,
            cancelable: true,
            clientX: touch.clientX,
            clientY: touch.clientY,
            dataTransfer: {
              getData: () => JSON.stringify({
                pageId: node.metadata.pageId,
                isFolder: node.isFolder,
                path: node.metadata.path
              })
            }
          } as any)
          listItem.dispatchEvent(syntheticEvent)
        }
      }
      
      handleDragEnd()
      setLongPressActive(false)
      e.preventDefault() // Prevent click event
    }
    
    touchStartRef.current = null
  }

  const positionTextOptimally = () => {
    if (textRef.current && folderIconRef.current) {
      const textElement = textRef.current
      const folderIconElement = folderIconRef.current

      requestAnimationFrame(() => {
        // Find the scrollable container
        let scrollContainer = textElement.parentElement
        while (scrollContainer) {
          const styles = window.getComputedStyle(scrollContainer)
          if (styles.overflowX === 'auto' || styles.overflow === 'auto') {
            break
          }
          scrollContainer = scrollContainer.parentElement
        }

        if (scrollContainer) {
          // Get the exact position of the folder icon using DOM measurement
          const containerRect = scrollContainer.getBoundingClientRect()
          const folderIconRect = folderIconElement.getBoundingClientRect()

          // Calculate the folder icon's X position within the scrollable content
          const folderIconLeftInContainer = folderIconRect.left - containerRect.left + scrollContainer.scrollLeft

          // Always position so folder icon appears at left edge (x=0) with smooth animation
          scrollContainer.scrollTo({
            left: Math.max(0, folderIconLeftInContainer),
            behavior: 'smooth'
          })
        }
      })
    }
  }

  const handleMouseEnter = () => {
    positionTextOptimally()  // horizontally scroll the view so the name of the file or folder is most visible on narrow screens
  }

  // Calculate visual styles for drag states including folder-wide drop zones
  const getDropIndicatorStyles = () => {
    const baseStyles = {}
    
    // Individual item drop indicators
    if (dragOver === 'before') {
      return {
        ...baseStyles,
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '-1px',
          left: 0,
          right: 0,
          height: '3px',
          backgroundColor: 'var(--freeki-primary)',
          borderRadius: '2px',
          zIndex: 1000
        }
      }
    } else if (dragOver === 'after') {
      return {
        ...baseStyles,
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: '-1px',
          left: 0,
          right: 0,
          height: '3px',
          backgroundColor: 'var(--freeki-primary)',
          borderRadius: '2px',
          zIndex: 1000
        }
      }
    } else if (dragOver === 'inside') {
      return {
        ...baseStyles,
        backgroundColor: 'var(--freeki-folders-selected-background)',
        filter: 'brightness(1.1)',
        borderRadius: 'var(--freeki-border-radius)',
        boxShadow: '0 0 0 2px var(--freeki-primary)',
        transition: 'all 0.15s ease-in-out'
      }
    }
    
    // Folder-wide drop zone highlighting
    if (isDragging && activeDropTarget) {
      const currentFolderPath = node.isFolder ? node.metadata.path : 
        (node.metadata.path.includes('/') ? node.metadata.path.substring(0, node.metadata.path.lastIndexOf('/')) : 'root')
      
      if (currentFolderPath === activeDropTarget || 
          (activeDropTarget === 'root' && !node.metadata.path.includes('/'))) {
        return {
          ...baseStyles,
          backgroundColor: 'rgba(var(--freeki-primary-rgb), 0.1)',
          borderLeft: '4px solid var(--freeki-primary)',
          transition: 'all 0.2s ease-in-out'
        }
      }
    }
    
    return baseStyles
  }

  return (
    <>
      <ListItem
        ref={isSelected ? selectedItemRef : null}
        draggable={!isTouchDevice} // Only enable native drag on non-touch devices
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        role="button"
        tabIndex={0}
        data-is-folder={node.isFolder}
        data-folder-path={node.isFolder ? node.metadata.path : undefined}
        sx={{
          pl: 1 + level * 1.5,
          pr: 1,
          py: 0.25,
          backgroundColor: isSelected 
            ? 'var(--freeki-folders-selected-background)' 
            : 'transparent',
          '&:hover': {
            backgroundColor: isSelected 
              ? 'var(--freeki-folders-selected-background)'
              : 'var(--freeki-folders-selected-background)',
            filter: isSelected ? 'none' : 'brightness(0.9) saturate(0.8)'
          },
          borderRadius: 'var(--freeki-border-radius)',
          mx: 0.5,
          mb: 0.1,  // Reduced from 0.25 to minimize gaps
          cursor: isDraggingState ? 'grabbing' : 'pointer',
          color: 'var(--freeki-folders-font-color)',
          fontSize: 'var(--freeki-folders-font-size)',
          minHeight: 32,
          alignItems: 'center',
          transition: 'all 0.2s ease-in-out',
          opacity: isDraggingState ? 0.5 : 1,
          transform: isDraggingState ? 'rotate(2deg)' : 'none',
          position: 'relative',
          ...getDropIndicatorStyles()
        }}
      >
        {/* File/folder icon */}
        <ListItemIcon 
          ref={folderIconRef}
          sx={{ 
            minWidth: 20, 
            color: 'var(--freeki-folders-font-color)',
            mr: 0.75
          }}
        >
          {node.isFolder ? (
            isExpanded ? <FolderOpen fontSize="small" /> : <Folder fontSize="small" />
          ) : (
            <Description fontSize="small" />
          )}
        </ListItemIcon>
        
        {/* File/folder name with horizontal scroll container */}
        <Box sx={{ 
          flex: 1, 
          overflow: 'hidden',
          position: 'relative'
        }}>
          <Box
            sx={{
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              position: 'relative'
            }}
          >
            <Typography
              variant="body2"
              ref={textRef}
              sx={{
                fontWeight: isSelected ? 600 : 400,
                color: 'var(--freeki-folders-font-color)',
                fontSize: 'var(--freeki-folders-font-size)',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                userSelect: 'none',
                transition: 'transform 0.3s ease-out',
                display: 'inline-block'
              }}
              title={node.metadata.title}
            >
              {node.metadata.title}
            </Typography>
          </Box>
        </Box>
      </ListItem>
      
      {/* Children - only show if folder is expanded */}
      {node.isFolder && hasChildren && (
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <List component="div" disablePadding sx={{ 
            borderLeft: level > 0 ? `1px solid var(--freeki-border-color)` : 'none', 
            ml: level > 0 ? 1.5 : 0 
          }}>
            {node.children?.map((child: TreeNode) => (
              <TreeNodeComponent
                key={child.metadata.pageId}
                node={child}
                level={level + 1}
                selectedPageMetadata={selectedPageMetadata}
                onPageSelect={onPageSelect}
                visiblePageIds={visiblePageIds}
                onToggleFolderExpansion={onToggleFolderExpansion}
                selectedItemRef={selectedItemRef}
                onDragDrop={onDragDrop}
                onAutoExpandFolder={onAutoExpandFolder}
                onTemporaryAutoExpand={onTemporaryAutoExpand}
                onDragEnterFolder={onDragEnterFolder}
                onDragLeaveFolder={onDragLeaveFolder}
                onGlobalDragStart={onGlobalDragStart}
                onGlobalDragEnd={onGlobalDragEnd}
                pageMetadata={pageMetadata}
                currentlyHoveredFolders={currentlyHoveredFolders}
                isFolderExpanded={isFolderExpanded}
                isSearchActive={isSearchActive}
                isDragging={isDragging}
                temporaryExpandedFolders={temporaryExpandedFolders}
                activeDropTarget={activeDropTarget}
              />
            ))}

          </List>
        </Collapse>
      )}
    </>
  )
}

export default function FolderTree({ 
  pageTree, 
  selectedPageMetadata, 
  onPageSelect, 
  onSearch, 
  searchQuery: externalSearchQuery, 
  pageMetadata, 
  semanticApi, 
  onDragDrop 
}: FolderTreeProps) {
  const { 
    settings, 
    toggleFolderExpansion, 
    ensurePageVisible,
    updateSetting,
    saveSettings,
    isFolderExpanded
  } = useUserSettings(semanticApi)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const selectedItemRef = useRef<HTMLLIElement>(null)
  const [filterText, setFilterText] = useState(externalSearchQuery || '')
  const [searchMode, setSearchMode] = useState<SearchMode>('titles')
  
  // Debouncing for full content search
  const searchTimeoutRef = useRef<number | null>(null)
  
  // Convert expanded folder paths to visible page IDs (computed, not stored)
  const visiblePageIds = useMemo(() => {
    const visible = new Set<string>()
    
    // For each expanded folder, add all its direct children to visible set
    for (const folderPath of settings.expandedFolderPaths) {
      const pagesInFolder = pageMetadata.filter(page => {
        const pagePath = page.path
        const pageDir = pagePath.includes('/') ? pagePath.substring(0, pagePath.lastIndexOf('/')) : ''
        return pageDir === folderPath
      })
      
      pagesInFolder.forEach(page => {
        visible.add(page.pageId)
      })
    }
    
    return visible
  }, [settings.expandedFolderPaths, pageMetadata])

  // Check if we're in search mode - search is active if there's any text in the search field
  const isSearchActive = useMemo(() => {
    const hasExternalQuery = externalSearchQuery !== undefined && externalSearchQuery.trim().length > 0
    const hasLocalQuery = filterText.trim().length > 0
    return hasExternalQuery || hasLocalQuery
  }, [externalSearchQuery, filterText])

  // When search is active, show all matching pages in the tree
  // When search is inactive, use normal visibility rules
  const effectiveVisiblePageIds = useMemo(() => {
    if (isSearchActive) {
      // During search, check if we actually have search results
      // If pageMetadata is provided but no results, it means the search returned nothing
      if (pageMetadata.length === 0) {
        // No search results - return empty set to trigger "No pages found"
        return new Set<string>()
      }
      
      // During search, make all search result pages visible
      const searchResultPageIds = new Set<string>()
      pageMetadata.forEach(page => {
        searchResultPageIds.add(page.pageId)
      })
      return searchResultPageIds
    }
    return visiblePageIds
  }, [isSearchActive, pageMetadata, visiblePageIds])

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  // Temporary drag expansion state - folders that are temporarily expanded during drag
  const [temporaryExpandedFolders, setTemporaryExpandedFolders] = useState<Set<string>>(new Set())
  const [isDragging, setIsDragging] = useState(false)
  
  // Track which folders are currently being hovered during drag
  const [currentlyHoveredFolders, setCurrentlyHoveredFolders] = useState<Set<string>>(new Set())

  // Enhanced drop zone highlighting - track which folder is the active drop target
  const [activeDropTarget, setActiveDropTarget] = useState<string | null>(null)
  
  // Global drag state management
  const handleGlobalDragStart = useCallback(() => {
    setIsDragging(true)
    setTemporaryExpandedFolders(new Set())
    setCurrentlyHoveredFolders(new Set())
    setActiveDropTarget(null)
  }, [])

  const handleGlobalDragEnd = useCallback(() => {
    // ?? SIMPLIFIED: Only track folder expansion state, not individual file visibility
    // The visibility of files is derived from which folders are expanded
    
    console.log('?? Capturing current folder expansion state...')
    
    // Start with current expanded folders
    const newExpandedFolders = new Set(settings.expandedFolderPaths)
    
    // Add any temporarily expanded folders from this drag to permanent state
    for (const folderPath of temporaryExpandedFolders) {
      console.log('?? Making temporary folder permanent:', folderPath)
      newExpandedFolders.add(folderPath)
    }
    
    // ?? CRITICAL: Always ensure the currently selected page's parent folders stay expanded
    if (selectedPageMetadata) {
      console.log('?? Ensuring current page path stays expanded:', selectedPageMetadata.path)
      
      // Ensure all parent folders of the current page are expanded
      const currentPagePath = selectedPageMetadata.path
      const pathParts = currentPagePath.split('/').filter(Boolean)
      for (let i = 1; i < pathParts.length; i++) {
        const parentFolderPath = pathParts.slice(0, i).join('/')
        newExpandedFolders.add(parentFolderPath)
        console.log('?? Ensuring parent folder expanded:', parentFolderPath)
      }
    }
    
    // Update settings with ONLY the folder expansion state
    // Let the tree compute which files are visible based on which folders are expanded
    updateSetting('expandedFolderPaths', Array.from(newExpandedFolders))
    
    console.log('? Drag end complete. Expanded folders:', Array.from(newExpandedFolders))
    
    setIsDragging(false)
    setTemporaryExpandedFolders(new Set())
    setCurrentlyHoveredFolders(new Set())
    setActiveDropTarget(null)
  }, [temporaryExpandedFolders, settings.expandedFolderPaths, pageMetadata, selectedPageMetadata, updateSetting])

  // Enhanced temporary auto-expansion during drag - expand only direct children
  const handleTemporaryAutoExpand = useCallback((folderPath: string) => {
    if (!isDragging) {
      return
    }
    
    // Add to temporary expanded folders set without modifying permanent settings
    setTemporaryExpandedFolders(prev => new Set([...prev, folderPath]))
  }, [isDragging])

  // Track when drag enters a folder or file
  const handleDragEnterFolder = useCallback((itemPath: string) => {
    if (!isDragging) {
      return
    }
    
    // Find all ancestor folder paths of this item
    const ancestorFolders = new Set<string>()
    const pathParts = itemPath.split('/').filter(Boolean)
    
    // Add all possible parent folder paths
    for (let i = 1; i <= pathParts.length; i++) {
      const folderPath = pathParts.slice(0, i).join('/')
      if (folderPath) {
        ancestorFolders.add(folderPath)
      }
    }
    
    setCurrentlyHoveredFolders(prev => {
      const newSet = new Set(prev)
      ancestorFolders.forEach(folder => newSet.add(folder))
      return newSet
    })
    
    // ?? FIXED: Don't set activeDropTarget to 'root' - use null instead for root level items
    // This prevents all root level items from getting highlighted when dragging root items
    console.log('?? Setting active drop target for path:', itemPath)
    if (pathParts.length > 1) {
      // For files in folders, the drop target is the folder containing the file
      const targetFolderPath = pathParts.slice(0, -1).join('/')
      setActiveDropTarget(targetFolderPath)
      console.log('?? Active drop target set to:', targetFolderPath)
    } else {
      // Root level item - don't set any active drop target to avoid mass highlighting
      setActiveDropTarget(null)
      console.log('?? Root level item - no active drop target set')
    }
  }, [isDragging])

  // Remove folder from hover tracking and potentially from temporary expansion
  const handleDragLeaveFolder = useCallback((itemPath: string) => {
    if (!isDragging) {
      return
    }
    
    // Find all ancestor folder paths of this item
    const ancestorFolders = new Set<string>()
    const pathParts = itemPath.split('/').filter(Boolean)
    
    // Add all possible parent folder paths
    for (let i = 1; i <= pathParts.length; i++) {
      const folderPath = pathParts.slice(0, i).join('/')
      if (folderPath) {
        ancestorFolders.add(folderPath)
      }
    }
    
    setCurrentlyHoveredFolders(prev => {
      const newSet = new Set(prev)
      ancestorFolders.forEach(folder => newSet.delete(folder))
      return newSet
    })
    
    // ?? FIXED: More aggressive cleanup of active drop target
    // Clear active drop target when leaving ANY item to prevent persistent highlighting
    setActiveDropTarget(null)
    console.log('?? Cleared active drop target on drag leave')
    
    // NEVER collapse folders while dragging - wait until drag ends
    // This prevents the drag targets from shifting unexpectedly during drag operations
    // The temporary folders will be handled in handleGlobalDragEnd
  }, [isDragging])

  // Handle manual folder toggle
  const handleToggleFolderExpansion = useCallback((folderPath: string) => {
    toggleFolderExpansion(folderPath, pageMetadata)
    // Remove the problematic setTimeout - the toggleFolderExpansion function 
    // already handles updating both expandedFolderPaths and visiblePageIds
  }, [toggleFolderExpansion, pageMetadata])

  // Handle auto-expansion during drag hover (permanent expansion)
  const handleAutoExpandFolder = useCallback((folderPath: string) => {
    toggleFolderExpansion(folderPath, pageMetadata)
  }, [toggleFolderExpansion, pageMetadata])

  // Filter tree nodes based on search text - simplified since server/App handles search logic
  const filteredPageTree = useMemo(() => {
    // When search is active, pageTree already contains only matching results
    // When search is inactive, show the full tree
    return pageTree
  }, [pageTree])

  // Auto-expand all folders when search is active to show all results
  const visiblePageIdsForDisplay = useMemo(() => {
    if (isSearchActive) {
      // During search, ensure all parent folders of search results are expanded
      const allVisiblePageIds = new Set(effectiveVisiblePageIds)
      
      pageMetadata.forEach(page => {
        const pathParts = page.path.split('/').filter(Boolean)
        // Expand all parent folders for this search result
        for (let i = 1; i < pathParts.length; i++) {
          const folderPath = pathParts.slice(0, i).join('/')
          // Find all pages in this folder and make them visible
          pageMetadata.forEach(folderPage => {
            if (folderPage.path.startsWith(folderPath + '/')) {
              allVisiblePageIds.add(folderPage.pageId)
            }
          })
        }
      })
      
      return allVisiblePageIds
    }
    
    return isDragging ? effectiveVisiblePageIds : visiblePageIds
  }, [isSearchActive, effectiveVisiblePageIds, isDragging, pageMetadata, visiblePageIds])

  // Auto-expand path to selected page when it changes
  useEffect(() => {
    if (selectedPageMetadata) {
      ensurePageVisible(selectedPageMetadata.pageId, pageMetadata)
    }
  }, [selectedPageMetadata?.pageId, ensurePageVisible, pageMetadata])

  // Center the selected item in the container only when selection actually changes
  useEffect(() => {
    if (selectedItemRef.current && containerRef.current && selectedPageMetadata) {
      const container = containerRef.current
      const selectedItem = selectedItemRef.current
      
      // Use a timeout to ensure the DOM has updated after expansion
      setTimeout(() => {
        const containerRect = container.getBoundingClientRect()
        const itemRect = selectedItem.getBoundingClientRect()
        
        // Calculate the offset to center the selected item vertically only
        const containerCenter = containerRect.height / 2
        const itemRelativeTop = itemRect.top - containerRect.top + container.scrollTop
        const itemCenter = itemRelativeTop + (itemRect.height / 2)
        
        // Scroll to center the selected item vertically only (don't touch horizontal)
        const targetScrollTop = itemCenter - containerCenter
        
        container.scrollTo({
          top: Math.max(0, targetScrollTop),
          left: container.scrollLeft, // Keep current horizontal position
          behavior: 'smooth'
        })
      }, 100)
    }
  }, [selectedPageMetadata?.pageId])

  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value
    setFilterText(newValue)
    
    // Clear existing timeout - with null safety
    if (searchTimeoutRef.current !== null) {
      clearTimeout(searchTimeoutRef.current)
      searchTimeoutRef.current = null
    }
    
    // Call the parent's search handler if provided
    if (onSearch) {
      // For full content search: debounce by 1 second
      if (searchMode === 'fullContent') {
        // Empty search - search immediately
        if (newValue.trim().length === 0) {
          onSearch(newValue, searchMode).catch(error => {
            console.error('Search failed:', error)
          })
          return
        }
        
        // Debounce full content search by 1 second
        searchTimeoutRef.current = setTimeout(() => {
          onSearch!(newValue, searchMode).catch(error => {
            console.error('Search failed:', error)
          })
        }, 1000)
      } else {
        // For titles and metadata modes: search immediately
        onSearch(newValue, searchMode).catch(error => {
          console.error('Search failed:', error)
        })
      }
    }
  }

  const handleSearchModeToggle = () => {
    // Clear any pending search timeout when switching modes
    if (searchTimeoutRef.current !== null) {
      clearTimeout(searchTimeoutRef.current)
      searchTimeoutRef.current = null
    }
    
    // Cycle through search modes: titles -> metadata -> fullContent -> titles
    const nextMode = searchMode === 'titles' ? 'metadata' 
                   : searchMode === 'metadata' ? 'fullContent' 
                   : 'titles'
    setSearchMode(nextMode)
    
    // If switching to fullContent mode, start the timer if there's text
    if (nextMode === 'fullContent') {
      if (filterText.trim()) {
        const timerId = setTimeout(() => {
          if (onSearch) {
            onSearch(filterText, nextMode).catch(error => {
              console.error('Search failed:', error)
            })
          }
        }, 1000)
        searchTimeoutRef.current = timerId
      }
    } else {
      // For other modes, search immediately if there's text
      if (filterText.trim() && onSearch) {
        onSearch(filterText, nextMode).catch(error => {
          console.error('Search failed:', error)
        })
      }
    }
  }

  // Update filter text when external search query changes (from tag clicks)
  useEffect(() => {
    // Clear any pending search timeout when external query changes
    if (searchTimeoutRef.current !== null) {
      clearTimeout(searchTimeoutRef.current)
      searchTimeoutRef.current = null
    }
    
    // Always update when external query changes, even if it's the same as current
    // This ensures tag clicks work even when clicking the same tag twice
    if (externalSearchQuery !== undefined) {
      setFilterText(externalSearchQuery)
    }
  }, [externalSearchQuery])

  const getSearchModeTitle = () => {
    switch (searchMode) {
      case 'titles': return 'Search Titles Only'
      case 'metadata': return 'Search Titles & Tags'
      case 'fullContent': return 'Search Everything (3+ chars, 1s delay)'
      default: return 'Search mode'
    }
  }

  const getSearchPlaceholder = () => {
    switch (searchMode) {
      case 'titles': return 'Search page titles...'
      case 'metadata': return 'Search titles & tags...'
      case 'fullContent': return 'Search everything (3+ chars)...'
      default: return 'Search pages...'
    }
  }

  return (
    <Box sx={{ 
      height: '100%', 
      overflow: 'hidden',
      color: 'var(--freeki-folders-font-color)',
      backgroundColor: 'var(--freeki-folders-background)',
      borderRadius: 'var(--freeki-border-radius)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Search/filter bar */}
      <Box sx={{ px: 2, pb: 1, flexShrink: 0 }}>
        <TextField
          variant="outlined"
          size="small"
          placeholder={getSearchPlaceholder()}
          value={filterText}
          onChange={handleFilterChange}
          fullWidth
          InputProps={{
            endAdornment: (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {filterText && (
                  <EnhancedTooltip title="Clear search">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setFilterText('')

                        if (onSearch) {
                          onSearch('', searchMode).catch(error => {
                            console.error('Search failed:', error)
                          })
                        }
                      }}
                      sx={{ p: 0.5 }}
                      aria-label="Clear search"
                    >
                      <Clear fontSize="small" />
                    </IconButton>
                  </EnhancedTooltip>
                )}
                
                <SearchDepthIndicator
                  mode={searchMode}
                  onClick={handleSearchModeToggle}
                  title={getSearchModeTitle()}
                />
              </Box>
            )
          }}
          inputProps={{
            autoComplete: 'off',
            spellCheck: false
          }}
          sx={{
            borderRadius: 'var(--freeki-border-radius)',
            backgroundColor: 'var(--freeki-search-background)',
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: 'var(--freeki-border-color)'
              },
              '&:hover fieldset': {
                borderColor: 'var(--freeki-border-color)',
                backgroundColor: 'transparent',
              },
              '&.Mui-focused fieldset': {
                borderColor: 'var(--freeki-primary)',
                backgroundColor: 'transparent',
              },
            },
            '& .MuiInputBase-input': {
              py: 1.5,
              px: 2,
              height: 'auto',
              color: 'var(--freeki-folders-font-color)',
              fontSize: 'var(--freeki-folders-font-size)',
            },
            '& .MuiSvgIcon-root': {
              color: 'var(--freeki-folders-font-color)',
            },
          }}
        />
      </Box>
      
      {filteredPageTree.length === 0 ? (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          p: 3,
          color: 'var(--freeki-folders-font-color)',
          opacity: 0.6,
          flex: 1
        }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            No pages found
          </Typography>
          <Typography variant="caption">
            Try changing your search terms
          </Typography>
        </Box>
      ) : (
        <Box 
          ref={containerRef}
          sx={{ 
            flex: 1, 
            overflowY: 'auto',
            overflowX: 'auto',
            position: 'relative',
            '&::-webkit-scrollbar:horizontal': {
              display: 'none'
            },
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          <List 
            component="nav" 
            dense 
            disablePadding 
            onDragOver={(e) => {
              // Enhanced drag over handling that includes virtual folders and gaps
              e.preventDefault()
              e.stopPropagation()
              
              const rect = e.currentTarget.getBoundingClientRect()
              const y = e.clientY - rect.top
              
              // Find all TreeNode elements (including folders) within this List
              const listItems = e.currentTarget.querySelectorAll('[role="button"]')
              let targetItem: Element | null = null
              let minDistance = Infinity
              
              // Special handling for gaps between folder and first child
              for (let i = 0; i < listItems.length; i++) {
                const item = listItems[i]
                const itemRect = item.getBoundingClientRect()
                const itemTop = itemRect.top - rect.top
                const itemBottom = itemRect.bottom - rect.top
                
                // Check if mouse is directly over this item
                if (y >= itemTop && y <= itemBottom) {
                  targetItem = item
                  break
                }
                
                // Check if mouse is in the gap just below this item (for folder children)
                // Look ahead to see if next item is a child of current folder
                if (i < listItems.length - 1) {
                  const nextItem = listItems[i + 1]
                  const nextItemRect = nextItem.getBoundingClientRect()
                  const nextItemTop = nextItemRect.top - rect.top
                  const gapSize = nextItemTop - itemBottom
                  
                  // If mouse is in the gap and gap is reasonable (< 20px), 
                  // and if this looks like a folder-to-child gap, target the folder
                  if (y > itemBottom && y < nextItemTop && gapSize < 20) {
                    // Check if current item is a folder using data attribute
                    const isFolder = item.getAttribute('data-is-folder') === 'true'
                    if (isFolder) {
                      targetItem = item
                      break
                    }
                  }
                }
                
                // Fallback: find closest item
                const distanceToTop = Math.abs(y - itemTop)
                const distanceToBottom = Math.abs(y - itemBottom)
                const minItemDistance = Math.min(distanceToTop, distanceToBottom)
                
                if (minItemDistance < minDistance) {
                  minDistance = minItemDistance
                  targetItem = item
                }
              }
              
              // If we found a target item, forward the drag over event to it
              if (targetItem && targetItem instanceof HTMLElement) {
                const syntheticEvent = new DragEvent('dragover', {
                  bubbles: true,
                  cancelable: true,
                  clientX: e.clientX,
                  clientY: e.clientY,
                  dataTransfer: e.dataTransfer
                })
                targetItem.dispatchEvent(syntheticEvent)
              }
             e.dataTransfer.dropEffect = 'move'
            }}
            onDrop={(e) => {
              // Enhanced drop handling that includes virtual folders and gaps
              e.preventDefault()
              e.stopPropagation()
              
              const rect = e.currentTarget.getBoundingClientRect()
              const y = e.clientY - rect.top
              
              // Find all TreeNode elements (including folders) within this List
              const listItems = e.currentTarget.querySelectorAll('[role="button"]')
              let targetItem: Element | null = null
              let minDistance = Infinity
              
              // Use same logic as dragOver for consistency
              for (let i = 0; i < listItems.length; i++) {
                const item = listItems[i]
                const itemRect = item.getBoundingClientRect()
                const itemTop = itemRect.top - rect.top
                const itemBottom = itemRect.bottom - rect.top
                
                // Check if mouse is directly over this item
                if (y >= itemTop && y <= itemBottom) {
                  targetItem = item
                  break
                }
                
                // Check if mouse is in the gap just below this item (for folder children)
                if (i < listItems.length - 1) {
                  const nextItem = listItems[i + 1]
                  const nextItemRect = nextItem.getBoundingClientRect()
                  const nextItemTop = nextItemRect.top - rect.top
                  const gapSize = nextItemTop - itemBottom
                  
                  // If mouse is in the gap and gap is reasonable (< 20px), 
                  // and if this looks like a folder-to-child gap, target the folder
                  if (y > itemBottom && y < nextItemTop && gapSize < 20) {
                    // Check if current item is a folder using data attribute
                    const isFolder = item.getAttribute('data-is-folder') === 'true'
                    if (isFolder) {
                      targetItem = item
                      break
                    }
                  }
                }
                
                // Fallback: find closest item
                const distanceToTop = Math.abs(y - itemTop)
                const distanceToBottom = Math.abs(y - itemBottom)
                const minItemDistance = Math.min(distanceToTop, distanceToBottom)
                
                if (minItemDistance < minDistance) {
                  minDistance = minItemDistance
                  targetItem = item
                }
              }
              
              // If we found a target item, forward the drop event to it
              if (targetItem && targetItem instanceof HTMLElement) {
                const syntheticEvent = new DragEvent('drop', {
                  bubbles: true,
                  cancelable: true,
                  clientX: e.clientX,
                  clientY: e.clientY,
                  dataTransfer: e.dataTransfer
                })
                targetItem.dispatchEvent(syntheticEvent)
              }
            }}
            sx={{ 
              pt: 0.5,
              minWidth: 'fit-content',
              position: 'relative'
            }}
          >
            {filteredPageTree.map((node) => (
              <TreeNodeComponent
                key={node.metadata.pageId}
                node={node}
                level={0}
                selectedPageMetadata={selectedPageMetadata}
                onPageSelect={onPageSelect}
                visiblePageIds={visiblePageIdsForDisplay}
                onToggleFolderExpansion={handleToggleFolderExpansion}
                selectedItemRef={selectedItemRef}
                onDragDrop={async (dragData, dropTarget) => {
                  // For now, just call the parent handler if provided
                  if (onDragDrop) {
                    try {
                      await onDragDrop(dragData, dropTarget)
                    } catch (error) {
                      console.error('Parent onDragDrop handler failed:', error)
                      throw error
                    }
                  }
                }}
                onAutoExpandFolder={handleAutoExpandFolder}
                onTemporaryAutoExpand={handleTemporaryAutoExpand}
                onDragEnterFolder={handleDragEnterFolder}
                onDragLeaveFolder={handleDragLeaveFolder}
                onGlobalDragStart={handleGlobalDragStart}
                onGlobalDragEnd={handleGlobalDragEnd}
                pageMetadata={pageMetadata}
                currentlyHoveredFolders={currentlyHoveredFolders}
                isFolderExpanded={isFolderExpanded}
                isSearchActive={isSearchActive}
                isDragging={isDragging}
                temporaryExpandedFolders={temporaryExpandedFolders}
                activeDropTarget={activeDropTarget}
              />
            ))}
          </List>
        </Box>
      )}
    </Box>
  )
}