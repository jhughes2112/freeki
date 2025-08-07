import React, { useState, useMemo, useRef, useEffect } from 'react'
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
  pageMetadata: PageMetadata[]  // Add this to get the actual page data
  semanticApi: ISemanticApi | null
  onDragDrop?: (
    dragData: import('./pageTreeUtils').DragData, 
    dropTarget: import('./pageTreeUtils').DropTarget,
    updatedPages: PageMetadata[]  // Change signature to pass updated pages
  ) => Promise<void>
}

interface TreeNodeComponentProps {
  node: TreeNode
  level: number
  selectedPageMetadata: PageMetadata | null
  onPageSelect: (metadata: PageMetadata) => void
  expandedNodes: Set<string>
  onToggleExpanded: (pageId: string) => void
  selectedItemRef?: React.RefObject<HTMLLIElement | null>
  onDragDrop?: (dragData: import('./pageTreeUtils').DragData, dropTarget: import('./pageTreeUtils').DropTarget) => Promise<void>
}

function TreeNodeComponent({ 
  node, 
  level, 
  selectedPageMetadata, 
  onPageSelect, 
  expandedNodes, 
  onToggleExpanded,
  selectedItemRef,
  onDragDrop
}: TreeNodeComponentProps) {
  const isExpanded = expandedNodes.has(node.metadata.pageId)
  const isSelected = selectedPageMetadata?.pageId === node.metadata.pageId
  const hasChildren = node.children && node.children.length > 0
  const textRef = useRef<HTMLDivElement>(null)
  const folderIconRef = useRef<HTMLDivElement>(null)

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false)
  const [dragOver, setDragOver] = useState<'none' | 'before' | 'inside' | 'after'>('none')
  const dragCounter = useRef(0)

  const handleClick = () => {
    // Always select the page when clicked (only if it's not a folder)
    if (!node.isFolder) {
      onPageSelect(node.metadata)
    }
    
    // If it's a folder with children, toggle expansion
    if (node.isFolder && hasChildren) {
      onToggleExpanded(node.metadata.pageId)
    }

    // DISABLED: Position text optimally to prevent unwanted scrolling on folder toggle
    // positionTextOptimally()
  }

  // Drag event handlers
  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation()
    setIsDragging(true)
    
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
  }

  const calculateDropPosition = (e: React.DragEvent): 'before' | 'inside' | 'after' => {
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const height = rect.height
    
    // Divide into three zones
    if (y < height * 0.25) {
      return 'before'
    } else if (y > height * 0.75 || !node.isFolder) {
      return 'after'
    } else {
      return 'inside' // Only for folders
    }
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++
    
    if (dragCounter.current === 1) {
      const position = calculateDropPosition(e)
      setDragOver(position)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    
    if (dragCounter.current === 0) {
      setDragOver('none')
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const position = calculateDropPosition(e)
    setDragOver(position)
    
    // Set the appropriate drop effect
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
      
      // Don't proceed if dragOver is 'none'
      if (dragOver === 'none') {
        return
      }
      
      const dropTarget = {
        targetPageId: node.metadata.pageId,
        targetPath: node.metadata.path,
        position: dragOver as 'before' | 'after' | 'inside'
      }
      
      // Call the drag drop handler if provided  
      if (onDragDrop) {
        await onDragDrop(dragData, dropTarget)
      }
      
    } catch (error) {
      console.error('Error handling drop:', error)
    } finally {
      setDragOver('none')
      dragCounter.current = 0
    }
  }

  const handleMouseEnter = () => {
    // DISABLED: Drag and drop functionality including horizontal scrolling
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
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          backgroundColor: 'var(--freeki-primary)',
          zIndex: 1000
        }
      }
    } else if (dragOver === 'after') {
      return {
        ...baseStyles,
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '2px',
          backgroundColor: 'var(--freeki-primary)',
          zIndex: 1000
        }
      }
    } else if (dragOver === 'inside') {
      return {
        ...baseStyles,
        backgroundColor: 'var(--freeki-primary)',
        opacity: 0.2
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
          mb: 0.25,
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
                expandedNodes={expandedNodes}
                onToggleExpanded={onToggleExpanded}
                selectedItemRef={selectedItemRef}
                onDragDrop={onDragDrop}
              />
            ))}
          </List>
        </Collapse>
      )}
    </>
  )
}

