// pageTreeUtils.ts - Utility functions for building and manipulating page tree structures
import type { PageMetadata } from './globalState'

// Client-side computed tree node for folder hierarchy - belongs here, not in global state
export interface TreeNode {
  metadata: PageMetadata
  isFolder: boolean     // Computed: true if this path has children
  children: TreeNode[]  // Computed: child nodes based on path hierarchy
}

// Utility function to build tree structure from flat PageMetadata list
export function buildPageTree(pageMetadata: PageMetadata[]): TreeNode[] {
  // First, create a map of all paths to determine which are folders
  const pathMap = new Map<string, PageMetadata>()
  const folderPaths = new Set<string>()
  
  // Build path map and identify folders
  for (const metadata of pageMetadata) {
    pathMap.set(metadata.path, metadata)
    
    // Mark all parent directories as folders
    const pathParts = metadata.path.split('/').filter(Boolean)
    for (let i = 1; i < pathParts.length; i++) {
      const parentPath = pathParts.slice(0, i).join('/')
      folderPaths.add(parentPath)
    }
  }
  
  // Create tree nodes for all items (files and folders)
  const nodeMap = new Map<string, TreeNode>()
  
  // Create nodes for actual files
  for (const metadata of pageMetadata) {
    const node: TreeNode = {
      metadata,
      isFolder: folderPaths.has(metadata.path),
      children: []
    }
    nodeMap.set(metadata.path, node)
  }
  
  // Create virtual folder nodes for paths that don't have metadata
  for (const folderPath of folderPaths) {
    if (!nodeMap.has(folderPath)) {
      // Create virtual folder metadata
      const pathParts = folderPath.split('/')
      const title = pathParts[pathParts.length - 1] || 'Root'
      
      const virtualMetadata: PageMetadata = {
        pageId: `folder_${folderPath}`,
        tags: [],
        title,
        lastModified: Date.now() / 1000,
        version: 0,
        path: folderPath,
        sortOrder: 0
      }
      
      const node: TreeNode = {
        metadata: virtualMetadata,
        isFolder: true,
        children: []
      }
      nodeMap.set(folderPath, node)
    }
  }
  
  // Build parent-child relationships
  const rootNodes: TreeNode[] = []
  
  for (const node of nodeMap.values()) {
    const pathParts = node.metadata.path.split('/').filter(Boolean)
    
    if (pathParts.length === 1) {
      // Root level item
      rootNodes.push(node)
    } else {
      // Find parent
      const parentPath = pathParts.slice(0, -1).join('/')
      const parentNode = nodeMap.get(parentPath)
      if (parentNode) {
        parentNode.children.push(node)
      } else {
        // Parent not found, add to root
        rootNodes.push(node)
      }
    }
  }
  
  // Sort nodes by sortOrder, then alphabetically
  const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
    return nodes
      .sort((a, b) => {
        // Folders first
        if (a.isFolder && !b.isFolder) return -1
        if (!a.isFolder && b.isFolder) return 1
        
        // Then by sortOrder
        if (a.metadata.sortOrder !== b.metadata.sortOrder) {
          return a.metadata.sortOrder - b.metadata.sortOrder
        }
        
        // Finally alphabetically
        return a.metadata.title.localeCompare(b.metadata.title)
      })
      .map(node => ({
        ...node,
        children: sortNodes(node.children)
      }))
  }
  
  return sortNodes(rootNodes)
}