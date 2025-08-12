import { Box, Typography, Paper, Divider, Button } from '@mui/material'
import type { PageMetadata, PageContent } from './globalState'
import { themeStyles } from './themeUtils'

interface PageViewerProps {
  metadata: PageMetadata
  content: PageContent
  isRevision?: boolean
  onExitRevision?: () => void
  currentContent?: string
}

// Simple line-by-line diff algorithm
function diffLines(oldStr: string, newStr: string) {
  const oldLines = oldStr.split('\n')
  const newLines = newStr.split('\n')
  const diffs = []
  let i = 0, j = 0
  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      diffs.push({ type: 'unchanged', text: oldLines[i] })
      i++
      j++
    } else if (j < newLines.length && (i >= oldLines.length || !oldLines.includes(newLines[j]))) {
      diffs.push({ type: 'added', text: newLines[j] })
      j++
    } else if (i < oldLines.length && (j >= newLines.length || !newLines.includes(oldLines[i]))) {
      diffs.push({ type: 'removed', text: oldLines[i] })
      i++
    } else {
      diffs.push({ type: 'changed', text: newLines[j] })
      i++
      j++
    }
  }
  return diffs
}

export default function PageViewer({ metadata, content, isRevision, onExitRevision, currentContent }: PageViewerProps) {
  const isFolder = metadata.path.includes('/') && !metadata.path.endsWith('.md')

  // If viewing a revision, show diff
  let diffBlocks = null
  if (isRevision && currentContent !== undefined) {
    const diffs = diffLines(content.content, currentContent)
    diffBlocks = diffs.map((d, idx) => {
      if (d.type === 'added') {
        return <div key={idx} style={{ background: '#cce6ff', color: '#003366', padding: '2px 6px', borderRadius: 3, margin: '2px 0' }}>{d.text}</div>
      } else if (d.type === 'removed') {
        return <div key={idx} style={{ background: '#ffd6d6', color: '#660000', padding: '2px 6px', borderRadius: 3, margin: '2px 0', textDecoration: 'line-through' }}>{d.text}</div>
      } else {
        return <div key={idx}>{d.text}</div>
      }
    })
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
              {isRevision && diffBlocks ? diffBlocks : <div dangerouslySetInnerHTML={{ __html: content.content }} />}
            </Box>
          </Paper>
        )}
      </Box>
    </Box>
  )
}