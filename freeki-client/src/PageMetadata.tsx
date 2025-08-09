import React, { useState } from 'react'
import { Box, Typography, Paper, Chip, Stack, Tooltip, TextField, IconButton } from '@mui/material'
import { Close, Add } from '@mui/icons-material'
import type { PageMetadata, PageContent } from './globalState'
import { themeStyles } from './themeUtils'

interface PageMetadataComponentProps {
  metadata: PageMetadata
  content: PageContent
  onTagClick?: (tag: string) => void
  onTagAdd?: (tag: string) => void
  onTagRemove?: (tag: string) => void
}

// Helper function to format time ago in a human-readable way
const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now() / 1000 // Convert to Unix timestamp
  const diff = now - timestamp
  
  if (diff < 60) {
    const seconds = Math.floor(diff)
    return `${seconds} second${seconds !== 1 ? 's' : ''} ago`
  } else if (diff < 3600) {
    const minutes = Math.floor(diff / 60)
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
  } else if (diff < 86400) {
    const hours = Math.floor(diff / 3600)
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  } else {
    const days = Math.floor(diff / 86400)
    return `${days} day${days !== 1 ? 's' : ''} ago`
  }
}

// Helper function to truncate file path from the beginning, showing end
const truncatePathFromStart = (path: string, maxLength: number = 30): string => {
  if (path.length <= maxLength) {
    return path
  }
  
  // Always show the last part (filename)
  const pathParts = path.split('/')
  const filename = pathParts[pathParts.length - 1]
  
  // If even the filename is too long, just truncate it
  if (filename.length >= maxLength - 3) {
    return '...' + filename.slice(filename.length - (maxLength - 3))
  }
  
  // Build path from the end until we hit the limit
  let result = filename
  for (let i = pathParts.length - 2; i >= 0; i--) {
    const testPath = pathParts[i] + '/' + result
    if (testPath.length + 3 > maxLength) { // +3 for "..."
      result = '...' + result
      break
    }
    result = testPath
  }
  
  return result
}

// Helper function to count words in content (strip HTML/markdown and count words)
const countWords = (content: string): number => {
  return content
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[#*_`~]/g, '') // Remove common markdown formatting
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0).length
}

export default function PageMetadataComponent({ metadata, content, onTagClick, onTagAdd, onTagRemove }: PageMetadataComponentProps) {
  const [newTagInput, setNewTagInput] = useState('')

  const handleAddTag = () => {
    const tag = newTagInput.trim()
    if (tag && !metadata.tags.includes(tag) && onTagAdd) {
      onTagAdd(tag)
      setNewTagInput('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    if (onTagRemove) {
      onTagRemove(tagToRemove)
    }
  }

  return (
    <Box sx={{ 
      p: 2, 
      height: '100%', 
      overflow: 'auto',
      backgroundColor: 'var(--freeki-page-details-background)',
      color: 'var(--freeki-page-details-font-color)'
    }}>
      {/* Tags Section - always show with title */}
      <Paper sx={{ 
        ...themeStyles.paper,
        p: 2, 
        mb: 2,
        backgroundColor: 'var(--freeki-page-details-background)',
        border: '1px solid var(--freeki-border-color)',
        boxShadow: 'none'
      }}>
        <Typography 
          variant="subtitle2" 
          sx={{ 
            color: 'var(--freeki-page-details-font-color)',
            fontSize: 'var(--freeki-page-details-font-size)',
            fontWeight: 600,
            mb: 1.5
          }}
        >
          Tags
        </Typography>
        
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {metadata.tags.map((tag: string) => (
            <Box 
              key={tag} 
              sx={{ 
                position: 'relative',
                '&:hover .tag-delete-button': {
                  opacity: 1
                }
              }}
            >
              <Chip
                label={tag}
                size="small"
                sx={{
                  backgroundColor: 'var(--freeki-view-background)',
                  color: 'var(--freeki-p-font-color)',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s',
                  boxShadow: 'none',
                  '&:hover': {
                    boxShadow: '0 0 0 2px var(--freeki-border-color)',
                    backgroundColor: 'var(--freeki-folders-selected-background)',
                  }
                }}
                onClick={() => onTagClick && onTagClick(tag)}
                aria-label={`Tag: ${tag}`}
              />
              <IconButton
                className="tag-delete-button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemoveTag(tag)
                }}
                sx={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  width: 16,
                  height: 16,
                  backgroundColor: '#dc3545',
                  color: 'white',
                  opacity: 0,
                  transition: 'opacity 0.2s',
                  '&:hover': {
                    backgroundColor: '#c02633',
                    opacity: 1
                  },
                  '& .MuiSvgIcon-root': {
                    fontSize: '12px'
                  }
                }}
                aria-label={`Remove tag: ${tag}`}
              >
                <Close />
              </IconButton>
            </Box>
          ))}
        </Stack>

        {/* Add new tag input */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Add tag..."
            value={newTagInput}
            onChange={(e) => setNewTagInput(e.target.value)}
            onKeyPress={handleKeyPress}
            sx={{
              flex: 1,
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'var(--freeki-view-background)',
                borderRadius: 'var(--freeki-border-radius)',
                fontSize: 'var(--freeki-page-details-font-size)',
                '& fieldset': {
                  borderColor: 'var(--freeki-border-color)'
                },
                '&:hover fieldset': {
                  borderColor: 'var(--freeki-border-color)'
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'var(--freeki-app-bar-background)'
                }
              },
              '& .MuiInputBase-input': {
                color: 'var(--freeki-p-font-color)',
                fontSize: 'var(--freeki-page-details-font-size)'
              }
            }}
          />
          <IconButton
            onClick={handleAddTag}
            disabled={!newTagInput.trim() || metadata.tags.includes(newTagInput.trim())}
            sx={{
              color: 'var(--freeki-app-bar-background)',
              '&:disabled': {
                color: 'var(--freeki-border-color)'
              }
            }}
            aria-label="Add tag"
          >
            <Add />
          </IconButton>
        </Box>
      </Paper>

      {/* Page Info Section - compact format without labels */}
      <Paper sx={{ 
        ...themeStyles.paper,
        p: 2, 
        mb: 2,
        backgroundColor: 'var(--freeki-page-details-background)',
        border: '1px solid var(--freeki-border-color)',
        boxShadow: 'none'
      }}>
        <Stack spacing={1}>
          {/* Path with tooltip */}
          <Tooltip title={metadata.path} arrow placement="top">
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'var(--freeki-page-details-font-color)',
                fontSize: 'var(--freeki-page-details-font-size)',
                cursor: 'help',
                fontFamily: 'monospace'
              }}
            >
              {truncatePathFromStart(metadata.path)}
            </Typography>
          </Tooltip>
          
          {/* Last modified with author */}
          <Typography 
            variant="body2" 
            sx={{ 
              color: 'var(--freeki-page-details-font-color)',
              fontSize: 'var(--freeki-page-details-font-size)'
            }}
          >
            Last modified by {metadata.author} {formatTimeAgo(metadata.lastModified)}
          </Typography>
          
          {/* Version and word count on same line */}
          <Typography 
            variant="body2" 
            sx={{ 
              color: 'var(--freeki-page-details-font-color)',
              fontSize: 'var(--freeki-page-details-font-size)'
            }}
          >
            V{metadata.version} - {countWords(content.content)} words
          </Typography>
        </Stack>
      </Paper>
    </Box>
  )
}