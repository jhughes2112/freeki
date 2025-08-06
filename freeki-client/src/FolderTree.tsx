import React, { useEffect, useMemo, useRef } from 'react'
import {
  Box,
  List,
  ListItem,
  ListItemIcon,
  Collapse,
  Typography
} from '@mui/material'
import {
  Folder,
  FolderOpen,
  Description
} from '@mui/icons-material'
import type { WikiPage } from './globalState'
import { useUserSettings } from './useUserSettings'

interface FolderTreeProps {
  pages: WikiPage[]
  selectedPage: WikiPage
  onPageSelect: (page: WikiPage) => void
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

export default function FolderTree({ pages, selectedPage, onPageSelect }: FolderTreeProps) {
  const { settings, toggleExpandedNode } = useUserSettings()
  const containerRef = useRef<HTMLDivElement>(null)
  const selectedItemRef = useRef<HTMLLIElement>(null)
  
  // Convert user settings expandedNodes array to Set for efficient lookups
  const expandedNodes = useMemo(() => new Set(settings.expandedNodes), [settings.expandedNodes])

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

  const handleToggleExpanded = (pageId: string) => {
    toggleExpandedNode(pageId)
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
      <Typography variant="h6" sx={{ 
        p: 2, 
        pb: 1,
        fontWeight: 600,
        color: 'var(--freeki-folders-font-color)',
        fontSize: 'var(--freeki-folders-font-size)',
        borderBottom: `1px solid var(--freeki-border-color)`,

        mb: 0,
        userSelect: 'none',
        flexShrink: 0
      }}>
        Pages
      </Typography>
      
      {pages.length === 0 ? (
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
            No pages available
          </Typography>
          <Typography variant="caption">
            Create your first page to get started
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
            {pages.map((page) => (
              <TreeNode
                key={page.id}
                page={page}
                level={0}
                selectedPage={selectedPage}
                onPageSelect={onPageSelect}
                expandedNodes={expandedNodes}
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
