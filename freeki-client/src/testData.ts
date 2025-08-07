// TEST DATA FOR SORTORDER AND TREE CONSTRUCTION VERIFICATION
// This file contains all sample data for testing - comprehensive sortOrder verification data
// plus simple fallback data. This is temporary test data that can be easily removed when no longer needed.

import type { PageMetadata } from './globalState'

// Comprehensive test data with sortOrder values embedded in titles for easy verification
export const testPageMetadata: PageMetadata[] = [
  // Root level pages (mixed sortOrder to test sorting)
  {
    pageId: 'home',
    title: '[3.0] Home Page',
    path: 'home.md',
    tags: ['wiki', 'home', 'intro'],
    lastModified: 1705149000,
    version: 1,
    sortOrder: 3.0
  },
  {
    pageId: 'welcome',
    title: '[1.0] Welcome Guide',
    path: 'welcome.md',
    tags: ['guide', 'intro'],
    lastModified: 1705148500,
    version: 1,
    sortOrder: 1.0
  },
  {
    pageId: 'overview',
    title: '[2.0] System Overview',
    path: 'overview.md',
    tags: ['overview', 'system'],
    lastModified: 1705148000,
    version: 1,
    sortOrder: 2.0
  },

  // Documentation folder - multiple levels deep
  {
    pageId: 'doc-intro',
    title: '[1.0] Documentation Introduction',
    path: 'documentation/intro.md',
    tags: ['documentation', 'intro'],
    lastModified: 1705147000,
    version: 1,
    sortOrder: 1.0
  },
  {
    pageId: 'doc-advanced',
    title: '[3.0] Advanced Documentation',
    path: 'documentation/advanced.md',
    tags: ['documentation', 'advanced'],
    lastModified: 1705146000,
    version: 2,
    sortOrder: 3.0
  },
  {
    pageId: 'doc-basic',
    title: '[2.0] Basic Documentation',
    path: 'documentation/basic.md',
    tags: ['documentation', 'basic'],
    lastModified: 1705145000,
    version: 1,
    sortOrder: 2.0
  },

  // Deep nested documentation subfolder
  {
    pageId: 'api-overview',
    title: '[2.0] API Overview',
    path: 'documentation/api/overview.md',
    tags: ['api', 'documentation'],
    lastModified: 1705144000,
    version: 1,
    sortOrder: 2.0
  },
  {
    pageId: 'api-getting-started',
    title: '[1.0] API Getting Started',
    path: 'documentation/api/getting-started.md',
    tags: ['api', 'documentation', 'getting-started'],
    lastModified: 1705143000,
    version: 1,
    sortOrder: 1.0
  },
  {
    pageId: 'api-reference',
    title: '[3.0] API Reference',
    path: 'documentation/api/reference.md',
    tags: ['api', 'documentation', 'reference'],
    lastModified: 1705142000,
    version: 1,
    sortOrder: 3.0
  },

  // Very deep nesting - API examples
  {
    pageId: 'rest-examples',
    title: '[1.0] REST API Examples',
    path: 'documentation/api/examples/rest.md',
    tags: ['api', 'examples', 'rest'],
    lastModified: 1705141000,
    version: 1,
    sortOrder: 1.0
  },
  {
    pageId: 'graphql-examples',
    title: '[2.0] GraphQL Examples',
    path: 'documentation/api/examples/graphql.md',
    tags: ['api', 'examples', 'graphql'],
    lastModified: 1705140000,
    version: 1,
    sortOrder: 2.0
  },

  // Projects folder with mixed sortOrder
  {
    pageId: 'project-gamma',
    title: '[1.5] Project Gamma',
    path: 'projects/gamma.md',
    tags: ['project', 'gamma'],
    lastModified: 1705139000,
    version: 1,
    sortOrder: 1.5
  },
  {
    pageId: 'project-alpha',
    title: '[1.0] Project Alpha',
    path: 'projects/alpha.md',
    tags: ['project', 'alpha'],
    lastModified: 1705138000,
    version: 1,
    sortOrder: 1.0
  },
  {
    pageId: 'project-beta',
    title: '[3.0] Project Beta',
    path: 'projects/beta.md',
    tags: ['project', 'beta'],
    lastModified: 1705137000,
    version: 3,
    sortOrder: 3.0
  },
  {
    pageId: 'project-delta',
    title: '[2.0] Project Delta',
    path: 'projects/delta.md',
    tags: ['project', 'delta'],
    lastModified: 1705136000,
    version: 1,
    sortOrder: 2.0
  },

  // Project subfolders
  {
    pageId: 'alpha-readme',
    title: '[1.0] Alpha README',
    path: 'projects/alpha/readme.md',
    tags: ['project', 'alpha', 'readme'],
    lastModified: 1705135000,
    version: 1,
    sortOrder: 1.0
  },
  {
    pageId: 'alpha-setup',
    title: '[2.0] Alpha Setup Guide',
    path: 'projects/alpha/setup.md',
    tags: ['project', 'alpha', 'setup'],
    lastModified: 1705134000,
    version: 1,
    sortOrder: 2.0
  },

  // Deep project nesting
  {
    pageId: 'alpha-config-dev',
    title: '[1.0] Alpha Development Config',
    path: 'projects/alpha/config/development.md',
    tags: ['project', 'alpha', 'config', 'development'],
    lastModified: 1705133000,
    version: 1,
    sortOrder: 1.0
  },
  {
    pageId: 'alpha-config-prod',
    title: '[2.0] Alpha Production Config',
    path: 'projects/alpha/config/production.md',
    tags: ['project', 'alpha', 'config', 'production'],
    lastModified: 1705132000,
    version: 1,
    sortOrder: 2.0
  },

  // Meetings folder with different sortOrder patterns
  {
    pageId: 'meetings-weekly',
    title: '[10.0] Weekly Meetings',
    path: 'meetings/weekly.md',
    tags: ['meetings', 'weekly'],
    lastModified: 1705131000,
    version: 1,
    sortOrder: 10.0
  },
  {
    pageId: 'meetings-daily',
    title: '[5.0] Daily Standups',
    path: 'meetings/daily.md',
    tags: ['meetings', 'daily', 'standup'],
    lastModified: 1705130000,
    version: 1,
    sortOrder: 5.0
  },
  {
    pageId: 'meetings-monthly',
    title: '[20.0] Monthly Reviews',
    path: 'meetings/monthly.md',
    tags: ['meetings', 'monthly', 'review'],
    lastModified: 1705129000,
    version: 1,
    sortOrder: 20.0
  },

  // Meeting archives with date-based sortOrder
  {
    pageId: 'meeting-2024-01',
    title: '[2024.01] January 2024 Archive',
    path: 'meetings/archive/2024-01.md',
    tags: ['meetings', 'archive', '2024'],
    lastModified: 1705128000,
    version: 1,
    sortOrder: 2024.01
  },
  {
    pageId: 'meeting-2024-02',
    title: '[2024.02] February 2024 Archive',
    path: 'meetings/archive/2024-02.md',
    tags: ['meetings', 'archive', '2024'],
    lastModified: 1705127000,
    version: 1,
    sortOrder: 2024.02
  },

  // Tutorials with step-based sortOrder
  {
    pageId: 'tutorial-step-3',
    title: '[3.0] Tutorial Step 3',
    path: 'tutorials/step-3.md',
    tags: ['tutorial', 'step-3'],
    lastModified: 1705126000,
    version: 1,
    sortOrder: 3.0
  },
  {
    pageId: 'tutorial-step-1',
    title: '[1.0] Tutorial Step 1',
    path: 'tutorials/step-1.md',
    tags: ['tutorial', 'step-1'],
    lastModified: 1705125000,
    version: 1,
    sortOrder: 1.0
  },
  {
    pageId: 'tutorial-step-2',
    title: '[2.0] Tutorial Step 2',
    path: 'tutorials/step-2.md',
    tags: ['tutorial', 'step-2'],
    lastModified: 1705124000,
    version: 1,
    sortOrder: 2.0
  },

  // Reference section with decimal sortOrder
  {
    pageId: 'ref-api',
    title: '[1.1] API Reference',
    path: 'reference/api.md',
    tags: ['reference', 'api'],
    lastModified: 1705123000,
    version: 1,
    sortOrder: 1.1
  },
  {
    pageId: 'ref-troubleshooting',
    title: '[2.5] Troubleshooting Guide',
    path: 'reference/troubleshooting.md',
    tags: ['reference', 'troubleshooting'],
    lastModified: 1705122000,
    version: 1,
    sortOrder: 2.5
  },
  {
    pageId: 'ref-faq',
    title: '[1.5] Frequently Asked Questions',
    path: 'reference/faq.md',
    tags: ['reference', 'faq'],
    lastModified: 1705121000,
    version: 1,
    sortOrder: 1.5
  },

  // Testing edge cases with zero and negative sortOrder
  {
    pageId: 'edge-zero',
    title: '[0.0] Zero Sort Order Test',
    path: 'edge-cases/zero.md',
    tags: ['edge-case', 'zero'],
    lastModified: 1705120000,
    version: 1,
    sortOrder: 0.0
  },
  {
    pageId: 'edge-negative',
    title: '[-1.0] Negative Sort Order Test',
    path: 'edge-cases/negative.md',
    tags: ['edge-case', 'negative'],
    lastModified: 1705119000,
    version: 1,
    sortOrder: -1.0
  },
  {
    pageId: 'edge-large',
    title: '[999.9] Large Sort Order Test',
    path: 'edge-cases/large.md',
    tags: ['edge-case', 'large'],
    lastModified: 1705118000,
    version: 1,
    sortOrder: 999.9
  },

  // Complex nested structure to test tree building
  {
    pageId: 'complex-a-1',
    title: '[1.0] Complex Nested A-1',
    path: 'complex/section-a/subsection-1/page.md',
    tags: ['complex', 'section-a', 'subsection-1'],
    lastModified: 1705117000,
    version: 1,
    sortOrder: 1.0
  },
  {
    pageId: 'complex-a-2',
    title: '[2.0] Complex Nested A-2',
    path: 'complex/section-a/subsection-2/page.md',
    tags: ['complex', 'section-a', 'subsection-2'],
    lastModified: 1705116000,
    version: 1,
    sortOrder: 2.0
  },
  {
    pageId: 'complex-b-1',
    title: '[1.0] Complex Nested B-1',
    path: 'complex/section-b/subsection-1/page.md',
    tags: ['complex', 'section-b', 'subsection-1'],
    lastModified: 1705115000,
    version: 1,
    sortOrder: 1.0
  }
]

