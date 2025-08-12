import { AdminSettings, DEFAULT_ADMIN_SETTINGS } from './adminSettings'
import type { UserInfo } from './useUserSettings'

// Server-side page metadata - exactly matches the C# PageMetadata class
export interface PageMetadata {
  pageId: string       // Maps to PageId in C#
  tags: string[]       // Maps to Tags in C#
  title: string        // Maps to Title in C#
  author: string       // Maps to Author in C#
  lastModified: number // Maps to LastModified in C# (Unix timestamp)
  version: number      // Maps to Version in C#
  path: string         // Maps to Path in C#
}

// Page content is separate - only loaded for the current page
export interface PageContent {
  pageId: string
  content: string
}

// Global application state interface
export interface AppState {
  // Admin settings (company name, wiki title, color schemes, etc.)
  adminSettings: AdminSettings
  
  // Current user information and auth status
  currentUser: UserInfo | null
  
  // Complete user settings stored in global state for consistency
  userSettings: UserSettings
  
  // All page metadata from server - flat list (this is the raw server data)
  pageMetadata: PageMetadata[]
  
  // Currently selected page metadata
  currentPageMetadata: PageMetadata | null
  
  // Content for the currently selected page (loaded separately)
  currentPageContent: PageContent | null
  
  // Current edit state
  isEditing: boolean
  
  // Search state - transient UI state, not persisted
  searchQuery: string
  searchResults: PageMetadata[]
  
  // Loading states
  isLoadingAdminSettings: boolean
  isLoadingPages: boolean
  isLoadingUser: boolean
  isLoadingPageContent: boolean
}

// Type for user settings (exported for use in other files)
export interface UserSettings {
  theme: 'light' | 'dark' | 'auto'
  searchConfig: {
    titles: boolean
    tags: boolean
    author: boolean
    content: boolean
  }
  wideScreenLayout: {
    showFolderPanel: boolean
    metadataCollapsed: boolean
    sidebarWidth: number
    metadataWidth: number
    showMetadataPanel: boolean
  }
  narrowScreenLayout: {
    showFolderPanel: boolean
    metadataCollapsed: boolean
    showMetadataPanel: boolean
  }
  expandedFolderPaths: string[]
  revisionTabOpen: boolean
}

// Default user settings
const DEFAULT_USER_SETTINGS: UserSettings = {
  theme: 'auto',
  searchConfig: {
    titles: true,
    tags: false,
    author: false,
    content: false
  },
  wideScreenLayout: {
    showFolderPanel: true,
    metadataCollapsed: false,
    sidebarWidth: 300,
    metadataWidth: 280,
    showMetadataPanel: true
  },
  narrowScreenLayout: {
    showFolderPanel: false,
    metadataCollapsed: false,
    showMetadataPanel: false
  },
  expandedFolderPaths: [],
  revisionTabOpen: false
}

// Utility functions to derive current UI state from user settings
export function isWideScreen(): boolean {
  return window.innerWidth > 900
}

export function getCurrentTheme(userSettings: UserSettings): 'light' | 'dark' {
  if (userSettings.theme === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return userSettings.theme === 'dark' ? 'dark' : 'light'
}

export function getCurrentLayoutState(userSettings: UserSettings): {
  showFolderPanel: boolean
  sidebarWidth: number
  metadataWidth: number
  showMetadataPanel: boolean
} {
  const wide = isWideScreen()
  const layout = wide ? userSettings.wideScreenLayout : userSettings.narrowScreenLayout
  
  return {
    showFolderPanel: layout.showFolderPanel,
    showMetadataPanel: layout.showMetadataPanel,
    sidebarWidth: wide ? userSettings.wideScreenLayout.sidebarWidth : 300,
    metadataWidth: wide ? userSettings.wideScreenLayout.metadataWidth : 280
  }
}

// Type for property path strings (e.g., 'adminSettings.colorSchemes.light.appBarBackground')
type PropertyPath = string

// Type for state change listeners with property paths
export type PropertyChangeListener = (
  path: PropertyPath,
  newValue: unknown,
  oldValue: unknown,
  currentState: AppState,
  modifiedState: AppState
) => void

// Deep clone utility for state objects
function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T
  if (typeof obj === 'object') {
    const cloned = {} as T
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = deepClone(obj[key])
      }
    }
    return cloned
  }
  return obj
}

