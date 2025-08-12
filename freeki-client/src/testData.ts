// TEST DATA FOR ALPHABETICAL TREE CONSTRUCTION
// This file contains all sample data for testing - clean alphabetical sorting with files before folders
// This is temporary test data that can be easily removed when no longer needed.

import type { PageMetadata } from './globalState'

// Simulate different timestamps for each revision
const now = Math.floor(Date.now() / 1000)

// Multiple revisions for each page (simulate history)
export const testPageMetadata: PageMetadata[] = [
  // Welcome Page revisions
  {
    pageId: 'page-1',
    title: 'Welcome to FreeKi',
    author: 'Alice Smith',
    path: 'welcome.md',
    tags: ['intro', 'start'],
    lastModified: now - 3600 * 24 * 3, // 3 days ago
    version: 1
  },
  {
    pageId: 'page-1',
    title: 'Welcome to FreeKi',
    author: 'Alice Smith',
    path: 'welcome.md',
    tags: ['intro', 'start', 'updated'],
    lastModified: now - 3600 * 24 * 2, // 2 days ago
    version: 2
  },
  {
    pageId: 'page-1',
    title: 'Welcome to FreeKi',
    author: 'Bob Johnson',
    path: 'welcome.md',
    tags: ['intro', 'start', 'updated', 'final'],
    lastModified: now - 3600 * 24, // 1 day ago
    version: 3
  },
  // Getting Started revisions
  {
    pageId: 'page-2',
    title: 'Getting Started',
    author: 'Carol Lee',
    path: 'getting-started.md',
    tags: ['guide'],
    lastModified: now - 3600 * 12, // 12 hours ago
    version: 1
  },
  {
    pageId: 'page-2',
    title: 'Getting Started',
    author: 'Carol Lee',
    path: 'getting-started.md',
    tags: ['guide', 'update'],
    lastModified: now - 3600 * 6, // 6 hours ago
    version: 2
  },
  {
    pageId: 'page-2',
    title: 'Getting Started',
    author: 'Dan Miller',
    path: 'getting-started.md',
    tags: ['guide', 'update', 'final'],
    lastModified: now - 3600 * 2, // 2 hours ago
    version: 3
  }
]

// Sample content for all test pages and fallback content, keyed by pageId and version
export const testPageContent: Record<string, string> = {
  // Welcome Page revisions
  'page-1:1': `# Welcome to FreeKi\n\nWelcome to FreeKi, the open-source knowledge base for teams that want to get things done without the bloat.\n\n## Why FreeKi?\n\n- Simple markdown editing\n- Fast search\n- Git-powered versioning\n- No vendor lock-in\n\nThis is the very first version.\n\n## Getting Started\n\nTo create your first page, click the "+ New Page" button in the sidebar.\n\n---\n\nHappy collaborating!`,
  'page-1:2': `# Welcome to FreeKi\n\nWelcome to FreeKi, the open-source knowledge base for teams that want to get things done without the bloat.\n\n## Why FreeKi?\n\n- Simple markdown editing\n- Fast search\n- Git-powered versioning\n- No vendor lock-in\n- Real-time collaboration\n\nThis is the second version. Added more info.\n\n## Getting Started\n\nTo create your first page, click the "+ New Page" button in the sidebar.\n\nYou can also import existing markdown files.\n\n---\n\nHappy collaborating!`,
  'page-1:3': `# Welcome to FreeKi\n\nWelcome to FreeKi, the open-source knowledge base for teams that want to get things done without the bloat.\n\n## Why FreeKi?\n\n- Simple markdown editing\n- Fast search\n- Git-powered versioning\n- No vendor lock-in\n- Real-time collaboration\n- Customizable themes\n\nThis is the final version. All done!\n\n## Getting Started\n\nTo create your first page, click the "+ New Page" button in the sidebar.\n\nYou can also import existing markdown files, or drag and drop images.\n\n---\n\nHappy collaborating!`,
  // Getting Started revisions
  'page-2:1': `# Getting Started\n\nWelcome to the FreeKi getting started guide.\n\n## Step 1: Do this\n\n- Open the sidebar\n- Click "+ New Page"\n- Enter a title and some content\n\n## Step 2: Organize\n\n- Drag pages into folders\n- Use tags to group related content\n\n---\n\nNeed help? Check the documentation.`,
  'page-2:2': `# Getting Started\n\nWelcome to the FreeKi getting started guide.\n\n## Step 1: Do this\n\n- Open the sidebar\n- Click "+ New Page"\n- Enter a title and some content\n\n## Step 2: Organize\n\n- Drag pages into folders\n- Use tags to group related content\n- Pin important pages\n\n## Step 3: Share\n\n- Invite your team\n- Set permissions\n\n---\n\nNeed help? Check the documentation.`,
  'page-2:3': `# Getting Started\n\nWelcome to the FreeKi getting started guide.\n\n## Step 1: Do this\n\n- Open the sidebar\n- Click "+ New Page"\n- Enter a title and some content\n\n## Step 2: Organize\n\n- Drag pages into folders\n- Use tags to group related content\n- Pin important pages\n\n## Step 3: Share\n\n- Invite your team\n- Set permissions\n- Export to markdown\n\n---\n\nNeed help? Check the documentation or contact support.`
}