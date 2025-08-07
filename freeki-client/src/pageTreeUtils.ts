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

// Drag and Drop Types and Utilities
export interface DragData {
  pageId: string
  isFolder: boolean
  path: string
  sortOrder: number
}

export interface DropTarget {
  targetPageId: string
  targetPath: string
  position: 'before' | 'after' | 'inside'
  targetSortOrder?: number
}

export interface DragOperationResult {
  updatedPages: PageMetadata[]
  affectedPageIds: string[]
}

// Collect all pages that would be affected by dragging a TreeNode (walking the tree properly)
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

// Updated function that works with DragData from the UI
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

// Calculate new sortOrders for dragged pages based on target location
export function calculateNewSortOrders(
  draggedPages: PageMetadata[],
  targetPath: string,
  position: 'before' | 'after' | 'inside',
  allPages: PageMetadata[]
): number[] {
  
  // Determine the target folder path based on position
  let targetFolderPath = ''
  
  if (position === 'inside') {
    // Dropping inside means the target IS the folder
    targetFolderPath = targetPath
  } else {
    // Dropping before/after means we're in the same folder as the target
    targetFolderPath = targetPath.substring(0, targetPath.lastIndexOf('/')) || ''
  }
  
  // Find all files in the target folder
  const targetFolderFiles = allPages.filter(page => {
    const pageFolder = page.path.substring(0, page.path.lastIndexOf('/')) || ''
    return pageFolder === targetFolderPath
  }).sort((a, b) => a.sortOrder - b.sortOrder)
  
  // If target folder is empty, use default sortOrder
  if (targetFolderFiles.length === 0) {
    return draggedPages.map(() => 1.0)
  }
  
  // Get unique sortOrders in the target folder
  const uniqueSortOrders = Array.from(new Set(targetFolderFiles.map(p => p.sortOrder)))
    .sort((a, b) => a - b)
  
  if (uniqueSortOrders.length === 1) {
    // All files in target folder have the same sortOrder - snap to it
    return draggedPages.map(() => uniqueSortOrders[0])
  }
  
  // Determine insertion point
  let beforeSortOrder: number
  let afterSortOrder: number
  
  if (position === 'inside') {
    // Insert at the end of the folder
    beforeSortOrder = Math.max(...uniqueSortOrders)
    
    // Find the next file outside this folder hierarchy
    const allSortedFiles = allPages.sort((a, b) => a.sortOrder - b.sortOrder)
    const nextFileIndex = allSortedFiles.findIndex(page => {
      const pageFolder = page.path.substring(0, page.path.lastIndexOf('/')) || ''
      return pageFolder !== targetFolderPath && page.sortOrder > beforeSortOrder
    })
    
    afterSortOrder = nextFileIndex >= 0 ? allSortedFiles[nextFileIndex].sortOrder : beforeSortOrder + 1.0
  } else {
    // Insert before/after target file
    const targetFile = allPages.find(p => p.path === targetPath)
    if (!targetFile) {
      // Fallback to end of folder
      beforeSortOrder = Math.max(...uniqueSortOrders)
      afterSortOrder = beforeSortOrder + 1.0
    } else {
      const refIndex = uniqueSortOrders.indexOf(targetFile.sortOrder)
      
      if (position === 'before') {
        afterSortOrder = targetFile.sortOrder
        beforeSortOrder = refIndex > 0 ? uniqueSortOrders[refIndex - 1] : afterSortOrder - 1.0
      } else { // position === 'after'
        beforeSortOrder = targetFile.sortOrder
        afterSortOrder = refIndex < uniqueSortOrders.length - 1 
          ? uniqueSortOrders[refIndex + 1] 
          : beforeSortOrder + 1.0
      }
    }
  }
  
  // Distribute dragged pages between beforeSortOrder and afterSortOrder
  return distributeEvenly(draggedPages, beforeSortOrder, afterSortOrder)
}

