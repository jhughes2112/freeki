import React from 'react';
import { Box, IconButton, Tooltip, Divider } from '@mui/material';
import {
  FormatBold, FormatItalic, FormatUnderlined, StrikethroughS,
  FormatAlignLeft, FormatAlignCenter, FormatAlignRight,
  FormatListNumbered, FormatListBulleted, Link, InsertLink,
  FormatQuote, HorizontalRule, Image, Title, LooksOne, LooksTwo, Looks3
} from '@mui/icons-material';

interface EditorToolbarProps {
  onFormat: (action: string) => void;
}

const actions = [
  { key: 'h1', icon: <LooksOne />, label: 'Heading 1' },
  { key: 'h2', icon: <LooksTwo />, label: 'Heading 2' },
  { key: 'h3', icon: <Looks3 />, label: 'Heading 3' },
  { key: 'text', icon: <Title />, label: 'Normal Text' },
  { divider: true },
  { key: 'bold', icon: <FormatBold />, label: 'Bold' },
  { key: 'italic', icon: <FormatItalic />, label: 'Italic' },
  { key: 'underline', icon: <FormatUnderlined />, label: 'Underline' },
  { key: 'strikethrough', icon: <StrikethroughS />, label: 'Strikethrough' },
  { divider: true },
  { key: 'align-left', icon: <FormatAlignLeft />, label: 'Align Left' },
  { key: 'align-center', icon: <FormatAlignCenter />, label: 'Align Center' },
  { key: 'align-right', icon: <FormatAlignRight />, label: 'Align Right' },
  { divider: true },
  { key: 'numbered-list', icon: <FormatListNumbered />, label: 'Numbered List' },
  { key: 'bulleted-list', icon: <FormatListBulleted />, label: 'Bulleted List' },
  { divider: true },
  { key: 'insert-page-link', icon: <Link />, label: 'Insert Page Link' },
  { key: 'insert-url', icon: <InsertLink />, label: 'Insert URL' },
  { divider: true },
  { key: 'blockquote', icon: <FormatQuote />, label: 'Blockquote' },
  { key: 'horiz-line', icon: <HorizontalRule />, label: 'Horizontal Line' },
  { divider: true },
  { key: 'insert-media', icon: <Image />, label: 'Insert Media' },
];

export default function EditorToolbar({ onFormat }: EditorToolbarProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 0.5,
        px: 1,
        py: 0.5,
        borderBottom: '1px solid var(--freeki-border-color)',
        background: 'var(--freeki-edit-background)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        minHeight: 48,
        boxShadow: '0 2px 8px var(--freeki-shadow-color, #22222233)',
        overflowX: 'auto',
        overflowY: 'hidden',
        width: '100%'
      }}
      role="toolbar"
      aria-label="Editor formatting toolbar"
    >
      {actions.map((action, i) => {
        if (action.divider) {
          return <Divider key={i} orientation="vertical" flexItem sx={{ mx: 0.5 }} />;
        } else if (action.key) {
          return (
            <Tooltip key={action.key} title={action.label} arrow>
              <IconButton size="small" onClick={() => onFormat(action.key as string)} aria-label={action.label}>
                {action.icon}
              </IconButton>
            </Tooltip>
          );
        } else {
          return null;
        }
      })}
    </Box>
  );
}
