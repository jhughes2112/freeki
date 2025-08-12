import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import type { PageContent } from './globalState';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

interface PageEditorProps {
  content: PageContent;
  onContentChange?: (content: string) => void;
}

export default function PageEditor({ content, onContentChange }: PageEditorProps) {
  const [editorContent, setEditorContent] = useState(content.content);
  const editor = useEditor({
    extensions: [StarterKit],
    content: editorContent,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setEditorContent(html);
      if (onContentChange) onContentChange(html);
    },
    editable: true,
  });

  // Keep editor in sync if content changes from outside
  useEffect(() => {
    if (editor && content.content !== editorContent) {
      editor.commands.setContent(content.content, false);
      setEditorContent(content.content);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content.content]);

  return (
    <Box sx={{ p: 0, backgroundColor: 'var(--freeki-edit-background)', color: 'var(--freeki-p-font-color)', height: '100%' }}>
      <EditorContent editor={editor} />
    </Box>
  );
}