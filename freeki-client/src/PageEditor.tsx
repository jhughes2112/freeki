import React, { useEffect, useRef } from 'react';
import { Paper } from '@mui/material';
import type { PageContent } from './globalState';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import EditorToolbar from './EditorToolbar';

interface PageEditorProps {
  content: PageContent;
  onContentChange?: (content: string) => void;
  onEditingComplete?: (content: string) => void;
}

export default function PageEditor({ content, onContentChange, onEditingComplete }: PageEditorProps) {
  // Only set initial content once
  const initialContent = useRef(content.content);
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({ types: ['heading', 'paragraph'] })
    ],
    content: initialContent.current,
    onUpdate: ({ editor }) => {
      if (onContentChange) onContentChange(editor.getHTML());
    },
    editable: true,
  });

  // Expose a save/complete handler (e.g. Ctrl+S or blur)
  useEffect(() => {
    if (!editor || !onEditingComplete) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onEditingComplete(editor.getHTML());
      }
    };
    const handleBlur = () => {
      onEditingComplete(editor.getHTML());
    };
    const dom = editor.view.dom;
    dom.addEventListener('keydown', handleKeyDown);
    dom.addEventListener('blur', handleBlur);
    return () => {
      dom.removeEventListener('keydown', handleKeyDown);
      dom.removeEventListener('blur', handleBlur);
    };
  }, [editor, onEditingComplete]);

  return (
    <Paper sx={{
      p: 0,
      backgroundColor: 'var(--freeki-edit-background)',
      color: 'var(--freeki-p-font-color)',
      height: '100%',
      m: 0,
      borderRadius: 0 // Set border radius to 0px for page Paper
    }}>
      <div style={{
        width: '100%',
        overflowX: 'auto',
        overflowY: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}>
        <EditorToolbar onFormat={(action) => {
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
            case 'insert-page-link': break;
            case 'insert-url': break;
            case 'blockquote': editor.chain().focus().toggleBlockquote().run(); break;
            case 'horiz-line': editor.chain().focus().setHorizontalRule().run(); break;
            case 'insert-media': break;
            default: break;
          }
        }} />
        <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
          <div className="freeki-page-content">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </Paper>
  );
}