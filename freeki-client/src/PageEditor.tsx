import React, { useEffect, useRef } from 'react';
import { Paper } from '@mui/material';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { Extension } from '@tiptap/core';
import EditorToolbar from './EditorToolbar';
import type { PageContent, UserSettings } from './globalState';
import { AIRequestor } from './AIRequestor';
import { useGlobalState, globalState } from './globalState';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

// Extension to render a highlight decoration over stored selection when active
const SelectionHighlightExtension = Extension.create({
  name: 'selectionHighlight',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('selectionHighlight'),
        props: {
          decorations: (state) => {
            const data = (window as unknown as { freekiHighlightSelectionData?: { active: boolean; from: number; to: number } }).freekiHighlightSelectionData;
            if (!data || !data.active) return null;
            const from = data.from;
            const to = data.to;
            if (typeof from !== 'number' || typeof to !== 'number' || from === to) return null;
            try {
              return DecorationSet.create(state.doc, [Decoration.inline(from, to, { class: 'freeki-ai-selection-highlight' })]);
            } catch {
              return null;
            }
          }
        }
      })
    ];
  }
});

// Inject highlight CSS once
function ensureHighlightCss() {
  if (document.getElementById('freeki-ai-selection-highlight-style')) return;
  const style = document.createElement('style');
  style.id = 'freeki-ai-selection-highlight-style';
  style.textContent = `
    .freeki-ai-selection-highlight {
      background: rgba(255, 200, 0, 0.35);
      box-shadow: 0 0 0 1px rgba(255, 170, 0, 0.8) inset;
      border-radius: 2px;
      transition: background 0.15s ease;
    }
  `;
  document.head.appendChild(style);
}

interface PageEditorProps {
  content: PageContent;
  onContentChange?: (content: string) => void;
  onEditingComplete?: (content: string) => void;
}

// Highlight selection data interface
interface HighlightSelectionData { active: boolean; from: number; to: number }