// Sample content for all test pages and fallback content
export const testPageContent: Record<string, string> = {
  // Comprehensive test content
  'home': '# [3.0] Home Page\n\nWelcome to the FreeKi Wiki with comprehensive sortOrder testing.',
  'welcome': '# [1.0] Welcome Guide\n\nThis should appear first in the root folder due to sortOrder 1.0.',
  'overview': '# [2.0] System Overview\n\nThis should appear second in the root folder due to sortOrder 2.0.',
  'doc-intro': '# [1.0] Documentation Introduction\n\nFirst documentation item.',
  'doc-basic': '# [2.0] Basic Documentation\n\nSecond documentation item.',
  'doc-advanced': '# [3.0] Advanced Documentation\n\nThird documentation item.',
  'api-getting-started': '# [1.0] API Getting Started\n\nFirst API documentation.',
  'api-overview': '# [2.0] API Overview\n\nSecond API documentation.',
  'api-reference': '# [3.0] API Reference\n\nThird API documentation.',
  'rest-examples': '# [1.0] REST API Examples\n\nFirst API example.',
  'graphql-examples': '# [2.0] GraphQL Examples\n\nSecond API example.',
  'project-alpha': '# [1.0] Project Alpha\n\nFirst project by sortOrder.',
  'project-gamma': '# [1.5] Project Gamma\n\nSecond project by sortOrder.',
  'project-delta': '# [2.0] Project Delta\n\nThird project by sortOrder.',
  'project-beta': '# [3.0] Project Beta\n\nFourth project by sortOrder.',
  'alpha-readme': '# [1.0] Alpha README\n\nFirst alpha sub-page.',
  'alpha-setup': '# [2.0] Alpha Setup Guide\n\nSecond alpha sub-page.',
  'alpha-config-dev': '# [1.0] Alpha Development Config\n\nFirst config file.',
  'alpha-config-prod': '# [2.0] Alpha Production Config\n\nSecond config file.',
  'meetings-daily': '# [5.0] Daily Standups\n\nFirst meeting type by sortOrder.',
  'meetings-weekly': '# [10.0] Weekly Meetings\n\nSecond meeting type by sortOrder.',
  'meetings-monthly': '# [20.0] Monthly Reviews\n\nThird meeting type by sortOrder.',
  'meeting-2024-01': '# [2024.01] January 2024 Archive\n\nFirst archive by date-based sortOrder.',
  'meeting-2024-02': '# [2024.02] February 2024 Archive\n\nSecond archive by date-based sortOrder.',
  'tutorial-step-1': '# [1.0] Tutorial Step 1\n\nFirst tutorial step.',
  'tutorial-step-2': '# [2.0] Tutorial Step 2\n\nSecond tutorial step.',
  'tutorial-step-3': '# [3.0] Tutorial Step 3\n\nThird tutorial step.',
  'ref-api': '# [1.1] API Reference\n\nFirst reference by decimal sortOrder.',
  'ref-faq': '# [1.5] Frequently Asked Questions\n\nSecond reference by decimal sortOrder.',
  'ref-troubleshooting': '# [2.5] Troubleshooting Guide\n\nThird reference by decimal sortOrder.',
  'edge-negative': '# [-1.0] Negative Sort Order Test\n\nTesting negative sortOrder.',
  'edge-zero': '# [0.0] Zero Sort Order Test\n\nTesting zero sortOrder.',
  'edge-large': '# [999.9] Large Sort Order Test\n\nTesting large sortOrder.',
  'complex-a-1': '# [1.0] Complex Nested A-1\n\nFirst complex nested page.',
  'complex-a-2': '# [2.0] Complex Nested A-2\n\nSecond complex nested page.',
  'complex-b-1': '# [1.0] Complex Nested B-1\n\nFirst complex nested page in section B.',

  // Additional fallback content
  'getting-started': '# Getting Started\n\nQuick start guide for new users.',
  'advanced-features': '# Advanced Features\n\nAdvanced functionality guide.',
  'meeting-notes': '# Daily Standup Notes\n\nDaily team meeting notes.'
}