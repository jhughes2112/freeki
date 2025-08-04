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
      p: { xs: 1, sm: 2, md: 3 },
      backgroundColor: 'var(--freeki-view-mode-background)',
      color: 'var(--freeki-text-primary)'
    }}>
      <Box sx={{ mb: { xs: 2, sm: 2.5, md: 3 } }}>
        <Typography 
          variant="h4" 
          component="h1" 
          sx={{ 
            color: 'var(--freeki-text-primary)',
            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
            fontWeight: 'bold'
          }}
        >
          {page.title}
        </Typography>
      </Box>

      <Divider sx={{ mb: { xs: 2, sm: 2.5, md: 3 }, borderColor: 'var(--freeki-border-color)' }} />

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {page.isFolder ? (
          <Paper sx={{ 
            p: { xs: 1, sm: 2, md: 3 },
            backgroundColor: 'var(--freeki-view-mode-background)',
            border: '1px solid var(--freeki-border-color)',
            boxShadow: 'none'
          }}>
            <Typography 
              variant="h6" 
              sx={{ 
                color: 'var(--freeki-text-secondary)',
                fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' }
              }}
            >
              This is a folder. Select a page to view its content.
            </Typography>
          </Paper>
        ) : (
          <Paper sx={{ 
            p: { xs: 1, sm: 2, md: 3 },
            backgroundColor: 'var(--freeki-view-mode-background)',
            border: '1px solid var(--freeki-border-color)',
            boxShadow: 'none'
          }}>
            <Box 
              sx={{
                color: 'var(--freeki-text-primary)',
                '& h1': { fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' }, fontWeight: 'bold', mb: 2, color: 'var(--freeki-text-primary)' },
                '& h2': { fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' }, fontWeight: 'bold', mb: 1.5, mt: 3, color: 'var(--freeki-text-primary)' },
                '& h3': { fontSize: { xs: '1.1rem', sm: '1.25rem', md: '1.5rem' }, fontWeight: 'bold', mb: 1, mt: 2, color: 'var(--freeki-text-primary)' },
                '& p': { mb: 2, lineHeight: 1.7, color: 'var(--freeki-text-primary)', fontSize: { xs: '1rem', sm: '1.1rem', md: '1.15rem' } },
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