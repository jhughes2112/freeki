import React from 'react'
import { Box, Typography, Paper, Chip, Stack, Tooltip, TextField, IconButton, Collapse, Button, List, ListItem, ListItemText } from '@mui/material'
import { Close, ExpandMore, ExpandLess } from '@mui/icons-material'
import type { PageMetadata, PageContent } from './globalState'
import { themeStyles } from './themeUtils'
import { useGlobalState } from './globalState'
import type { UserSettings } from './globalState'
import { ActiveTimeDelta, defaultFormatter } from './ActiveTimeDelta'
import { globalState } from './globalState'
import type { ISemanticApi } from './semanticApiInterface'

// Move helpers to top-level scope
function ensureCurrentRevisionInList(list: PageMetadata[], current: PageMetadata): PageMetadata[] {
  if (!list.some(r => r.version === current.version)) {
    return [current, ...list]
  }
  return list
}

// EnhancedTooltip for consistent tooltips
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
    componentsProps={{
      tooltip: { sx: { pointerEvents: 'none' } },
      popper: { sx: { pointerEvents: 'none' } }
    }}
  >
    {/* Just render children, don't try to force pointerEvents on them (causes TS error) */}
    {children}
  </Tooltip>
)

// Helper: get initials from name
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(part => part[0]?.toUpperCase() || '')
    .join('') 
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
export const revisionCache = new Map<string, PageMetadata[]>()
// Add a cache for revision content
const revisionContentCache = new Map<string, string>()

// PageMetadataComponentProps interface
interface PageMetadataComponentProps {
  metadata: PageMetadata
  content: PageContent
  semanticApi: ISemanticApi
  onTagClick?: (tag: string) => void
  onTagAdd?: (tag: string) => Promise<PageMetadata | null>
  onTagRemove?: (tag: string) => Promise<PageMetadata | null>
  onAuthorClick?: (author: string) => void
  onViewRevision?: (revision: { metadata: PageMetadata; content: string } | null) => void
  currentPageVersion: number // Pass the latest version for this pageId
  canEditTags?: boolean // NEW: disables tag add/remove if false
}