// Distribute pages evenly between two sortOrder values
function distributeEvenly(draggedPages: PageMetadata[], beforeSortOrder: number, afterSortOrder: number): number[] {
  if (draggedPages.length === 0) return []
  
  // Get unique sortOrders from dragged pages and sort them
  const draggedSortOrders = Array.from(new Set(draggedPages.map(p => p.sortOrder))).sort((a, b) => a - b)
  
  if (draggedSortOrders.length === 1) {
    // All dragged pages have same sortOrder - they all get the same new sortOrder
    const targetSortOrder = beforeSortOrder + (afterSortOrder - beforeSortOrder) * 0.5
    return draggedPages.map(() => targetSortOrder)
  }
  
  // Multiple unique sortOrders - map proportionally
  // Example: dragging [3.1, 3.2, 3.3, 3.4] between 1.0 and 2.0
  // Result: evenly distributed [1.2, 1.4, 1.6, 1.8]
  
  const range = afterSortOrder - beforeSortOrder
  const sourceMin = Math.min(...draggedSortOrders)
  const sourceMax = Math.max(...draggedSortOrders)
  const sourceRange = sourceMax - sourceMin || 1 // Avoid division by zero
  
  // Create mapping for each unique sortOrder
  const sortOrderMap = new Map<number, number>()
  
  if (draggedSortOrders.length === 2) {
    // Special case: two different sortOrders [3.0, 4.0] -> [1.33, 1.66]
    const step = range / 3
    sortOrderMap.set(draggedSortOrders[0], beforeSortOrder + step)
    sortOrderMap.set(draggedSortOrders[1], beforeSortOrder + 2 * step)
  } else {
    // General case: proportional mapping
    draggedSortOrders.forEach((sortOrder, index) => {
      const proportion = draggedSortOrders.length === 1 ? 0.5 : index / (draggedSortOrders.length - 1)
      const newSortOrder = beforeSortOrder + range * proportion * 0.8 + range * 0.1 // Leave 10% margin on each side
      sortOrderMap.set(sortOrder, newSortOrder)
    })
  }
  
  // Map each dragged page to its new sortOrder
  return draggedPages.map(page => sortOrderMap.get(page.sortOrder) || beforeSortOrder + range * 0.5)
}

// Calculate the complete drag operation result
export function calculateDragOperation(
  dragData: DragData,
  dropTarget: DropTarget,
  allPages: PageMetadata[],
  pageTree: TreeNode[]
): DragOperationResult {
  // Use proper tree walking instead of path filtering
  const affectedPages = collectAffectedPages(dragData, allPages, pageTree)
  
  if (affectedPages.length === 0) {
    return { updatedPages: [], affectedPageIds: [] }
  }
  
  // Calculate new sortOrders based on drop position
  const newSortOrders = calculateNewSortOrders(
    affectedPages,
    dropTarget.targetPath,
    dropTarget.position,
    allPages
  )
  
  // Calculate new paths for reparented pages
  const updatedPages = affectedPages.map((page, index) => {
    // Determine new parent path based on drop target
    let newParentPath = ''
    
    if (dropTarget.position === 'inside') {
      // Dropping inside a folder - the target path IS the new parent
      newParentPath = dropTarget.targetPath
    } else {
      // Dropping before/after a file or folder - extract parent directory
      const targetParentPath = dropTarget.targetPath.substring(0, dropTarget.targetPath.lastIndexOf('/'))
      newParentPath = targetParentPath || '' // Root level if no parent
    }
    
    // Calculate new full path
    const fileName = page.path.substring(page.path.lastIndexOf('/') + 1)
    const newPath = newParentPath ? `${newParentPath}/${fileName}` : fileName
    
    return {
      ...page,
      path: newPath,
      sortOrder: newSortOrders[index]
    }
  })
  
  return {
    updatedPages,
    affectedPageIds: affectedPages.map(p => p.pageId)
  }
}

// DIAGNOSTIC: Test with simple case to identify the issue
if (typeof window !== 'undefined') {
  (window as any).testSimpleTreeBuild = function() {
    console.log('🔬 DIAGNOSTIC: Simple Tree Build Test')
    
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
        const icon = node.isFolder ? '📁' : '📄'
        console.log(`${indent}${icon} [${node.metadata.sortOrder}] ${node.metadata.title} (ID: ${node.metadata.pageId})`)
        
        if (node.children && node.children.length > 0) {
          walkTree(node.children, depth + 1)
        }
      })
    }
    
    walkTree(tree)
  }
}