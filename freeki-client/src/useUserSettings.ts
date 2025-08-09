import { useState, useEffect, useCallback, useMemo } from 'react'
import type { ISemanticApi } from './semanticApiInterface'

export interface UserInfo {
  accountId: string
  fullName: string
  email?: string
  roles: string[]
  isAdmin: boolean
  gravatarUrl?: string
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'auto'
  companyName: 'Your Company'
  wikiTitle: 'FreeKi Wiki'
  visiblePageIds: string[]  // Track which page IDs should be visible
  expandedFolderPaths: string[]  // Track which folder paths are expanded (independent of content)
  lastSelectedPageId?: string
  showMetadataPanel: boolean
  defaultEditMode: 'wysiwyg' | 'markdown'
  autoSave: boolean
  autoSaveInterval: number
  searchMode: 'full' | 'partial'
  // Layout settings for different screen modes
  wideScreenLayout: {
    sidebarCollapsed: boolean
    metadataCollapsed: boolean
    sidebarWidth: number
    metadataWidth: number
  }
  narrowScreenLayout: {
    sidebarCollapsed: boolean
    metadataCollapsed: boolean
  }
}

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'light',
  companyName: 'Your Company',
  wikiTitle: 'FreeKi Wiki',
  visiblePageIds: [],  // Start with no pages visible (all folders collapsed)
  expandedFolderPaths: [],  // Start with no folders expanded
  showMetadataPanel: true,
  defaultEditMode: 'wysiwyg',
  autoSave: true,
  autoSaveInterval: 30,
  searchMode: 'full',
  wideScreenLayout: {
    sidebarCollapsed: false,
    metadataCollapsed: false,
    sidebarWidth: 300,
    metadataWidth: 280
  },
  narrowScreenLayout: {
    sidebarCollapsed: true,
    metadataCollapsed: true
  }
}

