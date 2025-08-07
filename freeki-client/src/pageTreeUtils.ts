// pageTreeUtils.ts - Utility functions for building and manipulating page tree structures
import type { PageMetadata } from './globalState'

// FLATTENED ITEM: Each item in the flattened list with visual depth
export interface FlattenedItem {
  metadata: PageMetadata
  isFolder: boolean
  depth: number      // Visual indentation depth (0 = root)
  hasChildren: boolean
  isExpanded?: boolean
}

// Client-side computed tree node for folder hierarchy
export interface TreeNode {
  metadata: PageMetadata
  isFolder: boolean     // Computed: true if this path has children
  children: TreeNode[]  // Computed: child nodes based on path hierarchy
}

// FIXED: True flattened sorting - sorts by sortOrder FIRST, then builds tree structure
export function buildFlattenedList(pageMetadata: PageMetadata[]): FlattenedItem[] {
  if (pageMetadata.length === 0) {
    return []
  }

  // Step 1: Sort ALL pages by sortOrder FIRST (true flattened sorting)
  const sortedPages = [...pageMetadata].sort((a, b) => {
    // Primary sort: sortOrder
    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder
    }
    
    // Secondary sort: path similarity with proper folder/file precedence
    const aPathParts = a.path.split('/').filter(Boolean)
    const bPathParts = b.path.split('/').filter(Boolean)
    
    // Compare path segment by segment
    const minLength = Math.min(aPathParts.length, bPathParts.length)
    for (let i = 0; i < minLength; i++) {
      const aSegment = aPathParts[i]
      const bSegment = bPathParts[i]
      
      if (aSegment !== bSegment) {
        // Determine if each segment represents a folder or file
        const aIsFolder = i < aPathParts.length - 1  // Not the last segment = folder
        const bIsFolder = i < bPathParts.length - 1  // Not the last segment = folder
        
        // If one is a folder and one is a file, folder comes first
        if (aIsFolder && !bIsFolder) {
          return -1  // a (folder) comes before b (file)
        }
        if (!aIsFolder && bIsFolder) {
          return 1   // b (folder) comes before a (file)
        }
        
        // Both are folders or both are files, sort alphabetically
        return aSegment.localeCompare(bSegment)
      }
    }
    
    // If all common segments are equal, shorter path comes first (folders before deeper files)
    if (aPathParts.length !== bPathParts.length) {
      return aPathParts.length - bPathParts.length
    }
    
    // Quaternary sort: alphabetical by title
    return a.title.localeCompare(b.title)
  })

  // Step 2: Create flat list with visual depth only (no folder grouping)
  const flattenedItems: FlattenedItem[] = []

  for (const page of sortedPages) {
    const pathParts = page.path.split('/').filter(Boolean)
    const depth = pathParts.length - 1 // 0 for root level, 1+ for nested
    
    flattenedItems.push({
      metadata: page,
      isFolder: false,
      depth: depth,
      hasChildren: false
    })
  }

  return flattenedItems
}

