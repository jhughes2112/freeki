import { Box, Typography, Paper, Divider, Button } from '@mui/material'
import type { PageMetadata, PageContent } from './globalState'
import { themeStyles } from './themeUtils'
import { DiffHighlighter } from './diffUtils'

interface PageViewerProps {
  metadata: PageMetadata
  content: PageContent
  isRevision?: boolean
  onExitRevision?: () => void
  currentContent?: string
}

export default function PageViewer({ metadata, content, isRevision, onExitRevision, currentContent }: PageViewerProps) {
  const isFolder = metadata.path.includes('/') && !metadata.path.endsWith('.md')

  // If viewing a revision, show diff for the whole text
  let diffBlock = null
  if (isRevision && currentContent !== undefined) {
    diffBlock = (
      <div>
        <DiffHighlighter oldText={content.content} newText={currentContent} />
      </div>
    )
  }

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      p: { xs: 1, sm: 2, md: 3 },
      backgroundColor: 'var(--freeki-view-background)',
      color: 'var(--freeki-p-font-color)'
    }}>
      <Box sx={{ mb: { xs: 2, sm: 2.5, md: 3 }, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography 
          variant="h4" 
          component="h1" 
          sx={{ 
            color: 'var(--freeki-h1-font-color)',
            fontSize: 'var(--freeki-h1-font-size)',
            fontWeight: 'bold'
          }}
        >
          {metadata.title}
        </Typography>
        {isRevision && onExitRevision && (
          <Button onClick={onExitRevision} sx={{ ml: 2 }} variant="outlined" color="primary">Exit Revision View</Button>
        )}
      </Box>

      <Divider sx={{ mb: { xs: 2, sm: 2.5, md: 3 }, borderColor: 'var(--freeki-border-color)' }} />

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {isFolder ? (
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
            >
              {isRevision && diffBlock ? diffBlock : <div dangerouslySetInnerHTML={{ __html: content.content }} />}
            </Box>
          </Paper>
        )}
      </Box>
    </Box>
  )
}