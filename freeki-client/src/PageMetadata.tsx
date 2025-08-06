import { Box, Typography, Paper, Chip, Stack } from '@mui/material'
import type { PageMetadata, PageContent } from './globalState'
import { themeStyles } from './themeUtils'

interface PageMetadataComponentProps {
  metadata: PageMetadata
  content: PageContent
  onTagClick?: (tag: string) => void
}

// Fake history records for demonstration
const fakeHistory = [
  {
    version: 3,
    author: 'John Doe',
    updatedAt: '2024-01-15T14:30:00Z',
    summary: 'Fixed typos and updated intro.'
  },
  {
    version: 2,
    author: 'John Doe',
    updatedAt: '2024-01-10T09:15:00Z',
    summary: 'Added new section.'
  },
  {
    version: 1,
    author: 'Jane Smith',
    updatedAt: '2024-01-01T10:00:00Z',
    summary: 'Initial page creation.'
  }
]

export default function PageMetadataComponent({ metadata, content, onTagClick }: PageMetadataComponentProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Box sx={{ 
      p: 2, 
      height: '100%', 
      overflow: 'auto',
      backgroundColor: 'var(--freeki-page-details-background)',
      color: 'var(--freeki-page-details-font-color)'
    }}>
      <Typography 
        variant="h6" 
        sx={{ 
          mb: 2, 
          fontWeight: 'bold', 
          color: 'var(--freeki-page-details-font-color)',
          fontSize: 'var(--freeki-page-details-font-size)'
        }}
      >
        Page Details
      </Typography>

      {/* Tags Box */}
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
          fontWeight="bold" 
          sx={{ 
            mb: 1, 
            color: 'var(--freeki-page-details-font-color)',
            fontSize: 'var(--freeki-page-details-font-size)'
          }}
        >
          Tags
        </Typography>
        <Stack direction="row" spacing={1}>
          {Array.isArray(metadata.tags) && metadata.tags.length > 0 ? (
            metadata.tags.map((tag: string) => (
              <Chip
                key={tag}
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
            ))
          ) : (
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'var(--freeki-page-details-font-color)',
                fontSize: 'var(--freeki-page-details-font-size)'
              }}
            >
              No tags
            </Typography>
          )}
        </Stack>
      </Paper>

      {/* Page History Box */}
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
          fontWeight="bold" 
          sx={{ 
            mb: 1, 
            color: 'var(--freeki-page-details-font-color)',
            fontSize: 'var(--freeki-page-details-font-size)'
          }}
        >
          Page History
        </Typography>
        <Stack spacing={1}>
          {fakeHistory.map((record) => (
            <Box 
              key={record.version} 
              sx={{ 
                p: 1, 
                borderRadius: 'var(--freeki-border-radius)', 
                backgroundColor: record.version === metadata.version ? 'var(--freeki-folders-selected-background)' : 'transparent' 
              }}
            >
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: 'bold', 
                  color: 'var(--freeki-page-details-font-color)',
                  fontSize: 'var(--freeki-page-details-font-size)'
                }}
              >
                Version {record.version} {record.version === metadata.version ? '(Current)' : ''}
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'var(--freeki-page-details-font-color)',
                  fontSize: 'var(--freeki-page-details-font-size)'
                }}
              >
                Author: {record.author} | Updated: {formatDate(record.updatedAt)}
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'var(--freeki-page-details-font-color)',
                  fontSize: 'var(--freeki-page-details-font-size)'
                }}
              >
                {record.summary}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Paper>

      {/* Statistics Box */}
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
          fontWeight="bold" 
          sx={{ 
            mb: 1, 
            color: 'var(--freeki-page-details-font-color)',
            fontSize: 'var(--freeki-page-details-font-size)'
          }}
        >
          Statistics
        </Typography>
        <Typography 
          variant="body2" 
          sx={{ 
            mb: 1, 
            color: 'var(--freeki-page-details-font-color)',
            fontSize: 'var(--freeki-page-details-font-size)'
          }}
        >
          Path: {metadata.path}
        </Typography>
        <Typography 
          variant="body2" 
          sx={{ 
            mb: 1, 
            color: 'var(--freeki-page-details-font-color)',
            fontSize: 'var(--freeki-page-details-font-size)'
          }}
        >
          Sort Order: {metadata.sortOrder}
        </Typography>
        <Typography 
          variant="body2" 
          sx={{ 
            color: 'var(--freeki-page-details-font-color)',
            fontSize: 'var(--freeki-page-details-font-size)'
          }}
        >
          Words: {content.content.replace(/<[^>]*>/g, '').split(/\s+/).length}
        </Typography>
      </Paper>
    </Box>
  )
}