// FIXED: Tree building that maintains global sortOrder sequence
export function buildPageTree(pageMetadata: PageMetadata[]): TreeNode[] {
  if (pageMetadata.length === 0) {
    return []
  }

  // Step 1: Sort ALL pages by sortOrder FIRST (true flattened sorting)
  const sortedPages = [...pageMetadata].sort((a, b) => {
    // Primary sort: sortOrder
    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder
    }
    
    // Secondary sort: path similarity with proper folder/file precedence
    const aPathParts = a.path.split('/').filter(Boolean)
    const bPathParts = b.path.split('/').filter(Boolean)
    
    // Compare path segment by segment
    const minLength = Math.min(aPathParts.length, bPathParts.length)
    for (let i = 0; i < minLength; i++) {
      const aSegment = aPathParts[i]
      const bSegment = bPathParts[i]
      
      if (aSegment !== bSegment) {
        // Determine if each segment represents a folder or file
        const aIsFolder = i < aPathParts.length - 1  // Not the last segment = folder
        const bIsFolder = i < bPathParts.length - 1  // Not the last segment = folder
        
        // If one is a folder and one is a file, folder comes first
        if (aIsFolder && !bIsFolder) {
          return -1  // a (folder) comes before b (file)
        }
        if (!aIsFolder && bIsFolder) {
          return 1   // b (folder) comes before a (file)
        }
        
        // Both are folders or both are files, sort alphabetically
        return aSegment.localeCompare(bSegment)
      }
    }
    
    // If all common segments are equal, shorter path comes first (folders before deeper files)
    if (aPathParts.length !== bPathParts.length) {
      return aPathParts.length - bPathParts.length
    }
    
    // Quaternary sort: alphabetical by title
    return a.title.localeCompare(b.title)
  })

  // Step 2: Path walking with proper folder reuse and node stack management
  const rootNodes: TreeNode[] = []
  let previousPath: string[] = []
  let nodeStack: TreeNode[][] = [rootNodes]  // Stack of current node arrays at each depth level
  
  for (const pageMetadata of sortedPages) {
    const pathParts = pageMetadata.path.split('/').filter(Boolean)
    const folderParts = pathParts.slice(0, -1) // all parts except the file
    
    // Find how much of the path is common with the previous file's path
    let commonDepth = 0
    while (commonDepth < Math.min(folderParts.length, previousPath.length) && 
           folderParts[commonDepth] === previousPath[commonDepth]) {
      commonDepth++
    }
    
    // Truncate the node stack to the common depth + 1 (root is at index 0)
    nodeStack = nodeStack.slice(0, commonDepth + 1)
    
    // Get the current nodes array where we'll add new folders/files
    let currentNodes = nodeStack[nodeStack.length - 1]
    
    // Create new folders from common depth to full depth needed for this file
    for (let i = commonDepth; i < folderParts.length; i++) {
      const folderName = folderParts[i]
      const folderPath = folderParts.slice(0, i + 1).join('/')
      
      // Create unique pageId using full path + sortOrder (guarantees no duplicates)
      const virtualMetadata: PageMetadata = {
        pageId: `folder_${folderPath}_${pageMetadata.sortOrder}`,
        tags: [],
        title: folderName,
        lastModified: Date.now() / 1000,
        version: 0,
        path: folderPath,
        sortOrder: pageMetadata.sortOrder
      }
      
      const folderNode: TreeNode = {
        metadata: virtualMetadata,
        isFolder: true,
        children: []
      }
      
      // Add folder to current level
      currentNodes.push(folderNode)
      
      // Move into the new folder and push its children array to the stack
      currentNodes = folderNode.children
      nodeStack.push(currentNodes)
    }
    
    // Create and add the file node
    const pageNode: TreeNode = {
      metadata: pageMetadata,
      isFolder: false,
      children: []
    }
    
    currentNodes.push(pageNode)
    
    // Update previous path for next iteration
    previousPath = folderParts
  }

  return rootNodes
}

// DIAGNOSTIC: Test with simple case to identify the issue
if (typeof window !== 'undefined') {
  (window as any).testSimpleTreeBuild = function() {
    console.log('?? DIAGNOSTIC: Simple Tree Build Test')
    
    const testPages: PageMetadata[] = [
      {
        pageId: 'api-getting-started',
        title: '[1.0] API Getting Started',
        path: 'documentation/api/getting-started.md',
        tags: [],
        lastModified: 1000,
        version: 1,
        sortOrder: 1.0
      },
      {
        pageId: 'doc-intro',
        title: '[1.0] Documentation Introduction',
        path: 'documentation/intro.md',
        tags: [],
        lastModified: 1000,
        version: 1,
        sortOrder: 1.0
      },
      {
        pageId: 'api-overview',
        title: '[2.0] API Overview',
        path: 'documentation/api/overview.md',
        tags: [],
        lastModified: 1000,
        version: 1,
        sortOrder: 2.0
      }
    ]
    
    console.log('Input pages:', testPages.map(p => `[${p.sortOrder}] ${p.title} (${p.path})`))
    
    const tree = buildPageTree(testPages)
    console.log('Generated tree:')
    
    function walkTree(nodes: TreeNode[], depth = 0): void {
      nodes.forEach((node, index) => {
        const indent = '  '.repeat(depth)
        const icon = node.isFolder ? '??' : '??'
        console.log(`${indent}${icon} [${node.metadata.sortOrder}] ${node.metadata.title} (ID: ${node.metadata.pageId})`)
        
        if (node.children && node.children.length > 0) {
          walkTree(node.children, depth + 1)
        }
      })
    }
    
    walkTree(tree)
  }
}