// Simple, clean global state manager - immediate updates, no throttling
class GlobalStateManager {
  private state: AppState
  private listeners: Map<PropertyPath, Set<PropertyChangeListener>> = new Map()

  constructor() {
    // Initialize with defaults
    const initialState: AppState = {
      adminSettings: DEFAULT_ADMIN_SETTINGS,
      currentUser: null,
      userSettings: DEFAULT_USER_SETTINGS,
      pageMetadata: [],
      currentPageMetadata: null,
      currentPageContent: null,
      isEditing: false,
      searchQuery: '',
      searchResults: [],
      isLoadingAdminSettings: true,
      isLoadingPages: false,
      isLoadingUser: false,
      isLoadingPageContent: false
    }
    
    this.state = deepClone(initialState)
  }

  // Get current state (read-only)
  getState(): Readonly<AppState> {
    return this.state
  }

  // Get a specific value from state
  get<K extends keyof AppState>(key: K): AppState[K] {
    return this.state[key]
  }

  // Set value with immediate updates
  set<K extends keyof AppState>(key: K, value: AppState[K]): void {
    const oldValue = this.state[key]
    if (oldValue === value) return // Skip if no change
    
    // Simple shallow clone
    this.state = { ...this.state, [key]: value }
    
    // Trigger listeners immediately
    this.notifyListeners(key, value, oldValue)
  }

  // Set nested property using dot notation
  setProperty(path: PropertyPath, value: unknown): void {
    const parts = path.split('.')
    const oldValue = this.getProperty(path)
    if (oldValue === value) return // Skip if no change
    
    // Create new state with updated property
    this.state = this.updateNestedProperty(this.state, parts, value)
    
    // Trigger listeners immediately
    this.notifyListeners(path, value, oldValue)
  }

  // Helper to update nested property immutably
  private updateNestedProperty(obj: AppState, parts: string[], value: unknown): AppState {
    if (parts.length === 1) {
      return { ...obj, [parts[0]]: value } as AppState
    }
    
    const [firstPart, ...restParts] = parts
    const currentValue = (obj as unknown as Record<string, unknown>)[firstPart] || {}
    
    return {
      ...obj,
      [firstPart]: this.updateNestedProperty(currentValue as AppState, restParts, value)
    } as AppState
  }

  // Get nested property using dot notation
  getProperty(path: PropertyPath): unknown {
    const parts = path.split('.')
    let target = this.state as unknown as Record<string, unknown>
    
    for (const part of parts) {
      if (target === null || target === undefined || typeof target !== 'object') {
        return undefined
      }
      target = target[part] as Record<string, unknown>
    }
    
    return target
  }

  // Batch update multiple values
  update(updates: Partial<AppState>): void {
    // Simple batch update with single clone
    this.state = { ...this.state, ...updates }
    
    // Notify all changed properties
    Object.entries(updates).forEach(([key, value]) => {
      const typedKey = key as keyof AppState
      this.notifyListeners(typedKey, value, this.state[typedKey])
    })
  }

  // Immediate listener notification
  private notifyListeners(path: PropertyPath, newValue: unknown, oldValue: unknown): void {
    // Get parent paths for nested property notifications
    const parentPaths = this.getParentPaths(path)
    
    // Notify all relevant listeners immediately
    for (const listenerPath of parentPaths) {
      const pathListeners = this.listeners.get(listenerPath)
      if (pathListeners) {
        for (const listener of pathListeners) {
          try {
            listener(listenerPath, newValue, oldValue, this.state, this.state)
          } catch (error) {
            console.error(`Error in property listener for ${listenerPath}:`, error)
          }
        }
      }
    }
  }

  // Simple parent path calculation
  private getParentPaths(path: PropertyPath): PropertyPath[] {
    const parts = path.split('.')
    const parentPaths: PropertyPath[] = []
    
    for (let i = 1; i <= parts.length; i++) {
      parentPaths.push(parts.slice(0, i).join('.'))
    }
    
    return parentPaths
  }

