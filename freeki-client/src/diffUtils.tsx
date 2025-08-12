import { diffChars } from 'diff';
import React from 'react';

export interface DiffPart {
  value: string;
  added?: boolean;
  removed?: boolean;
}

/**
 * Returns an array of diff parts for character-level changes between oldStr and newStr.
 */
export function getCharDiff(oldStr: string, newStr: string): DiffPart[] {
  return diffChars(oldStr, newStr);
}

/**
 * React component to render a character-level diff with highlights for additions and removals.
 * Usage: <DiffHighlighter oldText="foo bar" newText="foo baz" />
 */
export const DiffHighlighter: React.FC<{ oldText: string; newText: string }> = ({ oldText, newText }) => {
  const diff = getCharDiff(oldText, newText);
  return (
    <span>
      {diff.map((part: DiffPart, i: number) => {
        if (part.added) {
          // Blue for additions
          return <span key={i} style={{ background: '#d0e7ff', color: '#0033cc' }}>{part.value}</span>;
        }
        if (part.removed) {
          // Red for removals, with strikethrough
          return <span key={i} style={{ background: '#ffd6d6', color: '#cc0000', textDecoration: 'line-through' }}>{part.value}</span>;
        }
        // Shared characters, no decoration
        return <span key={i}>{part.value}</span>;
      })}
    </span>
  );
};
