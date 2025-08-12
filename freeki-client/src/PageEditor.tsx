import React, { useEffect, useRef, useState } from 'react';
import { Paper, Button, Box, TextField } from '@mui/material';
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

  // Popup state
  const [popup, setPopup] = useState<{ x: number; y: number; show: boolean }>({ x: 0, y: 0, show: false });
  const [textValue, setTextValue] = useState('');

  // Show popup on selection
  useEffect(() => {
    if (!editor) return;
    const handleMouseUp = (e: MouseEvent) => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setPopup(p => ({ ...p, show: false }));
        return;
      }
      // Only show if selection is inside the editor
      const anchorNode = selection.anchorNode;
      if (anchorNode && editor.view.dom.contains(anchorNode)) {
        setPopup({ x: e.clientX, y: e.clientY, show: true });
      } else {
        setPopup(p => ({ ...p, show: false }));
      }
    };
    const handleClick = (e: MouseEvent) => {
      // Hide popup if clicking outside
      if (!(e.target && (editor.view.dom.contains(e.target as Node)))) {
        setPopup(p => ({ ...p, show: false }));
      }
    };
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [editor]);

  // Copy as HTML
  const handleCopyHtml = () => {
    if (!editor) return;
    const html = editor.getHTML();
    navigator.clipboard.writeText(html);
    setPopup(p => ({ ...p, show: false }));
  };

  // Copy as Markdown
  const handleCopyMarkdown = () => {
    if (!editor) return;
    let markdown = '';
    try {
      // @ts-expect-error tiptap/markdown types are incomplete
      const serializer = new MarkdownSerializer();
      markdown = serializer.serialize(editor.state.doc);
    } catch {
      markdown = editor.getText();
    }
    navigator.clipboard.writeText(markdown);
    setPopup(p => ({ ...p, show: false }));
  };

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
      borderRadius: 0,
      display: 'flex',
      flexDirection: 'column',
      border: 'none',
      boxShadow: 'none',
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
        <div style={{ flex: 1, overflow: 'hidden', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="freeki-page-content" style={{ flex: '0 0 auto' }}>
            <EditorContent editor={editor} />
          </div>
        </div>
        {/* Virtual space for clicking below content */}
        <div
          style={{ flex: 1, minHeight: 120, cursor: 'text', background: 'none', border: 'none' }}
          onMouseDown={() => {
            if (editor) {
              editor.commands.focus('end');
            }
          }}
          aria-label="Click to focus editor"
        />
        {/* Selection popup */}
        {popup.show && (
          <Box
            sx={{
              position: 'fixed',
              left: popup.x,
              top: popup.y + 8,
              zIndex: 9999,
              background: 'white',
              border: '1px solid #ccc',
              borderRadius: 2,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              minWidth: 220,
              maxWidth: 320,
            }}
          >
            <Button variant="outlined" size="small" onClick={handleCopyHtml} sx={{ mb: 1 }}>
              Copy as HTML
            </Button>
            <Button variant="outlined" size="small" onClick={handleCopyMarkdown} sx={{ mb: 1 }}>
              Copy as Markdown
            </Button>
            <TextField
              multiline
              minRows={2}
              maxRows={6}
              value={textValue}
              onChange={e => setTextValue(e.target.value)}
              placeholder="Type here..."
              sx={{ mt: 1 }}
            />
          </Box>
        )}
      </div>
    </Paper>
  );
}