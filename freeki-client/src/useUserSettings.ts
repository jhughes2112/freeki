import { useState, useEffect, useCallback } from 'react'

export interface UserInfo {
  accountId: string
  fullName: string
  email?: string
  roles: string[]
  isAdmin: boolean
  gravatarUrl?: string
}

export interface UserSettings {
  sidebarWidth: number
  theme: 'light' | 'dark' | 'auto'
  companyName: string
  wikiTitle: string
  expandedNodes: string[]
  searchHistory: string[]
  lastSelectedPageId?: string
  showMetadataPanel: boolean
  defaultEditMode: 'wysiwyg' | 'markdown'
  autoSave: boolean
  autoSaveInterval: number
}

const DEFAULT_SETTINGS: UserSettings = {
  sidebarWidth: 300,
  theme: 'light',
  companyName: 'Your Company',
  wikiTitle: 'FreeKi Wiki',
  expandedNodes: ['projects'],
  searchHistory: [],
  showMetadataPanel: true,
  defaultEditMode: 'wysiwyg',
  autoSave: true,
  autoSaveInterval: 30
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

async function fetchCurrentUser(): Promise<UserInfo | null> {
  try {
    // TEMPORARY: Return hardcoded user data for testing tooltip functionality
    // TODO: Remove this and restore actual API call once server is integrated
    return {
      accountId: 'jhughes',
      fullName: 'Jason Hughes',
      email: 'jhughes@reachablegames.com',
      roles: ['Admin'],
      isAdmin: true,
		gravatarUrl: 'https://www.gravatar.com/avatar/0721e8eb683071eb4973c510d6e789cfc8247d79af38cee2bb461cfd9ddd4df3?d=identicon&s=32'
    }
    
    // Original API call (commented out for testing):
    // const response = await fetch('/api/user/me')
    // 
    // if (response.ok) {
    //   return await response.json()
    // } else if (response.status === 401) {
    //   console.info('User authentication not available - running in admin mode or auth not configured')
    //   return null
    // }
  } catch (error) {
    console.warn('Failed to fetch current user:', error)
  }
  return null
}

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  
  const deviceKey = getDeviceKey()
  
  useEffect(() => {
    async function loadData() {
      try {
        // Load settings from localStorage
        const savedSettings = localStorage.getItem(deviceKey)
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings) as Partial<UserSettings>
          setSettings({ ...DEFAULT_SETTINGS, ...parsed })
        }
        
        // Try to fetch current user info (will be null if not authenticated)
        const user = await fetchCurrentUser()
        setUserInfo(user)
        
      } catch (error) {
        console.warn('Failed to load user data:', error)
      } finally {
        setIsLoaded(true)
      }
    }
    
    loadData()
  }, [deviceKey])
  
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
  
  const addToSearchHistory = useCallback((query: string) => {
    if (!query.trim()) return
    
    const newHistory = [
      query,
      ...settings.searchHistory.filter(item => item !== query)
    ].slice(0, 10)
    
    updateSetting('searchHistory', newHistory)
  }, [settings.searchHistory, updateSetting])
  
  const toggleExpandedNode = useCallback((nodeId: string) => {
    const currentExpanded = settings.expandedNodes
    const newExpanded = currentExpanded.includes(nodeId)
      ? currentExpanded.filter(id => id !== nodeId)
      : [...currentExpanded, nodeId]
    
    updateSetting('expandedNodes', newExpanded)
  }, [settings.expandedNodes, updateSetting])
  
  return {
    settings,
    userInfo,
    isLoaded,
    updateSetting,
    saveSettings,
    resetSettings,
    addToSearchHistory,
    toggleExpandedNode,
    deviceKey
  }
}