import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import type { PageContent } from './globalState';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import EditorToolbar from './EditorToolbar';

interface PageEditorProps {
  content: PageContent;
  onContentChange?: (content: string) => void;
}

export default function PageEditor({ content, onContentChange }: PageEditorProps) {
  const [editorContent, setEditorContent] = useState(content.content);
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] })
    ],
    content: editorContent,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setEditorContent(html);
      if (onContentChange) onContentChange(html);
    },
    editable: true,
  });

  // Toolbar action handler
  const handleFormat = (action: string) => {
    if (!editor) return;
    switch (action) {
      case 'h1': editor.chain().focus().toggleHeading({ level: 1 }).run(); break;
      case 'h2': editor.chain().focus().toggleHeading({ level: 2 }).run(); break;
      case 'h3': editor.chain().focus().toggleHeading({ level: 3 }).run(); break;
      case 'text': editor.chain().focus().setParagraph().run(); break;
      case 'bold': editor.chain().focus().toggleBold().run(); break;
      case 'italic': editor.chain().focus().toggleItalic().run(); break;
      case 'underline': editor.chain().focus().toggleUnderline().run(); break;
      case 'strikethrough': editor.chain().focus().toggleStrike().run(); break;
      case 'align-left': editor.chain().focus().setTextAlign('left').run(); break;
      case 'align-center': editor.chain().focus().setTextAlign('center').run(); break;
      case 'align-right': editor.chain().focus().setTextAlign('right').run(); break;
      case 'numbered-list': editor.chain().focus().toggleOrderedList().run(); break;
      case 'bulleted-list': editor.chain().focus().toggleBulletList().run(); break;
      case 'insert-page-link': /* TODO: implement page link */ break;
      case 'insert-url': /* TODO: implement url link */ break;
      case 'blockquote': editor.chain().focus().toggleBlockquote().run(); break;
      case 'horiz-line': editor.chain().focus().setHorizontalRule().run(); break;
      case 'insert-media': /* TODO: implement media insert */ break;
      default: break;
    }
  };

  // Keep editor in sync if content changes from outside
  useEffect(() => {
    if (editor && content.content !== editorContent) {
      editor.commands.setContent(content.content, { emitUpdate: false });
      setEditorContent(content.content);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content.content]);

  return (
    <Box sx={{ p: 0, backgroundColor: 'var(--freeki-edit-background)', color: 'var(--freeki-p-font-color)', height: '100%' }}>
      <EditorToolbar onFormat={handleFormat} />
      <EditorContent editor={editor} />
    </Box>
  );
}