// TEST DATA FOR ALPHABETICAL TREE CONSTRUCTION
// This file contains all sample data for testing - clean alphabetical sorting with files before folders
// This is temporary test data that can be easily removed when no longer needed.

import type { PageMetadata } from './globalState'

// Clean test data without sortOrder - alphabetical sorting with files before folders
export const testPageMetadata: PageMetadata[] = [
  // Root level pages - will be sorted alphabetically
  {
    pageId: 'home',
    title: 'Home Page',
    path: 'home.md',
    tags: ['wiki', 'home', 'intro'],
    lastModified: 1705149000,
    version: 1
  },
  {
    pageId: 'overview',
    title: 'System Overview',
    path: 'overview.md',
    tags: ['overview', 'system'],
    lastModified: 1705148000,
    version: 1
  },
  {
    pageId: 'welcome',
    title: 'Welcome Guide',
    path: 'welcome.md',
    tags: ['guide', 'intro'],
    lastModified: 1705148500,
    version: 1
  },

  // Documentation folder - multiple levels deep
  {
    pageId: 'doc-intro',
    title: 'Documentation Introduction',
    path: 'documentation/intro.md',
    tags: ['documentation', 'intro'],
    lastModified: 1705147000,
    version: 1
  },
  {
    pageId: 'doc-advanced',
    title: 'Advanced Documentation',
    path: 'documentation/advanced.md',
    tags: ['documentation', 'advanced'],
    lastModified: 1705146000,
    version: 2
  },
  {
    pageId: 'doc-basic',
    title: 'Basic Documentation',
    path: 'documentation/basic.md',
    tags: ['documentation', 'basic'],
    lastModified: 1705145000,
    version: 1
  },

  // Deep nested documentation subfolder
  {
    pageId: 'api-overview',
    title: 'API Overview',
    path: 'documentation/api/overview.md',
    tags: ['api', 'documentation'],
    lastModified: 1705144000,
    version: 1
  },
  {
    pageId: 'api-getting-started',
    title: 'API Getting Started',
    path: 'documentation/api/getting-started.md',
    tags: ['api', 'documentation', 'getting-started'],
    lastModified: 1705143000,
    version: 1
  },

  // Edge cases folder
  {
    pageId: 'edge-case-1',
    title: 'Empty Content Test',
    path: 'edge-cases/empty.md',
    tags: [],
    lastModified: 1705142000,
    version: 1
  },
  {
    pageId: 'edge-case-2',
    title: 'Special Characters Test ñáéíóúü',
    path: 'edge-cases/special-chars.md',
    tags: ['edge-case', 'unicode', 'special-characters'],
    lastModified: 1705141000,
    version: 1
  }
]

// Sample content for all test pages and fallback content
export const testPageContent: Record<string, string> = {
  // Clean test content - no sortOrder references
  'home': '# Home Page\n\nWelcome to the FreeKi Wiki.',
  'welcome': '# Welcome Guide\n\nYour getting started guide.',
  'overview': '# System Overview\n\nHigh-level system overview.',
  'doc-intro': '# Documentation Introduction\n\nIntroduction to documentation.',
  'doc-basic': '# Basic Documentation\n\nBasic concepts and setup.',
  'doc-advanced': '# Advanced Documentation\n\nAdvanced topics and configuration.',
  'api-getting-started': '# API Getting Started\n\nGetting started with the API.',
  'api-overview': '# API Overview\n\nOverview of available APIs.',
  'edge-case-1': '# Empty Content Test\n\nTesting empty content handling.',
  'edge-case-2': '# Special Characters Test ñáéíóúü\n\nTesting Unicode support.',

  // Additional fallback content
  'getting-started': '# Getting Started\n\nQuick start guide for new users.',
  'advanced-features': '# Advanced Features\n\nAdvanced functionality guide.',
  'meeting-notes': '# Daily Standup Notes\n\nDaily team meeting notes.'
}