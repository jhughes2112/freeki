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
    <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
        Page Information
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
          Current Version
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Version {page.version || 1}
        </Typography>
        
        <Typography variant="body2" sx={{ mb: 1 }}>
          Author: {page.author || 'Unknown'}
        </Typography>
        
        <Typography variant="body2">
          Updated: {page.updatedAt ? formatDate(page.updatedAt) : 'Unknown'}
        </Typography>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
          Statistics
        </Typography>
        
        <Typography variant="body2" sx={{ mb: 1 }}>
          Created: {page.createdAt ? formatDate(page.createdAt) : 'Unknown'}
        </Typography>
        
        <Typography variant="body2" sx={{ mb: 1 }}>
          Path: {page.path}
        </Typography>
        
        <Typography variant="body2">
          Words: {page.content.replace(/<[^>]*>/g, '').split(/\s+/).length}
        </Typography>
      </Paper>
    </Box>
  )
}