export default function PageEditor({ content, onContentChange, onEditingComplete }: PageEditorProps) {
  const initialContent = useRef(content.content);
  const userSettings = useGlobalState('userSettings') as UserSettings;
  const isEditing = useGlobalState('isEditing') as boolean;
  const selectionCounterRef = useRef(0);
  const highlightActiveRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      SelectionHighlightExtension
    ],
    content: initialContent.current,
    onUpdate: ({ editor }) => {
      if (onContentChange) onContentChange(editor.getHTML());
    },
    editable: true,
  });

  const currentSelectionRangeRef = useRef<Range | null>(null);

  // Highlight hover event handling (panel hover toggles decoration)
  useEffect(() => {
    if (!editor) return;
    ensureHighlightCss();

    const enterHandler = () => {
      highlightActiveRef.current = true;
      const selState = globalState.get('currentSelection') as { hasSelection: boolean; from: number; to: number } | null;
      if (selState && selState.hasSelection) {
        (window as unknown as { freekiHighlightSelectionData?: HighlightSelectionData }).freekiHighlightSelectionData = { active: true, from: selState.from, to: selState.to };
        editor.view.dispatch(editor.state.tr.setMeta('selectionHighlight', true));
      }
    };
    const leaveHandler = () => {
      highlightActiveRef.current = false;
      (window as unknown as { freekiHighlightSelectionData?: HighlightSelectionData }).freekiHighlightSelectionData = { active: false, from: 0, to: 0 };
      editor.view.dispatch(editor.state.tr.setMeta('selectionHighlight', false));
    };

    document.addEventListener('freeki-ai-panel-hover-enter', enterHandler as EventListener);
    document.addEventListener('freeki-ai-panel-hover-leave', leaveHandler as EventListener);
    return () => {
      document.removeEventListener('freeki-ai-panel-hover-enter', enterHandler as EventListener);
      document.removeEventListener('freeki-ai-panel-hover-leave', leaveHandler as EventListener);
    };
  }, [editor]);

  // Push selection into global state; preserve when focusing AI panel
  useEffect(() => {
    if (!editor) return;

    const handleSelectionChange = () => {
      const active = document.activeElement as HTMLElement | null;
      const inAiPanel = !!(active && active.closest && active.closest('#freeki-ai-rewrite-panel'));
      const sel = window.getSelection();

      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
        // Only clear if not inside AI panel and not showing highlight
        if (!inAiPanel && !highlightActiveRef.current) {
          currentSelectionRangeRef.current = null;
          globalState.set('currentSelection', null);
          (window as unknown as { freekiHighlightSelectionData?: HighlightSelectionData }).freekiHighlightSelectionData = { active: false, from: 0, to: 0 };
          if (editor) editor.view.dispatch(editor.state.tr.setMeta('selectionHighlight', false));
        }
        return;
      }

      const anchorNode = sel.anchorNode;
      if (!anchorNode || !editor.view.dom.contains(anchorNode)) {
        if (!inAiPanel) {
          currentSelectionRangeRef.current = null;
          globalState.set('currentSelection', null);
          (window as unknown as { freekiHighlightSelectionData?: HighlightSelectionData }).freekiHighlightSelectionData = { active: false, from: 0, to: 0 };
          if (editor) editor.view.dispatch(editor.state.tr.setMeta('selectionHighlight', false));
        }
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
        if (highlightActiveRef.current) {
          (window as unknown as { freekiHighlightSelectionData?: HighlightSelectionData }).freekiHighlightSelectionData = { active: true, from, to };
          editor.view.dispatch(editor.state.tr.setMeta('selectionHighlight', true));
        }
      } catch {
        // Leave existing selection if mapping fails
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [editor]);

  // Clear selection when leaving edit mode
  useEffect(() => {
    if (!isEditing) {
      globalState.set('currentSelection', null);
      (window as unknown as { freekiHighlightSelectionData?: HighlightSelectionData }).freekiHighlightSelectionData = { active: false, from: 0, to: 0 };
      if (editor) editor.view.dispatch(editor.state.tr.setMeta('selectionHighlight', false));
    }
  }, [isEditing, editor]);

  // AI rewrite handler (formatted HTML insertion)
  useEffect(() => {
    if (!editor) return;
    let cancelled = false;

    const extractHtml = (raw: string): string => {
      let output = raw.trim();
      if (output.startsWith('```')) {
        const fenced = output.match(/^```[a-zA-Z0-9]*\n([\s\S]*?)```$/);
        if (fenced) output = fenced[1].trim(); else output = output.replace(/^```[a-zA-Z0-9]*\n?/, '').replace(/```$/, '').trim();
      }
      const bodyMatch = output.match(/<body[^>]*>([\s\S]*?)<\/body>/i); if (bodyMatch) output = bodyMatch[1].trim();
      const htmlMatch = output.match(/<html[^>]*>([\s\S]*?)<\/html>/i); if (htmlMatch) output = htmlMatch[1].trim();
      output = output.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
      return output;
    };

    const handler = async (evt: Event) => {
      const custom = evt as CustomEvent<{ prompt: string }>;
      const selectionState = globalState.get('currentSelection') as { hasSelection: boolean; text: string } | null;
      if (!selectionState || !currentSelectionRangeRef.current) return;
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
            const html = extractHtml(result.response);
            let success = false;
            try { editor.chain().focus().setTextSelection({ from, to }).deleteRange({ from, to }).insertContent(html).run(); success = true; } catch { success = false; }
            if (!success) { editor.view.dispatch(editor.state.tr.replaceWith(from, to, editor.schema.text(html))); }
            globalState.set('currentSelection', null);
            (window as unknown as { freekiHighlightSelectionData?: HighlightSelectionData }).freekiHighlightSelectionData = { active: false, from: 0, to: 0 };
            editor.view.dispatch(editor.state.tr.setMeta('selectionHighlight', false));
          } catch { /* ignore mapping errors */ }
        }
      } catch { /* ignore errors */ }
    };

    document.addEventListener('freeki-ai-rewrite-request', handler as EventListener);
    return () => { cancelled = true; document.removeEventListener('freeki-ai-rewrite-request', handler as EventListener); };
  }, [editor, userSettings]);

  useEffect(() => {
    if (!editor || !onEditingComplete) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); onEditingComplete(editor.getHTML()); }
    };
    const handleBlur = () => { onEditingComplete(editor.getHTML()); };
    const dom = editor.view.dom;
    dom.addEventListener('keydown', handleKeyDown);
    dom.addEventListener('blur', handleBlur);
    return () => { dom.removeEventListener('keydown', handleKeyDown); dom.removeEventListener('blur', handleBlur); };
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
        overflowY: 'auto',
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
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'auto' }}>
			<div className="freeki-page-content" style={{ flex: 1, position: 'relative', cursor: 'text' }}
				onMouseDown={() => { if (editor) { editor.commands.focus('end'); } }}
				aria-label="Click to focus editor at end">
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>
      </div>
    </Paper>
  );
}