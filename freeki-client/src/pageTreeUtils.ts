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
  firstFilePageId: string  // For folders: pageId of the first file in this folder (always set)
  lastFilePageId: string   // For folders: pageId of the last file in this folder (always set)
}

// Simple alphabetical sorting function - files before folders at each level
export function sortPagesByDisplayOrder(pageMetadata: PageMetadata[]): PageMetadata[] {
  return [...pageMetadata].sort((a, b) => {
    // Compare paths depth-first: shallower paths (files/folders at root) come before deeper ones
    const aPathParts = a.path.split('/').filter(Boolean)
    const bPathParts = b.path.split('/').filter(Boolean)
    
    // Compare path segment by segment
    const minLength = Math.min(aPathParts.length, bPathParts.length)
    for (let i = 0; i < minLength; i++) {
      const aSegment = aPathParts[i]
      const bSegment = bPathParts[i]
      
      if (aSegment !== bSegment) {
        // If we're at the final segment, determine if it's a file or folder
        const aIsFile = i === aPathParts.length - 1 // Last segment = file
        const bIsFile = i === bPathParts.length - 1 // Last segment = file
        
        // FILES BEFORE FOLDERS: If one is a file and one is a folder, file comes first
        if (aIsFile && !bIsFile) {
          return -1  // a (file) comes before b (folder)
        }
        if (!aIsFile && bIsFile) {
          return 1   // b (file) comes before a (folder)
        }
        
        // Both are files or both are folders - sort alphabetically
        return aSegment.localeCompare(bSegment)
      }
    }
    
    // If all common segments are equal, shorter path comes first
    if (aPathParts.length !== bPathParts.length) {
      return aPathParts.length - bPathParts.length
    }
    
    // Final fallback: alphabetical by title
    return a.title.localeCompare(b.title)
  })
}

// Alphabetical flattened list - simple depth-based layout
export function buildFlattenedList(pageMetadata: PageMetadata[]): FlattenedItem[] {
  if (pageMetadata.length === 0) {
    return []
  }

  // Sort pages alphabetically
  const sortedPages = sortPagesByDisplayOrder(pageMetadata)

  // Create flat list with visual depth only
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

// Tree building with alphabetical sorting - files before folders
export function buildPageTree(pageMetadata: PageMetadata[]): TreeNode[] {
  if (pageMetadata.length === 0) {
    return []
  }

  // Sort pages alphabetically
  const sortedPages = sortPagesByDisplayOrder(pageMetadata)

  // Build folder structure and track first/last files for each folder
  const rootNodes: TreeNode[] = []
  const folderTracker = new Map<string, { firstPageId: string; lastPageId: string }>()

  // First pass: track which files belong to each folder
  for (const pageMetadata of sortedPages) {
    const pathParts = pageMetadata.path.split('/').filter(Boolean)
    const folderParts = pathParts.slice(0, -1) // all parts except the file
    
    // Update folder tracking for all parent folders of this file
    for (let depth = 0; depth < folderParts.length; depth++) {
      const folderPath = folderParts.slice(0, depth + 1).join('/')
      
      if (!folderTracker.has(folderPath)) {
        // First file in this folder - initialize tracking
        folderTracker.set(folderPath, {
          firstPageId: pageMetadata.pageId,
          lastPageId: pageMetadata.pageId
        })
      } else {
        // Update last file for this folder (since we're processing in sorted order)
        const tracker = folderTracker.get(folderPath)!
        tracker.lastPageId = pageMetadata.pageId
      }
    }
  }

  // Second pass: Build the actual tree structure
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
      const tracker = folderTracker.get(folderPath)!
      
      // Create unique pageId using full path
      const virtualMetadata: PageMetadata = {
        pageId: `folder_${folderPath}`,
        tags: [],
        title: folderName,
        lastModified: Date.now() / 1000,
        version: 0,
        path: folderPath
      }
      
      const folderNode: TreeNode = {
        metadata: virtualMetadata,
        isFolder: true,
        children: [],
        firstFilePageId: tracker.firstPageId,  // Always set - first file in this folder
        lastFilePageId: tracker.lastPageId     // Always set - last file in this folder
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
      children: [],
      firstFilePageId: pageMetadata.pageId,  // For files: references itself
      lastFilePageId: pageMetadata.pageId    // For files: references itself
    }
    
    currentNodes.push(pageNode)
    
    // Update previous path for next iteration
    previousPath = folderParts
  }

  return rootNodes
}

