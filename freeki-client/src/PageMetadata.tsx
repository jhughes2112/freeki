import { Box, Typography, Paper } from '@mui/material'
import type { WikiPage } from './App'

interface PageMetadataProps {
  page: WikiPage
}

export default function PageMetadata({ page }: PageMetadataProps) {
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
      backgroundColor: 'var(--freeki-metadata-panel-background)',
      color: 'var(--freeki-text-primary)'
    }}>
      <Typography variant="h6" sx={{ 
        mb: 2, 
        fontWeight: 'bold',
        color: 'var(--freeki-text-primary)'
      }}>
        Page Information
      </Typography>

      <Paper sx={{ 
        p: 2, 
        mb: 2,
        backgroundColor: 'var(--freeki-metadata-panel-background)',
        border: '1px solid var(--freeki-border-color)',
        boxShadow: 'none'
      }}>
        <Typography variant="subtitle2" fontWeight="bold" sx={{ 
          mb: 1,
          color: 'var(--freeki-text-primary)'
        }}>
          Current Version
        </Typography>
        
        <Typography variant="body2" sx={{ 
          mb: 1,
          color: 'var(--freeki-text-secondary)'
        }}>
          Version {page.version || 1}
        </Typography>
        
        <Typography variant="body2" sx={{ 
          mb: 1,
          color: 'var(--freeki-text-primary)'
        }}>
          Author: {page.author || 'Unknown'}
        </Typography>
        
        <Typography variant="body2" sx={{ color: 'var(--freeki-text-primary)' }}>
          Updated: {page.updatedAt ? formatDate(page.updatedAt) : 'Unknown'}
        </Typography>
      </Paper>

      <Paper sx={{ 
        p: 2, 
        mb: 2,
        backgroundColor: 'var(--freeki-metadata-panel-background)',
        border: '1px solid var(--freeki-border-color)',
        boxShadow: 'none'
      }}>
        <Typography variant="subtitle2" fontWeight="bold" sx={{ 
          mb: 1,
          color: 'var(--freeki-text-primary)'
        }}>
          Statistics
        </Typography>
        
        <Typography variant="body2" sx={{ 
          mb: 1,
          color: 'var(--freeki-text-primary)'
        }}>
          Created: {page.createdAt ? formatDate(page.createdAt) : 'Unknown'}
        </Typography>
        
        <Typography variant="body2" sx={{ 
          mb: 1,
          color: 'var(--freeki-text-primary)'
        }}>
          Path: {page.path}
        </Typography>
        
        <Typography variant="body2" sx={{ color: 'var(--freeki-text-primary)' }}>
          Words: {page.content.replace(/<[^>]*>/g, '').split(/\s+/).length}
        </Typography>
      </Paper>
    </Box>
  )
}