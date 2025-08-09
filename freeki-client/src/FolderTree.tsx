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
type SearchMode = 'titles' | 'metadata' | 'fullContent'

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
  onSearch?: (query: string, mode: SearchMode) => void
  searchQuery?: string
  pageMetadata: PageMetadata[]
  semanticApi: ISemanticApi | null
  onDragDrop?: (
    dragData: import('./pageTreeUtils').DragData, 
    dropTarget: import('./pageTreeUtils').DropTarget,
    updatedPages: PageMetadata[]
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
  currentlyHoveredFolders
}: TreeNodeComponentProps) {
  // Calculate if this folder should be expanded based on whether any of its children are visible
  const isExpanded = useMemo(() => {
    if (!node.isFolder) return false
    
    // Check if any child pages are in the visible set
    const childPages = pageMetadata.filter(page => page.path.startsWith(node.metadata.path + '/'))
    return childPages.some(page => visiblePageIds.has(page.pageId))
  }, [node.isFolder, node.metadata.path, pageMetadata, visiblePageIds])
  
  const isSelected = selectedPageMetadata?.pageId === node.metadata.pageId
  const hasChildren = node.children && node.children.length > 0
  const textRef = useRef<HTMLDivElement>(null)
  const folderIconRef = useRef<HTMLDivElement>(null)

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false)
  const [dragOver, setDragOver] = useState<'none' | 'before' | 'inside' | 'after'>('none')
  const dragCounter = useRef(0)
  
  // Auto-expand on drag hover
  const dragHoverTimeoutRef = useRef<number | null>(null)

  const handleClick = () => {
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
          onTemporaryAutoExpand(node.metadata.path)
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
    
    // Only update state and log if position changes to avoid spam
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

  // Calculate visual styles for drag states
  const getDropIndicatorStyles = () => {
    const baseStyles = {}
    
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
    
    return baseStyles
  }

  return (
    <>
      <ListItem
        ref={isSelected ? selectedItemRef : null}
        draggable={true}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
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
          cursor: isDragging ? 'grabbing' : 'pointer',
          color: 'var(--freeki-folders-font-color)',
          fontSize: 'var(--freeki-folders-font-size)',
          minHeight: 32,
          alignItems: 'center',
          transition: 'all 0.2s ease-in-out',
          opacity: isDragging ? 0.5 : 1,
          transform: isDragging ? 'rotate(2deg)' : 'none',
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
    updateSetting
  } = useUserSettings(semanticApi)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const selectedItemRef = useRef<HTMLLIElement>(null)
  const [filterText, setFilterText] = useState(externalSearchQuery || '')
  const [searchMode, setSearchMode] = useState<SearchMode>('titles')
  
  // Convert visiblePageIds to Set for efficient lookups
  const visiblePageIds = useMemo(() => new Set(settings.visiblePageIds), [settings.visiblePageIds])

  // Temporary drag expansion state - folders that are temporarily expanded during drag
  const [temporaryExpandedFolders, setTemporaryExpandedFolders] = useState<Set<string>>(new Set())
  const [isDragging, setIsDragging] = useState(false)
  
  // Track which folders are currently being hovered during drag
  const [currentlyHoveredFolders, setCurrentlyHoveredFolders] = useState<Set<string>>(new Set())

  // Combined visibility: permanent + temporary during drag
  const effectiveVisiblePageIds = useMemo(() => {
    if (!isDragging || temporaryExpandedFolders.size === 0) {
      return visiblePageIds
    }

    // Create a union of permanent visible pages and temporarily expanded folder contents
    const combinedSet = new Set(visiblePageIds)
    
    for (const folderPath of temporaryExpandedFolders) {
      // Only include direct children of the temporarily expanded folder
      const directChildren = pageMetadata.filter(page => {
        const pagePath = page.path
        const pageDir = pagePath.substring(0, pagePath.lastIndexOf('/'))
        return pageDir === folderPath
      })
      directChildren.forEach(page => combinedSet.add(page.pageId))
    }
    
    return combinedSet
  }, [visiblePageIds, temporaryExpandedFolders, isDragging, pageMetadata])

  // Global drag state management
  const handleGlobalDragStart = useCallback(() => {
    setIsDragging(true)
    setTemporaryExpandedFolders(new Set())
    setCurrentlyHoveredFolders(new Set())
  }, [])

  const handleGlobalDragEnd = useCallback(() => {
    if (temporaryExpandedFolders.size > 0) {
      // Convert temporary expansions to permanent by adding their pages to visiblePageIds
      const newVisiblePageIds = new Set(settings.visiblePageIds)
      
      for (const folderPath of temporaryExpandedFolders) {
        // Add only direct children to permanent visibility
        const directChildren = pageMetadata.filter(page => {
          const pagePath = page.path
          const pageDir = pagePath.substring(0, pagePath.lastIndexOf('/'))
          return pageDir === folderPath
        })
        directChildren.forEach(page => newVisiblePageIds.add(page.pageId))
      }
      
      // Update settings with new permanent visibility
      updateSetting('visiblePageIds', Array.from(newVisiblePageIds))
    }
    
    setIsDragging(false)
    setTemporaryExpandedFolders(new Set())
    setCurrentlyHoveredFolders(new Set())
  }, [temporaryExpandedFolders, settings.visiblePageIds, pageMetadata, updateSetting])

  // Enhanced temporary auto-expansion during drag - expand only direct children
  const handleTemporaryAutoExpand = useCallback((folderPath: string) => {
    if (!isDragging) {
      return
    }
    
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
    
    // Use a small delay to check if we should collapse temporarily expanded folders
    // This prevents immediate collapse when moving between adjacent elements
    setTimeout(() => {
      setTemporaryExpandedFolders(prev => {
        const newSet = new Set(prev)
        
        // Only remove folders from temporary expansion if they're no longer being hovered
        // and none of their descendants are being hovered
        ancestorFolders.forEach(folderPath => {
          const isStillHovered = Array.from(currentlyHoveredFolders).some(hoveredPath => 
            hoveredPath === folderPath || hoveredPath.startsWith(folderPath + '/')
          )
          
          if (!isStillHovered) {
            newSet.delete(folderPath)
          }
        })
        
        return newSet
      })
    }, 50) // Small delay to allow for rapid hover changes
  }, [isDragging, currentlyHoveredFolders])

  // Handle manual folder toggle
  const handleToggleFolderExpansion = useCallback((folderPath: string) => {
    toggleFolderExpansion(folderPath, pageMetadata)
  }, [toggleFolderExpansion, pageMetadata])

  // Handle auto-expansion during drag hover (permanent expansion)
  const handleAutoExpandFolder = useCallback((folderPath: string) => {
    toggleFolderExpansion(folderPath, pageMetadata)
  }, [toggleFolderExpansion, pageMetadata])

  // Filter tree nodes based on search text
  const filteredPageTree = useMemo(() => {
    if (!filterText.trim()) return pageTree
    
    const filterLower = filterText.toLowerCase()
    
    const filterTree = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.reduce((filtered: TreeNode[], node) => {
        let matches = false
        
        if (searchMode === 'titles') {
          matches = node.metadata.title.toLowerCase().includes(filterLower)
        } else if (searchMode === 'metadata') {
          const titleMatch = node.metadata.title.toLowerCase().includes(filterLower)
          const tagMatch = node.metadata.tags.some(tag => tag.toLowerCase().includes(filterLower))
          matches = titleMatch || tagMatch
        } else if (searchMode === 'fullContent') {
          // For full content search, fall back to metadata search locally
          const titleMatch = node.metadata.title.toLowerCase().includes(filterLower)
          const tagMatch = node.metadata.tags.some(tag => tag.toLowerCase().includes(filterLower))
          matches = titleMatch || tagMatch
        }
        
        const childMatches = node.children ? filterTree(node.children) : []
        
        if (matches || childMatches.length > 0) {
          filtered.push({
            ...node,
            children: childMatches.length > 0 ? childMatches : node.children
          })
        }
        
        return filtered
      }, [])
    }
    
    return filterTree(pageTree)
  }, [pageTree, filterText, searchMode])

  // Auto-expand all folders that contain matches when filtering
  const visiblePageIdsForFiltering = useMemo(() => {
    if (!filterText.trim()) return effectiveVisiblePageIds
    
    const allVisiblePageIds = new Set(effectiveVisiblePageIds)
    
    const collectFolderPages = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        if (node.isFolder && node.children) {
          // Add all pages in filtered folders to visible set
          const childPages = pageMetadata.filter(page => page.path.startsWith(node.metadata.path + '/'))
          childPages.forEach(page => allVisiblePageIds.add(page.pageId))
          collectFolderPages(node.children)
        }
      }
    }
    
    // Expand all folders in filtered results
    collectFolderPages(filteredPageTree)
    
    return allVisiblePageIds
  }, [filteredPageTree, effectiveVisiblePageIds, filterText, pageMetadata])

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
    
    // Call the parent's search handler if provided
    if (onSearch) {
      onSearch(newValue, searchMode)
    }
  }

  const handleSearchModeToggle = () => {
    // Cycle through search modes: titles -> metadata -> fullContent -> titles
    const nextMode = searchMode === 'titles' ? 'metadata' 
                   : searchMode === 'metadata' ? 'fullContent' 
                   : 'titles'
    setSearchMode(nextMode)
    
    // If switching from titles to metadata and there's a search query, 
    // auto-upgrade to metadata mode for tag searching
    if (searchMode === 'titles' && filterText.trim()) {
      // Call the parent's search handler with new mode
      if (onSearch) {
        onSearch(filterText, nextMode)
      }
    }
  }

  // Update filter text when external search query changes (from tag clicks)
  useEffect(() => {
    if (externalSearchQuery !== undefined && externalSearchQuery !== filterText) {
      setFilterText(externalSearchQuery)
      // Auto-switch to metadata mode if currently in titles mode for tag searches
      if (searchMode === 'titles' && externalSearchQuery.trim()) {
        setSearchMode('metadata')
      }
    }
  }, [externalSearchQuery])

  const getSearchModeTitle = () => {
    switch (searchMode) {
      case 'titles': return 'Search Titles'
      case 'metadata': return 'Search Titles & Tags'
      case 'fullContent': return 'Search Everything'
      default: return 'Search mode'
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
          placeholder="Search pages"
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
                          onSearch('', searchMode)
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
              // Enhanced drag over handling that includes virtual folders
              e.preventDefault()
              e.stopPropagation()
              
              // Find the nearest list item above the current mouse position
              const rect = e.currentTarget.getBoundingClientRect()
              const y = e.clientY - rect.top
              
              // Find all TreeNode elements (including folders) within this List
              const listItems = e.currentTarget.querySelectorAll('[role="button"]')
              let targetItem: Element | null = null
              let minDistance = Infinity
              
              // Find the closest list item above the mouse position
              for (let i = 0; i < listItems.length; i++) {
                const item = listItems[i]
                const itemRect = item.getBoundingClientRect()
                const itemBottom = itemRect.bottom - rect.top
                
                // Check if this item is above the mouse and closer than previous candidates
                if (itemBottom <= y) {
                  const distance = y - itemBottom
                  if (distance < minDistance) {
                    minDistance = distance
                    targetItem = item
                  }
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
              // Enhanced drop handling that includes virtual folders
              e.preventDefault()
              e.stopPropagation()
              
              // Find the nearest list item above the current mouse position
              const rect = e.currentTarget.getBoundingClientRect()
              const y = e.clientY - rect.top
              
              // Find all TreeNode elements (including folders) within this List
              const listItems = e.currentTarget.querySelectorAll('[role="button"]')
              let targetItem: Element | null = null
              let minDistance = Infinity
              
              // Find the closest list item above the mouse position
              for (let i = 0; i < listItems.length; i++) {
                const item = listItems[i]
                const itemRect = item.getBoundingClientRect()
                const itemBottom = itemRect.bottom - rect.top
                
                // Check if this item is above the mouse and closer than previous candidates
                if (itemBottom <= y) {
                  const distance = y - itemBottom
                  if (distance < minDistance) {
                    minDistance = distance
                    targetItem = item
                  }
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
                visiblePageIds={filterText.trim() ? visiblePageIdsForFiltering : effectiveVisiblePageIds}
                onToggleFolderExpansion={handleToggleFolderExpansion}
                selectedItemRef={selectedItemRef}
                onDragDrop={async (dragData, dropTarget) => {
                  // For now, just call the parent handler if provided
                  if (onDragDrop) {
                    try {
                      await onDragDrop(dragData, dropTarget, pageMetadata)
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
              />
            ))}
          </List>
        </Box>
      )}
    </Box>
  )
}