// Drag and Drop Types and Utilities (DISABLED)
export interface DragData {
  pageId: string
  isFolder: boolean
  path: string
}

export interface DropTarget {
  targetPageId: string
  targetPath: string
  position: 'before' | 'after' | 'inside'
}

export interface DragOperationResult {
  updatedPages: PageMetadata[]
  affectedPageIds: string[]
}

// Collect all pages that would be affected by dragging a TreeNode (for compatibility)
export function collectAffectedPagesFromTree(
  draggedNode: TreeNode, 
  allPages: PageMetadata[]
): PageMetadata[] {
  const affectedPages: PageMetadata[] = []
  
  // Walk the tree starting from the dragged node
  function walkTreeNode(node: TreeNode): void {
    if (!node.isFolder) {
      // This is a file - find the corresponding PageMetadata
      const pageMetadata = allPages.find(p => p.pageId === node.metadata.pageId)
      if (pageMetadata) {
        affectedPages.push(pageMetadata)
      }
    }
    
    // Recursively walk all children
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        walkTreeNode(child)
      }
    }
  }
  
  walkTreeNode(draggedNode)
  return affectedPages
}

// Function that works with DragData from the UI (for compatibility)
export function collectAffectedPages(
  dragData: DragData, 
  allPages: PageMetadata[],
  pageTree: TreeNode[]
): PageMetadata[] {
  if (!dragData.isFolder) {
    // Dragging a single file - just find it in allPages
    const draggedFile = allPages.find(p => p.pageId === dragData.pageId)
    return draggedFile ? [draggedFile] : []
  }
  
  // Dragging a folder - find the TreeNode and walk it
  function findNodeInTree(nodes: TreeNode[], targetPageId: string): TreeNode | null {
    for (const node of nodes) {
      if (node.metadata.pageId === targetPageId) {
        return node
      }
      if (node.children && node.children.length > 0) {
        const found = findNodeInTree(node.children, targetPageId)
        if (found) return found
      }
    }
    return null
  }
  
  const draggedNode = findNodeInTree(pageTree, dragData.pageId)
  if (!draggedNode) {
    console.warn(`Could not find dragged node with pageId: ${dragData.pageId}`)
    return []
  }
  
  return collectAffectedPagesFromTree(draggedNode, allPages)
}

// Calculate the complete drag operation result (DISABLED)
export function calculateDragOperation(): DragOperationResult {
  // DISABLED: Drag and drop is disabled since we removed sortOrder
  console.log('🚫 Drag and drop is disabled - using alphabetical sorting only')
  return { updatedPages: [], affectedPageIds: [] }
}

// DIAGNOSTIC: Test with simple case to verify alphabetical sorting
if (typeof window !== 'undefined') {
  (window as unknown as { testSimpleTreeBuild: () => void }).testSimpleTreeBuild = function() {
    console.log('🔬 DIAGNOSTIC: Simple Tree Build Test (Alphabetical Sorting)')
    
    const testPages: PageMetadata[] = [
      {
        pageId: 'api-getting-started',
        title: 'API Getting Started',
        path: 'documentation/api/getting-started.md',
        tags: [],
        lastModified: 1000,
        version: 1
      },
      {
        pageId: 'doc-intro',
        title: 'Documentation Introduction',
        path: 'documentation/intro.md',
        tags: [],
        lastModified: 1000,
        version: 1
      },
      {
        pageId: 'home',
        title: 'Home Page',
        path: 'home.md',
        tags: [],
        lastModified: 1000,
        version: 1
      }
    ]
    
    console.log('Input pages:', testPages.map(p => `${p.title} (${p.path})`))
    
    const tree = buildPageTree(testPages)
    console.log('Generated tree (alphabetical, files before folders):')
    
    function walkTree(nodes: TreeNode[], depth = 0): void {
      nodes.forEach((node) => {
        const indent = '  '.repeat(depth)
        const icon = node.isFolder ? '📁' : '📄'
        const bookendInfo = node.isFolder 
          ? ` (first: ${node.firstFilePageId}, last: ${node.lastFilePageId})` 
          : ''
        console.log(`${indent}${icon} ${node.metadata.title} (ID: ${node.metadata.pageId})${bookendInfo}`)
        
        if (node.children && node.children.length > 0) {
          walkTree(node.children, depth + 1)
        }
      })
    }
    
    walkTree(tree)
  }
}