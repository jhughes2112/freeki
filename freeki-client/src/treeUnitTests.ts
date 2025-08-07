// Unit tests for flattened sorting implementation
// Run these tests to verify the tree construction works correctly

import { buildPageTree, buildFlattenedList, type TreeNode, type FlattenedItem } from './pageTreeUtils'
import type { PageMetadata } from './globalState'

// Test data to demonstrate that folder magnetism has been fixed
const magnetismTestPages: PageMetadata[] = [
  {
    pageId: 'edge-negative',
    title: '[-1.0] Negative Sort Order Test',
    path: 'edge-cases/negative.md',
    tags: [],
    lastModified: 1000,
    version: 1,
    sortOrder: -1.0
  },
  {
    pageId: 'edge-zero',
    title: '[0.0] Zero Sort Order Test',
    path: 'edge-cases/zero.md',
    tags: [],
    lastModified: 1000,
    version: 1,
    sortOrder: 0.0
  },
  {
    pageId: 'welcome',
    title: '[1.0] Welcome Guide',
    path: 'welcome.md',
    tags: [],
    lastModified: 1000,
    version: 1,
    sortOrder: 1.0
  },
  {
    pageId: 'overview',
    title: '[2.0] System Overview',
    path: 'overview.md',
    tags: [],
    lastModified: 1000,
    version: 1,
    sortOrder: 2.0
  },
  {
    pageId: 'edge-large',
    title: '[999.9] Large Sort Order Test',
    path: 'edge-cases/large.md',
    tags: [],
    lastModified: 1000,
    version: 1,
    sortOrder: 999.9  // This should appear LAST, not grouped with other edge-cases
  }
]

// Test to verify the fixed tree building works correctly
export function testFixedTreeBuilding(): void {
  console.log('?? TESTING FIXED TREE BUILDING')
  console.log('='.repeat(70))
  
  console.log('\n?? INPUT DATA (sorted by sortOrder):')
  const sortedInput = [...magnetismTestPages].sort((a, b) => a.sortOrder - b.sortOrder)
  sortedInput.forEach((page, index) => {
    console.log(`${index + 1}. [${page.sortOrder}] ${page.title} (${page.path})`)
  })
  
  console.log('\n?? BUILDING TREE WITH FIXED buildPageTree():')
  const tree = buildPageTree(magnetismTestPages)
  
  console.log('\n?? TREE OUTPUT:')
  function walkTree(nodes: TreeNode[], depth = 0): void {
    nodes.forEach((node, index) => {
      const indent = '  '.repeat(depth)
      const icon = node.isFolder ? '??' : '??'
      const position = depth === 0 ? `ROOT[${index}]` : `CHILD[${index}]`
      console.log(`${position} ${indent}${icon} ${node.metadata.title} (sortOrder: ${node.metadata.sortOrder})`)
      
      if (node.children && node.children.length > 0) {
        walkTree(node.children, depth + 1)
      }
    })
  }
  
  walkTree(tree)
  
  console.log('\n?? ANALYSIS:')
  console.log(`Total root items: ${tree.length}`)
  
  // Find where the 999.9 item appears in the flat sequence
  const flattenedSequence: TreeNode[] = []
  function flattenTree(nodes: TreeNode[]): void {
    for (const node of nodes) {
      flattenedSequence.push(node)
      if (node.children && node.children.length > 0) {
        flattenTree(node.children)
      }
    }
  }
  flattenTree(tree)
  
  const largeItemIndex = flattenedSequence.findIndex(node => node.metadata.title.includes('999.9'))
  const lastItemIndex = flattenedSequence.length - 1
  
  console.log(`[999.9] appears at index ${largeItemIndex} out of ${flattenedSequence.length} total items`)
  console.log(`Is it the last item? ${largeItemIndex === lastItemIndex ? 'YES ?' : 'NO ?'}`)
  
  if (largeItemIndex === lastItemIndex) {
    console.log('?? SUCCESS: Folder magnetism eliminated!')
    console.log('?? [999.9] appears at the END of the global sequence!')
  } else {
    console.log('? FAILED: Folder magnetism still exists')
  }
}

// Test the flattened list approach
export function testFlattenedList(): void {
  console.log('\n?? TESTING FLATTENED LIST:')
  const flattenedItems = buildFlattenedList(magnetismTestPages)
  
  console.log('\n?? FLATTENED LIST OUTPUT:')
  flattenedItems.forEach((item, index) => {
    const indent = '  '.repeat(item.depth)
    console.log(`[${index}] ${indent}?? ${item.metadata.title} (sortOrder: ${item.metadata.sortOrder})`)
  })
  
  // Check if 999.9 appears last in the flat list
  const lastIndex = flattenedItems.length - 1
  const lastItem = flattenedItems[lastIndex]
  const isLast = lastItem.metadata.title.includes('999.9')
  
  console.log(`\n[999.9] appears at index ${lastIndex} (last position): ${isLast ? 'YES ?' : 'NO ?'}`)
  
  if (isLast) {
    console.log('?? SUCCESS: Flattened list maintains global sortOrder!')
  } else {
    console.log('? FAILED: Flattened list broken')
  }
}

// Export for browser console access
declare const window: Window & {
  testFixedTreeBuilding?: () => void
  testFlattenedList?: () => void
}

if (typeof window !== 'undefined') {
  window.testFixedTreeBuilding = testFixedTreeBuilding
  window.testFlattenedList = testFlattenedList
}

// Auto-run tests when module loads (for development)
console.log('Fixed tree tests loaded. Run testFixedTreeBuilding() to test the fix.')