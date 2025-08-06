import { Box, Typography, Paper, Divider } from '@mui/material'
import type { WikiPage } from './globalState'
import { themeStyles } from './themeUtils'

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
      backgroundColor: 'var(--freeki-view-background)',
      color: 'var(--freeki-p-font-color)'
    }}>
      <Box sx={{ mb: { xs: 2, sm: 2.5, md: 3 } }}>
        <Typography 
          variant="h4" 
          component="h1" 
          sx={{ 
            color: 'var(--freeki-h1-font-color)',
            fontSize: 'var(--freeki-h1-font-size)',
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
            ...themeStyles.paper,
            p: { xs: 1, sm: 2, md: 3 },
            backgroundColor: 'var(--freeki-view-background)',
            border: '1px solid var(--freeki-border-color)',
            boxShadow: 'none'
          }}>
            <Typography 
              variant="h6" 
              sx={{ 
                color: 'var(--freeki-p-font-color)',
                fontSize: 'var(--freeki-p-font-size)'
              }}
            >
              This is a folder. Select a page to view its content.
            </Typography>
          </Paper>
        ) : (
          <Paper sx={{ 
            ...themeStyles.paper,
            p: { xs: 1, sm: 2, md: 3 },
            backgroundColor: 'var(--freeki-view-background)',
            border: '1px solid var(--freeki-border-color)',
            boxShadow: 'none'
          }}>
            <Box 
              className="freeki-page-content"
              sx={{
                color: 'var(--freeki-p-font-color)',
                '& h1': { 
                  color: 'var(--freeki-h1-font-color)', 
                  fontSize: 'var(--freeki-h1-font-size)', 
                  fontWeight: 'bold', 
                  mb: 2 
                },
                '& h2': { 
                  color: 'var(--freeki-h2-font-color)', 
                  fontSize: 'var(--freeki-h2-font-size)', 
                  fontWeight: 'bold', 
                  mb: 1.5, 
                  mt: 3 
                },
                '& h3': { 
                  color: 'var(--freeki-h3-font-color)', 
                  fontSize: 'var(--freeki-h3-font-size)', 
                  fontWeight: 'bold', 
                  mb: 1, 
                  mt: 2 
                },
                '& p': { 
                  color: 'var(--freeki-p-font-color)', 
                  fontSize: 'var(--freeki-p-font-size)', 
                  mb: 2, 
                  lineHeight: 1.7 
                },
                '& ul': { mb: 2, pl: 3 },
                '& ol': { mb: 2, pl: 3 },
                '& li': { 
                  color: 'var(--freeki-p-font-color)', 
                  fontSize: 'var(--freeki-p-font-size)', 
                  mb: 0.5 
                }
              }}
              dangerouslySetInnerHTML={{ __html: page.content }} 
            />
          </Paper>
        )}
      </Box>
    </Box>
  )
}