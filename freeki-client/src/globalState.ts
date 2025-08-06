import { AdminSettings, DEFAULT_ADMIN_SETTINGS } from './adminSettings'
import type { UserInfo } from './useUserSettings'

// Interface for a page/wiki page
export interface WikiPage {
  id: string
  title: string
  content: string
  path: string
  children?: WikiPage[]
  isFolder: boolean
  updatedAt?: string
  author?: string
  version?: number
  tags?: string[]
}

// Global application state interface
export interface AppState {
  // Admin settings (company name, wiki title, color schemes, etc.)
  adminSettings: AdminSettings
  
  // Current user information and auth status
  currentUser: UserInfo | null
  
  // All pages/wiki content
  pages: WikiPage[]
  
  // Currently selected/viewed page
  currentPage: WikiPage | null
  
  // Current edit state
  isEditing: boolean
  
  // Search state
  searchQuery: string
  searchResults: WikiPage[]
  
  // UI state
  theme: 'light' | 'dark' | 'auto'
  sidebarCollapsed: boolean
  metadataCollapsed: boolean
  
  // Loading states
  isLoadingAdminSettings: boolean
  isLoadingPages: boolean
  isLoadingUser: boolean
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

// Surgical clone that only clones changed portions - MAXIMUM PERFORMANCE IMPROVEMENT
function surgicalClone(current: AppState, modified: AppState, changedPaths: Set<PropertyPath>): AppState {
  // Start with the current state as base
  let result = current
  
  // Only clone if there are actual changes
  if (changedPaths.size === 0) {
    return current
  }
  
  // Track what needs to be cloned
  let needsAdminSettingsClone = false
  let needsColorSchemesClone = false
  let needsLightSchemeClone = false
  let needsDarkSchemeClone = false
  let needsTopLevelClone = false
  
  // Analyze changed paths to determine minimal cloning needed
  for (const path of changedPaths) {
    if (path.startsWith('adminSettings.colorSchemes.light.')) {
      needsLightSchemeClone = true
      needsColorSchemesClone = true
      needsAdminSettingsClone = true
      needsTopLevelClone = true
    } else if (path.startsWith('adminSettings.colorSchemes.dark.')) {
      needsDarkSchemeClone = true
      needsColorSchemesClone = true
      needsAdminSettingsClone = true
      needsTopLevelClone = true
    } else if (path.startsWith('adminSettings.colorSchemes')) {
      needsColorSchemesClone = true
      needsAdminSettingsClone = true
      needsTopLevelClone = true
    } else if (path.startsWith('adminSettings.')) {
      needsAdminSettingsClone = true
      needsTopLevelClone = true
    } else if (path !== '') { // Any other top-level property
      needsTopLevelClone = true
    }
  }
  
  // Perform minimal cloning based on what actually changed
  if (needsTopLevelClone) {
    result = { ...current }
    
    if (needsAdminSettingsClone) {
      result.adminSettings = { ...modified.adminSettings }
      
      if (needsColorSchemesClone) {
        result.adminSettings.colorSchemes = { ...modified.adminSettings.colorSchemes }
        
        if (needsLightSchemeClone) {
          result.adminSettings.colorSchemes.light = { ...modified.adminSettings.colorSchemes.light }
        } else {
          // Keep reference to unchanged light scheme
          result.adminSettings.colorSchemes.light = current.adminSettings.colorSchemes.light
        }
        
        if (needsDarkSchemeClone) {
          result.adminSettings.colorSchemes.dark = { ...modified.adminSettings.colorSchemes.dark }
        } else {
          // Keep reference to unchanged dark scheme
          result.adminSettings.colorSchemes.dark = current.adminSettings.colorSchemes.dark
        }
      } else {
        // Keep reference to unchanged color schemes
        result.adminSettings.colorSchemes = current.adminSettings.colorSchemes
      }
    } else {
      // Keep reference to unchanged admin settings
      result.adminSettings = current.adminSettings
    }
    
    // Copy over other changed top-level properties
    for (const path of changedPaths) {
      if (!path.includes('.') && path !== '') {
        const key = path as keyof AppState
        (result as any)[key] = (modified as any)[key]
      }
    }
  }
  
  return result
}

// Deep clone utility for state objects (keeping original for compatibility)
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

// Cached parent paths to avoid recalculation - PERFORMANCE IMPROVEMENT
const parentPathCache = new Map<PropertyPath, PropertyPath[]>()

function getParentPaths(path: PropertyPath): PropertyPath[] {
  if (parentPathCache.has(path)) {
    return parentPathCache.get(path)!
  }
  
  const parts = path.split('.')
  const parentPaths: PropertyPath[] = []
  
  for (let i = 1; i <= parts.length; i++) {
    parentPaths.push(parts.slice(0, i).join('.'))
  }
  
  parentPathCache.set(path, parentPaths)
  return parentPaths
}

// Two-state global state manager with property-specific callbacks
class GlobalStateManager {
  private currentState: AppState
  private modifiedState: AppState
  private listeners: Map<PropertyPath, Set<PropertyChangeListener>> = new Map()
  private pendingCommit = false
  private rafId: number | null = null
  private lastCommitTime = 0
  private readonly minCommitInterval = 50 // 20fps max update rate - PERFORMANCE THROTTLING
  private pendingChanges = new Set<PropertyPath>() // TRACK CHANGES AS THEY HAPPEN - MAJOR PERFORMANCE IMPROVEMENT