export default function PageMetadataComponent(props: PageMetadataComponentProps) {
  // Always use the metadata and content props for the current viewed revision
  const { metadata, content, semanticApi, onTagClick, onTagAdd, onTagRemove, onAuthorClick, onViewRevision, currentPageVersion, canEditTags } = props;
  const [newTagInput, setNewTagInput] = React.useState('')
  const [showRevisions, setShowRevisions]                 = React.useState(false)
  const [revisions, setRevisions]                        = React.useState<PageMetadata[]>([])
  const [loadingRevisions, setLoadingRevisions]          = React.useState(false)
  const [selectedRevisionVersion, setSelectedRevisionVersion] = React.useState<number>(metadata.version)
  const [now, setNow]                                    = React.useState(Date.now() / 1000)
  // Refs for measuring actual panel width
  const containerRef = React.useRef<HTMLDivElement>(null)
  const titleRef = React.useRef<HTMLDivElement>(null)
  const pathRef = React.useRef<HTMLDivElement>(null)
  // State for dynamic sizing based on actual panel width
  const [availableWidth, setAvailableWidth]              = React.useState(280)
  const [titleFontSize, setTitleFontSize]                = React.useState(18)

  // Use correct typing for userSettings
  const userSettings = useGlobalState('userSettings') as UserSettings
  const revisionTabOpen                                   = userSettings.revisionTabOpen

  // Sync local showRevisions with persisted user setting
  React.useEffect(() => {
    setShowRevisions(revisionTabOpen)
  }, [revisionTabOpen])

  // When current page or revision changes, always update selectedRevisionVersion
  React.useEffect(() => {
    setSelectedRevisionVersion(metadata.version)
  }, [metadata.version, metadata.pageId])

  // When current page changes OR revisions panel toggled open, (re)fetch revision history.
  React.useEffect(() => {
    let cancelled = false

    async function loadRevisions() {
      // Gate strictly on persisted revisionTabOpen (ensures history refresh follows user preference even across remounts)
      if (!revisionTabOpen) {
        setRevisions([])
        setSelectedRevisionVersion(metadata.version)
        return
      }

      setLoadingRevisions(true)
      try {
        // Always refetch on page change to guarantee fresh history; could add cache check later if desired
        const history = await semanticApi.getPageHistory(metadata.pageId)
        if (!cancelled) {
          const withCurrent = ensureCurrentRevisionInList(history, metadata)
          setRevisions(withCurrent)
          revisionCache.set(metadata.pageId, withCurrent)
          setSelectedRevisionVersion(metadata.version)
        }
      } catch (err) {
        if (!cancelled) {
          setRevisions([metadata])
          setSelectedRevisionVersion(metadata.version)
        }
      } finally {
        if (!cancelled) setLoadingRevisions(false)
      }
    }

    loadRevisions()
    return () => { cancelled = true }
  }, [metadata.pageId, metadata.version, revisionTabOpen, semanticApi])

  // When a revision is clicked, update selectedRevisionVersion and fetch content if needed
  const handleRevisionClick = async (revision: PageMetadata) => {
    setSelectedRevisionVersion(revision.version)
    if (revision.version !== metadata.version) {
      const cacheKey = `${revision.pageId}:${revision.version}`
      if (revisionContentCache.has(cacheKey)) {
        if (props.onViewRevision) {
          props.onViewRevision({ metadata: revision, content: revisionContentCache.get(cacheKey)! })
        }
      } else {
        try {
          const result = await semanticApi.retrievePageVersion(revision.pageId, revision.version)
          if (result && result.content && props.onViewRevision) {
            revisionContentCache.set(cacheKey, result.content)
            props.onViewRevision({ metadata: revision, content: result.content })
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('Failed to fetch revision content', err)
        }
      }
    } else {
      // If it's the current version, clear revision view
      if (props.onViewRevision) props.onViewRevision(null)
    }
  }

  // Use metadata and content props for all details
  const detailsMetadata = metadata
  const detailsContent = content

  React.useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now() / 1000)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // This is the only check you need:
  const isLatestRevision = metadata.version === currentPageVersion;
  const canEdit = canEditTags !== undefined ? canEditTags : isLatestRevision;

  // Fix: expect onTagAdd/onTagRemove to return Promise<PageMetadata|null>
  const handleAddTag = async () => {
    const tag = newTagInput.trim();
    if (tag && !detailsMetadata.tags.includes(tag) && onTagAdd) {
      const updatedMetadata = await onTagAdd(tag);
      setNewTagInput('');
      if (updatedMetadata) {
        setRevisions(prev => [updatedMetadata, ...prev.filter(r => r.version !== updatedMetadata.version)]);
        if (onViewRevision) {
          onViewRevision({ metadata: updatedMetadata, content: detailsContent.content });
        }
      }
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (onTagRemove) {
      const updatedMetadata = await onTagRemove(tagToRemove);
      if (updatedMetadata) {
        setRevisions(prev => [updatedMetadata, ...prev.filter(r => r.version !== updatedMetadata.version)]);
        if (onViewRevision) {
          onViewRevision({ metadata: updatedMetadata, content: detailsContent.content });
        }
      }
    }
  };

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
  React.useEffect(() => {
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

  // closeRevisionView function is no longer needed

  // Sort tags alphabetically
  const sortedTags = [...metadata.tags].sort((a, b) => a.localeCompare(b))

  // Sort revisions: always descending by version (newest to oldest)
  const sortedRevisions = React.useMemo(() => {
    return [...revisions].sort((a: PageMetadata, b: PageMetadata) => b.version - a.version)
  }, [revisions])

  // On mount, ensure revisionCache is populated for the current version
  React.useEffect(() => {
    // Only cache if not already present
    const cacheKey = `${metadata.pageId}`
    if (!revisionCache.has(cacheKey)) {
      revisionCache.set(cacheKey, [metadata])
    } else {
      // If the current version is not in the cache, add it
      const cached = revisionCache.get(cacheKey)!
      if (!cached.some(r => r.version === metadata.version)) {
        revisionCache.set(cacheKey, [metadata, ...cached])
      }
    }
  }, [metadata.pageId, metadata.version])

  // Handle author click - use callback to parent instead of direct global state
  const handleAuthorClick = () => {
    if (onAuthorClick) {
      onAuthorClick(detailsMetadata.author)
    }
  }

  return (
    <Box 
      ref={containerRef}
      sx={{ 
        p: 2, 
        height: '100%', 
        overflow: 'auto',
        backgroundColor: 'var(--freeki-page-details-background)',
        color: 'var(--freeki-page-details-font-color)',
        fontSize: 'var(--freeki-page-details-font-size)', // Ensure font size cascades
        fontFamily: 'inherit'
      }}
    >
      {/* Page Details Section - responsive title sizing based on actual panel width */}
      <Paper sx={{ 
        ...themeStyles.paper,
        p: 1, // Slim padding
        mb: 1.5,
        backgroundColor: 'var(--freeki-details-block-bg)',
        border: '1px solid var(--freeki-border-color)',
        boxShadow: 'none'
      }}>
        <Stack spacing={0.75} sx={{ alignItems: 'flex-end' }}>
          {/* Title with dynamic sizing based on actual panel width */}
          <Typography 
            ref={titleRef}
            sx={{ 
              color: 'var(--freeki-page-details-font-color)',
              fontSize: `${titleFontSize}px`, // Only title uses explicit size
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
          >
            {detailsMetadata.title}
          </Typography>
          {/* Path with smart truncation based on actual panel width */}
          <Tooltip title={detailsMetadata.path} arrow placement="top">
            <Typography 
              ref={pathRef}
              variant="body2" 
              sx={{ 
                color: 'var(--freeki-page-details-font-color)',
                fontSize: 'inherit',
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
              {getSmartTruncatedPath(detailsMetadata.path)}
            </Typography>
          </Tooltip>
          {/* By author name - clickable, with initials */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'var(--freeki-page-details-font-color)',
                fontSize: 'inherit',
                textAlign: 'right',
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                mr: 1
              }}
            >
              By 
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'var(--freeki-page-details-font-color)',
                fontSize: 'inherit',
                textAlign: 'right',
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                mr: 1,
                cursor: 'pointer',
                userSelect: 'text',
                '&:hover': {
                  textDecoration: 'none'
                }
              }}
              onClick={handleAuthorClick}
              aria-label={`Author: ${metadata.author}`}
            >
              {metadata.author}
            </Typography>
            <EnhancedTooltip title={metadata.author} placement="top">
              <Box sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 24,
                px: 1,
                py: '1px',
                fontWeight: 700,
                fontSize: 14,
                background: 'var(--freeki-border-color)',
                color: 'var(--freeki-page-details-font-color)',
                borderRadius: '3px',
                letterSpacing: '0.5px',
                lineHeight: 1.1,
                fontFamily: 'monospace',
                ml: 0,
                cursor: 'pointer',
                userSelect: 'text',
                '&:hover': {
                  textDecoration: 'none'
                }
              }}
              onClick={handleAuthorClick}
              aria-label={`Author initials: ${getInitials(metadata.author)}`}
              >
                {getInitials(metadata.author)}
              </Box>
            </EnhancedTooltip>
          </Box>
          {/* Each detail on its own line for narrow panel */}
          <Typography 
            variant="body2" 
            sx={{ 
              color: 'var(--freeki-page-details-font-color)',
              fontSize: 'inherit',
              textAlign: 'right',
              lineHeight: 1.2,
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              opacity: 0.8
            }}
          >
            <ActiveTimeDelta timestamp={detailsMetadata.lastModified} now={now} formatter={defaultFormatter} intervalMs={1000} />
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              color: 'var(--freeki-page-details-font-color)',
              fontSize: 'inherit',
              textAlign: 'right',
              lineHeight: 1.2,
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              opacity: 0.8
            }}
            title={`Version ${metadata.version}`}
          >
            Version {metadata.version}
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              color: 'var(--freeki-page-details-font-color)',
              fontSize: 'inherit',
              textAlign: 'right',
              lineHeight: 1.2,
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              opacity: 0.8
            }}
            title={`Word Count ${countWords(content.content)}`}
          >
            Word Count {countWords(content.content)}
          </Typography>
        </Stack>
      </Paper>

      {/* Tags Section - moved below page details */}
      <Paper sx={{ 
        ...themeStyles.paper,
        p: 1, // Slim padding
        mb: 1.5,
        backgroundColor: 'var(--freeki-tags-block-bg)',
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
                  backgroundColor: 'var(--freeki-tags-block-bg)',
                  filter: 'brightness(1.10)',
                  color: 'var(--freeki-page-details-font-color)',
                  fontSize: 'var(--freeki-page-details-font-size)',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s, background-color 0.15s',
                  boxShadow: 'none',
                  maxWidth: '200px',
                  '& .MuiChip-label': {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: 'var(--freeki-page-details-font-color)',
                    fontSize: 'var(--freeki-page-details-font-size)'
                  },
                  '&:hover': {
                    boxShadow: '0 0 0 2px var(--freeki-border-color)',
                    backgroundColor: 'var(--freeki-hover-background)',
                  }
                }}
                onClick={() => onTagClick && onTagClick(tag)}
                aria-label={`Tag: ${tag}`}
              />
              {/* Only show delete button if canEdit */}
              {canEdit && (
                <IconButton
                  className="tag-delete-button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    await handleRemoveTag(tag);
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
                  disabled={!canEdit}
                >
                  <Close />
                </IconButton>
              )}
            </Box>
          ))}
        </Stack>
        {/* Add new tag input - always rendered, but disabled if not latest revision */}
        <TextField
          size="small"
          placeholder="Add tag..."
          value={newTagInput}
          onChange={(e) => setNewTagInput(e.target.value)}
          onKeyPress={async (e) => {
            if (e.key === 'Enter' && canEdit) {
              e.preventDefault();
              await handleAddTag();
            }
          }}
          fullWidth
          disabled={!canEdit}
          sx={{
            fontSize: 'inherit',
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'var(--freeki-tags-block-bg)',
              filter: 'brightness(0.92)',
              borderRadius: 'var(--freeki-border-radius)',
              fontSize: 'inherit',
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
              color: 'var(--freeki-page-details-font-color)',
              fontSize: 'inherit',
              fontFamily: 'inherit'
            },
            '& .MuiInputBase-input::placeholder': {
              color: 'var(--freeki-page-details-font-color)',
              opacity: 0.7,
              fontSize: 'inherit',
              fontFamily: 'inherit'
            }
          }}
        />
      </Paper>

      {/* Revisions Section */}
      <Paper sx={{ 
        ...themeStyles.paper,
        p: 1, // Slim padding
        backgroundColor: 'var(--freeki-revision-block-bg)',
        border: '1px solid var(--freeki-border-color)',
        boxShadow: 'none'
      }}>
        <Button
          onClick={() => {
            const next = !showRevisions
            setShowRevisions(next)
            // Persist preference so reopening page keeps state
            if (next !== revisionTabOpen) {
              globalState.setProperty('userSettings.revisionTabOpen', next)
            }
          }}
          disabled={loadingRevisions}
          sx={{
            width: '100%',
            justifyContent: 'space-between',
            color: 'var(--freeki-page-details-font-color)',
            fontSize: 'var(--freeki-page-details-font-size)',
            fontWeight: 600,
            textTransform: 'none',
            '&:hover': {
              backgroundColor: 'var(--freeki-selection-background)'
            }
          }}
          endIcon={showRevisions ? <ExpandLess /> : <ExpandMore />}
        >
          {loadingRevisions ? 'Loading Revisions...' : 'Revisions'}
        </Button>
        <Collapse in={showRevisions}>
          <List sx={{ pt: 1, backgroundColor: 'var(--freeki-revision-block-bg)', borderRadius: 'var(--freeki-border-radius)' }}>
            {sortedRevisions.length === 0 ? (
              <ListItem sx={{ py: 1, backgroundColor: 'var(--freeki-revision-block-bg)' }}>
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
              sortedRevisions.map((revision: PageMetadata) => {
                return (
                  <ListItem 
                    key={`${revision.pageId}-v${revision.version}`}
                    component="div"
                    onClick={() => handleRevisionClick(revision)}
                    sx={{ 
                      py: 0.5,
                      px: 1,
                      borderRadius: 1,
                      cursor: 'pointer',
                      backgroundColor: revision.version === selectedRevisionVersion ? 'var(--freeki-selection-background)' : 'var(--freeki-revision-block-bg)',
                      border: '1px solid var(--freeki-border-color)',
                      transition: 'background 0.15s',
                      filter: revision.version === selectedRevisionVersion ? 'brightness(1.1)' : undefined,
                      '&:hover': {
                        backgroundColor: revision.version === selectedRevisionVersion ? 'var(--freeki-selection-background)' : 'var(--freeki-hover-background)',
                        filter: 'none'
                      }
                    }}
                  >
                    <ListItemText 
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden', fontSize: 'var(--freeki-page-details-font-size)', color: 'var(--freeki-page-details-font-color)' }}>
                          <Typography sx={{ fontWeight: 600, flexShrink: 0, fontFamily: 'monospace', fontSize: 'inherit', color: 'inherit' }}>v{revision.version}</Typography>
                          <EnhancedTooltip title={revision.author} placement="top">
                            <Box sx={{ fontSize: 'inherit', color: 'inherit', fontFamily: 'monospace', fontWeight: 700, cursor: 'pointer', userSelect: 'text', '&:hover': { textDecoration: 'none' } }}>
                              {getInitials(revision.author)}
                            </Box>
                          </EnhancedTooltip>
                          <EnhancedTooltip title={formatExactTime(revision.lastModified)} placement="top">
                            <Box sx={{ fontSize: 12, fontFamily: 'monospace', color: 'inherit', textAlign: 'right', whiteSpace: 'nowrap', ml: 0.5 }}>
                              <ActiveTimeDelta timestamp={revision.lastModified} now={now} formatter={defaultFormatter} intervalMs={1000} />
                            </Box>
                          </EnhancedTooltip>
                        </Box>
                      }
                    />
                  </ListItem>
                )
              })
            )}
          </List>
        </Collapse>
      </Paper>
    </Box>
  );
}

// Helper: format time for tooltip
const formatExactTime = (timestamp: number) => {
  return new Date(timestamp * 1000).toLocaleString()
}