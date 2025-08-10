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
  // Search configuration - persistent across sessions
  searchConfig: {
    titles: boolean
    tags: boolean
    author: boolean
    content: boolean
  }
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
  searchConfig: {
    titles: true,
    tags: false,
    author: false,
    content: false
  },
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
  
  return {
    settings,
    userInfo,
    isLoaded,
    updateSetting,
    saveSettings,
    resetSettings,
    deviceKey
  }
}