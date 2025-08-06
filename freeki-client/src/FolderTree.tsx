import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  List,
  ListItem,
  ListItemIcon,
  Collapse,
  Typography,
  TextField,
  IconButton,
  Tooltip
} from '@mui/material'
import {
  Folder,
  FolderOpen,
  Description,
  Clear
} from '@mui/icons-material'
import type { WikiPage } from './globalState'
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
  pages: WikiPage[]
  selectedPage: WikiPage
  onPageSelect: (page: WikiPage) => void
  onSearch?: (query: string, mode: SearchMode) => void
  searchQuery?: string
}

interface TreeNodeProps {
  page: WikiPage
  level: number
  selectedPage: WikiPage
  onPageSelect: (page: WikiPage) => void
  expandedNodes: Set<string>
  onToggleExpanded: (pageId: string) => void
  selectedItemRef?: React.RefObject<HTMLLIElement | null>
}

function TreeNode({ 
  page, 
  level, 
  selectedPage, 
  onPageSelect, 
  expandedNodes, 
  onToggleExpanded,
  selectedItemRef
}: TreeNodeProps) {
  const isExpanded = expandedNodes.has(page.id)
  const isSelected = selectedPage.id === page.id
  const hasChildren = page.children && page.children.length > 0
  const textRef = useRef<HTMLDivElement>(null)
  const folderIconRef = useRef<HTMLDivElement>(null)

  const handleClick = () => {
    // Always select the page when clicked
    onPageSelect(page)
    
    // If it's a folder with children, also toggle expansion
    if (page.isFolder && hasChildren) {
      onToggleExpanded(page.id)
    }

    // Position the text optimally when clicked
    positionTextOptimally()
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
          // This is the exact left edge of the icon we want to make visible
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
    positionTextOptimally()
  }

  const handleMouseLeave = () => {
    // Do nothing - keep the scroll position as requested
  }

  return (
    <>
      <ListItem
        ref={isSelected ? selectedItemRef : null}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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
          cursor: 'pointer',
          color: 'var(--freeki-folders-font-color)',
          fontSize: 'var(--freeki-folders-font-size)',
          minHeight: 32,
          alignItems: 'center',
          transition: 'all 0.2s ease-in-out'
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
          {page.isFolder ? (
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
              title={page.title}
            >
              {page.title}
            </Typography>
          </Box>
        </Box>
      </ListItem>
      
      {/* Children - only show if folder is expanded */}
      {page.isFolder && hasChildren && (
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <List component="div" disablePadding sx={{ 
            borderLeft: level > 0 ? `1px solid var(--freeki-border-color)` : 'none', 
            ml: level > 0 ? 1.5 : 0 
          }}>
            {page.children?.map((child: WikiPage) => (
              <TreeNode
                key={child.id}
                page={child}
                level={level + 1}
                selectedPage={selectedPage}
                onPageSelect={onPageSelect}
                expandedNodes={expandedNodes}
                onToggleExpanded={onToggleExpanded}
                selectedItemRef={selectedItemRef}
              />
            ))}
          </List>
        </Collapse>
      )}
    </>
  )
}

export default function FolderTree({ pages, selectedPage, onPageSelect, onSearch, searchQuery: externalSearchQuery }: FolderTreeProps) {
  const { settings, toggleExpandedNode } = useUserSettings()
  const containerRef = useRef<HTMLDivElement>(null)
  const selectedItemRef = useRef<HTMLLIElement>(null)
  const [filterText, setFilterText] = useState(externalSearchQuery || '')
  const [searchMode, setSearchMode] = useState<SearchMode>('titles')
  
  // Convert user settings expandedNodes array to Set for efficient lookups
  const expandedNodes = useMemo(() => new Set(settings.expandedNodes), [settings.expandedNodes])

  // Sort pages function - folders first, then alphabetically within each group
  const sortPages = (pageList: WikiPage[]): WikiPage[] => {
    return pageList
      .map(page => ({
        ...page,
        children: page.children ? sortPages(page.children) : undefined
      }))
      .sort((a, b) => {
        // First sort by type: folders before files
        if (a.isFolder && !b.isFolder) return -1
        if (!a.isFolder && b.isFolder) return 1
        
        // Then sort alphabetically by title within the same type
        return a.title.localeCompare(b.title)
      })
  }

  // Apply sorting to pages
  const sortedPages = useMemo(() => sortPages(pages), [pages])

  // Filter pages based on search text
  const filteredPages = useMemo(() => {
    if (!filterText.trim()) return sortedPages
    
    const filterLower = filterText.toLowerCase()
    
    const filterTree = (pageList: WikiPage[]): WikiPage[] => {
      return pageList.reduce((filtered: WikiPage[], page) => {
        let matches = false
        
        if (searchMode === 'titles') {
          matches = page.title?.toLowerCase()?.includes(filterLower) ?? false
        } else if (searchMode === 'metadata') {
          const titleMatch = page.title?.toLowerCase()?.includes(filterLower) ?? false
          const tagMatch = page.tags?.some(tag => tag.toLowerCase().includes(filterLower)) ?? false
          matches = titleMatch || tagMatch
        } else if (searchMode === 'fullContent') {
          // For full content search, fall back to metadata search locally for now
          // When using this mode, we should ideally make an API call
          const titleMatch = page.title?.toLowerCase()?.includes(filterLower) ?? false
          const tagMatch = page.tags?.some(tag => tag.toLowerCase().includes(filterLower)) ?? false
          const contentMatch = page.content?.toLowerCase()?.includes(filterLower) ?? false
          matches = titleMatch || tagMatch || contentMatch
        }
        
        const childMatches = page.children ? filterTree(page.children) : []
        
        if (matches || childMatches.length > 0) {
          filtered.push({
            ...page,
            children: childMatches.length > 0 ? childMatches : page.children
          })
        }
        
        return filtered
      }, [])
    }
    
    return filterTree(sortedPages)
  }, [sortedPages, filterText, searchMode])

  // Auto-expand all folders that contain matches when filtering
  const expandedNodesForFiltering = useMemo(() => {
    if (!filterText.trim()) return expandedNodes
    
    const allExpandedNodes = new Set(expandedNodes)
    
    const collectFolderIds = (pageList: WikiPage[]) => {
      for (const page of pageList) {
        if (page.isFolder && page.children) {
          allExpandedNodes.add(page.id)
          collectFolderIds(page.children)
        }
      }
    }
    
    // Expand all folders in filtered results
    collectFolderIds(filteredPages)
    
    return allExpandedNodes
  }, [filteredPages, expandedNodes, filterText])

  // Find path to selected page and auto-expand parents
  const getPathToPage = useMemo(() => {
    const findPath = (pages: WikiPage[], targetId: string, currentPath: string[] = []): string[] | null => {
      for (const page of pages) {
        const newPath = [...currentPath, page.id]
        
        if (page.id === targetId) {
          return newPath
        }
        
        if (page.children) {
          const childPath = findPath(page.children, targetId, newPath)
          if (childPath) {
            return childPath
          }
        }
      }
      return null
    }
    
    return findPath(pages, selectedPage.id)
  }, [pages, selectedPage.id])

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

  // Center the selected item in the container
  useEffect(() => {
    if (selectedItemRef.current && containerRef.current) {
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
  }, [selectedPage.id, expandedNodes])

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
  }, [externalSearchQuery]) // Remove filterText and searchMode from dependencies to prevent infinite loop

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
      overflow: 'hidden', // Prevent user scrolling
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
            autoComplete: 'off', // Disable browser autocomplete/history
            spellCheck: false // Disable spellcheck for search
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
                // Reset on hover
                backgroundColor: 'transparent',
              },
              '&.Mui-focused fieldset': {
                borderColor: 'var(--freeki-primary)',
                // Keep the background color on focus
                backgroundColor: 'transparent',
              },
            },
            '& .MuiInputBase-input': {
              py: 1.5,
              px: 2,
              // Match the height of list items
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
      
      {filteredPages.length === 0 ? (
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
            overflowY: 'auto', // Allow vertical scrolling for navigation
            overflowX: 'auto', // Allow horizontal scrolling but hide scrollbar
            position: 'relative',
            // Hide horizontal scrollbar while maintaining scroll functionality
            '&::-webkit-scrollbar:horizontal': {
              display: 'none'
            },
            scrollbarWidth: 'none', // Firefox
            msOverflowStyle: 'none' // IE/Edge
          }}
        >
          <List component="nav" dense disablePadding sx={{ 
            pt: 0.5,
            minWidth: 'fit-content', // Allow the list to extend beyond container width
            position: 'relative'
          }}>
            {filteredPages.map((page) => (
              <TreeNode
                key={page.id}
                page={page}
                level={0}
                selectedPage={selectedPage}
                onPageSelect={onPageSelect}
                expandedNodes={filterText.trim() ? expandedNodesForFiltering : expandedNodes}
                onToggleExpanded={handleToggleExpanded}
                selectedItemRef={selectedItemRef}
              />
            ))}
          </List>
        </Box>
      )}
    </Box>
  )
}