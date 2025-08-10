import { useCallback } from 'react'
import type { ISemanticApi } from './semanticApiInterface'
import { useGlobalState, globalState } from './globalState'

export interface UserInfo {
  accountId: string
  fullName: string
  email?: string
  roles: string[]
  isAdmin: boolean
  gravatarUrl?: string
}

// User settings - everything that should be persisted per device
export interface UserSettings {
  // Theme preference
  theme: 'light' | 'dark' | 'auto'
  
  // Search configuration - persistent across sessions
  searchConfig: {
    titles: boolean
    tags: boolean
    author: boolean
    content: boolean
  }
  
  // Layout settings for different screen modes
  wideScreenLayout: {
    showFolderPanel: boolean
    sidebarWidth: number
    metadataWidth: number
    showMetadataPanel: boolean
  }
  narrowScreenLayout: {
    showFolderPanel: boolean
    showMetadataPanel: boolean
  }
  
  // Which folder paths are expanded - THIS IS PERSISTENT USER STATE
  expandedFolderPaths: string[]
}

// Hook to work with user settings now stored in globalState
export function useUserSettings(semanticApi?: ISemanticApi | null) {
  const userSettings = useGlobalState('userSettings') as UserSettings
  const userInfo = useGlobalState('currentUser') as UserInfo | null
  
  // Update specific setting in global state
  const updateSetting = useCallback(<K extends keyof UserSettings>(
    key: K, 
    value: UserSettings[K]
  ) => {
    globalState.setProperty(`userSettings.${key}`, value)
  }, [])
  
  // Update multiple settings at once
  const saveSettings = useCallback((newSettings: Partial<UserSettings>) => {
    const updatedSettings = { ...userSettings, ...newSettings }
    globalState.set('userSettings', updatedSettings)
  }, [userSettings])
  
  // Reset to defaults
  const resetSettings = useCallback(() => {
    const DEFAULT_SETTINGS: UserSettings = {
      theme: 'auto',
      searchConfig: {
        titles: true,
        tags: false,
        author: false,
        content: false
      },
      wideScreenLayout: {
        showFolderPanel: true,
        sidebarWidth: 300,
        metadataWidth: 280,
        showMetadataPanel: true
      },
      narrowScreenLayout: {
        showFolderPanel: false,
        showMetadataPanel: false
      },
      expandedFolderPaths: []
    }
    globalState.set('userSettings', DEFAULT_SETTINGS)
  }, [])
  
  // Fetch user info from API and store in global state
  const fetchUserInfo = useCallback(async () => {
    if (!semanticApi) return
    
    try {
      globalState.set('isLoadingUser', true)
      const user = await semanticApi.getCurrentUser()
      globalState.set('currentUser', user)
    } catch (error) {
      console.warn('Failed to fetch current user:', error)
      globalState.set('currentUser', null)
    } finally {
      globalState.set('isLoadingUser', false)
    }
  }, [semanticApi])
  
  return {
    settings: userSettings,
    userInfo,
    isLoaded: true, // Always loaded since it comes from global state
    updateSetting,
    saveSettings,
    resetSettings,
    fetchUserInfo
  }
}