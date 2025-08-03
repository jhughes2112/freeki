import { Box, Typography, Button } from '@mui/material'
import type { WikiPage } from './App'

interface PageEditorProps {
  page: WikiPage
  onSave: (content: string) => void
  onCancel: () => void
}

export default function PageEditor({ page, onSave, onCancel }: PageEditorProps) {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4">
        Editing: {page.title}
      </Typography>
      <Button onClick={() => onSave(page.content)}>Save</Button>
      <Button onClick={onCancel}>Cancel</Button>
    </Box>
  )
}