import React, { useState, useRef, useEffect } from 'react'
import { Box, Typography, Paper, Chip, Stack, Tooltip, TextField, IconButton, Collapse, Button, List, ListItem, ListItemText } from '@mui/material'
import { Close, Add, ExpandMore, ExpandLess } from '@mui/icons-material'
import type { PageMetadata, PageContent } from './globalState'
import { themeStyles } from './themeUtils'
import { createSemanticApi } from './semanticApiFactory'
import { globalState } from './globalState'

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
  
  // Refs for measuring actual panel widths
  const containerRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const pathRef = useRef<HTMLDivElement>(null)
  
  // State for dynamic sizing based on actual panel width
  const [availableWidth, setAvailableWidth] = useState(280) // Default metadata panel width
  const [titleFontSize, setTitleFontSize] = useState(18)

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

  // Handle author click - enable author search and search for this author
  const handleAuthorClick = () => {
    // Enable author search in the search config
    globalState.setProperty('userSettings.searchConfig.author', true)
    
    // Set the search query to the author name
    globalState.set('searchQuery', metadata.author)
  }

  // Measure container width and adjust title font size accordingly
  const measureAndAdjustSizing = () => {
    if (!containerRef.current || !titleRef.current) return
    
    const containerWidth = containerRef.current.getBoundingClientRect().width
    const usableWidth = containerWidth - 32 // Account for padding
    
    setAvailableWidth(usableWidth)
    
    // Measure title width at different font sizes to find the best fit
    const title = metadata.title
    const tempSpan = document.createElement('span')
    tempSpan.style.position = 'absolute'
    tempSpan.style.visibility = 'hidden'
    tempSpan.style.whiteSpace = 'nowrap'
    tempSpan.style.fontWeight = '600'
    tempSpan.style.lineHeight = '1.2'
    tempSpan.textContent = title
    document.body.appendChild(tempSpan)
    
    // Try different font sizes from 18px down to 14px
    let bestSize = 14
    for (let size = 18; size >= 14; size--) {
      tempSpan.style.fontSize = `${size}px`
      const width = tempSpan.getBoundingClientRect().width
      if (width <= usableWidth) {
        bestSize = size
        break
      }
    }
    
    document.body.removeChild(tempSpan)
    setTitleFontSize(bestSize)
  }

  // Smart path truncation based on actual available width
  const getSmartTruncatedPath = (path: string): string => {
    if (!pathRef.current) return path
    
    const tempSpan = document.createElement('span')
    tempSpan.style.position = 'absolute'
    tempSpan.style.visibility = 'hidden'
    tempSpan.style.fontFamily = 'monospace'
    tempSpan.style.fontSize = 'var(--freeki-page-details-font-size)'
    tempSpan.style.whiteSpace = 'nowrap'
    tempSpan.textContent = path
    document.body.appendChild(tempSpan)
    
    const fullWidth = tempSpan.getBoundingClientRect().width
    const maxWidth = availableWidth - 20 // Leave some margin
    
    if (fullWidth <= maxWidth) {
      document.body.removeChild(tempSpan)
      return path
    }
    
    // Path is too long, need to truncate from the start
    const pathParts = path.split('/')
    const filename = pathParts[pathParts.length - 1]
    
    // Try to fit as much as possible, prioritizing the filename
    tempSpan.textContent = '...' + filename
    let result = '...' + filename
    
    if (tempSpan.getBoundingClientRect().width <= maxWidth) {
      // Try to add more path components from the end
      for (let i = pathParts.length - 2; i >= 0; i--) {
        const testPath = '.../' + pathParts.slice(i).join('/')
        tempSpan.textContent = testPath
        if (tempSpan.getBoundingClientRect().width <= maxWidth) {
          result = testPath
        } else {
          break
        }
      }
    }
    
    document.body.removeChild(tempSpan)
    return result
  }

  // Set up resize observer to watch for panel width changes
  useEffect(() => {
    if (!containerRef.current) return
    
    const resizeObserver = new ResizeObserver(() => {
      measureAndAdjustSizing()
    })
    
    resizeObserver.observe(containerRef.current)
    
    // Initial measurement
    setTimeout(measureAndAdjustSizing, 0)
    
    return () => {
      resizeObserver.disconnect()
    }
  }, [metadata.title]) // Re-run when title changes

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

  // Sort tags alphabetically
  const sortedTags = [...metadata.tags].sort((a, b) => a.localeCompare(b))

  return (
    <Box 
      ref={containerRef}
      sx={{ 
        p: 2, 
        height: '100%', 
        overflow: 'auto',
        backgroundColor: 'var(--freeki-page-details-background)',
        color: 'var(--freeki-page-details-font-color)'
      }}
    >
      {/* Tags Section */}
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
          {sortedTags.map((tag: string) => (
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
                  // Handle overflow with ellipsis
                  maxWidth: '200px',
                  '& .MuiChip-label': {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  },
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

        {/* Add new tag input - full width, no + button */}
        <TextField
          size="small"
          placeholder="Add tag..."
          value={newTagInput}
          onChange={(e) => setNewTagInput(e.target.value)}
          onKeyPress={handleKeyPress}
          fullWidth
          sx={{
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
      </Paper>

      {/* Page Details Section - responsive title sizing based on actual panel width */}
      <Paper sx={{ 
        ...themeStyles.paper,
        p: 2, 
        mb: 2,
        backgroundColor: 'var(--freeki-page-details-background)',
        border: '1px solid var(--freeki-border-color)',
        boxShadow: 'none'
      }}>
        <Stack spacing={0.75} sx={{ alignItems: 'flex-end' }}>
          {/* Title with dynamic sizing based on actual panel width */}
          <Typography 
            ref={titleRef}
            sx={{ 
              color: 'var(--freeki-page-details-font-color)',
              fontSize: `${titleFontSize}px`,
              fontWeight: 600,
              textAlign: 'right',
              lineHeight: 1.2,
              wordBreak: 'break-word',
              hyphens: 'auto',
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical'
            }}
            title={metadata.title}
          >
            {metadata.title}
          </Typography>
          
          {/* Path with smart truncation based on actual panel width */}
          <Tooltip title={metadata.path} arrow placement="top">
            <Typography 
              ref={pathRef}
              variant="body2" 
              sx={{ 
                color: 'var(--freeki-page-details-font-color)',
                fontSize: 'var(--freeki-page-details-font-size)',
                textAlign: 'right',
                fontFamily: 'monospace',
                cursor: 'help',
                lineHeight: 1.2,
                opacity: 0.8,
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {getSmartTruncatedPath(metadata.path)}
            </Typography>
          </Tooltip>
          
          {/* By author name - clickable */}
          <Typography 
            component="span"
            variant="body2" 
            sx={{ 
              color: 'var(--freeki-page-details-font-color)',
              fontSize: 'var(--freeki-page-details-font-size)',
              textAlign: 'right',
              lineHeight: 1.2,
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            title={`By ${metadata.author}`}
          >
            By{' '}
            <Typography
              component="span"
              onClick={handleAuthorClick}
              sx={{
                color: 'var(--freeki-app-bar-background)',
                cursor: 'pointer',
                textDecoration: 'underline',
                textDecorationColor: 'transparent',
                transition: 'text-decoration-color 0.2s ease',
                '&:hover': {
                  textDecorationColor: 'var(--freeki-app-bar-background)'
                }
              }}
              title={`Click to search for pages by ${metadata.author}`}
            >
              {metadata.author}
            </Typography>
          </Typography>
          
          {/* Time ago with overflow handling */}
          <Typography 
            variant="body2" 
            sx={{ 
              color: 'var(--freeki-page-details-font-color)',
              fontSize: 'var(--freeki-page-details-font-size)',
              textAlign: 'right',
              lineHeight: 1.2,
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            title={formatTimeAgo(metadata.lastModified)}
          >
            {formatTimeAgo(metadata.lastModified)}
          </Typography>
          
          {/* Version with overflow handling */}
          <Typography 
            variant="body2" 
            sx={{ 
              color: 'var(--freeki-page-details-font-color)',
              fontSize: 'var(--freeki-page-details-font-size)',
              textAlign: 'right',
              lineHeight: 1.2,
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            title={`Version ${metadata.version}`}
          >
            Version {metadata.version}
          </Typography>
          
          {/* Word count with overflow handling */}
          <Typography 
            variant="body2" 
            sx={{ 
              color: 'var(--freeki-page-details-font-color)',
              fontSize: 'var(--freeki-page-details-font-size)',
              textAlign: 'right',
              lineHeight: 1.2,
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            title={`Word Count ${countWords(content.content)}`}
          >
            Word Count {countWords(content.content)}
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
                        flexWrap: 'wrap',
                        overflow: 'hidden'
                      }}>
                        <span style={{ fontWeight: 600, flexShrink: 0 }}>V{revision.version}</span>
                        <span style={{ color: 'var(--freeki-border-color)', flexShrink: 0 }}>•</span>
                        <span style={{ 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap',
                          minWidth: 0,
                          flex: 1
                        }} title={revision.author}>
                          {revision.author}
                        </span>
                        <span style={{ color: 'var(--freeki-border-color)', flexShrink: 0 }}>•</span>
                        <span style={{ flexShrink: 0 }} title={formatTimeAgo(revision.lastModified)}>
                          {formatTimeAgo(revision.lastModified)}
                        </span>
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