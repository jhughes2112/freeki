import { Box, Typography, Button } from '@mui/material'
import type { WikiPage } from './App'

interface PageEditorProps {
  page: WikiPage
  onSave: (content: string) => void
  onCancel: () => void
}

export default function PageEditor({ page, onSave, onCancel }: PageEditorProps) {
  return (
    <Box sx={{ 
      p: 3,
      backgroundColor: 'var(--freeki-edit-mode-background)',
      color: 'var(--freeki-text-primary)',
      height: '100%'
    }}>
      <Typography variant="h4" sx={{ color: 'var(--freeki-text-primary)', mb: 2 }}>
        Editing: {page.title}
      </Typography>
      <Button onClick={() => onSave(page.content)} variant="contained" sx={{ mr: 1 }}>
        Save
      </Button>
      <Button onClick={onCancel} variant="outlined">
        Cancel
      </Button>
    </Box>
  )
}