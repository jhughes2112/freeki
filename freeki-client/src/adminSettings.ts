import apiClient from './apiClient'

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

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  companyName: 'Your Company',
  companyLogoPath: '/logo.png',
  wikiTitle: 'FreeKi Wiki',
  colorSchemes: {
    light: DEFAULT_LIGHT_SCHEME,
    dark: DEFAULT_DARK_SCHEME
  }
}

async function fetchAdminSettings(): Promise<AdminSettings | null> {
  const response = await apiClient.get<AdminSettings>('/api/admin/settings')
  
  if (response.success && response.data) {
    return response.data
  }
  
  // If error is 401 or 403, return null without showing error UI
  if (response.error && (response.error.status === 401 || response.error.status === 403)) {
    console.info('Admin settings not available - insufficient permissions')
    return null
  }
  
  // For other errors, return defaults (error UI already shown by apiClient)
  return DEFAULT_ADMIN_SETTINGS
}

async function saveAdminSettings(settings: AdminSettings): Promise<boolean> {
  const response = await apiClient.post<{ success: boolean }>('/api/admin/settings', settings)
  
  if (response.success) {
    return true
  }
  
  // For 401/403, don't show error UI since these are expected permission errors
  if (response.error && (response.error.status === 401 || response.error.status === 403)) {
    console.warn('Admin role required to save settings')
    return false
  }
  
  // Other errors are already handled by apiClient error handler
  return false
}

export { fetchAdminSettings, saveAdminSettings }