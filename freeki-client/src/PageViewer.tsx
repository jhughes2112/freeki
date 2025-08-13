import React from 'react';
import { Box, Paper } from '@mui/material';
import type { PageMetadata, PageContent } from './globalState';
import { themeStyles } from './themeUtils';
import { RichTextRenderer } from './RichTextRenderer';

interface PageViewerProps {
  metadata: PageMetadata;
  content: PageContent;
}

export default function PageViewer({ metadata, content }: PageViewerProps) {
  const isFolder = metadata.path.includes('/') && !metadata.path.endsWith('.md');

  if (isFolder) {
    return (
      <Paper sx={{
        ...themeStyles.paper,
        p: { xs: 1, sm: 2, md: 3 },
        backgroundColor: 'var(--freeki-view-background)',
        border: '1px solid var(--freeki-border-color)',
        boxShadow: 'none',
        height: '100%',
        m: 0,
        overflow: 'auto'
      }}>
        <Box sx={{ color: 'var(--freeki-p-font-color)', fontSize: 'var(--freeki-p-font-size)' }}>
          This is a folder. Select a page to view its content.
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{
      ...themeStyles.paper,
      p: 0,
      backgroundColor: 'var(--freeki-view-background)',
      border: '1px solid var(--freeki-border-color)',
      boxShadow: 'none',
      height: '100%',
      m: 0,
      borderRadius: 0,
      overflow: 'auto'
    }}>
      <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
        <RichTextRenderer content={content.content} />
      </div>
    </Paper>
  );
}