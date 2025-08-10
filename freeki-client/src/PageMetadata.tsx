import React, { useState } from 'react'
import { Box, Typography, Paper, Chip, Stack, Tooltip, TextField, IconButton, Collapse, Button, List, ListItem, ListItemText } from '@mui/material'
import { Close, Add, ExpandMore, ExpandLess } from '@mui/icons-material'
import type { PageMetadata, PageContent } from './globalState'
import { themeStyles } from './themeUtils'
import { createSemanticApi } from './semanticApiFactory'

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

// Revision cache to avoid repeated API calls
const revisionCache = new Map<string, PageMetadata[]>()
const versionCache = new Map<string, { metadata: PageMetadata; content: string }>()

export default function PageMetadataComponent({ metadata, content, onTagClick, onTagAdd, onTagRemove }: PageMetadataComponentProps) {
  const [newTagInput, setNewTagInput] = useState('')
  const [showRevisions, setShowRevisions] = useState(false)
  const [revisions, setRevisions] = useState<PageMetadata[]>([])
  const [loadingRevisions, setLoadingRevisions] = useState(false)
  const [currentRevisionIndex, setCurrentRevisionIndex] = useState(-1)
  const [viewingRevision, setViewingRevision] = useState<{ metadata: PageMetadata; content: string } | null>(null)

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

  const handleRevisionsToggle = async () => {
    if (!showRevisions && revisions.length === 0) {
      // Check cache first
      const cacheKey = `${metadata.pageId}`
      if (revisionCache.has(cacheKey)) {
        setRevisions(revisionCache.get(cacheKey)!)
      } else {
        // Load revisions for the first time
        setLoadingRevisions(true)
        try {
          const api = createSemanticApi()
          const history = await api.getPageHistory(metadata.pageId)
          setRevisions(history)
          revisionCache.set(cacheKey, history)
        } catch (error) {
          console.error('Failed to load page history:', error)
        } finally {
          setLoadingRevisions(false)
        }
      }
    }
    setShowRevisions(!showRevisions)
  }

  const loadRevisionContent = async (revision: PageMetadata, index: number) => {
    const cacheKey = `${metadata.pageId}-v${revision.version}`
    
    // Check cache first - never cache current version
    if (revision.version !== metadata.version && versionCache.has(cacheKey)) {
      const cached = versionCache.get(cacheKey)!
      setViewingRevision(cached)
      setCurrentRevisionIndex(index)
      return
    }

    try {
      const api = createSemanticApi()
      const oldVersion = await api.retrievePageVersion(metadata.pageId, revision.version)
      if (oldVersion) {
        const revisionData = {
          metadata: oldVersion.metadata,
          content: oldVersion.content
        }
        
        // Only cache if not current version
        if (revision.version !== metadata.version) {
          versionCache.set(cacheKey, revisionData)
        }
        
        setViewingRevision(revisionData)
        setCurrentRevisionIndex(index)
      }
    } catch (error) {
      console.error('Failed to retrieve page version:', error)
    }
  }

  const handleRevisionClick = (revision: PageMetadata, index: number) => {
    loadRevisionContent(revision, index)
  }

  const handleKeyDown = React.useCallback(async (e: KeyboardEvent) => {
    if (viewingRevision && revisions.length > 0) {
      if (e.key === 'ArrowUp' && currentRevisionIndex > 0) {
        e.preventDefault()
        const prevRevision = revisions[currentRevisionIndex - 1]
        await loadRevisionContent(prevRevision, currentRevisionIndex - 1)
      } else if (e.key === 'ArrowDown' && currentRevisionIndex < revisions.length - 1) {
        e.preventDefault()
        const nextRevision = revisions[currentRevisionIndex + 1]
        await loadRevisionContent(nextRevision, currentRevisionIndex + 1)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setViewingRevision(null)
        setCurrentRevisionIndex(-1)
      }
    }
  }, [viewingRevision, revisions, currentRevisionIndex])

  const closeRevisionView = () => {
    setViewingRevision(null)
    setCurrentRevisionIndex(-1)
  }

  React.useEffect(() => {
    if (viewingRevision) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [viewingRevision, handleKeyDown])

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

      {/* Revisions Section */}
      <Paper sx={{ 
        ...themeStyles.paper,
        p: 2,
        backgroundColor: 'var(--freeki-page-details-background)',
        border: '1px solid var(--freeki-border-color)',
        boxShadow: 'none'
      }}>
        <Button
          onClick={handleRevisionsToggle}
          disabled={loadingRevisions}
          sx={{
            width: '100%',
            justifyContent: 'space-between',
            color: 'var(--freeki-page-details-font-color)',
            fontSize: 'var(--freeki-page-details-font-size)',
            fontWeight: 600,
            textTransform: 'none',
            '&:hover': {
              backgroundColor: 'var(--freeki-folders-selected-background)'
            }
          }}
          endIcon={showRevisions ? <ExpandLess /> : <ExpandMore />}
        >
          {loadingRevisions ? 'Loading Revisions...' : 'Revisions'}
        </Button>
        
        <Collapse in={showRevisions}>
          <List sx={{ pt: 1 }}>
            {revisions.length === 0 ? (
              <ListItem sx={{ py: 1 }}>
                <ListItemText 
                  primary="No revision history available"
                  sx={{
                    '& .MuiListItemText-primary': {
                      color: 'var(--freeki-page-details-font-color)',
                      fontSize: 'var(--freeki-page-details-font-size)'
                    }
                  }}
                />
              </ListItem>
            ) : (
              revisions.map((revision, index) => (
                <ListItem 
                  key={`${revision.pageId}-v${revision.version}`}
                  component="div"
                  onClick={() => handleRevisionClick(revision, index)}
                  sx={{ 
                    py: 0.5,
                    px: 1,
                    borderRadius: 1,
                    cursor: 'pointer',
                    backgroundColor: currentRevisionIndex === index ? 'var(--freeki-folders-selected-background)' : 'transparent',
                    '&:hover': {
                      backgroundColor: 'var(--freeki-folders-selected-background)'
                    }
                  }}
                >
                  <ListItemText 
                    primary={
                      <Typography sx={{ 
                        color: 'var(--freeki-page-details-font-color)',
                        fontSize: 'var(--freeki-page-details-font-size)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        flexWrap: 'wrap'
                      }}>
                        <span style={{ fontWeight: 600 }}>V{revision.version}</span>
                        <span style={{ color: 'var(--freeki-border-color)' }}>•</span>
                        <span>{revision.author}</span>
                        <span style={{ color: 'var(--freeki-border-color)' }}>•</span>
                        <span>{formatTimeAgo(revision.lastModified)}</span>
                      </Typography>
                    }
                  />
                </ListItem>
              ))
            )}
          </List>
        </Collapse>
      </Paper>

      {/* Revision Viewer Modal */}
      {viewingRevision && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 2
          }}
          onClick={closeRevisionView}
        >
          <Box
            sx={{
              backgroundColor: 'var(--freeki-view-background)',
              borderRadius: 'var(--freeki-border-radius)',
              maxWidth: '90vw',
              maxHeight: '90vh',
              overflow: 'auto',
              p: 3,
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ color: 'var(--freeki-h1-font-color)' }}>
                {viewingRevision.metadata.title} - Version {viewingRevision.metadata.version}
              </Typography>
              <IconButton onClick={closeRevisionView} sx={{ color: 'var(--freeki-p-font-color)' }}>
                <Close />
              </IconButton>
            </Box>
            
            <Typography variant="body2" sx={{ color: 'var(--freeki-p-font-color)', mb: 1 }}>
              <strong>Author:</strong> {viewingRevision.metadata.author}
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--freeki-p-font-color)', mb: 2 }}>
              <strong>Modified:</strong> {new Date(viewingRevision.metadata.lastModified * 1000).toLocaleString()}
            </Typography>
            
            {revisions.length > 1 && (
              <Typography variant="caption" sx={{ color: 'var(--freeki-border-color)', mb: 2, display: 'block' }}>
                Use ?? arrow keys to navigate revisions, ESC to close
              </Typography>
            )}
            
            <Box 
              sx={{ 
                backgroundColor: 'var(--freeki-edit-background)',
                border: '1px solid var(--freeki-border-color)',
                borderRadius: 'var(--freeki-border-radius)',
                p: 2,
                maxHeight: '60vh',
                overflow: 'auto',
                fontFamily: 'monospace',
                fontSize: 'var(--freeki-p-font-size)',
                whiteSpace: 'pre-wrap',
                color: 'var(--freeki-p-font-color)'
              }}
            >
              {viewingRevision.content}
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  )
}