  constructor() {
    // Initialize both states with defaults
    const initialState: AppState = {
      adminSettings: DEFAULT_ADMIN_SETTINGS,
      currentUser: null,
      pages: [],
      currentPage: null,
      isEditing: false,
      searchQuery: '',
      searchResults: [],
      theme: 'light',
      sidebarCollapsed: false,
      metadataCollapsed: false,
      isLoadingAdminSettings: true,
      isLoadingPages: false,
      isLoadingUser: false
    }
    
    this.currentState = deepClone(initialState)
    this.modifiedState = deepClone(initialState)
  }

  // Get current committed state (read-only)
  getState(): Readonly<AppState> {
    return this.currentState
  }

  // Get modified working state (read-only)
  getModifiedState(): Readonly<AppState> {
    return this.modifiedState
  }

  // Get a specific value from current state
  get<K extends keyof AppState>(key: K): AppState[K] {
    return this.currentState[key]
  }

  // Get a specific value from modified state
  getModified<K extends keyof AppState>(key: K): AppState[K] {
    return this.modifiedState[key]
  }

  // Set value in modified state (doesn't trigger callbacks until commit)
  set<K extends keyof AppState>(key: K, value: AppState[K]): void {
    (this.modifiedState as any)[key] = value
    this.pendingChanges.add(key) // TRACK THE CHANGE - O(1)
    this.scheduleCommit()
  }

  // Set nested property using dot notation
  setProperty(path: PropertyPath, value: any): void {
    const parts = path.split('.')
    let target = this.modifiedState as any
    
    // Navigate to parent object
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      if (!target[part] || typeof target[part] !== 'object') {
        target[part] = {}
      }
      target = target[part]
    }
    
    // Set the final property
    target[parts[parts.length - 1]] = value
    this.pendingChanges.add(path) // TRACK THE EXACT CHANGE - O(1)
    this.scheduleCommit()
  }

  // Get nested property using dot notation
  getProperty(path: PropertyPath): any {
    const parts = path.split('.')
    let target = this.currentState as any
    
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
    Object.entries(updates).forEach(([key, value]) => {
      (this.modifiedState as any)[key] = value
      this.pendingChanges.add(key) // TRACK EACH CHANGE - O(k) where k is update count
    })
    this.scheduleCommit()
  }

  // Schedule a commit with throttling for smooth performance - MAJOR PERFORMANCE IMPROVEMENT
  private scheduleCommit(): void {
    if (this.pendingCommit) return
    
    this.pendingCommit = true
    
    // Cancel any pending RAF
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
    }
    
    const now = performance.now()
    const timeSinceLastCommit = now - this.lastCommitTime
    
    if (timeSinceLastCommit >= this.minCommitInterval) {
      // Enough time has passed, commit immediately
      this.rafId = requestAnimationFrame(() => {
        this.executeCommit()
      })
    } else {
      // Too soon, schedule for later to maintain frame rate
      const remainingTime = this.minCommitInterval - timeSinceLastCommit
      this.rafId = requestAnimationFrame(() => {
        setTimeout(() => {
          this.executeCommit()
        }, remainingTime)
      })
    }
  }

  // Execute the actual commit
  private executeCommit(): void {
    this.commitChanges()
    this.pendingCommit = false
    this.rafId = null
    this.lastCommitTime = performance.now()
  }

  // Optimized commit changes using tracked changes - MASSIVE PERFORMANCE IMPROVEMENT
  commitChanges(): void {
    // Use tracked changes instead of expensive diff - O(1) vs O(n)
    const changedPaths = this.pendingChanges
    
    if (changedPaths.size === 0) {
      return // No changes to commit
    }

    // Batch listener calls to avoid duplicates - PERFORMANCE IMPROVEMENT
    const listenerCalls = new Map<PropertyChangeListener, {
      path: PropertyPath,
      newValue: any,
      oldValue: any
    }>()

    for (const changedPath of changedPaths) {
      const parentPaths = getParentPaths(changedPath)
      
      // Add listeners for this path and all its parents
      for (const path of parentPaths) {
        const pathListeners = this.listeners.get(path)
        if (pathListeners) {
          for (const listener of pathListeners) {
            if (!listenerCalls.has(listener)) {
              // Get values for the specific path the listener is registered for
              const newValue = this.getValueAtPath(this.modifiedState, path)
              const oldValue = this.getValueAtPath(this.currentState, path)
              
              listenerCalls.set(listener, {
                path,
                newValue,
                oldValue
              })
            }
          }
        }
      }
    }

    // Update current state using surgical clone - MAJOR PERFORMANCE IMPROVEMENT
    this.currentState = surgicalClone(this.currentState, this.modifiedState, changedPaths)

    // Clear tracked changes after commit - IMPORTANT!
    this.pendingChanges.clear()

    // Trigger all unique listeners
    for (const [listener, { path, newValue, oldValue }] of listenerCalls) {
      try {
        listener(path, newValue, oldValue, this.currentState, this.modifiedState)
      } catch (error) {
        console.error(`Error in property listener for ${path}:`, error)
      }
    }
  }

  // Helper to get value at a specific path
  private getValueAtPath(obj: any, path: PropertyPath): any {
    const parts = path.split('.')
    let target = obj
    
    for (const part of parts) {
      if (target === null || target === undefined || typeof target !== 'object') {
        return undefined
      }
      target = target[part]
    }
    
    return target
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

  // Force immediate commit for critical updates (bypasses throttling)
  forceCommit(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.pendingCommit = false
    this.executeCommit()
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

export default globalState