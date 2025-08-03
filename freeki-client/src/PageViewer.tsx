import { Box, Typography, Paper, Divider } from '@mui/material'
import type { WikiPage } from './App'

interface PageViewerProps {
  page: WikiPage
  onEdit: () => void
}

export default function PageViewer({ page }: PageViewerProps) {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1">
          {page.title}
        </Typography>
      </Box>

      <Divider sx={{ mb: 3 }} />

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {page.isFolder ? (
          <Paper sx={{ p: 3, backgroundColor: 'grey.50' }}>
            <Typography variant="h6" color="text.secondary">
              This is a folder. Select a page to view its content.
            </Typography>
          </Paper>
        ) : (
          <Paper sx={{ p: 3 }}>
            <Box 
              sx={{
                '& h1': { fontSize: '2rem', fontWeight: 'bold', mb: 2, color: 'primary.main' },
                '& h2': { fontSize: '1.5rem', fontWeight: 'bold', mb: 1.5, mt: 3, color: 'primary.dark' },
                '& h3': { fontSize: '1.25rem', fontWeight: 'bold', mb: 1, mt: 2 },
                '& p': { mb: 2, lineHeight: 1.7 },
                '& ul': { mb: 2, pl: 3 },
                '& ol': { mb: 2, pl: 3 },
                '& li': { mb: 0.5 }
              }}
              dangerouslySetInnerHTML={{ __html: page.content }} 
            />
          </Paper>
        )}
      </Box>
    </Box>
  )
}