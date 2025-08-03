import React from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Box, Typography } from '@mui/material'

export default function Editor() {
  const editor = useEditor({
    extensions: [StarterKit],
    content: '<p>Start editing your wiki content here...</p>'
  })

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Page Editor
      </Typography>
      <Box sx={{
        border: '1px solid #ccc',
        borderRadius: 2,
        minHeight: '400px',
        p: 2
      }}>
        <EditorContent editor={editor} />
      </Box>
    </Box>
  )
}