  // Subscribe to changes for a specific property path
  subscribe(path: PropertyPath, listener: PropertyChangeListener): () => void {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, new Set())
    }
    
    const pathListeners = this.listeners.get(path)!
    pathListeners.add(listener)
    
    // Return unsubscribe function
    return () => {
      pathListeners.delete(listener)
      if (pathListeners.size === 0) {
        this.listeners.delete(path)
      }
    }
  }

  // Subscribe to all changes (root level)
  subscribeGlobal(listener: PropertyChangeListener): () => void {
    return this.subscribe('', listener)
  }
}

// Create and export global state manager instance
export const globalState = new GlobalStateManager()

// Device key utility function
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

// Persistence manager for automatically saving user settings to localStorage
class StatePersistenceManager {
  private deviceKey: string
  
  constructor() {
    this.deviceKey = getDeviceKey()
    this.setupObservers()
    this.loadInitialState()
  }
  
  private setupObservers(): void {
    // Auto-save userSettings when ANY nested property changes
    globalState.subscribe('userSettings', (path) => {
      console.log(`[Persistence] UserSettings changed at path: ${path}`)
      const state = globalState.getState()
      this.saveUserSettings(state.userSettings)
    })
  }
  
  private loadInitialState(): void {
    // Load user settings from localStorage (includes expanded folders)
    try {
      const saved = localStorage.getItem(`${this.deviceKey}-userSettings`)
      console.log(`[Persistence] Loading from key: ${this.deviceKey}-userSettings`)
      console.log(`[Persistence] Loaded raw data:`, saved)
      if (saved) {
        const userSettings = JSON.parse(saved) as Partial<UserSettings>
        console.log(`[Persistence] Parsed user settings:`, userSettings)
        const mergedSettings = { ...DEFAULT_USER_SETTINGS, ...userSettings }
        console.log(`[Persistence] Merged with defaults:`, mergedSettings)
        globalState.set('userSettings', mergedSettings)
      } else {
        console.log(`[Persistence] No saved settings found, using defaults`)
      }
    } catch (error) {
      console.warn('Failed to load user settings:', error)
    }
  }
  
  private saveUserSettings(userSettings: UserSettings): void {
    try {
      console.log(`[Persistence] Saving user settings:`, userSettings)
      localStorage.setItem(`${this.deviceKey}-userSettings`, JSON.stringify(userSettings))
      console.log(`[Persistence] Settings saved to key: ${this.deviceKey}-userSettings`)
    } catch (error) {
      console.warn('Failed to save user settings:', error)
    }
  }
}

// Initialize persistence manager
new StatePersistenceManager() // Auto-starts when module loads

// React hook for using global state in components
import { useState, useEffect, useRef } from 'react'

export function useGlobalState(): AppState
export function useGlobalState<K extends keyof AppState>(key: K): AppState[K]
export function useGlobalState(path: PropertyPath): unknown
export function useGlobalState<K extends keyof AppState>(keyOrPath?: K | PropertyPath): AppState | AppState[K] | unknown {
  const [, forceUpdate] = useState(0)
  const updateCountRef = useRef(0)
  
  useEffect(() => {
    if (!keyOrPath) {
      // Subscribe to all changes
      const unsubscribe = globalState.subscribeGlobal(() => {
        updateCountRef.current++
        forceUpdate(updateCountRef.current)
      })
      return unsubscribe
    }
    
    // Subscribe to specific property path
    const unsubscribe = globalState.subscribe(keyOrPath as string, () => {
      updateCountRef.current++
      forceUpdate(updateCountRef.current)
    })
    
    return unsubscribe
  }, [keyOrPath])
  
  if (keyOrPath === undefined) {
    return globalState.getState()
  }
  
  // Check if it's a top-level key or a property path
  if (typeof keyOrPath === 'string' && keyOrPath.includes('.')) {
    return globalState.getProperty(keyOrPath)
  }
  
  return globalState.get(keyOrPath as keyof AppState)
}

// Hook for subscribing to specific property path changes
export function useGlobalStateListener(
  path: PropertyPath,
  listener: PropertyChangeListener,
  deps: unknown[] = []
): void {
  useEffect(() => {
    return globalState.subscribe(path, listener)
  }, deps)
}

// Export device key utility for use in other components if needed
export { getDeviceKey }