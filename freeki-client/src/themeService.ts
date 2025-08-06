import { globalState } from './globalState'
import { applyTheme } from './themeUtils'
import type { ColorScheme } from './adminSettings'

// Theme type to match the global state
type ThemeMode = 'light' | 'dark' | 'auto'

// Theme service that automatically applies theme changes when global state changes
class ThemeService {
  private initialized = false
  private lastAppliedTheme: string | null = null
  private lastAppliedColorSchemes: { light: ColorScheme; dark: ColorScheme } | null = null

  // Initialize the theme service to listen for state changes
  initialize() {
    if (this.initialized) return

    // Debounced theme application to prevent excessive DOM updates
    let applyThemeTimeoutId: number | null = null
    
    const debouncedApplyTheme = (colorSchemes: { light: ColorScheme; dark: ColorScheme }, theme: ThemeMode) => {
      if (applyThemeTimeoutId) {
        clearTimeout(applyThemeTimeoutId)
      }
      
      applyThemeTimeoutId = setTimeout(() => {
        // Only apply if values actually changed
        const themeKey = `${theme}-${JSON.stringify(colorSchemes)}`
        if (themeKey !== this.lastAppliedTheme) {
          console.log('Applying theme changes...')
          applyTheme(colorSchemes, theme)
          this.lastAppliedTheme = themeKey
        }
        applyThemeTimeoutId = null
      }, 16) // ~60fps throttling
    }

    // Listen specifically for color scheme changes (deeply nested)
    globalState.subscribe('adminSettings.colorSchemes', (path, newValue, oldValue) => {
      const state = globalState.getState()
      // Use the full colorSchemes from state, not the newValue which might be a partial update
      debouncedApplyTheme(state.adminSettings.colorSchemes, state.theme)
    })

    // Listen for theme mode changes
    globalState.subscribe('theme', (path, newTheme, oldTheme) => {
      console.log(`Theme mode changed from ${oldTheme} to ${newTheme}`)
      const state = globalState.getState()
      debouncedApplyTheme(state.adminSettings.colorSchemes, newTheme as ThemeMode)
    })

    // Apply initial theme once
    const state = globalState.getState()
    applyTheme(state.adminSettings.colorSchemes, state.theme)
    this.lastAppliedTheme = `${state.theme}-${JSON.stringify(state.adminSettings.colorSchemes)}`

    this.initialized = true
    console.log('Theme service initialized with optimized listeners')
  }
}

// Create and export theme service instance
export const themeService = new ThemeService()

// Auto-initialize when this module loads
themeService.initialize()