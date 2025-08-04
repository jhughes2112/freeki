import React, { useState } from 'react'
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
  Description
} from '@mui/icons-material'
import type { WikiPage } from './App'

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
    if (page.isFolder && hasChildren) {
      onToggleExpanded(page.id)
    }
    onPageSelect(page)
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
          pl: 2 + level * 2,
          backgroundColor: isSelected ? 'var(--freeki-sidebar-selected-background)' : 'transparent',
          '&:hover': {
            backgroundColor: 'var(--freeki-sidebar-hover-background)'
          },
          borderRadius: 1,
          mx: 1,
          mb: 0.5,
          cursor: 'pointer',
          color: 'var(--freeki-text-primary)'
        }}
      >
        <ListItemIcon sx={{ minWidth: 36, color: 'var(--freeki-text-primary)' }}>
          {page.isFolder && hasChildren ? (
            <IconButton
              size="small"
              onClick={handleExpandClick}
              sx={{ p: 0.5, color: 'var(--freeki-text-primary)' }}
            >
              {isExpanded ? <ExpandMore /> : <ChevronRight />}
            </IconButton>
          ) : (
            <Box sx={{ width: 24 }} />
          )}
        </ListItemIcon>
        
        <ListItemIcon sx={{ minWidth: 32, color: 'var(--freeki-text-primary)' }}>
          {page.isFolder ? <Folder /> : <Description />}
        </ListItemIcon>
        
        <ListItemText
          primary={
            <Typography
              variant="body2"
              sx={{
                fontWeight: isSelected ? 'bold' : 'normal',
                color: isSelected ? 'primary.main' : 'var(--freeki-text-primary)'
              }}
            >
              {page.title}
            </Typography>
          }
        />
      </ListItem>
      
      {page.isFolder && hasChildren && (
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {page.children?.map((child) => (
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
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['projects']))

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
      p: 1,
      color: 'var(--freeki-text-primary)'
    }}>
      <Typography variant="h6" sx={{ 
        p: 1, 
        fontWeight: 'bold',
        color: 'var(--freeki-text-primary)'
      }}>
        Pages
      </Typography>
      
      <List component="nav" dense>
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
