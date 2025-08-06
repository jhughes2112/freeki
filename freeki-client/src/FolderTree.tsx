import React, { useState, useEffect, useMemo } from 'react'
import {
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  IconButton,
  Typography
} from '@mui/material'
import {
  ExpandMore,
  ChevronRight,
  Folder,
  FolderOpen,
  Description
} from '@mui/icons-material'
import type { WikiPage } from './globalState'

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
}

function TreeNode({ 
  page, 
  level, 
  selectedPage, 
  onPageSelect, 
  expandedNodes, 
  onToggleExpanded 
}: TreeNodeProps) {
  const isExpanded = expandedNodes.has(page.id)
  const isSelected = selectedPage.id === page.id
  const hasChildren = page.children && page.children.length > 0

  // Calculate background opacity based on depth - deeper items get slightly darker
  // Clamp opacity between 0.05 and 0.15, but never 0 or <0.05
  const backgroundOpacity = Math.max(0.05, Math.min(0.15, 0.05 + (level * 0.02)))
  const levelBackgroundColor = `rgba(0, 0, 0, ${backgroundOpacity})`

  const handleClick = () => {
    // Always select the page when clicked
    onPageSelect(page)
    
    // If it's a folder with children, also toggle expansion
    if (page.isFolder && hasChildren) {
      onToggleExpanded(page.id)
    }
  }

  const handleExpandClick = (event: React.MouseEvent) => {
    event.stopPropagation()
    onToggleExpanded(page.id)
  }

  return (
    <>
      <ListItem
        onClick={handleClick}
        sx={{
          pl: 1 + level * 1.5,
          pr: 1,
          py: 0.25,
          backgroundColor: isSelected 
            ? 'var(--freeki-sidebar-selected-background)' 
            : levelBackgroundColor,
          '&:hover': {
            backgroundColor: isSelected 
              ? 'var(--freeki-sidebar-selected-background)'
              : 'var(--freeki-sidebar-hover-background)'
          },
          borderRadius: 0,
          mx: 0,
          mb: 0,
          cursor: 'pointer',
          color: 'var(--freeki-text-primary)',
          minHeight: 32,
          alignItems: 'center',
          // Fix: never use rgba with normalized RGB values
        }}
      >
        {/* Expand/collapse button or spacer */}
        <ListItemIcon sx={{ 
          minWidth: 24, 
          color: 'var(--freeki-text-primary)',
          mr: 0.5
        }}>
          {page.isFolder && hasChildren ? (
            <IconButton
              size="small"
              onClick={handleExpandClick}
              sx={{ 
                p: 0.25, 
                color: 'var(--freeki-text-primary)',
                width: 20,
                height: 20
              }}
            >
              {isExpanded ? <ExpandMore fontSize="small" /> : <ChevronRight fontSize="small" />}
            </IconButton>
          ) : (
            <Box sx={{ width: 20 }} />
          )}
        </ListItemIcon>
        
        {/* File/folder icon */}
        <ListItemIcon sx={{ 
          minWidth: 20, 
          color: 'var(--freeki-text-primary)',
          mr: 0.75
        }}>
          {page.isFolder ? (
            isExpanded ? <FolderOpen fontSize="small" /> : <Folder fontSize="small" />
          ) : (
            <Description fontSize="small" />
          )}
        </ListItemIcon>
        
        {/* File/folder name - no word wrapping */}
        <ListItemText
          primary={
            <Typography
              variant="body2"
              sx={{
                fontWeight: isSelected ? 600 : 400,
                color: isSelected ? 'primary.main' : 'var(--freeki-text-primary)',
                fontSize: '0.875rem',
                lineHeight: 1.2,
                whiteSpace: 'nowrap', // Prevent word wrapping
                overflow: 'hidden',
                textOverflow: 'ellipsis', // Show ... if text is too long
                userSelect: 'none' // Prevent text selection like file explorer
              }}
              title={page.title} // Show full title on hover
            >
              {page.title}
            </Typography>
          }
          sx={{ m: 0 }}
        />
      </ListItem>
      
      {/* Children - only show if folder is expanded */}
      {page.isFolder && hasChildren && (
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <List component="div" disablePadding sx={{ borderLeft: level > 0 ? `1px solid rgba(0,0,0,0.1)` : 'none', ml: level > 0 ? 1.5 : 0 }}>
            {page.children?.map((child: WikiPage) => (
              <TreeNode
                key={child.id}
                page={child}
                level={level + 1}
                selectedPage={selectedPage}
                onPageSelect={onPageSelect}
                expandedNodes={expandedNodes}
                onToggleExpanded={onToggleExpanded}
              />
            ))}
          </List>
        </Collapse>
      )}
    </>
  )
}

export default function FolderTree({ pages, selectedPage, onPageSelect }: FolderTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

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
      const newExpanded = new Set(expandedNodes)
      // Expand all parent folders in the path (except the selected page itself)
      for (let i = 0; i < getPathToPage.length - 1; i++) {
        newExpanded.add(getPathToPage[i])
      }
      setExpandedNodes(newExpanded)
    }
  }, [getPathToPage])

  const handleToggleExpanded = (pageId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(pageId)) {
      newExpanded.delete(pageId)
    } else {
      newExpanded.add(pageId)
    }
    setExpandedNodes(newExpanded)
  }

  return (
    <Box sx={{ 
      height: '100%', 
      overflow: 'auto', 
      color: 'var(--freeki-text-primary)',
		  backgroundColor: 'var(--freeki-folders-background)',
      '&::-webkit-scrollbar': {
        width: '8px',
      },
      '&::-webkit-scrollbar-track': {
        backgroundColor: 'transparent',
      },
      '&::-webkit-scrollbar-thumb': {
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: '4px',
        '&:hover': {
          backgroundColor: 'rgba(0,0,0,0.3)',
        }
      }
    }}>
      <Typography variant="h6" sx={{ 
        p: 2, 
        pb: 1,
        fontWeight: 600,
        color: 'var(--freeki-text-primary)',
        fontSize: '1rem',
        borderBottom: '1px solid var(--freeki-border-color)',
        mb: 0,
        userSelect: 'none'
      }}>
        Pages
      </Typography>
      
      <List component="nav" dense disablePadding sx={{ pt: 0.5 }}>
        {pages.map((page) => (
          <TreeNode
            key={page.id}
            page={page}
            level={0}
            selectedPage={selectedPage}
            onPageSelect={onPageSelect}
            expandedNodes={expandedNodes}
            onToggleExpanded={handleToggleExpanded}
          />
        ))}
      </List>
    </Box>
  )
}
