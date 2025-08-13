import React, { useEffect, useRef, useState } from 'react';
import { Paper, Button, Box, TextField, Typography, IconButton, Collapse, Popover } from '@mui/material';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import EditorToolbar from './EditorToolbar';
import { PlayArrow, ExpandMore, ExpandLess } from '@mui/icons-material';
import { useGlobalState, globalState } from './globalState';
import type { PageContent } from './globalState';
import { AIRequestor } from './AIRequestor';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { Plugin, PluginKey } from 'prosemirror-state';

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

  // AI prompt state
  const [aiPrompt, setAiPrompt] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const userSettings = useGlobalState('userSettings');
  const [aiUrl, setAiUrl] = useState(() => (userSettings.aiUrl || ''))
  const [aiToken, setAiToken] = useState(() => (userSettings.aiToken || ''))
  const [aiError, setAiError] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState('')

  // Add a ref to track the last selection string
  const lastSelectionRef = useRef<string | null>(null);

  // Ref to store the selected range
  const selectedRangeRef = useRef<Range | null>(null);

  // Add systemPrompt and instructions to user settings
  const [systemPrompt, setSystemPrompt] = useState(() => (userSettings.systemPrompt || 'You are a helpful assistant.'));
  const [instructions, setInstructions] = useState(() => (userSettings.instructions || 'Rewrite the selected text as requested.'));

  // Instead of popoverAnchor, use a boolean for showing the AI panel
  const [showAiPanel, setShowAiPanel] = useState(false);

  // Highlight state for replaced region
  const [highlight, setHighlight] = useState<{ from: number; to: number } | null>(null);

  // Track popup position
  const [popupY, setPopupY] = useState<number>(0);

  // Save AI settings to user settings
  const saveAiSettings = () => {
    globalState.setProperty('userSettings.aiUrl', aiUrl);
    globalState.setProperty('userSettings.aiToken', aiToken);
    globalState.setProperty('userSettings.systemPrompt', systemPrompt);
    globalState.setProperty('userSettings.instructions', instructions);
    setShowSettings(false);
  };

  // --- Highlight Plugin ---
  // Only create the plugin once
  const highlightPluginRef = useRef<Plugin | null>(null);
  if (!highlightPluginRef.current && editor) {
    highlightPluginRef.current = new Plugin({
      key: new PluginKey('highlight'),
      props: {
        decorations(state) {
          // Get the highlight decoration from plugin state
          const decoSet = highlightPluginRef.current?.getState(state);
          return decoSet || null;
        }
      },
      state: {
        init() { return null; },
        apply(tr, prev) {
          const meta = tr.getMeta('highlightDeco');
          if (meta !== undefined) return meta;
          return prev;
        }
      }
    });
    editor.registerPlugin(highlightPluginRef.current);
  }

  // Update the highlight decoration when needed
  useEffect(() => {
    if (!editor || !highlightPluginRef.current) return;
    if (!highlight) {
      editor.view.dispatch(editor.state.tr.setMeta('highlightDeco', null));
      return;
    }
    const deco = Decoration.inline(highlight.from, highlight.to, { style: 'background: var(--freeki-selection-background, #d5e9fb);' });
    const decoSet = DecorationSet.create(editor.state.doc, [deco]);
    editor.view.dispatch(editor.state.tr.setMeta('highlightDeco', decoSet));
  }, [highlight, editor]);

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

  // Show AI panel on selection
  useEffect(() => {
    if (!editor) return;
    const handleMouseUp = (e: MouseEvent) => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        lastSelectionRef.current = null;
        selectedRangeRef.current = null;
        setHighlight(null); // Remove highlight if nothing selected
        return;
      }
      // Only show if selection is inside the editor
      const anchorNode = selection.anchorNode;
      const selectedText = selection.toString();
      if (anchorNode && editor.view.dom.contains(anchorNode)) {
        // Save the current selection range
        if (selection.rangeCount > 0) {
          selectedRangeRef.current = selection.getRangeAt(0).cloneRange();
          // Highlight the selection immediately
          const range = selectedRangeRef.current;
          if (editor && editor.view) {
            const from = editor.view.posAtDOM(range.startContainer, range.startOffset);
            const to = editor.view.posAtDOM(range.endContainer, range.endOffset);
            setHighlight({ from, to });
          }
        }
        setPopupY(e.clientY);
        setShowAiPanel(true);
        lastSelectionRef.current = selectedText;
      } else {
        lastSelectionRef.current = null;
        selectedRangeRef.current = null;
        setHighlight(null);
      }
    };
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [editor]);

  // Replace handleAiPrompt with use of AIRequestor
  const handleAiPrompt = async () => {
    setAiError('');
    setAiResult('');
    if (!aiUrl) {
      setShowSettings(true);
      return;
    }
    setAiLoading(true);
    try {
      const selection = window.getSelection();
      const selectedText = selection && !selection.isCollapsed ? selection.toString() : '';
      const fullContent = editor?.getHTML() || '';
      const ai = new AIRequestor(aiUrl, aiToken, 'default');
      ai.system(systemPrompt)
        .assistant(fullContent)
        .user(instructions)
        .user(aiPrompt)
        .user(selectedText);
      const result = await ai.send();
      if (result.status >= 200 && result.status < 300) {
        if (editor && selectedRangeRef.current) {
          const range = selectedRangeRef.current;
          const from = editor.view.posAtDOM(range.startContainer, range.startOffset);
          const to = editor.view.posAtDOM(range.endContainer, range.endOffset);
          // Replace selection with AI result
          editor.view.dispatch(
            editor.state.tr.replaceWith(from, to, editor.schema.text(result.response))
          );
          // Highlight the replaced region (keep popup open, don't reselect, don't focus editor)
          setHighlight({ from, to: from + result.response.length });
        }
        setAiResult('');
      } else {
        setAiError(`AI request failed (${result.status}): ${result.response}`);
        setShowSettings(result.status === 400 || result.status === 500);
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Unknown error');
      setShowSettings(true);
    } finally {
      setAiLoading(false);
    }
  };

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
          {/* Click-to-focus parent wrapper */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div className="freeki-page-content" style={{ flex: '0 0 auto' }}>
              <EditorContent editor={editor} />
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
          </div>
        </div>
        {/* Selection popup using Popover */}
        <Popover
          open={showAiPanel}
          anchorReference="none"
          onClose={() => setShowAiPanel(false)}
          PaperProps={{
            sx: {
              position: 'fixed',
              top: popupY + 8,
              left: '50vw',
              transform: 'translateX(-50%)', // Center horizontally
              width: '80vw',
              minWidth: 320,
              maxWidth: '100vw',
              maxHeight: '80vh',
              overflow: 'auto',
              zIndex: 1300,
              background: 'white',
              border: '1px solid #ccc',
              borderRadius: 2,
              boxShadow: '0 2px 16px rgba(0,0,0,0.25)',
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              // Remove any transform: none that might be inherited
              '&': {
                transform: 'translateX(-50%) !important',
                transformOrigin: 'top center !important',
              },
            }
          }}
          disableAutoFocus
          disableEnforceFocus
          disableRestoreFocus
        >
          {/* Remove onFocus={restoreSelection} since we no longer restore DOM selection */}
          <Box tabIndex={-1}>
            <TextField
              label="Rewrite With AI"
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              size="small"
              aria-label="Rewrite With AI"
              multiline
              minRows={2}
              maxRows={6}
              fullWidth
              placeholder="Further instructions for the AI..."
              sx={{
                mt: 0,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'var(--freeki-admin-textfield-bg)',
                  color: 'var(--freeki-admin-textfield-font)',
                  fontWeight: 500,
                  borderRadius: 'var(--freeki-border-radius)',
                  fontSize: '1rem',
                  boxShadow: 'none',
                  '& fieldset': {
                    borderColor: 'var(--freeki-input-border)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'var(--freeki-input-border-hover, #7da4c7)',
                  }
                },
                '& .MuiInputLabel-root': {
                  color: 'var(--freeki-admin-textfield-font)',
                  fontWeight: 400
                }
              }}
              variant="outlined"
              InputLabelProps={{ shrink: true }}
              InputProps={{
                endAdornment: (
                  <>
                    <IconButton
                      aria-label="Run AI prompt"
                      onClick={handleAiPrompt}
                      disabled={aiLoading}
                      size="small"
                    >
                      <PlayArrow />
                    </IconButton>
                    <IconButton
                      aria-label={showSettings ? "Hide AI settings" : "Show AI settings"}
                      onClick={() => setShowSettings(v => !v)}
                      size="small"
                    >
                      {showSettings ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                  </>
                )
              }}
            />
            {aiLoading && <Typography variant="body2" sx={{ color: 'gray' }}>Running...</Typography>}
            {aiError && <Typography variant="body2" sx={{ color: 'red' }}>{aiError}</Typography>}
            {aiResult && <TextField value={aiResult} multiline minRows={2} maxRows={8} InputProps={{ readOnly: true }} sx={{ mt: 1 }} fullWidth />}
            {/* AI Settings Foldout */}
            <Collapse in={showSettings} timeout="auto" unmountOnExit>
              <Box sx={{ mt: 2, p: 1, border: '1px solid #eee', borderRadius: 1, background: '#fafafa', display: 'flex', flexDirection: 'column', gap: 2, maxHeight: '60vh', overflowY: 'auto' }}>
                <Button onClick={saveAiSettings} variant="contained" size="small" sx={{ alignSelf: 'flex-end', mb: 1 }}>Save</Button>
                <Typography variant="subtitle2">AI Model Settings</Typography>
                <TextField
                  label="AI Endpoint URL"
                  value={aiUrl}
                  onChange={e => setAiUrl(e.target.value)}
                  size="small"
                  fullWidth
                  sx={{ mb: 1 }}
                />
                <TextField
                  label="API Token (optional)"
                  value={aiToken}
                  onChange={e => setAiToken(e.target.value)}
                  size="small"
                  fullWidth
                  sx={{ mb: 1 }}
                />
                <TextField
                  label="System Prompt"
                  value={systemPrompt}
                  onChange={e => setSystemPrompt(e.target.value)}
                  size="small"
                  fullWidth
                  multiline
                  minRows={6}
                  maxRows={12}
                  sx={{ mb: 1 }}
                />
                <TextField
                  label="Instructions"
                  value={instructions}
                  onChange={e => setInstructions(e.target.value)}
                  size="small"
                  fullWidth
                  multiline
                  minRows={6}
                  maxRows={12}
                  sx={{ mb: 1 }}
                />
              </Box>
            </Collapse>
          </Box>
        </Popover>
      </div>
    </Paper>
  );
}