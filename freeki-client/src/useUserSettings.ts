import { useState, useEffect, useCallback } from 'react'
import apiClient from './apiClient'

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

export interface AdminSettings {
  companyName: string
  companyLogoPath: string
  wikiTitle: string
  colorSchemes: {
    light: ColorScheme
    dark: ColorScheme
  }
}

export interface ColorScheme {
  appBarBackground: string
  sidebarBackground: string
  sidebarSelectedBackground: string
  sidebarHoverBackground: string
  metadataPanelBackground: string
  viewModeBackground: string
  editModeBackground: string
  textPrimary: string
  textSecondary: string
  borderColor: string
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

const DEFAULT_LIGHT_SCHEME: ColorScheme = {
  appBarBackground: '#1976d2',
  sidebarBackground: '#fafafa',
  sidebarSelectedBackground: 'rgba(25, 118, 210, 0.12)',
  sidebarHoverBackground: 'rgba(0, 0, 0, 0.04)',
  metadataPanelBackground: '#f9f9f9',
  viewModeBackground: '#ffffff',
  editModeBackground: '#ffffff',
  textPrimary: '#000000',
  textSecondary: '#666666',
  borderColor: '#e0e0e0'
}

const DEFAULT_DARK_SCHEME: ColorScheme = {
  appBarBackground: '#1565c0',
  sidebarBackground: '#2b2b2b',
  sidebarSelectedBackground: 'rgba(144, 202, 249, 0.16)',
  sidebarHoverBackground: 'rgba(255, 255, 255, 0.08)',
  metadataPanelBackground: '#1e1e1e',
  viewModeBackground: '#121212',
  editModeBackground: '#1e1e1e',
  textPrimary: '#ffffff',
  textSecondary: '#b3b3b3',
  borderColor: '#404040'
}

const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  companyName: 'Your Company',
  companyLogoPath: '/logo.png',
  wikiTitle: 'FreeKi Wiki',
  colorSchemes: {
    light: DEFAULT_LIGHT_SCHEME,
    dark: DEFAULT_DARK_SCHEME
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

async function fetchCurrentUser(): Promise<UserInfo | null> {
  // Use centralized API client instead of direct fetch
  const response = await apiClient.get<UserInfo>('/api/user/me')
  
  if (response.success && response.data) {
    return response.data
  }
  
  // If error is 401 or 403, return null (expected when not authenticated)
  if (response.error && (response.error.status === 401 || response.error.status === 403)) {
    console.info('User authentication not available - running in admin mode or auth not configured')
    return null
  }
  
  // For other errors, still return null but error UI already shown by apiClient
  console.warn('Failed to fetch current user:', response.error?.message)
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