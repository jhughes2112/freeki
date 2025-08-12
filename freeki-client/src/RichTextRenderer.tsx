import React, { useEffect, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

interface RichTextRendererProps {
  content: string;
}

/**
 * Renders rich text (markdown or otherwise) using TipTap in read-only mode.
 */
export const RichTextRenderer: React.FC<RichTextRendererProps> = ({ content }) => {
  // Use a ref to avoid re-creating the editor on every render
  const lastContent = useRef<string>(content);
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    editable: false,
  });

  // Update content if it changes
  useEffect(() => {
    if (editor && content !== lastContent.current) {
		editor.commands.setContent(content, { emitUpdate: false });
      lastContent.current = content;
    }
  }, [content, editor]);

  if (!editor) return null;
  return <EditorContent editor={editor} />;
};
