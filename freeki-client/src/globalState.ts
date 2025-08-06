import { AdminSettings, DEFAULT_ADMIN_SETTINGS } from './adminSettings'
import type { UserInfo } from './useUserSettings'

// Server-side page metadata - exactly matches the C# PageMetadata class
export interface PageMetadata {
  pageId: string       // Maps to PageId in C#
  tags: string[]       // Maps to Tags in C#
  title: string        // Maps to Title in C#
  lastModified: number // Maps to LastModified in C# (Unix timestamp)
  version: number      // Maps to Version in C#
  path: string         // Maps to Path in C#
  sortOrder: number    // Maps to SortOrder in C#
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
  
  // All page metadata from server - flat list (this is the raw server data)
  pageMetadata: PageMetadata[]
  
  // Currently selected page metadata
  currentPageMetadata: PageMetadata | null
  
  // Content for the currently selected page (loaded separately)
  currentPageContent: PageContent | null
  
  // Current edit state
  isEditing: boolean
  
  // Search state
  searchQuery: string
  searchResults: PageMetadata[]
  
  // UI state
  theme: 'light' | 'dark' | 'auto'
  sidebarCollapsed: boolean
  metadataCollapsed: boolean
  
  // Loading states
  isLoadingAdminSettings: boolean
  isLoadingPages: boolean
  isLoadingUser: boolean
  isLoadingPageContent: boolean
}

// Type for property path strings (e.g., 'adminSettings.colorSchemes.light.appBarBackground')
type PropertyPath = string

// Type for state change listeners with property paths
export type PropertyChangeListener = (
  path: PropertyPath,
  newValue: any,
  oldValue: any,
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
      if (obj.hasOwnProperty(key)) {
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
      pageMetadata: [],
      currentPageMetadata: null,
      currentPageContent: null,
      isEditing: false,
      searchQuery: '',
      searchResults: [],
      theme: 'light',
      sidebarCollapsed: false,
      metadataCollapsed: false,
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
  setProperty(path: PropertyPath, value: any): void {
    const parts = path.split('.')
    const oldValue = this.getProperty(path)
    if (oldValue === value) return // Skip if no change
    
    // Create new state with updated property
    this.state = this.updateNestedProperty(this.state, parts, value)
    
    // Trigger listeners immediately
    this.notifyListeners(path, value, oldValue)
  }

  // Helper to update nested property immutably
  private updateNestedProperty(obj: any, parts: string[], value: any): any {
    if (parts.length === 1) {
      return { ...obj, [parts[0]]: value }
    }
    
    const [firstPart, ...restParts] = parts
    const currentValue = obj[firstPart] || {}
    
    return {
      ...obj,
      [firstPart]: this.updateNestedProperty(currentValue, restParts, value)
    }
  }

  // Get nested property using dot notation
  getProperty(path: PropertyPath): any {
    const parts = path.split('.')
    let target = this.state as any
    
    for (const part of parts) {
      if (target === null || target === undefined || typeof target !== 'object') {
        return undefined
      }
      target = target[part]
    }
    
    return target
  }

  // Batch update multiple values
  update(updates: Partial<AppState>): void {
    // Simple batch update with single clone
    this.state = { ...this.state, ...updates }
    
    // Notify all changed properties
    Object.entries(updates).forEach(([key, value]) => {
      this.notifyListeners(key, value, (this.state as any)[key])
    })
  }

  // Immediate listener notification
  private notifyListeners(path: PropertyPath, newValue: any, oldValue: any): void {
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

// React hook for using global state in components
import { useState, useEffect, useRef } from 'react'

export function useGlobalState(): AppState
export function useGlobalState<K extends keyof AppState>(key: K): AppState[K]
export function useGlobalState(path: PropertyPath): any
export function useGlobalState<K extends keyof AppState>(keyOrPath?: K | PropertyPath): AppState | AppState[K] | any {
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
  deps: any[] = []
): void {
  useEffect(() => {
    return globalState.subscribe(path, listener)
  }, deps)
}