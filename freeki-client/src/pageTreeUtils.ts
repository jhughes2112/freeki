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

// Dictionary type for organizing pages by folder path
export interface FolderToFilesMap {
  [folderPath: string]: PageMetadata[]
}

// Create a dictionary of folder paths to their contained files, sorted by title
export function createFolderToFilesMap(pageMetadata: PageMetadata[]): FolderToFilesMap {
  const folderMap: FolderToFilesMap = {}
  
  // Group pages by their folder path
  for (const page of pageMetadata) {
    const pathParts = page.path.split('/').filter(Boolean)
    const folderPath = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : ''
    
    if (!folderMap[folderPath]) {
      folderMap[folderPath] = []
    }
    folderMap[folderPath].push(page)
  }
  
  // Sort files within each folder by title
  for (const folderPath in folderMap) {
    folderMap[folderPath].sort((a, b) => a.title.localeCompare(b.title))
  }
  
  return folderMap
}

// Enhanced sorting function that sorts by title within folders, not filename
export function sortPagesByDisplayOrder(pageMetadata: PageMetadata[]): PageMetadata[] {
  if (pageMetadata.length === 0) {
    return []
  }
  
  // Create the folder-to-files map with title-based sorting
  const folderMap = createFolderToFilesMap(pageMetadata)
  
  // Get all folder paths and sort them depth-first, then alphabetically
  const folderPaths = Object.keys(folderMap).sort((a, b) => {
    const aDepth = a ? a.split('/').length : 0
    const bDepth = b ? b.split('/').length : 0
    
    // Sort by depth first (shallower folders come first)
    if (aDepth !== bDepth) {
      return aDepth - bDepth
    }
    
    // Same depth, sort alphabetically
    return a.localeCompare(b)
  })
  
  // Build the final sorted array
  const sortedPages: PageMetadata[] = []
  
  for (const folderPath of folderPaths) {
    const pagesInFolder = folderMap[folderPath]
    // Pages are already sorted by title within each folder
    sortedPages.push(...pagesInFolder)
  }
  
  return sortedPages
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

// Tree building with title-based sorting within folders
export function buildPageTree(pageMetadata: PageMetadata[]): TreeNode[] {
  if (pageMetadata.length === 0) {
    return []
  }

  // Create folder-to-files map with title-based sorting
  const folderMap = createFolderToFilesMap(pageMetadata)
  
  // Get sorted pages using the new sorting approach
  const sortedPages = sortPagesByDisplayOrder(pageMetadata)

  // Build folder structure and track first/last files for each folder
  const rootNodes: TreeNode[] = []
  const folderTracker = new Map<string, { firstPageId: string; lastPageId: string }>()

  // First pass: track which files belong to each folder (now using sorted order)
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
        // Update last file for this folder (since we're processing in title-sorted order)
        const tracker = folderTracker.get(folderPath)!
        tracker.lastPageId = pageMetadata.pageId
      }
    }
  }

  // Second pass: Build the actual tree structure using the folder map for efficiency
  
  // Process each folder path in order
  for (const folderPath in folderMap) {
    const pagesInFolder = folderMap[folderPath]
    
    if (folderPath === '') {
      // Root level pages - add directly to rootNodes
      for (const page of pagesInFolder) {
        const pageNode: TreeNode = {
          metadata: page,
          isFolder: false,
          children: [],
          firstFilePageId: page.pageId,
          lastFilePageId: page.pageId
        }
        rootNodes.push(pageNode)
      }
    } else {
      // Nested pages - ensure folder structure exists
      const folderParts = folderPath.split('/')
      let currentNodes = rootNodes
      let currentPath = ''
      
      // Build folder hierarchy as needed
      for (let i = 0; i < folderParts.length; i++) {
        const folderName = folderParts[i]
        currentPath = i === 0 ? folderName : `${currentPath}/${folderName}`
        
        // Check if folder node already exists at this level
        let folderNode = currentNodes.find(node => 
          node.isFolder && node.metadata.path === currentPath
        )
        
        if (!folderNode) {
          // Create folder node
          const tracker = folderTracker.get(currentPath)!
          const virtualMetadata: PageMetadata = {
            pageId: `folder_${currentPath}`,
            tags: [],
            title: folderName,
            author: 'System',
            lastModified: Date.now() / 1000,
            version: 0,
            path: currentPath
          }
          
          folderNode = {
            metadata: virtualMetadata,
            isFolder: true,
            children: [],
            firstFilePageId: tracker.firstPageId,
            lastFilePageId: tracker.lastPageId
          }
          
          currentNodes.push(folderNode)
        }
        
        // Move to next level
        currentNodes = folderNode.children
      }
      
      // Add all pages in this folder
      for (const page of pagesInFolder) {
        const pageNode: TreeNode = {
          metadata: page,
          isFolder: false,
          children: [],
          firstFilePageId: page.pageId,
          lastFilePageId: page.pageId
        }
        currentNodes.push(pageNode)
      }
    }
  }

  // CRITICAL FIX: Sort all levels to ensure files before folders
  const sortTreeLevel = (nodes: TreeNode[]): void => {
    // Sort this level: files first (by title), then folders (by title)
    nodes.sort((a, b) => {
      // Files before folders
      if (!a.isFolder && b.isFolder) return -1
      if (a.isFolder && !b.isFolder) return 1
      
      // Same type - sort by title
      return a.metadata.title.localeCompare(b.metadata.title)
    })
    
    // Recursively sort all child levels
    for (const node of nodes) {
      if (node.isFolder && node.children.length > 0) {
        sortTreeLevel(node.children)
      }
    }
  }
  
  // Apply sorting to the entire tree
  sortTreeLevel(rootNodes)

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

// Function that works with DragData from the UI - enhanced with folder map support
export function collectAffectedPages(
  dragData: DragData, 
  allPages: PageMetadata[],
  pageTree?: TreeNode[],
  folderMap?: FolderToFilesMap
): PageMetadata[] {
  if (!dragData.isFolder) {
    // Dragging a single file - just find it in allPages
    const draggedFile = allPages.find(p => p.pageId === dragData.pageId)
    return draggedFile ? [draggedFile] : []
  }
  
  // Dragging a folder - use folder map if available for efficiency
  if (folderMap) {
    const affectedPages: PageMetadata[] = []
    
    for (const folderPath in folderMap) {
      if (folderPath === dragData.path || folderPath.startsWith(dragData.path + '/')) {
        affectedPages.push(...folderMap[folderPath])
      }
    }
    
    console.log(`Folder ${dragData.path} contains ${affectedPages.length} pages to move`)
    return affectedPages
  }
  
  // Fallback to original approach if no folder map provided
  const affectedPages: PageMetadata[] = []
  
  for (const page of allPages) {
    if (page.path.startsWith(dragData.path + '/')) {
      affectedPages.push(page)
    }
  }
  
  console.log(`Folder ${dragData.path} contains ${affectedPages.length} pages to move`)
  return affectedPages
}

// Calculate the complete drag operation result (RE-ENABLED)
export function calculateDragOperation(
  dragData: DragData,
  dropTarget: DropTarget,
  allPages: PageMetadata[]
): DragOperationResult {
  // Re-enabled: Basic path-based drag and drop
  console.log('📁 Calculating drag operation for path-based movement')
  
  const affectedPages = collectAffectedPages(dragData, allPages, [])
  const affectedPageIds = affectedPages.map(p => p.pageId)
  
  // For now, return the affected pages without modification
  // The actual path changes will be handled by the semantic API
  return { 
    updatedPages: affectedPages, 
    affectedPageIds 
  }
}

// Helper function to calculate if a folder should be auto-expand