function getDeviceKey(): string {
  const screen = `${window.screen.width}x${window.screen.height}`
  const isMobile = window.innerWidth <= 768
  const isTablet = window.innerWidth > 768 && window.innerWidth <= 1024
  
  let deviceType = 'desktop'
  if (isMobile) deviceType = 'mobile'
  else if (isTablet) deviceType = 'tablet'
  
  const ua = navigator.userAgent
  let hash = 0
  for (let i = 0; i < ua.length; i++) {
    const char = ua.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  
  return `freeki-settings-${deviceType}-${screen}-${Math.abs(hash).toString(36)}`
}

export function useUserSettings(semanticApi?: ISemanticApi | null) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  
  // Memoize deviceKey to prevent recalculation on every render
  const deviceKey = useMemo(() => getDeviceKey(), [])
  
  useEffect(() => {
    async function loadData() {
      try {
        // Load settings from localStorage
        const savedSettings = localStorage.getItem(deviceKey)
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings) as Partial<UserSettings>
          setSettings({ ...DEFAULT_SETTINGS, ...parsed })
        }
        
        // Try to fetch current user info if semantic API is provided
        if (semanticApi) {
          try {
            const user = await semanticApi.getCurrentUser()
            setUserInfo(user)
          } catch (error) {
            console.warn('Failed to fetch current user:', error)
            setUserInfo(null)
          }
        }
        
      } catch (error) {
        console.warn('Failed to load user data:', error)
      } finally {
        setIsLoaded(true)
      }
    }
    
    loadData()
  }, [deviceKey, semanticApi])
  
  const saveSettings = useCallback((newSettings: Partial<UserSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings }
      setSettings(updatedSettings)
      localStorage.setItem(deviceKey, JSON.stringify(updatedSettings))
    } catch (error) {
      console.warn('Failed to save user settings:', error)
    }
  }, [settings, deviceKey])
  
  const updateSetting = useCallback(<K extends keyof UserSettings>(
    key: K, 
    value: UserSettings[K]
  ) => {
    saveSettings({ [key]: value })
  }, [saveSettings])
  
  const resetSettings = useCallback(() => {
    try {
      setSettings(DEFAULT_SETTINGS)
      localStorage.removeItem(deviceKey)
    } catch (error) {
      console.warn('Failed to reset user settings:', error)
    }
  }, [deviceKey])
  
  // Helper function to collect all page IDs that are inside a folder path
  const collectPageIdsInFolder = useCallback((folderPath: string, allPageMetadata: import('./globalState').PageMetadata[]): string[] => {
    const pageIds: string[] = []
    for (const page of allPageMetadata) {
      if (page.path.startsWith(folderPath + '/')) {
        pageIds.push(page.pageId)
      }
    }
    return pageIds
  }, [])

  // Helper function to check if a folder should be expanded
  const isFolderExpanded = useCallback((folderPath: string): boolean => {
    return settings.expandedFolderPaths.includes(folderPath)
  }, [settings.expandedFolderPaths])

  // Toggle folder expansion by adding/removing folder path from expandedFolderPaths
  // Also manage visibility of contained pages
  const toggleFolderExpansion = useCallback((folderPath: string, allPageMetadata: import('./globalState').PageMetadata[]) => {
    const isCurrentlyExpanded = settings.expandedFolderPaths.includes(folderPath)
    const pagesInFolder = collectPageIdsInFolder(folderPath, allPageMetadata)
    
    let newExpandedFolderPaths: string[]
    let newVisiblePageIds: string[]
    
    if (isCurrentlyExpanded) {
      // ?? FIXED THE BUG: When collapsing, recursively remove ALL nested folder paths too!
      // Don't just remove the direct folder path - remove ALL subfolders within this path
      newExpandedFolderPaths = settings.expandedFolderPaths.filter(path => {
        // Remove the folder itself and any folders that are children of this folder
        return path !== folderPath && !path.startsWith(folderPath + '/')
      })
      
      // Remove all pages inside this folder (this was already working correctly)
      newVisiblePageIds = settings.visiblePageIds.filter(pageId => !pagesInFolder.includes(pageId))
      
      console.log(`??? Recursively closing folder "${folderPath}" and ${pagesInFolder.length} nested pages`)
      console.log(`?? Removed expanded folders:`, settings.expandedFolderPaths.filter(path => 
        path === folderPath || path.startsWith(folderPath + '/')
      ))
    } else {
      // Expand: add folder to expanded list and show its pages  
      newExpandedFolderPaths = [...settings.expandedFolderPaths, folderPath]
      newVisiblePageIds = [...new Set([...settings.visiblePageIds, ...pagesInFolder])]
      
      console.log(`?? Expanding folder "${folderPath}" with ${pagesInFolder.length} pages`)
    }
    
    // Update both settings at once
    saveSettings({
      expandedFolderPaths: newExpandedFolderPaths,
      visiblePageIds: newVisiblePageIds
    })
  }, [settings.expandedFolderPaths, settings.visiblePageIds, saveSettings, collectPageIdsInFolder])

  // Check if a specific page should be visible
  const isPageVisible = useCallback((pageId: string): boolean => {
    return settings.visiblePageIds.includes(pageId)
  }, [settings.visiblePageIds])

  // Ensure a specific page is visible (auto-expand its parent folders)
  const ensurePageVisible = useCallback((pageId: string, allPageMetadata: import('./globalState').PageMetadata[]) => {
    if (settings.visiblePageIds.includes(pageId)) {
      return // Already visible
    }

    // Find the page and determine all parent folder paths that need to be expanded
    const page = allPageMetadata.find(p => p.pageId === pageId)
    if (!page) {
      return // Page not found
    }

    // Calculate all parent folder paths that need to be expanded
    const pathParts = page.path.split('/').filter(Boolean)
    const parentFolderPaths: string[] = []
    
    // Build all parent folder paths (e.g., for 'docs/api/guide.md' -> ['docs', 'docs/api'])
    for (let i = 1; i < pathParts.length; i++) {
      const folderPath = pathParts.slice(0, i).join('/')
      parentFolderPaths.push(folderPath)
    }
    
    // Add all parent folders to expanded list and this page to visible list
    const newExpandedFolderPaths = [...new Set([...settings.expandedFolderPaths, ...parentFolderPaths])]
    const newVisiblePageIds = [...settings.visiblePageIds, pageId]
    
    saveSettings({
      expandedFolderPaths: newExpandedFolderPaths,
      visiblePageIds: newVisiblePageIds
    })
  }, [settings.expandedFolderPaths, settings.visiblePageIds, saveSettings])

  // Legacy compatibility function - maps old expandedNodes concept to new system
  const toggleExpandedNode = useCallback((nodeId: string, allPageMetadata?: import('./globalState').PageMetadata[]) => {
    if (!allPageMetadata) {
      console.warn('toggleExpandedNode requires allPageMetadata parameter with new visibility system')
      return
    }
    
    // Check if this is a folder ID or page ID
    if (nodeId.startsWith('folder_')) {
      // Extract folder path from folder node ID
      const folderPath = nodeId.substring('folder_'.length)
      toggleFolderExpansion(folderPath, allPageMetadata)
    } else {
      // This is a page ID, just toggle its visibility
      const newVisiblePageIds = settings.visiblePageIds.includes(nodeId)
        ? settings.visiblePageIds.filter(id => id !== nodeId)
        : [...settings.visiblePageIds, nodeId]
      
      updateSetting('visiblePageIds', newVisiblePageIds)
    }
  }, [toggleFolderExpansion, settings.visiblePageIds, updateSetting])
  
  return {
    settings,
    userInfo,
    isLoaded,
    updateSetting,
    saveSettings,
    resetSettings,
    // New visibility-based functions
    toggleFolderExpansion,
    isFolderExpanded,
    isPageVisible,
    ensurePageVisible,
    // Legacy compatibility
    toggleExpandedNode,
    deviceKey
  }
}