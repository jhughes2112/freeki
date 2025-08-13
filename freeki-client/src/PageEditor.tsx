import React, { useEffect, useRef } from 'react';
import { Paper } from '@mui/material';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import EditorToolbar from './EditorToolbar';
import type { PageContent, UserSettings } from './globalState';
import { AIRequestor } from './AIRequestor';
import { useGlobalState, globalState } from './globalState';

interface PageEditorProps {
  content: PageContent;
  onContentChange?: (content: string) => void;
  onEditingComplete?: (content: string) => void;
}

export default function PageEditor({ content, onContentChange, onEditingComplete }: PageEditorProps) {
  const initialContent = useRef(content.content);
  const userSettings = useGlobalState('userSettings') as UserSettings;
  const isEditing = useGlobalState('isEditing') as boolean;
  const selectionCounterRef = useRef(0);

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

  const currentSelectionRangeRef = useRef<Range | null>(null);

  // Push selection into global state
  useEffect(() => {
    if (!editor) return;

    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
        currentSelectionRangeRef.current = null;
        globalState.set('currentSelection', null);
        return;
      }
      const anchorNode = sel.anchorNode;
      if (!anchorNode || !editor.view.dom.contains(anchorNode)) {
        currentSelectionRangeRef.current = null;
        globalState.set('currentSelection', null);
        return;
      }

      const range = sel.getRangeAt(0).cloneRange();
      currentSelectionRangeRef.current = range;
      selectionCounterRef.current++;
      try {
        const from = editor.view.posAtDOM(range.startContainer, range.startOffset);
        const to = editor.view.posAtDOM(range.endContainer, range.endOffset);
        const text = sel.toString();
        globalState.set('currentSelection', { hasSelection: true, text, from, to, selectionId: selectionCounterRef.current });
      } catch {
        globalState.set('currentSelection', null);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [editor]);

  // Clear selection when leaving edit mode
  useEffect(() => {
    if (!isEditing) {
      globalState.set('currentSelection', null);
    }
  }, [isEditing]);

  // Listen for AI rewrite via global state not needed; still listen for custom event compatibility
  useEffect(() => {
    if (!editor) return;
    let cancelled = false;
    const handler = async (evt: Event) => {
      const custom = evt as CustomEvent<{ prompt: string }>;
      const selectionState = globalState.get('currentSelection');
      if (!selectionState || !currentSelectionRangeRef.current) {
        return;
      }
      const range = currentSelectionRangeRef.current;
      const aiUrl = userSettings.aiUrl || '';
      const aiToken = userSettings.aiToken || '';
      const systemPrompt = userSettings.systemPrompt || 'You are a helpful assistant.';
      const instructions = userSettings.instructions || 'Rewrite the selected text as requested.';
      if (!aiUrl) return;
      try {
        const selectionText = selectionState.text;
        if (!selectionText) return;
        const ai = new AIRequestor(aiUrl, aiToken, 'default');
        ai.system(systemPrompt)
          .assistant(editor.getHTML())
          .user(instructions)
          .user(custom.detail.prompt || '')
          .user(selectionText);
        const result = await ai.send();
        if (cancelled) return;
        if (result.status >= 200 && result.status < 300) {
          try {
            const from = editor.view.posAtDOM(range.startContainer, range.startOffset);
            const to = editor.view.posAtDOM(range.endContainer, range.endOffset);
            editor.view.dispatch(editor.state.tr.replaceWith(from, to, editor.schema.text(result.response)));
            // After replacement clear selection
            globalState.set('currentSelection', null);
          } catch {
            // Ignore mapping errors
          }
        }
      } catch {
        // Ignore errors for now
      }
    };
    document.addEventListener('freeki-ai-rewrite-request', handler as EventListener);
    return () => {
      cancelled = true;
      document.removeEventListener('freeki-ai-rewrite-request', handler as EventListener);
    };
  }, [editor, userSettings]);

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
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div className="freeki-page-content" style={{ flex: '0 0 auto' }}>
              <EditorContent editor={editor} />
            </div>
            <div
              style={{ flex: 1, minHeight: 120, cursor: 'text', background: 'none', border: 'none' }}
              onMouseDown={() => {
                if (editor) {
                  editor.commands.focus('end');
                }
              }}
              aria-label="Click to focus editor"
            />
          </div>
        </div>
      </div>
    </Paper>
  );
}