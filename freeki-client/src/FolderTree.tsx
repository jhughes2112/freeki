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
import { calculateHoverColor } from './colorUtils'

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
        {/* Expand/collapse button or spacer */}
        <ListItemIcon sx={{ 
          minWidth: 24, 
          color: 'var(--freeki-folders-font-color)',
          mr: 0.5
        }}>
          {page.isFolder && hasChildren ? (
            <IconButton
              size="small"
              onClick={handleExpandClick}
              sx={{ 
                p: 0.25, 
                color: 'var(--freeki-folders-font-color)',
                width: 20,
                height: 20
              }}
              aria-label={isExpanded ? `Collapse ${page.title}` : `Expand ${page.title}`}
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
          color: 'var(--freeki-folders-font-color)',
          mr: 0.75
        }}>
          {page.isFolder ? (
            isExpanded ? <FolderOpen fontSize="small" /> : <Folder fontSize="small" />
          ) : (
            <Description fontSize="small" />
          )}
        </ListItemIcon>
        
        {/* File/folder name */}
        <ListItemText
          primary={
            <Typography
              variant="body2"
              sx={{
                fontWeight: isSelected ? 600 : 400,
                color: 'var(--freeki-folders-font-color)',
                fontSize: 'var(--freeki-folders-font-size)',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                userSelect: 'none'
              }}
              title={page.title}
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
      color: 'var(--freeki-folders-font-color)',
      backgroundColor: 'var(--freeki-folders-background)',
      borderRadius: 'var(--freeki-border-radius)',
      '&::-webkit-scrollbar': {
        width: '8px',
      },
      '&::-webkit-scrollbar-track': {
        backgroundColor: 'transparent',
      },
      '&::-webkit-scrollbar-thumb': {
        backgroundColor: 'var(--freeki-border-color)',
        borderRadius: 'var(--freeki-border-radius)',
        '&:hover': {
          backgroundColor: 'var(--freeki-folders-font-color)',
          opacity: 0.3
        }
      }
    }}>
      <Typography variant="h6" sx={{ 
        p: 2, 
        pb: 1,
        fontWeight: 600,
        color: 'var(--freeki-folders-font-color)',
        fontSize: 'var(--freeki-folders-font-size)',
        borderBottom: `1px solid var(--freeki-border-color)`,
        mb: 0,
        userSelect: 'none'
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
          opacity: 0.6
        }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            No pages available
          </Typography>
          <Typography variant="caption">
            Create your first page to get started
          </Typography>
        </Box>
      ) : (
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
      )}
    </Box>
  )
}