export default function FolderTree({ pageTree, selectedPageMetadata, onPageSelect, onSearch, searchQuery: externalSearchQuery, pageMetadata, semanticApi, onDragDrop }: FolderTreeProps) {
  const { settings, toggleExpandedNode } = useUserSettings()
  const containerRef = useRef<HTMLDivElement>(null)
  const selectedItemRef = useRef<HTMLLIElement>(null)
  const [filterText, setFilterText] = useState(externalSearchQuery || '')
  const [searchMode, setSearchMode] = useState<SearchMode>('titles')
  
  // Convert user settings expandedNodes array to Set for efficient lookups
  const expandedNodes = useMemo(() => new Set(settings.expandedNodes), [settings.expandedNodes])

  // Handle drag and drop operation at the FolderTree level
  const handleDragDropInTree = async (
    dragData: import('./pageTreeUtils').DragData, 
    dropTarget: import('./pageTreeUtils').DropTarget
  ) => {
    // DISABLED: Drag and drop is disabled since we removed sortOrder
    console.log('🚫 Drag and drop is disabled - using alphabetical sorting only')
    console.log('Attempted to drag:', dragData)
    console.log('Attempted to drop on:', dropTarget)
  }

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
  const expandedNodesForFiltering = useMemo(() => {
    if (!filterText.trim()) return expandedNodes
    
    const allExpandedNodes = new Set(expandedNodes)
    
    const collectFolderIds = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        if (node.isFolder && node.children) {
          allExpandedNodes.add(node.metadata.pageId)
          collectFolderIds(node.children)
        }
      }
    }
    
    // Expand all folders in filtered results
    collectFolderIds(filteredPageTree)
    
    return allExpandedNodes
  }, [filteredPageTree, expandedNodes, filterText])

  // Find path to selected page and auto-expand parents
  const getPathToPage = useMemo(() => {
    if (!selectedPageMetadata) return null
    
    const findPath = (nodes: TreeNode[], targetId: string, currentPath: string[] = []): string[] | null => {
      for (const node of nodes) {
        const newPath = [...currentPath, node.metadata.pageId]
        
        if (node.metadata.pageId === targetId) {
          return newPath
        }
        
        if (node.children) {
          const childPath = findPath(node.children, targetId, newPath)
          if (childPath) {
            return childPath
          }
        }
      }
      return null
    }
    
    return findPath(pageTree, selectedPageMetadata.pageId)
  }, [pageTree, selectedPageMetadata])

  // Auto-expand path to selected page when it changes
  useEffect(() => {
    if (getPathToPage) {
      // Expand all parent folders in the path (except the selected page itself)
      for (let i = 0; i < getPathToPage.length - 1; i++) {
        const nodeId = getPathToPage[i]
        if (!settings.expandedNodes.includes(nodeId)) {
          toggleExpandedNode(nodeId)
        }
      }
    }
  }, [getPathToPage, settings.expandedNodes, toggleExpandedNode])

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
  }, [selectedPageMetadata?.pageId]) // Remove expandedNodes dependency to prevent scroll on folder toggle

  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value
    setFilterText(newValue)
    
    // Call the parent's search handler if provided
    if (onSearch) {
      onSearch(newValue, searchMode)
    }
  }

  const handleToggleExpanded = (pageId: string) => {
    toggleExpandedNode(pageId)
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
          <List component="nav" dense disablePadding sx={{ 
            pt: 0.5,
            minWidth: 'fit-content',
            position: 'relative'
          }}>
            {filteredPageTree.map((node) => (
              <TreeNodeComponent
                key={node.metadata.pageId}
                node={node}
                level={0}
                selectedPageMetadata={selectedPageMetadata}
                onPageSelect={onPageSelect}
                expandedNodes={filterText.trim() ? expandedNodesForFiltering : expandedNodes}
                onToggleExpanded={handleToggleExpanded}
                selectedItemRef={selectedItemRef}
                onDragDrop={handleDragDropInTree}
              />
            ))}
          </List>
        </Box>
      )}
    </Box>
  )
}