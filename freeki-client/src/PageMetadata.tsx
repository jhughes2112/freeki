import { Box, Typography, Paper, Chip, Stack } from '@mui/material'
import type { WikiPage } from './globalState'

interface PageMetadataProps {
  page: WikiPage
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

export default function PageMetadata({ page, onTagClick }: PageMetadataProps) {
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
      color: 'var(--freeki-text-primary)'
    }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: 'var(--freeki-text-primary)' }}>
        Page Details
      </Typography>

      {/* Tags Box */}
      <Paper sx={{ 
        p: 2, 
        mb: 2,
        backgroundColor: 'var(--freeki-page-details-background)',
        border: '1px solid var(--freeki-border-color)',
        boxShadow: 'none'
      }}>
        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1, color: 'var(--freeki-text-primary)' }}>
          Tags
        </Typography>
        <Stack direction="row" spacing={1}>
          {Array.isArray(page.tags) && page.tags.length > 0 ? (
            page.tags.map((tag: string) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                sx={{
                  backgroundColor: 'var(--freeki-view-mode-background)',
                  color: 'var(--freeki-text-primary)',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s',
                  boxShadow: 'none',
                  '&:hover': {
                    boxShadow: '0 0 0 2px var(--freeki-border-color)',
                    backgroundColor: 'var(--freeki-sidebar-hover-background)',
                  }
                }}
                onClick={() => onTagClick && onTagClick(tag)}
                aria-label={`Tag: ${tag}`}
              />
            ))
          ) : (
            <Typography variant="body2" sx={{ color: 'var(--freeki-text-secondary)' }}>No tags</Typography>
          )}
        </Stack>
      </Paper>

      {/* Page History Box */}
      <Paper sx={{ 
        p: 2, 
        mb: 2,
        backgroundColor: 'var(--freeki-page-details-background)',
        border: '1px solid var(--freeki-border-color)',
        boxShadow: 'none'
      }}>
        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1, color: 'var(--freeki-text-primary)' }}>
          Page History
        </Typography>
        <Stack spacing={1}>
          {fakeHistory.map((record) => (
            <Box key={record.version} sx={{ p: 1, borderRadius: 1, backgroundColor: record.version === page.version ? 'var(--freeki-sidebar-hover-background)' : 'transparent' }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'var(--freeki-text-primary)' }}>
                Version {record.version} {record.version === page.version ? '(Current)' : ''}
              </Typography>
              <Typography variant="body2" sx={{ color: 'var(--freeki-text-secondary)' }}>
                Author: {record.author} | Updated: {formatDate(record.updatedAt)}
              </Typography>
              <Typography variant="body2" sx={{ color: 'var(--freeki-text-primary)' }}>
                {record.summary}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Paper>

      {/* Statistics Box */}
      <Paper sx={{ 
        p: 2, 
        mb: 2,
        backgroundColor: 'var(--freeki-page-details-background)',
        border: '1px solid var(--freeki-border-color)',
        boxShadow: 'none'
      }}>
        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1, color: 'var(--freeki-text-primary)' }}>
          Statistics
        </Typography>
        <Typography variant="body2" sx={{ mb: 1, color: 'var(--freeki-text-primary)' }}>
          Path: {page.path}
        </Typography>
        <Typography variant="body2" sx={{ color: 'var(--freeki-text-primary)' }}>
          Words: {page.content.replace(/<[^>]*>/g, '').split(/\s+/).length}
        </Typography>
      </Paper>
    </Box>
  )
}