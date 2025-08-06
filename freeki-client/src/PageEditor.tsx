import { Box, Typography, Button } from '@mui/material'
import type { PageMetadata, PageContent } from './globalState'

interface PageEditorProps {
  metadata: PageMetadata
  content: PageContent
  onSave: (content: string) => void
  onCancel: () => void
}

export default function PageEditor({ metadata, content, onSave, onCancel }: PageEditorProps) {
  return (
    <Box sx={{ 
      p: 3,
      backgroundColor: 'var(--freeki-edit-background)',
      color: 'var(--freeki-p-font-color)',
      height: '100%'
    }}>
      <Typography 
        variant="h4" 
        sx={{ 
          color: 'var(--freeki-h1-font-color)', 
          fontSize: 'var(--freeki-h1-font-size)',
          mb: 2 
        }}
      >
        Editing: {metadata.title}
      </Typography>
      <Button onClick={() => onSave(content.content)} variant="contained" sx={{ mr: 1 }}>
        Save
      </Button>
      <Button onClick={onCancel} variant="outlined">
        Cancel
      </Button>
    </Box>
  )
}