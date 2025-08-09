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
  visiblePageIds: string[]  // Changed from expandedNodes to track which page IDs should be visible
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

  // Helper function to check if a folder should be expanded (i.e., has visible children)
  const isFolderExpanded = useCallback((folderPath: string, allPageMetadata: import('./globalState').PageMetadata[]): boolean => {
    const pagesInFolder = collectPageIdsInFolder(folderPath, allPageMetadata)
    return pagesInFolder.some(pageId => settings.visiblePageIds.includes(pageId))
  }, [settings.visiblePageIds, collectPageIdsInFolder])

  // Toggle folder expansion by adding/removing all contained page IDs from visiblePageIds
  const toggleFolderExpansion = useCallback((folderPath: string, allPageMetadata: import('./globalState').PageMetadata[]) => {
    const pagesInFolder = collectPageIdsInFolder(folderPath, allPageMetadata)
    const isCurrentlyExpanded = isFolderExpanded(folderPath, allPageMetadata)
    
    let newVisiblePageIds: string[]
    
    if (isCurrentlyExpanded) {
      // Collapse: remove all pages in this folder from visible list
      newVisiblePageIds = settings.visiblePageIds.filter(pageId => !pagesInFolder.includes(pageId))
    } else {
      // Expand: add all pages in this folder to visible list
      newVisiblePageIds = [...new Set([...settings.visiblePageIds, ...pagesInFolder])]
    }
    
    updateSetting('visiblePageIds', newVisiblePageIds)
  }, [settings.visiblePageIds, updateSetting, collectPageIdsInFolder, isFolderExpanded])

  // Check if a specific page should be visible
  const isPageVisible = useCallback((pageId: string): boolean => {
    return settings.visiblePageIds.includes(pageId)
  }, [settings.visiblePageIds])

  // Ensure a specific page is visible (auto-expand its parent folders)
  const ensurePageVisible = useCallback((pageId: string, allPageMetadata: import('./globalState').PageMetadata[]) => {
    if (settings.visiblePageIds.includes(pageId)) {
      return // Already visible
    }

    // Find the page and add it to visible list
    const page = allPageMetadata.find(p => p.pageId === pageId)
    if (!page) {
      return // Page not found
    }

    // Add this page to visible list
    const newVisiblePageIds = [...settings.visiblePageIds, pageId]
    updateSetting('visiblePageIds', newVisiblePageIds)
  }, [settings.visiblePageIds, updateSetting])

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
  }, [settings.visiblePageIds, updateSetting, toggleFolderExpansion])
  
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