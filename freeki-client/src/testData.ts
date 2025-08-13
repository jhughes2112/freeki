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
  },
  {
		pageId: 'page-2',
		title: 'Getting Started',
		author: 'Jason Hughes',
		path: 'getting-started.md',
		tags: ['guide', 'update', 'final'],
		lastModified: now - 3600 * 1, // 1 hours ago
		version: 4
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
	'page-2:3': `# Getting Started\n\nWelcome to the FreeKi getting started guide.\n\n## Step 1: Do this\n\n- Open the sidebar\n- Click "+ New Page"\n- Enter a title and some content\n\n## Step 2: Organize\n\n- Drag pages into folders\n- Use tags to group related content\n- Pin important pages\n\n## Step 3: Share\n\n- Invite your team\n- Set permissions\n- Export to markdown\n\n---\n\nNeed help? Check the documentation or contact support.`,
	'page-2:4': `<h1 data-pm-slice="0 0 []">Getting Started</h1><p>Welcome to the FreeKi getting started guide. <strong>Disclaimer:</strong> No refunds if you end up loving it more than your ex.</p><h2>Step 1: Do this - Open</h2><p>Alright, folks, it's time to tango with technology! First thing's first: find that sneaky sidebar that's been playing hide-and-seek all this time. Click the "+ New Page" button with the enthusiasm of someone who just found $20 in their old jeans. Now, give it a title that screams "Look at me, I'm the alpha and omega of wikis!" and fill it in with content that's so good, Shakespeare would wish he'd thought of it first.</p><p>But wait, there's more! If you've got typos, well, they're just your personal signature, so embrace them. Remember, perfection is overrated—it's all about the content, right? (Right?!) </p><h2>Step 2: Organize</h2><p>Imagine your pages are like a bunch of wild teenagers on a sugar high—drag 'em into folders before they cause a ruckus. Use tags like secret handshakes to group them into rebellious gangs. And don't forget to pin those VIP pages, 'cause they're the life of the party—kind of like that one cousin who's always the center of attention at family gatherings.</p><h2>Step 3: Share</h2><p>Sharing is caring, they say, and who are we to argue with that? Throw open the virtual doors and invite your team like you're the host of the hottest party in town. Set permissions like you're the bouncer at a club, deciding who gets to dance and who's left out in the cold. And hey, if you feel nostalgic, export it all to markdown—because sometimes, we just need to unplug and enjoy a little tech detox.</p><p>And there you have it—your very own wiki guide that's part manual, part comedy routine, and 100% essential. If all this still sounds like a foreign language, don't sweat it. Check the documentation, or better yet, hit up support. They're like the wise old owls of the wiki world, ready to swoop in with answers. Just maybe avoid asking them for dating advice—stick to the wiki stuff. </p>`
}