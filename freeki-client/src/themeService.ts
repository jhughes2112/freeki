import { globalState, getCurrentTheme } from './globalState'
import { applyTheme } from './themeUtils'
import type { ColorScheme } from './adminSettings'
import type { UserSettings } from './globalState'

// Theme service that automatically applies theme changes when global state changes
class ThemeService {
  private initialized = false
  private lastAppliedTheme: string | null = null

  // Initialize the theme service to listen for state changes
  initialize() {
    if (this.initialized) return

    // Function to apply theme changes immediately (no debouncing BS)
    const applyCurrentTheme = () => {
      const state = globalState.getState()
      const userSettings = state.userSettings
      const actualTheme = getCurrentTheme(userSettings)
      const colorSchemes = state.adminSettings.colorSchemes
      
      // Only apply if values actually changed
      const themeKey = `${actualTheme}-${JSON.stringify(colorSchemes)}`
      if (themeKey !== this.lastAppliedTheme) {
        console.log(`Applying theme: ${actualTheme}`)
        applyTheme(colorSchemes, actualTheme)
        this.lastAppliedTheme = themeKey
      }
    }

    // Listen for color scheme changes (admin can change themes)
    globalState.subscribe('adminSettings.colorSchemes', () => {
      applyCurrentTheme()
    })
    // Listen for ALL nested color scheme changes (including font size sliders)
    globalState.subscribe('adminSettings.colorSchemes.', () => {
      applyCurrentTheme()
    })

    // Listen for user theme preference changes
    globalState.subscribe('userSettings.theme', () => {
      console.log('User theme preference changed')
      applyCurrentTheme()
    })

    // Apply initial theme once
    applyCurrentTheme()

    this.initialized = true
    console.log('Theme service initialized with proper user settings integration')
  }
}

// Create and export theme service instance
export const themeService = new ThemeService()

// Auto-initialize when this module loads
themeService.initialize()