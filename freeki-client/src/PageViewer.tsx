import { Box, Typography, Paper, Divider } from '@mui/material'
import type { WikiPage } from './App'

interface PageViewerProps {
  page: WikiPage
  onEdit: () => void
}

export default function PageViewer({ page }: PageViewerProps) {
  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      p: 3,
      backgroundColor: 'var(--freeki-view-mode-background)',
      color: 'var(--freeki-text-primary)'
    }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ color: 'var(--freeki-text-primary)' }}>
          {page.title}
        </Typography>
      </Box>

      <Divider sx={{ mb: 3, borderColor: 'var(--freeki-border-color)' }} />

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {page.isFolder ? (
          <Paper sx={{ 
            p: 3, 
            backgroundColor: 'var(--freeki-view-mode-background)',
            border: '1px solid var(--freeki-border-color)',
            boxShadow: 'none'
          }}>
            <Typography variant="h6" sx={{ color: 'var(--freeki-text-secondary)' }}>
              This is a folder. Select a page to view its content.
            </Typography>
          </Paper>
        ) : (
          <Paper sx={{ 
            p: 3,
            backgroundColor: 'var(--freeki-view-mode-background)',
            border: '1px solid var(--freeki-border-color)',
            boxShadow: 'none'
          }}>
            <Box 
              sx={{
                color: 'var(--freeki-text-primary)',
                '& h1': { fontSize: '2rem', fontWeight: 'bold', mb: 2, color: 'var(--freeki-text-primary)' },
                '& h2': { fontSize: '1.5rem', fontWeight: 'bold', mb: 1.5, mt: 3, color: 'var(--freeki-text-primary)' },
                '& h3': { fontSize: '1.25rem', fontWeight: 'bold', mb: 1, mt: 2, color: 'var(--freeki-text-primary)' },
                '& p': { mb: 2, lineHeight: 1.7, color: 'var(--freeki-text-primary)' },
                '& ul': { mb: 2, pl: 3 },
                '& ol': { mb: 2, pl: 3 },
                '& li': { mb: 0.5, color: 'var(--freeki-text-primary)' }
              }}
              dangerouslySetInnerHTML={{ __html: page.content }} 
            />
          </Paper>
        )}
      </Box>
    </Box>
  )
}